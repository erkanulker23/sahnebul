<?php

namespace App\Support;

/**
 * yt-dlp --cookies ve Laravel’in Instagram HTML istekleri için çerez dosyası yolu.
 * Öncelik: .env YTDLP_COOKIES_FILE (okunabilirse); yoksa panelden yüklenen dosya (storage/app/private/…).
 */
final class InstagramYtdlpCookiesPath
{
    /**
     * Dosya adı. config/filesystems.php local disk kökü storage/app/private olduğu için
     * store/delete doğrudan bu ada göre yapılır; mutlak yol aşağıdaki gibi app/private/… olur.
     */
    public const LOCAL_DISK_FILENAME = 'instagram_ytdlp_cookies.txt';

    public static function uploadedAbsolutePath(): string
    {
        return storage_path('app/private/'.self::LOCAL_DISK_FILENAME);
    }

    /**
     * yt-dlp ve InstagramNetscapeCookies için kullanılacak mutlak dosya yolu; yoksa null.
     */
    public static function resolve(): ?string
    {
        $configured = config('services.ytdlp.cookies_file');
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
