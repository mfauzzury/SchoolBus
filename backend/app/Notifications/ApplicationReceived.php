<?php

namespace App\Notifications;

use Illuminate\Notifications\Messages\MailMessage;

/** Tells the operator's team that a parent is waiting for an answer. */
class ApplicationReceived extends PlatformNotification
{
    public function __construct(
        private readonly string $operator,
        private readonly string $parent,
        private readonly string $student,
    ) {}

    public function subjectLine(): string
    {
        return 'Permohonan baharu / New application - '.self::oneLine($this->student);
    }

    public function toMail(object $notifiable): MailMessage
    {
        $parent = self::plain($this->parent);
        $student = self::plain($this->student);

        return (new MailMessage)
            ->subject($this->subjectLine())
            ->greeting('Salam '.self::plain($this->operator).',')
            ->line("{$parent} memohon tempat untuk {$student}. Sila semak dan luluskan atau tolak.")
            ->action('Buka permohonan / Open applications', self::url('/operator/applications'))
            ->line("{$parent} applied for a place for {$student}. Please review and approve or reject.")
            ->salutation(self::brand());
    }
}
