<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserIsArtist
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->user()) {
            abort(403, 'Bu sayfaya erişim için giriş gerekli.');
        }

        if (! $request->user()->isArtist() && ! $request->user()->hasActiveMembership('venue')) {
            abort(403, 'Bu sayfaya erişim için aktif Mekan Üyeliği gerekli.');
        }

        return $next($request);
    }
}
