<?php

namespace App\Notifications;

use Illuminate\Notifications\Messages\MailMessage;

/** Tells the operator's team that a transit center is waiting for an answer. */
class TransitRequestReceived extends PlatformNotification
{
    public function __construct(
        private readonly string $operator,
        private readonly string $center,
        private readonly string $student,
        private readonly bool $stopping,
    ) {}

    public function subjectLine(): string
    {
        return 'Permohonan pusat transit / Transit center request - '.self::oneLine($this->student);
    }

    public function toMail(object $notifiable): MailMessage
    {
        $center = self::plain($this->center);
        $student = self::plain($this->student);

        [$ms, $en] = $this->stopping
            ? ["{$center} meminta untuk berhenti menghantar {$student} melalui pusat mereka.", "{$center} asks to stop taking {$student} via their center."]
            : ["{$center} memohon bas untuk {$student} ke/dari pusat mereka.", "{$center} asks for a bus for {$student} to and from their center."];

        return (new MailMessage)
            ->subject($this->subjectLine())
            ->greeting('Salam '.self::plain($this->operator).',')
            ->line($ms.' Sila hubungi ibu bapa sebelum meluluskan.')
            ->action('Buka permohonan / Open requests', self::url('/operator/transit-requests'))
            ->line($en.' Please check with the parent before approving.')
            ->salutation(self::brand());
    }
}
