<?php

namespace App\Http\Controllers\Api\Driver;

use App\Http\Controllers\Controller;
use App\Models\BusOperator;
use App\Models\Staff;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Mobile login for drivers: operator_code + phone + PIN, since staff.phone
     * has no uniqueness constraint (even per tenant) and can't disambiguate
     * on its own — the operator code resolves the tenant first. Returns a
     * Sanctum bearer token; the web app's cookie/session auth is untouched.
     */
    public function login(Request $request)
    {
        $data = $request->validate([
            'operator_code' => 'required|string',
            'phone' => 'required|string',
            'pin' => 'required|string',
            'device_name' => 'nullable|string|max:255',
        ]);

        $invalid = fn () => throw ValidationException::withMessages([
            'phone' => 'Invalid credentials.',
        ]);

        $tenant = BusOperator::where('operator_code', $data['operator_code'])->first();
        if (! $tenant) {
            $invalid();
        }

        // Compare digits only — drivers may type their number with or without
        // the dashes/spaces the operator originally entered when adding staff,
        // and staff.phone has no canonical stored format to match exactly against.
        $normalize = fn (string $phone) => preg_replace('/\D+/', '', $phone);
        $submittedPhone = $normalize($data['phone']);

        $staff = Staff::where('tenant_id', $tenant->id)
            ->whereNotNull('user_id')
            ->get()
            ->first(fn (Staff $candidate) => $normalize($candidate->phone) === $submittedPhone);

        if (! $staff || ! $staff->user || ! Hash::check($data['pin'], $staff->user->password)) {
            $invalid();
        }

        $token = $staff->user->createToken($data['device_name'] ?? 'driver-app')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => $staff->user->makeHidden('roles'),
            'staff' => $staff,
        ], 201);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out']);
    }
}
