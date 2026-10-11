<?php

namespace App\Support;

use App\Models\IntegrationSetting;
use Illuminate\Support\Facades\Mail;
use Throwable;

/**
 * Turns the Owner's saved integration settings into live configuration.
 */
class Integrations
{
    public const BREVO_HOST = 'smtp-relay.brevo.com';

    public const BREVO_PORT = 587;

    /**
     * A Laravel mailer definition for Brevo's SMTP relay.
     *
     * @param  array<string, mixed>  $settings
     * @return array<string, mixed>
     */
    public static function brevoMailer(array $settings): array
    {
        return [
            'transport' => 'smtp',
            'host' => self::BREVO_HOST,
            'port' => self::BREVO_PORT,
            // Port 587 upgrades to TLS itself (STARTTLS); "smtps" would be implicit TLS on 465.
            'scheme' => 'smtp',
            'username' => $settings['smtp_login'] ?? null,
            'password' => $settings['smtp_key'] ?? null,
            'timeout' => 10,
        ];
    }

    /**
     * Send every email through Brevo when it has been switched on. Safe to call
     * any time (before migrations, in tests, from a long-running worker): if
     * the table is missing or Brevo is not enabled, nothing changes.
     */
    public static function applyMail(): void
    {
        try {
            $row = IntegrationSetting::find(IntegrationSetting::BREVO);
        } catch (Throwable) {
            return;
        }

        if (! $row?->enabled) {
            return;
        }

        $settings = $row->values();

        foreach (['smtp_login', 'smtp_key', 'from_email'] as $required) {
            if (blank($settings[$required] ?? null)) {
                return;
            }
        }

        $previous = config('mail.default');

        config([
            'mail.mailers.brevo' => self::brevoMailer($settings),
            'mail.default' => 'brevo',
            'mail.from' => [
                'address' => $settings['from_email'],
                'name' => $settings['from_name'] ?? config('mail.from.name'),
            ],
        ]);

        // A worker that already resolved the old mailer must pick up the new one.
        Mail::purge('brevo');
        if ($previous && $previous !== 'brevo') {
            Mail::purge($previous);
        }
    }
}
