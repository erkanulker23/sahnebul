<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('stage_trusted_publisher')->default(false)->after('is_active');
        });

        Schema::table('events', function (Blueprint $table) {
            $table->foreignId('created_by_user_id')->nullable()->after('venue_id')->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('events', function (Blueprint $table) {
            $table->dropConstrainedForeignId('created_by_user_id');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('stage_trusted_publisher');
        });
    }
};
