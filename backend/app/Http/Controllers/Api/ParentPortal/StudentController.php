<?php

namespace App\Http\Controllers\Api\ParentPortal;

use App\Http\Controllers\Controller;
use App\Models\RouteStop;
use App\Services\InvoiceGenerator;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class StudentController extends Controller
{
    public function __construct(private readonly InvoiceGenerator $invoiceGenerator)
    {
    }

    public function index(Request $request)
    {
        return $request->user()->parentProfile
            ->students()
            ->with(['route', 'pickupStop', 'invoices'])
            ->orderBy('created_at')
            ->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'full_name' => 'required|string|max:255',
            'date_of_birth' => 'required|date|before:today',
            'school_name' => 'required|string|max:255',
            'route_id' => 'required|exists:routes,id',
            'pickup_stop_id' => 'nullable|exists:route_stops,id',
            'package_type' => ['required', Rule::in(['one_way', 'return'])],
            'billing_period' => ['required', Rule::in(['monthly', 'quarterly', 'half_year', 'yearly'])],
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

        $parent = $request->user()->parentProfile;

        $student = $parent->students()->create([
            ...$data,
            'enrollment_status' => 'active',
        ]);

        $this->invoiceGenerator->generate($student);

        // busOperator gets lazy-loaded (and cached on the instance) by the fee
        // calculation inside generate() — strip it, it's not part of this response shape.
        $student->load(['route', 'pickupStop', 'invoices'])->unsetRelation('busOperator');

        return response()->json($student, 201);
    }
}
