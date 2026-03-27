<?php

namespace App\Notifications;

use App\Models\Event;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

class EventTomorrowReminderDatabaseNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public Event $event) {}

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        $this->event->loadMissing('venue:id,name');

        return [
            'message' => 'Yarın: '.$this->event->title.' — '.($this->event->venue?->name ?? 'Mekân'),
            'event_id' => $this->event->id,
            'url' => route('events.show', ['event' => $this->event->publicUrlSegment()], absolute: false),
        ];
    }
}
