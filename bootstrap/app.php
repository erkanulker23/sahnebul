<?php

use App\Http\Middleware\EnsureJsonApiNotCrossSite;
use App\Http\Middleware\EnsureUserHasGoldSubscription;
use App\Http\Middleware\EnsureUserIsActive;
use App\Http\Middleware\EnsureUserIsAdmin;
use App\Http\Middleware\EnsureUserIsArtist;
use App\Http\Middleware\EnsureUserIsCustomer;
use App\Http\Middleware\EnsureUserIsSuperAdmin;
use App\Http\Middleware\HandleInertiaRequests;
use App\Support\AuthPortalUrls;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Http\Request;
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
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
            EnsureUserIsActive::class,
        ]);

        $middleware->alias([
            'admin' => EnsureUserIsAdmin::class,
            'super_admin' => EnsureUserIsSuperAdmin::class,
            'artist' => EnsureUserIsArtist::class,
            'customer' => EnsureUserIsCustomer::class,
            'gold' => EnsureUserHasGoldSubscription::class,
            'json.same-site' => EnsureJsonApiNotCrossSite::class,
        ]);

        $middleware->redirectGuestsTo(fn (Request $request) => AuthPortalUrls::guestRedirectPath($request));
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Üretimde: LOG_LEVEL, günlük kanalı ve harici APM (Sentry vb.) .env üzerinden yapılandırılır.
        // Varsayılan Laravel raporlaması korunur; çift log üretmemek için burada ek report() eklenmedi.
    })->create();
