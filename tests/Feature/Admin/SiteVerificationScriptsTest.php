<?php

namespace Tests\Feature\Admin;

use App\Models\AppSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SiteVerificationScriptsTest extends TestCase
{
    use RefreshDatabase;

    public function test_super_admin_pasting_full_yandex_meta_stores_only_content_token(): void
    {
        $user = User::factory()->superAdmin()->create();

        $this->actingAs($user)->post(route('admin.verification-scripts.update'), [
            'seo_google_site_verification' => '',
            'seo_yandex_verification' => '<meta name="yandex-verification" content="8a9797528a6428f7" />',
            'seo_bing_verification' => '',
            'custom_head_html' => '',
            'custom_body_html' => '',
        ])->assertRedirect();

        $raw = AppSetting::query()->where('key', 'site')->value('value');
        $this->assertIsString($raw);
        $decoded = json_decode($raw, true);
        $this->assertIsArray($decoded);
        $this->assertSame('8a9797528a6428f7', $decoded['seo']['yandex_verification'] ?? null);
    }

    public function test_plain_token_still_works(): void
    {
        $user = User::factory()->superAdmin()->create();

        $this->actingAs($user)->post(route('admin.verification-scripts.update'), [
            'seo_google_site_verification' => '',
            'seo_yandex_verification' => ' 8a9797528a6428f7 ',
            'seo_bing_verification' => '',
            'custom_head_html' => '',
            'custom_body_html' => '',
        ])->assertRedirect();

        $raw = AppSetting::query()->where('key', 'site')->value('value');
        $decoded = json_decode((string) $raw, true);
        $this->assertSame('8a9797528a6428f7', $decoded['seo']['yandex_verification'] ?? null);
    }
}
