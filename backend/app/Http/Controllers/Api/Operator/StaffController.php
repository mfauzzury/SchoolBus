<?php

namespace App\Http\Controllers\Api\Operator;

use App\Http\Controllers\Controller;
use App\Models\Staff;
use Illuminate\Http\Request;

class StaffController extends Controller
{
    public function index(Request $request)
    {
        $query = Staff::orderBy('full_name');

        if ($request->filled('role')) {
            $query->where('role', $request->string('role'));
        }

        return $query->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'full_name' => 'required|string|max:255',
            'ic_number' => 'required|string|max:255',
            'phone' => 'required|string|max:255',
            'role' => 'required|in:driver,conductor',
            'license_expiry_date' => 'nullable|date',
            'status' => 'sometimes|in:active,inactive',
        ]);

        return response()->json(Staff::create($data), 201);
    }

    public function show(Staff $staff)
    {
        return $staff;
    }

    public function update(Request $request, Staff $staff)
    {
        $data = $request->validate([
            'full_name' => 'sometimes|required|string|max:255',
            'ic_number' => 'sometimes|required|string|max:255',
            'phone' => 'sometimes|required|string|max:255',
            'role' => 'sometimes|required|in:driver,conductor',
            'license_expiry_date' => 'nullable|date',
            'status' => 'sometimes|in:active,inactive',
        ]);

        $staff->update($data);

        return $staff;
    }

    public function destroy(Staff $staff)
    {
        $staff->delete();

        return response()->json(null, 204);
    }
}
