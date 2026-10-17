<?php

namespace App\Notifications;

use App\Support\EmailTemplates;
use Illuminate\Notifications\Messages\MailMessage;

class PaymentReceived extends PlatformNotification
{
    /**
     * @param  list<array{student: string, amount: string}>  $lines
     */
    public function __construct(
        private readonly string $operator,
        private readonly string $parent,
        private readonly array $lines,
        private readonly string $paidOn,
    ) {}

    public function subjectLine(): string
    {
        return EmailTemplates::text('payment_received', 'subject', $this->values());
    }

    private function values(): array
    {
        $total = array_sum(array_map(fn ($l) => (float) $l['amount'], $this->lines));

        return [
            'operator' => $this->operator,
            'parent' => $this->parent,
            'total' => self::money($total),
            'date' => self::date($this->paidOn),
        ];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $total = array_sum(array_map(fn ($l) => (float) $l['amount'], $this->lines));
        $rows = array_map(fn ($line) => [$line['student'], self::money($line['amount'])], $this->lines);

        return (new MailMessage)
            ->subject($this->subjectLine())
            ->greeting('Salam '.self::plain($this->parent).',')
            ->line(EmailTemplates::line('payment_received', 'intro', $this->values()))
            ->line(self::table(
                ['Murid / Student', 'Jumlah / Amount'],
                $rows,
                count($rows) > 1 ? ['Jumlah / Total', self::money($total)] : null,
            ))
            ->action(EmailTemplates::text('payment_received', 'button'), self::url('/parent/invoices'))
            ->line(EmailTemplates::line('payment_received', 'outro', $this->values()))
            ->salutation(self::brand());
    }
}
