<?php

namespace App\Http\Controllers;

use App\Models\PaytrPaymentOrder;
use App\Services\PaytrDirectApiService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;

/**
 * PayTR Direkt API 2. adım — Bildirim URL (callback).
 */
class PaytrCallbackController extends Controller
{
    public function __invoke(Request $request, PaytrDirectApiService $paytr): Response
    {
        $merchantOid = (string) $request->input('merchant_oid', '');
        $status = (string) $request->input('status', '');
        $totalAmount = (string) $request->input('total_amount', '');
        $hash = (string) $request->input('hash', '');

        if ($merchantOid === '' || $hash === '') {
            Log::warning('PayTR callback eksik parametre', $request->except(['hash']));

            return response('OK', 200);
        }

        if (! $paytr->verifyCallbackHash($merchantOid, $status, $totalAmount, $hash)) {
            Log::warning('PayTR callback hash uyuşmazlığı', ['merchant_oid' => $merchantOid]);

            return response('OK', 200);
        }

        $order = PaytrPaymentOrder::query()->where('merchant_oid', $merchantOid)->first();
        if ($order === null) {
            Log::info('PayTR callback bilinmeyen sipariş', ['merchant_oid' => $merchantOid]);

            return response('OK', 200);
        }

        if ($order->status === 'success') {
            return response('OK', 200);
        }

        $order->forceFill([
            'status' => $status === 'success' ? 'success' : 'failed',
            'last_callback_raw' => json_encode($request->all(), JSON_UNESCAPED_UNICODE),
        ])->save();

        return response('OK', 200);
    }
}
