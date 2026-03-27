<?php

namespace App\Support;

use Illuminate\Validation\Rule;

/**
 * Kamu /etkinlikler listesi ve etkinlik kayıtlarında kullanılan sabit etkinlik türleri.
 */
final class EventListingTypes
{
    /**
     * @return list<array{slug: string, label: string}>
     */
    public static function options(): array
    {
        return [
            ['slug' => 'konser', 'label' => 'Konser'],
            ['slug' => 'tiyatro', 'label' => 'Tiyatro'],
            ['slug' => 'festival', 'label' => 'Festival'],
            ['slug' => 'stand-up', 'label' => 'Stand-up'],
            ['slug' => 'cocuk-aktiviteleri', 'label' => 'Çocuk Aktiviteleri'],
            ['slug' => 'workshop', 'label' => 'Workshop'],
        ];
    }

    /**
     * @return list<string>
     */
    public static function slugs(): array
    {
        return array_column(self::options(), 'slug');
    }

    /**
     * @return array<string, string>
     */
    public static function labelsBySlug(): array
    {
        $map = [];
        foreach (self::options() as $row) {
            $map[$row['slug']] = $row['label'];
        }

        return $map;
    }

    public static function labelFor(?string $slug): ?string
    {
        if ($slug === null || $slug === '') {
            return null;
        }

        return self::labelsBySlug()[$slug] ?? null;
    }

    /**
     * @return array<int, \Illuminate\Contracts\Validation\Rule|string>
     */
    public static function nullableSlugRule(): array
    {
        return ['nullable', 'string', Rule::in(self::slugs())];
    }
}
