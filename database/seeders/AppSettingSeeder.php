<?php

namespace Database\Seeders;

use App\Models\AppSetting;
use App\Support\AdPlacementCatalog;
use Illuminate\Database\Seeder;

class AppSettingSeeder extends Seeder
{
    public function run(): void
    {
        $footer = [
            'brand' => 'SAHNEBUL',
            'description' => 'Türkiye genelinde mekanları, sanatçıları ve etkinlikleri keşfet.',
            'contact' => [
                'email' => 'iletisim@sahnebul.com',
                'phone' => '+90 212 111 11 11',
                'address' => 'İstanbul, Türkiye',
            ],
            'links' => [
                ['label' => 'Mekanlar', 'route' => 'venues.index'],
                ['label' => 'Sanatçılar', 'route' => 'artists.index'],
                ['label' => 'Etkinlikler', 'route' => 'events.index'],
                ['label' => 'Blog', 'route' => 'blog.index'],
                ['label' => 'İletişim', 'route' => 'contact'],
            ],
            'social' => [
                ['label' => 'Instagram', 'url' => 'https://instagram.com/sahnebul'],
                ['label' => 'X', 'url' => 'https://x.com/sahnebul'],
                ['label' => 'YouTube', 'url' => 'https://youtube.com/@sahnebul'],
            ],
            'copyright' => '© 2026 Sahnebul. Tüm hakları saklıdır.',
        ];

        AppSetting::updateOrCreate(
            ['key' => 'footer'],
            ['value' => json_encode($footer, JSON_UNESCAPED_UNICODE)]
        );

        $adsNormalized = AdPlacementCatalog::normalize([
            'top_banner' => [
                'title' => 'Bu Alan Reklam İçin Ayrıldı',
                'text' => 'Markanı binlerce etkinlik takipçisine göster.',
                'url' => 'https://sahnebul.com/reklam',
                'cta' => 'Reklam Ver',
            ],
            'sidebar_banner' => [
                'title' => 'Sponsorlu İçerik',
                'text' => 'Öne çıkan mekan ve etkinlik kampanyaları.',
                'url' => 'https://sahnebul.com/sponsor',
                'cta' => 'Detay',
            ],
        ]);

        AppSetting::updateOrCreate(
            ['key' => 'ads'],
            ['value' => json_encode($adsNormalized, JSON_UNESCAPED_UNICODE)]
        );

        $legalPages = [
            'gizlilik-politikasi' => [
                'title' => 'Gizlilik',
                'content' => "Sahnebul olarak gizliliğinizi önemsiyoruz. Bu metin, platformu kullanırken kişisel verilerinizin hangi kapsamda toplandığını, hangi amaçlarla işlendiğini ve nasıl korunduğunu açıklamak için hazırlanmıştır.\nHesap oluşturma, etkinlik kaydetme, mekan/sanatçı sahiplenme talebi oluşturma ve iletişim formlarını kullanma süreçlerinde ad-soyad, e-posta, telefon, şehir ve kullanım tercihleri gibi bilgiler toplanabilir.\nToplanan veriler; üyelik işlemlerini yürütmek, güvenli giriş sağlamak, kullanıcı deneyimini iyileştirmek, destek taleplerini yanıtlamak ve hizmet kalitesini artırmak amacıyla işlenir.\nKişisel verileriniz, yasal zorunluluklar dışında üçüncü taraflara satılmaz veya izinsiz paylaşılmaz. Teknik altyapı, barındırma, e-posta ve analitik gibi hizmet alınan iş ortakları yalnızca hizmetin yürütülmesi için gerekli ölçüde erişim sağlayabilir.\nVerileriniz, yetkisiz erişime karşı güvenlik duvarı, erişim kontrolü, şifreleme ve kayıt izleme gibi idari ve teknik tedbirlerle korunur.\nDilediğiniz zaman hesabınızla ilgili bilgi talep edebilir, verilerinizin düzeltilmesini veya silinmesini isteyebilirsiniz. Bu tür taleplerinizi iletisim@sahnebul.com adresi üzerinden bize iletebilirsiniz.\nBu metin gerektiğinde güncellenebilir. Güncel sürüm her zaman bu sayfada yayımlanır.",
            ],
            'cerez-politikasi' => [
                'title' => 'Çerez Politikası',
                'content' => "Sahnebul, ziyaretçilerimize daha iyi bir deneyim sunabilmek için çerez (cookie) teknolojilerinden yararlanır. Çerezler, tarayıcınız tarafından cihazınızda saklanan küçük metin dosyalarıdır.\nZorunlu çerezler, oturum açma ve güvenlik gibi platformun temel işlevlerinin çalışması için gereklidir.\nPerformans ve analitik çerezleri, hangi sayfaların daha çok görüntülendiğini ve kullanıcıların platformu nasıl kullandığını anlamamıza yardımcı olur.\nFonksiyonel çerezler, dil/tema tercihi gibi kişiselleştirme ayarlarınızı hatırlamak için kullanılır.\nPazarlama çerezleri, ilginizi çekebilecek içeriklerin sunulmasına destek olabilir; bu çerezler yalnızca ilgili izinler çerçevesinde çalıştırılır.\nTarayıcı ayarlarınız üzerinden çerezleri reddedebilir, silebilir veya sınırlayabilirsiniz. Ancak bazı çerezlerin devre dışı bırakılması durumunda platformun bazı özellikleri beklenen şekilde çalışmayabilir.\nÇerez tercihlerinizi dilediğiniz zaman güncelleyebilirsiniz.",
            ],
            'kvkk' => [
                'title' => 'Kişisel Verilerin Korunması',
                'content' => "Sahnebul, 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) kapsamında veri sorumlusu sıfatıyla hareket eder.\nİşlenen başlıca veri kategorileri: kimlik bilgileri, iletişim bilgileri, kullanıcı işlem bilgileri, talep/şikayet bilgileri ve teknik log kayıtlarıdır.\nKişisel veriler; açık rızanızın bulunması, sözleşmenin kurulması/ifası, hukuki yükümlülüklerin yerine getirilmesi, meşru menfaatlerin korunması gibi KVKK'nın 5. ve 6. maddelerinde belirtilen hukuki sebeplere dayanılarak işlenir.\nVerileriniz; hesap yönetimi, etkinlik/mekan/sanatçı süreçlerinin yürütülmesi, güvenlik kontrolleri, raporlama ve müşteri destek süreçleri amaçlarıyla sınırlı olarak kullanılmaktadır.\nKVKK'nın 11. maddesi kapsamında; verilerinizin işlenip işlenmediğini öğrenme, işleme amacını öğrenme, düzeltilmesini veya silinmesini talep etme, itiraz etme ve zarar halinde tazminat talep etme haklarına sahipsiniz.\nBaşvurularınızı kimlik doğrulayıcı bilgilerinizle birlikte iletisim@sahnebul.com adresine e-posta yoluyla iletebilirsiniz. Talepleriniz, mevzuatta öngörülen süreler içinde sonuçlandırılır.",
            ],
            'ticari-elektronik-ileti' => [
                'title' => 'Ticari Elektronik İleti Bilgilendirme Metni',
                'content' => "Sahnebul, kampanya, duyuru, etkinlik önerisi ve bilgilendirme içeriklerini; yalnızca açık rıza vermeniz halinde e-posta, SMS veya benzeri elektronik iletişim kanallarıyla iletebilir.\nTicari elektronik iletiler, ilgili mevzuata uygun şekilde gönderilir ve gönderim kayıtları gerektiğinde ispat yükümlülüğü kapsamında saklanabilir.\nİleti almayı kabul etmeniz, hizmet kullanımınız için zorunlu değildir.\nDilediğiniz anda hesabınızdaki iletişim tercihlerini güncelleyebilir veya tarafınıza gönderilen iletilerdeki \"abonelikten çık\" seçeneği üzerinden onayınızı geri çekebilirsiniz.\nOnayın geri çekilmesi, geri çekme tarihinden sonraki gönderimleri etkiler; önceki yasal gönderimler açısından geriye dönük sonuç doğurmaz.\nSorularınız veya talepleriniz için iletisim@sahnebul.com adresi üzerinden bizimle iletişime geçebilirsiniz.",
            ],
            'sss' => [
                'title' => 'Sıkça Sorulan Sorular',
                'content' => "Sahnebul nedir?\nSahnebul; mekan, sanatçı ve etkinlikleri keşfetmenizi, takip etmenizi ve platform içindeki içerikleri yönetmenizi sağlayan bir etkinlik platformudur.\nMekan veya sanatçı profilini nasıl sahiplenebilirim?\nİlgili profil sayfasındaki \"Bu profil size mi ait?\" veya \"Bu işletme sizin mi?\" alanından talep oluşturabilirsiniz. Talebiniz admin incelemesi sonrasında sonuçlandırılır.\nEtkinlik eklemek için ne gerekiyor?\nEtkinlik ekleme yetkileri üyelik türüne ve hesap durumuna göre değişebilir. Gerekli durumlarda Gold üyelik ve hesap doğrulaması aranır.\nEtkinlikler neden hemen yayınlanmıyor?\nPlatform güvenliği ve içerik kalitesi için bazı içerikler yönetici onayı sonrası yayınlanır.\nBilet iade/değişim işlemleri nasıl yapılır?\nBilet iade/değişim koşulları etkinlik organizatörüne ve satış politikasına göre farklılık gösterebilir.\nHesabımı nasıl silebilirim?\nProfil ayarlarından hesabınızı kapatma talebi oluşturabilir veya destek ekibiyle iletişime geçebilirsiniz.\nDestek ekibine nasıl ulaşırım?\nTüm destek talepleriniz için iletisim@sahnebul.com adresine e-posta gönderebilirsiniz.",
            ],
        ];

        AppSetting::updateOrCreate(
            ['key' => 'legal_pages'],
            ['value' => json_encode($legalPages, JSON_UNESCAPED_UNICODE)]
        );

        $smtp = [
            'mailer' => 'smtp',
            'host' => '127.0.0.1',
            'port' => 1025,
            'username' => null,
            'password' => null,
            'encryption' => null,
            'from_address' => 'noreply@sahnebul.com',
            'from_name' => 'Sahnebul',
        ];

        AppSetting::updateOrCreate(
            ['key' => 'smtp'],
            ['value' => json_encode($smtp, JSON_UNESCAPED_UNICODE)]
        );
    }
}

