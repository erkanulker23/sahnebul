<?php

namespace Tests\Feature\Admin;

use App\Models\Artist;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ArtistRemoteImageImportTest extends TestCase
{
    use RefreshDatabase;

    private static function minimalJpegBody(): string
    {
        return "\xFF\xD8\xFF\xE0\x00\x10JFIF\x00\x01\x01\x01\x00\x01\x00\x01\x00\x00\xFF\xD9";
    }

    public function test_admin_update_mirrors_remote_avatar_url_to_public_disk(): void
    {
        Storage::fake('public');
        $jpeg = self::minimalJpegBody();
        Http::fake([
            'https://mirror.test/*' => Http::response($jpeg, 200, ['Content-Type' => 'image/jpeg']),
        ]);

        $admin = User::factory()->admin()->create();
        $artist = Artist::query()->create([
            'name' => 'Test Artist',
            'slug' => 'testartist',
            'status' => 'approved',
            'avatar' => null,
        ]);

        $this->actingAs($admin)->put(route('admin.artists.update', $artist), [
            'name' => 'Test Artist',
            'slug' => 'testartist',
            'music_genres' => [],
            'bio' => null,
            'avatar' => 'https://mirror.test/face.jpg',
            'banner_image' => null,
            'website' => null,
            'status' => 'approved',
            'social_links' => [],
            'manager_info' => [],
            'public_contact' => [],
            'spotify_auto_link_disabled' => false,
        ])->assertRedirect();

        $artist->refresh();
        $this->assertNotNull($artist->avatar);
        $this->assertStringStartsWith('artist-avatars/', $artist->avatar);
        $this->assertDoesNotMatchRegularExpression('#^https?://#', (string) $artist->avatar);
        Storage::disk('public')->assertExists($artist->avatar);
    }

    public function test_admin_update_mirrors_remote_banner_url_to_public_disk(): void
    {
        Storage::fake('public');
        $jpeg = self::minimalJpegBody();
        Http::fake([
            'https://banner.example/*' => Http::response($jpeg, 200, ['Content-Type' => 'image/jpeg']),
        ]);

        $admin = User::factory()->admin()->create();
        $artist = Artist::query()->create([
            'name' => 'Banner Artist',
            'slug' => 'bannerartist',
            'status' => 'approved',
            'banner_image' => null,
        ]);

        $this->actingAs($admin)->put(route('admin.artists.update', $artist), [
            'name' => 'Banner Artist',
            'slug' => 'bannerartist',
            'music_genres' => [],
            'bio' => null,
            'avatar' => null,
            'banner_image' => 'https://banner.example/wide.jpg',
            'website' => null,
            'status' => 'approved',
            'social_links' => [],
            'manager_info' => [],
            'public_contact' => [],
            'spotify_auto_link_disabled' => false,
        ])->assertRedirect();

        $artist->refresh();
        $this->assertNotNull($artist->banner_image);
        $this->assertStringStartsWith('artist-banners/', $artist->banner_image);
        Storage::disk('public')->assertExists($artist->banner_image);
    }
}
