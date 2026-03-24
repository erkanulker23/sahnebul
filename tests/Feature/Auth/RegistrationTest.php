<?php

namespace Tests\Feature\Auth;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RegistrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_registration_screen_can_be_rendered(): void
    {
        $response = $this->get('/register');

        $response->assertStatus(200);
    }

    public function test_new_users_can_register_as_artist(): void
    {
        $response = $this->post('/register', [
            'name' => 'Test User',
            'email' => 'artist@example.com',
            'password' => 'SecureP@ssw0rd',
            'password_confirmation' => 'SecureP@ssw0rd',
            'membership_type' => 'artist',
        ]);

        $this->assertAuthenticated();
        $response->assertRedirect(route('dashboard', absolute: false));
        $this->assertDatabaseHas('users', [
            'email' => 'artist@example.com',
            'role' => 'artist',
        ]);
    }

    public function test_new_users_can_register_as_venue(): void
    {
        $response = $this->post('/register', [
            'venue_name' => 'Caz Kulübü',
            'name' => 'Ayşe Yılmaz',
            'email' => 'venue@example.com',
            'password' => 'SecureP@ssw0rd',
            'password_confirmation' => 'SecureP@ssw0rd',
            'membership_type' => 'venue',
        ]);

        $this->assertAuthenticated();
        $response->assertRedirect(route('subscriptions.index', ['type' => 'venue'], false));
        $this->assertDatabaseHas('users', [
            'email' => 'venue@example.com',
            'role' => 'customer',
            'pending_venue_name' => 'Caz Kulübü',
            'name' => 'Ayşe Yılmaz',
        ]);
    }
}
