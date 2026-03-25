<?php

namespace App\Http\Controllers\Artist;

use App\Http\Controllers\Controller;
use App\Models\Artist;
use App\Models\Event;
use App\Models\EventArtistReport;
use App\Services\AppSettingsService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class EventArtistReportController extends Controller
{
    public function store(Request $request, Event $event): RedirectResponse
    {
        $event->loadMissing('venue');
        $user = $request->user();
        $artistIds = Artist::query()->where('user_id', $user->id)->pluck('id');
        if ($artistIds->isEmpty()) {
            abort(403);
        }

        $onLineupIds = $event->artists()->whereIn('artists.id', $artistIds)->pluck('artists.id');
        if ($onLineupIds->isEmpty()) {
            abort(403, 'Bu etkinlikte hesabınıza bağlı sanatçı yer almıyor.');
        }

        if ((int) $event->venue->user_id === (int) $user->id) {
            return redirect()
                ->route('artist.events.index')
                ->with('error', 'Kendi mekânınızdaki etkinliği düzenleyebilirsiniz; rapor göndermeniz gerekmez.');
        }

        $pending = EventArtistReport::query()
            ->where('event_id', $event->id)
            ->whereIn('artist_id', $onLineupIds)
            ->where('status', EventArtistReport::STATUS_PENDING)
            ->exists();

        if ($pending) {
            return redirect()
                ->route('artist.events.index')
                ->with('error', 'Bu etkinlik için zaten bekleyen bir raporunuz var.');
        }

        $validated = $request->validate([
            'message' => ['required', 'string', 'min:10', 'max:2000'],
        ]);

        EventArtistReport::query()->create([
            'event_id' => $event->id,
            'artist_id' => (int) $onLineupIds->first(),
            'user_id' => $user->id,
            'message' => $validated['message'],
            'status' => EventArtistReport::STATUS_PENDING,
        ]);

        app(AppSettingsService::class)->forgetCaches();

        return redirect()
            ->route('artist.events.index')
            ->with('success', 'Raporunuz yöneticilere iletildi. İnceleme sonrası size dönüş yapılabilir.');
    }
}
