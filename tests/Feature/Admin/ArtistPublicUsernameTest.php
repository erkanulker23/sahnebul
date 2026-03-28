<?php

namespace Tests\Feature\Admin;

use App\Models\Artist;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ArtistPublicUsernameTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_store_creates_compact_unique_slug_from_name_when_omitted(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)->post(route('admin.artists.store'), [
            'name' => 'Ajda Pekkan',
            'music_genres' => [],
            'bio' => null,
            'avatar' => null,
            'website' => null,
            'status' => 'approved',
            'social_links' => [],
            'manager_info' => [],
            'public_contact' => [],
            'spotify_auto_link_disabled' => false,
        ])->assertRedirect();

        $this->assertDatabaseHas('artists', [
            'name' => 'Ajda Pekkan',
            'slug' => 'ajdapekkan',
        ]);
    }

    public function test_admin_username_check_json(): void
    {
        $admin = User::factory()->admin()->create();
        Artist::query()->create([
            'name' => 'Taken',
            'slug' => 'takenuser',
            'status' => 'approved',
        ]);
        $other = Artist::query()->create([
            'name' => 'Self',
            'slug' => 'selfslug',
            'status' => 'approved',
        ]);

        $this->actingAs($admin)
            ->getJson(route('admin.artists.username-check', ['q' => 'newslug']))
            ->assertOk()
            ->assertJsonPath('ok', true);

        $this->actingAs($admin)
            ->getJson(route('admin.artists.username-check', ['q' => 'takenuser']))
            ->assertOk()
            ->assertJsonPath('ok', false)
            ->assertJsonPath('reason', 'taken');

        $this->actingAs($admin)
            ->getJson(route('admin.artists.username-check', [
                'q' => 'selfslug',
                'ignore' => $other->id,
            ]))
            ->assertOk()
            ->assertJsonPath('ok', true);
    }
}
