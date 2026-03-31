<?php

namespace App\Services;

use App\Models\AppSetting;
use App\Models\PaytrPaymentOrder;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/**
 * PayTR Direkt API — 1. adım token (paytr_token) ve bildirim URL doğrulaması.
 *
 * @see https://dev.paytr.com/direkt-api/direkt-api-1-adim
 */
class PaytrDirectApiService
{
    private const SETTING_KEY = 'paytr';

    /**
     * @return array{
     *     enabled: bool,
     *     test_mode: bool,
     *     merchant_id: string,
     *     merchant_key: string|null,
     *     merchant_salt: string|null,
     *     merchant_key_set: bool,
     *     merchant_salt_set: bool
     * }
     */
    public function configuration(): array
    {
        $defaults = [
            'enabled' => false,
            'test_mode' => true,
            'merchant_id' => '',
            'merchant_key' => null,
            'merchant_salt' => null,
            'merchant_key_set' => false,
            'merchant_salt_set' => false,
        ];

        if (! Schema::hasTable('app_settings')) {
            return $defaults;
        }

        $raw = AppSetting::query()->where('key', self::SETTING_KEY)->value('value');
        if (! is_string($raw) || trim($raw) === '') {
            return $defaults;
        }

        $decoded = json_decode($raw, true);
        if (! is_array($decoded)) {
            return $defaults;
        }

        $keyStored = $decoded['merchant_key'] ?? null;
        $saltStored = $decoded['merchant_salt'] ?? null;

        return [
            'enabled' => (bool) ($decoded['enabled'] ?? false),
            'test_mode' => (bool) ($decoded['test_mode'] ?? true),
            'merchant_id' => trim((string) ($decoded['merchant_id'] ?? '')),
            'merchant_key' => $this->decryptSecret($keyStored),
            'merchant_salt' => $this->decryptSecret($saltStored),
            'merchant_key_set' => is_string($keyStored) && $keyStored !== '',
            'merchant_salt_set' => is_string($saltStored) && $saltStored !== '',
        ];
    }

    /**
     * Mağaza no ve şifreler kayıtlı mı? (Ödeme kapalı olsa da bağlantı testi için yeterli.)
     */
    public function isConfigured(): bool
    {
        $c = $this->configuration();

        return $c['merchant_id'] !== ''
            && is_string($c['merchant_key']) && $c['merchant_key'] !== ''
            && is_string($c['merchant_salt']) && $c['merchant_salt'] !== '';
    }

    /**
     * Ödeme sistemi panelde açık ve zorunlu alanlar dolu mu?
     */
    public function isOperational(): bool
    {
        $c = $this->configuration();

        return $c['enabled'] && $this->isConfigured();
    }

    /**
     * Direkt API paytr_token — dokümandaki sıra: id, ip, oid, email, amount, payment_type, installment_count, currency, test_mode, non_3d.
     */
    public function buildPaytrToken(
        string $userIp,
        string $merchantOid,
        string $email,
        string $paymentAmount,
        string $paymentType,
        int $installmentCount,
        string $currency,
        string $testMode,
        string $non3d,
    ): ?string {
        $c = $this->configuration();
        if (! is_string($c['merchant_key']) || $c['merchant_key'] === '' || ! is_string($c['merchant_salt']) || $c['merchant_salt'] === '') {
            return null;
        }
        $mid = $c['merchant_id'];
        if ($mid === '') {
            return null;
        }

        $hashStr = $mid.$userIp.$merchantOid.$email.$paymentAmount.$paymentType.(string) $installmentCount.$currency.$testMode.$non3d;

        return base64_encode(hash_hmac('sha256', $hashStr.$c['merchant_salt'], $c['merchant_key'], true));
    }

    public function getPaymentPostUrl(): string
    {
        return (string) config('paytr.payment_post_url', 'https://www.paytr.com/odeme');
    }

    public static function formatPaymentAmountTl(float $amount): string
    {
        return number_format(round($amount, 2), 2, '.', '');
    }

    /**
     * Tarayıcıdan PayTR ödeme uç noktasına POST edilecek gizli alanlar (kart alanları hariç).
     *
     * @param  list<array{0: string, 1: string, 2: int}>  $basketRows  Ürün adı, birim fiyat (örn. "99.99"), adet
     * @return array<string, string>|null
     */
    public function buildHostedPaymentHiddenFields(
        string $userIp,
        string $merchantOid,
        string $email,
        string $paymentAmount,
        int $installmentCount,
        string $currency,
        string $non3d,
        string $merchantOkUrl,
        string $merchantFailUrl,
        string $userName,
        string $userAddress,
        string $userPhone,
        array $basketRows,
    ): ?array {
        if (! $this->isConfigured()) {
            return null;
        }
        $c = $this->configuration();
        $testMode = $c['test_mode'] ? '1' : '0';
        $token = $this->buildPaytrToken(
            $userIp,
            $merchantOid,
            $email,
            $paymentAmount,
            'card',
            $installmentCount,
            $currency,
            $testMode,
            $non3d,
        );
        if ($token === null) {
            return null;
        }
        $basketJson = json_encode(array_values($basketRows), JSON_UNESCAPED_UNICODE);
        if ($basketJson === false) {
            return null;
        }
        $userBasket = htmlentities($basketJson, ENT_QUOTES, 'UTF-8');
        $debugOn = config('app.debug') ? '1' : '0';

        return [
            'merchant_id' => $c['merchant_id'],
            'paytr_token' => $token,
            'user_ip' => $userIp,
            'merchant_oid' => $merchantOid,
            'email' => $email,
            'payment_type' => 'card',
            'payment_amount' => $paymentAmount,
            'installment_count' => (string) $installmentCount,
            'currency' => $currency,
            'test_mode' => $testMode,
            'non_3d' => $non3d,
            'merchant_ok_url' => $merchantOkUrl,
            'merchant_fail_url' => $merchantFailUrl,
            'user_name' => $userName,
            'user_address' => $userAddress,
            'user_phone' => $userPhone,
            'user_basket' => $userBasket,
            'debug_on' => $debugOn,
            'client_lang' => 'tr',
            'non3d_test_failed' => '0',
        ];
    }

    /**
     * Bildirim URL POST gövdesindeki hash doğrulaması: merchant_oid + merchant_salt + status + total_amount.
     */
    public function verifyCallbackHash(string $merchantOid, string $status, string $totalAmount, string $receivedHash): bool
    {
        $c = $this->configuration();
        if (! is_string($c['merchant_key']) || $c['merchant_key'] === '' || ! is_string($c['merchant_salt']) || $c['merchant_salt'] === '') {
            return false;
        }

        $payload = $merchantOid.$c['merchant_salt'].$status.$totalAmount;
        $calc = base64_encode(hash_hmac('sha256', $payload, $c['merchant_key'], true));

        return hash_equals($calc, $receivedHash);
    }

    /**
     * @param  array<string, mixed>  $validated
     */
    public function persistSettings(array $validated, ?string $merchantKeyInput, ?string $merchantSaltInput): void
    {
        $currentRaw = AppSetting::query()->where('key', self::SETTING_KEY)->value('value');
        $current = [];
        if (is_string($currentRaw) && trim($currentRaw) !== '') {
            $d = json_decode($currentRaw, true);
            if (is_array($d)) {
                $current = $d;
            }
        }

        $keyStored = $current['merchant_key'] ?? null;
        if (is_string($merchantKeyInput) && trim($merchantKeyInput) !== '') {
            $keyStored = Crypt::encryptString(trim($merchantKeyInput));
        }

        $saltStored = $current['merchant_salt'] ?? null;
        if (is_string($merchantSaltInput) && trim($merchantSaltInput) !== '') {
            $saltStored = Crypt::encryptString(trim($merchantSaltInput));
        }

        $payload = [
            'enabled' => (bool) ($validated['paytr_enabled'] ?? false),
            'test_mode' => (bool) ($validated['paytr_test_mode'] ?? true),
            'merchant_id' => trim((string) ($validated['paytr_merchant_id'] ?? '')),
            'merchant_key' => is_string($keyStored) && $keyStored !== '' ? $keyStored : null,
            'merchant_salt' => is_string($saltStored) && $saltStored !== '' ? $saltStored : null,
        ];

        AppSetting::updateOrCreate(
            ['key' => self::SETTING_KEY],
            ['value' => json_encode($payload, JSON_UNESCAPED_UNICODE)]
        );

        app(AppSettingsService::class)->forgetCaches();
    }

    /**
     * Mağaza bilgileriyle dokümandaki sıraya uygun paytr_token üretiminin çalıştığını doğrular (ağ çağrısı yok).
     *
     * @return array{ok: bool, reason?: string}
     */
    public function validateTokenGenerationLocally(): array
    {
        if (! $this->isConfigured()) {
            return ['ok' => false, 'reason' => 'Mağaza numarası veya anahtarlar eksik.'];
        }

        $c = $this->configuration();
        $token = $this->buildPaytrToken(
            '127.0.0.1',
            'SBLOCALTEST1',
            'test@sahnebul.local',
            '1.00',
            'card',
            0,
            'TL',
            $c['test_mode'] ? '1' : '0',
            '0',
        );

        if ($token === null || $token === '') {
            return ['ok' => false, 'reason' => 'paytr_token üretilemedi; anahtar veya tuz çözülemedi mi kontrol edin.'];
        }

        return ['ok' => true];
    }

    /**
     * .env (PAYTR_TEST_*) üzerinden tanımlı ve PAYTR_ALLOW_ENV_IMPORT açıksa panele kopyalanabilir bilgi var mı?
     *
     * @return array{available: bool}
     */
    public function envPresetMeta(): array
    {
        $id = $this->trimmedEnvCredential(config('paytr.env.merchant_id'));
        $key = $this->trimmedEnvCredential(config('paytr.env.merchant_key'));
        $salt = $this->trimmedEnvCredential(config('paytr.env.merchant_salt'));

        return [
            'available' => $id !== null && $key !== null && $salt !== null,
        ];
    }

    /**
     * Şu anki mağaza bayraklarını koruyarak .env’deki test mağaza bilgilerini kaydeder.
     *
     * @return array{ok: bool, reason?: string}
     */
    public function importCredentialsFromEnv(): array
    {
        if (! config('paytr.allow_env_credential_import')) {
            return ['ok' => false, 'reason' => 'Ortamdan içe aktarma bu sunucuda kapalı (PAYTR_ALLOW_ENV_IMPORT).'];
        }

        $id = $this->trimmedEnvCredential(config('paytr.env.merchant_id'));
        $key = $this->trimmedEnvCredential(config('paytr.env.merchant_key'));
        $salt = $this->trimmedEnvCredential(config('paytr.env.merchant_salt'));

        if ($id === null || $key === null || $salt === null) {
            return ['ok' => false, 'reason' => '.env içinde PAYTR_TEST_MERCHANT_ID, PAYTR_TEST_MERCHANT_KEY ve PAYTR_TEST_MERCHANT_SALT dolu olmalıdır.'];
        }

        $c = $this->configuration();
        $this->persistSettings([
            'paytr_enabled' => $c['enabled'],
            'paytr_test_mode' => $c['test_mode'],
            'paytr_merchant_id' => $id,
        ], $key, $salt);

        return ['ok' => true];
    }

    /**
     * PayTR’ye dokümandaki test kartı ve sync_mode+debug_on ile gerçek POST dener (token + mağaza doğrulaması).
     *
     * non_3d ve sync_mode için mağazada yetki yoksa yanıt hata mesajı döner.
     *
     * @return array{ok: bool, reason?: string, http_status?: int, paytr_status?: string, detail?: string}
     */
    public function probeDirectApi(string $userIp, string $merchantOkUrl, string $merchantFailUrl): array
    {
        if (! $this->isConfigured()) {
            return ['ok' => false, 'reason' => 'Mağaza numarası veya anahtarlar eksik. Önce formu kaydedin.'];
        }

        $c = $this->configuration();
        $canonicalIpRaw = config('paytr.probe_user_ip');
        $canonicalIp = is_string($canonicalIpRaw) && trim($canonicalIpRaw) !== '' ? trim($canonicalIpRaw) : $userIp;
        if (filter_var($canonicalIp, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4) === false) {
            return [
                'ok' => false,
                'reason' => 'PayTR token için IPv4 gerekli (şu an: '.($canonicalIp !== '' ? $canonicalIp : 'boş').'). PAYTR_PROBE_USER_IP ile IPv4 adresinizi girin; PayTR dokümantasyonu yerel denemelerde dış IP önerir.',
            ];
        }
        if ($canonicalIp === '') {
            return ['ok' => false, 'reason' => 'IP alınamadı. PAYTR_PROBE_USER_IP ile dış IP verin veya proxy güven ayarını kontrol edin.'];
        }

        $merchantOid = 'SBPRB'.strtoupper(Str::random(18));
        $merchantOid = preg_replace('/[^A-Za-z0-9]/', '', $merchantOid) ?? $merchantOid;
        $merchantOid = substr($merchantOid, 0, 64);

        $paymentAmount = '1.00';
        $testMode = $c['test_mode'] ? '1' : '0';
        $non3d = '1';
        $installmentCount = 0;
        $currency = 'TL';
        $email = 'testnon3d@paytr.com';

        $paytrToken = $this->buildPaytrToken(
            $canonicalIp,
            $merchantOid,
            $email,
            $paymentAmount,
            'card',
            $installmentCount,
            $currency,
            $testMode,
            $non3d,
        );

        if ($paytrToken === null || $paytrToken === '') {
            return ['ok' => false, 'reason' => 'paytr_token üretilemedi.'];
        }

        $basketJson = json_encode([['Sahnebul API bağlantı testi', $paymentAmount, 1]], JSON_UNESCAPED_UNICODE);
        $userBasket = $basketJson !== false ? htmlentities($basketJson, ENT_QUOTES, 'UTF-8') : '[]';

        $payload = [
            'merchant_id' => $c['merchant_id'],
            'paytr_token' => $paytrToken,
            'user_ip' => $canonicalIp,
            'merchant_oid' => $merchantOid,
            'email' => $email,
            'payment_type' => 'card',
            'payment_amount' => $paymentAmount,
            'installment_count' => (string) $installmentCount,
            'currency' => $currency,
            'test_mode' => $testMode,
            'non_3d' => $non3d,
            'sync_mode' => '1',
            'debug_on' => '1',
            'client_lang' => 'tr',
            'non3d_test_failed' => '0',
            'cc_owner' => 'PAYTR TEST',
            'card_number' => '9792030394440796',
            'expiry_month' => '12',
            'expiry_year' => '99',
            'cvv' => '000',
            'merchant_ok_url' => $merchantOkUrl,
            'merchant_fail_url' => $merchantFailUrl,
            'user_name' => 'PayTR Test',
            'user_address' => 'Sahnebul entegrasyon testi',
            'user_phone' => '05555555555',
            'user_basket' => $userBasket,
        ];

        $url = (string) config('paytr.payment_post_url', 'https://www.paytr.com/odeme');

        try {
            $response = Http::asForm()
                ->timeout(45)
                ->connectTimeout(15)
                ->post($url, $payload);
        } catch (\Throwable $e) {
            return ['ok' => false, 'reason' => 'PayTR ağına ulaşılamadı: '.$e->getMessage()];
        }

        $status = $response->status();
        $body = $response->body();
        $trimBody = trim($body);

        $json = null;
        if ($trimBody !== '' && str_starts_with($trimBody, '{')) {
            try {
                $json = json_decode($trimBody, true, 512, JSON_THROW_ON_ERROR);
            } catch (\JsonException) {
                $json = null;
            }
        }

        if (is_array($json) && isset($json['status'])) {
            $pst = (string) $json['status'];
            if ($pst === 'success') {
                return [
                    'ok' => true,
                    'http_status' => $status,
                    'paytr_status' => $pst,
                    'detail' => isset($json['msg']) ? (string) $json['msg'] : null,
                ];
            }

            return [
                'ok' => false,
                'http_status' => $status,
                'paytr_status' => $pst,
                'reason' => isset($json['msg']) ? (string) $json['msg'] : 'PayTR işlemi başarısız.',
                'detail' => $trimBody !== '' ? mb_substr($trimBody, 0, 800) : null,
            ];
        }

        if ($status >= 200 && $status < 300 && str_contains($body, 'paytr_token')) {
            return [
                'ok' => false,
                'http_status' => $status,
                'reason' => 'PayTR HTML yanıt döndü (muhtemelen Non3D / sync yetkisi kapalı veya test bilgisi hatalı). Aşağıdaki özeti inceleyin.',
                'detail' => mb_substr(strip_tags($body), 0, 1200),
            ];
        }

        return [
            'ok' => false,
            'http_status' => $status,
            'reason' => 'Beklenmeyen yanıt (JSON status yok).',
            'detail' => mb_substr($trimBody !== '' ? $trimBody : strip_tags($body), 0, 1200),
        ];
    }

    private function trimmedEnvCredential(mixed $v): ?string
    {
        if (! is_string($v)) {
            return null;
        }
        $t = trim($v);

        return $t === '' ? null : $t;
    }

    private function decryptSecret(mixed $stored): ?string
    {
        if (! is_string($stored) || $stored === '') {
            return null;
        }
        try {
            return Crypt::decryptString($stored);
        } catch (DecryptException) {
            return $stored;
        }
    }

    /**
     * Örnek sipariş kaydı (ileride bilet satışına bağlanır).
     */
    public function createPendingOrder(string $merchantOid, ?int $userId, string $paymentAmount, string $currency = 'TL', ?array $context = null): PaytrPaymentOrder
    {
        return PaytrPaymentOrder::query()->create([
            'merchant_oid' => $merchantOid,
            'user_id' => $userId,
            'status' => 'pending',
            'payment_amount' => $paymentAmount,
            'currency' => $currency,
            'context' => $context,
        ]);
    }
}
