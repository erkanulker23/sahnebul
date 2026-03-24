<?php

namespace Tests\Feature\Contact;

use App\Mail\ContactFormSubmitted;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class ContactFormMailTest extends TestCase
{
    use RefreshDatabase;

    public function test_contact_form_accepts_valid_submission(): void
    {
        Mail::fake();

        $response = $this->from('/iletisim')->post('/iletisim', [
            'name' => 'Deneme Kullanıcı',
            'email' => 'deneme@example.com',
            'phone' => null,
            'subject' => 'Test',
            'message' => 'Kısa bir mesaj.',
            'consent' => '1',
        ]);

        $response->assertRedirect(route('contact', absolute: false));
        Mail::assertQueued(ContactFormSubmitted::class);
    }
}
