<?php

namespace App\Http\Controllers;

use App\Http\Requests\ContactFormRequest;
use App\Mail\ContactFormSubmitted;
use App\Models\ContactMessage;
use App\Services\AppSettingsService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Inertia\Inertia;
use Inertia\Response;

class ContactController extends Controller
{
    public function __construct(
        private readonly AppSettingsService $appSettings,
    ) {}

    public function create(): Response
    {
        return Inertia::render('Contact');
    }

    public function store(ContactFormRequest $request): RedirectResponse
    {
        if ($request->filled('company')) {
            return redirect()
                ->route('contact')
                ->with('success', 'Mesajınız alındı. En kısa sürede size dönüş yapacağız.');
        }

        $validated = $request->validated();

        $message = ContactMessage::query()->create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'] ?? null,
            'subject' => $validated['subject'] ?? null,
            'message' => $validated['message'],
            'ip_address' => $request->ip(),
            'user_agent' => substr((string) $request->userAgent(), 0, 512),
        ]);

        $footer = $this->appSettings->getJsonCached('footer');
        $toEmail = is_array($footer) && isset($footer['contact']['email']) && filter_var($footer['contact']['email'], FILTER_VALIDATE_EMAIL)
            ? $footer['contact']['email']
            : config('mail.from.address');

        if (is_string($toEmail) && $toEmail !== '') {
            try {
                Mail::to($toEmail)->send(new ContactFormSubmitted($message));
            } catch (\Throwable $e) {
                Log::warning('İletişim formu e-postası gönderilemedi', [
                    'contact_message_id' => $message->id,
                    'message' => $e->getMessage(),
                ]);
            }
        }

        return redirect()
            ->route('contact')
            ->with('success', 'Mesajınız alındı. En kısa sürede size dönüş yapacağız.');
    }
}
