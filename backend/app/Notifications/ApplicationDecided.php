<?php

namespace App\Notifications;

use App\Support\EmailTemplates;
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
        return EmailTemplates::text($this->template(), 'subject', $this->values());
    }

    /** Approving and rejecting are edited separately. */
    private function template(): string
    {
        return $this->approved ? 'application_approved' : 'application_rejected';
    }

    private function values(): array
    {
        return ['operator' => $this->operator, 'parent' => $this->parent, 'student' => $this->student];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $template = $this->template();

        $mail = (new MailMessage)
            ->subject($this->subjectLine())
            ->greeting('Salam '.self::plain($this->parent).',');

        if ($this->approved) {
            return $mail
                ->line(EmailTemplates::line($template, 'intro', $this->values()))
                ->action(EmailTemplates::text($template, 'button'), self::url('/parent/dashboard'))
                ->line(EmailTemplates::line($template, 'outro', $this->values()))
                ->salutation(self::brand());
        }

        $mail->line(EmailTemplates::line($template, 'intro', $this->values()));
        if ($this->reason) {
            $mail->line('Sebab / Reason: '.self::plain($this->reason));
        }

        return $mail
            ->line(EmailTemplates::line($template, 'outro', $this->values()))
            ->line(EmailTemplates::line($template, 'note', $this->values()))
            ->salutation(self::brand());
    }
}
