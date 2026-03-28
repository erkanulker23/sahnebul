<?php

namespace App\Http\Controllers;

use App\Http\Requests\ContactFormRequest;
use App\Mail\ContactFormSubmitted;
use App\Models\ContactMessage;
use App\Services\AppSettingsService;
use App\Services\SahnebulMail;
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
        // Gizli tuzak alanı — adı "company" olunca tarayıcılar "şirket" olarak otomatik dolduruyor; mesaj sessizce atlanıyordu.
        if ($request->filled('sahnebul_hp')) {
            return redirect()
                ->route('contact')
                ->with('success', 'Mesajınız alındı. En kısa sürede size dönüş yapacağız.');
        }

        $validated = $request->validated();

        $dup = ContactMessage::query()
            ->where('email', $validated['email'])
            ->where('message', $validated['message'])
            ->where('created_at', '>=', now()->subMinutes(15))
            ->exists();
        if ($dup) {
            return redirect()
                ->route('contact')
                ->with('success', 'Mesajınız alındı. En kısa sürede size dönüş yapacağız.');
        }

        $ip = $request->ip();
        $isSpam = self::contactSubmissionLooksLikeSpam(
            $validated['message'],
            $validated['email'],
            $ip
        );

        $message = ContactMessage::query()->create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'] ?? null,
            'subject' => $validated['subject'] ?? null,
            'message' => $validated['message'],
            'ip_address' => $ip,
            'user_agent' => substr((string) $request->userAgent(), 0, 512),
            'is_spam' => $isSpam,
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

        SahnebulMail::contactFormSubmittedNotifyAdmins($message);

        return redirect()
            ->route('contact')
            ->with('success', 'Mesajınız alındı. En kısa sürede size dönüş yapacağız.');
    }

    /**
     * Otomatik spam işareti: çok link, şüpheli anahtar kelime, aynı IP’den kısa sürede çok gönderim.
     */
    private static function contactSubmissionLooksLikeSpam(string $message, string $email, ?string $ip): bool
    {
        $msg = $message."\n".$email;
        $lower = mb_strtolower($msg);

        $urlHits = preg_match_all('#https?://#i', $message);
        if ($urlHits !== false && $urlHits >= 4) {
            return true;
        }

        $needles = [
            'viagra', 'cialis', 'casino', 'seo hizmet', 'click here', 'bitcoin', 'crypto wallet',
            'telegram.me/', 't.me/', 'whatsapp.com/chat', 'buy followers', 'instagram takipçi',
        ];
        foreach ($needles as $n) {
            if (str_contains($lower, $n)) {
                return true;
            }
        }

        if ($ip !== null && $ip !== '') {
            $recentFromIp = ContactMessage::query()
                ->where('ip_address', $ip)
                ->where('created_at', '>=', now()->subHour())
                ->count();
            if ($recentFromIp >= 5) {
                return true;
            }
        }

        return false;
    }
}
