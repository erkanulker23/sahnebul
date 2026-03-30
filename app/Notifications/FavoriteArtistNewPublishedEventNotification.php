<?php

namespace App\Notifications;

use App\Models\Event;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

class FavoriteArtistNewPublishedEventNotification extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * @param  list<int>|null  $artistIdsForMessage  Bildirim metninde anılacak sanatçılar (yalnızca yeni eklenenler vb.); null = kadrodakilerin tümü.
     */
    public function __construct(
        public Event $event,
        public ?array $artistIdsForMessage = null,
    ) {}

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
        $this->event->loadMissing(['venue:id,name', 'artists:id,name']);

        $artists = $this->artistIdsForMessage === null
            ? $this->event->artists
            : $this->event->artists->whereIn('id', $this->artistIdsForMessage);
        $names = $artists->pluck('name')->implode(', ');

        return [
            'message' => 'Takip ettiğiniz '
                .($names !== '' ? $names.' — ' : '')
                .'yeni etkinlik: '.$this->event->title
                .($this->event->venue ? ' — '.$this->event->venue->name : ''),
            'event_id' => $this->event->id,
            'url' => route('events.show', ['event' => $this->event->publicUrlSegment()], absolute: false),
        ];
    }
}
