<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('artists', function (Blueprint $table) {
            $table->dropForeign(['artist_type_id']);
        });

        Schema::table('artists', function (Blueprint $table) {
            $table->dropColumn('artist_type_id');
        });

        Schema::rename('artist_types', 'music_genres');
    }

    public function down(): void
    {
        Schema::rename('music_genres', 'artist_types');

        Schema::table('artists', function (Blueprint $table) {
            $table->foreignId('artist_type_id')->nullable()->after('genre')->constrained('artist_types')->nullOnDelete();
        });
    }
};
