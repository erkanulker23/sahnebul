<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Üretimde tarayıcıdan gelen JSON uçlarının başka siteden (CSRF olmayan) çağrılmasını zorlaştırır.
 * Modern tarayıcılar Sec-Fetch-Site başlığını gönderir.
 */
class EnsureJsonApiNotCrossSite
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! app()->environment('production')) {
            return $next($request);
        }

        $site = $request->header('Sec-Fetch-Site');
        if ($site === 'cross-site') {
            abort(403, 'Bu uç nokta yalnızca uygulama içinden kullanılabilir.');
        }

        return $next($request);
    }
}
