<?php

namespace Tests\Feature\Contact;

use App\Mail\ContactFormSubmitted;
use App\Mail\SahnebulTemplateMail;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class ContactFormMailTest extends TestCase
{
    use RefreshDatabase;

    public function test_contact_form_accepts_valid_submission(): void
    {
        Mail::fake();

        User::factory()->create([
            'role' => 'super_admin',
            'email' => 'admin-notify@example.com',
            'is_active' => true,
        ]);

        $response = $this->from('/iletisim')->post('/iletisim', [
            'name' => 'Deneme Kullanıcı',
            'email' => 'deneme@example.com',
            'phone' => null,
            'subject' => 'Test',
            'message' => 'Kısa bir mesaj.',
            'consent' => '1',
        ]);

        $response->assertRedirect(route('contact', absolute: false));
        $this->assertDatabaseHas('contact_messages', [
            'email' => 'deneme@example.com',
            'name' => 'Deneme Kullanıcı',
        ]);
        Mail::assertQueued(ContactFormSubmitted::class);
        Mail::assertSent(SahnebulTemplateMail::class, function (SahnebulTemplateMail $mail): bool {
            return str_contains($mail->emailSubject, 'İletişim formu');
        });
    }
}
