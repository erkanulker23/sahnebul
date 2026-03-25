<?php

namespace App\Console\Commands;

use App\Mail\EventTomorrowReminderMail;
use App\Models\Event;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;

class SendEventTomorrowReminders extends Command
{
    protected $signature = 'sahnebul:send-event-reminders';

    protected $description = 'Yarın gerçekleşecek etkinlikler için kullanıcı e-posta hatırlatmalarını gönderir';

    public function handle(): int
    {
        $tz = 'Europe/Istanbul';
        $tomorrow = Carbon::tomorrow($tz)->toDateString();

        $rows = DB::table('user_event_reminders as uer')
            ->join('events as e', 'e.id', '=', 'uer.event_id')
            ->join('users as u', 'u.id', '=', 'uer.user_id')
            ->join('venues as v', 'v.id', '=', 'e.venue_id')
            ->whereNull('uer.reminder_sent_at')
            ->where('e.status', 'published')
            ->where('v.status', 'approved')
            ->whereDate('e.start_date', $tomorrow)
            ->where('u.is_active', true)
            ->select('uer.id as reminder_row_id', 'uer.user_id', 'uer.event_id')
            ->get();

        $sent = 0;
        foreach ($rows as $row) {
            $user = User::query()->find($row->user_id);
            $event = Event::query()->with('venue:id,name,slug,status')->find($row->event_id);
            if ($user === null || $event === null || $event->venue?->status !== 'approved') {
                continue;
            }
            if (! $user->isCustomer()) {
                DB::table('user_event_reminders')->where('id', $row->reminder_row_id)->update(['reminder_sent_at' => now()]);

                continue;
            }

            try {
                Mail::to($user->email)->send(new EventTomorrowReminderMail($user, $event));
            } catch (\Throwable $e) {
                $this->error('E-posta gönderilemedi (kullanıcı '.$user->id.', etkinlik '.$event->id.'): '.$e->getMessage());

                continue;
            }

            DB::table('user_event_reminders')->where('id', $row->reminder_row_id)->update(['reminder_sent_at' => now()]);
            $sent++;
        }

        if ($sent > 0) {
            $this->info("Gönderilen hatırlatma: {$sent}");
        }

        return self::SUCCESS;
    }
}
