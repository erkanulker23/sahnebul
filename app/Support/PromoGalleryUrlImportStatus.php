<?php

namespace App\Support;

use Illuminate\Support\Facades\Cache;

/**
 * Tanıtım URL içe aktarımı (arka plan job) için kısa ömürlü durum; ön yüz anketler.
 */
final class PromoGalleryUrlImportStatus
{
    private const PREFIX = 'promo_gallery_url_import:';

    public static function cacheKey(string $id): string
    {
        return self::PREFIX.$id;
    }

    /**
     * @return array<string, mixed>|null
     */
    public static function get(string $id): ?array
    {
        $v = Cache::get(self::cacheKey($id));

        return is_array($v) ? $v : null;
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    public static function put(string $id, array $payload, int $ttlSeconds = 3600): void
    {
        $prev = self::get($id) ?? [];
        Cache::put(self::cacheKey($id), array_merge($prev, ['updated_at' => time()], $payload), $ttlSeconds);
    }

    public static function boot(string $id, int $userId, int $total): void
    {
        self::put($id, [
            'user_id' => $userId,
            'state' => 'queued',
            'total' => max(1, $total),
            'current' => 0,
            'ok' => 0,
            'failures' => [],
            'active_url' => null,
            'message' => $total > 1
                ? "{$total} bağlantı kuyrukta; işlem başlayınca ilerleme burada görünür."
                : 'Video indirme kuyrukta…',
        ]);
    }
}
