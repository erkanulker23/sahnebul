<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AppSetting;
use App\Services\AppSettingsService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Arama konsolu doğrulama meta değerleri ve ön yüz head / gövde sonu özel HTML (GA, GTM vb.).
 * Yalnızca süper yönetici — ham HTML güvenilir kullanıcıya bırakılır.
 */
class SiteVerificationAndScriptsController extends Controller
{
    public function __construct(
        private readonly AppSettingsService $appSettings,
    ) {}

    public function index(): Response
    {
        $site = $this->appSettings->getSitePublicSettings();
        $seo = is_array($site['seo'] ?? null) ? $site['seo'] : [];

        return Inertia::render('Admin/Settings/VerificationAndScripts', [
            'seo_google_site_verification' => (string) ($seo['google_site_verification'] ?? ''),
            'seo_yandex_verification' => (string) ($seo['yandex_verification'] ?? ''),
            'seo_bing_verification' => (string) ($seo['bing_verification'] ?? ''),
            'custom_head_html' => (string) ($seo['custom_head_html'] ?? ''),
            'custom_body_html' => (string) ($seo['custom_body_html'] ?? ''),
        ]);
    }

    public function update(Request $request)
    {
        $validated = $request->validate([
            'seo_google_site_verification' => 'nullable|string|max:512',
            'seo_yandex_verification' => 'nullable|string|max:512',
            'seo_bing_verification' => 'nullable|string|max:512',
            'custom_head_html' => 'nullable|string|max:100000',
            'custom_body_html' => 'nullable|string|max:100000',
        ]);

        /** @var array<string, mixed> $defaults */
        $defaults = config('sahnebul.default_site_public', []);
        $defaults = is_array($defaults) ? $defaults : [];
        $fromDb = $this->appSettings->getJsonCached('site');
        $fromDb = is_array($fromDb) && $fromDb !== [] ? array_replace_recursive($defaults, $fromDb) : $defaults;

        $currentSeo = is_array($fromDb['seo'] ?? null) ? $fromDb['seo'] : [];

        $fromDb['seo'] = array_merge($currentSeo, [
            'google_site_verification' => $this->normalizeVerificationMetaContent($validated['seo_google_site_verification'] ?? null),
            'yandex_verification' => $this->normalizeVerificationMetaContent($validated['seo_yandex_verification'] ?? null),
            'bing_verification' => $this->normalizeVerificationMetaContent($validated['seo_bing_verification'] ?? null),
            'custom_head_html' => $this->nullableTrim($validated['custom_head_html'] ?? null),
            'custom_body_html' => $this->nullableTrim($validated['custom_body_html'] ?? null),
        ]);

        AppSetting::updateOrCreate(
            ['key' => 'site'],
            ['value' => json_encode($fromDb, JSON_UNESCAPED_UNICODE)]
        );

        $this->appSettings->forgetCaches();

        return redirect()->route('admin.verification-scripts.index')->with('success', 'Doğrulama ve özel kodlar kaydedildi.');
    }

    private function nullableTrim(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }
        $t = trim($value);

        return $t === '' ? null : $t;
    }

    /**
     * Konsollardan kopyalanan tam &lt;meta name="…-verification" content="…" /&gt; satırı;
     * saklamadan önce yalnızca content değerine indirgenir (Yandex "meta tag not found" önlenir).
     */
    private function normalizeVerificationMetaContent(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }
        $s = trim($value);
        if ($s === '') {
            return null;
        }
        if (stripos($s, '<meta') !== false) {
            if (preg_match('/content\s*=\s*["\']([^"\'<>]+)["\']/iu', $s, $m)) {
                $s = trim($m[1]);
            }
        } else {
            $s = trim($s, " \t\n\r\0\x0B\"'");
        }
        if ($s === '') {
            return null;
        }

        return mb_substr($s, 0, 128);
    }
}
