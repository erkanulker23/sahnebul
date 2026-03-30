<?php

namespace Tests\Feature;

use App\Support\InstagramPromoResolveCache;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class InstagramPromoResolveCacheTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        config(['cache.default' => 'array']);
        Cache::flush();
    }

    public function test_put_and_get_candidates(): void
    {
        config([
            'services.instagram.promo_candidate_cache_enabled' => true,
            'services.instagram.promo_candidate_cache_ttl' => 600,
        ]);

        $url = 'https://www.instagram.com/p/AbCdEfGhIjK/';
        $this->assertNull(InstagramPromoResolveCache::getCandidates($url));

        InstagramPromoResolveCache::putCandidates($url, ['https://scontent.cdninstagram.com/x.mp4?v=1']);
        $got = InstagramPromoResolveCache::getCandidates($url);
        $this->assertSame(['https://scontent.cdninstagram.com/x.mp4?v=1'], $got);
    }

    public function test_disabled_skips_storage(): void
    {
        config(['services.instagram.promo_candidate_cache_enabled' => false]);

        $url = 'https://www.instagram.com/p/XyZ/';
        InstagramPromoResolveCache::putCandidates($url, ['https://example.com/a.mp4']);
        $this->assertNull(InstagramPromoResolveCache::getCandidates($url));
    }
}
