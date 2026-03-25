<?php

namespace Tests\Feature\Admin;

use App\Models\Artist;
use App\Models\Category;
use App\Models\City;
use App\Models\Event;
use App\Models\EventArtistReport;
use App\Models\User;
use App\Models\Venue;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EventArtistReportTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_list_and_resolve_event_artist_report(): void
    {
        $admin = User::factory()->create(['role' => 'super_admin']);

        $category = Category::query()->create(['name' => 'Bar', 'slug' => 'bar-'.uniqid(), 'order' => 1]);
        $city = City::query()->create(['name' => 'İstanbul', 'slug' => 'istanbul-'.uniqid()]);
        $owner = User::factory()->create(['role' => 'customer']);
        $venue = Venue::query()->create([
            'user_id' => $owner->id,
            'category_id' => $category->id,
            'city_id' => $city->id,
            'name' => 'Test Sahne',
            'slug' => 'test-sahne-'.uniqid(),
            'address' => 'Adres',
            'status' => 'approved',
        ]);

        $performer = User::factory()->artist()->create();
        $artist = Artist::query()->create([
            'user_id' => $performer->id,
            'name' => 'Raporlu Sanatçı',
            'slug' => 'raporlu-'.uniqid(),
            'bio' => 'Bio',
            'status' => 'approved',
            'country_code' => 'TR',
        ]);

        $event = Event::query()->create([
            'venue_id' => $venue->id,
            'title' => 'Admin Rapor Testi',
            'slug' => 'admin-rapor-'.uniqid(),
            'start_date' => now()->addWeek(),
            'end_date' => now()->addWeek()->addHours(2),
            'status' => 'published',
            'ticket_acquisition_mode' => 'sahnebul',
            'sahnebul_reservation_enabled' => true,
        ]);
        $event->artists()->attach($artist->id, ['is_headliner' => true, 'order' => 0]);

        $report = EventArtistReport::query()->create([
            'event_id' => $event->id,
            'artist_id' => $artist->id,
            'user_id' => $performer->id,
            'message' => 'Yöneticiye iletilen örnek rapor metni burada.',
            'status' => EventArtistReport::STATUS_PENDING,
        ]);

        $this->actingAs($admin)
            ->get(route('admin.event-artist-reports.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Admin/EventArtistReports/Index')
                ->has('reports.data', 1)
                ->where('reports.data.0.id', $report->id));

        $this->actingAs($admin)
            ->patch(route('admin.event-artist-reports.update', $report), [
                'status' => 'resolved',
                'admin_note' => 'Kadrodan çıkarıldı, teşekkürler.',
            ])
            ->assertRedirect();

        $report->refresh();
        $this->assertSame(EventArtistReport::STATUS_RESOLVED, $report->status);
        $this->assertNotNull($report->reviewed_at);
        $this->assertSame((int) $admin->id, (int) $report->reviewed_by);
    }
}
