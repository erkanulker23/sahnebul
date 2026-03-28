import PhoneInput from '@/Components/PhoneInput';
import MusicGenresChecklist from '@/Components/MusicGenresChecklist';
import { inputBaseClass } from '@/Components/ui/Input';
import AdminLayout from '@/Layouts/AdminLayout';
import RichTextEditor from '@/Components/RichTextEditor';
import SeoHead from '@/Components/SeoHead';
import { initialMusicGenres } from '@/lib/musicGenresForm';
import { sanitizeEmailInput } from '@/lib/trPhoneInput';
import { AdminFormTabList, AdminFormTabPanel } from '@/Components/Admin/AdminFormTabs';
import AdminEntityPromoGalleryPanel from '@/Components/Admin/AdminEntityPromoGalleryPanel';
import AdminEntitySubscriptionPanel from '@/Components/Admin/AdminEntitySubscriptionPanel';
import { cn } from '@/lib/cn';
import { adminArtistPromoGalleryRoutes } from '@/lib/adminEntityPromoUrls';
import { Link, router, useForm } from '@inertiajs/react';
import { useState } from 'react';

interface MediaItem {
    id: number;
    path: string;
}

interface Artist {
    id: number;
    name: string;
    slug: string;
    managed_by_user_id?: number | null;
    events_count?: number;
    genre: string | null;
    music_genres?: string[] | null;
    bio: string | null;
    avatar: string | null;
    banner_image?: string | null;
    website: string | null;
    status: string;
    social_links?: Record<string, string> | null;
    manager_info?: { name?: string; company?: string; phone?: string; email?: string } | null;
    public_contact?: { email?: string; phone?: string; note?: string } | null;
    media: MediaItem[];
    spotify_id?: string | null;
    spotify_url?: string | null;
    spotify_auto_link_disabled?: boolean;
    promo_video_path?: string | null;
    promo_embed_url?: string | null;
    promo_gallery?: {
        embed_url?: string | null;
        video_path?: string | null;
        poster_path?: string | null;
        promo_kind?: 'story' | 'post' | null;
    }[] | null;
}

function initialSpotifyField(artist: Artist): string {
    if (artist.spotify_auto_link_disabled) {
        return '';
    }
    const fromSocial = (artist.social_links?.spotify ?? '').trim();
    if (fromSocial !== '') {
        return fromSocial;
    }
    const url = (artist.spotify_url ?? '').trim();
    if (url !== '') {
        return url;
    }
    const sid = (artist.spotify_id ?? '').trim();
    if (sid !== '') {
        return `https://open.spotify.com/artist/${sid}`;
    }
    return '';
}

interface ManagerUserRow {
    id: number;
    name: string;
    organization_display_name?: string | null;
    email: string;
}

interface SubscriptionPlanRow {
    id: number;
    name: string;
    slug: string;
    interval: string;
    price: string | number;
}

interface OwnerSub {
    starts_at: string;
    ends_at: string;
    plan: { id: number; name: string; slug: string; membership_type: string } | null;
}

interface Props {
    artist: Artist;
    musicGenreOptions: string[];
    managerUsers?: ManagerUserRow[];
    artistOwner?: { id: number; name: string; email: string } | null;
    artistSubscriptionPlans?: SubscriptionPlanRow[];
    artistOwnerSubscription?: OwnerSub | null;
}

function storageUrl(path: string | null): string | null {
    if (!path) return null;
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    return `/storage/${path}`;
}

export default function AdminArtistEdit({
    artist,
    musicGenreOptions,
    managerUsers = [],
    artistOwner = null,
    artistSubscriptionPlans = [],
    artistOwnerSubscription = null,
}: Readonly<Props>) {
    const [editTab, setEditTab] = useState<'genel' | 'gorsel' | 'sosyal' | 'icerik' | 'galeri'>('genel');
    const sl = artist.social_links ?? {};
    const mgr = artist.manager_info ?? {};
    const pub = artist.public_contact ?? {};
    const { data, setData, put, post, processing, errors, progress, transform } = useForm({
        name: artist.name,
        music_genres: initialMusicGenres(artist.music_genres, artist.genre, musicGenreOptions),
        bio: artist.bio ?? '',
        avatar: artist.avatar ?? '',
        banner_image: artist.banner_image ?? '',
        website: artist.website ?? '',
        status: artist.status,
        managed_by_user_id: artist.managed_by_user_id != null ? String(artist.managed_by_user_id) : '',
        spotify_auto_link_disabled: artist.spotify_auto_link_disabled === true,
        social_links: {
            instagram: sl.instagram ?? '',
            twitter: sl.twitter ?? '',
            youtube: sl.youtube ?? '',
            spotify: initialSpotifyField(artist),
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
        avatar_upload: null as File | null,
        banner_upload: null as File | null,
    });

    const field = cn('mt-1', inputBaseClass);
    const fieldMax = cn('mt-2 max-w-xl', inputBaseClass);
    const fieldPh = cn(
        'mt-2',
        inputBaseClass,
        'placeholder:text-zinc-500 dark:placeholder:text-zinc-600',
        'disabled:cursor-not-allowed disabled:opacity-50',
    );

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        const hasUpload = data.avatar_upload instanceof File || data.banner_upload instanceof File;
        const url = route('admin.artists.update', artist.id);
        const onSuccess = () => {
            setData('avatar_upload', null);
            setData('banner_upload', null);
        };
        // PHP genelde dosyaları yalnızca POST multipart ile $_FILES’a alır; gerçek PUT’ta yükleme düşer.
        if (hasUpload) {
            // Boş dosya alanlarını gönderme; bazı sunucularda "" ile gelen file input sorun çıkarabiliyor.
            transform((form) => {
                const { avatar_upload, banner_upload, ...rest } = form;
                return {
                    ...rest,
                    _method: 'put',
                    ...(avatar_upload instanceof File ? { avatar_upload } : {}),
                    ...(banner_upload instanceof File ? { banner_upload } : {}),
                };
            });
            post(url, {
                forceFormData: true,
                preserveScroll: true,
                onFinish: () => {
                    transform((f) => f);
                },
                onSuccess,
            });
        } else {
            put(url, {
                preserveScroll: true,
                onSuccess,
            });
        }
    };

    const addGallery = (file: File) => {
        router.post(
            route('admin.artists.media.store', artist.id),
            { photo: file },
            { forceFormData: true, preserveScroll: true }
        );
    };

    const removeGallery = (mediaId: number) => {
        if (!confirm('Bu görseli silmek istiyor musunuz?')) return;
        router.delete(route('admin.artists.media.destroy', { artist: artist.id, media: mediaId }), {
            preserveScroll: true,
        });
    };

    const destroyArtist = () => {
        const n = artist.events_count ?? 0;
        if (n > 0) {
            if (confirm(`Bu sanatçıya bağlı ${n} etkinlik var. Bu etkinlikleri de silmek istiyor musunuz?`)) {
                router.delete(route('admin.artists.destroy', artist.id), {
                    data: { delete_related_events: true },
                });
                return;
            }
            if (
                !confirm(
                    'Yalnızca sanatçı silinsin mi? Etkinlik kayıtları kalır; bu sanatçı etkinliklerden çıkarılır.',
                )
            ) {
                return;
            }
        } else if (!confirm('Sanatçıyı ve tüm verilerini silmek istediğinize emin misiniz?')) {
            return;
        }
        router.delete(route('admin.artists.destroy', artist.id));
    };

    const toggleMusicGenre = (label: string) => {
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

    return (
        <AdminLayout>
            <SeoHead title={`${artist.name} — Düzenle`} description="Sanatçıyı düzenleyin." noindex />
            <div className="space-y-6">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <Link
                            href={route('admin.artists.index')}
                            className="text-sm text-amber-700 hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-300"
                        >
                            ← Sanatçı listesi
                        </Link>
                        <h1 className="mt-2 text-2xl font-bold text-zinc-900 dark:text-white">Sanatçı düzenle</h1>
                        <p className="mt-1 text-sm text-zinc-500">/{artist.slug}</p>
                    </div>
                    <div className="flex gap-2">
                        <Link
                            href={route('artists.show', artist.slug)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
                        >
                            Sitede aç
                        </Link>
                        <button
                            type="button"
                            onClick={destroyArtist}
                            className="rounded-lg bg-red-600/90 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500"
                        >
                            Sil
                        </button>
                    </div>
                </div>

                <AdminEntitySubscriptionPanel
                    key={`artist-sub-${artist.id}-${artistOwnerSubscription?.ends_at ?? 'none'}-${artistOwnerSubscription?.plan?.slug ?? 'noplan'}`}
                    title="Sanatçı kullanıcı üyelik paketi"
                    description="Paket, sanatçı profiline bağlı kullanıcıya atanır."
                    postRouteName="admin.artists.subscription.update"
                    routeParam={{ artist: artist.id }}
                    owner={artistOwner}
                    plans={artistSubscriptionPlans}
                    ownerSubscription={artistOwnerSubscription}
                />

                <div className="max-w-3xl overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/60">
                    <AdminFormTabList
                        activeId={editTab}
                        onChange={(id) => setEditTab(id as typeof editTab)}
                        tabs={[
                            { id: 'genel', label: 'Genel' },
                            { id: 'gorsel', label: 'Profil görselleri' },
                            { id: 'sosyal', label: 'Sosyal ve iletişim' },
                            { id: 'icerik', label: 'Biyografi ve tanıtım medyası' },
                            { id: 'galeri', label: 'Galeri' },
                        ]}
                    />
                    <form id="admin-artist-edit-form" onSubmit={submit} className="space-y-6 p-6 pt-4">
                        <AdminFormTabPanel id="genel" activeId={editTab} className="space-y-6">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label className="block text-sm font-medium text-zinc-400">Ad *</label>
                            <input
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                className={field}
                            />
                            {errors.name && <p className="mt-1 text-sm text-red-400">{errors.name}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-400">Durum *</label>
                            <select
                                value={data.status}
                                onChange={(e) => setData('status', e.target.value)}
                                className={field}
                            >
                                <option value="pending">Beklemede</option>
                                <option value="approved">Onaylı</option>
                                <option value="rejected">Reddedildi</option>
                            </select>
                        </div>
                        <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-zinc-400">Organizasyon firması</label>
                            <p className="mt-0.5 text-xs text-zinc-500">
                                Yalnızca «Organizasyon firması» rolündeki kullanıcı hesapları. Sitede sanatçı profilinde organizasyon notu gösterilir.
                            </p>
                            <select
                                value={data.managed_by_user_id}
                                onChange={(e) => setData('managed_by_user_id', e.target.value)}
                                className={fieldMax}
                            >
                                <option value="">— Atanmadı —</option>
                                {managerUsers.map((u) => (
                                    <option key={u.id} value={u.id}>
                                        {(u.organization_display_name?.trim() || u.name) + ` (${u.email})`}
                                    </option>
                                ))}
                            </select>
                            {errors.managed_by_user_id && (
                                <p className="mt-1 text-sm text-red-400">{errors.managed_by_user_id}</p>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-400">Website</label>
                            <input
                                type="url"
                                value={data.website}
                                onChange={(e) => setData('website', e.target.value)}
                                className={field}
                            />
                        </div>
                    </div>

                    <MusicGenresChecklist
                        variant="admin"
                        label="Müzik türü"
                        helperText="Birden fazla seçebilirsiniz. Listeyi Yönetim → Müzik türleri sayfasından düzenleyebilirsiniz."
                        options={musicGenreOptions}
                        selected={data.music_genres}
                        onToggle={toggleMusicGenre}
                        error={errors.music_genres}
                    />
                        </AdminFormTabPanel>

                        <AdminFormTabPanel id="gorsel" activeId={editTab} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-zinc-400">Profil görseli (URL)</label>
                        <input
                            value={data.avatar}
                            onChange={(e) => setData('avatar', e.target.value)}
                            placeholder="https://... veya boş bırakıp dosya yükleyin"
                            className={field}
                        />
                        <div className="mt-2 flex flex-wrap items-center gap-3">
                            {storageUrl(data.avatar) && (
                                <img src={storageUrl(data.avatar) ?? ''} alt="" className="h-24 w-24 rounded-lg object-cover ring-1 ring-zinc-700" />
                            )}
                            {(data.avatar?.trim() || artist.avatar) && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setData('avatar', '');
                                        setData('avatar_upload', null);
                                    }}
                                    className="rounded-lg border border-red-500/50 bg-red-950/40 px-3 py-2 text-sm font-medium text-red-300 transition hover:border-red-400 hover:bg-red-950/60"
                                >
                                    Profil görselini kaldır
                                </button>
                            )}
                        </div>
                        <p className="mt-2 text-xs text-zinc-500">
                            Kaldır dedikten sonra değişikliği kaydetmek için <strong className="text-zinc-400">Kaydet</strong>’e basın.
                        </p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-zinc-400">Profil görseli (dosya)</label>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => setData('avatar_upload', e.target.files?.[0] ?? null)}
                            className="mt-1 w-full text-sm text-zinc-300"
                        />
                        {progress && (
                            <p className="mt-1 text-xs text-amber-400">Yükleniyor… {Math.round(progress.percentage ?? 0)}%</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-zinc-400">Kapak / banner (URL, isteğe bağlı)</label>
                        <input
                            value={data.banner_image}
                            onChange={(e) => setData('banner_image', e.target.value)}
                            placeholder="https://... veya boş"
                            className={field}
                        />
                        {storageUrl(data.banner_image) && (
                            <div className="mt-2 overflow-hidden rounded-lg border border-zinc-700">
                                <img
                                    src={storageUrl(data.banner_image) ?? ''}
                                    alt=""
                                    className="aspect-[21/9] max-h-40 w-full object-cover"
                                />
                            </div>
                        )}
                        {(data.banner_image?.trim() || artist.banner_image) && (
                            <button
                                type="button"
                                onClick={() => {
                                    setData('banner_image', '');
                                    setData('banner_upload', null);
                                }}
                                className="mt-2 rounded-lg border border-red-500/50 bg-red-950/40 px-3 py-2 text-sm font-medium text-red-300 transition hover:border-red-400 hover:bg-red-950/60"
                            >
                                Banner URL&apos;sini kaldır
                            </button>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-zinc-400">Kapak / banner (dosya)</label>
                        <p className="mt-0.5 text-xs text-zinc-500">Geniş yatay görsel; sanatçı sayfasında yalnızca yüklüyse gösterilir.</p>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => setData('banner_upload', e.target.files?.[0] ?? null)}
                            className="mt-1 w-full text-sm text-zinc-300"
                        />
                    </div>
                        </AdminFormTabPanel>

                        <AdminFormTabPanel id="sosyal" activeId={editTab} className="space-y-6">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label className="block text-sm font-medium text-zinc-400">Instagram</label>
                            <input
                                value={data.social_links.instagram}
                                onChange={(e) =>
                                    setData('social_links', { ...data.social_links, instagram: e.target.value })
                                }
                                className={field}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-400">X / Twitter</label>
                            <input
                                value={data.social_links.twitter}
                                onChange={(e) =>
                                    setData('social_links', { ...data.social_links, twitter: e.target.value })
                                }
                                className={field}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-400">YouTube</label>
                            <input
                                value={data.social_links.youtube}
                                onChange={(e) =>
                                    setData('social_links', { ...data.social_links, youtube: e.target.value })
                                }
                                className={field}
                            />
                        </div>
                        <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-zinc-400">Spotify</label>
                            <p className="mt-1 text-xs text-zinc-500">
                                Sanatçı sayfasındaki gömülü oynatıcı ve bağlantı buradan gelir. Aynı isimde başka bir sanatçıya denk gelen
                                yanlış eşleşmeyi kaldırmak için aşağıdaki kutuyu işaretleyip kaydedin; arka plandaki isimle otomatik eşleştirme de
                                bu sanatçı için kapatılır.
                            </p>
                            <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-lg border border-zinc-700/80 bg-zinc-800/40 px-3 py-2.5">
                                <input
                                    type="checkbox"
                                    className="mt-1 h-4 w-4 rounded border-zinc-600 text-amber-500 focus:ring-amber-500"
                                    checked={data.spotify_auto_link_disabled}
                                    onChange={(e) => {
                                        const on = e.target.checked;
                                        setData('spotify_auto_link_disabled', on);
                                        if (on) {
                                            setData('social_links', { ...data.social_links, spotify: '' });
                                        }
                                    }}
                                />
                                <span className="text-sm text-zinc-300">
                                    <span className="font-medium text-white">Spotify yok / gösterme</span>
                                    <span className="mt-0.5 block text-zinc-500">
                                        Profilde Spotify bölümünü kapatır; sunucudaki otomatik isimle Spotify eşleştirmesinin bu sanatçıyı yeniden
                                        bağlamasını engeller.
                                    </span>
                                </span>
                            </label>
                            <input
                                value={data.social_links.spotify}
                                onChange={(e) =>
                                    setData('social_links', { ...data.social_links, spotify: e.target.value })
                                }
                                disabled={data.spotify_auto_link_disabled}
                                placeholder="https://open.spotify.com/intl-tr/artist/… veya 22 karakterlik sanatçı ID"
                                className={fieldPh}
                            />
                            {(errors as Record<string, string | undefined>)['social_links.spotify'] && (
                                <p className="mt-1 text-sm text-red-400">
                                    {(errors as Record<string, string>)['social_links.spotify']}
                                </p>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-400">TikTok</label>
                            <input
                                value={data.social_links.tiktok}
                                onChange={(e) =>
                                    setData('social_links', { ...data.social_links, tiktok: e.target.value })
                                }
                                className={field}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-400">Facebook</label>
                            <input
                                value={data.social_links.facebook}
                                onChange={(e) =>
                                    setData('social_links', { ...data.social_links, facebook: e.target.value })
                                }
                                className={field}
                            />
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                            <h3 className="text-sm font-semibold text-zinc-300">Yayındaki iletişim (opsiyonel)</h3>
                            <p className="mt-1 text-xs text-zinc-500">Boş alanlar sitede gösterilmez.</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-400">İletişim e-posta</label>
                            <input
                                type="email"
                                value={data.public_contact.email}
                                onChange={(e) =>
                                    setData('public_contact', {
                                        ...data.public_contact,
                                        email: sanitizeEmailInput(e.target.value),
                                    })
                                }
                                className={field}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-400">İletişim telefon</label>
                            <PhoneInput
                                value={data.public_contact.phone ?? ''}
                                onChange={(v) => setData('public_contact', { ...data.public_contact, phone: v })}
                                className={field}
                            />
                        </div>
                        <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-zinc-400">İletişim notu</label>
                            <textarea
                                value={data.public_contact.note}
                                onChange={(e) =>
                                    setData('public_contact', { ...data.public_contact, note: e.target.value })
                                }
                                rows={2}
                                className={field}
                            />
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                            <h3 className="text-sm font-semibold text-zinc-300">Menajer (opsiyonel)</h3>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-400">Ad / unvan</label>
                            <input
                                value={data.manager_info.name}
                                onChange={(e) =>
                                    setData('manager_info', { ...data.manager_info, name: e.target.value })
                                }
                                className={field}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-400">Ajans / şirket</label>
                            <input
                                value={data.manager_info.company}
                                onChange={(e) =>
                                    setData('manager_info', { ...data.manager_info, company: e.target.value })
                                }
                                className={field}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-400">Menajer telefon</label>
                            <PhoneInput
                                value={data.manager_info.phone ?? ''}
                                onChange={(v) => setData('manager_info', { ...data.manager_info, phone: v })}
                                className={field}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-400">Menajer e-posta</label>
                            <input
                                type="email"
                                value={data.manager_info.email}
                                onChange={(e) =>
                                    setData('manager_info', {
                                        ...data.manager_info,
                                        email: sanitizeEmailInput(e.target.value),
                                    })
                                }
                                className={field}
                            />
                        </div>
                    </div>
                        </AdminFormTabPanel>

                        <AdminFormTabPanel id="icerik" activeId={editTab} className="space-y-6">
                    <div>
                        <span className="block text-sm font-medium text-zinc-400">Biyografi</span>
                        <RichTextEditor
                            value={data.bio}
                            onChange={(html) => setData('bio', html)}
                            placeholder="Sanatçı biyografisi…"
                            className="mt-2"
                        />
                    </div>

                    <p className="text-xs text-zinc-500">
                        Sanatçı sayfasında üstte tanıtım videoları, altta gönderi görselleri görünür. «Galeri» sekmesindeki fotoğraflar bu tanıtım alanından
                        bağımsızdır.
                    </p>
                    <AdminEntityPromoGalleryPanel
                        entity={artist}
                        variant="artist"
                        routes={adminArtistPromoGalleryRoutes(artist.id)}
                        showVideoUrlBackgroundOption={false}
                    />
                        </AdminFormTabPanel>
                    </form>

                    <AdminFormTabPanel id="galeri" activeId={editTab} className="space-y-4 border-t border-zinc-700/80 p-6">
                    <h2 className="text-lg font-semibold text-zinc-100">Fotoğraf galerisi</h2>
                    <p className="text-sm text-zinc-500">Fotoğraf ekleyin veya silin. Yükleme anında kaydedilir; «Kaydet» gerekmez.</p>
                    <input
                        type="file"
                        accept="image/*"
                        className="mt-4 block text-sm text-zinc-300"
                        onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) addGallery(f);
                            e.target.value = '';
                        }}
                    />
                    <div className="mt-4 flex flex-wrap gap-3">
                        {artist.media.map((m) => (
                            <div key={m.id} className="relative">
                                <img
                                    src={storageUrl(m.path) ?? ''}
                                    alt=""
                                    className="h-28 w-28 rounded-lg object-cover ring-1 ring-zinc-700"
                                />
                                <button
                                    type="button"
                                    onClick={() => removeGallery(m.id)}
                                    className="absolute -right-2 -top-2 rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-white"
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                    </div>
                    </AdminFormTabPanel>

                    <div className="flex flex-wrap gap-3 border-t border-zinc-700/80 bg-zinc-950/30 px-6 py-4">
                        <button
                            type="submit"
                            form="admin-artist-edit-form"
                            disabled={processing}
                            className="rounded-lg bg-amber-500 px-6 py-2.5 font-semibold text-zinc-950 hover:bg-amber-400 disabled:opacity-50"
                        >
                            Kaydet
                        </button>
                        {artist.status === 'pending' && (
                            <>
                                <button
                                    type="button"
                                    onClick={() => router.post(route('admin.artists.approve', artist.id), {}, { preserveScroll: true })}
                                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
                                >
                                    Onayla
                                </button>
                                <button
                                    type="button"
                                    onClick={() => router.post(route('admin.artists.reject', artist.id), {}, { preserveScroll: true })}
                                    className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
                                >
                                    Reddet
                                </button>
                            </>
                        )}
                        {editTab === 'galeri' ? (
                            <p className="w-full text-xs text-zinc-500 sm:w-auto sm:flex-1 sm:text-right">
                                Diğer sekmelerdeki değişiklikleri kaydetmek için «Kaydet»e basın.
                            </p>
                        ) : null}
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
