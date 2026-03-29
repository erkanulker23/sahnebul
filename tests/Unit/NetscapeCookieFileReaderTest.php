<?php

namespace Tests\Unit;

use App\Support\NetscapeCookieFileReader;
use PHPUnit\Framework\TestCase;

class NetscapeCookieFileReaderTest extends TestCase
{
    public function test_parses_netscape_line_for_bubilet(): void
    {
        $path = sys_get_temp_dir().'/sahnebul-netscape-test-'.uniqid('', true).'.txt';
        $content = "# comment\n"
            .".bubilet.com.tr\tTRUE\t/\tFALSE\t9999999999\tcf_clearance\ttest-value-abc\n"
            ."other.example\tTRUE\t/\tFALSE\t9999999999\tx\tignore-me\n";

        file_put_contents($path, $content);

        $pairs = NetscapeCookieFileReader::bubiletPairsFromNetscapeFile($path);
        unlink($path);

        $this->assertSame(['cf_clearance' => 'test-value-abc'], $pairs);
    }

    public function test_semicolon_string_parsed_and_merged_into_header(): void
    {
        $pairs = NetscapeCookieFileReader::pairsFromSemicolonString(' a=1 ; b=two ');
        $this->assertSame(['a' => '1', 'b' => 'two'], $pairs);

        $header = NetscapeCookieFileReader::cookieHeaderFromPairs($pairs);
        $this->assertSame('a=1; b=two', $header);
    }

    public function test_expired_cookie_skipped(): void
    {
        $path = sys_get_temp_dir().'/sahnebul-netscape-exp-'.uniqid('', true).'.txt';
        file_put_contents($path, ".bubilet.com.tr\tTRUE\t/\tFALSE\t100\told\tgone\n");

        $pairs = NetscapeCookieFileReader::bubiletPairsFromNetscapeFile($path);
        unlink($path);

        $this->assertSame([], $pairs);
    }
}
