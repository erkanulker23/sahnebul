<?php

namespace Tests\Feature\Auth;

use App\Mail\SahnebulTemplateMail;
use App\Models\User;
use App\Support\RegistrationWelcomeMessages;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class RegistrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_registration_screen_can_be_rendered(): void
    {
        $response = $this->get('/register');

        $response->assertStatus(200);
    }

    public function test_customer_registration_screen_can_be_rendered(): void
    {
        $response = $this->get('/kayit/kullanici');

        $response->assertStatus(200);
    }

    public function test_new_customer_can_register(): void
    {
        $response = $this->post('/kayit/kullanici', [
            'name' => 'Test Customer',
            'email' => 'customer@example.com',
            'password' => 'SecureP@ssw0rd',
            'password_confirmation' => 'SecureP@ssw0rd',
        ]);

        $this->assertAuthenticated();
        $response->assertRedirect(route('dashboard', absolute: false));
        $response->assertSessionHas('success', RegistrationWelcomeMessages::CUSTOMER);
        $this->assertDatabaseHas('users', [
            'email' => 'customer@example.com',
            'role' => 'customer',
            'pending_venue_name' => null,
        ]);
    }

    public function test_new_users_can_register_as_artist(): void
    {
        Mail::fake();

        User::factory()->create([
            'role' => 'super_admin',
            'email' => 'admin-stage-notify@example.com',
            'is_active' => true,
        ]);

        $response = $this->post('/register', [
            'name' => 'Test User',
            'email' => 'artist@example.com',
            'password' => 'SecureP@ssw0rd',
            'password_confirmation' => 'SecureP@ssw0rd',
            'membership_type' => 'artist',
        ]);

        $this->assertAuthenticated();
        $response->assertRedirect(route('dashboard', absolute: false));
        $response->assertSessionHas('success', RegistrationWelcomeMessages::STAGE_ARTIST);
        $this->assertDatabaseHas('users', [
            'email' => 'artist@example.com',
            'role' => 'artist',
        ]);

        Mail::assertSent(SahnebulTemplateMail::class, function (SahnebulTemplateMail $mail): bool {
            return str_contains($mail->emailSubject, 'Yeni sahne üyeliği')
                && str_contains($mail->emailSubject, 'Sanatçı');
        });
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
        $response->assertRedirect(route('artist.venues.create', absolute: false));
        $response->assertSessionHas('success', RegistrationWelcomeMessages::STAGE_VENUE);
        $this->assertDatabaseHas('users', [
            'email' => 'venue@example.com',
            'role' => 'venue_owner',
            'pending_venue_name' => 'Caz Kulübü',
            'name' => 'Ayşe Yılmaz',
        ]);
    }
}
