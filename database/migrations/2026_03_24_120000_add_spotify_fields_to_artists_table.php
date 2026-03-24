<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('artists', function (Blueprint $table) {
            $table->string('spotify_id', 32)->nullable()->unique()->after('user_id');
            $table->string('spotify_url', 512)->nullable()->after('spotify_id');
            $table->json('spotify_genres')->nullable()->after('genre');
            $table->unsignedTinyInteger('spotify_popularity')->nullable()->after('spotify_genres');
            $table->unsignedBigInteger('spotify_followers')->nullable()->after('spotify_popularity');
            $table->json('spotify_albums')->nullable()->after('spotify_followers');
        });
    }

    public function down(): void
    {
        Schema::table('artists', function (Blueprint $table) {
            $table->dropColumn([
                'spotify_id',
                'spotify_url',
                'spotify_genres',
                'spotify_popularity',
                'spotify_followers',
                'spotify_albums',
            ]);
        });
    }
};
