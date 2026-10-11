<?php

namespace App\Notifications;

use Illuminate\Notifications\Messages\MailMessage;

/** For the platform team: a new bus company just created an account. */
class OperatorSignedUp extends PlatformNotification
{
    public function __construct(
        private readonly int $operatorId,
        private readonly string $company,
        private readonly string $contactPerson,
        private readonly string $phone,
        private readonly string $email,
    ) {}

    public function subjectLine(): string
    {
        return 'New operator signed up: '.self::oneLine($this->company);
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject($this->subjectLine())
            ->greeting('A new operator has signed up.')
            ->line('Company: '.self::plain($this->company))
            ->line('Contact: '.self::plain($this->contactPerson).', '.self::plain($this->phone))
            ->line('Email: '.self::plain($this->email))
            ->action('Open operator', self::url("/admin/operators/{$this->operatorId}"))
            ->salutation('SchoolBus');
    }
}
