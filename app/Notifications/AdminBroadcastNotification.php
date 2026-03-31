<?php

namespace App\Notifications;

use App\Http\Controllers\User\BrowserNotificationController;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

/**
 * Yönetim panelinden tüm üyelere veya yalnızca tarayıcı bildirimi açık kullanıcılara gönderilen duyuru.
 * Ön yüz: veritabanı bildirimi + açık sekmede {@see BrowserNotificationController} özeti.
 */
class AdminBroadcastNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public string $message,
        public ?string $title = null,
        public ?string $actionUrl = null,
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
        return [
            'kind' => 'admin_broadcast',
            'title' => $this->title,
            'message' => $this->message,
            'url' => $this->actionUrl,
        ];
    }
}
