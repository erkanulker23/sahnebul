<?php

namespace App\Support;

use Illuminate\Support\Str;

/**
 * Şehir seç sayfası için il bazlı ilçe listesi (venue / konum eşlemesi).
 */
final class SehirSecCityDistricts
{
    /**
     * @var array<string, list<string>>
     */
    private const LABELS = [
        'istanbul' => [
            'Adalar', 'Arnavutköy', 'Ataşehir', 'Avcılar', 'Bağcılar', 'Bahçelievler', 'Bakırköy',
            'Başakşehir', 'Bayrampaşa', 'Beşiktaş', 'Beykoz', 'Beylikdüzü', 'Beyoğlu', 'Büyükçekmece',
            'Çatalca', 'Çekmeköy', 'Esenler', 'Esenyurt', 'Eyüpsultan', 'Fatih', 'Gaziosmanpaşa',
            'Güngören', 'Kadıköy', 'Kağıthane', 'Kartal', 'Küçükçekmece', 'Maltepe', 'Pendik',
            'Sancaktepe', 'Sarıyer', 'Silivri', 'Sultanbeyli', 'Sultangazi', 'Şile', 'Şişli', 'Tuzla',
            'Ümraniye', 'Üsküdar', 'Zeytinburnu',
        ],
        'ankara' => [
            'Akyurt', 'Altındağ', 'Ayaş', 'Bala', 'Beypazarı', 'Çamlıdere', 'Çankaya', 'Çubuk',
            'Elmadağ', 'Etimesgut', 'Evren', 'Gölbaşı', 'Güdül', 'Haymana', 'Kahramankazan', 'Kalecik',
            'Keçiören', 'Kızılcahamam', 'Mamak', 'Nallıhan', 'Polatlı', 'Pursaklar', 'Sincan', 'Şereflikoçhisar',
            'Yenimahalle',
        ],
        'izmir' => [
            'Aliağa', 'Balçova', 'Bayındır', 'Bayraklı', 'Bergama', 'Beydağ', 'Bornova', 'Buca',
            'Çeşme', 'Çiğli', 'Dikili', 'Foça', 'Gaziemir', 'Güzelbahçe', 'Karabağlar', 'Karaburun',
            'Karşıyaka', 'Kemalpaşa', 'Kınık', 'Kiraz', 'Konak', 'Menderes', 'Menemen', 'Narlıdere',
            'Ödemiş', 'Seferihisar', 'Selçuk', 'Tire', 'Torbalı', 'Urla',
        ],
        'antalya' => [
            'Akseki', 'Aksu', 'Alanya', 'Demre', 'Döşemealtı', 'Elmalı', 'Finike', 'Gazipaşa',
            'Gündoğmuş', 'İbradı', 'Kaş', 'Kemer', 'Kepez', 'Konyaaltı', 'Korkuteli', 'Kumluca',
            'Manavgat', 'Muratpaşa', 'Serik',
        ],
        'bursa' => [
            'Büyükorhan', 'Gemlik', 'Gürsu', 'Harmancık', 'İnegöl', 'İznik', 'Karacabey', 'Keles',
            'Kestel', 'Mudanya', 'Mustafakemalpaşa', 'Nilüfer', 'Orhaneli', 'Orhangazi', 'Osmangazi',
            'Yenişehir', 'Yıldırım',
        ],
        'eskisehir' => [
            'Alpu', 'Beylikova', 'Çifteler', 'Günyüzü', 'Han', 'İnönü', 'Mahmudiye', 'Mihalgazi',
            'Mihalıççık', 'Odunpazarı', 'Sarıcakaya', 'Seyitgazi', 'Sivrihisar', 'Tepebaşı',
        ],
    ];

    /**
     * @return list<array{slug: string, label: string}>
     */
    public static function optionsForCity(string $citySlug): array
    {
        $labels = self::LABELS[$citySlug] ?? [];
        $out = [];
        foreach ($labels as $label) {
            $slug = Str::slug($label);
            if ($slug === '') {
                continue;
            }
            $out[] = ['slug' => $slug, 'label' => $label];
        }

        return $out;
    }

    public static function labelForSlug(string $citySlug, string $districtSlug): ?string
    {
        foreach (self::optionsForCity($citySlug) as $opt) {
            if ($opt['slug'] === $districtSlug) {
                return $opt['label'];
            }
        }

        return null;
    }

    public static function isValidDistrictSlug(string $citySlug, string $districtSlug): bool
    {
        return self::labelForSlug($citySlug, $districtSlug) !== null;
    }

    /**
     * OSM / Nominatim adres parçalarından ilçe slug'ı.
     *
     * @param  array<string, mixed>  $address
     */
    public static function matchSlugFromAddressParts(string $citySlug, array $address): ?string
    {
        $candidates = array_filter([
            $address['suburb'] ?? null,
            $address['city_district'] ?? null,
            $address['neighbourhood'] ?? null,
            $address['quarter'] ?? null,
            $address['town'] ?? null,
            $address['village'] ?? null,
        ], fn ($v) => is_string($v) && trim($v) !== '');

        $byLength = self::optionsForCity($citySlug);
        usort($byLength, fn ($a, $b) => mb_strlen($b['label'], 'UTF-8') <=> mb_strlen($a['label'], 'UTF-8'));

        foreach ($candidates as $name) {
            $name = trim((string) $name);
            foreach ($byLength as $opt) {
                if (mb_stripos($name, $opt['label'], 0, 'UTF-8') !== false) {
                    return $opt['slug'];
                }
                if (mb_stripos($opt['label'], $name, 0, 'UTF-8') !== false && mb_strlen($name, 'UTF-8') >= 3) {
                    return $opt['slug'];
                }
            }
        }

        return null;
    }

    public static function matchSlugFromVenueLine(?string $venueLine, string $citySlug): ?string
    {
        if ($venueLine === null || trim($venueLine) === '') {
            return null;
        }

        $byLength = self::optionsForCity($citySlug);
        usort($byLength, fn ($a, $b) => mb_strlen($b['label'], 'UTF-8') <=> mb_strlen($a['label'], 'UTF-8'));

        $hay = mb_strtolower($venueLine, 'UTF-8');
        foreach ($byLength as $opt) {
            $needle = mb_strtolower($opt['label'], 'UTF-8');
            if (mb_strpos($hay, $needle, 0, 'UTF-8') !== false) {
                return $opt['slug'];
            }
        }

        return null;
    }
}
