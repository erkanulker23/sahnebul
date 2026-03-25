<?php

namespace Tests\Feature;

use App\Models\Artist;
use App\Models\Category;
use App\Models\City;
use App\Models\Event;
use App\Models\User;
use App\Models\Venue;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class DailyUniqueEntityViewTest extends TestCase
{
    use RefreshDatabase;

    public function test_venue_view_count_increments_once_per_guest_fingerprint_per_day(): void
    {
        Cache::flush();
        $category = Category::query()->create(['name' => 'Bar', 'slug' => 'bar-'.uniqid(), 'order' => 1]);
        $city = City::query()->create(['name' => 'İstanbul', 'slug' => 'istanbul-'.uniqid()]);
        $owner = User::factory()->create(['role' => 'customer']);
        $venue = Venue::query()->create([
            'user_id' => $owner->id,
            'category_id' => $category->id,
            'city_id' => $city->id,
            'name' => 'Görüntüleme Testi',
            'slug' => 'goruntuleme-testi-'.uniqid(),
            'address' => 'Adres',
            'status' => 'approved',
            'view_count' => 0,
        ]);

        $this->get(route('venues.show', $venue->slug))->assertOk();
        $this->assertSame(1, (int) $venue->fresh()->view_count);

        $this->get(route('venues.show', $venue->slug))->assertOk();
        $this->assertSame(1, (int) $venue->fresh()->view_count);
    }

    public function test_artist_view_count_increments_once_per_authenticated_user_per_day(): void
    {
        Cache::flush();
        $user = User::factory()->create();
        $artist = Artist::query()->create([
            'user_id' => null,
            'name' => 'Test Sanatçı',
            'slug' => 'test-sanatci-'.uniqid(),
            'bio' => 'Bio',
            'status' => 'approved',
            'country_code' => 'TR',
            'view_count' => 0,
        ]);

        $this->actingAs($user)->get(route('artists.show', $artist->slug))->assertOk();
        $this->assertSame(1, (int) $artist->fresh()->view_count);

        $this->actingAs($user)->get(route('artists.show', $artist->slug))->assertOk();
        $this->assertSame(1, (int) $artist->fresh()->view_count);

        $other = User::factory()->create();
        $this->actingAs($other)->get(route('artists.show', $artist->slug))->assertOk();
        $this->assertSame(2, (int) $artist->fresh()->view_count);
    }

    public function test_event_view_count_increments_once_per_guest_fingerprint_per_day(): void
    {
        Cache::flush();
        $category = Category::query()->create(['name' => 'Bar', 'slug' => 'bar-'.uniqid(), 'order' => 1]);
        $city = City::query()->create(['name' => 'İstanbul', 'slug' => 'istanbul-'.uniqid()]);
        $owner = User::factory()->create(['role' => 'customer']);
        $venue = Venue::query()->create([
            'user_id' => $owner->id,
            'category_id' => $category->id,
            'city_id' => $city->id,
            'name' => 'Sahne',
            'slug' => 'sahne-'.uniqid(),
            'address' => 'Adres',
            'status' => 'approved',
        ]);
        $event = Event::query()->create([
            'venue_id' => $venue->id,
            'title' => 'Konser',
            'slug' => 'konser-'.uniqid(),
            'start_date' => now()->addWeek(),
            'end_date' => now()->addWeek()->addHours(2),
            'status' => 'published',
            'ticket_acquisition_mode' => 'sahnebul',
            'sahnebul_reservation_enabled' => true,
            'view_count' => 0,
        ]);

        $segment = $event->publicUrlSegment();

        $this->get(route('events.show', ['event' => $segment]))->assertOk();
        $this->assertSame(1, (int) $event->fresh()->view_count);

        $this->get(route('events.show', ['event' => $segment]))->assertOk();
        $this->assertSame(1, (int) $event->fresh()->view_count);
    }
}
