<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('events', function (Blueprint $table) {
            $table->boolean('sahnebul_reservation_enabled')->default(true)->after('is_full');
            $table->json('ticket_outlets')->nullable()->after('sahnebul_reservation_enabled');
            $table->text('ticket_purchase_note')->nullable()->after('ticket_outlets');
        });
    }

    public function down(): void
    {
        Schema::table('events', function (Blueprint $table) {
            $table->dropColumn(['sahnebul_reservation_enabled', 'ticket_outlets', 'ticket_purchase_note']);
        });
    }
};
