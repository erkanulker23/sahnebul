<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class EmailVerificationNotificationController extends Controller
{
    /**
     * Send a new email verification notification.
     */
    public function store(Request $request): RedirectResponse
    {
        if ($request->user()->hasVerifiedEmail()) {
            return redirect()->intended(route('dashboard', absolute: false));
        }

        try {
            $request->user()->sendEmailVerificationNotification();
        } catch (\Throwable $e) {
            Log::warning('Doğrulama e-postası gönderilemedi', [
                'user_id' => $request->user()->getAuthIdentifier(),
                'message' => $e->getMessage(),
            ]);

            return back()->with('error', 'Doğrulama e-postası şu an gönderilemedi. Lütfen daha sonra tekrar deneyin.');
        }

        return back()->with('status', 'verification-link-sent');
    }
}
