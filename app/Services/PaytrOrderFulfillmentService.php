<?php

namespace App\Services;

use App\Models\Event;
use App\Models\PaytrPaymentOrder;
use App\Models\Reservation;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PaytrOrderFulfillmentService
{
    /**
     * Bildirim URL başarısında etkinlik bileti siparişine karşılık rezervasyon oluşturur (idempotent).
     */
    public function fulfillIfEventTicket(PaytrPaymentOrder $order): void
    {
        if ($order->status !== 'success') {
            return;
        }

        $reservation = null;

        DB::transaction(function () use ($order, &$reservation): void {
            $locked = PaytrPaymentOrder::query()->whereKey($order->id)->lockForUpdate()->first();
            if ($locked === null) {
                return;
            }

            $ctx = $locked->context ?? [];
            if (($ctx['type'] ?? null) !== 'event_ticket') {
                return;
            }
            if (isset($ctx['reservation_id'])) {
                return;
            }

            $userId = (int) ($ctx['user_id'] ?? 0);
            $user = User::query()->whereKey($userId)->first();
            if ($user === null) {
                return;
            }

            $eventId = (int) ($ctx['event_id'] ?? 0);
            $venueId = (int) ($ctx['venue_id'] ?? 0);
            $event = Event::query()->whereKey($eventId)->first();
            if ($event === null || (int) $event->venue_id !== $venueId) {
                return;
            }

            $tierId = isset($ctx['event_ticket_tier_id']) ? (int) $ctx['event_ticket_tier_id'] : null;
            if ($tierId !== null && $tierId <= 0) {
                $tierId = null;
            }

            $quantity = max(1, min(20, (int) ($ctx['quantity'] ?? 1)));
            $guestName = trim((string) ($ctx['guest_name'] ?? $user->name));
            $guestPhone = trim((string) ($ctx['guest_phone'] ?? ''));
            if ($guestPhone === '' || $guestName === '') {
                return;
            }

            $reservation = Reservation::create([
                'user_id' => $user->id,
                'guest_name' => $guestName,
                'guest_phone' => $guestPhone,
                'venue_id' => $venueId,
                'event_id' => $eventId,
                'event_ticket_tier_id' => $tierId,
                'reservation_date' => (string) ($ctx['reservation_date'] ?? now()->toDateString()),
                'reservation_time' => (string) ($ctx['reservation_time'] ?? '20:00'),
                'reservation_type' => 'ticket',
                'guest_count' => $quantity,
                'quantity' => $quantity,
                'total_amount' => $locked->payment_amount,
                'qr_code' => 'QR-'.strtoupper(Str::random(12)),
                'status' => 'confirmed',
                'notes' => 'PayTR kart ödemesi — '.$locked->merchant_oid,
            ]);

            $ctx['reservation_id'] = $reservation->id;
            $locked->forceFill(['context' => $ctx])->save();
        });

        if ($reservation instanceof Reservation) {
            $reservation->load(['user', 'venue.user', 'event']);
            SahnebulMail::reservationSubmitted($reservation);
            $this->maybeAttachEventReminder($reservation->user, $reservation->event_id);
        }
    }

    private function maybeAttachEventReminder(?User $user, ?int $eventId): void
    {
        if ($user === null || $eventId === null || ! $user->canUsePublicEngagementFeatures()) {
            return;
        }

        $ev = Event::query()->with('venue:id,status,is_active')->find($eventId);
        if ($ev
            && $ev->status === 'published'
            && $ev->venue?->status === 'approved'
            && $ev->venue?->is_active
            && $ev->start_date !== null
            && $ev->start_date->isFuture()
            && ! $user->remindedEvents()->whereKey($ev->id)->exists()) {
            $user->remindedEvents()->attach($ev->id, ['reminder_sent_at' => null]);
        }
    }
}
