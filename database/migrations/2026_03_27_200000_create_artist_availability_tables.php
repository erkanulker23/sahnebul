<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('artists', function (Blueprint $table) {
            $table->boolean('availability_visible_to_managers')->default(true)->after('managed_by_user_id');
        });

        Schema::create('artist_availability_days', function (Blueprint $table) {
            $table->id();
            $table->foreignId('artist_id')->constrained()->cascadeOnDelete();
            $table->date('date');
            $table->string('note', 500)->nullable();
            $table->timestamps();
            $table->unique(['artist_id', 'date']);
        });

        Schema::create('artist_manager_availability_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('manager_user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('artist_id')->constrained()->cascadeOnDelete();
            // MySQL 64-char limit: default FK name for artist_availability_day_id is too long
            $table->unsignedBigInteger('artist_availability_day_id')->nullable();
            $table->date('requested_date');
            $table->text('message');
            $table->string('status', 24)->default('pending');
            $table->timestamps();

            $table->foreign('artist_availability_day_id', 'am_ar_avail_day_fk')
                ->references('id')->on('artist_availability_days')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('artist_manager_availability_requests');
        Schema::dropIfExists('artist_availability_days');

        Schema::table('artists', function (Blueprint $table) {
            $table->dropColumn('availability_visible_to_managers');
        });
    }
};
