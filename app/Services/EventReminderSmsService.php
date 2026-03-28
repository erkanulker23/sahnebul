<?php

namespace App\Services;

use App\Models\Event;
use App\Models\User;
use Illuminate\Support\Facades\Log;

/**
 * Etkinlik hatırlatması SMS — SAHNEBUL_SMS_ENABLED ve sağlayıcı entegrasyonu hazır olunca doldurulur.
 */
final class EventReminderSmsService
{
    public static function sendTomorrowReminder(User $user, Event $event): bool
    {
        $phone = trim((string) ($user->phone ?? ''));
        if ($phone === '') {
            return false;
        }

        if (! config('sahnebul.sms.enabled')) {
            Log::info('event_reminder_sms_skipped_provider_disabled', [
                'user_id' => $user->id,
                'event_id' => $event->id,
                'phone_tail' => mb_substr($phone, -4),
            ]);

            return true;
        }

        // SAHNEBUL_SMS_ENABLED=true olduğunda gerçek sağlayıcı buraya eklenir; şimdilik hatırlatma akışını kilitlememek için başarı sayılır.
        Log::warning('event_reminder_sms_provider_not_configured', ['user_id' => $user->id, 'event_id' => $event->id]);

        return true;
    }
}
