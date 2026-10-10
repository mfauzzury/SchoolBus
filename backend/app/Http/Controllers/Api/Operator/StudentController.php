<?php

namespace App\Http\Controllers\Api\Operator;

use App\Http\Controllers\Controller;
use App\Models\Student;
use App\Services\InvoiceGenerator;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class StudentController extends Controller
{
    private const RELATIONS = [
        'parentProfile:id,full_name,phone,email',
        'route:id,name,base_monthly_fee,one_way_monthly_fee',
        'pickupStop:id,name',
    ];

    public function index(Request $request)
    {
        $query = Student::with([
            ...self::RELATIONS,
            'invoices' => fn ($q) => $q->latest('issued_at')->limit(1),
        ]);

        if ($request->filled('route_id')) {
            $query->where('route_id', $request->integer('route_id'));
        }

        if ($request->filled('status')) {
            $query->where('enrollment_status', $request->string('status'));
        }

        return $query->orderBy('full_name')->get();
    }

    /**
     * Everything the operator knows about one child: their details, route and
     * stop, full parent record, and the parent's other children (siblings share
     * one family balance and the sibling discount). Bills and payments are
     * fetched separately through the invoice endpoints.
     */
    public function show(Student $student, InvoiceGenerator $generator)
    {
        $student->load([
            'parentProfile',
            'route:id,name,zone,school_destination,base_monthly_fee,one_way_monthly_fee',
            'pickupStop:id,name',
        ]);

        $student->setAttribute('siblings', $student->parentProfile->students()
            ->whereKeyNot($student->id)
            ->with('route:id,name')
            ->orderBy('full_name')
            ->get(['id', 'parent_id', 'route_id', 'full_name', 'enrollment_status']));

        $student->setAttribute('next_bill', $generator->preview($student));

        return $student;
    }

    /**
     * Billing settings for one student. Both take effect from the next bill:
     * bills already issued are changed on the bill itself, not here.
     */
    public function update(Request $request, Student $student)
    {
        $data = $request->validate([
            // Null clears the custom fee, returning the student to the route's price.
            'fee_override' => 'sometimes|nullable|numeric|min:0|max:99999.99',
            'enrollment_status' => ['sometimes', Rule::in(['active', 'suspended', 'withdrawn'])],
            // Whole months ("2026-11"); null means no limit on that side.
            'billing_starts_on' => 'sometimes|nullable|date_format:Y-m',
            'billing_ends_on' => 'sometimes|nullable|date_format:Y-m',
        ]);

        foreach (['billing_starts_on', 'billing_ends_on'] as $field) {
            if (filled($data[$field] ?? null)) {
                $data[$field] = Carbon::createFromFormat('Y-m-d', $data[$field].'-01')->toDateString();
            }
        }

        // Judged on the result, so changing only one side is checked against the other as saved.
        $starts = array_key_exists('billing_starts_on', $data) ? $data['billing_starts_on'] : $student->billing_starts_on?->toDateString();
        $ends = array_key_exists('billing_ends_on', $data) ? $data['billing_ends_on'] : $student->billing_ends_on?->toDateString();

        if ($starts && $ends && $ends < $starts) {
            throw ValidationException::withMessages([
                'billing_ends_on' => 'The last billed month cannot be before the first.',
            ]);
        }

        $student->update($data);

        return $student->load(self::RELATIONS);
    }
}
