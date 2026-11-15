<?php

namespace App\Http\Controllers\Api\Operator;

use App\Enums\TransitLeg;
use App\Http\Controllers\Controller;
use App\Models\RouteStop;
use App\Models\TransitRequest;
use App\Services\Notifier;
use App\Services\TransitPlanner;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Requests from transit centers. The operator checks with the parent, then
 * decides which bus does each part of the day and the final monthly price.
 */
class TransitRequestController extends Controller
{
    public function __construct(private readonly TransitPlanner $planner) {}

    public function index(Request $request)
    {
        return TransitRequest::with(['transitCenter:id,name', 'student:id,full_name,school_name,parent_id', 'student.parentProfile:id,full_name,phone'])
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->orderBy('created_at')
            ->get();
    }

    public function show(TransitRequest $transitRequest)
    {
        $transitRequest->load([
            'transitCenter:id,name,phone,contact_person,address',
            'student.parentProfile:id,full_name,phone,email',
            'student.pickupStop:id,name,sequence',
            'centerAfterStop:id,name,sequence',
            'reviewer:id,name',
        ]);

        return [
            ...$transitRequest->toArray(),
            // What the child has now, so the operator sees what this replaces.
            'running_plans' => $this->planner->runningPlans($transitRequest->student)
                ->map(fn (TransitRequest $plan) => [
                    'id' => $plan->id,
                    'transit_center' => $plan->transitCenter?->name,
                    ...Arr::only($this->planner->planLine($plan), ['legs', 'starts_on', 'ends_on', 'monthly_amount']),
                ])->values(),
        ];
    }

    public function approve(Request $request, TransitRequest $transitRequest)
    {
        abort_unless($transitRequest->status === 'pending', 422, 'This request has already been decided.');

        if ($transitRequest->kind === 'stop') {
            $data = $request->validate(['ends_on' => 'required|date|after_or_equal:today']);
            $billing = $this->planner->approveStop($transitRequest, Carbon::parse($data['ends_on']), $request->user());
        } else {
            $tenantId = $request->user()->tenant_id;
            $data = $request->validate([
                'monthly_amount' => 'required|numeric|min:0|max:99999',
                'starts_on' => 'required|date|after_or_equal:today',
                // Bills cover whole months: charge the start month, or begin with the next one.
                'bill_from' => ['nullable', Rule::in(['start_month', 'next_month'])],
                'legs' => 'required|array',
                'legs.*.leg' => ['required', 'distinct', Rule::in($transitRequest->legs ?? [])],
                'legs.*.route_id' => ['required', Rule::exists('routes', 'id')->where('tenant_id', $tenantId)],
                'legs.*.center_after_stop_id' => 'nullable|integer',
                'legs.*.home_stop_id' => 'nullable|integer',
            ]);

            $this->checkLegPlans($transitRequest, $data['legs']);

            $billing = $this->planner->approveStart(
                $transitRequest,
                $data['legs'],
                (float) $data['monthly_amount'],
                Carbon::parse($data['starts_on']),
                $request->user(),
                ($data['bill_from'] ?? 'start_month') === 'next_month',
            );
        }

        app(Notifier::class)->transitPlanChanged($transitRequest->fresh());

        // `billing` says which bills already made were changed (added) and which
        // were paid and could not be (not_changed), so the operator can sort those by hand.
        return [...$this->show($transitRequest->fresh()), 'billing' => $billing];
    }

    public function reject(Request $request, TransitRequest $transitRequest)
    {
        abort_unless($transitRequest->status === 'pending', 422, 'This request has already been decided.');

        $data = $request->validate(['rejection_reason' => 'required|string|max:1000']);

        $transitRequest->update([
            'status' => 'rejected',
            'rejection_reason' => $data['rejection_reason'],
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ]);

        return $this->show($transitRequest->fresh());
    }

    /** Every asked-for leg has a bus, and every stop picked is on that bus's route. */
    private function checkLegPlans(TransitRequest $transitRequest, array $legPlans): void
    {
        $planned = array_column($legPlans, 'leg');
        if (array_diff($transitRequest->legs ?? [], $planned)) {
            throw ValidationException::withMessages(['legs' => 'Choose a bus for every part of the day the center asked for.']);
        }

        // A route makes one afternoon (and one morning) trip a day, so the same
        // route can't take a child to the center and fetch them later as well.
        $routeByDirection = [];
        foreach ($legPlans as $i => $plan) {
            $direction = TransitLeg::from($plan['leg'])->direction();
            if (($routeByDirection[$direction] ?? null) === (int) $plan['route_id']) {
                throw ValidationException::withMessages([
                    "legs.$i.route_id" => 'This route already does the first part of this trip. Choose another bus run, such as an evening route.',
                ]);
            }
            $routeByDirection[$direction] = (int) $plan['route_id'];
        }

        foreach ($legPlans as $i => $plan) {
            $onRoute = fn (?int $stopId) => $stopId === null
                || RouteStop::where('route_id', $plan['route_id'])->whereKey($stopId)->exists();

            if (! $onRoute($plan['center_after_stop_id'] ?? null)) {
                throw ValidationException::withMessages(["legs.$i.center_after_stop_id" => 'This stop is not on the chosen route.']);
            }

            $needsHome = TransitLeg::from($plan['leg'])->needsHomeStop();
            if ($needsHome && empty($plan['home_stop_id'])) {
                throw ValidationException::withMessages(["legs.$i.home_stop_id" => 'Choose the child\'s home stop on this route.']);
            }
            if (! $onRoute($plan['home_stop_id'] ?? null)) {
                throw ValidationException::withMessages(["legs.$i.home_stop_id" => 'This stop is not on the chosen route.']);
            }
        }
    }
}
