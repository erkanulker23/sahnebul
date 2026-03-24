<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * Oturumu açık kullanıcı admin tarafından dondurulduysa oturumu sonlandırır.
 *
 * @see \App\Http\Requests\Auth\LoginRequest (giriş anı kontrolü)
 */
class EnsureUserIsActive
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if ($user === null) {
            return $next($request);
        }

        if ($user->is_active) {
            return $next($request);
        }

        Auth::logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('login')->with('error', 'Bu hesap dondurulmuş. Yardım için destek ile iletişime geçin.');
    }
}
