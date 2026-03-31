<?php

namespace App\Support;

use Illuminate\Support\Facades\Cache;

final class UserBackgroundJobPointers
{
    private const PREFIX = 'user_bg_job_pointer:';

    private static function key(int $userId, string $kind): string
    {
        return self::PREFIX.$userId.':'.$kind;
    }

    public static function setExternalCrawlToken(int $userId, string $token, int $ttlSeconds = 7200): void
    {
        Cache::put(self::key($userId, 'external_crawl'), $token, $ttlSeconds);
    }

    public static function getExternalCrawlToken(int $userId): ?string
    {
        $v = Cache::get(self::key($userId, 'external_crawl'));

        return is_string($v) && trim($v) !== '' ? $v : null;
    }

    public static function clearExternalCrawlToken(int $userId): void
    {
        Cache::forget(self::key($userId, 'external_crawl'));
    }

    public static function setPromoImportToken(int $userId, string $token, int $ttlSeconds = 3600): void
    {
        Cache::put(self::key($userId, 'promo_import'), $token, $ttlSeconds);
    }

    public static function getPromoImportToken(int $userId): ?string
    {
        $v = Cache::get(self::key($userId, 'promo_import'));

        return is_string($v) && trim($v) !== '' ? $v : null;
    }
}

