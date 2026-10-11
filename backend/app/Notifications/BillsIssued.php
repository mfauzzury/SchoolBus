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
        $operator = self::plain($this->operator);

        $rows = array_map(
            fn ($line) => [$line['student'], self::date($line['due_date']), self::money($line['amount'])],
            $this->lines,
        );

        return (new MailMessage)
            ->subject($this->subjectLine())
            ->greeting('Salam '.self::plain($this->parent).',')
            ->line("{$operator} telah mengeluarkan bil baharu:")
            ->line(self::table(
                ['Murid / Student', 'Tarikh akhir / Due', 'Jumlah / Amount'],
                $rows,
                count($rows) > 1 ? ['Jumlah / Total', '', self::money($total)] : null,
            ))
            ->action('Lihat dan bayar / View and pay', self::url('/parent/invoices'))
            ->line("{$operator} has issued a new bill. The list above shows each child, the due date and the amount.")
            ->salutation(self::brand());
    }
}
