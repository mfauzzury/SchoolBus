<?php

namespace App\Providers;

use App\Models\NotificationLog;
use App\Models\User;
use App\Notifications\PlatformNotification;
use App\Support\Integrations;
use App\Support\PlatformAccess;
use App\Support\TenantContext;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Notifications\Events\NotificationSent;
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
        ResetPassword::createUrlUsing(function ($user, string $token) {
            $frontendUrl = rtrim(env('FRONTEND_URL', 'http://localhost:5173'), '/');

            return "{$frontendUrl}/reset-password/{$token}?email=".urlencode($user->email);
        });
    }
}
