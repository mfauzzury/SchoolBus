<?php

namespace App\Providers;

use App\Models\NotificationLog;
use App\Models\User;
use App\Notifications\PlatformNotification;
use App\Support\Integrations;
use App\Support\MailText;
use App\Support\PlatformAccess;
use App\Support\TenantContext;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Notifications\Events\NotificationSent;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Queue\Events\JobProcessing;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(TenantContext::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Owner (the legacy saas_admin role) may do everything, so new
        // permissions never lock the owner out. Returning null defers to the
        // normal permission check for everyone else.
        Gate::before(fn (User $user) => $user->hasRole(PlatformAccess::OWNER) ? true : null);

        // Public forms that create records and send email. Counted per network
        // address on purpose: the default counts per logged-in user, and signing
        // up logs you in, so every new signup would get a fresh allowance.
        RateLimiter::for('public-forms', fn (Request $request) => [
            Limit::perMinute(5)->by('public-forms:'.$request->ip()),
            Limit::perHour(30)->by('public-forms-hour:'.$request->ip()),
        ]);

        // Email one-time codes (sign-up, forgot password). Each has its own counter so
        // one cannot use up another's allowance, and none is shared with the forms
        // above. These are per network address and deliberately roomy, because many
        // parents can sit behind one school or mobile network; the limits that stop
        // guessing and inbox flooding are per email address (see EmailOtp).
        RateLimiter::for('email-code-send', fn (Request $request) => [
            Limit::perMinute(20)->by('email-code-send:'.$request->ip()),
            Limit::perHour(120)->by('email-code-send-hour:'.$request->ip()),
        ]);
        RateLimiter::for('email-code-check', fn (Request $request) => Limit::perMinute(60)->by('email-code-check:'.$request->ip()));
        RateLimiter::for('password-reset', fn (Request $request) => Limit::perMinute(20)->by('password-reset:'.$request->ip()));

        // If the Owner has switched Brevo on in System settings, all email goes through it.
        Integrations::applyMail();

        // A long-running queue worker booted before the setting changed: re-read it per job.
        Event::listen(JobProcessing::class, fn () => Integrations::applyMail());

        // Record what actually left the building (and through which mailer).
        Event::listen(NotificationSent::class, function (NotificationSent $event) {
            if ($event->notification instanceof PlatformNotification) {
                NotificationLog::markSent($event->notification->id, (string) config('mail.default'));
            }
        });

        // This is an API-only backend — there's no "password.reset" web route
        // for the notification to link to by default, so point it at the SPA.
        $resetUrl = function ($user, string $token) {
            $frontendUrl = rtrim(env('FRONTEND_URL', 'http://localhost:5173'), '/');

            return "{$frontendUrl}/reset-password/{$token}?email=".urlencode($user->email);
        };
        ResetPassword::createUrlUsing($resetUrl);

        // That link email is only sent when someone is given an account or has their
        // password reset for them (a forgotten password uses a one-time code instead),
        // so it is worded as "set your password", in both languages like our other email.
        ResetPassword::toMailUsing(function ($user, string $token) use ($resetUrl) {
            $brand = MailText::plain(MailText::brand());
            $minutes = (int) config('auth.passwords.'.config('auth.defaults.passwords').'.expire');

            return (new MailMessage)
                ->subject('Tetapkan kata laluan anda / Set your password - '.MailText::brand())
                ->greeting('Salam '.MailText::plain($user->name).',')
                ->line("Tekan butang di bawah untuk menetapkan kata laluan akaun {$brand} anda.")
                ->action('Tetapkan kata laluan / Set password', $resetUrl($user, $token))
                ->line("Use the button above to set the password for your {$brand} account.")
                ->line("Pautan ini sah selama {$minutes} minit. / This link is valid for {$minutes} minutes.")
                ->line('Jika anda tidak menjangkakan e-mel ini, abaikan sahaja. / If you were not expecting this email, you can ignore it.')
                ->salutation(MailText::brand());
        });
    }
}
