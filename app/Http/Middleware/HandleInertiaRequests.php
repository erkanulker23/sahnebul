<?php

namespace App\Http\Middleware;

use App\Models\Artist;
use App\Models\MusicGenre;
use App\Services\AppSettingsService;
use App\Support\AuthPortalUrls;
use App\Support\EventListingTypes;
use Illuminate\Contracts\Auth\MustVerifyEmail;
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

        $linkedArtist = null;
        if ($user !== null) {
            $linkedArtist = Artist::query()->where('user_id', $user->id)->first(['id', 'name', 'slug', 'avatar']);
        }
        $firstVenueName = null;
        if ($user !== null && ! $user->isManagerOrganization() && $linkedArtist === null && ($user->venues_count ?? 0) > 0) {
            $firstVenueName = $user->venues()->orderBy('name')->value('name');
        }
        $stagePanelTitle = 'Sahne yönetimi';
        $stageSidebarNavBadge = 'Sahne paneli';
        if ($user !== null) {
            if ($user->isManagerOrganization()) {
                $orgName = trim((string) ($user->organization_display_name ?? ''));
                $display = $orgName !== '' ? $orgName : $user->name;
                $stagePanelTitle = $display.' Yönetim Paneli';
                $stageSidebarNavBadge = $display.' — Organizasyon';
            } elseif ($linkedArtist !== null) {
                $stagePanelTitle = $linkedArtist->name.' Yönetim Paneli';
                $stageSidebarNavBadge = $linkedArtist->name.' — Sanatçı';
            } elseif (is_string($firstVenueName) && trim($firstVenueName) !== '') {
                $stagePanelTitle = $firstVenueName.' Yönetim Paneli';
                $stageSidebarNavBadge = $firstVenueName.' — Mekân';
            } else {
                $stagePanelTitle = $user->name.' Yönetim paneli';
                $stageSidebarNavBadge = $user->name.' — Hesap';
            }
        }

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
                'linkedArtist' => $linkedArtist,
                /** Üst çubuk / kenar çubuğu için kişiselleştirilmiş başlık */
                'stage_panel_title' => $stagePanelTitle,
                'stage_sidebar_nav_badge' => $stageSidebarNavBadge,
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
                'is_manager_organization' => $user !== null && $user->isManagerOrganization(),
                /**
                 * Saf sanatçı (rol artist, mekân yok, bekleyen mekân kaydı yok): panelde Mekanlarım / Rezervasyonlar gizlenir.
                 */
                'artist_panel_show_venue_nav' => $user !== null && (
                    ! $user->isArtist()
                    || ($user->venues_count ?? 0) > 0
                    || (is_string($user->pending_venue_name) && trim($user->pending_venue_name) !== '')
                ),
                'email_verification_banner' => $user instanceof MustVerifyEmail && ! $user->hasVerifiedEmail(),
            ],
            'globalSearch' => [
                'event_type_tags' => EventListingTypes::options(),
                'music_genre_tags' => array_values(array_slice(MusicGenre::optionNamesOrdered(), 0, 8)),
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
