<?php

namespace App\Http\Controllers\Api\Public;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\EmailOtp;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password as PasswordRule;
use Illuminate\Validation\ValidationException;

class PasswordResetController extends Controller
{
    /**
     * The last step of "forgot password": the email was proven with a one-time
     * code (see EmailCodeController) and this browser holds the proof token,
     * so the new password can be set.
     */
    public function resetWithCode(Request $request, EmailOtp $otp)
    {
        $data = $request->validate([
            'email' => 'required|email|max:255',
            'email_token' => 'nullable|string|max:255',
            'password' => ['required', 'string', PasswordRule::min(8)->letters()->numbers()],
        ]);

        $user = User::where('email', $data['email'])->first();

        if (! $user || ! $otp->isVerified(EmailOtp::PASSWORD_RESET, $data['email'], $data['email_token'] ?? null)) {
            throw ValidationException::withMessages(['email' => ['unverified']]);
        }

        $user->forceFill([
            'password' => $data['password'],
            'remember_token' => Str::random(60),
        ])->save();

        $otp->forget(EmailOtp::PASSWORD_RESET, $data['email']);

        event(new PasswordReset($user));

        return response()->json(['message' => 'Password reset.']);
    }

    /**
     * Sets a password from an emailed link token. Used by invitations (a new
     * team member, a new operator owner); a forgotten password goes through
     * resetWithCode instead.
     */
    public function reset(Request $request)
    {
        $data = $request->validate([
            'token' => 'required|string',
            'email' => 'required|email',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $status = Password::reset(
            $data,
            function ($user) use ($data) {
                $user->forceFill([
                    'password' => Hash::make($data['password']),
                    'remember_token' => Str::random(60),
                ])->save();

                event(new PasswordReset($user));
            }
        );

        if ($status !== Password::PASSWORD_RESET) {
            throw ValidationException::withMessages([
                'email' => [__($status)],
            ]);
        }

        return response()->json(['message' => 'Password reset.']);
    }
}
