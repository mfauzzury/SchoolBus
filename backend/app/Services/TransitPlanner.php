<?php

namespace App\Services;

use App\Enums\TransitLeg;
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
     * Approved start requests whose plan is still running (or starts later)
     * for the child, optionally only those from one center.
     *
     * @return Collection<int, TransitRequest>
     */
    public function runningPlans(Student $student, ?TransitCenter $center = null, ?CarbonInterface $from = null): Collection
    {
        return TransitRequest::runningPlan($from ?? Carbon::today())
            ->where('student_id', $student->id)
            ->when($center, fn ($q) => $q->where('transit_center_id', $center->id))
            ->with(['transitCenter:id,name', 'extras'])
            ->get();
    }

    /**
     * The plan in a line: what the bus does, from when until when, and the
     * monthly extra. Needs the plan's `extras` loaded.
     *
     * @return array{request_id: int, legs: ?array, starts_on: ?string, ends_on: ?string, monthly_amount: mixed}
     */
    public function planLine(TransitRequest $plan): array
    {
        $extra = $plan->extras->sortByDesc('id')->first();

        return [
            'request_id' => $plan->id,
            'legs' => $plan->legs,
            'starts_on' => $plan->starts_on?->toDateString(),
            'ends_on' => $extra?->ends_on?->toDateString(),
            'monthly_amount' => $extra?->monthly_amount ?? $plan->approved_amount,
        ];
    }

    /**
     * The running plans of one child in plain terms for the parent and
     * operator screens.
     *
     * @return list<array<string, mixed>>
     */
    public function summaries(Student $student): array
    {
        return $this->summariesFor(collect([$student]))[$student->id];
    }

    /**
     * The running plans of several children in plain terms: the center, what
     * the bus does, from when, the monthly extra, and which bus (and driver)
     * does each part — usually two different buses. One batch of queries
     * however many children.
     *
     * @param  Collection<int, Student>  $students
     * @return array<int, list<array<string, mixed>>> by student id
     */
    public function summariesFor(Collection $students): array
    {
        $plans = TransitRequest::runningPlan(Carbon::today())
            ->whereIn('student_id', $students->pluck('id'))
            ->with([
                'transitCenter:id,name,phone',
                'extras',
                'rides.route:id,name,bus_id,driver_id',
                'rides.route.bus:id,plate_number',
                'rides.route.driver:id,full_name,phone',
                'rides.boardStop:id,name,transit_center_id',
                'rides.alightStop:id,name,transit_center_id',
            ])
            ->get()
            ->sortBy('starts_on')
            ->groupBy('student_id');

        return $students->mapWithKeys(fn (Student $student) => [
            $student->id => ($plans->get($student->id) ?? collect())->map(fn (TransitRequest $plan) => $this->summarize($plan))->values()->all(),
        ])->all();
    }

    /** @return array<string, mixed> */
    private function summarize(TransitRequest $plan): array
    {
        return [
            ...$this->planLine($plan),
            'transit_center' => $plan->transitCenter?->only(['id', 'name', 'phone']),
            'leave_center_at' => $plan->leave_center_at,
            'rides' => $plan->rides
                // Morning before afternoon; within a trip, the part that ends at the center first.
                ->sortBy(fn (StudentRide $r) => ($r->direction === 'pickup' ? 0 : 2) + ($r->alightStop?->transit_center_id ? 0 : 1))
                ->map(fn (StudentRide $r) => [
                    'direction' => $r->direction,
                    // Null means the school end of the route.
                    'from' => $r->boardStop?->name,
                    'to' => $r->alightStop?->name,
                    'route' => $r->route?->name,
                    'bus_plate' => $r->route?->bus?->plate_number,
                    'driver' => $r->route?->driver?->only(['full_name', 'phone']),
                ])->values()->all(),
        ];
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
     * The operator ends a plan without waiting for the center to ask (e.g.
     * the parent phoned). It is recorded as an approved stop the center can
     * see, and answers any stop the center had already asked for. All or nothing.
     *
     * @return array{stop: TransitRequest, billing: array{added: list<string>, not_changed: list<string>}}
     */
    public function endByOperator(TransitRequest $plan, CarbonInterface $lastDay, User $operator): array
    {
        return DB::transaction(function () use ($plan, $lastDay, $operator) {
            TransitRequest::pending()
                ->where('student_id', $plan->student_id)
                ->where('transit_center_id', $plan->transit_center_id)
                ->where('kind', 'stop')
                ->update(['status' => 'cancelled']);

            $stop = TransitRequest::create([
                'tenant_id' => $plan->tenant_id,
                'transit_center_id' => $plan->transit_center_id,
                'student_id' => $plan->student_id,
                'kind' => 'stop',
                'ends_on' => $lastDay->toDateString(),
                'note' => 'Ended by the bus operator.',
                'status' => 'pending',
            ]);

            $billing = $this->approveStop($stop, $lastDay, $operator);

            return ['stop' => $stop->fresh(), 'billing' => $billing];
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

        foreach ($plan->extras as $extra) {
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
