<?php

namespace App\Providers;

use App\Services\AppSettingsService;
use Illuminate\Auth\Events\Registered;
use Illuminate\Auth\Listeners\SendEmailVerificationNotification;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(AppSettingsService::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Event::listen(Registered::class, SendEmailVerificationNotification::class);

        App::setLocale(config('app.locale'));

        Vite::prefetch(concurrency: 3);

        Password::defaults(function () {
            return Password::min(10)
                ->letters()
                ->mixedCase()
                ->numbers()
                ->symbols();
        });

        $this->configureRateLimiting();

        /*
         * Deploy / composer sırasında artisan package:discover DB olmadan çalışabilir.
         * Veritabanı yoksa veya bağlantı kurulamazsa SMTP ön yüklemesini atla.
         */
        try {
            if (! Schema::hasTable('app_settings')) {
                return;
            }
        } catch (\Throwable) {
            return;
        }

        $this->app->make(AppSettingsService::class)->applySmtpMailConfig();
    }

    private function configureRateLimiting(): void
    {
        RateLimiter::for('auth-login', function (Request $request) {
            $email = (string) $request->input('email', '');

            return Limit::perMinute(5)->by(strtolower($email).'|'.$request->ip());
        });

        RateLimiter::for('auth-register', function (Request $request) {
            return Limit::perMinute(5)->by($request->ip());
        });

        RateLimiter::for('password-reset', function (Request $request) {
            return Limit::perMinute(3)->by($request->ip());
        });

        RateLimiter::for('reverse-geocode', function (Request $request) {
            return Limit::perMinute(
                (int) config('services.rate_limits.reverse_geocode_per_minute', 24)
            )->by($request->ip());
        });

        RateLimiter::for('search-quick', function (Request $request) {
            return Limit::perMinute(
                (int) config('services.rate_limits.search_quick_per_minute', 60)
            )->by($request->ip());
        });

        RateLimiter::for('events-nearby', function (Request $request) {
            return Limit::perMinute(
                (int) config('services.rate_limits.events_nearby_per_minute', 45)
            )->by($request->ip());
        });

        RateLimiter::for('venues-nearby', function (Request $request) {
            return Limit::perMinute(
                (int) config('services.rate_limits.venues_nearby_per_minute', 45)
            )->by($request->ip());
        });

        RateLimiter::for('api-locations', function (Request $request) {
            return Limit::perMinute(
                (int) config('services.rate_limits.api_locations_per_minute', 90)
            )->by($request->ip());
        });
    }
}
