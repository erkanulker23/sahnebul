<?php

namespace Tests\Feature\Admin;

use App\Models\Category;
use App\Models\City;
use App\Models\User;
use App\Models\Venue;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class VenuePublicProfileSlugTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_slug_check_json(): void
    {
        $admin = User::factory()->admin()->create();

        $category = Category::query()->create(['name' => 'Bar', 'slug' => 'bar-'.uniqid(), 'order' => 1]);
        $city = City::query()->create(['name' => 'İstanbul', 'slug' => 'ist-'.uniqid()]);
        $owner = User::factory()->create(['role' => 'customer']);
        Venue::query()->create([
            'user_id' => $owner->id,
            'category_id' => $category->id,
            'city_id' => $city->id,
            'name' => 'Dolu Mekan',
            'slug' => 'dolumekan',
            'address' => 'Adres',
            'status' => 'approved',
            'is_active' => true,
        ]);

        $this->actingAs($admin)
            ->getJson(route('admin.venues.public-slug-check', ['q' => 'yeniuygun']))
            ->assertOk()
            ->assertJsonPath('ok', true);

        $this->actingAs($admin)
            ->getJson(route('admin.venues.public-slug-check', ['q' => 'dolumekan']))
            ->assertOk()
            ->assertJsonPath('ok', false)
            ->assertJsonPath('reason', 'taken');

        $this->actingAs($admin)
            ->getJson(route('admin.venues.public-slug-check', [
                'q' => 'dolumekan',
                'ignore' => Venue::query()->where('slug', 'dolumekan')->value('id'),
            ]))
            ->assertOk()
            ->assertJsonPath('ok', true);
    }
}
