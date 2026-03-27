<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('organization_display_name')->nullable()->after('pending_venue_name');
        });

        Schema::table('artists', function (Blueprint $table) {
            $table->foreignId('managed_by_user_id')->nullable()->after('user_id')->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('artists', function (Blueprint $table) {
            $table->dropConstrainedForeignId('managed_by_user_id');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('organization_display_name');
        });
    }
};
