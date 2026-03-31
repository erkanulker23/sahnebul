<?php

namespace Tests\Feature\Admin;

use App\Models\ExternalEvent;
use App\Services\MarketplaceCrawlerService;
use App\Services\MarketplaceExternalEventImportService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExternalEventDuplicateMergeTest extends TestCase
{
    use RefreshDatabase;

    public function test_import_merges_two_rows_same_normalized_url_before_fingerprint_update(): void
    {
        $url = 'https://biletinial.com/tr-tr/muzik/cem-adrian-jj';

        ExternalEvent::query()->create([
            'source' => 'biletinial',
            'fingerprint' => str_repeat('a', 40),
            'title' => 'Eski A',
            'external_url' => $url,
            'image_url' => null,
            'venue_name' => null,
            'city_name' => null,
            'category_name' => null,
            'start_date' => now()->addDay(),
            'description' => null,
            'meta' => null,
            'synced_event_id' => null,
        ]);

        ExternalEvent::query()->create([
            'source' => 'biletinial',
            'fingerprint' => str_repeat('b', 40),
            'title' => 'Eski B',
            'external_url' => $url,
            'image_url' => null,
            'venue_name' => null,
            'city_name' => null,
            'category_name' => null,
            'start_date' => now()->addDay(),
            'description' => null,
            'meta' => null,
            'synced_event_id' => null,
        ]);

        $this->assertSame(2, ExternalEvent::query()->where('source', 'biletinial')->count());

        $crawlRow = [
            'title' => 'Cem Adrian Konseri',
            'external_url' => $url,
            'venue_name' => null,
            'city_name' => null,
            'category_name' => null,
            'start_date' => now()->addDays(2),
            'description' => null,
            'meta' => [],
            'image_url' => null,
        ];

        $this->mock(MarketplaceCrawlerService::class, function ($mock) use ($crawlRow): void {
            $mock->shouldReceive('crawl')
                ->with('biletinial', [])
                ->once()
                ->andReturn([$crawlRow]);
        });

        app(MarketplaceExternalEventImportService::class)->import(
            'biletinial',
            50,
            false,
            null,
            null,
            [],
            [],
            null,
        );

        $this->assertSame(1, ExternalEvent::query()->where('source', 'biletinial')->count());
        $kept = ExternalEvent::query()->where('source', 'biletinial')->first();
        $this->assertNotNull($kept);
        $this->assertSame('Cem Adrian Konseri', $kept->title);
    }
}
