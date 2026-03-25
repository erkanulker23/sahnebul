<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AppSetting;
use App\Models\Category;
use App\Models\City;
use App\Models\User;
use App\Models\Venue;
use App\Services\AppSettingsService;
use Illuminate\Http\Request;
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
        $homeHeroPath = isset($site['home_hero_image_path']) && is_string($site['home_hero_image_path']) ? trim($site['home_hero_image_path']) : '';

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
                'seo_google_site_verification' => (string) ($seo['google_site_verification'] ?? ''),
                'logo_url' => $logoPath !== '' ? $this->appSettings->publicStorageUrl($logoPath) : null,
                'favicon_url' => $faviconPath !== '' ? $this->appSettings->publicStorageUrl($faviconPath) : null,
                'seo_og_image_url' => $ogPath !== '' ? $this->appSettings->publicStorageUrl($ogPath) : null,
                'home_hero_url' => $homeHeroPath !== '' ? $this->appSettings->publicStorageUrl($homeHeroPath) : null,
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
        $validated = $request->validate([
            'site_name' => 'nullable|string|max:120',
            'contact_email' => 'nullable|email|max:255',
            'support_email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:80',
            'address' => 'nullable|string|max:500',
            'seo_default_description' => 'nullable|string|max:5000',
            'seo_keywords' => 'nullable|string|max:500',
            'seo_twitter_handle' => 'nullable|string|max:64',
            'seo_google_site_verification' => 'nullable|string|max:128',
            'remove_logo' => 'sometimes|boolean',
            'remove_favicon' => 'sometimes|boolean',
            'remove_seo_og_image' => 'sometimes|boolean',
            'logo' => 'nullable|file|max:4096|mimes:jpeg,jpg,png,webp,svg',
            'favicon' => 'nullable|file|max:1024|mimes:ico,png,jpg,jpeg,svg,webp',
            'seo_og_image' => 'nullable|file|max:4096|mimes:jpeg,jpg,png,webp',
            'home_hero' => 'nullable|file|max:6144|mimes:jpeg,jpg,png,webp',
            'remove_home_hero' => 'sometimes|boolean',
            'google_maps_api_key' => 'nullable|string|max:512',
            'remove_google_maps_api_key' => 'sometimes|boolean',
        ]);

        $current = $this->appSettings->getSitePublicSettings();
        $currentSeo = is_array($current['seo'] ?? null) ? $current['seo'] : [];

        $logoPath = isset($current['logo_path']) && is_string($current['logo_path']) ? trim($current['logo_path']) : '';
        $faviconPath = isset($current['favicon_path']) && is_string($current['favicon_path']) ? trim($current['favicon_path']) : '';
        $ogPath = isset($currentSeo['default_og_image_path']) && is_string($currentSeo['default_og_image_path'])
            ? trim($currentSeo['default_og_image_path'])
            : '';
        $homeHeroPath = isset($current['home_hero_image_path']) && is_string($current['home_hero_image_path'])
            ? trim($current['home_hero_image_path'])
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

        if ($request->boolean('remove_home_hero')) {
            $this->deletePublicSiteAsset($homeHeroPath);
            $homeHeroPath = '';
        } elseif ($request->hasFile('home_hero')) {
            $this->deletePublicSiteAsset($homeHeroPath);
            $homeHeroPath = $request->file('home_hero')->store('site', 'public');
        }

        $payload = [
            'site_name' => $this->nullableTrim($validated['site_name'] ?? null),
            'logo_path' => $logoPath !== '' ? $logoPath : null,
            'favicon_path' => $faviconPath !== '' ? $faviconPath : null,
            'home_hero_image_path' => $homeHeroPath !== '' ? $homeHeroPath : null,
            'contact_email' => $this->nullableTrim($validated['contact_email'] ?? null),
            'support_email' => $this->nullableTrim($validated['support_email'] ?? null),
            'phone' => $this->nullableTrim($validated['phone'] ?? null),
            'address' => $this->nullableTrim($validated['address'] ?? null),
            'seo' => [
                'default_description' => $this->nullableTrim($validated['seo_default_description'] ?? null),
                'default_og_image_path' => $ogPath !== '' ? $ogPath : null,
                'keywords' => $this->nullableTrim($validated['seo_keywords'] ?? null),
                'twitter_handle' => $this->nullableTrim($validated['seo_twitter_handle'] ?? null),
                'google_site_verification' => $this->nullableTrim($validated['seo_google_site_verification'] ?? null),
            ],
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
}
