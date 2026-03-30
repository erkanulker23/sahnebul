<?php

namespace Tests\Feature;

use App\Models\Artist;
use App\Models\Category;
use App\Models\City;
use App\Models\Event;
use App\Models\User;
use App\Models\Venue;
use App\Notifications\FavoriteArtistNewPublishedEventNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class FavoriteArtistPublishedNotificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_fan_receives_database_notification_when_published_event_includes_favorited_artist(): void
    {
        Notification::fake();
        Mail::fake();

        $category = Category::query()->create(['name' => 'Bar', 'slug' => 'bar-'.uniqid(), 'order' => 1]);
        $city = City::query()->create(['name' => 'İstanbul', 'slug' => 'ist-'.uniqid()]);
        $venueOwner = User::factory()->create(['role' => 'customer']);
        $venue = Venue::query()->create([
            'user_id' => $venueOwner->id,
            'category_id' => $category->id,
            'city_id' => $city->id,
            'name' => 'Sahne',
            'slug' => 'sahne-'.uniqid(),
            'address' => 'Adres',
            'status' => 'approved',
            'is_active' => true,
        ]);

        $performer = User::factory()->artist()->create();
        $artist = Artist::query()->create([
            'user_id' => $performer->id,
            'name' => 'Favori Sanatçı',
            'slug' => 'favori-'.uniqid(),
            'bio' => 'Bio',
            'status' => 'approved',
            'country_code' => 'TR',
        ]);

        $fan = User::factory()->create([
            'role' => 'customer',
            'email_verified_at' => now(),
        ]);
        $fan->favoriteArtists()->attach($artist->id);

        $event = Event::query()->create([
            'venue_id' => $venue->id,
            'title' => 'Yeni Konser',
            'slug' => 'yeni-konser-'.uniqid(),
            'start_date' => now()->addWeek(),
            'end_date' => now()->addWeek()->addHours(3),
            'status' => 'published',
            'ticket_acquisition_mode' => 'sahnebul',
            'sahnebul_reservation_enabled' => false,
        ]);
        $event->syncArtistsByIds([$artist->id]);

        Notification::assertSentTo($fan, FavoriteArtistNewPublishedEventNotification::class);
    }

    public function test_unverified_fan_does_not_receive_database_notification(): void
    {
        Notification::fake();
        Mail::fake();

        $category = Category::query()->create(['name' => 'Bar', 'slug' => 'bar-'.uniqid(), 'order' => 1]);
        $city = City::query()->create(['name' => 'İstanbul', 'slug' => 'ist2-'.uniqid()]);
        $venueOwner = User::factory()->create(['role' => 'customer']);
        $venue = Venue::query()->create([
            'user_id' => $venueOwner->id,
            'category_id' => $category->id,
            'city_id' => $city->id,
            'name' => 'Sahne 2',
            'slug' => 'sahne2-'.uniqid(),
            'address' => 'Adres',
            'status' => 'approved',
            'is_active' => true,
        ]);

        $performer = User::factory()->artist()->create();
        $artist = Artist::query()->create([
            'user_id' => $performer->id,
            'name' => 'Sanatçı 2',
            'slug' => 'sanatci2-'.uniqid(),
            'bio' => 'Bio',
            'status' => 'approved',
            'country_code' => 'TR',
        ]);

        $fan = User::factory()->unverified()->create(['role' => 'customer']);
        $fan->favoriteArtists()->attach($artist->id);

        $event = Event::query()->create([
            'venue_id' => $venue->id,
            'title' => 'Konser 2',
            'slug' => 'konser2-'.uniqid(),
            'start_date' => now()->addWeek(),
            'end_date' => now()->addWeek()->addHours(3),
            'status' => 'published',
            'ticket_acquisition_mode' => 'sahnebul',
            'sahnebul_reservation_enabled' => false,
        ]);
        $event->syncArtistsByIds([$artist->id]);

        Notification::assertNotSentTo($fan, FavoriteArtistNewPublishedEventNotification::class);
    }
}
