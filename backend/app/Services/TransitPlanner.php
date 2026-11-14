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
     * @param  list<array{leg: string, route_id: int, center_after_stop_id: ?int, home_stop_id: ?int}>  $legPlans
     */
    public function approveStart(TransitRequest $request, array $legPlans, float $monthlyAmount, CarbonInterface $startsOn, User $reviewer): void
    {
        DB::transaction(function () use ($request, $legPlans, $monthlyAmount, $startsOn, $reviewer) {
            $student = $request->student;
            $center = $request->transitCenter;

            // A child is at one center per part of the day: whatever plan covered
            // these trips before ends the day before this one starts.
            $this->endPlansCovering($student, $request->directions(), $startsOn->copy()->subDay());

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

            StudentExtra::create([
                'tenant_id' => $student->tenant_id,
                'student_id' => $student->id,
                'transit_request_id' => $request->id,
                'label' => 'Transit center: '.$center->name,
                'monthly_amount' => $monthlyAmount,
                'starts_on' => $startsOn->toDateString(),
            ]);

            $request->update([
                'status' => 'approved',
                'approved_amount' => $monthlyAmount,
                'starts_on' => $startsOn->toDateString(),
                'reviewed_by' => $reviewer->id,
                'reviewed_at' => now(),
            ]);
        });
    }

    /** Approves a stop request: the plan from this center ends after $lastDay. */
    public function approveStop(TransitRequest $request, CarbonInterface $lastDay, User $reviewer): void
    {
        DB::transaction(function () use ($request, $lastDay, $reviewer) {
            foreach ($this->runningPlans($request->student, $request->transitCenter, $lastDay) as $plan) {
                $this->endPlan($plan, $lastDay);
            }

            $request->update([
                'status' => 'approved',
                'ends_on' => $lastDay->toDateString(),
                'reviewed_by' => $reviewer->id,
                'reviewed_at' => now(),
            ]);
        });
    }

    /** @param  list<string>  $directions */
    private function endPlansCovering(Student $student, array $directions, CarbonInterface $lastDay): void
    {
        foreach ($this->runningPlans($student, null, $lastDay) as $plan) {
            if (array_intersect($plan->directions(), $directions)) {
                $this->endPlan($plan, $lastDay);
            }
        }
    }

    /** Ends a plan's rides and charge after $lastDay; parts not started by then are removed. */
    private function endPlan(TransitRequest $plan, CarbonInterface $lastDay): void
    {
        $day = $lastDay->toDateString();

        foreach ([StudentRide::class, StudentExtra::class] as $model) {
            $model::where('transit_request_id', $plan->id)->whereDate('starts_on', '>', $day)->delete();
            $model::where('transit_request_id', $plan->id)
                ->where(fn ($q) => $q->whereNull('ends_on')->orWhereDate('ends_on', '>', $day))
                ->update(['ends_on' => $day]);
        }
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
