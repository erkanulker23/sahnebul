<?php

namespace Tests\Feature\Admin;

use App\Models\AppSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SettingsSiteUpdateTest extends TestCase
{
    use RefreshDatabase;

    public function test_super_admin_can_post_site_settings_and_persist(): void
    {
        $user = User::factory()->create(['role' => 'super_admin']);

        $this->actingAs($user)->post('/admin/ayarlar/site', [
            'site_name' => 'Sahnebul Test',
            'seo_default_description' => 'Kısa açıklama',
            'seo_keywords' => 'konser, etkinlik',
            'contact_email' => 'iletisim@example.com',
            'google_maps_api_key' => 'AIza_fake_browser_key_for_test',
        ])->assertRedirect();

        $site = AppSetting::query()->where('key', 'site')->value('value');
        $this->assertIsString($site);
        $this->assertStringContainsString('Sahnebul Test', $site);
        $this->assertStringContainsString('Kısa açıklama', $site);

        $maps = AppSetting::query()->where('key', 'google_maps_browser_key')->value('value');
        $this->assertSame('AIza_fake_browser_key_for_test', $maps);
    }

    public function test_regular_admin_cannot_post_site_settings(): void
    {
        $user = User::factory()->admin()->create();

        $this->actingAs($user)->post('/admin/ayarlar/site', [
            'site_name' => 'Hack',
        ])->assertForbidden();
    }
}
