<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\SendBroadcastNotificationRequest;
use App\Services\Admin\AdminBroadcastNotificationDispatcher;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class BroadcastNotificationController extends Controller
{
    public function __construct(
        private readonly AdminBroadcastNotificationDispatcher $dispatcher,
    ) {}

    public function create(): Response
    {
        $d = $this->dispatcher;

        return Inertia::render('Admin/BroadcastNotification', [
            'audiences' => [
                [
                    'value' => AdminBroadcastNotificationDispatcher::AUDIENCE_BROWSER_OPT_IN,
                    'label' => 'Tarayıcı / PWA bildirimi açanlar',
                    'description' => 'Hesabında «Bildirimlere izin ver» ile kayıtlı kullanıcılar. Uygulamayı ana ekrana ekleyip izin verenleri kapsar; bildirimler açık sekmede veya uygulama açıkken sistem bildirimi olarak gelir.',
                    'recipient_count' => $d->recipientQuery(AdminBroadcastNotificationDispatcher::AUDIENCE_BROWSER_OPT_IN)->count(),
                ],
                [
                    'value' => AdminBroadcastNotificationDispatcher::AUDIENCE_ALL_MEMBERS,
                    'label' => 'Tüm aktif üyeler (yöneticiler hariç)',
                    'description' => 'Aktif hesabı olan tüm kullanıcılar. Bildirim hesap «Bildirimler» sayfasında görünür; tarayıcı uyarısı yalnızca bildirimi açanlara gider.',
                    'recipient_count' => $d->recipientQuery(AdminBroadcastNotificationDispatcher::AUDIENCE_ALL_MEMBERS)->count(),
                ],
            ],
        ]);
    }

    public function store(SendBroadcastNotificationRequest $request): RedirectResponse
    {
        $validated = $request->validated();
        $actionUrl = isset($validated['action_url']) && $validated['action_url'] !== ''
            ? $validated['action_url']
            : null;

        $count = $this->dispatcher->dispatch(
            $request->user(),
            $validated['message'],
            $validated['title'] ?? null,
            $actionUrl,
            $validated['audience'],
        );

        return redirect()
            ->route('admin.notifications.broadcast')
            ->with('success', "Bildirim kuyruğa alındı. Hedef: {$count} kullanıcı.");
    }
}
