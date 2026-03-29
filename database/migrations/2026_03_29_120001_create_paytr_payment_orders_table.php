<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('paytr_payment_orders', function (Blueprint $table) {
            $table->id();
            $table->string('merchant_oid', 64)->unique();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('status', 32)->default('pending');
            $table->string('payment_amount', 32);
            $table->string('currency', 8)->default('TL');
            $table->json('context')->nullable();
            $table->text('last_callback_raw')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('paytr_payment_orders');
    }
};
