<?php

namespace App\Support;

use App\Models\Venue;
use Illuminate\Support\Str;

/**
 * Kamu mekân adresi: /mekanlar/{slug} — yalnız a-z ve 0-9, tire yok (sanatçı profili ile aynı kural).
 */
final class VenuePublicUsername
{
    public const MIN_LENGTH = 3;

    public const MAX_LENGTH = 80;

    private const RESERVED = [
        'admin', 'api', 'www', 'mail', 'ftp', 'root', 'null', 'undefined',
        'sahne', 'sahnebul', 'panel', 'login', 'register', 'logout',
        'mekanlar', 'mekan', 'venue', 'venues',
        'yakinindakiler',
    ];

    public static function normalize(string $raw): string
    {
        $t = trim($raw);
        if ($t === '') {
            return '';
        }
        $ascii = Str::ascii($t, 'tr');
        $ascii = mb_strtolower($ascii, 'UTF-8');

        return preg_replace('/[^a-z0-9]+/', '', $ascii) ?? '';
    }

    public static function fromDisplayName(string $name): string
    {
        return self::normalize($name);
    }

    public static function isValidFormat(string $normalized): bool
    {
        $len = strlen($normalized);

        return $len >= self::MIN_LENGTH
            && $len <= self::MAX_LENGTH
            && preg_match('/^[a-z0-9]+$/', $normalized) === 1;
    }

    public static function isReserved(string $normalized): bool
    {
        return in_array($normalized, self::RESERVED, true);
    }

    public static function fallbackBase(): string
    {
        return 'mekan';
    }

    /**
     * Benzersiz slug üretir; çakışmada sona 2, 3, … eklenir.
     */
    public static function makeUnique(string $base, ?int $ignoreVenueId = null): string
    {
        $base = self::normalize($base);
        if ($base === '' || strlen($base) < self::MIN_LENGTH) {
            $base = self::fallbackBase();
        }
        if (strlen($base) > self::MAX_LENGTH) {
            $base = substr($base, 0, self::MAX_LENGTH);
        }

        $slug = $base;
        for ($n = 2; $n < 100_000; $n++) {
            $q = Venue::query()->where('slug', $slug);
            if ($ignoreVenueId !== null) {
                $q->where('id', '!=', $ignoreVenueId);
            }
            if (! $q->exists()) {
                return $slug;
            }
            $suffix = (string) $n;
            $maxBaseLen = self::MAX_LENGTH - strlen($suffix);
            $trimmed = substr($base, 0, max(1, $maxBaseLen));
            $slug = $trimmed.$suffix;
        }

        return substr($base, 0, max(1, self::MAX_LENGTH - 8)).substr(md5((string) microtime(true)), 0, 8);
    }

    /**
     * @return array{ok: bool, normalized: string, reason: string|null, message: string|null}
     */
    public static function assessAvailability(string $raw, ?int $ignoreVenueId = null): array
    {
        $normalized = self::normalize($raw);
        if ($normalized === '') {
            return [
                'ok' => false,
                'normalized' => '',
                'reason' => 'empty',
                'message' => 'Kullanıcı adı boş olamaz.',
            ];
        }
        if (! self::isValidFormat($normalized)) {
            return [
                'ok' => false,
                'normalized' => $normalized,
                'reason' => 'format',
                'message' => '3–80 karakter, yalnız küçük harf (a-z) ve rakam (0-9); boşluk veya tire yok.',
            ];
        }
        if (self::isReserved($normalized)) {
            return [
                'ok' => false,
                'normalized' => $normalized,
                'reason' => 'reserved',
                'message' => 'Bu kullanıcı adı sistemde ayrılmış.',
            ];
        }
        $q = Venue::query()->where('slug', $normalized);
        if ($ignoreVenueId !== null) {
            $q->where('id', '!=', $ignoreVenueId);
        }
        if ($q->exists()) {
            return [
                'ok' => false,
                'normalized' => $normalized,
                'reason' => 'taken',
                'message' => 'Bu kullanıcı adı başka bir mekânda kullanılıyor.',
            ];
        }

        return [
            'ok' => true,
            'normalized' => $normalized,
            'reason' => null,
            'message' => 'Uygun.',
        ];
    }
}
