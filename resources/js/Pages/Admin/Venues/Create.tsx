import AdminLayout from '@/Layouts/AdminLayout';
import LocationSelect from '@/Components/LocationSelect';
import RichTextEditor from '@/Components/RichTextEditor';
import SeoHead from '@/Components/SeoHead';
import VenueGoogleLocationField from '@/Components/VenueGoogleLocationField';
import { isRichTextProbablyEmpty } from '@/lib/buildVenuePayloadFromGooglePlace';
import { Link, router } from '@inertiajs/react';
import { useState } from 'react';

interface Props {
    categories: { id: number; name: string }[];
    googleMapsBrowserKey?: string | null;
}

export default function AdminVenueCreate({ categories, googleMapsBrowserKey = null }: Readonly<Props>) {
    const [form, setForm] = useState({
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

    return (
        <AdminLayout>
            <SeoHead title="Mekan Ekle" description="Yeni mekan kaydı." noindex />
            <div className="space-y-6">
                <Link href={route('admin.venues.index')} className="text-sm text-amber-600 hover:text-amber-500 dark:text-amber-400">
                    ← Mekan listesi
                </Link>
                <h1 className="mb-6 text-2xl font-bold dark:text-white">Yeni Mekan Ekle</h1>
                <div className="rounded-xl border border-zinc-300 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                    <div className="grid gap-3 sm:grid-cols-2">
                        <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Mekan adı *" className="rounded border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white" />
                        <input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} placeholder="Adres *" className="rounded border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white" />
                        <div className="sm:col-span-2">
                            <VenueGoogleLocationField
                                googleMapsBrowserKey={googleMapsBrowserKey}
                                currentAddress={form.address}
                                onApply={(payload) => {
                                    setForm((f) => {
                                        const next = {
                                            ...f,
                                            address: payload.address,
                                            latitude: payload.latitude,
                                            longitude: payload.longitude,
                                        };
                                        if (payload.city_id) {
                                            next.city_id = payload.city_id;
                                        }
                                        if (payload.district_id) {
                                            next.district_id = payload.district_id;
                                        } else if (payload.city_id) {
                                            next.district_id = '';
                                        }
                                        if (payload.neighborhood_id) {
                                            next.neighborhood_id = payload.neighborhood_id;
                                        } else if (payload.district_id) {
                                            next.neighborhood_id = '';
                                        } else if (payload.city_id) {
                                            next.neighborhood_id = '';
                                        }
                                        if (payload.placeName) {
                                            next.name = payload.placeName;
                                        }
                                        if (payload.phone) {
                                            next.phone = payload.phone;
                                        }
                                        if (payload.whatsapp) {
                                            next.whatsapp = payload.whatsapp;
                                        }
                                        if (payload.website) {
                                            next.website = payload.website;
                                        }
                                        if (payload.social_links) {
                                            next.social_links = { ...f.social_links };
                                            for (const [k, v] of Object.entries(payload.social_links)) {
                                                if (typeof v === 'string' && v.trim() !== '') {
                                                    (next.social_links as Record<string, string>)[k] = v;
                                                }
                                            }
                                        }
                                        if (payload.descriptionHtmlFromGoogle && isRichTextProbablyEmpty(f.description)) {
                                            next.description = payload.descriptionHtmlFromGoogle;
                                        }
                                        if (payload.coverImageUrlFromGoogle?.trim()) {
                                            next.cover_image = payload.coverImageUrlFromGoogle.trim();
                                        }
                                        return next;
                                    });
                                }}
                            />
                        </div>
                        <div className="sm:col-span-2">
                            <LocationSelect
                                variant="admin"
                                cityId={form.city_id}
                                districtId={form.district_id}
                                neighborhoodId={form.neighborhood_id}
                                onCityChange={(v) => {
                                    setForm((f) => ({ ...f, city_id: v, district_id: '', neighborhood_id: '' }));
                                }}
                                onDistrictChange={(v) => {
                                    setForm((f) => ({ ...f, district_id: v, neighborhood_id: '' }));
                                }}
                                onNeighborhoodChange={(v) => setForm((f) => ({ ...f, neighborhood_id: v }))}
                            />
                        </div>
                        <select value={form.category_id} onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))} className="rounded border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white sm:col-span-2">
                            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <input value={form.latitude} onChange={(e) => setForm((f) => ({ ...f, latitude: e.target.value }))} placeholder="Enlem" className="rounded border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white" />
                        <input value={form.longitude} onChange={(e) => setForm((f) => ({ ...f, longitude: e.target.value }))} placeholder="Boylam" className="rounded border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white" />
                        <input value={form.capacity} onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))} placeholder="Kapasite" type="number" min={1} className="rounded border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white" />
                        <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="Telefon" className="rounded border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white" />
                        <input value={form.whatsapp} onChange={(e) => setForm((f) => ({ ...f, whatsapp: e.target.value }))} placeholder="WhatsApp" className="rounded border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white" />
                        <input value={form.website} onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))} placeholder="Web sitesi" className="rounded border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white" />
                        <input
                            value={form.social_links.instagram}
                            onChange={(e) =>
                                setForm((f) => ({
                                    ...f,
                                    social_links: { ...f.social_links, instagram: e.target.value },
                                }))
                            }
                            placeholder="Instagram adresi"
                            className="rounded border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                        />
                        <input
                            value={form.social_links.twitter}
                            onChange={(e) =>
                                setForm((f) => ({
                                    ...f,
                                    social_links: { ...f.social_links, twitter: e.target.value },
                                }))
                            }
                            placeholder="X / Twitter URL"
                            className="rounded border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                        />
                        <input
                            value={form.social_links.youtube}
                            onChange={(e) =>
                                setForm((f) => ({
                                    ...f,
                                    social_links: { ...f.social_links, youtube: e.target.value },
                                }))
                            }
                            placeholder="YouTube URL"
                            className="rounded border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                        />
                        <input
                            value={form.social_links.spotify}
                            onChange={(e) =>
                                setForm((f) => ({
                                    ...f,
                                    social_links: { ...f.social_links, spotify: e.target.value },
                                }))
                            }
                            placeholder="Spotify URL"
                            className="rounded border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                        />
                        <input
                            value={form.social_links.tiktok}
                            onChange={(e) =>
                                setForm((f) => ({
                                    ...f,
                                    social_links: { ...f.social_links, tiktok: e.target.value },
                                }))
                            }
                            placeholder="TikTok URL"
                            className="rounded border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                        />
                        <input
                            value={form.social_links.facebook}
                            onChange={(e) =>
                                setForm((f) => ({
                                    ...f,
                                    social_links: { ...f.social_links, facebook: e.target.value },
                                }))
                            }
                            placeholder="Facebook URL"
                            className="rounded border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                        />
                        <input
                            value={form.cover_image}
                            onChange={(e) => setForm((f) => ({ ...f, cover_image: e.target.value }))}
                            placeholder="Kapak görsel URL"
                            className="rounded border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                        />
                        <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} className="rounded border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white">
                            <option value="pending">Beklemede</option>
                            <option value="approved">Onaylı</option>
                            <option value="rejected">Reddedildi</option>
                        </select>
                        <label className="flex cursor-pointer items-center gap-2 rounded border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800">
                            <input
                                type="checkbox"
                                checked={form.is_featured}
                                onChange={(e) => setForm((f) => ({ ...f, is_featured: e.target.checked }))}
                                className="rounded border-zinc-400 text-amber-600"
                            />
                            <span className="text-sm text-zinc-800 dark:text-zinc-200">Öne çıkan mekan</span>
                        </label>
                    </div>
                    <div className="mt-3">
                        <span className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Açıklama</span>
                        <RichTextEditor
                            value={form.description}
                            onChange={(html) => setForm((f) => ({ ...f, description: html }))}
                            placeholder="Mekan açıklaması…"
                        />
                    </div>
                    <button
                        type="button"
                        onClick={() =>
                            router.post(route('admin.venues.store'), {
                                ...form,
                                is_featured: form.is_featured ? 1 : 0,
                            })
                        }
                        className="mt-4 rounded bg-amber-500 px-4 py-2 font-semibold text-zinc-900"
                    >
                        Kaydet
                    </button>
                </div>
            </div>
        </AdminLayout>
    );
}
