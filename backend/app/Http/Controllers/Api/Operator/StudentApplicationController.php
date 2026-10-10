<?php

namespace App\Http\Controllers\Api\Operator;

use App\Http\Controllers\Controller;
use App\Models\Route;
use App\Models\RouteStop;
use App\Models\Student;
use App\Models\StudentApplication;
use App\Services\InvoiceGenerator;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class StudentApplicationController extends Controller
{
    public function __construct(private readonly InvoiceGenerator $invoiceGenerator)
    {
    }

    public function index(Request $request)
    {
        $query = StudentApplication::with([
            'parentProfile:id,full_name,phone,email',
            'route:id,name',
        ]);

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        return $query->orderBy('created_at')->get();
    }

    public function show(StudentApplication $studentApplication)
    {
        return $studentApplication->load([
            'parentProfile:id,full_name,phone,email',
            'route:id,name',
            'resultingStudent:id,route_id,fee_override,billing_starts_on',
        ]);
    }

    public function approve(Request $request, StudentApplication $studentApplication)
    {
        if ($studentApplication->status !== 'pending') {
            abort(422, 'This application has already been reviewed.');
        }

        $tenantId = $request->user()->tenant_id;

        $data = $request->validate([
            'route_id' => ['required', Rule::exists('routes', 'id')->where('tenant_id', $tenantId)],
            'school_name' => 'required|string|max:255',
            'fee_override' => 'nullable|numeric|min:0',
            'pickup_stop_id' => ['nullable', Rule::exists('route_stops', 'id')->where('tenant_id', $tenantId)],
            // Bills cover whole calendar months, so a child joining part-way through
            // either gets this month's bill (optionally for a reduced amount) or
            // starts being billed from next month.
            'billing_start' => ['nullable', Rule::in(['this_month', 'next_month'])],
            'first_month_amount' => 'nullable|numeric|min:0',
        ]);

        if (! empty($data['pickup_stop_id'])) {
            $belongsToRoute = RouteStop::where('id', $data['pickup_stop_id'])
                ->where('route_id', $data['route_id'])
                ->exists();

            if (! $belongsToRoute) {
                throw ValidationException::withMessages([
                    'pickup_stop_id' => 'This stop does not belong to the selected route.',
                ]);
            }
        }

        $hasFee = isset($data['fee_override'])
            || Route::findOrFail($data['route_id'])->feeFor($studentApplication->package_type) !== null;

        if (! $hasFee) {
            throw ValidationException::withMessages([
                'route_id' => 'This route has no monthly fee yet. Set one on the route, or enter a monthly fee for this child.',
            ]);
        }

        $startsNextMonth = ($data['billing_start'] ?? 'this_month') === 'next_month';
        $billingStartsOn = InvoiceGenerator::currentMonth()->addMonths($startsNextMonth ? 1 : 0);

        DB::transaction(function () use ($request, $studentApplication, $data, $billingStartsOn) {
            $student = Student::create([
                'tenant_id' => $studentApplication->tenant_id,
                'parent_id' => $studentApplication->parent_id,
                'route_id' => $data['route_id'],
                'pickup_stop_id' => $data['pickup_stop_id'] ?? null,
                'full_name' => $studentApplication->full_name,
                'date_of_birth' => $studentApplication->date_of_birth,
                'school_name' => $data['school_name'],
                'package_type' => $studentApplication->package_type,
                'billing_period' => $studentApplication->billing_period,
                'enrollment_status' => 'active',
                'fee_override' => $data['fee_override'] ?? null,
                'billing_starts_on' => $billingStartsOn->toDateString(),
            ]);

            // No bill comes out of this when billing starts next month or this is
            // a month the operator doesn't bill; the daily job issues the first one.
            $this->invoiceGenerator->generate($student, $data['first_month_amount'] ?? null);

            $studentApplication->update([
                'status' => 'approved',
                'route_id' => $data['route_id'],
                'fee_override' => $data['fee_override'] ?? null,
                'resulting_student_id' => $student->id,
                'reviewed_by' => $request->user()->id,
                'reviewed_at' => now(),
            ]);
        });

        return $studentApplication->load(['resultingStudent', 'route:id,name']);
    }

    public function reject(Request $request, StudentApplication $studentApplication)
    {
        if ($studentApplication->status !== 'pending') {
            abort(422, 'This application has already been reviewed.');
        }

        $data = $request->validate([
            'rejection_reason' => 'required|string|max:1000',
        ]);

        $studentApplication->update([
            'status' => 'rejected',
            'rejection_reason' => $data['rejection_reason'],
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ]);

        return $studentApplication;
    }
}
