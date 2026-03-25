<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Tighten\Ziggy\BladeRouteGenerator;
use Tighten\Ziggy\Ziggy;

/**
 * Ziggy önbelleği (static) uzun ömürlü PHP süreçlerinde veya rota listesi değişince eskiyebilir;
 *
 * @routes çıktısı güncel kalsın diye her web isteğinde sıfırlanır.
 */
class RefreshZiggyForRequest
{
    public function handle(Request $request, Closure $next): Response
    {
        Ziggy::clearRoutes();
        BladeRouteGenerator::$generated = false;

        return $next($request);
    }
}
