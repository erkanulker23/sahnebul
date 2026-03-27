<?php

namespace App\Support;

/**
 * Türkiye ulusal 10 haneli numaralar (cep 5xx, sabit 2xx–4xx, 8xx hatlar).
 * Depolama biçimi: 0XXX XXX XX XX
 */
final class TurkishPhone
{
    /**
     * Girdiği metinden geçerli bir TR numarası çıkarıp standart biçime çevirir; geçersizse null.
     */
    public static function normalize(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $trimmed = trim($value);
        if ($trimmed === '') {
            return null;
        }

        $digits = preg_replace('/\D+/', '', $trimmed) ?? '';
        if ($digits === '') {
            return null;
        }

        if (str_starts_with($digits, '90')) {
            $digits = substr($digits, 2);
        }

        if (str_starts_with($digits, '0')) {
            $digits = substr($digits, 1);
        }

        if (strlen($digits) > 10) {
            $digits = substr($digits, -10);
        }

        if (strlen($digits) !== 10) {
            return null;
        }

        if (! preg_match('/^(?:5[0-9]{9}|[234][0-9]{9}|8[0-9]{9})$/', $digits)) {
            return null;
        }

        return sprintf(
            '0%s %s %s %s',
            substr($digits, 0, 3),
            substr($digits, 3, 3),
            substr($digits, 6, 2),
            substr($digits, 8, 2)
        );
    }

    /**
     * WhatsApp: http(s) URL ise olduğu gibi döner; değilse telefon normalizasyonu uygulanır.
     */
    public static function normalizeWhatsAppField(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $trimmed = trim($value);
        if ($trimmed === '') {
            return null;
        }

        if (preg_match('#^https?://#i', $trimmed) === 1) {
            return $trimmed;
        }

        return self::normalize($trimmed);
    }

    /**
     * @param  array<string, mixed>  $data
     * @param  list<string>  $dotKeys  örn. guest_phone, manager_info.phone
     * @return array<string, mixed>
     */
    public static function mergeNormalizedInto(array $data, array $dotKeys): array
    {
        foreach ($dotKeys as $key) {
            $value = data_get($data, $key);
            if ($value === null || $value === '') {
                continue;
            }
            if (! is_string($value)) {
                continue;
            }
            $n = self::normalize($value);
            if ($n !== null) {
                data_set($data, $key, $n);
            }
        }

        return $data;
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public static function mergeNormalizedWhatsAppInto(array $data, string $dotKey = 'whatsapp'): array
    {
        $value = data_get($data, $dotKey);
        if ($value === null || $value === '') {
            return $data;
        }
        if (! is_string($value)) {
            return $data;
        }
        $n = self::normalizeWhatsAppField($value);
        if ($n !== null) {
            data_set($data, $dotKey, $n);
        }

        return $data;
    }
}
