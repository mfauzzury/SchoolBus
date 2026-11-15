<?php

namespace App\Notifications;

use Illuminate\Notifications\Messages\MailMessage;

/** Tells the parent their child's bus now goes via a transit center (or no longer does). */
class TransitPlanChanged extends PlatformNotification
{
    public function __construct(
        private readonly string $operator,
        private readonly string $parent,
        private readonly string $student,
        private readonly string $center,
        private readonly bool $stopping,
        private readonly string $date, // ISO day (2026-11-15), shown as 15/11/2026
        private readonly ?string $amount,
    ) {}

    public function subjectLine(): string
    {
        return 'Perubahan bas / Bus change - '.self::oneLine($this->student);
    }

    public function toMail(object $notifiable): MailMessage
    {
        $student = self::plain($this->student);
        $center = self::plain($this->center);
        $date = self::date($this->date);

        $mail = (new MailMessage)
            ->subject($this->subjectLine())
            ->greeting('Salam '.self::plain($this->parent).',');

        if ($this->stopping) {
            return $mail
                ->line("Selepas {$date}, bas tidak lagi menghantar {$student} melalui {$center}. Bas kembali ke perjalanan biasa.")
                ->line("After {$date}, the bus no longer takes {$student} via {$center}. The usual trip comes back.")
                ->action('Lihat / View', self::url('/parent/dashboard'))
                ->salutation(self::brand());
        }

        $money = $this->amount !== null ? self::money($this->amount) : null;

        return $mail
            ->line("Mulai {$date}, bas akan menghantar {$student} melalui {$center}.".($money ? " Caj tambahan {$money} sebulan dimasukkan ke dalam bil bas." : ''))
            ->line("From {$date}, the bus takes {$student} via {$center}.".($money ? " An extra {$money} a month is added to the bus bill." : ''))
            ->action('Lihat / View', self::url('/parent/dashboard'))
            ->line('Jika ini salah, sila hubungi '.self::plain($this->operator).'. / If this is wrong, please contact '.self::plain($this->operator).'.')
            ->salutation(self::brand());
    }
}
