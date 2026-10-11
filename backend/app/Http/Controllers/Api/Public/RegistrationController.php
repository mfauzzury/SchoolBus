<?php

namespace App\Http\Controllers\Api\Public;

use App\Http\Controllers\Controller;
use App\Models\BusOperator;
use App\Models\ParentProfile;
use App\Models\User;
use App\Support\EmailOtp;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

class RegistrationController extends Controller
{
    public function show(string $operatorCode)
    {
        $tenant = BusOperator::where('operator_code', $operatorCode)->firstOrFail();

        // A suspended operator is not taking new sign-ups: behave as if the code doesn't exist.
        abort_if($tenant->isSuspended(), 404);

        return response()->json([
            'company_name' => $tenant->company_name,
            'logo_url' => $tenant->logo_url,
        ]);
    }

    public function store(Request $request, string $operatorCode, EmailOtp $otp)
    {
        $tenant = BusOperator::where('operator_code', $operatorCode)->firstOrFail();

        // A suspended operator is not taking new sign-ups: behave as if the code doesn't exist.
        abort_if($tenant->isSuspended(), 404);

        $data = $request->validate([
            'full_name' => 'required|string|max:255',
            'relationship' => ['nullable', Rule::in(['father', 'mother', 'guardian'])],
            'gender' => ['nullable', Rule::in(['male', 'female'])],
            'ic_number' => 'required|string|max:255',
            'phone' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'email_token' => 'nullable|string|max:255',
            'address_line1' => 'nullable|string|max:255',
            'address_line2' => 'nullable|string|max:255',
            'city' => 'nullable|string|max:255',
            'postcode' => 'nullable|string|max:20',
            'emergency_contact_name' => 'nullable|string|max:255',
            'emergency_contact_relationship' => 'nullable|string|max:255',
            'emergency_contact_phone' => 'nullable|string|max:255',
            'password' => ['required', 'string', Password::min(8)->letters()->numbers()],
        ], ['email.unique' => 'taken']);

        // The email must have been proven with a one-time code, by this browser.
        if (! $otp->isVerified(EmailOtp::REGISTRATION, $data['email'], $data['email_token'] ?? null)) {
            throw ValidationException::withMessages(['email' => ['unverified']]);
        }

        $user = DB::transaction(function () use ($tenant, $data) {
            $user = User::create([
                'tenant_id' => $tenant->id,
                'name' => $data['full_name'],
                'email' => $data['email'],
                'password' => $data['password'],
            ]);
            $user->assignRole('parent');

            ParentProfile::create([
                'tenant_id' => $tenant->id,
                'user_id' => $user->id,
                'full_name' => $data['full_name'],
                'relationship' => $data['relationship'] ?? null,
                'gender' => $data['gender'] ?? null,
                'ic_number' => $data['ic_number'],
                'phone' => $data['phone'],
                'email' => $data['email'],
                'address_line1' => $data['address_line1'] ?? null,
                'address_line2' => $data['address_line2'] ?? null,
                'city' => $data['city'] ?? null,
                'postcode' => $data['postcode'] ?? null,
                'emergency_contact_name' => $data['emergency_contact_name'] ?? null,
                'emergency_contact_relationship' => $data['emergency_contact_relationship'] ?? null,
                'emergency_contact_phone' => $data['emergency_contact_phone'] ?? null,
            ]);

            return $user;
        });

        $otp->forget(EmailOtp::REGISTRATION, $data['email']);

        Auth::login($user);
        $request->session()->regenerate();

        return response()->json(['message' => 'Registered'], 201);
    }
}
