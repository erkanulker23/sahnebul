<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('external_events', function (Blueprint $table) {
            $table->id();
            $table->string('source');
            $table->string('fingerprint')->index();
            $table->string('title');
            $table->string('external_url')->nullable();
            $table->string('image_url')->nullable();
            $table->string('venue_name')->nullable();
            $table->string('city_name')->nullable();
            $table->string('category_name')->nullable();
            $table->dateTime('start_date')->nullable();
            $table->text('description')->nullable();
            $table->json('meta')->nullable();
            $table->foreignId('synced_event_id')->nullable()->constrained('events')->nullOnDelete();
            $table->timestamps();

            $table->unique(['source', 'fingerprint']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('external_events');
    }
};
