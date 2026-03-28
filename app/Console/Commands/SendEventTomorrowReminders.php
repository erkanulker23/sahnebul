<?php

namespace App\Console\Commands;

use App\Models\Event;
use App\Models\User;
use App\Notifications\EventTomorrowReminderDatabaseNotification;
use App\Services\EventReminderSmsService;
use App\Services\SahnebulMail;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class SendEventTomorrowReminders extends Command
{
    protected $signature = 'sahnebul:send-event-reminders';

    protected $description = 'Yarınki etkinlik hatırlatmaları — kullanıcının seçtiği İstanbul saatinde (e-posta / SMS / uygulama bildirimi)';

    public function handle(): int
    {
        $tz = 'Europe/Istanbul';
        $tomorrow = Carbon::tomorrow($tz)->toDateString();
        $currentHour = (int) Carbon::now($tz)->format('G');

        $rows = DB::table('user_event_reminders as uer')
            ->join('events as e', 'e.id', '=', 'uer.event_id')
            ->join('users as u', 'u.id', '=', 'uer.user_id')
            ->join('venues as v', 'v.id', '=', 'e.venue_id')
            ->whereNull('uer.reminder_sent_at')
            ->where('e.status', 'published')
            ->where('v.status', 'approved')
            ->whereDate('e.start_date', $tomorrow)
            ->where('u.is_active', true)
            ->where('u.event_reminder_email_hour', $currentHour)
            ->select('uer.id as reminder_row_id', 'uer.user_id', 'uer.event_id')
            ->get();

        $sent = 0;
        foreach ($rows as $row) {
            $user = User::query()->find($row->user_id);
            $event = Event::query()->with('venue:id,name,slug,status')->find($row->event_id);
            if ($user === null || $event === null || $event->venue?->status !== 'approved') {
                continue;
            }
            if (! $user->canUsePublicEngagementFeatures()) {
                DB::table('user_event_reminders')->where('id', $row->reminder_row_id)->update(['reminder_sent_at' => now()]);

                continue;
            }

            $emailOn = (bool) $user->event_reminder_email_enabled;
            $smsOn = (bool) $user->event_reminder_sms_enabled;
            $phone = trim((string) ($user->phone ?? ''));

            if ($smsOn && $phone === '') {
                $this->warn("SMS açık ama telefon yok (kullanıcı {$user->id}); hatırlatma atlandı.");

                continue;
            }

            if ($emailOn) {
                if (! $user->hasVerifiedEmail()) {
                    $this->warn("E-posta hatırlatması atlandı — doğrulanmamış adres (kullanıcı {$user->id}).");
                } elseif (! SahnebulMail::eventTomorrowReminder($user, $event)) {
                    $this->error("E-posta gönderilemedi (kullanıcı {$user->id}, etkinlik {$event->id}).");

                    continue;
                }
            }

            if ($smsOn) {
                if (! EventReminderSmsService::sendTomorrowReminder($user, $event)) {
                    $this->error("SMS gönderilemedi (kullanıcı {$user->id}, etkinlik {$event->id}).");

                    continue;
                }
            }

            $user->notify(new EventTomorrowReminderDatabaseNotification($event));

            DB::table('user_event_reminders')->where('id', $row->reminder_row_id)->update(['reminder_sent_at' => now()]);
            $sent++;
        }

        if ($sent > 0) {
            $this->info("Gönderilen hatırlatma: {$sent}");
        }

        return self::SUCCESS;
    }
}
