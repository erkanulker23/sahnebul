<?php

namespace Tests\Feature\Admin;

use App\Models\User;
use App\Support\InstagramYtdlpCookiesPath;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

class InstagramPromoCookiesTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        $path = InstagramYtdlpCookiesPath::uploadedAbsolutePath();
        if (is_file($path)) {
            @unlink($path);
        }
        parent::tearDown();
    }

    public function test_super_admin_can_open_cookies_page(): void
    {
        $user = User::factory()->create(['role' => 'super_admin']);

        $this->actingAs($user)->get(route('admin.instagram-promo-cookies.index'))->assertOk();
    }

    public function test_regular_admin_can_open_cookies_page(): void
    {
        $user = User::factory()->admin()->create();

        $this->actingAs($user)->get(route('admin.instagram-promo-cookies.index'))->assertOk();
    }

    public function test_super_admin_can_upload_valid_netscape_file(): void
    {
        $user = User::factory()->create(['role' => 'super_admin']);

        $content = <<<'COOK'
# Netscape HTTP Cookie File
.instagram.com	TRUE	/	TRUE	1999999999	sessionid	test_session_value
COOK;
        $file = UploadedFile::fake()->createWithContent('cookies.txt', $content);

        $this->actingAs($user)
            ->post(route('admin.instagram-promo-cookies.store'), [
                'cookies_file' => $file,
            ])
            ->assertRedirect();

        $this->assertFileExists(InstagramYtdlpCookiesPath::uploadedAbsolutePath());
        $this->assertNotNull(InstagramYtdlpCookiesPath::resolve());
    }

    public function test_super_admin_can_save_valid_netscape_pasted_text(): void
    {
        $user = User::factory()->create(['role' => 'super_admin']);

        $content = <<<'COOK'
# Netscape HTTP Cookie File
.instagram.com	TRUE	/	TRUE	1999999999	sessionid	test_session_value
COOK;

        $this->actingAs($user)
            ->post(route('admin.instagram-promo-cookies.store'), [
                'cookies_text' => $content,
            ])
            ->assertRedirect();

        $this->assertFileExists(InstagramYtdlpCookiesPath::uploadedAbsolutePath());
        $this->assertNotNull(InstagramYtdlpCookiesPath::resolve());
        $this->assertStringContainsString('sessionid', (string) file_get_contents(InstagramYtdlpCookiesPath::uploadedAbsolutePath()));
    }

    public function test_rejects_file_without_instagram_domain(): void
    {
        $user = User::factory()->create(['role' => 'super_admin']);

        $file = UploadedFile::fake()->createWithContent('cookies.txt', "foo\tbar\n");

        $this->actingAs($user)
            ->post(route('admin.instagram-promo-cookies.store'), [
                'cookies_file' => $file,
            ])
            ->assertRedirect()
            ->assertSessionHas('error');

        $this->assertFileDoesNotExist(InstagramYtdlpCookiesPath::uploadedAbsolutePath());
    }
}
