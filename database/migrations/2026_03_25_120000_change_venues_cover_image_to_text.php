<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('venues')) {
            return;
        }

        $driver = Schema::getConnection()->getDriverName();

        if ($driver === 'mysql') {
            DB::statement('ALTER TABLE venues MODIFY cover_image TEXT NULL');
        } elseif ($driver === 'pgsql') {
            DB::statement('ALTER TABLE venues ALTER COLUMN cover_image TYPE TEXT');
        }
        // sqlite: string() zaten TEXT benzeri; uzun URL sorunu çoğunlukla MySQL'de oluşur
    }

    public function down(): void
    {
        if (! Schema::hasTable('venues')) {
            return;
        }

        $driver = Schema::getConnection()->getDriverName();

        if ($driver === 'mysql') {
            DB::statement('ALTER TABLE venues MODIFY cover_image VARCHAR(255) NULL');
        } elseif ($driver === 'pgsql') {
            DB::statement('ALTER TABLE venues ALTER COLUMN cover_image TYPE VARCHAR(255)');
        }
    }
};
