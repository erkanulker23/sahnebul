<?php

namespace App\Support;

/**
 * YTDLP_COOKIES_FILE (Netscape) içeriğinden Laravel HTTP istemcisi için Cookie başlığı üretir.
 */
final class InstagramNetscapeCookies
{
    /**
     * @return non-empty-string|null
     */
    public static function toCookieHeader(?string $absolutePath): ?string
    {
        if ($absolutePath === null) {
            return null;
        }
        $absolutePath = trim($absolutePath);
        if ($absolutePath === '') {
            return null;
        }
        if (str_starts_with($absolutePath, '~/')) {
            $home = getenv('HOME');
            if (is_string($home) && $home !== '') {
                $absolutePath = $home.substr($absolutePath, 1);
            }
        }
        if (! is_readable($absolutePath)) {
            return null;
        }
        $lines = file($absolutePath, FILE_IGNORE_NEW_LINES);
        if ($lines === false) {
            return null;
        }
        $pairs = [];
        $now = time();
        foreach ($lines as $line) {
            $line = trim($line);
            if ($line === '' || str_starts_with($line, '#')) {
                continue;
            }
            $parts = explode("\t", $line);
            if (count($parts) < 7) {
                continue;
            }
            $domain = strtolower($parts[0]);
            if (str_starts_with($domain, '#httponly_')) {
                $domain = substr($domain, strlen('#httponly_'));
            }
            if (! str_contains($domain, 'instagram.com')) {
                continue;
            }
            $expires = (int) $parts[4];
            if ($expires > 0 && $expires < $now) {
                continue;
            }
            $name = $parts[5];
            $value = $parts[6];
            if ($name === '') {
                continue;
            }
            $pairs[$name] = $value;
        }
        if ($pairs === []) {
            return null;
        }
        $chunks = [];
        foreach ($pairs as $n => $v) {
            $chunks[] = $n.'='.$v;
        }

        return implode('; ', $chunks);
    }
}
