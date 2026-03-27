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

        if ($user->isAdmin()) {
            abort(403, 'Platform yöneticileri sahne paneline bu oturumla erişemez.');
        }

        if ($user->canAccessStagePanel()) {
            return $next($request);
        }

        abort(403, 'Bu sayfaya erişim için sanatçı hesabı veya mekân yönetimi yetkisi gerekir.');
    }
}
