<?php

namespace Tests\Feature\Security;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PanelAccessTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_access_admin_panel(): void
    {
        $this->get('/admin')->assertRedirect(route('login', absolute: false));
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

    public function test_guest_cannot_access_artist_panel(): void
    {
        $this->get('/sahne')->assertRedirect(route('login', absolute: false));
    }

    public function test_artist_without_gold_is_redirected_from_sahne_panel(): void
    {
        $user = User::factory()->artist()->create();

        $this->actingAs($user)->get('/sahne')->assertRedirect(route('subscriptions.index', absolute: false));
    }
}
