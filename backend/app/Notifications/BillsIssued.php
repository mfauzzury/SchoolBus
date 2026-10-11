<?php

namespace App\Notifications;

use Illuminate\Notifications\Messages\MailMessage;

/** One email per parent listing every new bill, so three children are one email, not three. */
class BillsIssued extends PlatformNotification
{
    /**
     * @param  list<array{student: string, amount: string, due_date: string}>  $lines
     */
    public function __construct(
        private readonly string $operator,
        private readonly string $parent,
        private readonly array $lines,
    ) {}

    public function subjectLine(): string
    {
        return 'Bil baharu / New bill - '.self::oneLine($this->operator);
    }

    public function toMail(object $notifiable): MailMessage
    {
        $total = array_sum(array_map(fn ($l) => (float) $l['amount'], $this->lines));
        $many = count($this->lines) > 1;

        $operator = self::plain($this->operator);

        $mail = (new MailMessage)
            ->subject($this->subjectLine())
            ->greeting('Salam '.self::plain($this->parent).',')
            ->line("{$operator} telah mengeluarkan bil baharu:");

        foreach ($this->lines as $line) {
            $mail->line(self::plain($line['student']).': '.self::money($line['amount']).' (bayar sebelum '.self::date($line['due_date']).')');
        }
        if ($many) {
            $mail->line('Jumlah: '.self::money($total));
        }

        $mail->action('Lihat dan bayar / View and pay', self::url('/parent/invoices'))
            ->line("{$operator} has issued a new bill:");

        foreach ($this->lines as $line) {
            $mail->line(self::plain($line['student']).': '.self::money($line['amount']).' (due '.self::date($line['due_date']).')');
        }
        if ($many) {
            $mail->line('Total: '.self::money($total));
        }

        return $mail->salutation('SchoolBus');
    }
}
