<?php

namespace App\Support;

use App\Mail\EmailOtpMail;
use App\Models\EmailTemplate;
use App\Models\User;
use App\Notifications\ApplicationDecided;
use App\Notifications\BillsIssued;
use App\Notifications\PaymentReceived;
use App\Notifications\PaymentReminder;
use Throwable;

/**
 * The wording of the emails sent to parents, and how the platform Owner edits it.
 *
 * Each email is built from a few text blocks (subject, opening sentence, button,
 * closing sentence...). The defaults live here; whatever the Owner has changed is
 * stored in `email_templates` and wins. Names, amounts and tables are never part
 * of the editable text: they go in through {placeholders}.
 */
class EmailTemplates
{
    /** Set while previewing an unsaved edit, so the preview shows it without saving. */
    private static ?array $draft = null;

    private static ?string $draftTemplate = null;

    /**
     * @return array<string, array{
     *   notification_type: string|null,
     *   blocks: array<string, string>,
     *   placeholders: list<string>,
     * }>
     */
    public static function all(): array
    {
        $reminderBits = [
            'button' => 'Bayar sekarang / Pay now',
            'note' => 'Jika anda sudah membayar, sila abaikan e-mel ini. / If you have already paid, please ignore this email.',
        ];

        return [
            'bill_issued' => [
                'notification_type' => 'bill_issued',
                'placeholders' => ['operator', 'parent'],
                'blocks' => [
                    'subject' => 'Bil baharu / New bill - {operator}',
                    'intro' => '{operator} telah mengeluarkan bil baharu:',
                    'button' => 'Lihat dan bayar / View and pay',
                    'outro' => '{operator} has issued a new bill. The list above shows each child, the due date and the amount.',
                ],
            ],
            'payment_received' => [
                'notification_type' => 'payment_received',
                'placeholders' => ['operator', 'parent', 'total', 'date'],
                'blocks' => [
                    'subject' => 'Bayaran diterima / Payment received - {operator}',
                    'intro' => 'Terima kasih. {total} telah diterima oleh {operator} pada {date}.',
                    'button' => 'Lihat resit / View receipt',
                    'outro' => 'Thank you. {total} was received by {operator} on {date}.',
                ],
            ],
            'reminder_due_soon' => [
                'notification_type' => 'reminder_due_soon',
                'placeholders' => ['operator', 'parent'],
                'blocks' => [
                    'subject' => 'Peringatan bayaran / Payment reminder - {operator}',
                    'intro' => 'Peringatan mesra: bil berikut dengan {operator} hampir tamat tempoh:',
                    'button' => $reminderBits['button'],
                    'outro' => 'A friendly reminder: the bills listed above with {operator} are due soon.',
                    'note' => $reminderBits['note'],
                ],
            ],
            'reminder_overdue' => [
                'notification_type' => 'reminder_overdue',
                'placeholders' => ['operator', 'parent'],
                'blocks' => [
                    'subject' => 'Bil tertunggak / Overdue bill - {operator}',
                    'intro' => 'Bil berikut dengan {operator} telah tamat tempoh:',
                    'button' => $reminderBits['button'],
                    'outro' => 'The bills listed above with {operator} are now overdue.',
                    'note' => $reminderBits['note'],
                ],
            ],
            'application_approved' => [
                'notification_type' => 'application_decided',
                'placeholders' => ['operator', 'parent', 'student'],
                'blocks' => [
                    'subject' => 'Permohonan diluluskan / Application approved - {operator}',
                    'intro' => 'Permohonan untuk {student} dengan {operator} telah diluluskan.',
                    'button' => 'Lihat / View',
                    'outro' => 'The application for {student} with {operator} has been approved.',
                ],
            ],
            'application_rejected' => [
                'notification_type' => 'application_decided',
                'placeholders' => ['operator', 'parent', 'student'],
                'blocks' => [
                    'subject' => 'Keputusan permohonan / Application update - {operator}',
                    'intro' => 'Maaf, permohonan untuk {student} dengan {operator} tidak dapat diluluskan.',
                    'outro' => 'Sorry, the application for {student} with {operator} could not be approved.',
                    'note' => 'Sila hubungi pengendali bas untuk maklumat lanjut. / Please contact the bus operator for more details.',
                ],
            ],
            // The code emails are shown but not editable: they are a security message.
            'signup_code' => ['notification_type' => null, 'placeholders' => [], 'blocks' => []],
            'password_reset_code' => ['notification_type' => null, 'placeholders' => [], 'blocks' => []],
        ];
    }

    public static function exists(string $template): bool
    {
        return array_key_exists($template, self::all());
    }

    // ---- reading the wording while an email is built ----

    /** The text of one block: a preview edit, else the Owner's saved edit, else the default. */
    public static function raw(string $template, string $block): string
    {
        $default = self::all()[$template]['blocks'][$block];

        if (self::$draftTemplate === $template && self::$draft !== null) {
            return self::usable(self::$draft[$block] ?? null) ?? $default;
        }

        return self::usable(self::saved($template)[$block] ?? null) ?? $default;
    }

    /** A line for the body of the email. Markdown characters in the values are escaped. */
    public static function line(string $template, string $block, array $values = []): string
    {
        return MailText::oneLine(self::fill(self::raw($template, $block), $values, fn (string $text) => MailText::escape($text)));
    }

    /** Subject lines and button labels: one line of plain text, nothing escaped. */
    public static function text(string $template, string $block, array $values = []): string
    {
        return MailText::oneLine(self::fill(self::raw($template, $block), $values, fn (string $text) => $text));
    }

    /** Whether the template has this block at all (the reject email has no button, for instance). */
    public static function has(string $template, string $block): bool
    {
        return array_key_exists($block, self::all()[$template]['blocks']);
    }

    /** Wording typed by the Owner is escaped the same way as the values, so it can't become a link. */
    private static function fill(string $raw, array $values, callable $escape): string
    {
        $parts = preg_split('/(\{[a-z_]+\})/', $raw, -1, PREG_SPLIT_DELIM_CAPTURE) ?: [];

        return implode('', array_map(function (string $part) use ($values, $escape) {
            if (preg_match('/^\{([a-z_]+)\}$/', $part, $m) && array_key_exists($m[1], $values)) {
                return $escape((string) $values[$m[1]]);
            }

            return $escape($part);
        }, $parts));
    }

    private static function usable(mixed $value): ?string
    {
        return is_string($value) && trim($value) !== '' ? $value : null;
    }

    /** @return array<string, string> */
    private static function saved(string $template): array
    {
        // An email must still go out if the wording can't be read, so fall back to the defaults.
        try {
            return EmailTemplate::find($template)?->blocks ?? [];
        } catch (Throwable) {
            return [];
        }
    }

    // ---- what the Owner sees and saves ----

    /** @return array<string, string> only the blocks the Owner has changed */
    public static function customised(string $template): array
    {
        return array_filter(
            self::saved($template),
            fn ($text, $block) => self::has($template, $block) && self::usable($text) !== null && $text !== self::all()[$template]['blocks'][$block],
            ARRAY_FILTER_USE_BOTH,
        );
    }

    /** Placeholders used in some text that this email does not offer, e.g. a typo like {oprator}. */
    public static function unknownPlaceholders(string $template, string $text): array
    {
        preg_match_all('/\{([a-z_]+)\}/', $text, $found);

        return array_values(array_diff(array_unique($found[1]), self::all()[$template]['placeholders']));
    }

    // ---- previews ----

    /** Sample data for the preview. Nothing here belongs to a real operator or parent. */
    private static function sample(): array
    {
        return [
            'operator' => 'Bas Sekolah Maju',
            'parent' => 'Siti Aminah',
            'student' => 'Aisyah',
            'lines' => [
                ['student' => 'Aisyah', 'amount' => '120.00', 'due_date' => now()->addDays(7)->toDateString()],
                ['student' => 'Hakim', 'amount' => '108.00', 'due_date' => now()->addDays(7)->toDateString()],
            ],
        ];
    }

    /**
     * The email as it would be sent, with sample data. `$blocks` shows an edit that is not saved yet.
     *
     * @param  array<string, string>|null  $blocks
     * @return array{subject: string, html: string}
     */
    public static function preview(string $template, ?array $blocks = null): array
    {
        self::$draftTemplate = $template;
        self::$draft = $blocks;

        try {
            $s = self::sample();
            $notifiable = new User;

            if (in_array($template, ['signup_code', 'password_reset_code'], true)) {
                $mailable = new EmailOtpMail('123456', $template === 'signup_code' ? EmailOtp::REGISTRATION : EmailOtp::PASSWORD_RESET);

                return ['subject' => $mailable->envelope()->subject, 'html' => $mailable->render()];
            }

            $notification = match ($template) {
                'bill_issued' => new BillsIssued($s['operator'], $s['parent'], $s['lines']),
                'payment_received' => new PaymentReceived($s['operator'], $s['parent'], $s['lines'], now()->toDateString()),
                'reminder_due_soon' => new PaymentReminder(PaymentReminder::DUE_SOON, $s['operator'], $s['parent'], $s['lines']),
                'reminder_overdue' => new PaymentReminder(PaymentReminder::OVERDUE, $s['operator'], $s['parent'], $s['lines']),
                'application_approved' => new ApplicationDecided(true, $s['operator'], $s['parent'], $s['student']),
                'application_rejected' => new ApplicationDecided(false, $s['operator'], $s['parent'], $s['student'], 'Tiada tempat kosong / No seats left'),
            };

            $mail = $notification->toMail($notifiable);

            return ['subject' => $notification->subjectLine(), 'html' => (string) $mail->render()];
        } finally {
            self::$draft = null;
            self::$draftTemplate = null;
        }
    }
}
