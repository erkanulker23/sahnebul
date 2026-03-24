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

        $recentReservations = $user->reservations()
            ->with(['venue', 'event'])
            ->latest('reservation_date')
            ->limit(5)
            ->get();

        $upcomingEvents = Event::query()
            ->published()
            ->whereHas('venue', fn ($q) => $q->approved())
            ->with(['venue:id,name,slug', 'artists:id,name,slug,avatar'])
            ->orderBy('start_date')
            ->limit(6)
            ->get(['id', 'slug', 'venue_id', 'title', 'start_date', 'ticket_price']);

        return Inertia::render('Dashboard', [
            'recentReservations' => $recentReservations,
            'upcomingEvents' => $upcomingEvents,
        ]);
    }
}
