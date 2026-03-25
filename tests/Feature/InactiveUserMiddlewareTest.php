<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InactiveUserMiddlewareTest extends TestCase
{
    use RefreshDatabase;

    public function test_inactive_user_cannot_login_via_credentials(): void
    {
        $user = User::factory()->inactive()->create(['role' => 'customer']);

        $this->post('/giris/kullanici', [
            'email' => $user->email,
            'password' => 'password',
        ])->assertSessionHasErrors('email');
    }

    public function test_inactive_user_is_redirected_from_authenticated_routes(): void
    {
        $user = User::factory()->inactive()->create();

        $this->actingAs($user)
            ->get('/dashboard')
            ->assertRedirect(route('login'));
    }

    public function test_active_user_can_access_dashboard(): void
    {
        $user = User::factory()->create([
            'is_active' => true,
        ]);

        $this->actingAs($user)
            ->get('/dashboard')
            ->assertOk();
    }
}
