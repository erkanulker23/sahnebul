<?php

namespace Tests\Feature;

use App\Services\MarketplaceCrawlerService;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class BiletsirasiCrawlerTest extends TestCase
{
    public function test_biletsirasi_crawl_reads_listing_and_json_ld_detail(): void
    {
        config([
            'crawler.sources.biletsirasi.listing_urls' => ['https://biletsirasi.com/konser'],
            'crawler.biletsirasi_max_detail_pages' => 10,
        ]);

        $listing = '<!DOCTYPE html><html><body><a href="/konser/demo-etkinlik">Demo</a></body></html>';
        $ld = [
            '@context' => 'https://schema.org',
            '@type' => 'Event',
            'name' => 'Demo Etkinlik',
            'startDate' => '2026-06-15T21:00:00.000Z',
            'location' => [
                '@type' => 'Place',
                'name' => 'Örnek Mekan',
                'address' => [
                    '@type' => 'PostalAddress',
                    'addressLocality' => 'İzmir',
                    'addressCountry' => 'TR',
                ],
            ],
        ];
        $detail = '<!DOCTYPE html><html><head><script type="application/ld+json">'
            .json_encode($ld, JSON_UNESCAPED_UNICODE)
            .'</script></head><body></body></html>';

        Http::fake([
            'https://biletsirasi.com/konser' => Http::response($listing, 200),
            'https://biletsirasi.com/konser/demo-etkinlik' => Http::response($detail, 200),
        ]);

        $rows = app(MarketplaceCrawlerService::class)->crawl('biletsirasi', []);

        $this->assertCount(1, $rows);
        $this->assertSame('Demo Etkinlik', $rows[0]['title']);
        $this->assertStringContainsString('biletsirasi.com/konser/demo-etkinlik', (string) ($rows[0]['external_url'] ?? ''));
        $this->assertSame('Müzik', $rows[0]['category_name']);
    }
}
