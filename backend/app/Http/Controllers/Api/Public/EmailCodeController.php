<?php

namespace App\Http\Controllers\Api\Public;

use App\Http\Controllers\Controller;
use App\Mail\EmailOtpMail;
use App\Models\BusOperator;
use App\Models\User;
use App\Support\EmailOtp;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;
use Throwable;

/**
 * Proves an email address with a one-time code, ahead of the form that needs it:
 * parent sign-up, operator sign-up and "forgot password". Each flow has a send
 * and a verify endpoint. Verifying hands the browser a proof token, which the
 * endpoint that finally creates the account or sets the password asks for.
 */
class EmailCodeController extends Controller
{
    /** A word the page can tell apart from "that is not an email address". */
    private const MESSAGES = ['email.unique' => 'taken'];

    public function __construct(private readonly EmailOtp $otp) {}

    public function sendForParent(Request $request, string $operatorCode)
    {
        $tenant = $this->tenant($operatorCode);

        $data = $request->validate([
            'email' => 'required|email|max:255|unique:users,email',
        ], self::MESSAGES);

        return $this->deliver($data['email'], EmailOtp::REGISTRATION, $tenant->company_name);
    }

    public function verifyForParent(Request $request, string $operatorCode)
    {
        $this->tenant($operatorCode);

        return $this->check($request, EmailOtp::REGISTRATION);
    }

    public function sendForOperator(Request $request)
    {
        $data = $request->validate([
            'email' => 'required|email|max:255|unique:users,email|unique:bus_operators,email',
        ], self::MESSAGES);

        return $this->deliver($data['email'], EmailOtp::REGISTRATION);
    }

    public function verifyForOperator(Request $request)
    {
        return $this->check($request, EmailOtp::REGISTRATION);
    }

    /**
     * Always answers the same way, whether or not the email has an account, so
     * this cannot be used to find out who is registered. The email itself goes
     * out after the answer, so a slow mail server cannot give it away either.
     */
    public function sendForPasswordReset(Request $request)
    {
        $data = $request->validate(['email' => 'required|email|max:255']);
        $email = $data['email'];

        $code = $this->otp->issue(EmailOtp::PASSWORD_RESET, $email);

        if ($code !== null && User::where('email', $email)->exists()) {
            dispatch(function () use ($email, $code) {
                try {
                    Mail::to($email)->send(new EmailOtpMail($code, EmailOtp::PASSWORD_RESET));
                } catch (Throwable $e) {
                    report($e);
                    $this->otp->discard(EmailOtp::PASSWORD_RESET, $email);
                }
            })->afterResponse();
        }

        return response()->json([
            'message' => 'If that email is registered, a code has been sent.',
            'resend_after' => EmailOtp::RESEND_SECONDS,
        ]);
    }

    public function verifyForPasswordReset(Request $request)
    {
        return $this->check($request, EmailOtp::PASSWORD_RESET);
    }

    private function deliver(string $email, string $purpose, ?string $company = null): JsonResponse
    {
        $code = $this->otp->issue($purpose, $email);

        if ($code === null) {
            return response()->json([
                'message' => 'Please wait before asking for another code.',
                'retry_after' => $this->otp->secondsUntilResend($purpose, $email),
                // Lets the page tell "your code is already on its way" from "none was sent".
                'pending' => $this->otp->hasPendingCode($purpose, $email),
                'locked' => $this->otp->isLocked($purpose, $email),
            ], 429);
        }

        try {
            Mail::to($email)->send(new EmailOtpMail($code, $purpose, $company));
        } catch (Throwable $e) {
            report($e);
            $this->otp->discard($purpose, $email);

            return response()->json(['message' => 'The email could not be sent. Please try again.'], 502);
        }

        return response()->json([
            'message' => 'Code sent',
            'resend_after' => EmailOtp::RESEND_SECONDS,
        ]);
    }

    private function check(Request $request, string $purpose): JsonResponse
    {
        $data = $request->validate([
            'email' => 'required|email|max:255',
            'code' => 'required|digits:6',
        ]);

        [$result, $token] = $this->otp->verify($purpose, $data['email'], $data['code']);

        if ($result !== EmailOtp::OK) {
            // The page turns this word into a sentence in the person's language.
            throw ValidationException::withMessages(['code' => [$result]]);
        }

        // The final step (create the account, set the password) must send this back.
        return response()->json(['verified' => true, 'token' => $token]);
    }

    private function tenant(string $operatorCode): BusOperator
    {
        $tenant = BusOperator::where('operator_code', $operatorCode)->firstOrFail();

        // A suspended operator is not taking new sign-ups: behave as if the code doesn't exist.
        abort_if($tenant->isSuspended(), 404);

        return $tenant;
    }
}
