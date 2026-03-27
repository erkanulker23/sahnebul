<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('venues', function (Blueprint $table) {
            $table->string('promo_video_path', 2048)->nullable()->after('cover_image');
            $table->string('promo_embed_url', 2048)->nullable()->after('promo_video_path');
            $table->json('promo_gallery')->nullable()->after('promo_embed_url');
        });

        Schema::table('artists', function (Blueprint $table) {
            $table->string('promo_video_path', 2048)->nullable()->after('banner_image');
            $table->string('promo_embed_url', 2048)->nullable()->after('promo_video_path');
            $table->json('promo_gallery')->nullable()->after('promo_embed_url');
        });
    }

    public function down(): void
    {
        Schema::table('venues', function (Blueprint $table) {
            $table->dropColumn(['promo_video_path', 'promo_embed_url', 'promo_gallery']);
        });

        Schema::table('artists', function (Blueprint $table) {
            $table->dropColumn(['promo_video_path', 'promo_embed_url', 'promo_gallery']);
        });
    }
};
