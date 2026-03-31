<?php

use App\Models\Event;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('events')) {
            return;
        }

        Event::query()->where('ticket_acquisition_mode', Event::TICKET_MODE_SAHNEBUL)->chunkById(100, function ($events): void {
            foreach ($events as $event) {
                $res = (bool) $event->sahnebul_reservation_enabled;
                $pay = (bool) ($event->paytr_checkout_enabled ?? true);

                if ($pay && ! $res) {
                    $event->ticket_acquisition_mode = Event::TICKET_MODE_SAHNEBUL_CARD;
                    $event->sahnebul_reservation_enabled = false;
                    $event->paytr_checkout_enabled = true;
                } elseif ($res && ! $pay) {
                    $event->ticket_acquisition_mode = Event::TICKET_MODE_SAHNEBUL_RESERVATION;
                    $event->sahnebul_reservation_enabled = true;
                    $event->paytr_checkout_enabled = false;
                } elseif ($res && $pay) {
                    $event->ticket_acquisition_mode = Event::TICKET_MODE_SAHNEBUL_CARD;
                    $event->sahnebul_reservation_enabled = false;
                    $event->paytr_checkout_enabled = true;
                } else {
                    $event->ticket_acquisition_mode = Event::TICKET_MODE_PHONE;
                    $event->sahnebul_reservation_enabled = false;
                    $event->paytr_checkout_enabled = false;
                }

                $event->saveQuietly();
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('events')) {
            return;
        }

        Event::query()->whereIn('ticket_acquisition_mode', [
            Event::TICKET_MODE_SAHNEBUL_RESERVATION,
            Event::TICKET_MODE_SAHNEBUL_CARD,
        ])->chunkById(100, function ($events): void {
            foreach ($events as $event) {
                $event->ticket_acquisition_mode = Event::TICKET_MODE_SAHNEBUL;
                if ($event->paytr_checkout_enabled ?? false) {
                    $event->sahnebul_reservation_enabled = false;
                } else {
                    $event->sahnebul_reservation_enabled = true;
                }
                $event->saveQuietly();
            }
        });
    }
};
