<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('events', function (Blueprint $table) {
            $table->boolean('promo_show_on_venue_profile_posts')->default(false)->after('promo_gallery');
            $table->boolean('promo_show_on_venue_profile_videos')->default(false)->after('promo_show_on_venue_profile_posts');
            $table->string('promo_venue_profile_moderation', 32)->default('approved')->after('promo_show_on_venue_profile_videos');
        });
    }

    public function down(): void
    {
        Schema::table('events', function (Blueprint $table) {
            $table->dropColumn([
                'promo_show_on_venue_profile_posts',
                'promo_show_on_venue_profile_videos',
                'promo_venue_profile_moderation',
            ]);
        });
    }
};
