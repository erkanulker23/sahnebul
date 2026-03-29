<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AppSetting;
use App\Models\Category;
use App\Models\City;
use App\Models\User;
use App\Models\Venue;
use App\Services\AppSettingsService;
use App\Support\HomeHeroSlideDefaults;
use App\Support\TurkishPhone;
use App\Support\UserContactValidation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class SettingsController extends Controller
{
    public function __construct(
        private readonly AppSettingsService $appSettings,
    ) {}

    public function index(Request $request)
    {
        $systemStats = [
            'total_users' => User::count(),
            'total_venues' => Venue::count(),
            'categories_count' => Category::count(),
            'cities_count' => City::count(),
        ];

        $footer = $this->appSettings->getRawCached('footer');
        $legalPages = $this->appSettings->getRawCached('legal_pages');

        $site = $this->appSettings->getSitePublicSettings();
        $seo = is_array($site['seo'] ?? null) ? $site['seo'] : [];
        $logoPath = isset($site['logo_path']) && is_string($site['logo_path']) ? trim($site['logo_path']) : '';
        $faviconPath = isset($site['favicon_path']) && is_string($site['favicon_path']) ? trim($site['favicon_path']) : '';
        $ogPath = isset($seo['default_og_image_path']) && is_string($seo['default_og_image_path']) ? trim($seo['default_og_image_path']) : '';
        $venuesCopyForm = self::heroSlideCopyFormRows($site['venues_hero_slide_copy'] ?? null);

        $socialRaw = is_array($site['social_links'] ?? null) ? $site['social_links'] : [];
        $socialLinks = [
            'instagram' => isset($socialRaw['instagram']) && is_string($socialRaw['instagram']) ? trim($socialRaw['instagram']) : '',
            'facebook' => isset($socialRaw['facebook']) && is_string($socialRaw['facebook']) ? trim($socialRaw['facebook']) : '',
            'twitter' => isset($socialRaw['twitter']) && is_string($socialRaw['twitter']) ? trim($socialRaw['twitter']) : '',
            'youtube' => isset($socialRaw['youtube']) && is_string($socialRaw['youtube']) ? trim($socialRaw['youtube']) : '',
            'linkedin' => isset($socialRaw['linkedin']) && is_string($socialRaw['linkedin']) ? trim($socialRaw['linkedin']) : '',
            'tiktok' => isset($socialRaw['tiktok']) && is_string($socialRaw['tiktok']) ? trim($socialRaw['tiktok']) : '',
        ];

        $mapsRaw = $this->appSettings->getRaw('google_maps_browser_key');
        $mapsKeyInDb = is_string($mapsRaw) && trim($mapsRaw) !== '';
        $envKey = config('services.google.maps_browser_key');
        $mapsKeyInEnv = is_string($envKey) && trim($envKey) !== '';

        return Inertia::render('Admin/Settings/Index', [
            'systemStats' => $systemStats,
            'settings' => [
                'footer' => $footer,
                'legal_pages' => $legalPages,
            ],
            'sitePublic' => [
                'site_name' => (string) ($site['site_name'] ?? ''),
                'contact_email' => (string) ($site['contact_email'] ?? ''),
                'support_email' => (string) ($site['support_email'] ?? ''),
                'phone' => (string) ($site['phone'] ?? ''),
                'address' => (string) ($site['address'] ?? ''),
                'seo_default_description' => (string) ($seo['default_description'] ?? ''),
                'seo_keywords' => (string) ($seo['keywords'] ?? ''),
                'seo_twitter_handle' => (string) ($seo['twitter_handle'] ?? ''),
                'logo_url' => $logoPath !== '' ? $this->appSettings->publicStorageUrl($logoPath) : null,
                'favicon_url' => $faviconPath !== '' ? $this->appSettings->publicStorageUrl($faviconPath) : null,
                'seo_og_image_url' => $ogPath !== '' ? $this->appSettings->publicStorageUrl($ogPath) : null,
                'venues_hero_slide_copy_form' => $venuesCopyForm,
                'social_links' => $socialLinks,
            ],
            'canManageSiteIdentity' => $request->user()?->isSuperAdmin() ?? false,
            'mapsApi' => [
                'key_set_in_db' => $mapsKeyInDb,
                'env_has_key' => $mapsKeyInEnv,
            ],
        ]);
    }

    public function update(Request $request)
    {
        $validated = $request->validate([
            'footer' => 'nullable|string',
            'legal_pages' => 'nullable|string',
        ]);

        AppSetting::updateOrCreate(['key' => 'footer'], ['value' => $validated['footer'] ?: null]);
        AppSetting::updateOrCreate(['key' => 'legal_pages'], ['value' => $validated['legal_pages'] ?: null]);

        $this->appSettings->forgetCaches();

        return back()->with('success', 'Ayarlar güncellendi.');
    }

    public function updateSite(Request $request)
    {
        foreach (
            [
                'social_instagram',
                'social_facebook',
                'social_twitter',
                'social_youtube',
                'social_linkedin',
                'social_tiktok',
            ] as $socialKey
        ) {
            if ($request->input($socialKey) === '') {
                $request->merge([$socialKey => null]);
            }
        }

        $heroTextRules = [];
        $heroFieldMax = ['eyebrow' => 200, 'headline' => 320, 'headline_accent' => 320, 'body' => 4000];
        for ($i = 0; $i < HomeHeroSlideDefaults::MAX_SLIDES; $i++) {
            foreach ($heroFieldMax as $field => $len) {
                $heroTextRules['hero_venues_'.$i.'_'.$field] = 'nullable|string|max:'.$len;
            }
        }

        $validated = $request->validate(array_merge([
            'site_name' => 'nullable|string|max:120',
            'contact_email' => UserContactValidation::emailNullable(),
            'support_email' => UserContactValidation::emailNullable(),
            'phone' => UserContactValidation::phoneNullable(),
            'address' => 'nullable|string|max:500',
            'seo_default_description' => 'nullable|string|max:5000',
            'seo_keywords' => 'nullable|string|max:500',
            'seo_twitter_handle' => 'nullable|string|max:64',
            'remove_logo' => 'sometimes|boolean',
            'remove_favicon' => 'sometimes|boolean',
            'remove_seo_og_image' => 'sometimes|boolean',
            'logo' => 'nullable|file|max:4096|mimes:jpeg,jpg,png,webp,svg',
            'favicon' => 'nullable|file|max:1024|mimes:ico,png,jpg,jpeg,svg,webp',
            'seo_og_image' => 'nullable|file|max:4096|mimes:jpeg,jpg,png,webp',
            'google_maps_api_key' => 'nullable|string|max:512',
            'remove_google_maps_api_key' => 'sometimes|boolean',
            'social_instagram' => 'nullable|url|max:500',
            'social_facebook' => 'nullable|url|max:500',
            'social_twitter' => 'nullable|url|max:500',
            'social_youtube' => 'nullable|url|max:500',
            'social_linkedin' => 'nullable|url|max:500',
            'social_tiktok' => 'nullable|url|max:500',
        ], $heroTextRules));

        $validated = TurkishPhone::mergeNormalizedInto($validated, ['phone']);

        $current = $this->appSettings->getSitePublicSettings();
        $rawSite = $this->appSettings->getJsonCached('site') ?: [];
        $preservedGoogleSignIn = is_array($rawSite['google_sign_in'] ?? null) ? $rawSite['google_sign_in'] : [
            'enabled' => false,
            'client_id' => null,
            'client_secret' => null,
        ];
        $rawSeo = is_array($rawSite['seo'] ?? null) ? $rawSite['seo'] : [];
        $preservedSeoKeys = ['google_site_verification', 'yandex_verification', 'bing_verification', 'custom_head_html', 'custom_body_html'];
        $preservedSeoFragment = array_intersect_key($rawSeo, array_flip($preservedSeoKeys));
        $currentSeo = is_array($current['seo'] ?? null) ? $current['seo'] : [];

        $logoPath = isset($current['logo_path']) && is_string($current['logo_path']) ? trim($current['logo_path']) : '';
        $faviconPath = isset($current['favicon_path']) && is_string($current['favicon_path']) ? trim($current['favicon_path']) : '';
        $ogPath = isset($currentSeo['default_og_image_path']) && is_string($currentSeo['default_og_image_path'])
            ? trim($currentSeo['default_og_image_path'])
            : '';
        if ($request->boolean('remove_logo')) {
            $this->deletePublicSiteAsset($logoPath);
            $logoPath = '';
        } elseif ($request->hasFile('logo')) {
            $this->deletePublicSiteAsset($logoPath);
            $logoPath = $request->file('logo')->store('site', 'public');
        }

        if ($request->boolean('remove_favicon')) {
            $this->deletePublicSiteAsset($faviconPath);
            $faviconPath = '';
        } elseif ($request->hasFile('favicon')) {
            $this->deletePublicSiteAsset($faviconPath);
            $faviconPath = $request->file('favicon')->store('site', 'public');
        }

        if ($request->boolean('remove_seo_og_image')) {
            $this->deletePublicSiteAsset($ogPath);
            $ogPath = '';
        } elseif ($request->hasFile('seo_og_image')) {
            $this->deletePublicSiteAsset($ogPath);
            $ogPath = $request->file('seo_og_image')->store('site', 'public');
        }

        $venuesHeroSlideCopy = self::heroSlideCopyFromRequest($request, 'hero_venues_');

        $payload = [
            'site_name' => $this->nullableTrim($validated['site_name'] ?? null),
            'logo_path' => $logoPath !== '' ? $logoPath : null,
            'favicon_path' => $faviconPath !== '' ? $faviconPath : null,
            'home_hero_slide_paths' => null,
            'home_hero_slide_copy' => null,
            'home_hero_image_path' => null,
            'venues_hero_slide_copy' => $venuesHeroSlideCopy,
            'contact_email' => $this->nullableTrim($validated['contact_email'] ?? null),
            'support_email' => $this->nullableTrim($validated['support_email'] ?? null),
            'phone' => $this->nullableTrim($validated['phone'] ?? null),
            'address' => $this->nullableTrim($validated['address'] ?? null),
            'social_links' => [
                'instagram' => $this->nullableTrim($validated['social_instagram'] ?? null),
                'facebook' => $this->nullableTrim($validated['social_facebook'] ?? null),
                'twitter' => $this->nullableTrim($validated['social_twitter'] ?? null),
                'youtube' => $this->nullableTrim($validated['social_youtube'] ?? null),
                'linkedin' => $this->nullableTrim($validated['social_linkedin'] ?? null),
                'tiktok' => $this->nullableTrim($validated['social_tiktok'] ?? null),
            ],
            'seo' => array_merge(
                $preservedSeoFragment,
                [
                    'default_description' => $this->nullableTrim($validated['seo_default_description'] ?? null),
                    'default_og_image_path' => $ogPath !== '' ? $ogPath : null,
                    'keywords' => $this->nullableTrim($validated['seo_keywords'] ?? null),
                    'twitter_handle' => $this->nullableTrim($validated['seo_twitter_handle'] ?? null),
                ],
            ),
            'google_sign_in' => $preservedGoogleSignIn,
        ];

        AppSetting::updateOrCreate(
            ['key' => 'site'],
            ['value' => json_encode($payload, JSON_UNESCAPED_UNICODE)]
        );

        if ($request->boolean('remove_google_maps_api_key')) {
            AppSetting::query()->where('key', 'google_maps_browser_key')->delete();
        } else {
            $mapsKey = $validated['google_maps_api_key'] ?? null;
            if (is_string($mapsKey) && trim($mapsKey) !== '') {
                AppSetting::updateOrCreate(
                    ['key' => 'google_maps_browser_key'],
                    ['value' => trim($mapsKey)]
                );
            }
        }

        $this->appSettings->forgetCaches();

        return back()->with('success', 'Site, SEO ve iletişim ayarları güncellendi.');
    }

    /**
     * @param  array<string, mixed>  $validated
     * @return array{enabled: bool, client_id: string|null, client_secret: string|null}
     */
    public static function buildGoogleSignInForStorage(Request $request, array $validated, string $clientSecretStored): array
    {
        $rawId = $validated['google_sign_in_client_id'] ?? null;
        $clientId = is_string($rawId) && trim($rawId) !== '' ? trim($rawId) : null;

        $out = [
            'enabled' => $request->boolean('google_sign_in_enabled'),
            'client_id' => $clientId,
        ];

        if ($request->boolean('remove_google_sign_in_client_secret')) {
            $out['client_secret'] = null;
        } else {
            $newSecret = $validated['google_sign_in_client_secret'] ?? null;
            if (is_string($newSecret) && trim($newSecret) !== '') {
                $out['client_secret'] = Crypt::encryptString(trim($newSecret));
            } else {
                $out['client_secret'] = $clientSecretStored !== '' ? $clientSecretStored : null;
            }
        }

        return $out;
    }

    private function nullableTrim(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }
        $t = trim($value);

        return $t === '' ? null : $t;
    }

    private function deletePublicSiteAsset(string $path): void
    {
        if ($path === '' || ! str_starts_with($path, 'site/')) {
            return;
        }
        Storage::disk('public')->delete($path);
    }

    /**
     * @return list<array{eyebrow: string, headline: string, headline_accent: string, body: string}>
     */
    private static function heroSlideCopyFormRows(mixed $raw): array
    {
        $out = [];
        for ($i = 0; $i < HomeHeroSlideDefaults::MAX_SLIDES; $i++) {
            $row = is_array($raw) && isset($raw[$i]) && is_array($raw[$i]) ? $raw[$i] : [];
            $out[] = [
                'eyebrow' => isset($row['eyebrow']) && is_string($row['eyebrow']) ? $row['eyebrow'] : '',
                'headline' => isset($row['headline']) && is_string($row['headline']) ? $row['headline'] : '',
                'headline_accent' => isset($row['headline_accent']) && is_string($row['headline_accent']) ? $row['headline_accent'] : '',
                'body' => isset($row['body']) && is_string($row['body']) ? $row['body'] : '',
            ];
        }

        return $out;
    }

    /**
     * @return list<array{eyebrow: string, headline: string, headline_accent: string, body: string}>
     */
    private static function heroSlideCopyFromRequest(Request $request, string $prefix): array
    {
        $out = [];
        for ($i = 0; $i < HomeHeroSlideDefaults::MAX_SLIDES; $i++) {
            $out[] = [
                'eyebrow' => self::heroTrimmedString($request->input($prefix.$i.'_eyebrow')),
                'headline' => self::heroTrimmedString($request->input($prefix.$i.'_headline')),
                'headline_accent' => self::heroTrimmedString($request->input($prefix.$i.'_headline_accent')),
                'body' => self::heroTrimmedString($request->input($prefix.$i.'_body')),
            ];
        }

        return $out;
    }

    private static function heroTrimmedString(mixed $v): string
    {
        if (! is_string($v)) {
            return '';
        }

        return trim($v);
    }
}
