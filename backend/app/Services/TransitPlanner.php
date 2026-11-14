<?php

namespace App\Services;

use App\Enums\TransitLeg;
use App\Models\BusOperator;
use App\Models\Route;
use App\Models\RouteStop;
use App\Models\Student;
use App\Models\StudentExtra;
use App\Models\StudentRide;
use App\Models\TransitCenter;
use App\Models\TransitRequest;
use App\Models\User;
use Carbon\CarbonInterface;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Turns a transit center's request into the child's actual day: which bus
 * takes them to and from the center (student_rides) and what it costs each
 * month (student_extras).
 */
class TransitPlanner
{
    public function __construct(private readonly InvoiceGenerator $invoices) {}

    /**
     * The price the center sees before sending a request: the operator's
     * price for each leg added up. Null when any chosen leg has no price yet.
     *
     * @param  list<string>  $legs
     */
    public function indicativeAmount(BusOperator $operator, array $legs): ?float
    {
        $prices = $operator->resolvedTransitPrices();
        $total = 0.0;

        foreach ($legs as $leg) {
            if (($prices[$leg] ?? null) === null) {
                return null;
            }
            $total += $prices[$leg];
        }

        return round($total, 2);
    }

    /**
     * Approved start requests from this center whose plan is still running
     * (or starts later) for the child.
     *
     * @return Collection<int, TransitRequest>
     */
    public function runningPlans(Student $student, ?TransitCenter $center = null, ?CarbonInterface $from = null): Collection
    {
        $from ??= Carbon::today();

        return TransitRequest::where('student_id', $student->id)
            ->where('kind', 'start')
            ->where('status', 'approved')
            ->when($center, fn ($q) => $q->where('transit_center_id', $center->id))
            ->whereHas('extras', fn ($q) => $q->notEndedBy($from))
            ->with(['transitCenter:id,name', 'extras'])
            ->get();
    }

    /**
     * Approves a start request.
     *
     * Bills cover whole months: the charge starts in the month of $startsOn,
     * or the month after when $billNextMonth.
     *
     * @param  list<array{leg: string, route_id: int, center_after_stop_id: ?int, home_stop_id: ?int}>  $legPlans
     * @return array{added: list<string>, not_changed: list<string>} months whose bill was already made
     */
    public function approveStart(TransitRequest $request, array $legPlans, float $monthlyAmount, CarbonInterface $startsOn, User $reviewer, bool $billNextMonth = false): array
    {
        return DB::transaction(function () use ($request, $legPlans, $monthlyAmount, $startsOn, $reviewer, $billNextMonth) {
            $student = $request->student;
            $center = $request->transitCenter;

            // A child is at one center per part of the day: whatever plan covered
            // these trips before ends the day before this one starts.
            $notChanged = $this->endPlansCovering($student, $request->directions(), $startsOn->copy()->subDay());

            foreach ($legPlans as $plan) {
                $leg = TransitLeg::from($plan['leg']);
                $route = Route::findOrFail($plan['route_id']);
                $centerStop = $this->centerStopOn($route, $center, $plan['center_after_stop_id'] ?? null);
                $homeStopId = $plan['home_stop_id'] ?? null;

                [$board, $alight] = match ($leg) {
                    TransitLeg::SchoolToCenter => [null, $centerStop->id],
                    TransitLeg::CenterToHome => [$centerStop->id, $homeStopId],
                    TransitLeg::HomeToCenter => [$homeStopId, $centerStop->id],
                    TransitLeg::CenterToSchool => [$centerStop->id, null],
                };

                StudentRide::create([
                    'tenant_id' => $student->tenant_id,
                    'student_id' => $student->id,
                    'transit_request_id' => $request->id,
                    'direction' => $leg->direction(),
                    'route_id' => $route->id,
                    'board_stop_id' => $board,
                    'alight_stop_id' => $alight,
                    'starts_on' => $startsOn->toDateString(),
                ]);
            }

            $extra = StudentExtra::create([
                'tenant_id' => $student->tenant_id,
                'student_id' => $student->id,
                'transit_request_id' => $request->id,
                'label' => 'Transit center: '.$center->name,
                'monthly_amount' => $monthlyAmount,
                'starts_on' => $startsOn->toDateString(),
                'billing_starts_on' => Carbon::parse($startsOn)->startOfMonth()->addMonths($billNextMonth ? 1 : 0)->toDateString(),
            ]);

            $billing = $this->invoices->addExtraToExistingBills($extra);

            $request->update([
                'status' => 'approved',
                'approved_amount' => $monthlyAmount,
                'starts_on' => $startsOn->toDateString(),
                'reviewed_by' => $reviewer->id,
                'reviewed_at' => now(),
            ]);

            return [
                'added' => $billing['added'],
                'not_changed' => array_values(array_unique([...$billing['not_changed'], ...$notChanged])),
            ];
        });
    }

    /**
     * Approves a stop request: the plan from this center ends after $lastDay.
     *
     * @return array{added: list<string>, not_changed: list<string>} not_changed: paid bills that still carry the charge
     */
    public function approveStop(TransitRequest $request, CarbonInterface $lastDay, User $reviewer): array
    {
        return DB::transaction(function () use ($request, $lastDay, $reviewer) {
            $notChanged = [];
            foreach ($this->runningPlans($request->student, $request->transitCenter, $lastDay) as $plan) {
                $notChanged = [...$notChanged, ...$this->endPlan($plan, $lastDay)];
            }

            $request->update([
                'status' => 'approved',
                'ends_on' => $lastDay->toDateString(),
                'reviewed_by' => $reviewer->id,
                'reviewed_at' => now(),
            ]);

            return ['added' => [], 'not_changed' => array_values(array_unique($notChanged))];
        });
    }

    /**
     * @param  list<string>  $directions
     * @return list<string> months of paid bills that still carry an ended charge
     */
    private function endPlansCovering(Student $student, array $directions, CarbonInterface $lastDay): array
    {
        $notChanged = [];
        foreach ($this->runningPlans($student, null, $lastDay) as $plan) {
            if (array_intersect($plan->directions(), $directions)) {
                $notChanged = [...$notChanged, ...$this->endPlan($plan, $lastDay)];
            }
        }

        return $notChanged;
    }

    /**
     * Ends a plan's rides and charge after $lastDay; parts not started by then
     * are removed. Its line comes off unpaid bills for months after the end.
     *
     * @return list<string> months of paid bills that still carry the charge
     */
    private function endPlan(TransitRequest $plan, CarbonInterface $lastDay): array
    {
        $day = $lastDay->toDateString();
        $notChanged = [];

        foreach (StudentExtra::where('transit_request_id', $plan->id)->get() as $extra) {
            $removedEntirely = $extra->starts_on->toDateString() > $day;
            $notChanged = [...$notChanged, ...$this->invoices->removeExtraFromBills($extra, $removedEntirely ? null : Carbon::parse($lastDay))];
        }

        foreach ([StudentRide::class, StudentExtra::class] as $model) {
            $model::where('transit_request_id', $plan->id)->whereDate('starts_on', '>', $day)->delete();
            $model::where('transit_request_id', $plan->id)
                ->where(fn ($q) => $q->whereNull('ends_on')->orWhereDate('ends_on', '>', $day))
                ->update(['ends_on' => $day]);
        }

        return $notChanged;
    }

    /**
     * The center's stop on a route, added the first time a child goes to the
     * center on that route. It goes after $afterStopId (null = first stop).
     */
    private function centerStopOn(Route $route, TransitCenter $center, ?int $afterStopId): RouteStop
    {
        $existing = RouteStop::where('route_id', $route->id)->where('transit_center_id', $center->id)->first();
        if ($existing) {
            return $existing;
        }

        $after = $afterStopId ? RouteStop::where('route_id', $route->id)->find($afterStopId) : null;
        $sequence = $after
            ? $after->sequence + 1
            : (int) (RouteStop::where('route_id', $route->id)->min('sequence') ?? 1);

        // Make room, from the end backwards so the (route, sequence) unique index never clashes.
        RouteStop::where('route_id', $route->id)
            ->where('sequence', '>=', $sequence)
            ->orderByDesc('sequence')
            ->get()
            ->each(fn (RouteStop $stop) => $stop->update(['sequence' => $stop->sequence + 1]));

        return RouteStop::create([
            'tenant_id' => $route->tenant_id,
            'route_id' => $route->id,
            'transit_center_id' => $center->id,
            'name' => $center->name,
            'sequence' => $sequence,
        ]);
    }
}
