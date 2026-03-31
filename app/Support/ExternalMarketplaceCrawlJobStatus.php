<?php

namespace App\Support;

use Illuminate\Support\Facades\Cache;

/**
 * Dış kaynak «Verileri çek» arka plan işi için kısa ömürlü durum; panel anketler.
 */
final class ExternalMarketplaceCrawlJobStatus
{
    private const PREFIX = 'external_marketplace_crawl_job:';

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
    public static function put(string $id, array $payload, int $ttlSeconds = 7200): void
    {
        $prev = self::get($id) ?? [];
        Cache::put(self::cacheKey($id), array_merge($prev, $payload, ['updated_at' => time()]), $ttlSeconds);
    }

    public static function boot(string $id, int $userId, string $sourceKey): void
    {
        self::put($id, [
            'user_id' => $userId,
            'state' => 'queued',
            'phase' => 'crawl',
            'current' => 0,
            'total' => 1,
            'message' => 'Kuyrukta; sunucu çekime başlayınca ilerleme burada güncellenir.',
            'active_source' => $sourceKey,
        ]);
    }
}
