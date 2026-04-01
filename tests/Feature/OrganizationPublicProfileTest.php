<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrganizationPublicProfileTest extends TestCase
{
    use RefreshDatabase;

    public function test_unpublished_organization_profile_returns_404(): void
    {
        $org = User::factory()->create([
            'role' => 'manager_organization',
            'organization_public_slug' => 'gizli-ajans',
            'organization_profile_published' => false,
            'is_active' => true,
        ]);

        $this->get('/organizasyonlar/'.$org->organization_public_slug)->assertNotFound();
    }

    public function test_published_organization_profile_is_visible(): void
    {
        $org = User::factory()->create([
            'role' => 'manager_organization',
            'name' => 'Yetkili',
            'organization_display_name' => 'Görünür Ajans',
            'organization_public_slug' => 'gorunur-ajans',
            'organization_about' => 'Biz konser organizasyonu yaparız.',
            'organization_profile_published' => true,
            'is_active' => true,
        ]);

        $this->get('/organizasyonlar/gorunur-ajans')->assertOk()->assertInertia(fn ($p) => $p
            ->component('Organizations/Show')
            ->has('organization.display_name')
            ->where('organization.display_name', 'Görünür Ajans'));
    }

    public function test_organization_directory_lists_published_only(): void
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

        $this->get('/organizasyonlar')->assertOk()->assertInertia(fn ($p) => $p
            ->component('Organizations/Index')
            ->has('organizations.data', 1));
    }
}
