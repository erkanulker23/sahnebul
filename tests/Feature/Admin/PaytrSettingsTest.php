<?php

namespace Tests\Feature\Admin;

use App\Models\User;
use App\Services\PaytrDirectApiService;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class PaytrSettingsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware(ValidateCsrfToken::class);
    }

    private function seedPaytrCredentials(bool $enabled = false): void
    {
        $paytr = app(PaytrDirectApiService::class);
        $paytr->persistSettings([
            'paytr_enabled' => $enabled,
            'paytr_test_mode' => true,
            'paytr_merchant_id' => '123456',
        ], 'test-merchant-key-32-chars-minimum-', 'test-merchant-salt-32-chars-minxx');
    }

    public function test_local_token_validation_works_when_paytr_disabled_but_credentials_set(): void
    {
        $this->seedPaytrCredentials(false);
        $superAdmin = User::factory()->superAdmin()->create();

        $response = $this->actingAs($superAdmin)
            ->post(route('admin.paytr.validate-local'));
        $response->assertStatus(302);
        $response->assertSessionHas('success');
    }

    public function test_env_import_forbidden_when_flag_off(): void
    {
        Config::set('paytr.allow_env_credential_import', false);
        Config::set('paytr.env.merchant_id', '1');
        Config::set('paytr.env.merchant_key', 'k');
        Config::set('paytr.env.merchant_salt', 's');

        $superAdmin = User::factory()->superAdmin()->create();

        $this->actingAs($superAdmin)
            ->post(route('admin.paytr.import-env'))
            ->assertSessionHas('error');
    }

    public function test_env_import_succeeds_when_flag_on_and_env_complete(): void
    {
        Config::set('paytr.allow_env_credential_import', true);
        Config::set('paytr.env.merchant_id', '999888');
        Config::set('paytr.env.merchant_key', 'my-test-merchant-key-value-here');
        Config::set('paytr.env.merchant_salt', 'my-test-merchant-salt-value-here');

        $superAdmin = User::factory()->superAdmin()->create();

        $this->actingAs($superAdmin)
            ->post(route('admin.paytr.import-env'))
            ->assertSessionHas('success');

        $c = app(PaytrDirectApiService::class)->configuration();
        $this->assertSame('999888', $c['merchant_id']);
        $this->assertTrue($c['merchant_key_set']);
        $this->assertTrue($c['merchant_salt_set']);
    }

    public function test_probe_posts_to_paytr_and_fails_closed_when_http_returns_non_success(): void
    {
        $this->seedPaytrCredentials(false);

        Http::fake([
            'https://www.paytr.com/odeme' => Http::response('{"status":"failed","msg":"Yetkisiz"}', 200),
        ]);

        $superAdmin = User::factory()->superAdmin()->create();

        $this->actingAs($superAdmin)
            ->post(route('admin.paytr.probe'))
            ->assertSessionHas('error');
    }
}
