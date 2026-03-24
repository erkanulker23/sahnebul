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

        $col = DB::selectOne("SHOW COLUMNS FROM users WHERE Field = 'role'");
        $type = is_object($col) && isset($col->Type) ? strtolower((string) $col->Type) : '';

        if ($type !== '' && str_contains($type, 'enum')) {
            DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('customer', 'artist', 'admin', 'super_admin') NOT NULL DEFAULT 'customer'");
        }
    }

    public function down(): void
    {
        if (Schema::getConnection()->getDriverName() !== 'mysql') {
            return;
        }

        $col = DB::selectOne("SHOW COLUMNS FROM users WHERE Field = 'role'");
        $type = is_object($col) && isset($col->Type) ? strtolower((string) $col->Type) : '';

        if ($type !== '' && str_contains($type, 'enum')) {
            DB::table('users')->where('role', 'super_admin')->update(['role' => 'admin']);

            DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('customer', 'artist', 'admin') NOT NULL DEFAULT 'customer'");
        }
    }
};
