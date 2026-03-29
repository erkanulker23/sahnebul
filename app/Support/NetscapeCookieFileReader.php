<?php

namespace App\Support;

/**
 * Netscape / curl "cookies.txt" biçimini Cookie başlık satırına çevirir (Bubilet / Cloudflare için).
 */
final class NetscapeCookieFileReader
{
    /**
     * @return array<string, string>
     */
    public static function pairsFromSemicolonString(string $raw): array
    {
        $pairs = [];
        foreach (explode(';', $raw) as $piece) {
            $piece = trim($piece);
            if ($piece === '' || ! str_contains($piece, '=')) {
                continue;
            }
            [$k, $v] = explode('=', $piece, 2);
            $k = trim($k);
            if ($k === '') {
                continue;
            }
            $pairs[$k] = trim($v);
        }

        return $pairs;
    }

    /**
     * @return array<string, string> name => value (bubilet.com.tr kapsamı, süresi dolmamış)
     */
    public static function bubiletPairsFromNetscapeFile(string $absolutePath): array
    {
        if (! is_readable($absolutePath)) {
            return [];
        }

        $raw = @file_get_contents($absolutePath);
        if ($raw === false || $raw === '') {
            return [];
        }

        $now = time();
        $pairs = [];

        foreach (preg_split('/\R/', $raw) ?: [] as $line) {
            $line = trim($line);
            if ($line === '' || str_starts_with($line, '#')) {
                continue;
            }

            $parts = explode("\t", $line);
            if (count($parts) < 7) {
                continue;
            }

            $domain = $parts[0];
            $expires = $parts[4];
            $name = $parts[5];
            $value = implode("\t", array_slice($parts, 6));

            $domainNorm = strtolower(ltrim($domain, '.'));
            if (! str_ends_with($domainNorm, 'bubilet.com.tr')) {
                continue;
            }

            $exp = (int) $expires;
            if ($exp > 0 && $exp < $now) {
                continue;
            }

            $name = trim($name);
            if ($name === '') {
                continue;
            }

            $pairs[$name] = $value;
        }

        return $pairs;
    }

    /**
     * @param  array<string, string>  $pairs
     */
    public static function cookieHeaderFromPairs(array $pairs): string
    {
        $chunks = [];
        foreach ($pairs as $k => $v) {
            if ($k === '') {
                continue;
            }
            $chunks[] = $k.'='.$v;
        }

        return implode('; ', $chunks);
    }
}
