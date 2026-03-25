<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserIsCustomer
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if ($user === null || ! $user->isCustomer()) {
            abort(403, 'Bu işlem yalnızca kullanıcı hesapları içindir.');
        }

        return $next($request);
    }
}
