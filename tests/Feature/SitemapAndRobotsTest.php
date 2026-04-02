<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SitemapAndRobotsTest extends TestCase
{
    use RefreshDatabase;

    public function test_sitemap_index_xml_returns_valid_envelope(): void
    {
        $response = $this->get('/sitemap.xml');

        $response->assertOk();
        $response->assertHeader('Content-Type', 'application/xml; charset=UTF-8');
        $this->assertStringContainsString('max-age=300', (string) $response->headers->get('Cache-Control'));
        $content = $response->getContent();
        $this->assertStringContainsString(
            '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
            $content
        );
        $this->assertStringContainsString('<sitemap>', $content);
        $this->assertStringContainsString('<loc>', $content);
        $this->assertStringContainsString('/sitemap-etkinlikler.xml', $content);
        $this->assertStringContainsString('/sitemap-mekanlar.xml', $content);
        $this->assertStringContainsString('/sitemap-sanatcilar.xml', $content);
        $this->assertStringContainsString('/sitemap-genel.xml', $content);
    }

    public function test_child_sitemaps_return_urlset(): void
    {
        foreach ([
            '/sitemap-genel.xml',
            '/sitemap-etkinlikler.xml',
            '/sitemap-mekanlar.xml',
            '/sitemap-sanatcilar.xml',
        ] as $path) {
            $response = $this->get($path);
            $response->assertOk();
            $response->assertHeader('Content-Type', 'application/xml; charset=UTF-8');
            $content = $response->getContent();
            $this->assertStringContainsString('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">', $content);
            $this->assertStringContainsString('<loc>', $content);
        }
    }

    public function test_robots_txt_includes_sitemap_line(): void
    {
        $base = rtrim((string) config('app.url'), '/');
        $response = $this->get('/robots.txt');

        $response->assertOk();
        $response->assertSee('User-agent: *', false);
        $response->assertSee('Sitemap: '.$base.'/sitemap.xml', false);
    }
}
