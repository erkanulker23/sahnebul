<?php

namespace Tests\Feature\Admin;

use App\Models\User;
use App\Support\BubiletCrawlerCookiesPath;
use App\Support\NetscapeCookieFileReader;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

class BubiletCrawlCookiesTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        $path = BubiletCrawlerCookiesPath::uploadedAbsolutePath();
        if (is_file($path)) {
            @unlink($path);
        }
        parent::tearDown();
    }

    public function test_admin_can_open_bubilet_cookies_page(): void
    {
        $user = User::factory()->admin()->create();

        $this->actingAs($user)->get(route('admin.external-events.bubilet-cookies.index'))->assertOk();
    }

    public function test_admin_can_upload_netscape_with_bubilet_domain(): void
    {
        $user = User::factory()->admin()->create();

        $content = <<<'COOK'
# Netscape HTTP Cookie File
.bubilet.com.tr	TRUE	/	FALSE	1999999999	cf_clearance	test_clearance_value
COOK;
        $file = UploadedFile::fake()->createWithContent('cookies.txt', $content);

        $this->actingAs($user)
            ->post(route('admin.external-events.bubilet-cookies.store'), [
                'cookies_file' => $file,
            ])
            ->assertRedirect();

        $abs = BubiletCrawlerCookiesPath::uploadedAbsolutePath();
        $this->assertFileExists($abs);
        $pairs = NetscapeCookieFileReader::bubiletPairsFromNetscapeFile($abs);
        $this->assertArrayHasKey('cf_clearance', $pairs);
    }

    public function test_rejects_without_bubilet_domain_in_snippet(): void
    {
        $user = User::factory()->admin()->create();

        $file = UploadedFile::fake()->createWithContent('cookies.txt', "# ok\n.example.com\tTRUE\t/\tFALSE\t9\ta\tb\n");

        $this->actingAs($user)
            ->post(route('admin.external-events.bubilet-cookies.store'), [
                'cookies_file' => $file,
            ])
            ->assertRedirect()
            ->assertSessionHas('error');

        $this->assertFileDoesNotExist(BubiletCrawlerCookiesPath::uploadedAbsolutePath());
    }
}
