<?php

namespace App\Http\Controllers\Api\Transit;

use App\Http\Controllers\Api\Transit\Concerns\ActsAsTransitCenter;
use App\Http\Controllers\Controller;
use App\Models\Student;
use App\Models\TransitCenter;
use App\Models\TransitRequest;
use App\Services\TransitPlanner;
use Illuminate\Http\Request;

/**
 * Lets a center find a child of its bus operator, by the child's name or the
 * parent's phone number, and see the child's route to place the center on it.
 * Only what is needed to recognise the child is shown — never fees or bills.
 */
class StudentController extends Controller
{
    use ActsAsTransitCenter;

    public function __construct(private readonly TransitPlanner $planner) {}

    public function index(Request $request)
    {
        $center = $this->center($request);
        $q = trim((string) $request->query('q', ''));
        $digits = preg_replace('/\D/', '', $q);

        if (mb_strlen($q) < 3) {
            return [];
        }

        $query = Student::where('enrollment_status', 'active')
            ->with(['parentProfile:id,full_name,phone', 'route:id,name']);

        if (strlen($digits) >= 6) {
            // A phone number: match however it was typed (spaces, dashes).
            $query->whereHas('parentProfile', fn ($p) => $p->whereRaw(
                "REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '+', '') LIKE ?",
                ['%'.$digits.'%'],
            ));
        } else {
            $query->whereRaw('LOWER(full_name) LIKE ?', ['%'.mb_strtolower($q).'%']);
        }

        return $query->orderBy('full_name')->limit(10)->get()
            ->map(fn (Student $student) => [
                ...$this->summary($student),
                'status_here' => $this->statusHere($student, $center),
            ]);
    }

    public function show(Request $request, Student $student)
    {
        $center = $this->center($request);
        abort_unless($student->enrollment_status === 'active', 404);

        $student->load(['parentProfile:id,full_name,phone', 'route.stops']);
        $plan = $this->planner->runningPlans($student, $center)->first();

        return [
            ...$this->summary($student),
            'status_here' => $this->statusHere($student, $center),
            'pickup_stop_id' => $student->pickup_stop_id,
            'route' => $student->route ? [
                'id' => $student->route->id,
                'name' => $student->route->name,
                'session' => $student->route->session,
                'school_destination' => $student->route->school_destination,
                'stops' => $student->route->stops->map(fn ($stop) => [
                    'id' => $stop->id,
                    'name' => $stop->name,
                    'sequence' => $stop->sequence,
                    'is_this_center' => $stop->transit_center_id === $center->id,
                ])->values(),
            ] : null,
            'plan' => $plan ? [
                'request_id' => $plan->id,
                'legs' => $plan->legs,
                'starts_on' => $plan->starts_on?->toDateString(),
                'ends_on' => $plan->extras->first()?->ends_on?->toDateString(),
                'monthly_amount' => $plan->approved_amount,
            ] : null,
        ];
    }

    private function summary(Student $student): array
    {
        $phone = preg_replace('/\D/', '', (string) $student->parentProfile?->phone);

        return [
            'id' => $student->id,
            'full_name' => $student->full_name,
            'school_name' => $student->school_name,
            'class_name' => $student->class_name,
            'parent_name' => $student->parentProfile?->full_name,
            // Enough to tell two children with the same name apart, without handing out the number.
            'parent_phone_end' => $phone ? substr($phone, -4) : null,
            'route_name' => $student->route?->name,
        ];
    }

    /** 'pending', 'active' or null: where this child stands with this center. */
    private function statusHere(Student $student, TransitCenter $center): ?string
    {
        $pending = TransitRequest::where('student_id', $student->id)
            ->where('transit_center_id', $center->id)
            ->where('status', 'pending')
            ->exists();

        if ($pending) {
            return 'pending';
        }

        return $this->planner->runningPlans($student, $center)->isNotEmpty() ? 'active' : null;
    }
}
