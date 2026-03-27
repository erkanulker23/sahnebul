<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Uzun biyografi + doğrulama (max:2048) ile uyum; MySQL TEXT sınırı aşımından kaynaklanan 500 hatalarını önler.
     */
    public function up(): void
    {
        Schema::table('artists', function (Blueprint $table) {
            $table->longText('bio')->nullable()->change();
            $table->string('avatar', 2048)->nullable()->change();
            $table->string('banner_image', 2048)->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('artists', function (Blueprint $table) {
            $table->text('bio')->nullable()->change();
            $table->string('avatar')->nullable()->change();
            $table->string('banner_image')->nullable()->change();
        });
    }
};
