<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::getConnection()->getDriverName() !== 'mysql') {
            return;
        }

        $col = DB::selectOne("SHOW COLUMNS FROM subscription_plans WHERE Field = 'membership_type'");
        $type = is_object($col) && isset($col->Type) ? strtolower((string) $col->Type) : '';

        if ($type !== '' && str_contains($type, 'enum')) {
            DB::statement("ALTER TABLE subscription_plans MODIFY COLUMN membership_type ENUM('artist','venue','manager') NOT NULL DEFAULT 'venue'");
        }
    }

    public function down(): void
    {
        if (Schema::getConnection()->getDriverName() !== 'mysql') {
            return;
        }

        DB::table('subscription_plans')->where('membership_type', 'manager')->update(['membership_type' => 'venue']);

        $col = DB::selectOne("SHOW COLUMNS FROM subscription_plans WHERE Field = 'membership_type'");
        $type = is_object($col) && isset($col->Type) ? strtolower((string) $col->Type) : '';

        if ($type !== '' && str_contains($type, 'enum')) {
            DB::statement("ALTER TABLE subscription_plans MODIFY COLUMN membership_type ENUM('artist','venue') NOT NULL DEFAULT 'venue'");
        }
    }
};
