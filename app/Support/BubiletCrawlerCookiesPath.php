<?php

namespace App\Support;

use App\Services\MarketplaceCrawlerService;

/**
 * Bubilet HTTP crawl (MarketplaceCrawlerService) için Netscape cookies.txt yolu.
 * Öncelik: .env BUBILET_COOKIES_FILE (okunabilirse); yoksa panel yüklemesi (storage/app/private/…).
 *
 * @see MarketplaceCrawlerService::bubiletCookieHeaderString()
 */
final class BubiletCrawlerCookiesPath
{
    public const LOCAL_DISK_FILENAME = 'bubilet_crawler_cookies.txt';

    public static function uploadedAbsolutePath(): string
    {
        return storage_path('app/private/'.self::LOCAL_DISK_FILENAME);
    }

    public static function resolve(): ?string
    {
        $configured = config('crawler.bubilet_cookies_file');
        if (is_string($configured) && trim($configured) !== '') {
            $p = self::expandUserPath(trim($configured));
            if ($p !== '' && is_readable($p)) {
                return $p;
            }
        }

        $uploaded = self::uploadedAbsolutePath();
        if (is_readable($uploaded)) {
            return $uploaded;
        }

        return null;
    }

    public static function hasUploadedFile(): bool
    {
        return is_file(self::uploadedAbsolutePath());
    }

    public static function expandUserPath(string $path): string
    {
        if (str_starts_with($path, '~/')) {
            $home = getenv('HOME');
            if (is_string($home) && $home !== '') {
                return $home.substr($path, 1);
            }
        }

        return $path;
    }
}
