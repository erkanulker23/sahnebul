<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserHasGoldSubscription
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if (! $user || ! $user->hasActiveGoldSubscription()) {
            return redirect()->route('subscriptions.index')
                ->with('error', 'Etkinlik ve mekan yönetimi için Gold üyelik (aylık/yıllık) gerekir.');
        }

        return $next($request);
    }
}
