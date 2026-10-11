<?php

namespace App\Mail;

use App\Support\EmailOtp;
use App\Support\MailText;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

/** The code someone types in to prove their email: while signing up, or before resetting a password. */
class EmailOtpMail extends Mailable
{
    public readonly ?string $company;

    public function __construct(
        public readonly string $code,
        public readonly string $purpose = EmailOtp::REGISTRATION,
        ?string $company = null,
    ) {
        // Typed by the operator; keep it on one line inside the message.
        $this->company = $company === null ? null : MailText::oneLine($company);
    }

    public function envelope(): Envelope
    {
        return new Envelope(subject: ($this->purpose === EmailOtp::PASSWORD_RESET
            ? 'Kod tetapan semula kata laluan / Password reset code'
            : 'Kod pengesahan / Verification code').' - '.MailText::brand());
    }

    public function content(): Content
    {
        $brand = MailText::plain(MailText::brand());
        $company = filled($this->company) ? MailText::plain($this->company) : null;

        [$ms, $en] = match (true) {
            $this->purpose === EmailOtp::PASSWORD_RESET => [
                "Gunakan kod ini untuk menetapkan semula kata laluan {$brand} anda:",
                "Use this code to reset your {$brand} password.",
            ],
            $company !== null => [
                "Gunakan kod ini untuk mengesahkan e-mel anda dan mendaftar dengan {$company}:",
                "Use this code to confirm your email and register with {$company}.",
            ],
            default => [
                "Gunakan kod ini untuk mengesahkan e-mel anda dan mendaftar syarikat di {$brand}:",
                "Use this code to confirm your email and register your company on {$brand}.",
            ],
        };

        return new Content(markdown: 'mail.email-otp', with: [
            'intentMs' => $ms,
            'intentEn' => $en,
            'minutes' => EmailOtp::CODE_MINUTES,
            'brand' => $brand,
        ]);
    }
}
