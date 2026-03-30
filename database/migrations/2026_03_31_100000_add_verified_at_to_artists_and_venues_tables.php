<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('artists') && ! Schema::hasColumn('artists', 'verified_at')) {
            Schema::table('artists', function (Blueprint $table): void {
                $table->timestamp('verified_at')->nullable()->after('status');
            });
        }

        if (Schema::hasTable('venues') && ! Schema::hasColumn('venues', 'verified_at')) {
            Schema::table('venues', function (Blueprint $table): void {
                $table->timestamp('verified_at')->nullable()->after('status');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('artists') && Schema::hasColumn('artists', 'verified_at')) {
            Schema::table('artists', function (Blueprint $table): void {
                $table->dropColumn('verified_at');
            });
        }

        if (Schema::hasTable('venues') && Schema::hasColumn('venues', 'verified_at')) {
            Schema::table('venues', function (Blueprint $table): void {
                $table->dropColumn('verified_at');
            });
        }
    }
};
