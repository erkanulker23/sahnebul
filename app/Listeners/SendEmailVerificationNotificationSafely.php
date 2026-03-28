<?php

namespace App\Listeners;

use Illuminate\Auth\Events\Registered;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Support\Facades\Log;

final class SendEmailVerificationNotificationSafely
{
    public function handle(Registered $event): void
    {
        $user = $event->user;
        if (! $user instanceof MustVerifyEmail || $user->hasVerifiedEmail()) {
            return;
        }

        try {
            $user->sendEmailVerificationNotification();
        } catch (\Throwable $e) {
            Log::warning('E-posta doğrulama bildirimi gönderilemedi (SMTP veya posta yapılandırması)', [
                'user_id' => $user->getAuthIdentifier(),
                'message' => $e->getMessage(),
            ]);
        }
    }
}
