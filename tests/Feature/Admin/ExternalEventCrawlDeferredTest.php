<?php

namespace Tests\Feature\Admin;

use App\Jobs\ImportExternalMarketplaceEventsJob;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Tests\TestCase;

class ExternalEventCrawlDeferredTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_crawl_returns_quickly_and_defers_import_job(): void
    {
        Bus::fake();

        $admin = User::factory()->admin()->create();

        $response = $this->actingAs($admin)->post(route('admin.external-events.crawl', absolute: false), [
            'source' => 'biletinial',
            'limit' => 25,
            'date_from' => '',
            'date_to' => '',
            'city_ids' => [],
            'category_ids' => [],
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        Bus::assertDispatched(ImportExternalMarketplaceEventsJob::class, function (ImportExternalMarketplaceEventsJob $job): bool {
            return $job->sourceOption === 'biletinial'
                && $job->limit === 25
                && $job->dateFrom === null
                && $job->dateTo === null
                && $job->cityNames === []
                && $job->categoryNames === [];
        });
    }
}
