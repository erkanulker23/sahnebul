<?php

namespace Tests\Feature\Artist;

use App\Models\Artist;
use App\Models\Category;
use App\Models\City;
use App\Models\Event;
use App\Models\EventArtistReport;
use App\Models\User;
use App\Models\Venue;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ArtistPanelEventsTest extends TestCase
{
    use RefreshDatabase;

    public function test_artist_sees_events_where_linked_on_lineup_without_owning_venue(): void
    {
        $category = Category::query()->create(['name' => 'Bar', 'slug' => 'bar', 'order' => 1]);
        $city = City::query()->create(['name' => 'İstanbul', 'slug' => 'istanbul']);
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
            'name' => 'Lineup Sanatçı',
            'slug' => 'lineup-sanatci-'.uniqid(),
            'bio' => 'Bio',
            'status' => 'approved',
            'country_code' => 'TR',
        ]);

        $event = Event::query()->create([
            'venue_id' => $venue->id,
            'title' => 'Pivot Konser',
            'slug' => 'pivot-konser-'.uniqid(),
            'start_date' => now()->addWeek(),
            'end_date' => now()->addWeek()->addHours(2),
            'status' => 'published',
            'ticket_acquisition_mode' => 'sahnebul',
            'sahnebul_reservation_enabled' => true,
        ]);
        $event->artists()->attach($artist->id, ['is_headliner' => true, 'order' => 0]);

        $response = $this->actingAs($performer)->get('/sahne/etkinlikler');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Artist/Events/Index')
            ->has('events.data', 1)
            ->where('events.data.0.title', 'Pivot Konser')
            ->where('events.data.0.panel_can_edit', false)
            ->where('events.data.0.artist_report', null)
            ->where('canCreateEvent', true));
    }

    public function test_artist_without_venue_can_create_draft_event_at_foreign_venue(): void
    {
        $category = Category::query()->create(['name' => 'Bar', 'slug' => 'bar-'.uniqid(), 'order' => 1]);
        $city = City::query()->create(['name' => 'İstanbul', 'slug' => 'istanbul-'.uniqid()]);
        $owner = User::factory()->create(['role' => 'customer']);
        $venue = Venue::query()->create([
            'user_id' => $owner->id,
            'category_id' => $category->id,
            'city_id' => $city->id,
            'name' => 'Dış Mekân',
            'slug' => 'dis-mekan-'.uniqid(),
            'address' => 'Adres',
            'status' => 'approved',
        ]);

        $performer = User::factory()->artist()->create();
        $artist = Artist::query()->create([
            'user_id' => $performer->id,
            'name' => 'Oluşturan Sanatçı',
            'slug' => 'olusturan-'.uniqid(),
            'bio' => 'Bio',
            'status' => 'approved',
            'country_code' => 'TR',
        ]);

        $this->actingAs($performer)->post(route('artist.events.store'), [
            'venue_id' => $venue->id,
            'title' => 'Sanatçı önerisi konser',
            'artist_ids' => [],
            'description' => null,
            'event_rules' => null,
            'start_date' => now()->addDays(10)->toDateTimeString(),
            'end_date' => null,
            'ticket_price' => null,
            'capacity' => null,
            'ticket_tiers' => [],
            'ticket_acquisition_mode' => 'sahnebul',
            'ticket_outlets' => [],
            'ticket_purchase_note' => null,
        ])->assertRedirect(route('artist.events.index'));

        $event = Event::query()->where('title', 'Sanatçı önerisi konser')->first();
        $this->assertNotNull($event);
        $this->assertSame('draft', $event->status);
        $this->assertSame($venue->id, (int) $event->venue_id);
        $this->assertTrue($event->artists()->where('artists.id', $artist->id)->exists());
    }

    public function test_artist_can_report_lineup_event_to_admin(): void
    {
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
            'name' => 'Lineup Sanatçı',
            'slug' => 'lineup-sanatci-'.uniqid(),
            'bio' => 'Bio',
            'status' => 'approved',
            'country_code' => 'TR',
        ]);

        $event = Event::query()->create([
            'venue_id' => $venue->id,
            'title' => 'Rapor Konser',
            'slug' => 'rapor-konser-'.uniqid(),
            'start_date' => now()->addWeek(),
            'end_date' => now()->addWeek()->addHours(2),
            'status' => 'published',
            'ticket_acquisition_mode' => 'sahnebul',
            'sahnebul_reservation_enabled' => true,
        ]);
        $event->artists()->attach($artist->id, ['is_headliner' => true, 'order' => 0]);

        $this->actingAs($performer)
            ->post(route('artist.events.report', $event), [
                'message' => 'Bu etkinlikte yer almıyorum, bilgim dışında eklenmiş.',
            ])
            ->assertRedirect(route('artist.events.index'));

        $this->assertDatabaseHas('event_artist_reports', [
            'event_id' => $event->id,
            'artist_id' => $artist->id,
            'user_id' => $performer->id,
            'status' => EventArtistReport::STATUS_PENDING,
        ]);
    }

    public function test_artist_cannot_submit_second_pending_report_for_same_event(): void
    {
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
            'name' => 'Lineup Sanatçı',
            'slug' => 'lineup-sanatci-'.uniqid(),
            'bio' => 'Bio',
            'status' => 'approved',
            'country_code' => 'TR',
        ]);

        $event = Event::query()->create([
            'venue_id' => $venue->id,
            'title' => 'Çift Rapor',
            'slug' => 'cift-rapor-'.uniqid(),
            'start_date' => now()->addWeek(),
            'end_date' => now()->addWeek()->addHours(2),
            'status' => 'published',
            'ticket_acquisition_mode' => 'sahnebul',
            'sahnebul_reservation_enabled' => true,
        ]);
        $event->artists()->attach($artist->id, ['is_headliner' => true, 'order' => 0]);

        EventArtistReport::query()->create([
            'event_id' => $event->id,
            'artist_id' => $artist->id,
            'user_id' => $performer->id,
            'message' => 'İlk rapor mesajı burada yeterli uzunlukta.',
            'status' => EventArtistReport::STATUS_PENDING,
        ]);

        $this->actingAs($performer)
            ->post(route('artist.events.report', $event), [
                'message' => 'İkinci rapor denemesi için yeterince uzun metin.',
            ])
            ->assertRedirect(route('artist.events.index'))
            ->assertSessionHas('error');
    }
}
