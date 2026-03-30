<?php

namespace Tests\Feature\Admin;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Session;
use Tests\TestCase;

class ExternalEventDismissLastCrawlTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_dismiss_last_crawl_report(): void
    {
        Session::put('external_events_last_crawl', ['summary' => 'x']);

        $this->post(route('admin.external-events.dismiss-last-crawl', absolute: false))
            ->assertRedirect(route('login.admin', absolute: false));

        $this->assertNotNull(Session::get('external_events_last_crawl'));
    }

    public function test_admin_can_dismiss_last_crawl_report(): void
    {
        $admin = User::factory()->admin()->create();
        $report = [
            'finished_at' => '30.03.2026 01:00:00',
            'status' => 'warning',
            'total_processed' => 66,
            'rows' => [],
            'summary' => 'Test',
        ];
        Session::put('external_events_last_crawl', $report);

        $response = $this->actingAs($admin)
            ->post(route('admin.external-events.dismiss-last-crawl', absolute: false));

        $response->assertRedirect();
        $response->assertSessionHas('success');
        $response->assertSessionMissing('external_events_last_crawl');
    }

    public function test_index_includes_persisted_last_crawl_from_cache_without_session(): void
    {
        $admin = User::factory()->admin()->create();

        Cache::forever('external_events_last_crawl_snapshot', [
            'finished_at' => '29.03.2026 12:34:56',
            'status' => 'success',
            'total_processed' => 42,
            'rows' => [],
            'summary' => 'Kayıt test özeti',
        ]);

        $this->assertNull(Session::get('external_events_last_crawl'));

        $this->actingAs($admin)
            ->get(route('admin.external-events.index', ['status' => 'all']))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Admin/ExternalEvents/Index')
                ->where('persistedLastCrawl.finished_at', '29.03.2026 12:34:56')
                ->where('persistedLastCrawl.status', 'success')
                ->where('persistedLastCrawl.total_processed', 42)
                ->where('persistedLastCrawl.summary', 'Kayıt test özeti')
                ->where('lastCrawlReport', null));
    }

    public function test_dismiss_last_crawl_does_not_clear_persisted_cache_snapshot(): void
    {
        $admin = User::factory()->admin()->create();

        $report = [
            'finished_at' => '30.03.2026 01:00:00',
            'status' => 'warning',
            'total_processed' => 66,
            'rows' => [],
            'summary' => 'Test',
        ];
        Cache::forever('external_events_last_crawl_snapshot', $report);
        Session::put('external_events_last_crawl', $report);

        $this->actingAs($admin)
            ->post(route('admin.external-events.dismiss-last-crawl', absolute: false))
            ->assertRedirect();

        $this->assertNull(Session::get('external_events_last_crawl'));

        $this->actingAs($admin)
            ->get(route('admin.external-events.index', ['status' => 'all']))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('persistedLastCrawl.finished_at', '30.03.2026 01:00:00')
                ->where('lastCrawlReport', null));
    }
}
