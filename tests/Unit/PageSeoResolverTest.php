<?php

namespace Tests\Unit;

use App\Support\PageSeoResolver;
use Tests\TestCase;

class PageSeoResolverTest extends TestCase
{
    public function test_apply_replaces_placeholders_from_config_defaults(): void
    {
        config([
            'sahnebul.default_page_seo.contact' => [
                'title' => 'Destek | {site_name}',
                'description' => 'Yazın bize: {year} — {site_name}.',
            ],
        ]);

        [$title, $desc] = PageSeoResolver::apply(
            'contact',
            [
                'site_name' => 'SahnebulTest',
                'year' => '2099',
                'default_description' => 'fallback',
            ],
            'Fallback Title',
            'Fallback Desc',
        );

        $this->assertSame('Destek | SahnebulTest', $title);
        $this->assertSame('Yazın bize: 2099 — SahnebulTest.', $desc);
    }

    public function test_apply_falls_back_when_config_row_missing(): void
    {
        config(['sahnebul.default_page_seo' => []]);

        [$title, $desc] = PageSeoResolver::apply(
            'contact',
            [
                'site_name' => 'X',
                'year' => '2000',
                'default_description' => 'd',
            ],
            'My Fallback Title',
            'My Fallback Desc',
        );

        $this->assertSame('My Fallback Title', $title);
        $this->assertSame('My Fallback Desc', $desc);
    }
}
