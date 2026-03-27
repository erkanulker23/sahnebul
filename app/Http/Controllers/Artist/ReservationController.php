<?php

namespace App\Http\Controllers\Artist;

use App\Http\Controllers\Controller;
use App\Models\Reservation;
use App\Services\SahnebulMail;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ReservationController extends Controller
{
    public function index(Request $request)
    {
        $venueIds = $request->user()->venues()->pluck('id');
        $reservations = Reservation::whereIn('venue_id', $venueIds)
            ->with(['user', 'venue', 'event'])
            ->latest('reservation_date')
            ->paginate(20);

        $stats = [
            'pending' => Reservation::whereIn('venue_id', $venueIds)->where('status', 'pending')->count(),
            'confirmed' => Reservation::whereIn('venue_id', $venueIds)->where('status', 'confirmed')->count(),
        ];

        return Inertia::render('Artist/Reservations/Index', [
            'reservations' => $reservations,
            'stats' => $stats,
        ]);
    }

    public function updateStatus(Request $request, Reservation $reservation)
    {
        if ($reservation->venue->user_id !== $request->user()->id) {
            abort(403);
        }
        $request->validate(['status' => 'required|in:pending,confirmed,cancelled,completed']);
        $previous = $reservation->status;
        $reservation->update(['status' => $request->status]);
        if ($previous !== $reservation->status) {
            $reservation->refresh();
            SahnebulMail::reservationStatusChanged($reservation, $previous);
        }

        return back()->with('success', 'Rezervasyon durumu güncellendi.');
    }
}
