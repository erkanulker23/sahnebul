<?php

namespace App\Http\Controllers;

use App\Models\EventTicketTier;
use App\Models\Reservation;
use App\Models\Venue;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class ReservationController extends Controller
{
    public function index(Request $request): RedirectResponse|InertiaResponse
    {
        if ($request->user()->isAdmin()) {
            return redirect()->route('admin.dashboard')
                ->with('error', 'Yönetici hesabıyla müşteri rezervasyonu kullanılamaz.');
        }

        if ($request->user()->venues()->exists()) {
            return redirect()->route('artist.dashboard')
                ->with('error', 'Mekan sahibi olarak müşteri rezervasyon listeniz kullanılmaz; rezervasyonları Sahne panelinden yönetin.');
        }

        $reservations = $request->user()
            ->reservations()
            ->with(['venue', 'event'])
            ->latest('reservation_date')
            ->paginate(10);

        return Inertia::render('Reservations/Index', [
            'reservations' => $reservations,
        ]);
    }

    public function create(Request $request, Venue $venue)
    {
        if ($request->user()->isAdmin()) {
            return redirect()->route('admin.dashboard')
                ->with('error', 'Yönetici hesabıyla müşteri rezervasyonu oluşturulamaz.');
        }

        if ($venue->status !== 'approved') {
            abort(404);
        }
        $venue->load('city', 'category');
        $events = $venue->events()->published()->upcoming()->where('is_full', false)->get();

        $preselectEventId = null;
        if ($request->filled('event')) {
            $eid = (int) $request->query('event');
            if ($eid > 0 && $events->contains('id', $eid)) {
                $preselectEventId = $eid;
            }
        }

        return Inertia::render('Reservations/Create', [
            'venue' => $venue,
            'events' => $events,
            'preselectEventId' => $preselectEventId,
        ]);
    }

    public function store(Request $request)
    {
        if ($request->user()->isAdmin()) {
            return back()->with('error', 'Yönetici hesabıyla müşteri rezervasyonu oluşturulamaz.');
        }

        $request->validate([
            'venue_id' => 'required|exists:venues,id',
            'event_id' => 'nullable|exists:events,id',
            'reservation_date' => 'required|date|after_or_equal:today',
            'reservation_time' => 'required',
            'reservation_type' => 'required|in:table,ticket',
            'guest_count' => 'required|integer|min:1|max:50',
            'quantity' => 'required|integer|min:1|max:20',
            'notes' => 'nullable|string|max:500',
            'event_ticket_tier_id' => 'nullable|integer|exists:event_ticket_tiers,id',
        ]);

        $venue = Venue::findOrFail($request->venue_id);
        if ($venue->status !== 'approved') {
            return back()->with('error', 'Bu sahne için rezervasyon yapılamaz.');
        }

        $amount = 0;
        $tierId = null;
        if ($request->event_id) {
            $event = $venue->events()->with('ticketTiers')->find($request->event_id);
            if (! $event) {
                return back()->with('error', 'Seçilen etkinlik bulunamadı.');
            }
            if ($event->is_full) {
                return back()->with('error', 'Bu etkinlik için yer kalmadı.');
            }
            if ($event->ticketTiers->isNotEmpty()) {
                $tier = EventTicketTier::query()
                    ->where('event_id', $event->id)
                    ->where('id', (int) $request->input('event_ticket_tier_id'))
                    ->first();
                if (! $tier) {
                    return back()->with('error', 'Bu etkinlik için bilet kategorisi seçin.');
                }
                $amount = (float) $tier->price * (int) $request->quantity;
                $tierId = $tier->id;
            } else {
                $amount = (float) ($event->ticket_price ?? 0) * (int) $request->quantity;
            }
        }

        DB::transaction(function () use ($request, $venue, $tierId, $amount): void {
            Reservation::create([
                'user_id' => $request->user()->id,
                'venue_id' => $venue->id,
                'event_id' => $request->event_id,
                'event_ticket_tier_id' => $tierId,
                'reservation_date' => $request->reservation_date,
                'reservation_time' => $request->reservation_time,
                'reservation_type' => $request->reservation_type,
                'guest_count' => $request->guest_count,
                'quantity' => $request->quantity,
                'total_amount' => $amount,
                'qr_code' => 'QR-'.strtoupper(Str::random(12)),
                'status' => 'pending',
                'notes' => $request->notes,
            ]);
        });

        return redirect()->route('reservations.index')->with('success', 'Rezervasyonunuz alındı. Onay bekleniyor.');
    }
}
