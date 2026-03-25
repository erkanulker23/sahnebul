import AdminLayout from '@/Layouts/AdminLayout';
import InputError from '@/Components/InputError';
import LocationSelect from '@/Components/LocationSelect';
import RichTextEditor from '@/Components/RichTextEditor';
import SeoHead from '@/Components/SeoHead';
import VenueGoogleLocationField from '@/Components/VenueGoogleLocationField';
import { isRichTextProbablyEmpty } from '@/lib/buildVenuePayloadFromGooglePlace';
import { Link, useForm } from '@inertiajs/react';

interface Props {
    categories: { id: number; name: string }[];
    googleMapsBrowserKey?: string | null;
}

export default function AdminVenueCreate({ categories, googleMapsBrowserKey = null }: Readonly<Props>) {
    const { data, setData, post, processing, errors, transform } = useForm({
        name: '',
        category_id: categories[0]?.id?.toString() ?? '',
        city_id: '',
        district_id: '',
        neighborhood_id: '',
        description: '',
        address: '',
        latitude: '',
        longitude: '',
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
        cover_image: '',
        status: 'pending',
        is_featured: false,
    });

    transform((formData) => ({
        ...formData,
        is_featured: formData.is_featured ? 1 : 0,
    }));

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('admin.venues.store'));
    };

    return (
        <AdminLayout>
            <SeoHead title="Mekan Ekle" description="Yeni mekan kaydı." noindex />
            <div className="space-y-6">
                <Link href={route('admin.venues.index')} className="text-sm text-amber-600 hover:text-amber-500 dark:text-amber-400">
                    ← Mekan listesi
                </Link>
                <h1 className="mb-6 text-2xl font-bold dark:text-white">Yeni Mekan Ekle</h1>
                <form onSubmit={submit} className="rounded-xl border border-zinc-300 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                            <input
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                placeholder="Mekan adı *"
                                className="w-full rounded border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                            />
                            <InputError message={errors.name} className="mt-1" />
                        </div>
                        <input
                            value={data.address}
                            onChange={(e) => setData('address', e.target.value)}
                            placeholder="Adres *"
                            className="rounded border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                        />
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
                                    if (payload.coverImageUrlFromGoogle?.trim()) {
                                        setData('cover_image', payload.coverImageUrlFromGoogle.trim());
                                    }
                                }}
                            />
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
                        <select
                            value={data.category_id}
                            onChange={(e) => setData('category_id', e.target.value)}
                            className="rounded border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white sm:col-span-2"
                        >
                            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <input value={data.latitude} onChange={(e) => setData('latitude', e.target.value)} placeholder="Enlem" className="rounded border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white" />
                        <input value={data.longitude} onChange={(e) => setData('longitude', e.target.value)} placeholder="Boylam" className="rounded border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white" />
                        <input value={data.capacity} onChange={(e) => setData('capacity', e.target.value)} placeholder="Kapasite" type="number" min={1} className="rounded border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white" />
                        <input value={data.phone} onChange={(e) => setData('phone', e.target.value)} placeholder="Telefon" className="rounded border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white" />
                        <input value={data.whatsapp} onChange={(e) => setData('whatsapp', e.target.value)} placeholder="WhatsApp" className="rounded border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white" />
                        <input value={data.website} onChange={(e) => setData('website', e.target.value)} placeholder="Web sitesi" className="rounded border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white" />
                        <input
                            value={data.social_links.instagram}
                            onChange={(e) =>
                                setData('social_links', {
                                    ...data.social_links,
                                    instagram: e.target.value,
                                })
                            }
                            placeholder="Instagram adresi"
                            className="rounded border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                        />
                        <input
                            value={data.social_links.twitter}
                            onChange={(e) =>
                                setData('social_links', {
                                    ...data.social_links,
                                    twitter: e.target.value,
                                })
                            }
                            placeholder="X / Twitter URL"
                            className="rounded border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                        />
                        <input
                            value={data.social_links.youtube}
                            onChange={(e) =>
                                setData('social_links', {
                                    ...data.social_links,
                                    youtube: e.target.value,
                                })
                            }
                            placeholder="YouTube URL"
                            className="rounded border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                        />
                        <input
                            value={data.social_links.spotify}
                            onChange={(e) =>
                                setData('social_links', {
                                    ...data.social_links,
                                    spotify: e.target.value,
                                })
                            }
                            placeholder="Spotify URL"
                            className="rounded border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                        />
                        <input
                            value={data.social_links.tiktok}
                            onChange={(e) =>
                                setData('social_links', {
                                    ...data.social_links,
                                    tiktok: e.target.value,
                                })
                            }
                            placeholder="TikTok URL"
                            className="rounded border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                        />
                        <input
                            value={data.social_links.facebook}
                            onChange={(e) =>
                                setData('social_links', {
                                    ...data.social_links,
                                    facebook: e.target.value,
                                })
                            }
                            placeholder="Facebook URL"
                            className="rounded border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                        />
                        <div className="sm:col-span-2">
                            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">Kapak görseli</label>
                            <p className="mt-0.5 text-xs text-zinc-500">
                                Google ile seçilen kapak, mekanı ilk kez kaydettiğinizde otomatik olarak sunucuya indirilir.
                            </p>
                            <input
                                value={data.cover_image}
                                onChange={(e) => setData('cover_image', e.target.value)}
                                placeholder="Kapak URL (Google’dan gelir; kayıtta yerel dosyaya çevrilir)"
                                className="mt-1 w-full rounded border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                            />
                        </div>
                        <select
                            value={data.status}
                            onChange={(e) => setData('status', e.target.value)}
                            className="rounded border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                        >
                            <option value="pending">Beklemede</option>
                            <option value="approved">Onaylı</option>
                            <option value="rejected">Reddedildi</option>
                        </select>
                        <label className="flex cursor-pointer items-center gap-2 rounded border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800">
                            <input
                                type="checkbox"
                                checked={data.is_featured}
                                onChange={(e) => setData('is_featured', e.target.checked)}
                                className="rounded border-zinc-400 text-amber-600"
                            />
                            <span className="text-sm text-zinc-800 dark:text-zinc-200">Öne çıkan mekan</span>
                        </label>
                    </div>
                    <div className="mt-3">
                        <span className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Açıklama</span>
                        <RichTextEditor
                            value={data.description}
                            onChange={(html) => setData('description', html)}
                            placeholder="Mekan açıklaması…"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={processing}
                        className="mt-4 rounded bg-amber-500 px-4 py-2 font-semibold text-zinc-900 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {processing ? 'Kaydediliyor…' : 'Kaydet'}
                    </button>
                </form>
            </div>
        </AdminLayout>
    );
}
