<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Reservation;
use App\Services\SahnebulMail;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ReservationController extends Controller
{
    public function index(Request $request)
    {
        $reservations = Reservation::with(['user', 'venue', 'event'])
            ->when($request->status, fn ($q) => $q->where('status', $request->status))
            ->when($request->date_from, fn ($q) => $q->whereDate('reservation_date', '>=', $request->date_from))
            ->when($request->date_to, fn ($q) => $q->whereDate('reservation_date', '<=', $request->date_to))
            ->latest('reservation_date')
            ->paginate(25)
            ->withQueryString();

        $stats = [
            'total' => Reservation::count(),
            'pending' => Reservation::where('status', 'pending')->count(),
            'confirmed' => Reservation::where('status', 'confirmed')->count(),
            'cancelled' => Reservation::where('status', 'cancelled')->count(),
            'total_revenue' => Reservation::whereIn('status', ['confirmed', 'completed'])->sum('total_amount'),
        ];

        return Inertia::render('Admin/Reservations/Index', [
            'reservations' => $reservations,
            'stats' => $stats,
            'filters' => $request->only(['status', 'date_from', 'date_to']),
        ]);
    }

    public function show(Reservation $reservation)
    {
        $reservation->load(['user', 'venue', 'event']);

        return Inertia::render('Admin/Reservations/Show', [
            'reservation' => $reservation,
        ]);
    }

    public function updateStatus(Reservation $reservation, Request $request)
    {
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
