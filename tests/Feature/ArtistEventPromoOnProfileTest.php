<?php

namespace Tests\Feature;

use App\Models\Artist;
use App\Models\Category;
use App\Models\City;
use App\Models\Event;
use App\Models\User;
use App\Models\Venue;
use App\Support\EventPromoVenueProfileModeration;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class ArtistEventPromoOnProfileTest extends TestCase
{
    use RefreshDatabase;

    public function test_artist_show_lists_promo_section_when_lineup_linked_and_toggles_on(): void
    {
        if (! Schema::hasColumn('events', 'promo_show_on_artist_profile_posts')) {
            $this->markTestSkipped('promo_show_on_artist_profile columns missing');
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

        $performer = User::factory()->artist()->create();
        $artist = Artist::query()->create([
            'user_id' => $performer->id,
            'name' => 'Profil Sanatçı',
            'slug' => 'profil-sanatci-'.uniqid(),
            'bio' => 'Bio',
            'status' => 'approved',
            'country_code' => 'TR',
        ]);

        $base = [
            'venue_id' => $venue->id,
            'status' => 'published',
            'ticket_acquisition_mode' => 'sahnebul',
            'sahnebul_reservation_enabled' => false,
            'start_date' => now()->addDay(),
            'end_date' => now()->addDay()->addHours(3),
            'promo_show_on_artist_profile_posts' => true,
            'promo_show_on_artist_profile_videos' => true,
            'promo_artist_profile_moderation' => EventPromoVenueProfileModeration::APPROVED,
            'promo_gallery' => [
                [
                    'embed_url' => null,
                    'video_path' => null,
                    'poster_path' => 'event-promo-posters/unit-test-artist.jpg',
                    'promo_kind' => 'post',
                ],
            ],
        ];

        $evA = Event::query()->create(array_merge($base, [
            'title' => 'Konser A',
            'slug' => 'konser-a-'.uniqid(),
            'start_date' => now()->addDay(),
            'end_date' => now()->addDay()->addHours(3),
        ]));
        $evA->artists()->attach($artist->id, ['is_headliner' => true, 'order' => 250]);
        $evB = Event::query()->create(array_merge($base, [
            'title' => 'Konser B',
            'slug' => 'konser-b-'.uniqid(),
            'start_date' => now()->addDays(2),
            'end_date' => now()->addDays(2)->addHours(3),
        ]));
        $evB->artists()->attach($artist->id, ['is_headliner' => false, 'order' => 255]);

        $response = $this->get(route('artists.show', $artist->slug));
        $response->assertOk();
        $response->assertInertia(function ($page): void {
            $page->component('Artists/Show');
            $sections = $page->toArray()['props']['artistEventPromoSections'] ?? [];
            $this->assertCount(2, $sections);
            $titles = array_column($sections, 'title');
            sort($titles);
            $this->assertSame(['Konser A', 'Konser B'], $titles);
        });
    }

    public function test_promo_eligible_for_artist_profile_when_only_end_date_set(): void
    {
        if (! Schema::hasColumn('events', 'promo_show_on_artist_profile_posts')) {
            $this->markTestSkipped('promo_show_on_artist_profile columns missing');
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
            'slug' => 'sadece-bitis-artist-'.uniqid(),
            'start_date' => null,
            'end_date' => now()->addDays(2),
            'status' => 'published',
            'ticket_acquisition_mode' => 'sahnebul',
            'sahnebul_reservation_enabled' => false,
            'promo_show_on_artist_profile_posts' => true,
            'promo_show_on_artist_profile_videos' => false,
            'promo_artist_profile_moderation' => EventPromoVenueProfileModeration::APPROVED,
            'promo_gallery' => [
                [
                    'embed_url' => null,
                    'video_path' => null,
                    'poster_path' => 'event-promo-posters/x-artist.jpg',
                    'promo_kind' => 'post',
                ],
            ],
        ]);

        $this->assertTrue($event->isPromoEligibleForArtistProfilePage());
    }
}
