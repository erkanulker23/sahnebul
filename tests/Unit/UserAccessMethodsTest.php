<?php

namespace Tests\Unit;

use App\Models\Category;
use App\Models\City;
use App\Models\User;
use App\Models\Venue;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserAccessMethodsTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_cannot_access_stage_panel_even_with_pending_venue_name(): void
    {
        $user = User::factory()->admin()->create([
            'pending_venue_name' => 'Bekleyen mekân',
        ]);

        $this->assertFalse($user->canAccessStagePanel());
    }

    public function test_super_admin_cannot_access_stage_panel_even_when_owning_venue(): void
    {
        $category = Category::query()->create(['name' => 'Bar', 'slug' => 'bar-'.uniqid(), 'order' => 1]);
        $city = City::query()->create(['name' => 'İstanbul', 'slug' => 'ist-'.uniqid()]);
        $user = User::factory()->superAdmin()->create();

        Venue::query()->create([
            'user_id' => $user->id,
            'category_id' => $category->id,
            'city_id' => $city->id,
            'name' => 'Test Mekân',
            'slug' => 'test-mekan-'.uniqid(),
            'address' => 'Adres',
            'status' => 'approved',
        ]);

        $this->assertFalse($user->fresh()->canAccessStagePanel());
    }

    public function test_venue_owner_can_access_stage_panel(): void
    {
        $user = User::factory()->venueOwner()->create();

        $this->assertTrue($user->canAccessStagePanel());
    }

    public function test_customer_without_venues_or_membership_cannot_access_stage_panel(): void
    {
        $user = User::factory()->create(['role' => 'customer', 'pending_venue_name' => null]);

        $this->assertFalse($user->canAccessStagePanel());
    }
}
