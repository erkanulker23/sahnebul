<?php

namespace Tests\Unit;

use App\Support\InertiaDocumentMeta;
use Tests\TestCase;

class InertiaDocumentMetaPageSeoTest extends TestCase
{
    private function baseSeoProps(): array
    {
        return [
            'siteName' => 'SahnebulUnit',
            'appUrl' => 'https://unit.test',
            'defaultDescription' => 'Varsayılan site açıklaması test.',
            'locale' => 'tr_TR',
        ];
    }

    public function test_home_branch_uses_config_page_seo_template(): void
    {
        config([
            'sahnebul.default_page_seo.home' => [
                'title' => '{site_name} — UNIT HOME SEO',
                'description' => 'UNIT meta {year} için ana sayfa.',
            ],
        ]);

        $doc = InertiaDocumentMeta::fromInertiaPage([
            'component' => 'Venues/Index',
            'url' => '/',
            'props' => [
                'isVenuesPage' => false,
                'seo' => $this->baseSeoProps(),
            ],
        ]);

        $this->assertNotNull($doc);
        $this->assertStringContainsString('SahnebulUnit — UNIT HOME SEO', $doc['title']);
        $tags = $doc['tags'];
        $this->assertIsArray($tags);
        $descTag = null;
        foreach ($tags as $tag) {
            if (($tag['t'] ?? '') === 'meta' && ($tag['attrs']['name'] ?? '') === 'description') {
                $descTag = $tag['attrs']['content'] ?? null;
                break;
            }
        }
        $this->assertIsString($descTag);
        $this->assertStringContainsString((string) date('Y'), $descTag);
        $this->assertStringContainsString('UNIT meta', $descTag);
    }

    public function test_artists_index_uses_config_template(): void
    {
        config([
            'sahnebul.default_page_seo.artists_index' => [
                'title' => 'Sanatçı listesi UNIT | {site_name}',
                'description' => 'UNIT sanatçı açıklama {site_name}.',
            ],
        ]);

        $doc = InertiaDocumentMeta::fromInertiaPage([
            'component' => 'Artists/Index',
            'url' => '/sanatcilar',
            'props' => [
                'artists' => ['data' => []],
                'seo' => $this->baseSeoProps(),
            ],
        ]);

        $this->assertNotNull($doc);
        $this->assertStringContainsString('Sanatçı listesi UNIT | SahnebulUnit', $doc['title']);
    }
}
