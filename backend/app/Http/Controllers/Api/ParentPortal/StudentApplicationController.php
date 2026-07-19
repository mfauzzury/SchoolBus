<?php

namespace App\Http\Controllers\Api\ParentPortal;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class StudentApplicationController extends Controller
{
    public function index(Request $request)
    {
        return $request->user()->parentProfile
            ->studentApplications()
            ->latest()
            ->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'full_name' => 'required|string|max:255',
            'date_of_birth' => 'required|date|before:today',
            'school_name' => 'required|string|max:255',
            'package_type' => ['required', Rule::in(['one_way', 'return'])],
            'billing_period' => ['required', Rule::in(['monthly', 'quarterly', 'half_year', 'yearly'])],
        ]);

        $parent = $request->user()->parentProfile;

        $application = $parent->studentApplications()->create([
            ...$data,
            'status' => 'pending',
        ]);

        return response()->json($application, 201);
    }
}
