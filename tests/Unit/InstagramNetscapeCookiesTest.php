<?php

namespace Tests\Unit;

use App\Support\InstagramNetscapeCookies;
use PHPUnit\Framework\TestCase;

class InstagramNetscapeCookiesTest extends TestCase
{
    public function test_builds_cookie_header_from_netscape_tabs(): void
    {
        $tmp = tempnam(sys_get_temp_dir(), 'igc_');
        $this->assertNotFalse($tmp);
        try {
            $content = <<<'COOKIE'
# Netscape HTTP Cookie File
.instagram.com	TRUE	/	TRUE	9999999999	sessionid	abc123
.example.com	TRUE	/	TRUE	9999999999	other	x
COOKIE;
            file_put_contents($tmp, $content);

            $header = InstagramNetscapeCookies::toCookieHeader($tmp);

            $this->assertIsString($header);
            $this->assertStringContainsString('sessionid=abc123', $header);
            $this->assertStringNotContainsString('other=', $header);
        } finally {
            @unlink($tmp);
        }
    }

    public function test_skips_expired_entries(): void
    {
        $tmp = tempnam(sys_get_temp_dir(), 'igc_');
        $this->assertNotFalse($tmp);
        try {
            $past = time() - 3600;
            file_put_contents($tmp, ".instagram.com\tTRUE\t/\tTRUE\t{$past}\told\tgone\n");

            $this->assertNull(InstagramNetscapeCookies::toCookieHeader($tmp));
        } finally {
            @unlink($tmp);
        }
    }
}
