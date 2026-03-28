<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('user_subscriptions')) {
            return;
        }

        if (Schema::getConnection()->getDriverName() !== 'mysql') {
            return;
        }

        // TIMESTAMP: MySQL ~2038 üst sınırı; admin sınırsız üyelik 2099 kullanıyor.
        DB::statement('ALTER TABLE `user_subscriptions` MODIFY `starts_at` DATETIME NOT NULL');
        DB::statement('ALTER TABLE `user_subscriptions` MODIFY `ends_at` DATETIME NOT NULL');
    }

    public function down(): void
    {
        if (! Schema::hasTable('user_subscriptions')) {
            return;
        }

        if (Schema::getConnection()->getDriverName() !== 'mysql') {
            return;
        }

        DB::statement('ALTER TABLE `user_subscriptions` MODIFY `starts_at` TIMESTAMP NOT NULL');
        DB::statement('ALTER TABLE `user_subscriptions` MODIFY `ends_at` TIMESTAMP NOT NULL');
    }
};
