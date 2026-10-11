<?php

namespace App\Mail;

use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

/** The "is email really working?" message the Owner can send from the System settings. */
class IntegrationTestMail extends Mailable
{
    public function envelope(): Envelope
    {
        return new Envelope(subject: 'SchoolBus test email');
    }

    public function content(): Content
    {
        return new Content(text: 'integration-test-mail');
    }
}
