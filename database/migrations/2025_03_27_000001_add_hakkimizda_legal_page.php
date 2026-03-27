<?php

use App\Models\AppSetting;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /**
     * Mevcut kurulumlara Hakkımızda statik sayfasını ekler (admin İçerik sekmesinden düzenlenebilir).
     */
    public function up(): void
    {
        $row = AppSetting::query()->where('key', 'legal_pages')->first();
        if ($row === null || ! is_string($row->value) || $row->value === '') {
            return;
        }

        $pages = json_decode($row->value, true);
        if (! is_array($pages) || isset($pages['hakkimizda'])) {
            return;
        }

        $pages['hakkimizda'] = [
            'title' => 'Hakkımızda',
            'content' => <<<'TXT'
Sahnebul’u, canlı müzik ve sahne kültürünü seven herkesin hayatını kolaylaştırmak için kurguladık. Etkinlik ararken dağılan duyurular, eksik bilgiler ve “nerede, ne zaman?” sorusuna yanıt bulmak çoğu zaman yorucu olabiliyor; sanatçılar ve mekânlar için de görünürlük ile doğru kitleye ulaşmak ayrı bir emek gerektiriyor.

Türkiye’de mekânları, sanatçıları ve güncel etkinlikleri tek bir yerde, tutarlı bir deneyimle sunan bir yapı eksikliğini gördük. Bu boşluğu doldurmak ve hem izleyici hem sahne tarafına net bir omurga sunmak istedik.

İzleyiciler için hedefimiz basit: İlgilendiğiniz konser, kulüp gecesi veya sahne etkinliğine daha rahat ulaşmanız; tarih, şehir ve mekân bilgisini net görebilmeniz, keşfetmenin dağınık kaynaklara bölünmemesi. Yakınınızdaki yayınları bulmak ve takip etmek daha sade bir akışa oturmalı.

Sanatçılar ve mekân sahipleri için ise profillerin ve etkinliklerin yönetilebilir olması, programın doğru şekilde duyurulması ve sahnenin erişilebilir hale gelmesi kritik. Sahnebul ile bu süreçleri tek platformda toplamayı, “bir yerde paylaştım, bir yerde kayboldu” hissini azaltmayı hedefliyoruz.

Bugün olduğu gibi yarın da geri bildirimlerinizle birlikte gelişmeye devam edeceğiz. Türkiye’nin canlı kültür haritasını daha kullanışlı kılmak için buradayız.

Kurucu: Erkan Ülker
TXT
        ];

        AppSetting::query()->where('key', 'legal_pages')->update([
            'value' => json_encode($pages, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        ]);
    }

    public function down(): void
    {
        $row = AppSetting::query()->where('key', 'legal_pages')->first();
        if ($row === null || ! is_string($row->value) || $row->value === '') {
            return;
        }

        $pages = json_decode($row->value, true);
        if (! is_array($pages) || ! isset($pages['hakkimizda'])) {
            return;
        }

        unset($pages['hakkimizda']);

        AppSetting::query()->where('key', 'legal_pages')->update([
            'value' => json_encode($pages, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        ]);
    }
};
