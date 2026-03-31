<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\City;
use App\Models\Event;
use App\Models\User;
use App\Models\Venue;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SearchTrendingTest extends TestCase
{
    use RefreshDatabase;

    public function test_search_trending_returns_json_events_array(): void
    {
        $category = Category::query()->create(['name' => 'Bar', 'slug' => 'bar-'.uniqid(), 'order' => 1]);
        $city = City::query()->create(['name' => 'İstanbul', 'slug' => 'istanbul-'.uniqid()]);
        $owner = User::factory()->create(['role' => 'customer']);
        $venue = Venue::query()->create([
            'user_id' => $owner->id,
            'category_id' => $category->id,
            'city_id' => $city->id,
            'name' => 'Trend Mekân',
            'slug' => 'trend-mekan-'.uniqid(),
            'address' => 'Adres',
            'status' => 'approved',
        ]);

        Event::query()->create([
            'venue_id' => $venue->id,
            'title' => 'Trend Konser',
            'slug' => 'trend-konser-'.uniqid(),
            'start_date' => now()->addDays(3),
            'end_date' => now()->addDays(3)->addHours(2),
            'status' => 'published',
            'view_count' => 99,
            'ticket_acquisition_mode' => 'sahnebul',
            'sahnebul_reservation_enabled' => true,
        ]);

        $response = $this->getJson('/search/trending?limit=5');

        $response->assertOk();
        $response->assertJsonStructure(['events' => [['id', 'slug', 'title', 'event_type', 'start_date', 'venue_name']]]);
        $this->assertNotEmpty($response->json('events'));
        $this->assertSame('Trend Konser', $response->json('events.0.title'));
    }
}
