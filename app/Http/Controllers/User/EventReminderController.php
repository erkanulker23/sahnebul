<?php

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use App\Models\Event;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class EventReminderController extends Controller
{
    public function toggle(Request $request, int $event): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user->canUsePublicEngagementFeatures(), 403);

        $model = Event::query()->with('venue:id,status')->findOrFail($event);
        abort_unless($model->status === 'published' && $model->venue?->status === 'approved', 404);
        abort_if($model->start_date !== null && $model->start_date->isPast(), 404);

        if ($user->remindedEvents()->whereKey($model->id)->exists()) {
            $user->remindedEvents()->detach($model->id);

            return back()->with('success', 'Takip listesinden çıkarıldı.');
        }

        $user->remindedEvents()->attach($model->id, ['reminder_sent_at' => null]);

        return back()->with(
            'success',
            'Takip listesine eklendi. Etkinlikten bir gün önce (yaklaşık saat 10:00, İstanbul) e-posta ve hesabınızdaki bildirimler gönderilir.'
        );
    }
}
