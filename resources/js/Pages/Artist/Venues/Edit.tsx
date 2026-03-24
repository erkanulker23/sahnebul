import ArtistLayout from '@/Layouts/ArtistLayout';
import LocationSelect from '@/Components/LocationSelect';
import VenueGoogleLocationField from '@/Components/VenueGoogleLocationField';
import SeoHead from '@/Components/SeoHead';
import { router, useForm } from '@inertiajs/react';

interface VenueMedia {
    id: number;
    type: string;
    path: string;
    thumbnail?: string | null;
}

interface Venue {
    id: number;
    name: string;
    description: string | null;
    address: string;
    latitude?: number | string | null;
    longitude?: number | string | null;
    capacity: number | null;
    phone: string | null;
    whatsapp: string | null;
    website: string | null;
    social_links?: Record<string, string> | null;
    city_id: number;
    district_id: number | null;
    neighborhood_id: number | null;
    category_id: number;
    media?: VenueMedia[];
}

interface Category {
    id: number;
    name: string;
}

interface Props {
    venue: Venue;
    categories: Category[];
    googleMapsBrowserKey?: string | null;
}

const venueSocialKeys = ['instagram', 'twitter', 'youtube', 'spotify', 'tiktok', 'facebook'] as const;

function imageSrc(path: string): string {
    if (path.startsWith('http://') || path.startsWith('https://')) {
        return path;
    }
    return `/storage/${path}`;
}

export default function ArtistVenueEdit({ venue, categories, googleMapsBrowserKey = null }: Props) {
    const gallery = venue.media ?? [];

    const sl = venue.social_links ?? {};
    const { data, setData, put, processing, errors } = useForm({
        name: venue.name,
        category_id: venue.category_id,
        city_id: venue.city_id?.toString() ?? '',
        district_id: venue.district_id?.toString() ?? '',
        neighborhood_id: venue.neighborhood_id?.toString() ?? '',
        description: venue.description ?? '',
        address: venue.address,
        latitude: venue.latitude != null && venue.latitude !== '' ? String(venue.latitude) : '',
        longitude: venue.longitude != null && venue.longitude !== '' ? String(venue.longitude) : '',
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
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        put(route('artist.venues.update', venue.id));
    };

    const onPickGalleryPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const fd = new FormData();
        fd.append('photo', file);
        router.post(route('artist.venues.media.store', venue.id), fd, {
            forceFormData: true,
            preserveScroll: true,
        });
        e.target.value = '';
    };

    const removeGalleryPhoto = (mediaId: number) => {
        if (!globalThis.confirm('Bu görseli galeriden kaldırmak istediğinize emin misiniz?')) {
            return;
        }
        router.delete(route('artist.venues.media.destroy', [venue.id, mediaId]), { preserveScroll: true });
    };

    return (
        <ArtistLayout>
            <SeoHead title={`${venue.name} Düzenle - Sahnebul`} description="Mekan bilgilerini ve galeriyi güncelleyin." noindex />

            <h1 className="font-display mb-8 text-2xl font-bold text-white">Sahne Düzenle</h1>

            <form onSubmit={submit} className="max-w-2xl space-y-6 rounded-xl border border-white/5 bg-zinc-900/50 p-8">
                <div>
                    <label className="block text-sm font-medium text-zinc-400">Sahne Adı *</label>
                    <input value={data.name} onChange={(e) => setData('name', e.target.value)} required className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-800 px-4 py-3 text-white" />
                    {errors.name && <p className="mt-1 text-sm text-red-400">{errors.name}</p>}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <label className="block text-sm font-medium text-zinc-400">Kategori *</label>
                        <select value={data.category_id} onChange={(e) => setData('category_id', parseInt(e.target.value))} required className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-800 px-4 py-3 text-white">
                            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                </div>
                <LocationSelect
                    cityId={data.city_id}
                    districtId={data.district_id}
                    neighborhoodId={data.neighborhood_id}
                    onCityChange={(v) => { setData('city_id', v); setData('district_id', ''); setData('neighborhood_id', ''); }}
                    onDistrictChange={(v) => { setData('district_id', v); setData('neighborhood_id', ''); }}
                    onNeighborhoodChange={(v) => setData('neighborhood_id', v)}
                    cityError={errors.city_id}
                />
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
                            const merged = { ...data.social_links };
                            for (const [k, v] of Object.entries(payload.social_links)) {
                                if (typeof v === 'string' && v.trim() !== '') {
                                    (merged as Record<string, string>)[k] = v;
                                }
                            }
                            setData('social_links', merged);
                        }
                        if (payload.descriptionPlainFromGoogle && !data.description.trim()) {
                            setData('description', payload.descriptionPlainFromGoogle);
                        }
                    }}
                />
                <div>
                    <label className="block text-sm font-medium text-zinc-400">Adres *</label>
                    <input value={data.address} onChange={(e) => setData('address', e.target.value)} required className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-800 px-4 py-3 text-white" />
                    {errors.address && <p className="mt-1 text-sm text-red-400">{errors.address}</p>}
                </div>
                {(data.latitude || data.longitude) && (
                    <p className="text-xs text-zinc-500">
                        Harita koordinatları: {data.latitude || '—'}, {data.longitude || '—'} (yakındaki etkinlikler ve yol tarifi için kullanılır)
                    </p>
                )}
                {(errors.latitude || errors.longitude) && (
                    <p className="text-sm text-red-400">{errors.latitude ?? errors.longitude}</p>
                )}
                <div>
                    <label className="block text-sm font-medium text-zinc-400">Açıklama</label>
                    <textarea value={data.description} onChange={(e) => setData('description', e.target.value)} rows={4} className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-800 px-4 py-3 text-white" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                        <label className="block text-sm font-medium text-zinc-400">Kapasite</label>
                        <input type="number" min={1} value={data.capacity} onChange={(e) => setData('capacity', e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-800 px-4 py-3 text-white" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-zinc-400">Telefon</label>
                        <input value={data.phone} onChange={(e) => setData('phone', e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-800 px-4 py-3 text-white" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-zinc-400">WhatsApp</label>
                        <input value={data.whatsapp} onChange={(e) => setData('whatsapp', e.target.value)} placeholder="+90… veya wa.me linki" className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-800 px-4 py-3 text-white" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-zinc-400">Web</label>
                        <input type="url" value={data.website} onChange={(e) => setData('website', e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-800 px-4 py-3 text-white" />
                    </div>
                </div>
                <div>
                    <p className="text-sm font-medium text-zinc-400">Sosyal medya</p>
                    <p className="mt-1 text-xs text-zinc-500">Tam URL girin; boş olanlar sitede gösterilmez.</p>
                    <div className="mt-3 grid gap-4 sm:grid-cols-2">
                        {venueSocialKeys.map((key) => (
                            <div key={key}>
                                <label className="block text-xs font-medium capitalize text-zinc-500">{key}</label>
                                <input
                                    type="url"
                                    value={data.social_links[key]}
                                    onChange={(e) =>
                                        setData('social_links', { ...data.social_links, [key]: e.target.value })
                                    }
                                    placeholder="https://"
                                    className="mt-1 w-full rounded-xl border border-white/10 bg-zinc-800 px-4 py-3 text-white"
                                />
                            </div>
                        ))}
                    </div>
                </div>
                <button type="submit" disabled={processing} className="rounded-xl bg-amber-500 px-8 py-3 font-semibold text-zinc-950 hover:bg-amber-400 disabled:opacity-50">
                    Güncelle
                </button>
            </form>

            <section className="mt-12 max-w-2xl rounded-xl border border-white/5 bg-zinc-900/50 p-8">
                <h2 className="font-display text-lg font-semibold text-white">Mekan galerisi</h2>
                <p className="mt-1 text-sm text-zinc-500">
                    Fotoğraflar mekan sayfasında “Mekan Fotoğrafları” bölümünde gösterilir. JPG, PNG veya WebP, en fazla 10 MB.
                </p>

                <div className="mt-6">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm font-medium text-amber-400 transition hover:bg-amber-500/15">
                        <span>+ Fotoğraf yükle</span>
                        <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            className="hidden"
                            onChange={onPickGalleryPhoto}
                        />
                    </label>
                </div>

                {gallery.length === 0 ? (
                    <p className="mt-6 text-sm text-zinc-500">Henüz galeri fotoğrafı yok.</p>
                ) : (
                    <ul className="mt-6 grid gap-4 sm:grid-cols-2">
                        {gallery.map((m) => (
                            <li key={m.id} className="group relative overflow-hidden rounded-xl border border-white/10 bg-zinc-950/50">
                                <img
                                    src={imageSrc(m.path)}
                                    alt=""
                                    className="aspect-[4/3] w-full object-cover"
                                />
                                <div className="absolute inset-x-0 bottom-0 flex justify-end bg-gradient-to-t from-black/90 via-black/50 to-transparent p-3 sm:opacity-0 sm:transition sm:group-hover:opacity-100">
                                    <button
                                        type="button"
                                        onClick={() => removeGalleryPhoto(m.id)}
                                        className="rounded-lg bg-red-500/90 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-500"
                                    >
                                        Kaldır
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </ArtistLayout>
    );
}
