<?php

namespace App\Http\Controllers;

use App\Models\Event;
use Illuminate\Http\Request;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function __invoke(Request $request)
    {
        $user = $request->user();

        if ($user->isAdmin()) {
            return redirect()->route('admin.dashboard');
        }
        if ($user->isArtist()) {
            return redirect()->route('artist.dashboard');
        }

        if (! ($user->isCustomer() || $user->canUsePublicEngagementFeatures())) {
            return redirect()->route('home')->with('error', 'Bu özet paneline erişemezsiniz.');
        }

        $favoriteArtists = $user->favoriteArtists()
            ->orderBy('name')
            ->get(['artists.id', 'artists.name', 'artists.slug', 'artists.avatar']);

        $reminderEvents = $user->remindedEvents()
            ->published()
            ->whereHas('venue', fn ($q) => $q->listedPublicly())
            ->with(['venue:id,name,slug'])
            ->orderBy('start_date')
            ->limit(30)
            ->get(['events.id', 'events.slug', 'events.title', 'events.start_date', 'events.end_date', 'events.venue_id']);

        $recentReservations = $user->reservations()
            ->with(['venue', 'event'])
            ->latest('reservation_date')
            ->limit(5)
            ->get();

        $upcomingEvents = Event::query()
            ->published()
            ->whereHas('venue', fn ($q) => $q->listedPublicly())
            ->with(['venue:id,name,slug', 'artists:id,name,slug,avatar'])
            ->orderBy('start_date')
            ->limit(6)
            ->get(['id', 'slug', 'venue_id', 'title', 'start_date', 'end_date', 'ticket_price', 'entry_is_paid']);

        return Inertia::render('Dashboard', [
            'recentReservations' => $recentReservations,
            'upcomingEvents' => $upcomingEvents,
            'favoriteArtists' => $favoriteArtists,
            'reminderEvents' => $reminderEvents,
        ]);
    }
}
