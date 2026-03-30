<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\City;
use App\Models\User;
use App\Models\Venue;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FavoriteVenueToggleTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_user_can_toggle_venue_follow(): void
    {
        $category = Category::query()->create(['name' => 'Bar', 'slug' => 'bar-'.uniqid(), 'order' => 1]);
        $city = City::query()->create(['name' => 'İzmir', 'slug' => 'izm-'.uniqid()]);
        $owner = User::factory()->create(['role' => 'customer']);
        $venue = Venue::query()->create([
            'user_id' => $owner->id,
            'category_id' => $category->id,
            'city_id' => $city->id,
            'name' => 'Takip Test Mekanı',
            'slug' => 'takip-test-'.uniqid(),
            'address' => 'Sokak 1',
            'status' => 'approved',
            'is_active' => true,
        ]);

        $fan = User::factory()->create(['role' => 'customer']);

        $this->actingAs($fan)
            ->post(route('user.favorites.venues.toggle', $venue->id))
            ->assertRedirect();

        $this->assertTrue($fan->followedVenues()->whereKey($venue->id)->exists());

        $this->actingAs($fan)
            ->post(route('user.favorites.venues.toggle', $venue->id))
            ->assertRedirect();

        $this->assertFalse($fan->fresh()->followedVenues()->whereKey($venue->id)->exists());
    }

    public function test_admin_cannot_toggle_venue_follow(): void
    {
        $category = Category::query()->create(['name' => 'Bar', 'slug' => 'bar-'.uniqid(), 'order' => 1]);
        $city = City::query()->create(['name' => 'Ankara', 'slug' => 'ank-'.uniqid()]);
        $owner = User::factory()->create(['role' => 'customer']);
        $venue = Venue::query()->create([
            'user_id' => $owner->id,
            'category_id' => $category->id,
            'city_id' => $city->id,
            'name' => 'Admin Venue',
            'slug' => 'admin-ven-'.uniqid(),
            'address' => 'Adres',
            'status' => 'approved',
            'is_active' => true,
        ]);

        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin)
            ->post(route('user.favorites.venues.toggle', $venue->id))
            ->assertForbidden();
    }
}
