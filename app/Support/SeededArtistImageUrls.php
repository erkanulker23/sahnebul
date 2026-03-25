<?php

namespace App\Support;

/**
 * Seed ve artists:fetch-images için ortak: bilinen slug → doğrudan görsel URL (çoğu Wikimedia).
 * Böylece canlıda sadece db:seed ile picsum yerine gerçek portreler kullanılabilir.
 */
final class SeededArtistImageUrls
{
    /**
     * @return array<string, string>
     */
    public static function bySlug(): array
    {
        return [
            'muslum-gurses' => 'https://upload.wikimedia.org/wikipedia/commons/f/ff/Muslum_Gurses.jpg',
            'duman' => 'https://upload.wikimedia.org/wikipedia/commons/0/02/Duman_Grubu.jpg',
            'teoman' => 'https://upload.wikimedia.org/wikipedia/commons/8/88/Teoman_P1360225.jpg',
            'mor-ve-otesi' => 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Mor_ve_%C3%96tesi%2C_Turkey%2C_Eurovision_2008.jpg',
            'sebnem-ferah' => 'https://upload.wikimedia.org/wikipedia/commons/7/70/Sebnem_Ferah_VF.jpg',
            'can-gox' => 'https://upload.wikimedia.org/wikipedia/commons/a/ae/Can_Gox_-_27.6.17.jpg',
            'imer-demirer' => 'https://upload.wikimedia.org/wikipedia/commons/0/02/%C4%B0mer_Demirer.jpg',
            'ayna' => 'https://upload.wikimedia.org/wikipedia/commons/0/05/Erhan_G%C3%BClery%C3%BCz.jpg',
            'gripin' => 'https://upload.wikimedia.org/wikipedia/commons/4/49/Gripin_-_Kakt%C3%BCs_Kafe_Bar_-_31.12.09.jpg',
            'athena' => 'https://upload.wikimedia.org/wikipedia/commons/9/9f/Athena_Band%28G%C3%B6khan_%C3%96zo%C4%9Fuz%29.JPG',
            'manga' => 'https://upload.wikimedia.org/wikipedia/commons/6/6d/MaNga_at_Eurovision_2010.jpg',
            'hayko-cepkin' => 'https://upload.wikimedia.org/wikipedia/commons/8/8e/Hayko_Cepkin_2013.jpg',
            'sezen-aksu' => 'https://upload.wikimedia.org/wikipedia/commons/c/c4/Sezen_Aksu_2013.jpg',
            'tarkan' => 'https://upload.wikimedia.org/wikipedia/commons/2/2b/Tarkan_2006.jpg',
            'sertab-erener' => 'https://upload.wikimedia.org/wikipedia/commons/9/96/Sertab_Erener_2011.jpg',
            'pentagram' => 'https://upload.wikimedia.org/wikipedia/commons/7/7a/Pentagram_%28band%29_2011.jpg',
            'neset-ertas' => 'https://upload.wikimedia.org/wikipedia/commons/4/42/Ne%C5%9Fet_Erta%C5%9F.jpg',
            'asik-veysel' => 'https://upload.wikimedia.org/wikipedia/commons/5/51/A%C5%9F%C4%B1k_Veysel.jpg',
            'orhan-gencebay' => 'https://upload.wikimedia.org/wikipedia/commons/8/8e/Orhan_Gencebay_2011.jpg',
            'bulent-ersoy' => 'https://upload.wikimedia.org/wikipedia/commons/1/18/B%C3%BClent_Ersoy_2012.jpg',
            'zeki-muren' => 'https://upload.wikimedia.org/wikipedia/commons/4/4a/Zeki_M%C3%BCren_2.jpg',
            'ajda-pekkan' => 'https://upload.wikimedia.org/wikipedia/commons/6/68/Ajda_Pekkan_2011.jpg',
            'ibrahim-tatlises' => 'https://upload.wikimedia.org/wikipedia/commons/3/3e/%C4%B0brahim_Tatl%C4%B1ses_2013.jpg',
            'ceza' => 'https://upload.wikimedia.org/wikipedia/commons/0/0a/Ceza_2011.jpg',
        ];
    }
}
