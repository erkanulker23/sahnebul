<?php

namespace Tests\Feature\Admin;

use App\Models\Category;
use App\Models\City;
use App\Models\Event;
use App\Models\User;
use App\Models\Venue;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class VenueMergeTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_merges_two_venues_and_keeps_primary(): void
    {
        $admin = User::factory()->create(['role' => 'super_admin']);
        $category = Category::query()->create(['name' => 'Bar', 'slug' => 'bar-'.uniqid(), 'order' => 1]);
        $city = City::query()->create(['name' => 'İstanbul', 'slug' => 'istanbul-'.uniqid()]);

        $keep = Venue::query()->create([
            'user_id' => null,
            'category_id' => $category->id,
            'city_id' => $city->id,
            'name' => 'Ana Mekan',
            'slug' => 'ana-'.uniqid(),
            'address' => 'A',
            'status' => 'approved',
            'view_count' => 10,
        ]);

        $merge = Venue::query()->create([
            'user_id' => null,
            'category_id' => $category->id,
            'city_id' => $city->id,
            'name' => 'Kopya Mekan',
            'slug' => 'kopya-'.uniqid(),
            'address' => 'B',
            'status' => 'approved',
            'view_count' => 5,
        ]);

        $event = Event::query()->create([
            'venue_id' => $merge->id,
            'title' => 'Taşınacak Etkinlik',
            'slug' => 'tasinacak-'.uniqid(),
            'start_date' => now()->addWeek(),
            'status' => 'draft',
            'ticket_acquisition_mode' => 'sahnebul',
            'sahnebul_reservation_enabled' => true,
        ]);

        $this->actingAs($admin)
            ->post(route('admin.venues.merge'), [
                'keep_venue_id' => $keep->id,
                'merge_venue_id' => $merge->id,
            ])
            ->assertRedirect(route('admin.venues.index'));

        $this->assertDatabaseMissing('venues', ['id' => $merge->id]);
        $this->assertDatabaseHas('venues', ['id' => $keep->id]);
        $this->assertSame($keep->id, (int) $event->fresh()->venue_id);
        $this->assertSame(15, (int) $keep->fresh()->view_count);
    }
}
