<?php

namespace App\Notifications;

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
        return 'Bayaran diterima / Payment received - '.self::oneLine($this->operator);
    }

    public function toMail(object $notifiable): MailMessage
    {
        $total = array_sum(array_map(fn ($l) => (float) $l['amount'], $this->lines));
        $operator = self::plain($this->operator);

        $rows = array_map(fn ($line) => [$line['student'], self::money($line['amount'])], $this->lines);

        return (new MailMessage)
            ->subject($this->subjectLine())
            ->greeting('Salam '.self::plain($this->parent).',')
            ->line('Terima kasih. '.self::money($total)." telah diterima oleh {$operator} pada ".self::date($this->paidOn).'.')
            ->line(self::table(
                ['Murid / Student', 'Jumlah / Amount'],
                $rows,
                count($rows) > 1 ? ['Jumlah / Total', self::money($total)] : null,
            ))
            ->action('Lihat resit / View receipt', self::url('/parent/invoices'))
            ->line('Thank you. '.self::money($total)." was received by {$operator} on ".self::date($this->paidOn).'.')
            ->salutation(self::brand());
    }
}
