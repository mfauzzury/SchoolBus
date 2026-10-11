<?php

namespace App\Http\Controllers\Api\Public;

use App\Http\Controllers\Controller;
use App\Models\BusOperator;
use App\Models\User;
use App\Services\Notifier;
use App\Support\EmailOtp;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

class OperatorRegistrationController extends Controller
{
    public function store(Request $request, EmailOtp $otp)
    {
        $data = $request->validate([
            'company_name' => 'required|string|max:255',
            'contact_person' => 'required|string|max:255',
            'contact_phone' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email|unique:bus_operators,email',
            'email_token' => 'nullable|string|max:255',
            'password' => ['required', 'string', Password::min(8)->letters()->numbers()],
        ], ['email.unique' => 'taken']);

        // The email must have been proven with a one-time code, by this browser.
        if (! $otp->isVerified(EmailOtp::REGISTRATION, $data['email'], $data['email_token'] ?? null)) {
            throw ValidationException::withMessages(['email' => ['unverified']]);
        }

        $user = DB::transaction(function () use ($data) {
            $tenant = BusOperator::create([
                'company_name' => $data['company_name'],
                'contact_person' => $data['contact_person'],
                'contact_phone' => $data['contact_phone'],
                'email' => $data['email'],
            ]);

            $user = User::create([
                'tenant_id' => $tenant->id,
                'name' => $data['contact_person'],
                'email' => $data['email'],
                'password' => $data['password'],
            ]);
            $user->assignRole('operator_admin');

            return $user;
        });

        $otp->forget(EmailOtp::REGISTRATION, $data['email']);

        // They are logged in right now, so count it as a login (the dashboard's
        // "no login in 30 days" would otherwise flag every brand-new operator).
        $user->forceFill(['last_login_at' => now()])->save();

        app(Notifier::class)->operatorSignedUp($user->busOperator);

        Auth::login($user);
        $request->session()->regenerate();

        return response()->json(['message' => 'Registered'], 201);
    }
}
