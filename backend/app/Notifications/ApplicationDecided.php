<?php

namespace App\Notifications;

use Illuminate\Notifications\Messages\MailMessage;

class ApplicationDecided extends PlatformNotification
{
    public function __construct(
        private readonly bool $approved,
        private readonly string $operator,
        private readonly string $parent,
        private readonly string $student,
        private readonly ?string $reason = null,
    ) {}

    public function subjectLine(): string
    {
        return $this->approved
            ? 'Permohonan diluluskan / Application approved - '.self::oneLine($this->operator)
            : 'Keputusan permohonan / Application update - '.self::oneLine($this->operator);
    }

    public function toMail(object $notifiable): MailMessage
    {
        $operator = self::plain($this->operator);
        $student = self::plain($this->student);

        $mail = (new MailMessage)
            ->subject($this->subjectLine())
            ->greeting('Salam '.self::plain($this->parent).',');

        if ($this->approved) {
            return $mail
                ->line("Permohonan untuk {$student} dengan {$operator} telah diluluskan.")
                ->action('Lihat / View', self::url('/parent/dashboard'))
                ->line("The application for {$student} with {$operator} has been approved.")
                ->salutation('SchoolBus');
        }

        $mail->line("Maaf, permohonan untuk {$student} dengan {$operator} tidak dapat diluluskan.");
        if ($this->reason) {
            $mail->line('Sebab / Reason: '.self::plain($this->reason));
        }

        return $mail
            ->line("Sorry, the application for {$student} with {$operator} could not be approved.")
            ->line('Sila hubungi pengendali bas untuk maklumat lanjut. / Please contact the bus operator for more details.')
            ->salutation('SchoolBus');
    }
}
