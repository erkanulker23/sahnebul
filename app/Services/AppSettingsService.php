<?php

namespace App\Services;

use App\Models\AppSetting;
use App\Models\Artist;
use App\Models\ArtistEventProposal;
use App\Models\ArtistMedia;
use App\Models\ContactMessage;
use App\Models\Event;
use App\Models\EventArtistReport;
use App\Models\Review;
use App\Models\Venue;
use App\Support\AdPlacementCatalog;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;

class AppSettingsService
{
    private const CACHE_TTL_SECONDS = 300;

    private const CACHE_KEY_PREFIX = 'app_setting.';

    private const ADMIN_COUNTS_KEY = 'admin.notification_counts';

    /** @var list<string> */
    private const SETTING_KEYS = ['footer', 'ads', 'legal_pages', 'smtp', 'site', 'google_maps_browser_key', 'page_seo', 'paytr'];

    public function getRaw(string $key): ?string
    {
        if (! Schema::hasTable('app_settings')) {
            return null;
        }

        return AppSetting::query()->where('key', $key)->value('value');
    }

    /**
     * Ham değer — cache'li (Inertia footer/ads ve tekrarlayan okumalar için).
     */
    public function getRawCached(string $key): ?string
    {
        if (! Schema::hasTable('app_settings')) {
            return null;
        }

        return Cache::remember(
            self::CACHE_KEY_PREFIX.$key,
            self::CACHE_TTL_SECONDS,
            fn () => $this->getRaw($key)
        );
    }

    /**
     * JSON ayar — tek seferde decode; bozuk JSON'da null ve log.
     *
     * @return array<string, mixed>|null
     */
    public function getJsonCached(string $key): ?array
    {
        $raw = $this->getRawCached($key);
        if (! is_string($raw) || trim($raw) === '') {
            return null;
        }

        $decoded = json_decode($raw, true);
        if (! is_array($decoded)) {
            Log::warning('AppSetting JSON parse failed', ['key' => $key]);

            return null;
        }

        return $decoded;
    }

    /**
     * Footer ayarı — DB boş veya hatalıysa config/sahnebul.php varsayılanı (canlıda footer kaybolmaz).
     *
     * @return array<string, mixed>
     */
    public function getFooterSettings(): array
    {
        /** @var array<string, mixed> $defaults */
        $defaults = config('sahnebul.default_footer', []);
        if ($defaults === []) {
            return [];
        }

        $fromDb = $this->getJsonCached('footer');
        if (! is_array($fromDb) || $fromDb === []) {
            return $defaults;
        }

        return array_replace_recursive($defaults, $fromDb);
    }

    /**
     * Site geneli (logo, favicon, SEO, iletişim) — DB + config varsayılanları.
     *
     * @return array<string, mixed>
     */
    public function getSitePublicSettings(): array
    {
        /** @var array<string, mixed> $defaults */
        $defaults = config('sahnebul.default_site_public', []);
        $fromDb = $this->getJsonCached('site');
        if (! is_array($fromDb) || $fromDb === []) {
            return $defaults;
        }

        return array_replace_recursive($defaults, $fromDb);
    }

    /**
     * Footer + site ayarları: marka ve iletişim alanları panelden gelen site satırı ile güncellenir.
     *
     * @return array<string, mixed>
     */
    public function getFooterSettingsForPublic(): array
    {
        $footer = $this->getFooterSettings();
        $site = $this->getSitePublicSettings();

        $name = isset($site['site_name']) ? trim((string) $site['site_name']) : '';
        if ($name !== '') {
            $footer['brand'] = $name;
        }

        $contact = is_array($footer['contact'] ?? null) ? $footer['contact'] : [];
        $map = [
            'contact_email' => 'email',
            'phone' => 'phone',
            'address' => 'address',
        ];
        foreach ($map as $siteKey => $contactKey) {
            $v = isset($site[$siteKey]) ? trim((string) $site[$siteKey]) : '';
            if ($v !== '') {
                $contact[$contactKey] = $v;
            }
        }
        $footer['contact'] = $contact;

        $support = isset($site['support_email']) ? trim((string) $site['support_email']) : '';
        if ($support !== '') {
            $footer['support_email'] = $support;
        }

        $socialFromSite = $this->socialLinksForFooterFromSite($site);
        if ($socialFromSite !== []) {
            $footer['social'] = $socialFromSite;
        }

        return $footer;
    }

    /**
     * Site ayarlarındaki sosyal bağlantılar — doluysa footer’daki varsayılan / footer JSON sosyal listesinin yerine geçer.
     *
     * @param  array<string, mixed>  $site
     * @return list<array{label: string, url: string}>
     */
    public function socialLinksForFooterFromSite(array $site): array
    {
        $raw = $site['social_links'] ?? null;
        if (! is_array($raw)) {
            return [];
        }

        $map = [
            'instagram' => 'Instagram',
            'facebook' => 'Facebook',
            'twitter' => 'X (Twitter)',
            'youtube' => 'YouTube',
            'linkedin' => 'LinkedIn',
            'tiktok' => 'TikTok',
        ];

        $out = [];
        foreach ($map as $key => $label) {
            $url = isset($raw[$key]) ? trim((string) $raw[$key]) : '';
            if ($url === '') {
                continue;
            }
            if (filter_var($url, FILTER_VALIDATE_URL) === false) {
                continue;
            }
            $out[] = ['label' => $label, 'url' => $url];
        }

        return $out;
    }

    public function publicStorageUrl(?string $path): ?string
    {
        if (! is_string($path) || trim($path) === '') {
            return null;
        }

        return Storage::disk('public')->url($path);
    }

    /**
     * Mekan formlarında Places / Maps JS. Veritabanı (admin ayarları) doluysa önceliklidir; yoksa GOOGLE_MAPS_API_KEY (.env).
     */
    public function getGoogleMapsBrowserKey(): ?string
    {
        $fromDb = $this->getRawCached('google_maps_browser_key');
        if (is_string($fromDb) && trim($fromDb) !== '') {
            return trim($fromDb);
        }

        $fromEnv = config('services.google.maps_browser_key');
        if (is_string($fromEnv) && trim($fromEnv) !== '') {
            return trim($fromEnv);
        }

        return null;
    }

    /**
     * Reklam yerleşimleri — bilinen slot anahtarları ile birleştirilmiş yapı.
     *
     * @return array{slots: array<string, array<string, mixed>>}
     */
    public function getNormalizedAdsConfig(): array
    {
        return AdPlacementCatalog::normalize($this->getJsonCached('ads'));
    }

    /**
     * SMTP satırını mail config'e uygular. Bozuk JSON'da sessizce çıkış (uygulama çökmez).
     */
    public function applySmtpMailConfig(): void
    {
        if (! Schema::hasTable('app_settings')) {
            return;
        }

        $rawSmtp = $this->getRaw('smtp');
        if (! is_string($rawSmtp) || trim($rawSmtp) === '') {
            return;
        }

        $smtp = json_decode($rawSmtp, true);
        if (! is_array($smtp)) {
            Log::error('SMTP app_settings value is not valid JSON; mail env vars kullanılacak.', [
                'preview' => substr($rawSmtp, 0, 120),
            ]);

            return;
        }

        $password = $smtp['password'] ?? null;
        $resolvedPassword = null;
        if (is_string($password) && $password !== '') {
            $resolvedPassword = $this->resolveSmtpPasswordFromStorage($password);
        }

        $port = isset($smtp['port']) ? (int) $smtp['port'] : (int) config('mail.mailers.smtp.port', 587);
        $scheme = self::resolveSmtpSchemeForSymfony($smtp['encryption'] ?? null, $port);

        config([
            'mail.default' => $smtp['mailer'] ?? config('mail.default'),
            'mail.mailers.smtp.host' => $smtp['host'] ?? config('mail.mailers.smtp.host'),
            'mail.mailers.smtp.port' => $port,
            'mail.mailers.smtp.username' => $smtp['username'] ?? config('mail.mailers.smtp.username'),
            'mail.mailers.smtp.password' => $resolvedPassword ?? config('mail.mailers.smtp.password'),
            'mail.mailers.smtp.scheme' => $scheme,
            'mail.from.address' => $smtp['from_address'] ?? config('mail.from.address'),
            'mail.from.name' => $smtp['from_name'] ?? config('mail.from.name'),
        ]);
    }

    /**
     * Symfony Mailer DSN: yalnızca "smtp" veya "smtps". "tls" şema olarak geçersiz; boş bırakılınca Laravel porttan seçer.
     */
    public static function resolveSmtpSchemeForSymfony(mixed $encryption, int $port): ?string
    {
        $e = is_string($encryption) ? strtolower(trim($encryption)) : '';
        if (in_array($e, ['ssl', 'smtps'], true)) {
            return 'smtps';
        }

        if ($e === '' || in_array($e, ['tls', 'starttls'], true)) {
            return null;
        }

        return null;
    }

    /**
     * Admin formu için SMTP (şifre gönderilmez; yalnızca password_set).
     *
     * @return array{
     *     mailer: string,
     *     host: string,
     *     port: int,
     *     username: string|null,
     *     encryption: string|null,
     *     from_address: string,
     *     from_name: string,
     *     password_set: bool
     * }
     */
    public function smtpForAdminForm(): array
    {
        $raw = $this->getRaw('smtp');
        $defaults = [
            'mailer' => (string) config('mail.default', 'smtp'),
            'host' => (string) config('mail.mailers.smtp.host', '127.0.0.1'),
            'port' => (int) config('mail.mailers.smtp.port', 2525),
            'username' => config('mail.mailers.smtp.username'),
            'encryption' => config('mail.mailers.smtp.scheme'),
            'from_address' => (string) config('mail.from.address', ''),
            'from_name' => (string) config('mail.from.name', ''),
            'password_set' => false,
        ];

        if (! is_string($raw) || trim($raw) === '') {
            return $defaults;
        }

        $smtp = json_decode($raw, true);
        if (! is_array($smtp)) {
            return $defaults;
        }

        $pass = $smtp['password'] ?? null;

        return [
            'mailer' => isset($smtp['mailer']) ? (string) $smtp['mailer'] : $defaults['mailer'],
            'host' => isset($smtp['host']) ? (string) $smtp['host'] : $defaults['host'],
            'port' => isset($smtp['port']) ? (int) $smtp['port'] : $defaults['port'],
            'username' => isset($smtp['username']) ? (is_string($smtp['username']) ? $smtp['username'] : null) : null,
            'encryption' => isset($smtp['encryption']) ? (is_string($smtp['encryption']) ? $smtp['encryption'] : null) : null,
            'from_address' => isset($smtp['from_address']) ? (string) $smtp['from_address'] : $defaults['from_address'],
            'from_name' => isset($smtp['from_name']) ? (string) $smtp['from_name'] : $defaults['from_name'],
            'password_set' => is_string($pass) && $pass !== '',
        ];
    }

    /**
     * Form alanlarından JSON satırı üretir; şifre Laravel Crypt ile saklanır (düz metin DB'de tutulmaz).
     *
     * @param  array<string, mixed>  $validated
     */
    public function buildSmtpJsonForStorage(array $validated, ?string $currentRaw): string
    {
        $current = [];
        if (is_string($currentRaw) && trim($currentRaw) !== '') {
            $decoded = json_decode($currentRaw, true);
            if (is_array($decoded)) {
                $current = $decoded;
            }
        }

        $passwordInput = $validated['smtp_password'] ?? null;
        $passwordStored = $current['password'] ?? null;

        if (is_string($passwordInput) && trim($passwordInput) !== '') {
            $passwordStored = Crypt::encryptString(trim($passwordInput));
        }

        $payload = [
            'mailer' => $validated['smtp_mailer'] ?? 'smtp',
            'host' => $validated['smtp_host'] ?? '127.0.0.1',
            'port' => (int) ($validated['smtp_port'] ?? 587),
            'username' => $validated['smtp_username'] !== null && $validated['smtp_username'] !== ''
                ? (string) $validated['smtp_username']
                : null,
            'password' => is_string($passwordStored) && $passwordStored !== '' ? $passwordStored : null,
            'encryption' => $validated['smtp_encryption'] !== null && $validated['smtp_encryption'] !== ''
                ? (string) $validated['smtp_encryption']
                : null,
            'from_address' => (string) ($validated['smtp_from_address'] ?? ''),
            'from_name' => (string) ($validated['smtp_from_name'] ?? ''),
        ];

        return json_encode($payload, JSON_UNESCAPED_UNICODE);
    }

    public function forgetCaches(): void
    {
        foreach (self::SETTING_KEYS as $key) {
            Cache::forget(self::CACHE_KEY_PREFIX.$key);
        }

        Cache::forget(self::ADMIN_COUNTS_KEY);
    }

    /**
     * Admin badge sayıları — tek cache anahtarı, TTL kısa.
     *
     * @return array{pending_venues: int, pending_artists: int, draft_events: int, pending_reviews: int, pending_event_artist_reports: int, pending_artist_event_proposals: int, pending_artist_media: int, pending_contact_messages: int}
     */
    public function getAdminNotificationCounts(): array
    {
        return Cache::remember(self::ADMIN_COUNTS_KEY, 60, function () {
            return [
                'pending_venues' => Venue::where('status', 'pending')->count(),
                'pending_artists' => Artist::where('status', 'pending')->count(),
                'draft_events' => Event::where('status', 'draft')->count(),
                'pending_reviews' => Review::where('is_approved', false)->count(),
                'pending_event_artist_reports' => Schema::hasTable('event_artist_reports')
                    ? EventArtistReport::where('status', EventArtistReport::STATUS_PENDING)->count()
                    : 0,
                'pending_artist_event_proposals' => Schema::hasTable('artist_event_proposals')
                    ? ArtistEventProposal::query()->where('status', ArtistEventProposal::STATUS_PENDING)->count()
                    : 0,
                'pending_artist_media' => Schema::hasColumn('artist_media', 'moderation_status')
                    ? ArtistMedia::query()->where('moderation_status', ArtistMedia::MODERATION_PENDING)->count()
                    : 0,
                'pending_contact_messages' => Schema::hasTable('contact_messages')
                    ? ContactMessage::query()->where('is_spam', false)->count()
                    : 0,
            ];
        });
    }

    private function resolveSmtpPasswordFromStorage(string $stored): string
    {
        try {
            return Crypt::decryptString($stored);
        } catch (DecryptException) {
            // Eski düz metin şifre veya geçersiz payload — son çare olarak ham değeri kullan
            return $stored;
        }
    }
}
