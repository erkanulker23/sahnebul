<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\PaytrDirectApiService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class PaytrSettingsController extends Controller
{
    public function index(PaytrDirectApiService $paytr): Response
    {
        $c = $paytr->configuration();

        return Inertia::render('Admin/Paytr/Index', [
            'paytr' => [
                'enabled' => $c['enabled'],
                'test_mode' => $c['test_mode'],
                'merchant_id' => $c['merchant_id'],
                'merchant_key_set' => $c['merchant_key_set'],
                'merchant_salt_set' => $c['merchant_salt_set'],
            ],
            'paytrEnv' => [
                'allowImport' => (bool) config('paytr.allow_env_credential_import'),
                'presetAvailable' => $paytr->envPresetMeta()['available'],
            ],
            'callbackUrl' => route('paytr.callback'),
        ]);
    }

    public function update(Request $request, PaytrDirectApiService $paytr)
    {
        $validated = $request->validate([
            'paytr_enabled' => 'sometimes|boolean',
            'paytr_test_mode' => 'sometimes|boolean',
            'paytr_merchant_id' => 'nullable|string|max:32',
            'paytr_merchant_key' => 'nullable|string|max:500',
            'paytr_merchant_salt' => 'nullable|string|max:500',
        ]);

        $paytr->persistSettings(
            $validated,
            $request->input('paytr_merchant_key'),
            $request->input('paytr_merchant_salt'),
        );

        return back()->with('success', 'PayTR ayarları kaydedildi.');
    }

    public function validateLocal(PaytrDirectApiService $paytr)
    {
        $r = $paytr->validateTokenGenerationLocally();

        if ($r['ok']) {
            return back()->with('success', 'paytr_token üretimi başarılı (yerel doğrulama). Gerçek ödeme için PayTR mağaza panelinde Bildirim URL’yi kaydedin: '.route('paytr.callback'));
        }

        return back()->with('error', $r['reason'] ?? 'Doğrulama başarısız.');
    }

    public function importFromEnv(PaytrDirectApiService $paytr)
    {
        $r = $paytr->importCredentialsFromEnv();

        if ($r['ok']) {
            return back()->with('success', 'PayTR test mağaza bilgileri .env üzerinden kaydedildi. Bildirim URL için PayTR panelinde şu adresi kullanın: '.route('paytr.callback'));
        }

        return back()->with('error', $r['reason'] ?? 'İçe aktarma başarısız.');
    }

    public function probe(Request $request, PaytrDirectApiService $paytr)
    {
        $userIp = $request->ip() ?? '';
        $r = $paytr->probeDirectApi($userIp, route('paytr.probe.ok'), route('paytr.probe.fail'));

        if ($r['ok']) {
            $msg = 'PayTR sunucusu yanıt verdi: status=success. Dokümandaki test kartı (9792…0796) ve mevcut test_mode ayarınız kullanıldı.';
            if (! empty($r['detail'])) {
                $msg .= ' '.$r['detail'];
            }

            return back()->with('success', $msg);
        }

        $reason = $r['reason'] ?? 'Bağlantı testi başarısız.';
        if (! empty($r['detail'])) {
            $reason .= ' '.Str::limit($r['detail'], 500);
        }
        if (isset($r['http_status'])) {
            $reason .= ' (HTTP '.$r['http_status'].')';
        }
        if (isset($r['paytr_status'])) {
            $reason .= ' [PayTR status: '.$r['paytr_status'].']';
        }

        return back()->with('error', $reason);
    }
}
