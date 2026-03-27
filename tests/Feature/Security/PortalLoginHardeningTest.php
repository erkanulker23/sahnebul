<?php

namespace Tests\Feature\Security;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PortalLoginHardeningTest extends TestCase
{
    use RefreshDatabase;

    public function test_artist_cannot_authenticate_via_customer_portal(): void
    {
        $user = User::factory()->artist()->create();

        $this->post('/giris/kullanici', [
            'email' => $user->email,
            'password' => 'password',
        ]);

        $this->assertGuest();
    }

    public function test_customer_cannot_authenticate_via_artist_portal(): void
    {
        $user = User::factory()->create(['role' => 'customer']);

        $this->post('/giris/sanatci', [
            'email' => $user->email,
            'password' => 'password',
        ]);

        $this->assertGuest();
    }

    public function test_admin_cannot_authenticate_via_artist_portal(): void
    {
        $user = User::factory()->admin()->create();

        $this->post('/giris/sanatci', [
            'email' => $user->email,
            'password' => 'password',
        ]);

        $this->assertGuest();
    }

    public function test_admin_authenticates_only_via_management_portal(): void
    {
        $user = User::factory()->admin()->create();

        $this->post('/giris/yonetim', [
            'email' => $user->email,
            'password' => 'password',
        ]);

        $this->assertAuthenticated();
        $this->assertSame($user->id, auth()->id());
    }

    public function test_venue_owner_cannot_use_artist_portal(): void
    {
        $user = User::factory()->venueOwner()->create();

        $this->post('/giris/sanatci', [
            'email' => $user->email,
            'password' => 'password',
        ]);

        $this->assertGuest();
    }

    public function test_venue_owner_can_use_mekan_portal(): void
    {
        $user = User::factory()->venueOwner()->create();

        $this->post('/giris/mekan', [
            'email' => $user->email,
            'password' => 'password',
        ]);

        $this->assertAuthenticated();
    }
}
