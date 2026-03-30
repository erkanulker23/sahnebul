<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\City;
use App\Models\Event;
use App\Models\User;
use App\Models\Venue;
use App\Support\EventPromoVenueProfileModeration;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class VenueEventPromoOnProfileTest extends TestCase
{
    use RefreshDatabase;

    public function test_venue_show_lists_promo_section_per_published_event_with_toggles(): void
    {
        if (! Schema::hasColumn('events', 'promo_show_on_venue_profile_posts')) {
            $this->markTestSkipped('promo_show_on_venue_profile columns missing');
        }

        $category = Category::query()->create(['name' => 'Bar', 'slug' => 'bar-'.uniqid(), 'order' => 1]);
        $city = City::query()->create(['name' => 'İstanbul', 'slug' => 'ist-'.uniqid()]);
        $owner = User::factory()->create(['role' => 'customer']);
        $venue = Venue::query()->create([
            'user_id' => $owner->id,
            'category_id' => $category->id,
            'city_id' => $city->id,
            'name' => 'Test Sahne',
            'slug' => 'test-sahne-'.uniqid(),
            'address' => 'Adres',
            'status' => 'approved',
            'is_active' => true,
        ]);

        $base = [
            'venue_id' => $venue->id,
            'status' => 'published',
            'ticket_acquisition_mode' => 'sahnebul',
            'sahnebul_reservation_enabled' => false,
            'start_date' => now()->addDay(),
            'end_date' => now()->addDay()->addHours(3),
            'promo_show_on_venue_profile_posts' => true,
            'promo_show_on_venue_profile_videos' => true,
            'promo_venue_profile_moderation' => EventPromoVenueProfileModeration::APPROVED,
            'promo_gallery' => [
                [
                    'embed_url' => null,
                    'video_path' => null,
                    'poster_path' => 'event-promo-posters/unit-test.jpg',
                    'promo_kind' => 'post',
                ],
            ],
        ];

        Event::query()->create(array_merge($base, [
            'title' => 'Konser A',
            'slug' => 'konser-a-'.uniqid(),
            'start_date' => now()->addDay(),
            'end_date' => now()->addDay()->addHours(3),
        ]));
        Event::query()->create(array_merge($base, [
            'title' => 'Konser B',
            'slug' => 'konser-b-'.uniqid(),
            'start_date' => now()->addDays(2),
            'end_date' => now()->addDays(2)->addHours(3),
        ]));

        $response = $this->get(route('venues.show', $venue->slug));
        $response->assertOk();
        $response->assertInertia(function ($page): void {
            $page->component('Venues/Show');
            $sections = $page->toArray()['props']['venueEventPromoSections'] ?? [];
            $this->assertCount(2, $sections);
            $titles = array_column($sections, 'title');
            sort($titles);
            $this->assertSame(['Konser A', 'Konser B'], $titles);
        });
    }

    public function test_promo_eligible_when_only_end_date_set(): void
    {
        if (! Schema::hasColumn('events', 'promo_show_on_venue_profile_posts')) {
            $this->markTestSkipped('promo_show_on_venue_profile columns missing');
        }

        $category = Category::query()->create(['name' => 'Bar', 'slug' => 'bar-'.uniqid(), 'order' => 1]);
        $city = City::query()->create(['name' => 'İstanbul', 'slug' => 'ist-'.uniqid()]);
        $owner = User::factory()->create(['role' => 'customer']);
        $venue = Venue::query()->create([
            'user_id' => $owner->id,
            'category_id' => $category->id,
            'city_id' => $city->id,
            'name' => 'Mekân',
            'slug' => 'mekan-'.uniqid(),
            'address' => 'Adres',
            'status' => 'approved',
            'is_active' => true,
        ]);

        $event = Event::query()->create([
            'venue_id' => $venue->id,
            'title' => 'Sadece bitiş',
            'slug' => 'sadece-bitis-'.uniqid(),
            'start_date' => null,
            'end_date' => now()->addDays(2),
            'status' => 'published',
            'ticket_acquisition_mode' => 'sahnebul',
            'sahnebul_reservation_enabled' => false,
            'promo_show_on_venue_profile_posts' => true,
            'promo_show_on_venue_profile_videos' => false,
            'promo_venue_profile_moderation' => EventPromoVenueProfileModeration::APPROVED,
            'promo_gallery' => [
                [
                    'embed_url' => null,
                    'video_path' => null,
                    'poster_path' => 'event-promo-posters/x.jpg',
                    'promo_kind' => 'post',
                ],
            ],
        ]);

        $this->assertTrue($event->isPromoEligibleForVenueProfilePage());
    }
}
