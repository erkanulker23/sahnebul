<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('events')) {
            return;
        }

        $after = null;
        if (Schema::hasColumn('events', 'promo_venue_profile_moderation')) {
            $after = 'promo_venue_profile_moderation';
        } elseif (Schema::hasColumn('events', 'promo_gallery')) {
            $after = 'promo_gallery';
        }

        Schema::table('events', function (Blueprint $table) use ($after) {
            if (! Schema::hasColumn('events', 'promo_show_on_artist_profile_posts')) {
                $col = $table->boolean('promo_show_on_artist_profile_posts')->default(false);
                if ($after !== null) {
                    $col->after($after);
                }
            }
            if (! Schema::hasColumn('events', 'promo_show_on_artist_profile_videos')) {
                $table->boolean('promo_show_on_artist_profile_videos')->default(false)->after(
                    'promo_show_on_artist_profile_posts'
                );
            }
            if (! Schema::hasColumn('events', 'promo_artist_profile_moderation')) {
                $table->string('promo_artist_profile_moderation', 32)->default('approved')->after(
                    'promo_show_on_artist_profile_videos'
                );
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('events')) {
            return;
        }
        Schema::table('events', function (Blueprint $table) {
            $cols = [];
            foreach ([
                'promo_show_on_artist_profile_posts',
                'promo_show_on_artist_profile_videos',
                'promo_artist_profile_moderation',
            ] as $c) {
                if (Schema::hasColumn('events', $c)) {
                    $cols[] = $c;
                }
            }
            if ($cols !== []) {
                $table->dropColumn($cols);
            }
        });
    }
};
