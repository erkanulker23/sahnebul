<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ContentSlider extends Model
{
    public const PLACEMENT_HOME_HERO = 'home_hero';

    public const PLACEMENT_FEATURED = 'featured';

    protected $fillable = [
        'placement',
        'title',
        'subtitle',
        'link_url',
        'hero_eyebrow',
        'hero_headline',
        'hero_headline_accent',
        'hero_body',
        'image_path',
        'sort_order',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    public function isHomeHero(): bool
    {
        return $this->placement === self::PLACEMENT_HOME_HERO;
    }
}
