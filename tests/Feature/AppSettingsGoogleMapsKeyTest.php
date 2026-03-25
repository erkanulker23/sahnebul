<?php

namespace Tests\Feature;

use App\Models\AppSetting;
use App\Services\AppSettingsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AppSettingsGoogleMapsKeyTest extends TestCase
{
    use RefreshDatabase;

    public function test_database_key_takes_precedence_over_env_config(): void
    {
        app(AppSettingsService::class)->forgetCaches();
        config(['services.google.maps_browser_key' => 'from_env']);

        AppSetting::query()->create([
            'key' => 'google_maps_browser_key',
            'value' => 'from_database',
        ]);

        $key = app(AppSettingsService::class)->getGoogleMapsBrowserKey();

        $this->assertSame('from_database', $key);
    }

    public function test_falls_back_to_env_when_database_empty(): void
    {
        app(AppSettingsService::class)->forgetCaches();
        config(['services.google.maps_browser_key' => 'env_only']);

        $key = app(AppSettingsService::class)->getGoogleMapsBrowserKey();

        $this->assertSame('env_only', $key);
    }
}
