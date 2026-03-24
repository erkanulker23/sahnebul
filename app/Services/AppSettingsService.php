<?php

namespace App\Services;

use App\Models\AppSetting;
use App\Support\AdPlacementCatalog;
use App\Models\Artist;
use App\Models\Event;
use App\Models\Review;
use App\Models\Venue;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

class AppSettingsService
{
    private const CACHE_TTL_SECONDS = 300;

    private const CACHE_KEY_PREFIX = 'app_setting.';

    private const ADMIN_COUNTS_KEY = 'admin.notification_counts';

    /** @var list<string> */
    private const SETTING_KEYS = ['footer', 'ads', 'legal_pages', 'smtp'];

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

        config([
            'mail.default' => $smtp['mailer'] ?? config('mail.default'),
            'mail.mailers.smtp.host' => $smtp['host'] ?? config('mail.mailers.smtp.host'),
            'mail.mailers.smtp.port' => $smtp['port'] ?? config('mail.mailers.smtp.port'),
            'mail.mailers.smtp.username' => $smtp['username'] ?? config('mail.mailers.smtp.username'),
            'mail.mailers.smtp.password' => $resolvedPassword ?? config('mail.mailers.smtp.password'),
            'mail.mailers.smtp.scheme' => $smtp['encryption'] ?? config('mail.mailers.smtp.scheme'),
            'mail.from.address' => $smtp['from_address'] ?? config('mail.from.address'),
            'mail.from.name' => $smtp['from_name'] ?? config('mail.from.name'),
        ]);
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
     * @return array{pending_venues: int, pending_artists: int, draft_events: int, pending_reviews: int}
     */
    public function getAdminNotificationCounts(): array
    {
        return Cache::remember(self::ADMIN_COUNTS_KEY, 60, function () {
            return [
                'pending_venues' => Venue::where('status', 'pending')->count(),
                'pending_artists' => Artist::where('status', 'pending')->count(),
                'draft_events' => Event::where('status', 'draft')->count(),
                'pending_reviews' => Review::where('is_approved', false)->count(),
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
