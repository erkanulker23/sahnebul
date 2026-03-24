<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Support\Facades\Route;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
        then: function () {
            Route::middleware('api')
                ->prefix('api')
                ->group(base_path('routes/api.php'));
        },
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $trusted = env('TRUSTED_PROXIES');
        if (is_string($trusted) && $trusted !== '') {
            $middleware->trustProxies(
                at: $trusted === '*' ? '*' : array_values(array_filter(array_map('trim', explode(',', $trusted)))),
            );
        }

        $middleware->web(append: [
            \App\Http\Middleware\HandleInertiaRequests::class,
            \Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets::class,
            \App\Http\Middleware\EnsureUserIsActive::class,
        ]);

        $middleware->alias([
            'admin' => \App\Http\Middleware\EnsureUserIsAdmin::class,
            'artist' => \App\Http\Middleware\EnsureUserIsArtist::class,
            'gold' => \App\Http\Middleware\EnsureUserHasGoldSubscription::class,
            'json.same-site' => \App\Http\Middleware\EnsureJsonApiNotCrossSite::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Üretimde: LOG_LEVEL, günlük kanalı ve harici APM (Sentry vb.) .env üzerinden yapılandırılır.
        // Varsayılan Laravel raporlaması korunur; çift log üretmemek için burada ek report() eklenmedi.
    })->create();
