<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\AppSettingsService;
use App\Support\RegistrationWelcomeMessages;
use App\Support\SafeRedirect;
use Google\Client as GoogleClient;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Google Identity Services (GIS) — kimlik jetonu sunucuda doğrulanır.
 *
 * @see https://developers.google.com/identity/gsi/web/guides/migration
 */
class GoogleCredentialAuthController extends Controller
{
    public function store(Request $request, AppSettingsService $settings): RedirectResponse
    {
        $request->validate([
            'credential' => 'required|string',
            'redirect' => 'nullable|string|max:2048',
        ]);

        $site = $settings->getSitePublicSettings();
        $gsi = is_array($site['google_sign_in'] ?? null) ? $site['google_sign_in'] : [];
        $enabled = (bool) ($gsi['enabled'] ?? false);
        $clientId = isset($gsi['client_id']) ? trim((string) $gsi['client_id']) : '';

        if (! $enabled || $clientId === '') {
            throw ValidationException::withMessages([
                'credential' => 'Google ile giriş şu an kapalı.',
            ]);
        }

        $client = new GoogleClient(['client_id' => $clientId]);
        $secretEnc = $gsi['client_secret'] ?? null;
        if (is_string($secretEnc) && trim($secretEnc) !== '') {
            try {
                $client->setClientSecret(Crypt::decryptString($secretEnc));
            } catch (\Throwable) {
                // Eski düz metin veya bozuk şifre — kimlik jetonu doğrulaması çoğu durumda yalnızca client_id ile çalışır.
            }
        }
        $payload = $client->verifyIdToken($request->string('credential')->toString());
        if (! is_array($payload)) {
            throw ValidationException::withMessages([
                'credential' => 'Google oturumu doğrulanamadı.',
            ]);
        }

        $googleSub = (string) ($payload['sub'] ?? '');
        $email = isset($payload['email']) ? strtolower(trim((string) $payload['email'])) : '';
        $emailVerified = (bool) ($payload['email_verified'] ?? false);
        $name = isset($payload['name']) ? trim((string) $payload['name']) : '';

        if ($googleSub === '' || $email === '' || ! $emailVerified) {
            throw ValidationException::withMessages([
                'credential' => 'Google hesabından e-posta alınamadı veya doğrulanmamış.',
            ]);
        }

        $user = User::query()->where('google_id', $googleSub)->first();
        if ($user === null) {
            $user = User::query()->whereRaw('LOWER(email) = ?', [$email])->first();
        }

        if ($user !== null) {
            if ($user->isAdmin()) {
                throw ValidationException::withMessages([
                    'credential' => 'Yönetim hesapları Google ile bu sayfadan giriş yapamaz.',
                ]);
            }
            if (! $user->isCustomer()) {
                throw ValidationException::withMessages([
                    'credential' => 'Bu e-posta sanatçı veya mekân hesabı için kayıtlı. Lütfen ilgili giriş sayfasını kullanın.',
                ]);
            }
            if (! $user->is_active) {
                throw ValidationException::withMessages([
                    'credential' => 'Hesabınız devre dışı.',
                ]);
            }

            if ($user->google_id === null || $user->google_id !== $googleSub) {
                $user->forceFill(['google_id' => $googleSub])->save();
            }

            Auth::login($user, true);
            $request->session()->regenerate();
            $user->recordLastLoginAt();

            $intended = SafeRedirect::relativePath($request->input('redirect'));

            return redirect()->to($intended ?? route('dashboard', absolute: false));
        }

        $user = User::create([
            'name' => $name !== '' ? $name : Str::before($email, '@'),
            'email' => $email,
            'password' => Str::random(48),
            'role' => 'customer',
            'google_id' => $googleSub,
            'email_verified_at' => now(),
        ]);

        event(new Registered($user));

        Auth::login($user, true);
        $request->session()->regenerate();
        $user->recordLastLoginAt();

        $intended = SafeRedirect::relativePath($request->input('redirect'));

        return redirect()
            ->to($intended ?? route('dashboard', absolute: false))
            ->with('success', RegistrationWelcomeMessages::GOOGLE_NEW_USER);
    }
}
