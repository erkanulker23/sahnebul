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
                'eyebrow' => 'Konser · etkinlik · mekân',
                'headline' => 'Konser, mekân ve sanatçı',
                'headline_accent' => 'tek platformda',
                'body' => 'Türkiye genelinde konser salonlarından kulüplere, açık hava alanlarına kadar mekân profillerini keşfedin; etkinlik takvimlerine ve sanatçı sayfalarına bağlanın. Şehir seçin, arama yapın, çıkmadan önce mekânı tanıyın.',
            ],
            [
                'eyebrow' => 'Yaklaşan gösteriler',
                'headline' => 'Etkinlik takvimine',
                'headline_accent' => 'tek bakışta',
                'body' => 'Önümüzdeki günlerdeki konserleri tarih ve şehre göre tarayın; mekân detaylarından bilet ve iletişim bilgisine geçin.',
            ],
            [
                'eyebrow' => 'Sanatçı dünyası',
                'headline' => 'Profiller, türler',
                'headline_accent' => 've sahneler',
                'body' => 'Sevdiğiniz sanatçıların sayfalarını açın; yaklaşan performansları görün, mekân geçmişine göz atın ve yeni isimler keşfedin.',
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
                'eyebrow' => 'Mekân rehberi',
                'headline' => 'Size uygun',
                'headline_accent' => 'mekânı bulun',
                'body' => 'Şehir, kategori veya anahtar kelimeyle arayın; kapasite, konum ve yaklaşan etkinliklere göz atın. Yorumlar ve iletişim bilgileri tek sayfada.',
            ],
            [
                'eyebrow' => 'Filtrele ve karşılaştır',
                'headline' => 'Kulüpten konser salonuna',
                'headline_accent' => 'geniş seçenek',
                'body' => 'Mekân türüne göre listeleyin; harita ve adres bilgileriyle ulaşımı planlayın, yoğun etkinlik dönemlerini önceden görün.',
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
