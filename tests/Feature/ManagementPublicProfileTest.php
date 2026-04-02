<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ManagementPublicProfileTest extends TestCase
{
    use RefreshDatabase;

    public function test_unpublished_management_profile_returns_404(): void
    {
        $org = User::factory()->create([
            'role' => 'manager_organization',
            'organization_public_slug' => 'gizli-ajans',
            'organization_profile_published' => false,
            'is_active' => true,
        ]);

        $this->get('/management/'.$org->organization_public_slug)->assertNotFound();
    }

    public function test_published_management_profile_is_visible(): void
    {
        User::factory()->create([
            'role' => 'manager_organization',
            'name' => 'Yetkili',
            'organization_display_name' => 'Görünür Ajans',
            'organization_public_slug' => 'gorunur-ajans',
            'organization_about' => 'Biz etkinlik management hizmeti veriyoruz.',
            'organization_profile_published' => true,
            'is_active' => true,
        ]);

        $this->get('/management/gorunur-ajans')->assertOk()->assertInertia(fn ($p) => $p
            ->component('Management/Show')
            ->has('managementProfile.display_name')
            ->where('managementProfile.display_name', 'Görünür Ajans'));
    }

    public function test_management_directory_lists_published_only(): void
    {
        User::factory()->create([
            'role' => 'manager_organization',
            'organization_display_name' => 'Liste A',
            'organization_public_slug' => 'liste-a',
            'organization_profile_published' => true,
            'is_active' => true,
        ]);
        User::factory()->create([
            'role' => 'manager_organization',
            'organization_display_name' => 'Liste B',
            'organization_public_slug' => 'liste-b',
            'organization_profile_published' => false,
            'is_active' => true,
        ]);

        $this->get('/management')->assertOk()->assertInertia(fn ($p) => $p
            ->component('Management/Index')
            ->has('managementAccounts.data', 1));
    }
}
