<?php

namespace App\Http\Controllers\Api\Transit;

use App\Http\Controllers\Api\Transit\Concerns\ActsAsTransitCenter;
use App\Http\Controllers\Controller;
use App\Models\Student;
use App\Models\TransitRequest;
use Illuminate\Http\Request;

/**
 * The transit center's own details and the monthly price it will see as an
 * estimate when asking for a bus.
 */
class CenterController extends Controller
{
    use ActsAsTransitCenter;

    public function show(Request $request)
    {
        $center = $this->center($request);

        return [
            'id' => $center->id,
            'name' => $center->name,
            'contact_person' => $center->contact_person,
            'phone' => $center->phone,
            'email' => $center->email,
            'address' => $center->address,
            'operator' => $center->busOperator->only(['company_name', 'contact_phone', 'email']),
            // What the operator charges a child per month for going via this center; null = not set yet.
            'monthly_price' => $center->monthly_price === null ? null : (float) $center->monthly_price,
        ];
    }

    /**
     * Numbers for the center's start page: who the bus carries to it now,
     * by school, age and gender. Only counts, never names or fees.
     */
    public function stats(Request $request)
    {
        $center = $this->center($request);

        $studentIds = TransitRequest::runningPlan(today())
            ->where('transit_center_id', $center->id)
            ->pluck('student_id')
            ->unique();

        $students = Student::whereIn('id', $studentIds)->get(['id', 'school_name', 'gender', 'date_of_birth']);

        $bySchool = $students
            ->groupBy(fn (Student $s) => trim((string) $s->school_name) ?: null)
            ->map(fn ($group, $name) => ['name' => $name === '' ? null : $name, 'count' => $group->count()])
            ->sortByDesc('count')
            ->values();

        $byAge = $students
            ->filter(fn (Student $s) => $s->date_of_birth !== null)
            ->groupBy(fn (Student $s) => $s->date_of_birth->age)
            ->map(fn ($group, $age) => ['age' => (int) $age, 'count' => $group->count()])
            ->sortBy('age')
            ->values();

        return [
            'students' => $students->count(),
            'waiting' => TransitRequest::pending()
                ->where('transit_center_id', $center->id)
                ->where('kind', 'start')
                ->count(),
            'by_school' => $bySchool,
            'by_age' => $byAge,
            'by_gender' => [
                'male' => $students->where('gender', 'male')->count(),
                'female' => $students->where('gender', 'female')->count(),
                'unknown' => $students->whereNotIn('gender', ['male', 'female'])->count(),
            ],
        ];
    }
}
