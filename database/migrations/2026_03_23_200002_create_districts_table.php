<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('districts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('city_id')->constrained()->cascadeOnDelete();
            $table->unsignedBigInteger('external_id')->nullable();
            $table->string('name');
            $table->timestamps();

            $table->index(['city_id', 'external_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('districts');
    }
};
