<?php

namespace App\Support;

final class SeoFormatting
{
    public static function stripHtmlToText(string $html): string
    {
        $plain = preg_replace('/<[^>]*>/', ' ', $html) ?? '';

        return preg_replace('/\s+/u', ' ', trim($plain)) ?? '';
    }

    public static function truncateMetaDescription(string $text, int $max = 160): string
    {
        $one = preg_replace('/\s+/u', ' ', trim($text)) ?? '';
        if (mb_strlen($one) <= $max) {
            return $one;
        }

        return rtrim(mb_substr($one, 0, $max - 1)).'…';
    }

    public static function buildDocumentTitle(string $pageTitle, string $siteName): string
    {
        $t = trim($pageTitle);
        if ($t === '') {
            return $siteName;
        }
        if (str_contains($t, $siteName)) {
            return $t;
        }

        return $t.' | '.$siteName;
    }

    public static function toAbsoluteUrl(?string $pathOrUrl, string $appUrl): ?string
    {
        if ($pathOrUrl === null) {
            return null;
        }
        $s = trim($pathOrUrl);
        if ($s === '') {
            return null;
        }
        if (preg_match('#^https?://#i', $s) === 1) {
            return $s;
        }
        $base = rtrim($appUrl, '/');
        $path = str_starts_with($s, '/') ? $s : '/'.$s;

        return $base.$path;
    }

    /** Depolama veya tam URL — mutlak adres üretir. */
    public static function absoluteMediaUrl(?string $path, string $appUrl): ?string
    {
        if ($path === null) {
            return null;
        }
        $p = trim($path);
        if ($p === '') {
            return null;
        }
        if (preg_match('#^https?://#i', $p) === 1) {
            return $p;
        }

        return self::toAbsoluteUrl(str_starts_with($p, '/') ? $p : '/storage/'.$p, $appUrl);
    }

    public static function normalizeCanonical(string $appUrl, string $pathOrUrl): string
    {
        $base = rtrim($appUrl, '/');
        if (preg_match('#^https?://#i', $pathOrUrl) === 1) {
            $out = $pathOrUrl;
        } else {
            $path = $pathOrUrl;
            if ($path === '') {
                $path = '/';
            }
            if (! str_starts_with($path, '/')) {
                $path = '/'.$path;
            }
            $out = $base.$path;
        }

        return preg_replace('#([^:])/+#', '$1/', $out) ?? $out;
    }
}
