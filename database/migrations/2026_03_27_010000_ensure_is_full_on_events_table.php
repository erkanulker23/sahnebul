<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Bazı ortamlarda events.is_full sütunu eksik kalabiliyor (eski yedek, kısmi migrate).
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('events', 'is_full')) {
            Schema::table('events', function (Blueprint $table) {
                $table->boolean('is_full')->default(false)->after('sold_count');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('events', 'is_full')) {
            Schema::table('events', function (Blueprint $table) {
                $table->dropColumn('is_full');
            });
        }
    }
};
