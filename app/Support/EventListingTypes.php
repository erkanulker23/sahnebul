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
            ['slug' => 'sahne', 'label' => 'Sahne'],
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
     * Rota kısıtı: `/etkinlik/{eventTypeSlug}` için alternasyon (regex parçası).
     */
    public static function slugAlternationPattern(): string
    {
        return implode('|', array_map(static fn (string $s): string => preg_quote($s, '/'), self::slugs()));
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

    /**
     * @return array<int, \Illuminate\Contracts\Validation\Rule|string>
     */
    public static function requiredSlugRule(): array
    {
        return ['required', 'string', Rule::in(self::slugs())];
    }

    /**
     * schema.org Event alt türü — Google Etkinlik zengin sonuçları için doğru @type.
     */
    public static function schemaOrgEventType(?string $slug): string
    {
        $s = $slug !== null && $slug !== '' ? $slug : null;

        return match ($s) {
            'konser' => 'MusicEvent',
            'festival' => 'MusicEvent',
            'tiyatro' => 'TheaterEvent',
            'stand-up' => 'ComedyEvent',
            'workshop' => 'EducationEvent',
            'cocuk-aktiviteleri' => 'ChildrensEvent',
            default => 'Event',
        };
    }

    /**
     * Sanatçı / topluluk düğümü — MusicEvent dışında Person daha doğru.
     *
     * @return 'MusicGroup'|'Person'
     */
    public static function schemaOrgPerformerType(?string $slug): string
    {
        $s = $slug !== null && $slug !== '' ? $slug : null;

        return match ($s) {
            'konser', 'festival' => 'MusicGroup',
            default => 'Person',
        };
    }
}
