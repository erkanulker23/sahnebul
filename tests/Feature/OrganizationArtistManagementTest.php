<?php

namespace Tests\Feature;

use App\Mail\SahnebulTemplateMail;
use App\Models\Artist;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
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

    public function test_trusted_manager_creates_approved_artist_without_pending(): void
    {
        $org = User::factory()->create([
            'role' => 'manager_organization',
            'stage_trusted_publisher' => true,
        ]);

        $this->actingAs($org)
            ->post('/sahne/organizasyon/sanatcilar', [
                'name' => 'Güven Orkestra',
                'bio' => null,
            ])
            ->assertRedirect('/sahne/organizasyon/sanatcilar');

        $this->assertDatabaseHas('artists', [
            'name' => 'Güven Orkestra',
            'status' => 'approved',
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

    public function test_attach_sends_admin_mail_when_admin_exists(): void
    {
        Mail::fake();

        User::factory()->create([
            'role' => 'admin',
            'email' => 'admin-roster@example.com',
            'is_active' => true,
        ]);

        $org = User::factory()->create([
            'role' => 'manager_organization',
            'organization_display_name' => 'Test Ajans A.Ş.',
        ]);
        $artist = Artist::query()->create([
            'name' => 'Mail Sanatçı',
            'slug' => 'mail-sanatci-'.uniqid(),
            'status' => 'approved',
            'managed_by_user_id' => null,
            'country_code' => 'TR',
        ]);

        $this->actingAs($org)
            ->post('/sahne/organizasyon/sanatcilar/'.$artist->slug.'/kat')
            ->assertRedirect();

        Mail::assertSent(SahnebulTemplateMail::class, function (SahnebulTemplateMail $mail): bool {
            return str_contains($mail->emailSubject, 'Organizasyon kadrosuna sanatçı eklendi')
                && str_contains($mail->emailSubject, 'Mail Sanatçı');
        });
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
