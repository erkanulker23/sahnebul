<?php

namespace App\Notifications;

use App\Http\Controllers\User\BrowserNotificationController;
use Illuminate\Notifications\Notification;

/**
 * Yönetim panelinden tüm üyelere veya yalnızca tarayıcı bildirimi açık kullanıcılara gönderilen duyuru.
 * Ön yüz: veritabanı bildirimi + açık sekmede {@see BrowserNotificationController} özeti.
 *
 * Not: ShouldQueue kullanılmaz; böylece queue worker kurulmamış ortamlarda da bildirimler anında
 * `notifications` tablosuna yazılır. Çok büyük üye listelerinde gönderim süresi uzayabilir — o durumda
 * ayrı bir job ile toplu gönderim tercih edilmelidir.
 */
class AdminBroadcastNotification extends Notification
{
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
