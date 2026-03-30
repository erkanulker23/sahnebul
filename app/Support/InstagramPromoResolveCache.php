<?php

namespace App\Support;

use Illuminate\Support\Facades\Cache;

/**
 * Instagram tanıtım içe aktarmada HTML aşamasından çıkan doğrudan video URL adaylarını kısa süreli önbelleğe alır.
 * Aynı gönderi tekrar işlendiğinde (toplu içe aktarma, yeniden dene) önce hızlı yol tekrarlanır.
 *
 * Not: CDN mp4 bağlantıları zaman aşımlı olabilir; TTL kısa tutulmalı (varsayılan 10 dk).
 */
final class InstagramPromoResolveCache
{
    public static function cacheKey(string $normalizedUrl): string
    {
        return 'instagram_promo:video_candidates:v1:'.hash('sha256', $normalizedUrl);
    }

    /** @return list<string>|null */
    public static function getCandidates(string $normalizedUrl): ?array
    {
        if (! filter_var(config('services.instagram.promo_candidate_cache_enabled', true), FILTER_VALIDATE_BOOL)) {
            return null;
        }
        $raw = Cache::get(self::cacheKey($normalizedUrl));
        if (! is_array($raw)) {
            return null;
        }
        $out = [];
        foreach ($raw as $x) {
            if (is_string($x) && trim($x) !== '') {
                $out[] = trim($x);
            }
        }

        return $out === [] ? null : $out;
    }

    /**
     * @param  list<string>  $candidates
     */
    public static function putCandidates(string $normalizedUrl, array $candidates): void
    {
        if (! filter_var(config('services.instagram.promo_candidate_cache_enabled', true), FILTER_VALIDATE_BOOL)) {
            return;
        }
        $ttl = max(0, (int) config('services.instagram.promo_candidate_cache_ttl', 600));
        if ($ttl === 0 || $candidates === []) {
            return;
        }
        Cache::put(self::cacheKey($normalizedUrl), array_values($candidates), $ttl);
    }
}
