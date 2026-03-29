<?php

namespace Tests\Unit;

use App\Support\CrawlerHttpResponseInspector;
use PHPUnit\Framework\TestCase;

class CrawlerHttpResponseInspectorTest extends TestCase
{
    public function test_compact_cloudflare_bubilet_returns_short_line(): void
    {
        $long = CrawlerHttpResponseInspector::cloudflareBlockedMessage();
        $compact = CrawlerHttpResponseInspector::compactCrawlerErrorForAdmin($long);

        $this->assertLessThan(250, mb_strlen($compact));
        $this->assertStringContainsString('Cloudflare', $compact);
        $this->assertStringContainsString('BUBILET_COOKIES', $compact);
    }
}
