<?php

namespace Tests\Unit;

use App\Support\TurkishPhone;
use PHPUnit\Framework\TestCase;

class TurkishPhoneTest extends TestCase
{
    public function test_normalizes_mobile_with_leading_zero(): void
    {
        $this->assertSame('0532 123 45 67', TurkishPhone::normalize('05321234567'));
        $this->assertSame('0532 123 45 67', TurkishPhone::normalize('532 123 45 67'));
    }

    public function test_normalizes_plus_ninety_prefix(): void
    {
        $this->assertSame('0532 123 45 67', TurkishPhone::normalize('+90 532 123 45 67'));
        $this->assertSame('0532 123 45 67', TurkishPhone::normalize('905321234567'));
    }

    public function test_rejects_invalid_numbers(): void
    {
        $this->assertNull(TurkishPhone::normalize('abc'));
        $this->assertNull(TurkishPhone::normalize('123'));
        $this->assertNull(TurkishPhone::normalize(''));
    }

    public function test_whatsapp_url_passthrough(): void
    {
        $u = 'https://wa.me/905321234567';
        $this->assertSame($u, TurkishPhone::normalizeWhatsAppField($u));
    }
}
