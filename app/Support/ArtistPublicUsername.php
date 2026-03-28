<?php

namespace App\Support;

use App\Models\Artist;
use Illuminate\Support\Str;

/**
 * Kamu sanatçı adresi: /sanatcilar/{slug} — yalnız a-z ve 0-9, tire yok (ör. ajdapekkan).
 */
final class ArtistPublicUsername
{
    public const MIN_LENGTH = 3;

    public const MAX_LENGTH = 80;

    private const RESERVED = [
        'admin', 'api', 'www', 'mail', 'ftp', 'root', 'null', 'undefined',
        'sahne', 'sahnebul', 'panel', 'login', 'register', 'logout',
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

    /**
     * Boş / kısa taban için anlamlı bir önek.
     */
    public static function fallbackBase(): string
    {
        return 'sanatci';
    }

    /**
     * Benzersiz slug üretir; çakışmada sona 2, 3, … eklenir (ör. ajdapekkan2).
     */
    public static function makeUnique(string $base, ?int $ignoreArtistId = null): string
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
            $q = Artist::query()->where('slug', $slug);
            if ($ignoreArtistId !== null) {
                $q->where('id', '!=', $ignoreArtistId);
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
    public static function assessAvailability(string $raw, ?int $ignoreArtistId = null): array
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
        $q = Artist::query()->where('slug', $normalized);
        if ($ignoreArtistId !== null) {
            $q->where('id', '!=', $ignoreArtistId);
        }
        if ($q->exists()) {
            return [
                'ok' => false,
                'normalized' => $normalized,
                'reason' => 'taken',
                'message' => 'Bu kullanıcı adı başka bir sanatçıda kullanılıyor.',
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
