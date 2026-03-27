<?php

namespace Tests\Feature;

use App\Models\Artist;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrganizationArtistManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_non_manager_cannot_open_organization_artists_page(): void
    {
        $user = User::factory()->create(['role' => 'customer']);

        $this->actingAs($user)->get('/sahne/organizasyon/sanatcilar')->assertForbidden();
    }

    public function test_manager_can_create_pending_artist_under_organization(): void
    {
        $org = User::factory()->create(['role' => 'manager_organization']);

        $this->actingAs($org)
            ->post('/sahne/organizasyon/sanatcilar', [
                'name' => 'Yeni Orkestra',
                'bio' => 'Kısa tanıtım metni.',
            ])
            ->assertRedirect('/sahne/organizasyon/sanatcilar');

        $this->assertDatabaseHas('artists', [
            'name' => 'Yeni Orkestra',
            'status' => 'pending',
            'managed_by_user_id' => $org->id,
        ]);
    }

    public function test_manager_can_attach_unassigned_approved_artist(): void
    {
        $org = User::factory()->create(['role' => 'manager_organization']);
        $artist = Artist::query()->create([
            'name' => 'Serbest Sanatçı',
            'slug' => 'serbest-sanatci-'.uniqid(),
            'status' => 'approved',
            'managed_by_user_id' => null,
        ]);

        $this->actingAs($org)
            ->post('/sahne/organizasyon/sanatcilar/'.$artist->slug.'/kat')
            ->assertRedirect();

        $this->assertSame($org->id, $artist->fresh()->managed_by_user_id);
    }

    public function test_manager_cannot_attach_artist_managed_by_other_org(): void
    {
        $orgA = User::factory()->create(['role' => 'manager_organization']);
        $orgB = User::factory()->create(['role' => 'manager_organization']);
        $artist = Artist::query()->create([
            'name' => 'Bağlı Sanatçı',
            'slug' => 'bagli-sanatci-'.uniqid(),
            'status' => 'approved',
            'managed_by_user_id' => $orgA->id,
        ]);

        $this->actingAs($orgB)
            ->post('/sahne/organizasyon/sanatcilar/'.$artist->slug.'/kat')
            ->assertSessionHas('error');

        $this->assertSame($orgA->id, $artist->fresh()->managed_by_user_id);
    }

    public function test_manager_can_detach_own_artist(): void
    {
        $org = User::factory()->create(['role' => 'manager_organization']);
        $artist = Artist::query()->create([
            'name' => 'Çıkarılacak',
            'slug' => 'cikarilacak-'.uniqid(),
            'status' => 'approved',
            'managed_by_user_id' => $org->id,
        ]);

        $this->actingAs($org)
            ->post('/sahne/organizasyon/sanatcilar/'.$artist->slug.'/birak')
            ->assertRedirect();

        $this->assertNull($artist->fresh()->managed_by_user_id);
    }

    public function test_manager_can_submit_edit_proposal_for_managed_approved_artist(): void
    {
        $org = User::factory()->create(['role' => 'manager_organization']);
        $artist = Artist::query()->create([
            'name' => 'Onaylı Kadro',
            'slug' => 'onayli-kadro-'.uniqid(),
            'status' => 'approved',
            'managed_by_user_id' => $org->id,
        ]);

        $this->actingAs($org)
            ->post('/sahne/organizasyon/sanatcilar/'.$artist->slug.'/duzenme-oneri', [
                'bio' => 'Organizasyon tarafından önerilen güncel biyografi metni.',
                'message' => '',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('public_edit_suggestions', [
            'suggestable_id' => $artist->id,
            'user_id' => $org->id,
            'status' => 'pending',
        ]);
    }

    public function test_manager_cannot_submit_proposal_for_artist_not_on_roster(): void
    {
        $org = User::factory()->create(['role' => 'manager_organization']);
        $other = User::factory()->create(['role' => 'manager_organization']);
        $artist = Artist::query()->create([
            'name' => 'Başka Org',
            'slug' => 'baska-org-'.uniqid(),
            'status' => 'approved',
            'managed_by_user_id' => $other->id,
        ]);

        $this->actingAs($org)
            ->post('/sahne/organizasyon/sanatcilar/'.$artist->slug.'/duzenme-oneri', [
                'bio' => 'Yetkisiz deneme metni burada yeterince uzun olsun.',
            ])
            ->assertForbidden();
    }
}
