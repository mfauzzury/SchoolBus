<?php

namespace App\Http\Controllers\Api\Transit;

use App\Enums\TransitLeg;
use App\Http\Controllers\Api\Transit\Concerns\ActsAsTransitCenter;
use App\Http\Controllers\Controller;
use App\Models\Student;
use App\Models\TransitRequest;
use App\Services\Notifier;
use App\Services\TransitPlanner;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * A center asks the operator to start or stop carrying a child via the
 * center. Nothing changes for the child until the operator approves.
 */
class RequestController extends Controller
{
    use ActsAsTransitCenter;

    public function __construct(private readonly TransitPlanner $planner) {}

    public function index(Request $request)
    {
        $center = $this->center($request);

        return TransitRequest::where('transit_center_id', $center->id)
            ->with('student:id,full_name,school_name')
            ->latest()
            ->orderByDesc('id')
            ->get()
            ->map(fn (TransitRequest $r) => $this->present($r));
    }

    /** The children this center has a bus plan for now (or starting soon). */
    public function children(Request $request)
    {
        $center = $this->center($request);

        $plans = TransitRequest::runningPlan(today())
            ->where('transit_center_id', $center->id)
            ->with(['student:id,full_name,school_name,class_name', 'extras'])
            ->get();

        // Children whose stop this center has already asked for, in one query.
        $stopAsked = TransitRequest::pending()
            ->where('transit_center_id', $center->id)
            ->where('kind', 'stop')
            ->whereIn('student_id', $plans->pluck('student_id'))
            ->pluck('student_id')
            ->flip();

        return $plans
            ->map(fn (TransitRequest $plan) => [
                ...$this->planner->planLine($plan),
                'student' => $plan->student,
                'stop_pending' => $stopAsked->has($plan->student_id),
            ])
            ->sortBy('student.full_name')
            ->values();
    }

    public function store(Request $request)
    {
        $center = $this->center($request);
        $tenantId = $center->tenant_id;

        $data = $request->validate([
            'student_id' => ['required', Rule::exists('students', 'id')->where('tenant_id', $tenantId)->where('enrollment_status', 'active')],
            // A center only says which child. The operator decides the bus, the stops, the
            // first day and the price when approving, so these are optional.
            'legs' => 'nullable|array|min:1',
            'legs.*' => ['required', 'distinct', Rule::in(TransitLeg::values())],
            'center_after_stop_id' => ['nullable', 'integer'],
            'starts_on' => 'nullable|date|after_or_equal:today',
            'leave_center_at' => 'nullable|date_format:H:i',
            'note' => 'nullable|string|max:1000',
        ]);

        $student = Student::findOrFail($data['student_id']);
        $this->ensureNothingPending($student, $center->id);

        if (! empty($data['center_after_stop_id']) && ! $student->route?->stops()->whereKey($data['center_after_stop_id'])->exists()) {
            throw ValidationException::withMessages(['center_after_stop_id' => 'This stop is not on the child\'s route.']);
        }

        $transitRequest = TransitRequest::create([
            'tenant_id' => $tenantId,
            'transit_center_id' => $center->id,
            'student_id' => $student->id,
            'kind' => 'start',
            // A center sits between school and home, so by default the bus brings the child
            // from school to the center and then home.
            'legs' => array_values($data['legs'] ?? [TransitLeg::SchoolToCenter->value, TransitLeg::CenterToHome->value]),
            'center_after_stop_id' => $data['center_after_stop_id'] ?? null,
            'leave_center_at' => $data['leave_center_at'] ?? null,
            'note' => $data['note'] ?? null,
            'starts_on' => $data['starts_on'] ?? today()->addDay()->toDateString(),
            'indicative_amount' => $center->monthly_price,
            'status' => 'pending',
        ]);

        app(Notifier::class)->transitRequestReceived($transitRequest);

        return response()->json($this->present($transitRequest->load('student:id,full_name,school_name')), 201);
    }

    public function stop(Request $request)
    {
        $center = $this->center($request);

        $data = $request->validate([
            'student_id' => ['required', Rule::exists('students', 'id')->where('tenant_id', $center->tenant_id)],
            'ends_on' => 'required|date|after_or_equal:today',
            'note' => 'nullable|string|max:1000',
        ]);

        $student = Student::findOrFail($data['student_id']);
        $this->ensureNothingPending($student, $center->id);

        if ($this->planner->runningPlans($student, $center)->isEmpty()) {
            abort(422, 'This child has no bus plan with your center.');
        }

        $transitRequest = TransitRequest::create([
            'tenant_id' => $center->tenant_id,
            'transit_center_id' => $center->id,
            'student_id' => $student->id,
            'kind' => 'stop',
            'ends_on' => $data['ends_on'],
            'note' => $data['note'] ?? null,
            'status' => 'pending',
        ]);

        app(Notifier::class)->transitRequestReceived($transitRequest);

        return response()->json($this->present($transitRequest->load('student:id,full_name,school_name')), 201);
    }

    public function cancel(Request $request, TransitRequest $transitRequest)
    {
        $center = $this->center($request);
        abort_unless($transitRequest->transit_center_id === $center->id, 404);
        abort_unless($transitRequest->status === 'pending', 422, 'Only a request still waiting can be cancelled.');

        $transitRequest->update(['status' => 'cancelled']);

        return $this->present($transitRequest->load('student:id,full_name,school_name'));
    }

    private function ensureNothingPending(Student $student, int $centerId): void
    {
        $pending = TransitRequest::pending()
            ->where('student_id', $student->id)
            ->where('transit_center_id', $centerId)
            ->exists();

        abort_if($pending, 422, 'There is already a request waiting for this child. Wait for the operator, or cancel it first.');
    }

    private function present(TransitRequest $r): array
    {
        return [
            'id' => $r->id,
            'kind' => $r->kind,
            'status' => $r->status,
            'student' => $r->student,
            'legs' => $r->legs,
            'starts_on' => $r->starts_on?->toDateString(),
            'ends_on' => $r->ends_on?->toDateString(),
            'leave_center_at' => $r->leave_center_at,
            'note' => $r->note,
            'indicative_amount' => $r->indicative_amount,
            'approved_amount' => $r->approved_amount,
            'rejection_reason' => $r->rejection_reason,
            'created_at' => $r->created_at,
            'reviewed_at' => $r->reviewed_at,
        ];
    }
}
