import PhoneInput from '@/Components/PhoneInput';
import AdminEntityPromoGalleryPanel from '@/Components/Admin/AdminEntityPromoGalleryPanel';
import MusicGenresChecklist from '@/Components/MusicGenresChecklist';
import ArtistLayout from '@/Layouts/ArtistLayout';
import SeoHead from '@/Components/SeoHead';
import { initialMusicGenres } from '@/lib/musicGenresForm';
import { safeRoute } from '@/lib/safeRoute';
import { sanitizeEmailInput } from '@/lib/trPhoneInput';
import { Link, router, useForm } from '@inertiajs/react';
import { useRef, useState } from 'react';

interface ArtistPayload {
    id: number;
    slug: string;
    name: string;
    banner_image?: string | null;
    bio: string | null;
    genre?: string | null;
    music_genres?: string[] | null;
    website: string | null;
    social_links: Record<string, string> | null;
    manager_info: {
        name?: string;
        company?: string;
        phone?: string;
        email?: string;
    } | null;
    public_contact: {
        email?: string;
        phone?: string;
        note?: string;
    } | null;
    promo_video_path?: string | null;
    promo_embed_url?: string | null;
    promo_gallery?: {
        embed_url?: string | null;
        video_path?: string | null;
        poster_path?: string | null;
        promo_kind?: 'story' | 'post' | null;
    }[] | null;
}

interface ProfileAnalytics {
    profile_views: number;
    favorites_count: number;
    published_events_listed: number;
}

interface GalleryItem {
    id: number;
    url: string | null;
    embed_url?: string | null;
    moderation_status: string;
    moderation_note: string | null;
}

interface Props {
    artist: ArtistPayload | null;
    profileAnalytics: ProfileAnalytics | null;
    musicGenreOptions?: string[];
    gallery?: GalleryItem[];
    artistProfileApproved?: boolean;
}

function formatInt(n: number): string {
    return n.toLocaleString('tr-TR');
}

const emptySocial = {
    instagram: '',
    twitter: '',
    youtube: '',
    spotify: '',
    tiktok: '',
    facebook: '',
};

const socialLabels: Record<string, string> = {
    instagram: 'Instagram',
    twitter: 'X (Twitter)',
    youtube: 'YouTube',
    spotify: 'Spotify',
    tiktok: 'TikTok',
    facebook: 'Facebook',
};

function moderationLabel(status: string): string {
    if (status === 'approved') return 'Yayında';
    if (status === 'pending') return 'Onay bekliyor';
    if (status === 'rejected') return 'Reddedildi';
    return status;
}

export default function PublicArtistProfileEdit({
    artist,
    profileAnalytics,
    musicGenreOptions = [],
    gallery = [],
    artistProfileApproved = false,
}: Readonly<Props>) {
    const sl = artist?.social_links ?? {};
    const mgr = artist?.manager_info ?? {};
    const pub = artist?.public_contact ?? {};

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadBusy, setUploadBusy] = useState(false);
    const [instagramUrl, setInstagramUrl] = useState('');
    const [igBusy, setIgBusy] = useState(false);

    const { data, setData, put, processing, errors, progress } = useForm({
        slug: artist?.slug ?? '',
        bio: artist?.bio ?? '',
        website: artist?.website ?? '',
        music_genres: artist
            ? initialMusicGenres(artist.music_genres, artist.genre ?? null, musicGenreOptions)
            : [],
        social_links: {
            instagram: sl.instagram ?? '',
            twitter: sl.twitter ?? '',
            youtube: sl.youtube ?? '',
            spotify: sl.spotify ?? '',
            tiktok: sl.tiktok ?? '',
            facebook: sl.facebook ?? '',
        },
        manager_info: {
            name: mgr.name ?? '',
            company: mgr.company ?? '',
            phone: mgr.phone ?? '',
            email: mgr.email ?? '',
        },
        public_contact: {
            email: pub.email ?? '',
            phone: pub.phone ?? '',
            note: pub.note ?? '',
        },
        banner_upload: null as File | null,
        remove_banner: false,
    });

    const bannerPreview = (() => {
        const p = artist?.banner_image?.trim();
        if (!p) return null;
        if (p.startsWith('http://') || p.startsWith('https://')) return p;
        return `/storage/${p.replace(/^\//, '')}`;
    })();

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!artist) return;
        put(route('artist.public-profile.update'), {
            preserveScroll: true,
            forceFormData: data.banner_upload instanceof File || data.remove_banner,
            onSuccess: () => {
                setData('banner_upload', null);
                setData('remove_banner', false);
            },
        });
    };

    const onPickPhotos = () => {
        fileInputRef.current?.click();
    };

    const onFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!artist || !files?.length) return;
        const fd = new FormData();
        Array.from(files).forEach((file, i) => {
            fd.append(`photos[${i}]`, file);
        });
        setUploadBusy(true);
        router.post(route('artist.public-profile.gallery.store'), fd, {
            forceFormData: true,
            preserveScroll: true,
            onFinish: () => {
                setUploadBusy(false);
                e.target.value = '';
            },
        });
    };

    const submitInstagramEmbed = (e: React.FormEvent) => {
        e.preventDefault();
        if (!artist || !instagramUrl.trim()) return;
        setIgBusy(true);
        router.post(
            safeRoute('artist.public-profile.gallery.instagram.store'),
            { instagram_url: instagramUrl.trim() },
            {
                preserveScroll: true,
                onFinish: () => setIgBusy(false),
                onSuccess: () => setInstagramUrl(''),
            },
        );
    };

    const toggleMusicGenre = (label: string) => {
        if (!artist) return;
        const cur = data.music_genres;
        if (cur.includes(label)) {
            setData(
                'music_genres',
                cur.filter((g) => g !== label)
            );
        } else {
            setData('music_genres', [...cur, label]);
        }
    };

    if (!artist) {
        return (
            <ArtistLayout>
                <SeoHead title="Sanatçı sayfam - Sahne paneli" description="Genel sanatçı profili." noindex />
                <h1 className="font-display mb-2 text-2xl font-bold text-zinc-900 dark:text-white">Sanatçı sayfam</h1>
                <p className="mb-6 max-w-xl text-sm text-zinc-400">
                    Bu bölüm, hesabınıza bağlı bir sanatçı profili olduğunda açılır. Önce bir sanatçı sayfasında
                    sahiplenme talebinde bulunun; yönetici onayından sonra menajer, iletişim ve sosyal medya
                    bilgilerinizi buradan ekleyebilirsiniz.
                </p>
                <Link
                    href={route('artists.index')}
                    className="inline-flex rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-amber-400"
                >
                    Sanatçıları görüntüle
                </Link>
            </ArtistLayout>
        );
    }

    return (
        <ArtistLayout>
            <SeoHead title={`${artist.name} — Genel profil`} description="Sitede görünen sanatçı bilgileri." noindex />

            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
                <div>
                    <h1 className="font-display text-2xl font-bold text-zinc-900 dark:text-white">Sanatçı sayfam</h1>
                    <p className="mt-1 text-sm text-zinc-500">
                        {artist.name} — sitede yalnızca doldurduğunuz alanlar gösterilir.
                    </p>
                </div>
                <Link
                    href={route('artists.show', artist.slug)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-amber-400 hover:text-amber-300"
                >
                    Sayfayı sitede aç →
                </Link>
            </div>

            <section className="mb-10 max-w-3xl rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8 dark:border-white/10 dark:bg-zinc-900/50">
                <h2 className="font-display text-lg font-semibold text-zinc-900 dark:text-white">Kapak görseli (banner)</h2>
                <p className="mt-1 text-sm text-zinc-500">
                    İsteğe bağlı geniş üst görsel. Yüklemezseniz sanatçı sayfasında banner alanı gösterilmez.
                </p>
                {bannerPreview && !data.remove_banner ? (
                    <div className="mt-4 overflow-hidden rounded-xl border border-zinc-200 dark:border-white/10">
                        <img src={bannerPreview} alt="" className="aspect-[21/9] max-h-48 w-full object-cover" />
                    </div>
                ) : null}
                <div className="mt-4">
                    <label htmlFor="artist-banner-upload" className="block text-sm font-medium text-zinc-400">
                        Yeni görsel yükle
                    </label>
                    <input
                        id="artist-banner-upload"
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                            setData('banner_upload', e.target.files?.[0] ?? null);
                            if (e.target.files?.[0]) setData('remove_banner', false);
                        }}
                        className="mt-1 w-full text-sm text-zinc-300"
                    />
                    {progress && (
                        <p className="mt-1 text-xs text-amber-400">Kaydediliyor… {Math.round(progress.percentage ?? 0)}%</p>
                    )}
                </div>
                {bannerPreview ? (
                    <label className="mt-4 flex items-center gap-2 text-sm text-zinc-300">
                        <input
                            type="checkbox"
                            checked={data.remove_banner}
                            onChange={(e) => {
                                setData('remove_banner', e.target.checked);
                                if (e.target.checked) setData('banner_upload', null);
                            }}
                            className="rounded border-zinc-600 text-amber-500"
                        />
                        Kapak görselini kaldır
                    </label>
                ) : null}
            </section>

            {profileAnalytics ? (
                <section className="mb-8 max-w-3xl rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-500/10 via-zinc-900/50 to-zinc-900/60 p-6">
                    <h2 className="font-display text-lg font-semibold text-zinc-900 dark:text-white">Profil performansı</h2>
                    <p className="mt-1 text-sm text-zinc-500">
                        Görüntülenme, kamu sanatçı sayfanız her açıldığında artar. Favori sayısı kullanıcı hesaplarından gelir; yayındaki
                        etkinlik sayısı sizin adınızın listelendiği yayınlanmış etkinlikleri kapsar.
                    </p>
                    <div className="mt-6 grid gap-4 sm:grid-cols-3">
                        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-white/10 dark:bg-zinc-950/40">
                            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Sayfa görüntülenmesi</p>
                            <p className="mt-1 font-display text-2xl font-bold text-amber-300">{formatInt(profileAnalytics.profile_views)}</p>
                        </div>
                        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-white/10 dark:bg-zinc-950/40">
                            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Favorilere ekleyen</p>
                            <p className="mt-1 font-display text-2xl font-bold text-zinc-900 dark:text-white">
                                {formatInt(profileAnalytics.favorites_count)}
                            </p>
                        </div>
                        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-white/10 dark:bg-zinc-950/40">
                            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Yayında, sizin adınızla</p>
                            <p className="mt-1 font-display text-2xl font-bold text-emerald-400/90">
                                {formatInt(profileAnalytics.published_events_listed)}
                            </p>
                            <p className="mt-1 text-xs text-zinc-500">etkinlik</p>
                        </div>
                    </div>
                </section>
            ) : null}

            {artist ? (
                <section className="mb-10 max-w-3xl rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8 dark:border-white/10 dark:bg-zinc-900/50">
                    <h2 className="font-display text-lg font-semibold text-zinc-900 dark:text-white">Galeri</h2>
                    <p className="mt-1 text-sm text-zinc-500">
                        Fotoğraf yükleyebilir, gönderi veya reel bağlantısı ekleyebilir veya öğeleri silebilirsiniz. Kamu sayfada bağlantılı
                        öğeler yalnızca sunucuya inen kapak görseliyle listelenir; gömülü oynatıcı veya «Instagram&apos;da aç» yoktur.
                        {artistProfileApproved
                            ? ' Onaylı sanatçı profiliniz olduğu için görseller doğrudan sayfanızda yayınlanır.'
                            : ' Profiliniz henüz onaylı değilse yüklemeler yönetici onayına gider; onaylanana kadar kamu sayfasında görünmez.'}
                    </p>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={onFilesSelected}
                    />
                    <button
                        type="button"
                        onClick={onPickPhotos}
                        disabled={uploadBusy}
                        className="mt-4 rounded-xl bg-amber-500/20 px-4 py-2.5 text-sm font-semibold text-amber-200 hover:bg-amber-500/30 disabled:opacity-50"
                    >
                        {uploadBusy ? 'Yükleniyor…' : 'Fotoğraf ekle'}
                    </button>
                    <form onSubmit={submitInstagramEmbed} className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
                        <div className="min-w-0 flex-1">
                            <label htmlFor="artist-gallery-instagram-url" className="block text-xs font-medium text-zinc-400">
                                Instagram gönderi / reel URL
                            </label>
                            <input
                                id="artist-gallery-instagram-url"
                                type="url"
                                value={instagramUrl}
                                onChange={(e) => setInstagramUrl(e.target.value)}
                                placeholder="https://www.instagram.com/reel/…"
                                className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm placeholder:text-zinc-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-white/10 dark:bg-zinc-950/60 dark:text-white dark:placeholder:text-zinc-500 dark:focus:border-amber-500/40"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={igBusy || !instagramUrl.trim()}
                            className="shrink-0 rounded-xl bg-amber-500/20 px-4 py-2.5 text-sm font-semibold text-amber-200 hover:bg-amber-500/30 disabled:opacity-50"
                        >
                            {igBusy ? 'Ekleniyor…' : 'Instagram ekle'}
                        </button>
                    </form>
                    {gallery.length > 0 ? (
                        <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                            {gallery.map((g) => (
                                <li
                                    key={g.id}
                                    className="group relative overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 dark:border-white/10 dark:bg-zinc-950/60"
                                >
                                    {g.embed_url?.includes('instagram.com') ? (
                                        <div className="flex aspect-square flex-col items-center justify-center gap-2 bg-gradient-to-br from-fuchsia-950/50 to-amber-950/40 p-3 text-center">
                                            <span className="text-2xl" aria-hidden>
                                                ▶
                                            </span>
                                            <span className="text-xs font-semibold text-amber-200">Bağlantı kaydı</span>
                                            <span className="line-clamp-3 break-all text-[10px] text-zinc-400">{g.embed_url}</span>
                                        </div>
                                    ) : g.url ? (
                                        <img src={g.url} alt="" className="aspect-square w-full object-cover" />
                                    ) : (
                                        <div className="flex aspect-square items-center justify-center text-xs text-zinc-500">Önizleme yok</div>
                                    )}
                                    <div className="absolute left-2 top-2">
                                        <span
                                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                                                g.moderation_status === 'approved'
                                                    ? 'bg-emerald-500/90 text-white'
                                                    : g.moderation_status === 'pending'
                                                      ? 'bg-amber-500/90 text-zinc-900'
                                                      : 'bg-zinc-600 text-white'
                                            }`}
                                        >
                                            {moderationLabel(g.moderation_status)}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between gap-2 border-t border-zinc-200 p-2 dark:border-white/10">
                                        <Link
                                            href={route('artist.public-profile.gallery.destroy', g.id)}
                                            method="delete"
                                            as="button"
                                            className="text-xs font-medium text-red-400 hover:text-red-300"
                                        >
                                            Sil
                                        </Link>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="mt-4 text-sm text-zinc-500">Henüz galeri fotoğrafı yok.</p>
                    )}
                </section>
            ) : null}

            {artist ? (
                <div className="mb-10 max-w-3xl">
                    <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
                        Onaylı profil sayfanızda üstte tanıtım videoları, altta gönderi görselleri (Instagram önizlemesi veya yüklenen görsel) görünür. İki
                        kutuyu karıştırmayın.
                    </p>
                    <AdminEntityPromoGalleryPanel
                        entity={artist}
                        variant="artist"
                        routes={{
                            importMedia: route('artist.public-profile.promo.import-media'),
                            appendPromoFiles: route('artist.public-profile.promo.append-files'),
                            clearPromoMedia: route('artist.public-profile.promo.clear-media'),
                            removePromoItem: route('artist.public-profile.promo.remove-item'),
                        }}
                    />
                </div>
            ) : null}

            <form onSubmit={submit} className="max-w-3xl space-y-10">
                <section className="rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8 dark:border-white/10 dark:bg-zinc-900/50">
                    <h2 className="font-display text-lg font-semibold text-zinc-900 dark:text-white">Kullanıcı adı (profil adresi)</h2>
                    <p className="mt-1 text-sm text-zinc-500">
                        Sitedeki adresiniz küçük harf, rakam ve tire ile oluşur. Türkçe karakterler kaydederken otomatik dönüştürülür.
                    </p>
                    <div className="mt-4">
                        <label htmlFor="artist-public-slug" className="block text-sm font-medium text-zinc-400">
                            Kullanıcı adı
                        </label>
                        <input
                            id="artist-public-slug"
                            value={data.slug}
                            onChange={(e) => setData('slug', e.target.value)}
                            autoComplete="off"
                            className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 font-mono text-sm text-zinc-900 shadow-sm placeholder:text-zinc-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-white/10 dark:bg-zinc-950/60 dark:text-white dark:focus:border-amber-500/40"
                            placeholder="ornek-sanatci"
                        />
                        {errors.slug ? <p className="mt-1 text-sm text-red-400">{errors.slug}</p> : null}
                        <p className="mt-2 break-all text-xs text-zinc-500">
                            Önizleme:{' '}
                            {(() => {
                                const previewSlug = data.slug.trim() !== '' ? data.slug.trim() : artist.slug;
                                return (
                                    <Link
                                        href={route('artists.show', previewSlug)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="font-medium text-amber-600 hover:underline dark:text-amber-400"
                                    >
                                        {route('artists.show', previewSlug)}
                                    </Link>
                                );
                            })()}
                        </p>
                    </div>
                </section>

                <section className="rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8 dark:border-white/10 dark:bg-zinc-900/50">
                    <h2 className="font-display text-lg font-semibold text-zinc-900 dark:text-white">Hakkında ve web</h2>
                    <p className="mt-1 text-sm text-zinc-500">Kısa tanıtım ve resmi site bağlantısı (opsiyonel).</p>
                    <div className="mt-6 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-zinc-400">Biyografi</label>
                            <textarea
                                value={data.bio}
                                onChange={(e) => setData('bio', e.target.value)}
                                rows={5}
                                className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 shadow-sm placeholder:text-zinc-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-white/10 dark:bg-zinc-950/60 dark:text-white dark:placeholder:text-zinc-600 dark:focus:border-amber-500/40 dark:focus:ring-amber-500/20"
                                placeholder="Kendinizi kısaca anlatın…"
                            />
                            {errors.bio && <p className="mt-1 text-sm text-red-400">{errors.bio}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-400">Web sitesi</label>
                            <input
                                type="url"
                                value={data.website}
                                onChange={(e) => setData('website', e.target.value)}
                                placeholder="https://"
                                className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 shadow-sm placeholder:text-zinc-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-white/10 dark:bg-zinc-950/60 dark:text-white dark:placeholder:text-zinc-600 dark:focus:border-amber-500/40 dark:focus:ring-amber-500/20"
                            />
                            {errors.website && <p className="mt-1 text-sm text-red-400">{errors.website}</p>}
                        </div>
                    </div>
                </section>

                <section className="rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8 dark:border-white/10 dark:bg-zinc-900/50">
                    <h2 className="font-display text-lg font-semibold text-zinc-900 dark:text-white">Müzik türü</h2>
                    <p className="mt-1 text-sm text-zinc-500">
                        Sitede görünen müzik türleri. Listeyi arama kutusu ile daraltabilirsiniz.
                    </p>
                    <div className="mt-4">
                        <MusicGenresChecklist
                            variant="artistPanel"
                            options={musicGenreOptions}
                            selected={data.music_genres}
                            onToggle={toggleMusicGenre}
                            error={errors.music_genres}
                        />
                    </div>
                </section>

                <section className="rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8 dark:border-white/10 dark:bg-zinc-900/50">
                    <h2 className="font-display text-lg font-semibold text-zinc-900 dark:text-white">İletişim (yayındaki sayfa)</h2>
                    <p className="mt-1 text-sm text-zinc-500">
                        Booking veya basın için e-posta, telefon ve kısa not. Boş bıraktığınız alanlar sitede görünmez.
                    </p>
                    <div className="mt-6 grid gap-4 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-zinc-400">E-posta</label>
                            <input
                                type="email"
                                value={data.public_contact.email}
                                onChange={(e) =>
                                    setData('public_contact', {
                                        ...data.public_contact,
                                        email: sanitizeEmailInput(e.target.value),
                                    })
                                }
                                className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-white/10 dark:bg-zinc-950/60 dark:text-white dark:focus:border-amber-500/40"
                            />
                            {errors['public_contact.email'] && (
                                <p className="mt-1 text-sm text-red-400">{errors['public_contact.email']}</p>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-400">Telefon</label>
                            <PhoneInput
                                value={data.public_contact.phone ?? ''}
                                onChange={(v) => setData('public_contact', { ...data.public_contact, phone: v })}
                                className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-white/10 dark:bg-zinc-950/60 dark:text-white dark:focus:border-amber-500/40"
                            />
                            {errors['public_contact.phone'] && (
                                <p className="mt-1 text-sm text-red-400">{errors['public_contact.phone']}</p>
                            )}
                        </div>
                        <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-zinc-400">Not</label>
                            <textarea
                                value={data.public_contact.note}
                                onChange={(e) =>
                                    setData('public_contact', { ...data.public_contact, note: e.target.value })
                                }
                                rows={3}
                                className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-white/10 dark:bg-zinc-950/60 dark:text-white dark:focus:border-amber-500/40"
                                placeholder="Örn. basın için …, booking saatleri …"
                            />
                            {errors['public_contact.note'] && (
                                <p className="mt-1 text-sm text-red-400">{errors['public_contact.note']}</p>
                            )}
                        </div>
                    </div>
                </section>

                <section className="rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8 dark:border-white/10 dark:bg-zinc-900/50">
                    <h2 className="font-display text-lg font-semibold text-zinc-900 dark:text-white">Menajer</h2>
                    <p className="mt-1 text-sm text-zinc-500">Menajer veya temsilci bilgileri (opsiyonel).</p>
                    <div className="mt-6 grid gap-4 sm:grid-cols-2">
                        <div>
                            <label className="block text-sm font-medium text-zinc-400">Ad / unvan</label>
                            <input
                                value={data.manager_info.name}
                                onChange={(e) =>
                                    setData('manager_info', { ...data.manager_info, name: e.target.value })
                                }
                                className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-white/10 dark:bg-zinc-950/60 dark:text-white dark:focus:border-amber-500/40"
                            />
                            {errors['manager_info.name'] && (
                                <p className="mt-1 text-sm text-red-400">{errors['manager_info.name']}</p>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-400">Ajans / şirket</label>
                            <input
                                value={data.manager_info.company}
                                onChange={(e) =>
                                    setData('manager_info', { ...data.manager_info, company: e.target.value })
                                }
                                className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-white/10 dark:bg-zinc-950/60 dark:text-white dark:focus:border-amber-500/40"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-400">Telefon</label>
                            <PhoneInput
                                value={data.manager_info.phone ?? ''}
                                onChange={(v) => setData('manager_info', { ...data.manager_info, phone: v })}
                                className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-white/10 dark:bg-zinc-950/60 dark:text-white dark:focus:border-amber-500/40"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-400">E-posta</label>
                            <input
                                type="email"
                                value={data.manager_info.email}
                                onChange={(e) =>
                                    setData('manager_info', {
                                        ...data.manager_info,
                                        email: sanitizeEmailInput(e.target.value),
                                    })
                                }
                                className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-white/10 dark:bg-zinc-950/60 dark:text-white dark:focus:border-amber-500/40"
                            />
                            {errors['manager_info.email'] && (
                                <p className="mt-1 text-sm text-red-400">{errors['manager_info.email']}</p>
                            )}
                        </div>
                    </div>
                </section>

                <section className="rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8 dark:border-white/10 dark:bg-zinc-900/50">
                    <h2 className="font-display text-lg font-semibold text-zinc-900 dark:text-white">Sosyal medya</h2>
                    <p className="mt-1 text-sm text-zinc-500">Tam URL girin (ör. https://instagram.com/…).</p>
                    <div className="mt-6 grid gap-4 sm:grid-cols-2">
                        {(Object.keys(emptySocial) as (keyof typeof emptySocial)[]).map((key) => (
                            <div key={key}>
                                <label className="block text-sm font-medium text-zinc-400">
                                    {socialLabels[key] ?? key}
                                </label>
                                <input
                                    type="url"
                                    value={data.social_links[key]}
                                    onChange={(e) =>
                                        setData('social_links', { ...data.social_links, [key]: e.target.value })
                                    }
                                    className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-white/10 dark:bg-zinc-950/60 dark:text-white dark:focus:border-amber-500/40"
                                    placeholder="https://"
                                />
                            </div>
                        ))}
                    </div>
                    {errors.social_links && <p className="mt-2 text-sm text-red-400">{errors.social_links}</p>}
                </section>

                <div className="flex flex-wrap gap-3">
                    <button
                        type="submit"
                        disabled={processing}
                        className="rounded-xl bg-amber-500 px-6 py-3 font-semibold text-zinc-950 hover:bg-amber-400 disabled:opacity-50"
                    >
                        Kaydet
                    </button>
                </div>
            </form>
        </ArtistLayout>
    );
}
