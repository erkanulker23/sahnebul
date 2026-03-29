<?php

namespace Tests\Feature\Admin;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
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
}
