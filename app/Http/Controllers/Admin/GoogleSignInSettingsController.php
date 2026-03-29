<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Auth\GoogleCredentialAuthController;
use App\Http\Controllers\Controller;
use App\Models\AppSetting;
use App\Services\AppSettingsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Http;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Kullanıcı (müşteri) Google Identity Services — yalnızca süper yönetici.
 * Kayıt: {@see GoogleCredentialAuthController} → role customer.
 */
class GoogleSignInSettingsController extends Controller
{
    public function __construct(
        private readonly AppSettingsService $appSettings,
    ) {}

    public function index(): Response
    {
        $site = $this->appSettings->getSitePublicSettings();
        $gsi = is_array($site['google_sign_in'] ?? null) ? $site['google_sign_in'] : [];
        $googleClientSecretSet = isset($gsi['client_secret']) && is_string($gsi['client_secret']) && trim($gsi['client_secret']) !== '';

        return Inertia::render('Admin/Settings/GoogleSignIn', [
            'google_sign_in_enabled' => (bool) ($gsi['enabled'] ?? false),
            'google_sign_in_client_id' => (string) ($gsi['client_id'] ?? ''),
            'google_sign_in_client_secret_set' => $googleClientSecretSet,
            'customerLoginPath' => route('login', absolute: false),
            'customerRegisterPath' => route('register.kullanici', absolute: false),
        ]);
    }

    public function update(Request $request)
    {
        $validated = $request->validate([
            'google_sign_in_enabled' => 'sometimes|boolean',
            'google_sign_in_client_id' => 'nullable|string|max:512',
            'google_sign_in_client_secret' => 'nullable|string|max:500',
            'remove_google_sign_in_client_secret' => 'sometimes|boolean',
        ]);

        $current = $this->appSettings->getSitePublicSettings();
        $currentGsi = is_array($current['google_sign_in'] ?? null) ? $current['google_sign_in'] : [];
        $clientSecretStored = isset($currentGsi['client_secret']) && is_string($currentGsi['client_secret'])
            ? trim($currentGsi['client_secret'])
            : '';

        /** @var array<string, mixed> $defaults */
        $defaults = config('sahnebul.default_site_public', []);
        $defaults = is_array($defaults) ? $defaults : [];
        $fromDb = $this->appSettings->getJsonCached('site');
        $fromDb = is_array($fromDb) && $fromDb !== [] ? array_replace_recursive($defaults, $fromDb) : $defaults;

        $fromDb['google_sign_in'] = SettingsController::buildGoogleSignInForStorage(
            $request,
            $validated,
            $clientSecretStored,
        );

        AppSetting::updateOrCreate(
            ['key' => 'site'],
            ['value' => json_encode($fromDb, JSON_UNESCAPED_UNICODE)]
        );

        $this->appSettings->forgetCaches();

        return redirect()->route('admin.google-sign-in.index')->with('success', 'Google ile kullanıcı girişi ayarları kaydedildi.');
    }

    public function test(): JsonResponse
    {
        $site = $this->appSettings->getSitePublicSettings();
        $gsi = is_array($site['google_sign_in'] ?? null) ? $site['google_sign_in'] : [];
        $enabled = (bool) ($gsi['enabled'] ?? false);
        $clientId = isset($gsi['client_id']) ? trim((string) $gsi['client_id']) : '';

        $checks = [];

        if (! $enabled) {
            return response()->json([
                'ok' => false,
                'message' => 'Google ile giriş kapalı. Önce etkinleştirip kaydedin, ardından test edin.',
                'checks' => [],
            ]);
        }

        if ($clientId === '') {
            return response()->json([
                'ok' => false,
                'message' => 'Client ID boş.',
                'checks' => [],
            ]);
        }

        if (! preg_match('/\.apps\.googleusercontent\.com$/', $clientId)) {
            return response()->json([
                'ok' => false,
                'message' => 'Client ID genelde …apps.googleusercontent.com ile biter. Google Cloud Console’daki Web istemci kimliğini kontrol edin.',
                'checks' => [],
            ]);
        }

        $checks[] = 'Client ID biçimi uygun görünüyor.';

        try {
            $wellKnown = Http::timeout(8)->get('https://accounts.google.com/.well-known/openid-configuration');
            if (! $wellKnown->successful()) {
                return response()->json([
                    'ok' => false,
                    'message' => 'Google açık kimlik yapılandırması alınamadı (HTTP '.$wellKnown->status().').',
                    'checks' => $checks,
                ]);
            }
        } catch (\Throwable $e) {
            return response()->json([
                'ok' => false,
                'message' => 'Ağ hatası: '.$e->getMessage(),
                'checks' => $checks,
            ]);
        }

        $checks[] = 'Google OAuth/OpenID uç noktalarına erişim başarılı.';

        $secretPlain = null;
        $secretEnc = $gsi['client_secret'] ?? null;
        if (is_string($secretEnc) && trim($secretEnc) !== '') {
            try {
                $secretPlain = Crypt::decryptString(trim($secretEnc));
            } catch (\Throwable) {
                $checks[] = 'Uyarı: Kayıtlı istemci sırrı çözümlenemedi; yeni sıra girerek kaydedin.';
            }
        }

        if (is_string($secretPlain) && $secretPlain !== '') {
            $redirectUri = rtrim((string) config('app.url'), '/').'/';
            try {
                $tokenRes = Http::asForm()->timeout(12)->post('https://oauth2.googleapis.com/token', [
                    'grant_type' => 'authorization_code',
                    'code' => 'sahnebul_configuration_probe_invalid_code',
                    'client_id' => $clientId,
                    'client_secret' => $secretPlain,
                    'redirect_uri' => $redirectUri,
                ]);
                $body = $tokenRes->json();
                $err = is_array($body) && isset($body['error']) ? (string) $body['error'] : '';

                if ($err === 'invalid_grant') {
                    $checks[] = 'İstemci kimliği ve sırrı Google token uç noktası tarafından kabul edildi (invalid_grant = beklenen yanıt).';
                } elseif ($err === 'redirect_uri_mismatch') {
                    $checks[] = 'İstemci tanınıyor; redirect_uri uyuşmazlığı: Google Cloud Console → OAuth istemcisi → Yetkili yönlendirme URI’lerine şunu ekleyin: '.$redirectUri;
                } elseif ($err === 'invalid_client') {
                    return response()->json([
                        'ok' => false,
                        'message' => 'Google invalid_client: İstemci kimliği veya sırrı hatalı olabilir.',
                        'checks' => $checks,
                    ]);
                } elseif ($err !== '') {
                    $checks[] = 'Token denemesi yanıtı: '.$err.' (kimlik jetonu doğrulaması çoğu kurulumda yalnızca Client ID ile çalışır).';
                }
            } catch (\Throwable $e) {
                $checks[] = 'Token uç noktası denemesi atlandı: '.$e->getMessage();
            }
        } else {
            $checks[] = 'İstemci sırrı yok — GIS kimlik jetonu doğrulaması çoğu kurulumda yalnızca Client ID ile yeterlidir.';
        }

        $checks[] = 'Yeni kullanıcılar Google ile kayıt olduğunda rol «kullanıcı» (customer) atanır; giriş/kayıt sayfalarında düğmeyi deneyin.';

        return response()->json([
            'ok' => true,
            'message' => 'Yapılandırma kontrolleri tamamlandı.',
            'checks' => $checks,
        ]);
    }
}
