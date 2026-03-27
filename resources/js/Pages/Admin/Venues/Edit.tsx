import PhoneInput from '@/Components/PhoneInput';
import AdminLayout from '@/Layouts/AdminLayout';
import InputError from '@/Components/InputError';
import LocationSelect from '@/Components/LocationSelect';
import RichTextEditor from '@/Components/RichTextEditor';
import SeoHead from '@/Components/SeoHead';
import VenueGoogleLocationField from '@/Components/VenueGoogleLocationField';
import { isRichTextProbablyEmpty } from '@/lib/buildVenuePayloadFromGooglePlace';
import { formatTrPhoneInput } from '@/lib/trPhoneInput';
import AdminEntitySubscriptionPanel from '@/Components/Admin/AdminEntitySubscriptionPanel';
import { Link, router, useForm } from '@inertiajs/react';
import axios from 'axios';
import { useState } from 'react';

interface MediaItem {
    id: number;
    path: string;
}

interface Venue {
    id: number;
    name: string;
    slug: string;
    events_count?: number;
    category_id: number;
    city_id: number;
    district_id?: number | null;
    neighborhood_id?: number | null;
    description: string | null;
    address: string;
    latitude: string | null;
    longitude: string | null;
    google_maps_url?: string | null;
    capacity: number | null;
    phone: string | null;
    whatsapp: string | null;
    website: string | null;
    social_links?: Record<string, string> | null;
    cover_image: string | null;
    status: string;
    is_featured?: boolean;
    view_count?: number;
    media: MediaItem[];
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
    venue: Venue;
    categories: { id: number; name: string }[];
    googleMapsBrowserKey?: string | null;
    venueOwner?: { id: number; name: string; email: string } | null;
    venueSubscriptionPlans?: SubscriptionPlanRow[];
    venueOwnerSubscription?: OwnerSub | null;
}

function storageUrl(path: string | null): string | null {
    if (!path) return null;
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    return `/storage/${path}`;
}

const venueSocialKeys = ['instagram', 'twitter', 'youtube', 'spotify', 'tiktok', 'facebook'] as const;

export default function AdminVenueEdit({
    venue,
    categories,
    googleMapsBrowserKey = null,
    venueOwner = null,
    venueSubscriptionPlans = [],
    venueOwnerSubscription = null,
}: Readonly<Props>) {
    const [galleryUploading, setGalleryUploading] = useState(false);
    const [coverImporting, setCoverImporting] = useState(false);
    const [coverImportError, setCoverImportError] = useState<string | null>(null);
    const [googleGalleryImporting, setGoogleGalleryImporting] = useState(false);
    const [googleGalleryError, setGoogleGalleryError] = useState<string | null>(null);
    const sl = venue.social_links ?? {};
    const { data, setData, put, processing, errors, progress, transform } = useForm({
        name: venue.name,
        slug: venue.slug,
        category_id: String(venue.category_id),
        city_id: String(venue.city_id),
        district_id: venue.district_id != null ? String(venue.district_id) : '',
        neighborhood_id: venue.neighborhood_id != null ? String(venue.neighborhood_id) : '',
        description: venue.description ?? '',
        address: venue.address,
        latitude: venue.latitude ?? '',
        longitude: venue.longitude ?? '',
        google_maps_url: venue.google_maps_url ?? '',
        capacity: venue.capacity?.toString() ?? '',
        phone: venue.phone ?? '',
        whatsapp: venue.whatsapp ?? '',
        website: venue.website ?? '',
        social_links: {
            instagram: sl.instagram ?? '',
            twitter: sl.twitter ?? '',
            youtube: sl.youtube ?? '',
            spotify: sl.spotify ?? '',
            tiktok: sl.tiktok ?? '',
            facebook: sl.facebook ?? '',
        },
        cover_image: venue.cover_image ?? '',
        status: venue.status,
        is_featured: Boolean(venue.is_featured),
        cover_upload: null as File | null,
    });

    transform((formData) => ({
        ...formData,
        is_featured: formData.is_featured ? 1 : 0,
    }));

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        put(route('admin.venues.update', { venue: venue.id }), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => setData('cover_upload', null),
        });
    };

    const addGallery = (files: FileList | File[]) => {
        const list = Array.from(files);
        if (list.length === 0) return;
        const fd = new FormData();
        list.forEach((file) => {
            fd.append('photos[]', file);
        });
        setGalleryUploading(true);
        router.post(route('admin.venues.media.store', { venue: venue.id }), fd, {
            forceFormData: true,
            preserveScroll: true,
            onFinish: () => setGalleryUploading(false),
        });
    };

    const removeGallery = (mediaId: number) => {
        if (!confirm('Bu görseli silmek istiyor musunuz?')) return;
        router.delete(route('admin.venues.media.destroy', { venue: venue.id, media: mediaId }), { preserveScroll: true });
    };

    const destroyVenue = () => {
        const n = venue.events_count ?? 0;
        const msg =
            n > 0
                ? `Bu mekana ait ${n} etkinlik kaydı var. Mekanı silmek bu etkinlikleri de kalıcı olarak siler. Devam etmek istiyor musunuz?`
                : 'Mekanı ve ilişkili verileri silmek istediğinize emin misiniz?';
        if (!confirm(msg)) return;
        router.delete(route('admin.venues.destroy', { venue: venue.id }));
    };

    return (
        <AdminLayout>
            <SeoHead title={`${venue.name} — Düzenle`} description="Mekanı düzenleyin." noindex />
            <div className="space-y-6">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <Link href={route('admin.venues.index')} className="text-sm text-amber-400 hover:text-amber-300">
                            ← Mekan listesi
                        </Link>
                        <h1 className="mt-2 text-2xl font-bold text-white">Mekan düzenle</h1>
                        <p className="mt-1 text-sm text-zinc-500">
                            /{venue.slug}
                            <span className="ml-2 text-zinc-600">
                                · {(venue.view_count ?? 0).toLocaleString('tr-TR')} görüntülenme
                            </span>
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Link
                            href={route('venues.show', venue.slug)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg border border-zinc-600 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
                        >
                            Sitede aç
                        </Link>
                        <button
                            type="button"
                            onClick={destroyVenue}
                            className="rounded-lg bg-red-600/90 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500"
                        >
                            Sil
                        </button>
                    </div>
                </div>

                <AdminEntitySubscriptionPanel
                    key={`venue-sub-${venue.id}-${venueOwnerSubscription?.ends_at ?? 'none'}-${venueOwnerSubscription?.plan?.slug ?? 'noplan'}`}
                    title="Mekân sahibi üyelik paketi"
                    description="Paket, mekânı sisteme ekleyen kullanıcıya atanır. Sınırsız ücretsiz seçeneği yalnızca yönetici panelinden kullanılır."
                    postRouteName="admin.venues.subscription.update"
                    routeParam={{ venue: venue.id }}
                    owner={venueOwner}
                    plans={venueSubscriptionPlans}
                    ownerSubscription={venueOwnerSubscription}
                />

                <form onSubmit={submit} className="max-w-3xl space-y-6 rounded-xl border border-zinc-800 bg-zinc-900/60 p-6">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-zinc-400">Mekan adı *</label>
                            <input
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                            />
                            {errors.name && <p className="mt-1 text-sm text-red-400">{errors.name}</p>}
                        </div>
                        <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-zinc-400">URL slug *</label>
                            <p className="mt-0.5 text-xs text-zinc-500">Küçük harf, rakam ve tire. Örnek: harbiye-acikhava</p>
                            <input
                                value={data.slug}
                                onChange={(e) => setData('slug', e.target.value)}
                                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 font-mono text-sm text-white"
                            />
                            {errors.slug && <p className="mt-1 text-sm text-red-400">{errors.slug}</p>}
                        </div>
                        <div className="sm:col-span-2">
                            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-zinc-300">
                                <input
                                    type="checkbox"
                                    checked={data.is_featured}
                                    onChange={(e) => setData('is_featured', e.target.checked)}
                                    className="rounded border-zinc-600 bg-zinc-800 text-amber-500"
                                />
                                Öne çıkan mekan (bulunduğu şehirde /mekanlar listesinde üstte ve belirgin kartla gösterilir)
                            </label>
                        </div>
                        <div className="sm:col-span-2">
                            <VenueGoogleLocationField
                                googleMapsBrowserKey={googleMapsBrowserKey}
                                currentAddress={data.address}
                                onApply={(payload) => {
                                    setData('address', payload.address);
                                    setData('latitude', payload.latitude);
                                    setData('longitude', payload.longitude);
                                    if (payload.city_id) {
                                        setData('city_id', payload.city_id);
                                    }
                                    if (payload.district_id) {
                                        setData('district_id', payload.district_id);
                                    } else if (payload.city_id) {
                                        setData('district_id', '');
                                    }
                                    if (payload.neighborhood_id) {
                                        setData('neighborhood_id', payload.neighborhood_id);
                                    } else if (payload.district_id) {
                                        setData('neighborhood_id', '');
                                    } else if (payload.city_id) {
                                        setData('neighborhood_id', '');
                                    }
                                    if (payload.placeName) {
                                        setData('name', payload.placeName);
                                    }
                                    if (payload.phone) {
                                        setData('phone', payload.phone);
                                    }
                                    if (payload.whatsapp) {
                                        setData('whatsapp', payload.whatsapp);
                                    }
                                    if (payload.website) {
                                        setData('website', payload.website);
                                    }
                                    if (payload.social_links) {
                                        const sl = { ...data.social_links };
                                        for (const [k, v] of Object.entries(payload.social_links)) {
                                            if (typeof v === 'string' && v.trim() !== '') {
                                                sl[k as keyof typeof sl] = v;
                                            }
                                        }
                                        setData('social_links', sl);
                                    }
                                    if (payload.descriptionHtmlFromGoogle && isRichTextProbablyEmpty(data.description)) {
                                        setData('description', payload.descriptionHtmlFromGoogle);
                                    }
                                    if (payload.googleMapsUrl) {
                                        setData('google_maps_url', payload.googleMapsUrl);
                                    }
                                    if (payload.galleryImageUrlsFromGoogle && payload.galleryImageUrlsFromGoogle.length > 0) {
                                        setGoogleGalleryImporting(true);
                                        setGoogleGalleryError(null);
                                        setCoverImportError(null);
                                        axios
                                            .post(
                                                route('admin.venues.google-gallery-import', venue.id),
                                                {
                                                    urls: payload.galleryImageUrlsFromGoogle.slice(0, 5),
                                                    set_cover_from_first: true,
                                                },
                                                { headers: { Accept: 'application/json' }, timeout: 120_000 },
                                            )
                                            .then(() => {
                                                setData('cover_upload', null);
                                                router.reload({ only: ['venue'] });
                                            })
                                            .catch((err: unknown) => {
                                                const ax = err as { response?: { data?: { message?: string } } };
                                                setGoogleGalleryError(
                                                    ax.response?.data?.message ?? 'Google görselleri indirilemedi.',
                                                );
                                            })
                                            .finally(() => setGoogleGalleryImporting(false));
                                    } else if (payload.coverImageUrlFromGoogle?.trim()) {
                                        const url = payload.coverImageUrlFromGoogle.trim();
                                        setCoverImporting(true);
                                        setCoverImportError(null);
                                        axios
                                            .post<{ cover_image: string }>(
                                                route('admin.venues.cover-import', venue.id),
                                                { url },
                                                { headers: { Accept: 'application/json' }, timeout: 120_000 },
                                            )
                                            .then((res) => {
                                                setData('cover_image', res.data.cover_image);
                                                setData('cover_upload', null);
                                            })
                                            .catch((err: unknown) => {
                                                const ax = err as {
                                                    response?: { data?: { message?: string; errors?: { url?: string[] } } };
                                                };
                                                const msg =
                                                    ax.response?.data?.errors?.url?.[0] ??
                                                    ax.response?.data?.message ??
                                                    'Kapak görseli indirilemedi.';
                                                setCoverImportError(msg);
                                            })
                                            .finally(() => setCoverImporting(false));
                                    }
                                }}
                            />
                        </div>
                        <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-zinc-400">Adres *</label>
                            <input
                                value={data.address}
                                onChange={(e) => setData('address', e.target.value)}
                                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                            />
                            {errors.address && <p className="mt-1 text-sm text-red-400">{errors.address}</p>}
                        </div>
                        <div className="sm:col-span-2">
                            <LocationSelect
                                variant="admin"
                                cityId={data.city_id}
                                districtId={data.district_id}
                                neighborhoodId={data.neighborhood_id}
                                onCityChange={(v) => {
                                    setData('city_id', v);
                                    setData('district_id', '');
                                    setData('neighborhood_id', '');
                                }}
                                onDistrictChange={(v) => {
                                    setData('district_id', v);
                                    setData('neighborhood_id', '');
                                }}
                                onNeighborhoodChange={(v) => setData('neighborhood_id', v)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-400">Kategori *</label>
                            <select
                                value={data.category_id}
                                onChange={(e) => setData('category_id', e.target.value)}
                                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                            >
                                {categories.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-400">Enlem</label>
                            <input
                                value={data.latitude}
                                onChange={(e) => setData('latitude', e.target.value)}
                                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-400">Boylam</label>
                            <input
                                value={data.longitude}
                                onChange={(e) => setData('longitude', e.target.value)}
                                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-400">Kapasite</label>
                            <input
                                type="number"
                                min={1}
                                value={data.capacity}
                                onChange={(e) => setData('capacity', e.target.value)}
                                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-400">Durum *</label>
                            <select
                                value={data.status}
                                onChange={(e) => setData('status', e.target.value)}
                                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                            >
                                <option value="pending">Beklemede</option>
                                <option value="approved">Onaylı</option>
                                <option value="rejected">Reddedildi</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-400">Telefon</label>
                            <PhoneInput
                                value={data.phone ?? ''}
                                onChange={(v) => setData('phone', v)}
                                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-400">WhatsApp</label>
                            <input
                                value={data.whatsapp ?? ''}
                                onChange={(e) => {
                                    const v = e.target.value;
                                    setData(
                                        'whatsapp',
                                        /^https?:\/\//i.test(v.trim()) ? v : formatTrPhoneInput(v),
                                    );
                                }}
                                placeholder="05XX XXX XX XX veya https://wa.me/…"
                                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                            />
                        </div>
                        <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-zinc-400">Website</label>
                            <input
                                type="url"
                                value={data.website}
                                onChange={(e) => setData('website', e.target.value)}
                                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                            />
                        </div>
                    </div>

                    <div>
                        <h3 className="text-sm font-semibold text-zinc-300">Sosyal medya</h3>
                        <p className="mt-1 text-xs text-zinc-500">Tam URL (https://…). Boş bırakılanlar sitede gösterilmez.</p>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                            {venueSocialKeys.map((key) => (
                                <div key={key}>
                                    <label className="block text-sm font-medium capitalize text-zinc-400">{key}</label>
                                    <input
                                        type="url"
                                        value={data.social_links[key]}
                                        onChange={(e) =>
                                            setData('social_links', { ...data.social_links, [key]: e.target.value })
                                        }
                                        className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                                        placeholder="https://"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <span className="block text-sm font-medium text-zinc-400">Açıklama</span>
                        <RichTextEditor
                            value={data.description ?? ''}
                            onChange={(html) => setData('description', html)}
                            placeholder="Mekan hakkında…"
                            className="mt-2"
                        />
                        <InputError message={errors.description} className="mt-1" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-zinc-400">Kapak görseli (URL)</label>
                        <p className="mt-0.5 text-xs text-zinc-500">
                            Google ile yer seçildiğinde kapak otomatik sunucuya indirilir; canlı sitede harici bağlantı kullanılmaz.
                        </p>
                        <input
                            value={data.cover_image}
                            onChange={(e) => setData('cover_image', e.target.value)}
                            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                        />
                        {coverImporting && <p className="mt-2 text-sm text-amber-400">Kapak görseli indiriliyor…</p>}
                        {googleGalleryImporting && (
                            <p className="mt-2 text-sm text-amber-400">Google fotoğrafları (galeri + kapak) indiriliyor…</p>
                        )}
                        {coverImportError && <p className="mt-2 text-sm text-red-400">{coverImportError}</p>}
                        {googleGalleryError && <p className="mt-2 text-sm text-red-400">{googleGalleryError}</p>}
                        {storageUrl(data.cover_image) && (
                            <img src={storageUrl(data.cover_image) ?? ''} alt="" className="mt-2 h-32 max-w-md rounded-lg object-cover" />
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-zinc-400">Kapak görseli (dosya)</label>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => setData('cover_upload', e.target.files?.[0] ?? null)}
                            className="mt-1 w-full text-sm text-zinc-300"
                        />
                        {progress && (
                            <p className="mt-1 text-xs text-amber-400">Yükleniyor… {Math.round(progress.percentage ?? 0)}%</p>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <button
                            type="submit"
                            disabled={processing}
                            className="rounded-lg bg-amber-500 px-6 py-2.5 font-semibold text-zinc-950 hover:bg-amber-400 disabled:opacity-50"
                        >
                            Kaydet
                        </button>
                        {venue.status === 'pending' && (
                            <>
                                <button
                                    type="button"
                                    onClick={() => router.post(route('admin.venues.approve', { venue: venue.id }), {}, { preserveScroll: true })}
                                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
                                >
                                    Onayla
                                </button>
                                <button
                                    type="button"
                                    onClick={() => router.post(route('admin.venues.reject', { venue: venue.id }), {}, { preserveScroll: true })}
                                    className="rounded-lg border border-zinc-600 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
                                >
                                    Reddet
                                </button>
                            </>
                        )}
                    </div>
                </form>

                <section className="mt-10 max-w-3xl rounded-xl border border-zinc-800 bg-zinc-900/60 p-6">
                    <h2 className="text-lg font-semibold text-white">Galeri</h2>
                    <p className="mt-1 text-sm text-zinc-500">Birden fazla fotoğraf seçebilirsiniz (aynı anda toplu yükleme).</p>
                    <input
                        type="file"
                        accept="image/*"
                        multiple
                        disabled={galleryUploading}
                        className="mt-4 block text-sm text-zinc-300 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-700 file:px-3 file:py-1.5 file:text-sm file:text-white hover:file:bg-zinc-600 disabled:opacity-50"
                        onChange={(e) => {
                            const list = e.target.files;
                            if (list?.length) addGallery(list);
                            e.target.value = '';
                        }}
                    />
                    {galleryUploading && (
                        <p className="mt-2 text-sm text-amber-400">Yükleniyor…</p>
                    )}
                    <div className="mt-4 flex flex-wrap gap-3">
                        {venue.media.map((m) => (
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
                </section>
            </div>
        </AdminLayout>
    );
}
