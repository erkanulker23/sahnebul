<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Models\EventTicketTier;
use App\Models\Reservation;
use App\Models\Venue;
use App\Services\SahnebulMail;
use App\Support\TurkishPhone;
use App\Support\UserContactValidation;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
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

        if ($venue->status !== 'approved' || ! $venue->is_active) {
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

        $preselectedEvent = $preselectEventId ? $events->firstWhere('id', $preselectEventId) : null;
        $appUrl = rtrim((string) config('app.url'), '/');
        $waDigits = $venue->whatsapp ? preg_replace('/\D+/', '', (string) $venue->whatsapp) : '';
        $waMessageLines = ['Merhaba,'];
        if ($preselectedEvent) {
            $waMessageLines[] = '“'.$preselectedEvent->title.'” etkinliği için sahnebul.com üzerinden ulaşıyorum; rezervasyon yapmak istiyorum.';
            $waMessageLines[] = 'Etkinlik: '.$appUrl.'/etkinlikler/'.$preselectedEvent->publicUrlSegment();
        } else {
            $waMessageLines[] = '“'.$venue->name.'” mekânı için sahnebul.com üzerinden ulaşıyorum; rezervasyon yapmak istiyorum.';
            $waMessageLines[] = 'Mekân: '.$appUrl.'/mekanlar/'.$venue->slug;
        }
        $whatsappReservationHref = ($waDigits !== '' && strlen($waDigits) >= 10)
            ? 'https://wa.me/'.$waDigits.'?text='.rawurlencode(implode("\n", $waMessageLines))
            : null;

        return Inertia::render('Reservations/Create', [
            'venue' => $venue,
            'events' => $events,
            'preselectEventId' => $preselectEventId,
            'whatsappReservationHref' => $whatsappReservationHref,
        ]);
    }

    public function store(Request $request)
    {
        if ($request->user()->isAdmin()) {
            return back()->with('error', 'Yönetici hesabıyla müşteri rezervasyonu oluşturulamaz.');
        }

        $validated = $request->validate([
            'venue_id' => 'required|exists:venues,id',
            'guest_name' => 'required|string|max:120',
            'guest_phone' => UserContactValidation::phoneRequired(),
            'event_id' => 'nullable|exists:events,id',
            'reservation_date' => 'required|date|after_or_equal:today',
            'reservation_time' => 'required',
            'reservation_type' => 'required|in:table,ticket',
            'guest_count' => 'required|integer|min:1|max:50',
            'quantity' => 'required|integer|min:1|max:20',
            'notes' => 'nullable|string|max:500',
            'event_ticket_tier_id' => 'nullable|integer|exists:event_ticket_tiers,id',
        ]);
        $validated = TurkishPhone::mergeNormalizedInto($validated, ['guest_phone']);

        $venue = Venue::findOrFail($validated['venue_id']);
        if ($venue->status !== 'approved') {
            return back()->with('error', 'Bu sahne için rezervasyon yapılamaz.');
        }

        $amount = 0;
        $tierId = null;
        if (! empty($validated['event_id'])) {
            $event = $venue->events()->with('ticketTiers')->find($validated['event_id']);
            if (! $event) {
                return back()->with('error', 'Seçilen etkinlik bulunamadı.');
            }
            if ($event->is_full) {
                return back()->with('error', 'Bu etkinlik için yer kalmadı.');
            }
            if ($event->ticketTiers->isNotEmpty()) {
                $tier = EventTicketTier::query()
                    ->where('event_id', $event->id)
                    ->where('id', (int) ($validated['event_ticket_tier_id'] ?? 0))
                    ->first();
                if (! $tier) {
                    return back()->with('error', 'Bu etkinlik için bilet kategorisi seçin.');
                }
                $amount = (float) $tier->price * (int) $validated['quantity'];
                $tierId = $tier->id;
            } else {
                $amount = (float) ($event->ticket_price ?? 0) * (int) $validated['quantity'];
            }
        }

        $reservation = DB::transaction(function () use ($request, $venue, $tierId, $amount, $validated): Reservation {
            return Reservation::create([
                'user_id' => $request->user()->id,
                'guest_name' => trim((string) $validated['guest_name']),
                'guest_phone' => $validated['guest_phone'],
                'venue_id' => $venue->id,
                'event_id' => $validated['event_id'] ?? null,
                'event_ticket_tier_id' => $tierId,
                'reservation_date' => $validated['reservation_date'],
                'reservation_time' => $validated['reservation_time'],
                'reservation_type' => $validated['reservation_type'],
                'guest_count' => $validated['guest_count'],
                'quantity' => $validated['quantity'],
                'total_amount' => $amount,
                'qr_code' => 'QR-'.strtoupper(Str::random(12)),
                'status' => 'pending',
                'notes' => $validated['notes'] ?? null,
            ]);
        });

        $reservation->load(['user', 'venue.user', 'event']);
        SahnebulMail::reservationSubmitted($reservation);

        $actor = $request->user();
        if ($reservation->event_id !== null && $actor->canUsePublicEngagementFeatures()) {
            $ev = Event::query()->with('venue:id,status,is_active')->find($reservation->event_id);
            if ($ev
                && $ev->status === 'published'
                && $ev->venue?->status === 'approved'
                && $ev->venue?->is_active
                && $ev->start_date !== null
                && $ev->start_date->isFuture()
                && ! $actor->remindedEvents()->whereKey($ev->id)->exists()) {
                $actor->remindedEvents()->attach($ev->id, ['reminder_sent_at' => null]);
            }
        }

        return redirect()->route('reservations.index')->with('success', 'Rezervasyonunuz alındı. Onay bekleniyor.');
    }
}
