<?php

namespace Tests\Feature\Security;

use App\Models\Category;
use App\Models\City;
use App\Models\User;
use App\Models\Venue;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PanelAccessTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_access_admin_panel(): void
    {
        $this->get('/admin')->assertRedirect(route('login.admin', absolute: false));
    }

    public function test_customer_cannot_access_admin_panel(): void
    {
        $user = User::factory()->create(['role' => 'customer']);

        $this->actingAs($user)->get('/admin')->assertForbidden();
    }

    public function test_admin_can_open_admin_dashboard(): void
    {
        $user = User::factory()->admin()->create();

        $this->actingAs($user)->get('/admin')->assertOk();
    }

    public function test_super_admin_can_open_admin_dashboard(): void
    {
        $user = User::factory()->create(['role' => 'super_admin']);

        $this->actingAs($user)->get('/admin')->assertOk();
    }

    public function test_admin_cannot_open_smtp_settings(): void
    {
        $user = User::factory()->admin()->create();

        $this->actingAs($user)->get('/admin/smtp')->assertForbidden();
    }

    public function test_super_admin_can_open_smtp_settings(): void
    {
        $user = User::factory()->create(['role' => 'super_admin']);

        $this->actingAs($user)->get('/admin/smtp')->assertOk();
    }

    public function test_guest_cannot_access_artist_panel(): void
    {
        $this->get('/sahne')->assertRedirect(route('login.sahne', absolute: false));
    }

    public function test_artist_can_open_sahne_panel_without_gold(): void
    {
        $user = User::factory()->artist()->create();

        $this->actingAs($user)->get('/sahne')->assertOk();
    }

    public function test_admin_cannot_open_sahne_panel_even_if_they_own_a_venue(): void
    {
        $category = Category::query()->create(['name' => 'Bar', 'slug' => 'bar-'.uniqid(), 'order' => 1]);
        $city = City::query()->create(['name' => 'İstanbul', 'slug' => 'ist-'.uniqid()]);
        $admin = User::factory()->admin()->create();

        Venue::query()->create([
            'user_id' => $admin->id,
            'category_id' => $category->id,
            'city_id' => $city->id,
            'name' => 'Admin Mekânı',
            'slug' => 'admin-mekan-'.uniqid(),
            'address' => 'Adres',
            'status' => 'approved',
        ]);

        $this->actingAs($admin->fresh())->get('/sahne')->assertForbidden();
    }
}
