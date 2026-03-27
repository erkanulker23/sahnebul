import PhoneInput from '@/Components/PhoneInput';
import ArtistLayout from '@/Layouts/ArtistLayout';
import LocationSelect from '@/Components/LocationSelect';
import VenueGoogleLocationField from '@/Components/VenueGoogleLocationField';
import SeoHead from '@/Components/SeoHead';
import { formatTrPhoneInput } from '@/lib/trPhoneInput';
import { useForm } from '@inertiajs/react';

interface Category {
    id: number;
    name: string;
}

interface Props {
    categories: Category[];
    googleMapsBrowserKey?: string | null;
}

const venueSocialKeys = ['instagram', 'twitter', 'youtube', 'spotify', 'tiktok', 'facebook'] as const;

export default function ArtistVenueCreate({ categories, googleMapsBrowserKey = null }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        category_id: '',
        city_id: '',
        district_id: '',
        neighborhood_id: '',
        description: '',
        address: '',
        latitude: '',
        longitude: '',
        google_maps_url: '',
        capacity: '',
        phone: '',
        whatsapp: '',
        website: '',
        social_links: {
            instagram: '',
            twitter: '',
            youtube: '',
            spotify: '',
            tiktok: '',
            facebook: '',
        },
        google_gallery_photo_urls: [] as string[],
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('artist.venues.store'));
    };

    return (
        <ArtistLayout>
            <SeoHead title="Mekan Ekle - Sahnebul" description="Yeni mekan kaydı oluşturun." noindex />

            <h1 className="font-display mb-8 text-2xl font-bold text-white">Yeni Mekan Ekle</h1>

            <form onSubmit={submit} className="max-w-2xl space-y-6 rounded-xl border border-white/5 bg-zinc-900/50 p-8">
                <div>
                    <label className="block text-sm font-medium text-zinc-400">Mekan adı *</label>
                    <input value={data.name} onChange={(e) => setData('name', e.target.value)} required className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-800 px-4 py-3 text-white" />
                    {errors.name && <p className="mt-1 text-sm text-red-400">{errors.name}</p>}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <label className="block text-sm font-medium text-zinc-400">Kategori *</label>
                        <select value={data.category_id} onChange={(e) => setData('category_id', e.target.value)} required className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-800 px-4 py-3 text-white">
                            <option value="">Seçin</option>
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
                        if (payload.googleMapsUrl) {
                            setData('google_maps_url', payload.googleMapsUrl);
                        }
                        if (payload.galleryImageUrlsFromGoogle?.length) {
                            setData('google_gallery_photo_urls', payload.galleryImageUrlsFromGoogle.slice(0, 5));
                        } else {
                            setData('google_gallery_photo_urls', []);
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
                        Harita koordinatları: {data.latitude || '—'}, {data.longitude || '—'}
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
                        <PhoneInput
                            value={data.phone}
                            onChange={(v) => setData('phone', v)}
                            className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-800 px-4 py-3 text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-zinc-400">WhatsApp</label>
                        <input
                            value={data.whatsapp}
                            onChange={(e) => {
                                const v = e.target.value;
                                setData('whatsapp', /^https?:\/\//i.test(v.trim()) ? v : formatTrPhoneInput(v));
                            }}
                            placeholder="05XX XXX XX XX veya https://wa.me/…"
                            className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-800 px-4 py-3 text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-zinc-400">Web Sitesi</label>
                        <input type="url" value={data.website} onChange={(e) => setData('website', e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-800 px-4 py-3 text-white" />
                    </div>
                </div>
                <div>
                    <p className="text-sm font-medium text-zinc-400">Sosyal medya</p>
                    <p className="mt-1 text-xs text-zinc-500">İsteğe bağlı; tam URL (https://…).</p>
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
                    Mekan ekle
                </button>
            </form>
        </ArtistLayout>
    );
}
