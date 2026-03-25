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
        $model = Event::query()->with('venue:id,status')->findOrFail($event);
        abort_unless($model->status === 'published' && $model->venue?->status === 'approved', 404);
        abort_if($model->start_date !== null && $model->start_date->isPast(), 404);

        $user = $request->user();

        if ($user->remindedEvents()->whereKey($model->id)->exists()) {
            $user->remindedEvents()->detach($model->id);

            return back()->with('success', 'E-posta hatırlatıcısı kapatıldı.');
        }

        $user->remindedEvents()->attach($model->id, ['reminder_sent_at' => null]);

        return back()->with('success', 'Etkinlikten bir gün önce e-posta hatırlatması açıldı.');
    }
}
