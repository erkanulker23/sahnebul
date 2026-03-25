<?php

namespace App\Http\Middleware;

use App\Models\Artist;
use App\Services\AppSettingsService;
use App\Support\AuthPortalUrls;
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

        $sitePublic = $appSettings->getSitePublicSettings();
        $seoBlock = is_array($sitePublic['seo'] ?? null) ? $sitePublic['seo'] : [];
        $siteNameFromDb = isset($sitePublic['site_name']) ? trim((string) $sitePublic['site_name']) : '';
        $siteName = $siteNameFromDb !== '' ? $siteNameFromDb : (string) config('app.name', 'Sahnebul');
        $defaultDescFromDb = isset($seoBlock['default_description']) ? trim((string) $seoBlock['default_description']) : '';
        $defaultDescription = $defaultDescFromDb !== ''
            ? $defaultDescFromDb
            : 'Sahnebul ile Türkiye’deki konser mekanlarını, etkinlikleri ve sanatçıları keşfedin; rezervasyon ve Gold üyelik seçeneklerine göz atın.';
        $ogPath = isset($seoBlock['default_og_image_path']) ? trim((string) $seoBlock['default_og_image_path']) : '';
        $defaultImage = $ogPath !== ''
            ? $appSettings->publicStorageUrl($ogPath)
            : config('sahnebul.default_og_image');
        $logoUrl = $appSettings->publicStorageUrl(
            isset($sitePublic['logo_path']) && is_string($sitePublic['logo_path']) ? trim($sitePublic['logo_path']) : null
        );
        $faviconUrl = $appSettings->publicStorageUrl(
            isset($sitePublic['favicon_path']) && is_string($sitePublic['favicon_path']) ? trim($sitePublic['favicon_path']) : null
        );
        if ($faviconUrl === null || trim((string) $faviconUrl) === '') {
            // Relative path: Valet hostname may differ from APP_URL.
            $faviconUrl = '/favicon.svg';
        }
        $keywords = isset($seoBlock['keywords']) ? trim((string) $seoBlock['keywords']) : '';
        $twitterHandle = isset($seoBlock['twitter_handle']) ? trim((string) $seoBlock['twitter_handle']) : '';
        $googleSiteVerification = isset($seoBlock['google_site_verification']) ? trim((string) $seoBlock['google_site_verification']) : '';

        return [
            ...parent::share($request),
            'seo' => [
                'siteName' => $siteName,
                'appUrl' => $appUrl,
                'defaultDescription' => $defaultDescription,
                'defaultImage' => $defaultImage,
                'locale' => 'tr_TR',
                'logoUrl' => $logoUrl,
                'faviconUrl' => $faviconUrl,
                'keywords' => $keywords !== '' ? $keywords : null,
                'twitterHandle' => $twitterHandle !== '' ? $twitterHandle : null,
                'googleSiteVerification' => $googleSiteVerification !== '' ? $googleSiteVerification : null,
            ],
            'authPortalLogins' => AuthPortalUrls::forInertiaShare(),
            'auth' => [
                'user' => $user,
                /** Hesaba bağlı onaylı sanatçı kaydı (sahne paneli — sanatçı sayfası düzenleme) */
                'linkedArtist' => $user !== null
                    ? Artist::query()->where('user_id', $user->id)->first(['id', 'name', 'slug', 'avatar'])
                    : null,
                /** Aktif Gold (aylık/yıllık mekan paketi) — /sahne rotalarına giriş */
                'has_active_gold' => $user !== null && $user->hasActiveGoldSubscription(),
                /**
                 * Sanatçı + en az bir bağlı mekan: üst menüde tek hesap girişi, Rezervasyonlarım gizli.
                 * Gold yoksa buton abonelik sayfasına gider.
                 */
                'sahne_compact_nav' => $user !== null && (
                    ($user->venues_count ?? 0) > 0
                    || (is_string($user->pending_venue_name) && trim($user->pending_venue_name) !== '')
                ),
                /** admin / super_admin: müşteri rezervasyon menüsü ve akışı kapalı */
                'is_platform_admin' => $user !== null && $user->isAdmin(),
                'is_super_admin' => $user !== null && $user->isSuperAdmin(),
                /**
                 * Saf sanatçı (rol artist, mekân yok, bekleyen mekân kaydı yok): panelde Mekanlarım / Rezervasyonlar gizlenir.
                 */
                'artist_panel_show_venue_nav' => $user !== null && (
                    ! $user->isArtist()
                    || ($user->venues_count ?? 0) > 0
                    || (is_string($user->pending_venue_name) && trim($user->pending_venue_name) !== '')
                ),
            ],
            'flash' => [
                'success' => $request->session()->get('success'),
                'error' => $request->session()->get('error'),
            ],
            'settings' => [
                'footer' => fn () => $appSettings->getFooterSettingsForPublic(),
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
