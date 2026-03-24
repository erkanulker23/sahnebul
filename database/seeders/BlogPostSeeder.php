<?php

namespace Database\Seeders;

use App\Models\BlogPost;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class BlogPostSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::query()->where('email', 'admin@sahnebul.test')->first();
        if (! $admin) {
            return;
        }

        $base = Carbon::now()->subDays(45);

        foreach (array_merge(self::postsBatchOne(), self::postsBatchTwo()) as $i => $row) {
            $publishedAt = $base->copy()->addDays($i * 4);

            BlogPost::updateOrCreate(
                ['slug' => $row['slug']],
                [
                    'author_id' => $admin->id,
                    'title' => $row['title'],
                    'excerpt' => $row['excerpt'],
                    'content' => $row['content'],
                    'cover_image' => null,
                    'status' => 'published',
                    'published_at' => $publishedAt,
                ]
            );
        }
    }

    /**
     * @return array<int, array{slug: string, title: string, excerpt: string, content: string}>
     */
    private static function postsBatchOne(): array
    {
        return [
            [
                'slug' => 'sahnebul-nedir-canli-muzik-ve-sahne-kesfi',
                'title' => 'Sahnebul Nedir? Canlı Müzik ve Sahne Keşfi Tek Platformda',
                'excerpt' => 'Türkiye genelinde mekanları, sanatçıları ve etkinlikleri tek çatı altında keşfetmek için tasarlanan Sahnebul’un sunduğu deneyimi özetliyoruz.',
                'content' => <<<'HTML'
<p>Sahnebul, Türkiye’de canlı performans kültürünü dijitalleştirmek için kurulmuş bir keşif ve rezervasyon platformudur. Amacımız; izleyicinin doğru mekanda doğru geceyi bulmasını, sanatçıların ve mekanların ise görünür olmasını kolaylaştırmaktır.</p>
<h2>Neden tek platform?</h2>
<p>Şehirden şehre dağılmış duyurular, sosyal medya gönderileri ve sözlü tavsiyeler yerine; filtrelenmiş mekan listeleri, etkinlik takvimi ve tutarlı profil bilgileri sunuyoruz. Böylece “bu akşam nerede konser var?” sorusuna tek adres üzerinden yanıt arayabilirsiniz.</p>
<h2>Kimler için?</h2>
<p>Canlı müzikseverlerden organizatörlere, mekan sahiplerinden sanatçı ekiplerine kadar sahne ekosisteminin tüm halkalarına hitap edecek şekilde tasarlanan yapı, zamanla genişleyen paneller ve özelliklerle desteklenmektedir.</p>
<p>Sahnebul ile tanıştığınızda önce keşfetmek, sonra yorumları okumak ve uygunsa rezervasyon adımlarına geçmek doğal bir akış haline gelir.</p>
HTML,
            ],
            [
                'slug' => 'ilk-konseriniz-icin-mekan-secimi-rehber',
                'title' => 'İlk Konseriniz İçin Mekan Seçimi: Pratik Rehber',
                'excerpt' => 'İlk canlı deneyiminizde ses, görüş ve atmosfer beklentilerinizi netleştirerek doğru mekanı seçmenize yardımcı olacak maddeler.',
                'content' => <<<'HTML'
<p>İlk kez bir konser veya canlı performans gecesine çıkıyorsanız, mekan seçimi heyecanı kadar biraz da endişe taşımanız doğaldır. Doğru tercih; akşamın hatırasını güzelleştirir.</p>
<h2>Kapasite ve düzen</h2>
<p>İntim bir kulüp mü yoksa daha geniş bir salon mu istediğinize karar verin. Küçük mekanlarda sahneye yakınlık artar; büyük salonlarda ise ses mühendisliği ve görüş açıları farklı planlanır.</p>
<h2>Tür ve program</h2>
<p>Aynı mekan farklı günlerde farklı türlerde etkinlik açabilir. Platform üzerinden etkinlik detaylarını ve mümkünse önceki yorumları okuyarak beklentinizle örtüşüp örtüşmediğini kontrol edin.</p>
<h2>Ulaşım ve dönüş</h2>
<p>Gece sonu toplu taşıma veya taksi erişimini önceden düşünmek, özellikle ilk deneyimde stresi azaltır. Mekanın konumu, Sahnebul’daki şehir ve adres bilgileriyle birlikte değerlendirilmelidir.</p>
HTML,
            ],
            [
                'slug' => 'yorumlari-nasil-okumali-guvenilir-degerlendirme',
                'title' => 'Yorumlar Sizi Aldatmasın: Değerlendirmeleri Nasıl Okumalısınız?',
                'excerpt' => 'Tek yıldızlı ve beş yıldızlı yorumların arasında gerçekten işinize yarayacak sinyalleri ayırt etmek için bir çerçeve.',
                'content' => <<<'HTML'
<p>Kullanıcı yorumları güçlü bir rehber olabilir; ancak bağlam olmadan okunduğunda yanıltıcı da olabilir. İşte sağlıklı okuma için birkaç ilke.</p>
<h2>Tarih ve bağlam</h2>
<p>Mekanın bir yıl önceki ses sistemi ile bugünkü durumu aynı olmayabilir. Mümkünse son aylardaki değerlendirmelere daha fazla ağırlık verin.</p>
<h2>Özgül detaylar</h2>
<p>“Kötüydü” yerine “bar sırası çok uzundu, sahne 22:30’da başladı” gibi somut bilgi veren yorumlar, sizin önceliklerinizle eşleştiğinde daha değerlidir.</p>
<h2>Denge</h2>
<p>Aşırı övgü veya öfke tek başına genelleme yapmayın. Birkaç farklı puan dağılımını birlikte değerlendirmek daha güvenilir bir tablo çıkarır.</p>
<p>Sahnebul’da bıraktığınız yapıcı yorumlar da gelecekteki izleyicilere aynı şekilde yardımcı olur.</p>
HTML,
            ],
            [
                'slug' => 'turkiyede-sahne-kulturu-sehir-dinamikleri',
                'title' => 'Şehir Şehir Türkiye: Sahne Kültürü ve Yerel Dinamikler',
                'excerpt' => 'İstanbul’dan İzmir’e, Ankara’dan sahil kentlerine canlı müzik ekosisteminin çeşitliliğine kısa bir bakış.',
                'content' => <<<'HTML'
<p>Türkiye’nin farklı şehirlerinde sahne kültürü aynı formülle işlemez. Metropollerde haftanın her günü seçenek artarken, daha küçük merkezlerde belirli günler ve mekanlar öne çıkar.</p>
<h2>Yoğunluk ve çeşitlilik</h2>
<p>Büyük şehirlerde alternatif, caz, elektronik ve geleneksel türler için ayrı kulvarlar oluşur. Bu çeşitlilik, keşif için idealdir fakat karar yorgunluğunu da beraberinde getirir; filtreleri kullanmak burada devreye girer.</p>
<h2>Yerel sahneler</h2>
<p>Anadolu’daki birçok ilde son yıllarda küçük ama tutkulu mekanlar açıldı. Bu mekanlar bazen ulusal turnelerin durakları, bazen de tamamen yerel prodüksiyonların evidir.</p>
<p>Sahnebul’un şehir bazlı listeleri, seyahat planınıza veya hafta sonu kaçamağınıza uygun etkinlikleri bulmanıza yardımcı olmak için tasarlanmıştır.</p>
HTML,
            ],
            [
                'slug' => 'sanatci-profilleri-sahne-oncesi-hazirlik',
                'title' => 'Sanatçı Profilleri: Sahne Öncesi Hazırlıkta Nelere Bakmalısınız?',
                'excerpt' => 'Bir geceye çıkmadan önce sanatçı veya grubun profilinden çıkarabileceğiniz pratik ipuçları.',
                'content' => <<<'HTML'
<p>Doğru sanatçı profili; dinlediğiniz örnek kayıtlar kadar, canlı performansın ruhunu anlamanıza da yardımcı olur.</p>
<h2>Repertuar ve tarz</h2>
<p>Profilde belirtilen tür etiketleri ile kısa biyografi, o geceki set beklentinizi şekillendirir. Elektrikli mi akustik mi gibi ipuçları bazen etkinlik açıklamasında yer alır.</p>
<h2>Geçmiş etkinlikler</h2>
<p>Daha önce hangi mekanlarda sahne alındığını görmek, size “benzeri bir atmosferi seviyorum” veya “farklı bir deneyim arıyorum” kararını verdirir.</p>
<h2>Takip ve duyurular</h2>
<p>Platform üzerinden güncel etkinliklere göz atmak, bir sonraki buluşmayı planlamanızı kolaylaştırır. Sanatçıyı takip etmek, boşta kalan bir cuma gecesini doldurmanın en iyi yollarından biridir.</p>
HTML,
            ],
        ];
    }

    /**
     * @return array<int, array{slug: string, title: string, excerpt: string, content: string}>
     */
    private static function postsBatchTwo(): array
    {
        return [
            [
                'slug' => 'rezervasyon-oncesi-tarih-kapasite-teknik',
                'title' => 'Rezervasyon Yapmadan Önce: Tarih, Kapasite ve Teknik Notlar',
                'excerpt' => 'Rezervasyon adımına gelmeden kontrol etmeniz gereken maddeler; sürprizleri azaltır, gecenin akışını iyileştirir.',
                'content' => <<<'HTML'
<p>Rezervasyon, özellikle sınırlı kontenjanlı gecelerde hayati bir adımdır. Birkaç dakikalık kontrol, sonra yaşanabilecek hayal kırıklıklarını önler.</p>
<h2>Tarih ve saat</h2>
<p>Kapı açılışı, destek sanatçı ve ana saat bilgilerini tek seferde not edin. İş çıkışı trafiği veya şehir içi mesafe, varış saatinizi doğrudan etkiler.</p>
<h2>Kontenjan ve masa düzeni</h2>
<p>Ayakta mı oturmalı mı, balkon veya zemin gibi detaylar deneyimi değiştirir. Mümkünse mekan düzeni hakkında kısa bir araştırma yapın.</p>
<h2>Teknik beklenti</h2>
<p>Özel bir doğum günü veya kurumsal davet düşünüyorsanız, mekanla doğrudan iletişim kurarak teknik gereksinimleri (mikrofon, projeksiyon vb.) netleştirmek faydalıdır.</p>
<p>Sahnebul üzerinden başlayan süreç, bu tür soruları yöneltmek için iyi bir başlangıç noktasıdır.</p>
HTML,
            ],
            [
                'slug' => 'canli-performans-gecesinde-izleyici-etiketi',
                'title' => 'Canlı Performans Gecesinde İzleyici Etiketi: Kısa Bir Hatırlatma',
                'excerpt' => 'Hem sanatçıya hem salondaki diğer misafirlere saygı çerçevesinde küçük ama etkili davranış önerileri.',
                'content' => <<<'HTML'
<p>Canlı müzik paylaşımlı bir deneyimdir. Sahnedeki enerji ile salonun uyumu, herkesin katkısıyla oluşur.</p>
<h2>Ses ve dikkat</h2>
<p>Konuşmak için en uygun anları seçin; özellikle akustik veya yumuşak dinamikli parçalarda telefon ve sohbet, hem kayıt kalitesini hem odaklanmayı bozar.</p>
<h2>Alan ve güvenlik</h2>
<p>Kalabalıkta yer açmak, düşme riski olan alanlarda itişmeden ilerlemek temel nezaket kurallarındandır. Güvenlik ve mekan personelinin uyarılarına uyun.</p>
<h2>Destek</h2>
<p>Beğendiğiniz bir performansı alkışlamak, merch alanına uğramak veya dijital olarak paylaşmak sanatçıya doğrudan geri bildirim verir.</p>
<p>Küçük hareketler, yerel sahnelerin ayakta kalmasına katkı sağlar.</p>
HTML,
            ],
            [
                'slug' => 'etkinlik-takvimi-filtre-hatirlatici-ipuclari',
                'title' => 'Etkinlik Takviminde Kaybolmamak: Filtre ve Planlama İpuçları',
                'excerpt' => 'Çok sayıda etkinlik arasında size uygun geceleri seçmek için pratik bir yaklaşım.',
                'content' => <<<'HTML'
<p>Takvim dolu olduğunda “hepsini kaçırıyorum” hissi yaygındır. Oysa birkaç filtre ve alışkanlık işinizi kolaylaştırır.</p>
<h2>Öncelik sırası</h2>
<p>Ayda bir “mutlaka gidilecek” gecesi ile haftalık “uygun olursa” gecelerini ayırın. Böylece bütçe ve enerjinizi dağıtmazsınız.</p>
<h2>Tür ve şehir</h2>
<p>Önce ilgi alanınıza göre daraltın, sonra şehir veya semt seçin. Bazen komşu ildeki bir etkinlik, hafta sonu kaçamağı için mükemmel bir bahane olur.</p>
<h2>Hatırlatma</h2>
<p>Bilet veya rezervasyon gerektiren gecelerde takviminize hemen not düşmek ve hatırlatıcı kurmak, son dakika koşuşturmasını azaltır.</p>
<p>Sahnebul’daki etkinlik listeleri, bu planlamayı tek bakışta yapmanıza yardımcı olacak şekilde düzenlenir.</p>
HTML,
            ],
            [
                'slug' => 'kucuk-sahne-buyuk-deneyim-indie-mekanlar',
                'title' => 'Küçük Sahne, Büyük Deneyim: Indie ve Alternatif Mekanların Yeri',
                'excerpt' => 'Büyük festivaller kadar ses getirmeyen ama kültürü besleyen küçük mekanların avantajları.',
                'content' => <<<'HTML'
<p>Dev sahneler ve festivaller görkemlidir; fakat birçok sanatçı ve dinleyici için “asıl büyü” küçük mekanlarda başlar.</p>
<h2>Yakınlık</h2>
<p>200 kişilik salonda hem sanatçıyı hem diğer dinleyicileri hissetmek farklı bir bağ kurar. Her performans bir keşif gecesine dönüşebilir.</p>
<h2>Yerel ekonomi</h2>
<p>Küçük mekanlar genelde yerel içecek, personel ve tedarik zinciriyle çalışır. Bilet veya içki harcaması doğrudan o mahallenin yaşamasına katkıdır.</p>
<h2>Keşif</h2>
<p>Henüz listelerde büyük puntolarla yer almayan isimler, bu sahnelerde kendilerini deneyebilir. Bir akşam çıktığınız “bilinmeyen” grup, bir yıl sonra ana sahneye taşınabilir.</p>
<p>Sahnebul, farklı ölçekteki mekanları bir arada listelemeyi hedefler; böylece sadece büyük isimleri değil, yerel üretimi de keşfedebilirsiniz.</p>
HTML,
            ],
            [
                'slug' => 'mekan-sahipleri-icin-dijital-gorunurluk',
                'title' => 'Mekan Sahipleri İçin Dijital Görünürlük Neden Kritik?',
                'excerpt' => 'Boş masa ve dolu salon arasındaki farkı artıran şeffaf çevrimiçi varlığın önemi.',
                'content' => <<<'HTML'
<p>Bir mekanın fiziksel konumu kadar dijitaldeki görünürlüğü de doldurulabilirliği belirler. Potansiyel misafir, önce ekranda sizi bulur.</p>
<h2>Güncel bilgi</h2>
<p>Çalışma saatleri, kapasite, ses düzeni ve erişilebilirlik gibi bilgiler tutarlı olduğunda yanlış beklenti ve olumsuz yorum riski azalır.</p>
<h2>Güven</h2>
<p>Profesyonel fotoğraflar, net etkinlik tarihleri ve iptal politikası gibi şeffaf içerikler, ilk kez gelen misafirin kararını hızlandırır.</p>
<h2>Topluluk</h2>
<p>Düzenli etkinlik takvimi ve geri bildirime açık bir iletişim kanalı, sadık bir dinleyici kitlesi oluşturmanın temelidir.</p>
<p>Sahnebul bu ekosistemde mekanları, sanatçıları ve izleyicileri buluşturmayı amaçlar; doğru profil ve güncel içerik, herkes için kazan-kazan demektir.</p>
HTML,
            ],
        ];
    }
}
