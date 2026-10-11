<?php

namespace App\Mail;

use App\Support\MailText;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

/** The "is email really working?" message the Owner can send from the System settings. */
class IntegrationTestMail extends Mailable
{
    public function envelope(): Envelope
    {
        return new Envelope(subject: 'E-mel ujian / Test email - '.MailText::brand());
    }

    public function content(): Content
    {
        return new Content(markdown: 'mail.integration-test', with: [
            'brand' => MailText::plain(MailText::brand()),
        ]);
    }
}
