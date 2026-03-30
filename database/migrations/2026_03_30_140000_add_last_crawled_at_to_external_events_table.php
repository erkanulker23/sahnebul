<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('external_events', function (Blueprint $table): void {
            $table->timestamp('last_crawled_at')->nullable()->after('updated_at');
        });

        if (Schema::hasColumn('external_events', 'last_crawled_at')) {
            DB::table('external_events')
                ->whereNull('last_crawled_at')
                ->update(['last_crawled_at' => DB::raw('COALESCE(updated_at, created_at)')]);
        }
    }

    public function down(): void
    {
        Schema::table('external_events', function (Blueprint $table): void {
            $table->dropColumn('last_crawled_at');
        });
    }
};
