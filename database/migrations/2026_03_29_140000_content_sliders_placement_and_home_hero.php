<?php

use App\Models\ContentSlider;
use App\Services\AppSettingsService;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('content_sliders', function (Blueprint $table) {
            $table->string('placement', 32)->default('featured')->after('id');
            $table->string('hero_eyebrow')->nullable()->after('subtitle');
            $table->string('hero_headline')->nullable()->after('hero_eyebrow');
            $table->string('hero_headline_accent')->nullable()->after('hero_headline');
            $table->text('hero_body')->nullable()->after('hero_headline_accent');
        });

        $row = DB::table('app_settings')->where('key', 'site')->first();
        if ($row !== null && is_string($row->value)) {
            $site = json_decode($row->value, true);
            if (is_array($site)) {
                $paths = $site['home_hero_slide_paths'] ?? null;
                $copy = $site['home_hero_slide_copy'] ?? null;
                if (is_array($paths) && $paths !== []) {
                    $paths = array_values(array_filter($paths, fn ($p) => is_string($p) && str_starts_with(trim($p), 'site/')));
                    $paths = array_slice($paths, 0, 3);
                    $sort = 0;
                    foreach ($paths as $i => $path) {
                        $path = trim((string) $path);
                        $c = is_array($copy[$i] ?? null) ? $copy[$i] : [];
                        $headline = isset($c['headline']) && is_string($c['headline']) ? trim($c['headline']) : '';
                        ContentSlider::query()->create([
                            'placement' => ContentSlider::PLACEMENT_HOME_HERO,
                            'title' => $headline !== '' ? mb_substr($headline, 0, 255) : 'Ana sayfa hero '.($i + 1),
                            'subtitle' => null,
                            'link_url' => null,
                            'hero_eyebrow' => isset($c['eyebrow']) && is_string($c['eyebrow']) ? trim($c['eyebrow']) : null,
                            'hero_headline' => $headline !== '' ? $headline : null,
                            'hero_headline_accent' => isset($c['headline_accent']) && is_string($c['headline_accent']) ? trim($c['headline_accent']) : null,
                            'hero_body' => isset($c['body']) && is_string($c['body']) ? trim($c['body']) : null,
                            'image_path' => $path,
                            'sort_order' => $sort,
                            'is_active' => true,
                        ]);
                        $sort++;
                    }
                }
                unset($site['home_hero_slide_paths'], $site['home_hero_slide_copy'], $site['home_hero_image_path']);
                DB::table('app_settings')->where('key', 'site')->update([
                    'value' => json_encode($site, JSON_UNESCAPED_UNICODE),
                ]);
                if (app()->bound(AppSettingsService::class)) {
                    app(AppSettingsService::class)->forgetCaches();
                }
            }
        }
    }

    public function down(): void
    {
        Schema::table('content_sliders', function (Blueprint $table) {
            $table->dropColumn([
                'placement',
                'hero_eyebrow',
                'hero_headline',
                'hero_headline_accent',
                'hero_body',
            ]);
        });
    }
};
