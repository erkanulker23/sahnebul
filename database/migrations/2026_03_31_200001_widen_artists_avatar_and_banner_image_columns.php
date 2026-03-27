<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Doğrulama avatar/banner için 2048 karaktere izin veriyor; VARCHAR(255) uzun URL veya yol ile SQL hatasına yol açabiliyor.
     */
    public function up(): void
    {
        Schema::table('artists', function (Blueprint $table) {
            $table->text('avatar')->nullable()->change();
            $table->text('banner_image')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('artists', function (Blueprint $table) {
            $table->string('avatar')->nullable()->change();
            $table->string('banner_image')->nullable()->change();
        });
    }
};
