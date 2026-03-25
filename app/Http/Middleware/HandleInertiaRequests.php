<?php

namespace App\Http\Middleware;

use App\Models\Artist;
use App\Services\AppSettingsService;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();
        if ($user !== null) {
            $user->loadCount('venues');
        }

        $appSettings = app(AppSettingsService::class);

        $appUrl = rtrim((string) config('app.url'), '/');

        return [
            ...parent::share($request),
            'seo' => [
                'siteName' => (string) config('app.name'),
                'appUrl' => $appUrl,
                'defaultDescription' => 'Sahnebul ile Türkiye’deki konser mekanlarını, etkinlikleri ve sanatçıları keşfedin; rezervasyon ve Gold üyelik seçeneklerine göz atın.',
                'defaultImage' => config('sahnebul.default_og_image'),
                'locale' => 'tr_TR',
            ],
            'auth' => [
                'user' => $user,
                /** Hesaba bağlı onaylı sanatçı kaydı (sahne paneli — sanatçı sayfası düzenleme) */
                'linkedArtist' => $user !== null
                    ? Artist::query()->where('user_id', $user->id)->first(['id', 'name', 'slug'])
                    : null,
                /** Aktif Gold (aylık/yıllık mekan paketi) — /sahne rotalarına giriş */
                'has_active_gold' => $user !== null && $user->hasActiveGoldSubscription(),
                /**
                 * Sanatçı + en az bir bağlı mekan: üst menüde tek hesap girişi, Rezervasyonlarım gizli.
                 * Gold yoksa buton abonelik sayfasına gider.
                 */
                'sahne_compact_nav' => $user !== null && $user->isArtist() && ($user->venues_count ?? 0) > 0,
                /** admin / super_admin: müşteri rezervasyon menüsü ve akışı kapalı */
                'is_platform_admin' => $user !== null && $user->isAdmin(),
                'is_super_admin' => $user !== null && $user->isSuperAdmin(),
            ],
            'flash' => [
                'success' => $request->session()->get('success'),
                'error' => $request->session()->get('error'),
            ],
            'settings' => [
                'footer' => fn () => $appSettings->getFooterSettings(),
                'ads' => fn () => $appSettings->getNormalizedAdsConfig(),
            ],
            'adminNotifications' => function () use ($request, $appSettings) {
                $u = $request->user();
                if ($u === null || ! $u->isAdmin()) {
                    return null;
                }

                return $appSettings->getAdminNotificationCounts();
            },
        ];
    }
}
