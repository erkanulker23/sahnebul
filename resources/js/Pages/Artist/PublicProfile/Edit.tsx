import MusicGenresChecklist from '@/Components/MusicGenresChecklist';
import ArtistLayout from '@/Layouts/ArtistLayout';
import SeoHead from '@/Components/SeoHead';
import { initialMusicGenres } from '@/lib/musicGenresForm';
import { Link, useForm } from '@inertiajs/react';

interface ArtistPayload {
    id: number;
    slug: string;
    name: string;
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
}

interface ProfileAnalytics {
    profile_views: number;
    favorites_count: number;
    published_events_listed: number;
}

interface Props {
    artist: ArtistPayload | null;
    profileAnalytics: ProfileAnalytics | null;
    musicGenreOptions?: string[];
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

export default function PublicArtistProfileEdit({ artist, profileAnalytics, musicGenreOptions = [] }: Readonly<Props>) {
    const sl = artist?.social_links ?? {};
    const mgr = artist?.manager_info ?? {};
    const pub = artist?.public_contact ?? {};

    const { data, setData, put, processing, errors } = useForm({
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
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!artist) return;
        put(route('artist.public-profile.update'), { preserveScroll: true });
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
                <SeoHead title="Sanatçı sayfam - Mekan Paneli" description="Genel sanatçı profili." noindex />
                <h1 className="font-display mb-2 text-2xl font-bold text-white">Sanatçı sayfam</h1>
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
                    <h1 className="font-display text-2xl font-bold text-white">Sanatçı sayfam</h1>
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

            {profileAnalytics ? (
                <section className="mb-8 max-w-3xl rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-500/10 via-zinc-900/50 to-zinc-900/60 p-6">
                    <h2 className="font-display text-lg font-semibold text-white">Profil performansı</h2>
                    <p className="mt-1 text-sm text-zinc-500">
                        Görüntülenme, kamu sanatçı sayfanız her açıldığında artar. Favori sayısı kullanıcı hesaplarından gelir; yayındaki
                        etkinlik sayısı sizin adınızın listelendiği yayınlanmış etkinlikleri kapsar.
                    </p>
                    <div className="mt-6 grid gap-4 sm:grid-cols-3">
                        <div className="rounded-xl border border-white/10 bg-zinc-950/40 p-4">
                            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Sayfa görüntülenmesi</p>
                            <p className="mt-1 font-display text-2xl font-bold text-amber-300">{formatInt(profileAnalytics.profile_views)}</p>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-zinc-950/40 p-4">
                            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Favorilere ekleyen</p>
                            <p className="mt-1 font-display text-2xl font-bold text-white">{formatInt(profileAnalytics.favorites_count)}</p>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-zinc-950/40 p-4">
                            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Yayında, sizin adınızla</p>
                            <p className="mt-1 font-display text-2xl font-bold text-emerald-400/90">
                                {formatInt(profileAnalytics.published_events_listed)}
                            </p>
                            <p className="mt-1 text-xs text-zinc-500">etkinlik</p>
                        </div>
                    </div>
                </section>
            ) : null}

            <form onSubmit={submit} className="max-w-3xl space-y-10">
                <section className="rounded-2xl border border-white/10 bg-zinc-900/50 p-6 sm:p-8">
                    <h2 className="font-display text-lg font-semibold text-white">Hakkında ve web</h2>
                    <p className="mt-1 text-sm text-zinc-500">Kısa tanıtım ve resmi site bağlantısı (opsiyonel).</p>
                    <div className="mt-6 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-zinc-400">Biyografi</label>
                            <textarea
                                value={data.bio}
                                onChange={(e) => setData('bio', e.target.value)}
                                rows={5}
                                className="mt-1 w-full rounded-xl border border-white/10 bg-zinc-950/60 px-4 py-3 text-white placeholder-zinc-600 focus:border-amber-500/40 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
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
                                className="mt-1 w-full rounded-xl border border-white/10 bg-zinc-950/60 px-4 py-3 text-white placeholder-zinc-600 focus:border-amber-500/40 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                            />
                            {errors.website && <p className="mt-1 text-sm text-red-400">{errors.website}</p>}
                        </div>
                    </div>
                </section>

                <section className="rounded-2xl border border-white/10 bg-zinc-900/50 p-6 sm:p-8">
                    <h2 className="font-display text-lg font-semibold text-white">Müzik türü</h2>
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

                <section className="rounded-2xl border border-white/10 bg-zinc-900/50 p-6 sm:p-8">
                    <h2 className="font-display text-lg font-semibold text-white">İletişim (yayındaki sayfa)</h2>
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
                                    setData('public_contact', { ...data.public_contact, email: e.target.value })
                                }
                                className="mt-1 w-full rounded-xl border border-white/10 bg-zinc-950/60 px-4 py-3 text-white"
                            />
                            {errors['public_contact.email'] && (
                                <p className="mt-1 text-sm text-red-400">{errors['public_contact.email']}</p>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-400">Telefon</label>
                            <input
                                value={data.public_contact.phone}
                                onChange={(e) =>
                                    setData('public_contact', { ...data.public_contact, phone: e.target.value })
                                }
                                className="mt-1 w-full rounded-xl border border-white/10 bg-zinc-950/60 px-4 py-3 text-white"
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
                                className="mt-1 w-full rounded-xl border border-white/10 bg-zinc-950/60 px-4 py-3 text-white"
                                placeholder="Örn. basın için …, booking saatleri …"
                            />
                            {errors['public_contact.note'] && (
                                <p className="mt-1 text-sm text-red-400">{errors['public_contact.note']}</p>
                            )}
                        </div>
                    </div>
                </section>

                <section className="rounded-2xl border border-white/10 bg-zinc-900/50 p-6 sm:p-8">
                    <h2 className="font-display text-lg font-semibold text-white">Menajer</h2>
                    <p className="mt-1 text-sm text-zinc-500">Menajer veya temsilci bilgileri (opsiyonel).</p>
                    <div className="mt-6 grid gap-4 sm:grid-cols-2">
                        <div>
                            <label className="block text-sm font-medium text-zinc-400">Ad / unvan</label>
                            <input
                                value={data.manager_info.name}
                                onChange={(e) =>
                                    setData('manager_info', { ...data.manager_info, name: e.target.value })
                                }
                                className="mt-1 w-full rounded-xl border border-white/10 bg-zinc-950/60 px-4 py-3 text-white"
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
                                className="mt-1 w-full rounded-xl border border-white/10 bg-zinc-950/60 px-4 py-3 text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-400">Telefon</label>
                            <input
                                value={data.manager_info.phone}
                                onChange={(e) =>
                                    setData('manager_info', { ...data.manager_info, phone: e.target.value })
                                }
                                className="mt-1 w-full rounded-xl border border-white/10 bg-zinc-950/60 px-4 py-3 text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-400">E-posta</label>
                            <input
                                type="email"
                                value={data.manager_info.email}
                                onChange={(e) =>
                                    setData('manager_info', { ...data.manager_info, email: e.target.value })
                                }
                                className="mt-1 w-full rounded-xl border border-white/10 bg-zinc-950/60 px-4 py-3 text-white"
                            />
                            {errors['manager_info.email'] && (
                                <p className="mt-1 text-sm text-red-400">{errors['manager_info.email']}</p>
                            )}
                        </div>
                    </div>
                </section>

                <section className="rounded-2xl border border-white/10 bg-zinc-900/50 p-6 sm:p-8">
                    <h2 className="font-display text-lg font-semibold text-white">Sosyal medya</h2>
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
                                    className="mt-1 w-full rounded-xl border border-white/10 bg-zinc-950/60 px-4 py-3 text-white"
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
