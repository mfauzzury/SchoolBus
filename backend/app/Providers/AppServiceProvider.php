<?php

namespace App\Providers;

use App\Models\User;
use App\Support\PlatformAccess;
use App\Support\TenantContext;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Support\Facades\Gate;
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

        // This is an API-only backend — there's no "password.reset" web route
        // for the notification to link to by default, so point it at the SPA.
        ResetPassword::createUrlUsing(function ($user, string $token) {
            $frontendUrl = rtrim(env('FRONTEND_URL', 'http://localhost:5173'), '/');

            return "{$frontendUrl}/reset-password/{$token}?email=".urlencode($user->email);
        });
    }
}
