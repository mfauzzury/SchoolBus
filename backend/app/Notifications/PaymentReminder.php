<?php

namespace App\Notifications;

use App\Support\EmailTemplates;
use Illuminate\Notifications\Messages\MailMessage;

class PaymentReminder extends PlatformNotification
{
    public const DUE_SOON = 'due_soon';

    public const OVERDUE = 'overdue';

    /**
     * @param  'due_soon'|'overdue'  $kind
     * @param  list<array{student: string, amount: string, due_date: string}>  $lines  amount = what is still owed
     */
    public function __construct(
        private readonly string $kind,
        private readonly string $operator,
        private readonly string $parent,
        private readonly array $lines,
    ) {}

    public function subjectLine(): string
    {
        return EmailTemplates::text($this->template(), 'subject', $this->values());
    }

    /** Which wording to use: the due-soon reminder and the overdue one are edited separately. */
    private function template(): string
    {
        return $this->kind === self::OVERDUE ? 'reminder_overdue' : 'reminder_due_soon';
    }

    private function values(): array
    {
        return ['operator' => $this->operator, 'parent' => $this->parent];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $template = $this->template();

        $rows = array_map(
            fn ($line) => [$line['student'], self::date($line['due_date']), self::money($line['amount'])],
            $this->lines,
        );

        return (new MailMessage)
            ->subject($this->subjectLine())
            ->greeting('Salam '.self::plain($this->parent).',')
            ->line(EmailTemplates::line($template, 'intro', $this->values()))
            ->line(self::table(['Murid / Student', 'Tarikh akhir / Due', 'Baki / Balance'], $rows))
            ->action(EmailTemplates::text($template, 'button'), self::url('/parent/invoices'))
            ->line(EmailTemplates::line($template, 'outro', $this->values()))
            ->line(EmailTemplates::line($template, 'note', $this->values()))
            ->salutation(self::brand());
    }
}
