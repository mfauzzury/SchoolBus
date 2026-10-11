<?php

namespace App\Notifications;

use App\Models\NotificationLog;
use App\Support\MailText;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use Illuminate\Support\HtmlString;
use Throwable;

/**
 * Base for every automatic message. Delivered on the queue so a slow mail
 * server never holds up a request. Email is the only channel today; a
 * WhatsApp channel later is one more entry in via(), nothing else changes.
 */
abstract class PlatformNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    /** @return list<int> seconds to wait before each retry */
    public function backoff(): array
    {
        return [60, 300];
    }

    /** @return list<string> */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    /** Called by the queue worker once every retry has failed. */
    public function failed(Throwable $e): void
    {
        NotificationLog::markFailed($this->id, $e);
    }

    abstract public function subjectLine(): string;

    /**
     * Text typed by a person (names, a company, a reason), made safe to place in
     * an email line. Mail lines are rendered as Markdown, so without this a name
     * like "[Pay here](http://bad.example)" would become a real link in an email
     * that carries our name. Line breaks are flattened too.
     */
    protected static function plain(?string $value): string
    {
        return MailText::plain($value);
    }

    /** For subject lines: plain text already, but must stay on one line. */
    protected static function oneLine(?string $value): string
    {
        return MailText::oneLine($value);
    }

    /**
     * The children and amounts in a message, as a table whose headings are in
     * both languages (so the list is shown once, not once per language).
     *
     * @param  list<list<string>>  $rows
     * @param  list<string>|null  $footer
     */
    protected static function table(array $head, array $rows, ?array $footer = null): HtmlString
    {
        return MailText::table($head, $rows, $footer);
    }

    /** What every message is signed with. */
    protected static function brand(): string
    {
        return MailText::brand();
    }

    protected static function money(float|string $amount): string
    {
        return 'RM '.number_format((float) $amount, 2);
    }

    protected static function date(string $isoDate): string
    {
        return date('d/m/Y', strtotime($isoDate));
    }

    protected static function url(string $path): string
    {
        return rtrim((string) config('app.frontend_url'), '/').$path;
    }
}
