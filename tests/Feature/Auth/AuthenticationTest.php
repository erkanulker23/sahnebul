<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthenticationTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_screen_can_be_rendered(): void
    {
        $this->get('/login')->assertRedirect('/giris/kullanici');
        $response = $this->get('/giris/kullanici');

        $response->assertOk();
    }

    public function test_artist_login_portal_screen_can_be_rendered(): void
    {
        $this->get('/giris/sanatci')->assertOk();
    }

    public function test_users_can_authenticate_using_the_login_screen(): void
    {
        $user = User::factory()->create(['role' => 'customer']);

        $response = $this->post('/giris/kullanici', [
            'email' => $user->email,
            'password' => 'password',
        ]);

        $this->assertAuthenticated();
        $response->assertRedirect(route('dashboard', absolute: false));
    }

    public function test_users_can_not_authenticate_with_invalid_password(): void
    {
        $user = User::factory()->create(['role' => 'customer']);

        $this->post('/giris/kullanici', [
            'email' => $user->email,
            'password' => 'wrong-password',
        ]);

        $this->assertGuest();
    }

    public function test_users_can_logout(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->post('/logout');

        $this->assertGuest();
        $response->assertRedirect('/');
    }

    public function test_management_firm_can_authenticate_via_management_portal(): void
    {
        $user = User::factory()->create([
            'role' => 'manager_organization',
            'organization_display_name' => 'Test Ajans',
        ]);

        $response = $this->post('/giris/management', [
            'email' => $user->email,
            'password' => 'password',
        ]);

        $this->assertAuthenticated();
        $response->assertRedirect(route('artist.dashboard', absolute: false));
    }

    public function test_customer_cannot_use_management_login_portal(): void
    {
        $user = User::factory()->create(['role' => 'customer']);

        $this->post('/giris/management', [
            'email' => $user->email,
            'password' => 'password',
        ]);

        $this->assertGuest();
    }
}
