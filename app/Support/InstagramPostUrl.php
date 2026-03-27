<?php

namespace App\Support;

final class InstagramPostUrl
{
    public static function isInstagramHost(string $url): bool
    {
        $host = strtolower((string) parse_url($url, PHP_URL_HOST));

        return str_contains($host, 'instagram.com');
    }

    public static function shortcodeFromUrl(string $url): ?string
    {
        $path = parse_url($url, PHP_URL_PATH);
        if (! is_string($path) || $path === '') {
            return null;
        }
        if (preg_match('#/(?:p|reel|reels|tv)/([A-Za-z0-9_-]+)#', $path, $m)) {
            return $m[1];
        }

        return null;
    }

    public static function canonicalPermalink(string $url): ?string
    {
        $shortcode = self::shortcodeFromUrl($url);

        return $shortcode !== null
            ? 'https://www.instagram.com/p/'.rawurlencode($shortcode).'/'
            : null;
    }
}
