<?php

namespace Database\Seeders;

use App\Models\Artist;
use App\Support\SeededArtistImageUrls;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class ArtistSeeder extends Seeder
{
    /**
     * @return list<string>
     */
    public static function seededSlugs(): array
    {
        return collect(self::artistRows())->map(fn ($a) => Str::slug($a['name']))->all();
    }

    /**
     * @return list<array{name: string, genre: string, bio: string, avatar?: string, spotify_id?: string|null}>
     */
    protected static function artistRows(): array
    {
        return [
            // Pop (yaşayan, bilinen isimler)
            ['name' => 'Ajda Pekkan', 'genre' => 'Pop', 'bio' => 'Türk pop müziğinin efsane ismi.'],
            ['name' => 'Aleyna Tilki', 'genre' => 'Pop', 'bio' => 'Genç kuşağın öne çıkan pop sanatçılarından.'],
            ['name' => 'Atiye', 'genre' => 'Pop', 'bio' => 'Dans-pop sahnesinin güçlü kadın vokallerinden.'],
            ['name' => 'Ayşe Hatun Önal', 'genre' => 'Pop', 'bio' => 'Türk pop sahnesinin tanınan isimlerinden.'],
            ['name' => 'Bengü', 'genre' => 'Pop', 'bio' => 'Pop müzikte uzun yıllardır aktif sanatçı.'],
            ['name' => 'Berkay', 'genre' => 'Pop', 'bio' => 'Canlı performanslarıyla bilinen pop sanatçısı.', 'avatar' => 'https://picsum.photos/seed/sahnebul-berkay/400/400'],
            ['name' => 'Buray', 'genre' => 'Pop', 'bio' => 'Modern Türk popunun sevilen vokallerinden.'],
            ['name' => 'Candan Erçetin', 'genre' => 'Pop', 'bio' => 'Güçlü yorumuyla öne çıkan pop sanatçısı.'],
            ['name' => 'Cem Adrian', 'genre' => 'Pop', 'bio' => 'Geniş aralıklı vokal ve akustik düzenlemeleriyle tanınan yorumcu; soul ve hafif rock esintili repertuvarıyla canlı sahnede güçlü bir dinleyici kitlesine sahip.', 'avatar' => 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=800&auto=format&fit=crop'],
            ['name' => 'Demet Akalın', 'genre' => 'Pop', 'bio' => 'Türk pop müziğinde hit şarkılarıyla bilinir.'],
            ['name' => 'Derya Uluğ', 'genre' => 'Pop', 'bio' => 'Yeni dönem pop sahnesinin güçlü ismi.'],
            ['name' => 'Ece Seçkin', 'genre' => 'Pop', 'bio' => 'Dans-pop tarzında üretim yapan sanatçı.'],
            ['name' => 'Edis', 'genre' => 'Pop', 'bio' => 'Türk pop müziğinin modern erkek vokallerinden.'],
            ['name' => 'Emre Altuğ', 'genre' => 'Pop', 'bio' => 'Pop müzikte uzun yıllardır aktif sanatçı.'],
            ['name' => 'Emre Aydın', 'genre' => 'Pop Rock', 'bio' => 'Pop rock çizgisinde sevilen şarkıcı ve söz yazarı.'],
            ['name' => 'Ferhat Göçer', 'genre' => 'Pop', 'bio' => 'Geniş repertuvarıyla tanınan sahne sanatçısı.'],
            ['name' => 'Fettah Can', 'genre' => 'Pop', 'bio' => 'Besteci kimliğiyle de öne çıkan pop sanatçısı.'],
            ['name' => 'Göksel', 'genre' => 'Pop', 'bio' => 'Türk pop müziğinin özgün kadın seslerinden.'],
            ['name' => 'Gülben Ergen', 'genre' => 'Pop', 'bio' => 'Pop müzikte geniş kitlelere ulaşan sanatçı.'],
            ['name' => 'Gülşen', 'genre' => 'Pop', 'bio' => 'Türk pop müziğinin önde gelen isimlerinden.'],
            ['name' => 'Hadise', 'genre' => 'Pop', 'bio' => 'Uluslararası sahnelerde de tanınan pop sanatçısı.'],
            ['name' => 'Hande Yener', 'genre' => 'Pop', 'bio' => 'Elektronik-pop çizgisinde üretimler yapan sanatçı.'],
            ['name' => 'Işın Karaca', 'genre' => 'Pop', 'bio' => 'Güçlü vokaliyle tanınan pop sanatçısı.'],
            ['name' => 'İrem Derici', 'genre' => 'Pop', 'bio' => 'Yeni dönem Türk popunun sevilen isimlerinden.'],
            ['name' => 'İzel', 'genre' => 'Pop', 'bio' => '90’lardan günümüze pop müzikte aktif sanatçı.'],
            ['name' => 'Kenan Doğulu', 'genre' => 'Pop', 'bio' => 'Türk pop müziğinin önemli erkek vokallerinden.'],
            ['name' => 'Koray Avcı', 'genre' => 'Pop', 'bio' => 'Canlı sahne performanslarıyla bilinen sanatçı.'],
            ['name' => 'Levent Yüksel', 'genre' => 'Pop', 'bio' => 'Türk pop müziğinin köklü isimlerinden.'],
            ['name' => 'Mabel Matiz', 'genre' => 'Pop', 'bio' => 'Alternatif pop çizgisinin öne çıkan sanatçısı.'],
            ['name' => 'Mert Demir', 'genre' => 'Pop', 'bio' => 'Yeni nesil pop sahnesinin yükselen ismi.'],
            ['name' => 'Merve Özbey', 'genre' => 'Pop', 'bio' => 'Pop-fantezi çizgisinde güçlü bir yorumcu.'],
            ['name' => 'Murat Boz', 'genre' => 'Pop', 'bio' => 'Türk pop sahnesinin popüler isimlerinden.'],
            ['name' => 'Murat Dalkılıç', 'genre' => 'Pop', 'bio' => 'Pop müzikte hit şarkılarıyla tanınır.'],
            ['name' => 'Mustafa Ceceli', 'genre' => 'Pop', 'bio' => 'Pop ballad türünde sevilen erkek vokal.'],
            ['name' => 'Mustafa Sandal', 'genre' => 'Pop', 'bio' => 'Türk pop müziğinin klasik isimlerinden.'],
            ['name' => 'Nazan Öncel', 'genre' => 'Pop', 'bio' => 'Söz yazarı kimliğiyle de güçlü pop sanatçısı.'],
            ['name' => 'Nil Karaibrahimgil', 'genre' => 'Pop', 'bio' => 'Kendine özgü tarzıyla pop sahnesinde öne çıkar.'],
            ['name' => 'Nilüfer', 'genre' => 'Pop', 'bio' => 'Türk pop müziğinin en köklü kadın vokallerinden.'],
            ['name' => 'Oğuzhan Koç', 'genre' => 'Pop', 'bio' => 'Yeni dönem pop müziğin bilinen isimlerinden.'],
            ['name' => 'Rafet El Roman', 'genre' => 'Pop', 'bio' => 'Romantik pop şarkılarıyla tanınır.'],
            ['name' => 'Serdar Ortaç', 'genre' => 'Pop', 'bio' => 'Pop müzikte uzun yıllardır aktif sanatçı.'],
            ['name' => 'Sertab Erener', 'genre' => 'Pop', 'bio' => 'Eurovision birincisi, güçlü sahne performansına sahip sanatçı.'],
            ['name' => 'Sezen Aksu', 'genre' => 'Pop', 'bio' => 'Türk pop müziğinin en etkili isimlerinden.'],
            ['name' => 'Simge', 'genre' => 'Pop', 'bio' => 'Güncel pop sahnesinde öne çıkan kadın vokal.', 'avatar' => 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Simge_-_15._Radyo_Bo%C4%9Fazi%C3%A7i_%C3%96d%C3%BClleri_%28cropped%29.jpg/500px-Simge_-_15._Radyo_Bo%C4%9Fazi%C3%A7i_%C3%96d%C3%BClleri_%28cropped%29.jpg'],
            ['name' => 'Sinan Akçıl', 'genre' => 'Pop', 'bio' => 'Besteci ve yorumcu kimliğiyle pop müzikte aktif.'],
            ['name' => 'Soner Sarıkabadayı', 'genre' => 'Pop', 'bio' => 'Pop müzikte üretken şarkıcı-söz yazarı.'],
            ['name' => 'Sıla', 'genre' => 'Pop', 'bio' => 'Güçlü vokali ve sözleriyle pop müzikte öne çıkar.'],
            ['name' => 'Şevval Sam', 'genre' => 'Pop', 'bio' => 'Farklı türlerde üretim yapan güçlü yorumcu.'],
            ['name' => 'Tan Taşçı', 'genre' => 'Pop', 'bio' => 'Romantik pop tarzındaki eserleriyle tanınır.'],
            ['name' => 'Tarkan', 'genre' => 'Pop', 'bio' => 'Türk pop müziğinin uluslararası ölçekte tanınan yıldızı.'],
            ['name' => 'Tuğba Yurt', 'genre' => 'Pop', 'bio' => 'Pop sahnelerinde aktif performans yapan sanatçı.'],
            ['name' => 'Yalın', 'genre' => 'Pop', 'bio' => 'Akustik-pop çizgisindeki sevilen erkek vokal.'],
            ['name' => 'Yaşar', 'genre' => 'Pop', 'bio' => '90’lardan günümüze pop müzikte bilinen isim.', 'avatar' => 'https://picsum.photos/seed/sahnebul-yasar/400/400'],
            ['name' => 'Yıldız Tilbe', 'genre' => 'Pop', 'bio' => 'Türk müziğinde özgün yorumu ile tanınan sanatçı.'],
            ['name' => 'Zeynep Bastık', 'genre' => 'Pop', 'bio' => 'Yeni kuşağın popüler pop sanatçılarından.'],

            // Türk Halk Müziği (yaşayan, bilinen isimler)
            ['name' => 'Ahmet Şafak', 'genre' => 'Türk Halk Müziği', 'bio' => 'Türk halk müziği ve Anadolu ezgileri yorumcusu.'],
            ['name' => 'Arif Sağ', 'genre' => 'Türk Halk Müziği', 'bio' => 'Bağlama üstadı, halk müziğinin yaşayan efsanelerinden.'],
            ['name' => 'Belkıs Akkale', 'genre' => 'Türk Halk Müziği', 'bio' => 'Halk müziğinin güçlü kadın yorumcularından.'],
            ['name' => 'Bülent Serttaş', 'genre' => 'Türk Halk Müziği', 'bio' => 'Halk müziği repertuvarıyla tanınan sanatçı.', 'avatar' => 'https://picsum.photos/seed/sahnebul-bulent-serttas/400/400'],
            ['name' => 'Cengiz Özkan', 'genre' => 'Türk Halk Müziği', 'bio' => 'Bağlama ve vokaliyle halk müziğinde öne çıkar.'],
            ['name' => 'Ceylan', 'genre' => 'Türk Halk Müziği', 'bio' => 'Uzun yıllardır sahnede olan halk müziği sanatçısı.'],
            ['name' => 'Elif Buse Doğan', 'genre' => 'Türk Halk Müziği', 'bio' => 'Yeni kuşak halk müziği yorumcularından.'],
            ['name' => 'Fatih Kısaparmak', 'genre' => 'Türk Halk Müziği', 'bio' => 'Anadolu temalı eserleriyle tanınan sanatçı.'],
            ['name' => 'Ferhat Tunç', 'genre' => 'Türk Halk Müziği', 'bio' => 'Protest halk müziği çizgisindeki sanatçı.'],
            ['name' => 'Fuat Saka', 'genre' => 'Türk Halk Müziği', 'bio' => 'Karadeniz ve halk müziği senteziyle bilinir.'],
            ['name' => 'Güler Duman', 'genre' => 'Türk Halk Müziği', 'bio' => 'Halk müziğinde güçlü vokaliyle tanınan sanatçı.'],
            ['name' => 'Hüseyin Turan', 'genre' => 'Türk Halk Müziği', 'bio' => 'Halk müziği sahnesinde sevilen yorumculardan.'],
            ['name' => 'İsmail Altunsaray', 'genre' => 'Türk Halk Müziği', 'bio' => 'Bağlama virtüözü ve halk müziği yorumcusu.'],
            ['name' => 'İzzet Altınmeşe', 'genre' => 'Türk Halk Müziği', 'bio' => 'Halk müziğinde uzun yıllardır aktif sanatçı.'],
            ['name' => 'Kubat', 'genre' => 'Türk Halk Müziği', 'bio' => 'Halk müziğinin modern yorumcularından.'],
            ['name' => 'Mahmut Tuncer', 'genre' => 'Türk Halk Müziği', 'bio' => 'Şanlıurfa müzik geleneğinden gelen sanatçı.'],
            ['name' => 'Musa Eroğlu', 'genre' => 'Türk Halk Müziği', 'bio' => 'Anadolu ozanlık geleneğinin önemli yaşayan temsilcilerinden.'],
            ['name' => 'Mustafa Keser', 'genre' => 'Türk Halk Müziği', 'bio' => 'Halk müziğinde klasikleşmiş bir yorumcu.'],
            ['name' => 'Mustafa Özarslan', 'genre' => 'Türk Halk Müziği', 'bio' => 'Anadolu ezgilerini modern düzenlemelerle yorumlar.', 'avatar' => 'https://picsum.photos/seed/sahnebul-mustafa-ozarslan/400/400'],
            ['name' => 'Nihat Doğan', 'genre' => 'Türk Halk Müziği', 'bio' => 'Halk müziği çizgisinde tanınan sanatçı.'],
            ['name' => 'Oğuz Aksaç', 'genre' => 'Türk Halk Müziği', 'bio' => 'Anadolu ve deyiş repertuvarıyla bilinen sanatçı.'],
            ['name' => 'Onur Akın', 'genre' => 'Türk Halk Müziği', 'bio' => 'Şiirsel halk müziği eserleriyle tanınır.'],
            ['name' => 'Onur Şan', 'genre' => 'Türk Halk Müziği', 'bio' => 'Halk müziğinde güçlü sahne performansına sahiptir.'],
            ['name' => 'Orhan Hakalmaz', 'genre' => 'Türk Halk Müziği', 'bio' => 'Halk müziğinin bilinen erkek yorumcularındandır.'],
            ['name' => 'Özlem Taner', 'genre' => 'Türk Halk Müziği', 'bio' => 'Halk müziği geleneğini sürdüren kadın vokal.'],
            ['name' => 'Sabahat Akkiraz', 'genre' => 'Türk Halk Müziği', 'bio' => 'Alevi-Bektaşi müzik geleneğinin güçlü sesi.'],
            ['name' => 'Sevcan Orhan', 'genre' => 'Türk Halk Müziği', 'bio' => 'Halk müziği sahnesinde popüler kadın yorumculardan.'],
            ['name' => 'Songül Karlı', 'genre' => 'Türk Halk Müziği', 'bio' => 'Halk müziği repertuvarıyla bilinir.'],
            ['name' => 'Şükriye Tutkun', 'genre' => 'Türk Halk Müziği', 'bio' => 'Halk müziğinde güçlü yorumlarıyla tanınır.'],
            ['name' => 'Tolga Sağ', 'genre' => 'Türk Halk Müziği', 'bio' => 'Bağlama geleneğinin yaşayan önemli temsilcilerindendir.'],
            ['name' => 'Yavuz Bingöl', 'genre' => 'Türk Halk Müziği', 'bio' => 'Halk müziği ve özgün müzik yorumcusu.'],
            ['name' => 'Zara', 'genre' => 'Türk Halk Müziği', 'bio' => 'Halk müziğinin bilinen kadın seslerinden.'],

            // Ek sanatçılar (talep + görseller: Wikimedia veya yer tutucu)
            ['name' => 'Uygar Doğanay', 'genre' => 'Pop', 'bio' => 'Türk pop ve sahne müziği sanatçısı.', 'spotify_id' => null],
            ['name' => 'Blok 3', 'genre' => 'Rock', 'bio' => 'Türkçe rock ve alternatif müzik grubu.', 'avatar' => 'https://picsum.photos/seed/sahnebul-blok3/400/400'],
            ['name' => 'Funda Arar', 'genre' => 'Pop', 'bio' => 'Türk pop müziğinin sevilen kadın vokallerinden.', 'avatar' => 'https://upload.wikimedia.org/wikipedia/commons/8/83/Funda4.jpg'],
            ['name' => 'Sibel Can', 'genre' => 'Pop', 'bio' => 'Geniş repertuarıyla tanınan ses sanatçısı.', 'avatar' => 'https://upload.wikimedia.org/wikipedia/commons/6/6c/Sibel_2011_Antalya.jpg'],
            ['name' => 'Ebru Yaşar', 'genre' => 'Pop', 'bio' => 'Pop ve fantezi müzik tarzında üretimler yapan sanatçı.', 'avatar' => 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Ebru_Ya%C5%9Far_%28_Haddinden_Fazla%29.jpg/500px-Ebru_Ya%C5%9Far_%28_Haddinden_Fazla%29.jpg'],
            ['name' => 'Ebru Gündeş', 'genre' => 'Pop', 'bio' => 'Arabesk ve modern pop çizgisinde öne çıkan yorumcu.', 'avatar' => 'https://upload.wikimedia.org/wikipedia/commons/d/d4/Ebru_G%C3%BCnde%C5%9F_2011_Antalya.jpg'],
            ['name' => 'Erkan Uğur', 'genre' => 'Pop', 'bio' => 'Sahne ve stüdyo çalışmalarıyla bilinen sanatçı.', 'avatar' => 'https://picsum.photos/seed/sahnebul-erkan-ugur/400/400'],
            ['name' => 'Can Bonomo', 'genre' => 'Pop', 'bio' => 'Eurovision ve özgün pop tarzıyla tanınan sanatçı.', 'avatar' => 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/78/CanBonomo.jpg/500px-CanBonomo.jpg'],
            ['name' => 'Haluk Levent', 'genre' => 'Rock', 'bio' => 'Anadolu rock ve sahne müziğinin önemli isimlerinden.', 'avatar' => 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/Haluk_Levent.jpg/500px-Haluk_Levent.jpg'],
            ['name' => 'Haktan', 'genre' => 'Pop', 'bio' => 'Güncel pop sahnesinde yer alan sanatçı.', 'avatar' => 'https://picsum.photos/seed/sahnebul-haktan/400/400'],
            ['name' => 'Gökhan Türkmen', 'genre' => 'Pop', 'bio' => 'Pop müzikte geniş dinleyici kitlesine ulaşan sanatçı.', 'avatar' => 'https://picsum.photos/seed/sahnebul-gokhan-turkmen/400/400'],
            ['name' => 'Gökhan Namlı', 'genre' => 'Pop', 'bio' => 'Pop ve fantezi müzik repertuarıyla bilinen sanatçı.', 'avatar' => 'https://picsum.photos/seed/sahnebul-gokhan-namli/400/400'],
            ['name' => 'Melek Mosso', 'genre' => 'Pop', 'bio' => 'Alternatif ve pop çizgisinde özgün yorumuyla tanınır.', 'avatar' => 'https://picsum.photos/seed/sahnebul-melek-mosso/400/400'],
        ];
    }

    public function run(): void
    {
        $artists = self::artistRows();

        $slugs = collect($artists)->map(fn ($a) => Str::slug($a['name']))->all();
        Artist::whereNotIn('slug', $slugs)->whereNull('spotify_id')->delete();

        $knownAvatars = SeededArtistImageUrls::bySlug();

        foreach ($artists as $a) {
            $slug = Str::slug($a['name']);
            $explicitAvatar = isset($a['avatar']) ? trim((string) $a['avatar']) : '';
            // Tam URL veya bilinen Wikimedia; aksi halde picsum (push tek başına DB/storage taşımaz).
            $fallbackAvatar = $knownAvatars[$slug] ?? 'https://picsum.photos/seed/sahnebul-artist-'.$slug.'/400/400';
            $data = [
                'name' => $a['name'],
                'genre' => $a['genre'],
                'bio' => $a['bio'],
                'status' => 'approved',
                'country_code' => 'TR',
                'avatar' => $explicitAvatar !== ''
                    ? $a['avatar']
                    : $fallbackAvatar,
            ];
            if (array_key_exists('spotify_id', $a)) {
                $rawSid = $a['spotify_id'];
                if ($rawSid === null || (is_string($rawSid) && trim($rawSid) === '')) {
                    $data['spotify_id'] = null;
                    $data['spotify_url'] = null;
                    $social = Artist::where('slug', $slug)->value('social_links');
                    $social = is_array($social) ? $social : [];
                    unset($social['spotify']);
                    $data['social_links'] = $social;
                } else {
                    $sid = trim((string) $rawSid);
                    $data['spotify_id'] = $sid;
                    $spotifyPage = 'https://open.spotify.com/artist/'.$sid;
                    $data['spotify_url'] = $spotifyPage;
                    $social = Artist::where('slug', $slug)->value('social_links');
                    $social = is_array($social) ? $social : [];
                    $social['spotify'] = $spotifyPage;
                    $data['social_links'] = $social;
                }
            }
            Artist::updateOrCreate(
                ['slug' => $slug],
                $data
            );
        }
    }
}
