<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('events', function (Blueprint $table) {
            $table->string('promo_video_path', 2048)->nullable()->after('listing_image');
            $table->string('promo_embed_url', 2048)->nullable()->after('promo_video_path');
        });
    }

    public function down(): void
    {
        Schema::table('events', function (Blueprint $table) {
            $table->dropColumn(['promo_video_path', 'promo_embed_url']);
        });
    }
};
