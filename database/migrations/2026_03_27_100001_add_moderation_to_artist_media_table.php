<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('artist_media', function (Blueprint $table) {
            $table->string('moderation_status', 32)->default('approved')->after('order');
            $table->text('moderation_note')->nullable()->after('moderation_status');
        });
    }

    public function down(): void
    {
        Schema::table('artist_media', function (Blueprint $table) {
            $table->dropColumn(['moderation_status', 'moderation_note']);
        });
    }
};
