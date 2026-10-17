<?php

namespace App\Notifications;

use App\Support\EmailTemplates;
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
        return EmailTemplates::text('bill_issued', 'subject', $this->values());
    }

    /** What the editable wording can mention; EmailTemplates makes each value safe for where it lands. */
    private function values(): array
    {
        return ['operator' => $this->operator, 'parent' => $this->parent];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $total = array_sum(array_map(fn ($l) => (float) $l['amount'], $this->lines));
        $rows = array_map(
            fn ($line) => [$line['student'], self::date($line['due_date']), self::money($line['amount'])],
            $this->lines,
        );

        return (new MailMessage)
            ->subject($this->subjectLine())
            ->greeting('Salam '.self::plain($this->parent).',')
            ->line(EmailTemplates::line('bill_issued', 'intro', $this->values()))
            ->line(self::table(
                ['Murid / Student', 'Tarikh akhir / Due', 'Jumlah / Amount'],
                $rows,
                count($rows) > 1 ? ['Jumlah / Total', '', self::money($total)] : null,
            ))
            ->action(EmailTemplates::text('bill_issued', 'button'), self::url('/parent/invoices'))
            ->line(EmailTemplates::line('bill_issued', 'outro', $this->values()))
            ->salutation(self::brand());
    }
}
