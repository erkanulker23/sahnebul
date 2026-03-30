<?php

namespace App\Support;

/**
 * Ana sayfa (/) ve mekân listesi hero slider metinleri — panelden boş bırakılırsa bu varsayılanlar kullanılır.
 */
final class HomeHeroSlideDefaults
{
    public const MAX_SLIDES = 3;

    /**
     * @return list<array{eyebrow: string, headline: string, headline_accent: string, body: string}>
     */
    public static function homeDefaults(): array
    {
        return [
            [
                'eyebrow' => 'Konumuna göre keşif',
                'headline' => 'Nereye mi',
                'headline_accent' => 'gidelim?',
                'body' => 'Yakınınızdaki konser ve etkinlikleri keşfedin. Şehrinizi seçin veya canlı haritada bu akşam nerede hareket olduğuna bakın; mekânlara, programa ve yol tarifine tek dokunuşla geçin.',
            ],
            [
                'eyebrow' => 'Etkinlik takvimi',
                'headline' => 'Bugün ve önümüzdeki günler',
                'headline_accent' => 'tek listede',
                'body' => 'Tarih ve şehre göre tarayın; yaklaşan gösterileri görün, mekân sayfalarından detay ve iletişime ulaşın.',
            ],
            [
                'eyebrow' => 'Mekân ve sanatçı',
                'headline' => 'Sahne öncesi hazırlık',
                'headline_accent' => 'kolayca',
                'body' => 'Mekân profilleri, kapasite ve tarz; sanatçı sayfalarında yaklaşan tarihler. Çıkmadan önce programı ve mekânı tanıyın.',
            ],
        ];
    }

    /**
     * @return list<array{eyebrow: string, headline: string, headline_accent: string, body: string}>
     */
    public static function venuesDefaults(): array
    {
        return [
            [
                'eyebrow' => 'Yakındaki etkinlikler',
                'headline' => 'Nereye mi',
                'headline_accent' => 'gidelim?',
                'body' => 'Yakınınızdaki konser ve etkinliklere göre mekân keşfedin. Şehir, kategori veya anahtar kelimeyle arayın; yaklaşan programa bakın, yorum ve iletişim bilgisine tek sayfadan ulaşın.',
            ],
            [
                'eyebrow' => 'Mekân rehberi',
                'headline' => 'Kulüpten konser salonuna',
                'headline_accent' => 'geniş seçenek',
                'body' => 'Mekân türüne göre listeleyin; harita ve adres ile ulaşımı planlayın, yoğun etkinlik dönemlerini önceden görün.',
            ],
            [
                'eyebrow' => 'Güvenle keşfet',
                'headline' => 'Yorumlar ve detaylar',
                'headline_accent' => 'yanınızda',
                'body' => 'Deneyim paylaşımlarına göz atın, kapasite ve olanakları inceleyin; iletişim ve rezervasyon için tek tıkla mekâna ulaşın.',
            ],
        ];
    }

    /**
     * @param  list<array<string, mixed>>|null  $fromDb
     * @param  list<array{eyebrow: string, headline: string, headline_accent: string, body: string}>  $defaults
     * @return list<array{eyebrow: string, headline: string, headline_accent: string, body: string}>
     */
    public static function resolveBlocks(?array $fromDb, array $defaults): array
    {
        $out = [];
        for ($i = 0; $i < self::MAX_SLIDES; $i++) {
            $d = $defaults[$i] ?? ['eyebrow' => '', 'headline' => '', 'headline_accent' => '', 'body' => ''];
            $row = is_array($fromDb[$i] ?? null) ? $fromDb[$i] : [];
            $out[] = [
                'eyebrow' => self::field($row, 'eyebrow', $d['eyebrow']),
                'headline' => self::field($row, 'headline', $d['headline']),
                'headline_accent' => self::field($row, 'headline_accent', $d['headline_accent']),
                'body' => self::field($row, 'body', $d['body']),
            ];
        }

        return $out;
    }

    /**
     * @param  array<string, mixed>  $row
     */
    private static function field(array $row, string $key, string $fallback): string
    {
        if (! isset($row[$key]) || ! is_string($row[$key])) {
            return $fallback;
        }
        $t = trim($row[$key]);

        return $t !== '' ? $t : $fallback;
    }
}
