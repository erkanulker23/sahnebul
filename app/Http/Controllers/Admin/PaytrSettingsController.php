<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\PaytrDirectApiService;
use Illuminate\Http\Request;
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
}
