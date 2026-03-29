<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('external_events')) {
            return;
        }

        Schema::table('external_events', function (Blueprint $table) {
            $table->index(['synced_event_id', 'created_at'], 'external_events_synced_created_idx');
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('external_events')) {
            return;
        }

        Schema::table('external_events', function (Blueprint $table) {
            $table->dropIndex('external_events_synced_created_idx');
        });
    }
};
