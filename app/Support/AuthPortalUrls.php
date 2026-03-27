<?php

namespace App\Support;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/**
 * Portal giriş URL’leri — route adı önbellekte / derlemede eksikse (RouteNotFoundException) göreli path ile devam eder.
 */
final class AuthPortalUrls
{
    public static function relative(string $routeName, string $pathFallback): string
    {
        if (! Route::has($routeName)) {
            return $pathFallback;
        }

        return route($routeName, absolute: false);
    }

    /**
     * @return array{customer: string, artist: string, venue: string, organization: string, admin: string, stage: string}
     */
    public static function forInertiaShare(): array
    {
        return [
            'customer' => self::relative('login', '/giris/kullanici'),
            'artist' => self::relative('login.sanatci', '/giris/sanatci'),
            'venue' => self::relative('login.mekan', '/giris/mekan'),
            'organization' => self::relative('login.organizasyon', '/giris/organizasyon'),
            'admin' => self::relative('login.admin', '/yonetim/giris'),
            'stage' => self::relative('login.sahne', '/giris/sahne'),
        ];
    }

    public static function guestRedirectPath(Request $request): string
    {
        if ($request->is('admin') || $request->is('admin/*')) {
            return self::relative('login.admin', '/yonetim/giris');
        }
        if ($request->is('sahne') || $request->is('sahne/*')) {
            return self::relative('login.sahne', '/giris/sahne');
        }

        return self::relative('login', '/giris/kullanici');
    }
}
