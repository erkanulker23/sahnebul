<?php

use App\Support\AdPlacementCatalog;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Yerelde düzeltilen reklam JSON yapısını (slots + legacy top_banner/sidebar_banner)
     * sunucuda da aynı kurallarla normalize eder; panelde açık/kapalı bayrakları korunur.
     */
    public function up(): void
    {
        if (! Schema::hasTable('app_settings')) {
            return;
        }

        $row = DB::table('app_settings')->where('key', 'ads')->first();

        if ($row === null) {
            $normalized = AdPlacementCatalog::normalize(null);
            DB::table('app_settings')->insert([
                'key' => 'ads',
                'value' => json_encode($normalized, JSON_UNESCAPED_UNICODE),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            return;
        }

        $decoded = json_decode((string) $row->value, true);
        $normalized = AdPlacementCatalog::normalize(is_array($decoded) ? $decoded : null);

        DB::table('app_settings')->where('key', 'ads')->update([
            'value' => json_encode($normalized, JSON_UNESCAPED_UNICODE),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        // Veri normalizasyonu geri alınmaz.
    }
};
