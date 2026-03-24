<?php

use App\Models\Event;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('events', function (Blueprint $table) {
            $table->string('ticket_acquisition_mode', 32)->default('sahnebul')->after('ticket_purchase_note');
        });

        Event::query()->chunkById(100, function ($events): void {
            foreach ($events as $event) {
                $outlets = $event->ticket_outlets ?? [];
                $hasOutlet = false;
                foreach ($outlets as $row) {
                    if (! is_array($row)) {
                        continue;
                    }
                    $label = trim((string) ($row['label'] ?? ''));
                    $url = trim((string) ($row['url'] ?? ''));
                    if ($label !== '' && $url !== '') {
                        $hasOutlet = true;
                        break;
                    }
                }
                if ($hasOutlet) {
                    $event->ticket_acquisition_mode = Event::TICKET_MODE_EXTERNAL;
                } elseif ($event->sahnebul_reservation_enabled) {
                    $event->ticket_acquisition_mode = Event::TICKET_MODE_SAHNEBUL;
                } else {
                    $event->ticket_acquisition_mode = Event::TICKET_MODE_PHONE;
                }
                $event->saveQuietly();
            }
        });
    }

    public function down(): void
    {
        Schema::table('events', function (Blueprint $table) {
            $table->dropColumn('ticket_acquisition_mode');
        });
    }
};
