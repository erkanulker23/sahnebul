<?php

namespace App\Support;

use App\Models\Event;

final class TicketAcquisition
{
    /**
     * {@see resources/js/Components/TicketSalesEditor.tsx inferTicketAcquisitionMode}
     */
    public static function infer(Event $event): string
    {
        $m = $event->ticket_acquisition_mode;
        if (
            $m === Event::TICKET_MODE_EXTERNAL
            || $m === Event::TICKET_MODE_PHONE
            || $m === Event::TICKET_MODE_SAHNEBUL_RESERVATION
            || $m === Event::TICKET_MODE_SAHNEBUL_CARD
            || $m === Event::TICKET_MODE_SAHNEBUL
        ) {
            return $m;
        }
        $outlets = $event->ticket_outlets ?? [];
        $hasValid = false;
        foreach ($outlets as $o) {
            if (! is_array($o)) {
                continue;
            }
            $label = trim((string) ($o['label'] ?? ''));
            $url = trim((string) ($o['url'] ?? ''));
            if ($label !== '' && $url !== '') {
                $hasValid = true;
                break;
            }
        }
        if ($hasValid) {
            return Event::TICKET_MODE_EXTERNAL;
        }
        if ($event->sahnebul_reservation_enabled !== false) {
            return Event::TICKET_MODE_SAHNEBUL;
        }

        return Event::TICKET_MODE_PHONE;
    }

    /**
     * Etkinlik sayfasında PayTR «kart ile satın al» gösterimi için (bayrak + mod).
     */
    public static function allowsPaytrCheckout(Event $event): bool
    {
        if (! self::hasPaidTicketing($event)) {
            return false;
        }
        if (! ($event->paytr_checkout_enabled ?? true)) {
            return false;
        }
        $m = $event->ticket_acquisition_mode ?? Event::TICKET_MODE_SAHNEBUL;

        return match ($m) {
            Event::TICKET_MODE_SAHNEBUL_CARD => true,
            Event::TICKET_MODE_SAHNEBUL => true,
            default => false,
        };
    }

    public static function hasPaidTicketing(Event $event): bool
    {
        if (! $event->entry_is_paid) {
            return false;
        }
        if ($event->relationLoaded('ticketTiers') && $event->ticketTiers->isNotEmpty()) {
            return true;
        }
        if ($event->ticket_price !== null && (float) $event->ticket_price > 0) {
            return true;
        }

        return false;
    }
}
