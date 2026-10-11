<?php

namespace App\Notifications;

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
        return $this->kind === self::OVERDUE
            ? 'Bil tertunggak / Overdue bill - '.self::oneLine($this->operator)
            : 'Peringatan bayaran / Payment reminder - '.self::oneLine($this->operator);
    }

    public function toMail(object $notifiable): MailMessage
    {
        $overdue = $this->kind === self::OVERDUE;
        $operator = self::plain($this->operator);

        $rows = array_map(
            fn ($line) => [$line['student'], self::date($line['due_date']), self::money($line['amount'])],
            $this->lines,
        );

        return (new MailMessage)
            ->subject($this->subjectLine())
            ->greeting('Salam '.self::plain($this->parent).',')
            ->line($overdue
                ? "Bil berikut dengan {$operator} telah tamat tempoh:"
                : "Peringatan mesra: bil berikut dengan {$operator} hampir tamat tempoh:")
            ->line(self::table(['Murid / Student', 'Tarikh akhir / Due', 'Baki / Balance'], $rows))
            ->action('Bayar sekarang / Pay now', self::url('/parent/invoices'))
            ->line($overdue
                ? "The bills listed above with {$operator} are now overdue."
                : "A friendly reminder: the bills listed above with {$operator} are due soon.")
            ->line('Jika anda sudah membayar, sila abaikan e-mel ini. / If you have already paid, please ignore this email.')
            ->salutation(self::brand());
    }
}
