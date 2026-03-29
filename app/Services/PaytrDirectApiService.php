<?php

namespace App\Services;

use App\Models\AppSetting;
use App\Models\PaytrPaymentOrder;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Schema;

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
     * Ödeme sistemi panelde açık ve zorunlu alanlar dolu mu?
     */
    public function isOperational(): bool
    {
        $c = $this->configuration();

        return $c['enabled']
            && $c['merchant_id'] !== ''
            && is_string($c['merchant_key']) && $c['merchant_key'] !== ''
            && is_string($c['merchant_salt']) && $c['merchant_salt'] !== '';
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
        if (! $this->isOperational()) {
            return ['ok' => false, 'reason' => 'Ödeme kapalı veya mağaza no / anahtar eksik.'];
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
