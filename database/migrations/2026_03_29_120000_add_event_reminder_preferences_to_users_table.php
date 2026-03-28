<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('phone', 32)->nullable()->after('email');
            $table->boolean('event_reminder_email_enabled')->default(true)->after('browser_notifications_enabled');
            $table->boolean('event_reminder_sms_enabled')->default(false)->after('event_reminder_email_enabled');
            $table->unsignedTinyInteger('event_reminder_email_hour')->default(10)->after('event_reminder_sms_enabled');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'phone',
                'event_reminder_email_enabled',
                'event_reminder_sms_enabled',
                'event_reminder_email_hour',
            ]);
        });
    }
};
