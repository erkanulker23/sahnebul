<?php

namespace App\Support;

use Illuminate\Support\Str;

/**
 * Dış kaynak satırlarında (source, fingerprint) tekilliği — import ile aynı kural.
 */
final class ExternalEventFingerprint
{
    public static function normalizedExternalUrl(string $url): string
    {
        $url = trim($url);
        if ($url === '') {
            return '';
        }
        if (! preg_match('#^https?://#i', $url)) {
            return rtrim($url, '/');
        }
        $parts = parse_url($url);
        if ($parts === false || empty($parts['host'])) {
            return rtrim($url, '/');
        }
        $host = strtolower((string) $parts['host']);
        $path = $parts['path'] ?? '';
        $path = $path === '' ? '/' : rtrim($path, '/');

        return 'https://'.$host.$path;
    }

    /**
     * @param  \DateTimeInterface|string|null  $startDate
     */
    public static function compute(
        string $source,
        string $title,
        ?string $externalUrl,
        ?string $venueName,
        mixed $startDate,
    ): string {
        $normUrl = self::normalizedExternalUrl((string) ($externalUrl ?? ''));

        if ($normUrl !== '') {
            return sha1($source.'|url|'.$normUrl);
        }

        if ($source === 'bubilet_sehir_sec' && $externalUrl !== null && trim((string) $externalUrl) !== '') {
            return sha1((string) $externalUrl);
        }

        $titleNorm = Str::of($title)->replaceMatches('/\s+/', ' ')->trim()->limit(240, '')->toString();
        $sd = '';
        if ($startDate instanceof \DateTimeInterface) {
            $sd = $startDate->format('Y-m-d H:i:s');
        } elseif (is_string($startDate) && $startDate !== '') {
            $sd = $startDate;
        }

        return sha1($titleNorm.'|'.($venueName ?? '').'|'.$sd.'|'.($externalUrl ?? ''));
    }
}
