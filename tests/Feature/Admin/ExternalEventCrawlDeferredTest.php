<?php

namespace Tests\Feature\Admin;

use App\Jobs\ImportExternalMarketplaceEventsJob;
use App\Models\User;
use App\Support\ExternalMarketplaceCrawlJobStatus;
use App\Support\UserBackgroundJobPointers;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Str;
use Tests\TestCase;

class ExternalEventCrawlDeferredTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_crawl_requires_date_range(): void
    {
        Bus::fake();

        $admin = User::factory()->admin()->create();

        $response = $this->actingAs($admin)->post(route('admin.external-events.crawl', absolute: false), [
            'source' => 'biletinial',
            'limit' => 25,
            'city_ids' => [],
            'category_ids' => [],
        ]);

        $response->assertSessionHasErrors(['date_from', 'date_to']);
        Bus::assertNothingDispatched();
    }

    public function test_admin_crawl_returns_quickly_and_defers_import_job(): void
    {
        Bus::fake();

        $admin = User::factory()->admin()->create();

        $response = $this->actingAs($admin)->post(route('admin.external-events.crawl', absolute: false), [
            'source' => 'biletinial',
            'limit' => 25,
            'date_from' => '2026-01-01',
            'date_to' => '2026-03-31',
            'city_ids' => [],
            'category_ids' => [],
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        Bus::assertDispatched(ImportExternalMarketplaceEventsJob::class, function (ImportExternalMarketplaceEventsJob $job): bool {
            return $job->sourceOption === 'biletinial'
                && $job->limit === 25
                && $job->dateFrom === '2026-01-01'
                && $job->dateTo === '2026-03-31'
                && $job->cityNames === []
                && $job->categoryNames === []
                && is_string($job->statusToken)
                && $job->statusToken !== '';
        });

        $response->assertSessionHas('external_crawl_job_id');
        $token = (string) session('external_crawl_job_id');
        $this->actingAs($admin)->getJson(route('admin.external-events.crawl-status', ['token' => $token], absolute: false))
            ->assertOk()
            ->assertJsonPath('state', 'queued');
    }

    public function test_terminal_crawl_status_clears_user_background_job_pointer(): void
    {
        $admin = User::factory()->admin()->create();
        $token = (string) Str::uuid();

        UserBackgroundJobPointers::setExternalCrawlToken((int) $admin->id, $token);
        ExternalMarketplaceCrawlJobStatus::boot($token, (int) $admin->id, 'biletinial');
        ExternalMarketplaceCrawlJobStatus::put($token, [
            'state' => 'completed',
            'phase' => 'save',
            'current' => 1,
            'total' => 1,
            'message' => 'Bitti',
        ]);

        $this->actingAs($admin)
            ->getJson(route('admin.external-events.crawl-status', ['token' => $token], absolute: false))
            ->assertOk()
            ->assertJsonPath('state', 'completed');

        $this->assertNull(UserBackgroundJobPointers::getExternalCrawlToken((int) $admin->id));
    }
}
