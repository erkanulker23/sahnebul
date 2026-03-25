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

        $user = $request->user();
        $pendingVenue = is_string($user->pending_venue_name) && trim($user->pending_venue_name) !== '';

        if (
            $user->isArtist()
            || $user->hasActiveMembership('venue')
            || $pendingVenue
            || $user->venues()->exists()
        ) {
            return $next($request);
        }

        abort(403, 'Bu sayfaya erişim için sanatçı hesabı veya mekân yönetimi yetkisi gerekir.');
    }
}
