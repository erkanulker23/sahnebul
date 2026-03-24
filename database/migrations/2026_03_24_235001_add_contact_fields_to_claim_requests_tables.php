<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('venue_claim_requests', function (Blueprint $table) {
            $table->string('first_name')->nullable()->after('user_id');
            $table->string('last_name')->nullable()->after('first_name');
            $table->string('phone')->nullable()->after('last_name');
            $table->string('email')->nullable()->after('phone');
        });

        Schema::table('artist_claim_requests', function (Blueprint $table) {
            $table->string('first_name')->nullable()->after('user_id');
            $table->string('last_name')->nullable()->after('first_name');
            $table->string('phone')->nullable()->after('last_name');
            $table->string('email')->nullable()->after('phone');
        });
    }

    public function down(): void
    {
        Schema::table('venue_claim_requests', function (Blueprint $table) {
            $table->dropColumn(['first_name', 'last_name', 'phone', 'email']);
        });

        Schema::table('artist_claim_requests', function (Blueprint $table) {
            $table->dropColumn(['first_name', 'last_name', 'phone', 'email']);
        });
    }
};
