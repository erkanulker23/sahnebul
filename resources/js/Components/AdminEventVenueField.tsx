import InputError from '@/Components/InputError';
import { inputBaseClass } from '@/Components/ui/Input';
import { cn } from '@/lib/cn';
import LocationSelect from '@/Components/LocationSelect';
import RichTextEditor from '@/Components/RichTextEditor';
import VenueGoogleLocationField from '@/Components/VenueGoogleLocationField';
import { isRichTextProbablyEmpty } from '@/lib/buildVenuePayloadFromGooglePlace';
import {
    Combobox,
    ComboboxButton,
    ComboboxInput,
    ComboboxOption,
    ComboboxOptions,
    Dialog,
    DialogBackdrop,
    DialogPanel,
    DialogTitle,
} from '@headlessui/react';
import axios from 'axios';
import { useCallback, useEffect, useMemo, useState } from 'react';

export type AdminVenueOption = { id: number; name: string };

type CategoryOption = { id: number; name: string };

type SocialLinks = {
    instagram: string;
    twitter: string;
    youtube: string;
    spotify: string;
    tiktok: string;
    facebook: string;
};

function normTr(s: string): string {
    return s.toLocaleLowerCase('tr-TR');
}

function emptySocial(): SocialLinks {
    return {
        instagram: '',
        twitter: '',
        youtube: '',
        spotify: '',
        tiktok: '',
        facebook: '',
    };
}

function parseLaravelErrors(err: unknown): Record<string, string> {
    const ax = err as { response?: { data?: { errors?: Record<string, string[] | string> } } };
    const raw = ax.response?.data?.errors ?? {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw)) {
        out[k] = Array.isArray(v) ? (v[0] ?? '') : String(v);
    }
    return out;
}

const fieldClass = cn('w-full', inputBaseClass);

type Props = {
    venues: AdminVenueOption[];
    value: string;
    onChange: (venueId: string) => void;
    onVenueCreated: (venue: AdminVenueOption) => void;
    categories: CategoryOption[];
    googleMapsBrowserKey?: string | null;
    error?: string;
};

export default function AdminEventVenueField({
    venues,
    value,
    onChange,
    onVenueCreated,
    categories,
    googleMapsBrowserKey = null,
    error,
}: Readonly<Props>) {
    const [query, setQuery] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [modalErrors, setModalErrors] = useState<Record<string, string>>({});

    const [mName, setMName] = useState('');
    const [mCategoryId, setMCategoryId] = useState(String(categories[0]?.id ?? ''));
    const [mCityId, setMCityId] = useState('');
    const [mDistrictId, setMDistrictId] = useState('');
    const [mNeighborhoodId, setMNeighborhoodId] = useState('');
    const [mDescription, setMDescription] = useState('');
    const [mAddress, setMAddress] = useState('');
    const [mLatitude, setMLatitude] = useState('');
    const [mLongitude, setMLongitude] = useState('');
    const [mGoogleMapsUrl, setMGoogleMapsUrl] = useState('');
    const [mCapacity, setMCapacity] = useState('');
    const [mPhone, setMPhone] = useState('');
    const [mWhatsapp, setMWhatsapp] = useState('');
    const [mWebsite, setMWebsite] = useState('');
    const [mSocial, setMSocial] = useState<SocialLinks>(() => emptySocial());
    const [mCoverImage, setMCoverImage] = useState('');
    const [mGoogleGalleryUrls, setMGoogleGalleryUrls] = useState<string[]>([]);

    const resetModalForm = useCallback(() => {
        setMName('');
        setMCategoryId(String(categories[0]?.id ?? ''));
        setMCityId('');
        setMDistrictId('');
        setMNeighborhoodId('');
        setMDescription('');
        setMAddress('');
        setMLatitude('');
        setMLongitude('');
        setMGoogleMapsUrl('');
        setMCapacity('');
        setMPhone('');
        setMWhatsapp('');
        setMWebsite('');
        setMSocial(emptySocial());
        setMCoverImage('');
        setMGoogleGalleryUrls([]);
        setModalErrors({});
    }, [categories]);

    useEffect(() => {
        if (modalOpen) {
            resetModalForm();
        }
    }, [modalOpen, resetModalForm]);

    const selected = useMemo(
        () => venues.find((v) => String(v.id) === value) ?? null,
        [venues, value],
    );

    const filtered = useMemo(() => {
        const q = normTr(query.trim());
        if (!q) return venues;
        return venues.filter((v) => normTr(v.name).includes(q));
    }, [venues, query]);

    const submitModal = (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setModalErrors({});
        const payload = {
            name: mName,
            category_id: mCategoryId ? Number(mCategoryId) : '',
            city_id: mCityId ? Number(mCityId) : '',
            district_id: mDistrictId ? Number(mDistrictId) : null,
            neighborhood_id: mNeighborhoodId ? Number(mNeighborhoodId) : null,
            description: mDescription || null,
            address: mAddress,
            latitude: mLatitude || null,
            longitude: mLongitude || null,
            google_maps_url: mGoogleMapsUrl.trim() || null,
            capacity: mCapacity ? Number(mCapacity) : null,
            phone: mPhone || null,
            whatsapp: mWhatsapp || null,
            website: mWebsite.trim() || null,
            social_links: mSocial,
            cover_image: mCoverImage.trim() || null,
            ...(mGoogleGalleryUrls.length > 0 ? { google_gallery_photo_urls: mGoogleGalleryUrls.slice(0, 5) } : {}),
        };
        axios
            .post<{ venue: AdminVenueOption }>(route('admin.venues.store-for-event'), payload, {
                headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
            })
            .then((res) => {
                const v = res.data.venue;
                onVenueCreated(v);
                onChange(String(v.id));
                setModalOpen(false);
            })
            .catch((err: unknown) => {
                if (axios.isAxiosError(err) && err.response?.status === 422) {
                    setModalErrors(parseLaravelErrors(err));
                } else {
                    setModalErrors({ name: 'Kayıt başarısız. Bağlantınızı kontrol edip tekrar deneyin.' });
                }
            })
            .finally(() => setSaving(false));
    };

    return (
        <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-400">Mekan *</label>
            <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-500">İsimle arayın; listede yoksa alttan yeni mekan ekleyin.</p>
            <Combobox
                value={selected}
                onChange={(v) => {
                    if (v) onChange(String(v.id));
                }}
                by="id"
            >
                <div className="relative mt-1">
                    <ComboboxInput
                        className={`${fieldClass} pr-10`}
                        displayValue={(item: AdminVenueOption | null) => item?.name ?? ''}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Mekan ara…"
                    />
                    <ComboboxButton
                        type="button"
                        className="absolute inset-y-0 right-0 flex items-center px-2 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                    >
                        <span className="sr-only">Mekan listesini aç</span>
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </ComboboxButton>
                    <ComboboxOptions
                        anchor="bottom start"
                        transition
                        className="z-50 mt-1 max-h-60 w-[var(--input-width)] overflow-auto rounded-lg border border-zinc-300 bg-white py-1 shadow-xl [--anchor-gap:4px] focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
                    >
                        {filtered.length === 0 ? (
                            <div className="px-3 py-2 text-xs text-zinc-500 dark:text-zinc-500">Eşleşen mekan yok.</div>
                        ) : (
                            filtered.map((v) => (
                                <ComboboxOption
                                    key={v.id}
                                    value={v}
                                    className="cursor-pointer px-3 py-2 text-sm text-zinc-800 data-[focus]:bg-zinc-100 data-[selected]:bg-amber-500/15 data-[selected]:text-amber-800 dark:text-zinc-100 dark:data-[focus]:bg-zinc-800 dark:data-[selected]:text-amber-200"
                                >
                                    {v.name}
                                </ComboboxOption>
                            ))
                        )}
                        <div className="sticky bottom-0 border-t border-zinc-300 bg-white p-2 dark:border-zinc-700 dark:bg-zinc-900">
                            <button
                                type="button"
                                className="w-full rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm font-medium text-amber-800 hover:bg-amber-500/20 dark:text-amber-300"
                                onClick={() => setModalOpen(true)}
                            >
                                + Mekan yoksa ekle
                            </button>
                        </div>
                    </ComboboxOptions>
                </div>
            </Combobox>
            <InputError message={error} className="mt-1" />

            <Dialog
                open={modalOpen}
                onClose={() => {
                    if (!saving) setModalOpen(false);
                }}
                className="relative z-[60]"
            >
                <DialogBackdrop className="fixed inset-0 bg-black/55 dark:bg-black/70" transition />
                <div className="fixed inset-0 flex items-center justify-center p-4">
                    <DialogPanel
                        transition
                        className="max-h-[min(90vh,52rem)] w-full max-w-2xl overflow-y-auto rounded-xl border border-zinc-300 bg-white p-5 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900"
                    >
                        <DialogTitle className="text-lg font-semibold text-zinc-900 dark:text-white">Yeni mekan ekle</DialogTitle>
                        <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-500">
                            Mekan, etkinlik formunda kullanılmak üzere <strong className="text-zinc-800 dark:text-zinc-400">onaylı</strong> olarak kaydedilir. Tam düzenleme için
                            daha sonra Mekanlar sayfasını kullanabilirsiniz.
                        </p>
                        <form onSubmit={submitModal} className="mt-4 space-y-4">
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div>
                                    <input
                                        value={mName}
                                        onChange={(e) => setMName(e.target.value)}
                                        placeholder="Mekan adı *"
                                        className={fieldClass}
                                    />
                                    <InputError message={modalErrors.name} className="mt-1" />
                                </div>
                                <input
                                    value={mAddress}
                                    onChange={(e) => setMAddress(e.target.value)}
                                    placeholder="Adres *"
                                    className={fieldClass}
                                />
                                <InputError message={modalErrors.address} className="mt-1 sm:col-span-2" />
                                <div className="sm:col-span-2">
                                    <VenueGoogleLocationField
                                        googleMapsBrowserKey={googleMapsBrowserKey}
                                        currentAddress={mAddress}
                                        onApply={(payload) => {
                                            setMAddress(payload.address);
                                            setMLatitude(payload.latitude);
                                            setMLongitude(payload.longitude);
                                            if (payload.googleMapsUrl) {
                                                setMGoogleMapsUrl(payload.googleMapsUrl);
                                            }
                                            if (payload.city_id) setMCityId(payload.city_id);
                                            if (payload.district_id) setMDistrictId(payload.district_id);
                                            else if (payload.city_id) setMDistrictId('');
                                            if (payload.neighborhood_id) setMNeighborhoodId(payload.neighborhood_id);
                                            else if (payload.district_id) setMNeighborhoodId('');
                                            else if (payload.city_id) setMNeighborhoodId('');
                                            if (payload.placeName) setMName(payload.placeName);
                                            if (payload.phone) setMPhone(payload.phone);
                                            if (payload.whatsapp) setMWhatsapp(payload.whatsapp);
                                            if (payload.website) setMWebsite(payload.website);
                                            if (payload.social_links) {
                                                setMSocial((sl) => {
                                                    const next = { ...sl };
                                                    for (const [k, val] of Object.entries(payload.social_links!)) {
                                                        if (typeof val === 'string' && val.trim() !== '') {
                                                            (next as Record<string, string>)[k] = val;
                                                        }
                                                    }
                                                    return next;
                                                });
                                            }
                                            if (payload.descriptionHtmlFromGoogle) {
                                                const html = payload.descriptionHtmlFromGoogle;
                                                setMDescription((d) => (isRichTextProbablyEmpty(d) ? html : d));
                                            }
                                            if (payload.galleryImageUrlsFromGoogle?.length) {
                                                setMGoogleGalleryUrls(payload.galleryImageUrlsFromGoogle.slice(0, 5));
                                                setMCoverImage(payload.coverImageUrlFromGoogle?.trim() ?? '');
                                            } else if (payload.coverImageUrlFromGoogle?.trim()) {
                                                setMGoogleGalleryUrls([]);
                                                setMCoverImage(payload.coverImageUrlFromGoogle.trim());
                                            }
                                        }}
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <LocationSelect
                                        variant="admin"
                                        cityId={mCityId}
                                        districtId={mDistrictId}
                                        neighborhoodId={mNeighborhoodId}
                                        onCityChange={(v) => {
                                            setMCityId(v);
                                            setMDistrictId('');
                                            setMNeighborhoodId('');
                                        }}
                                        onDistrictChange={(v) => {
                                            setMDistrictId(v);
                                            setMNeighborhoodId('');
                                        }}
                                        onNeighborhoodChange={(v) => setMNeighborhoodId(v)}
                                        cityError={modalErrors.city_id}
                                    />
                                </div>
                                <select
                                    value={mCategoryId}
                                    onChange={(e) => setMCategoryId(e.target.value)}
                                    className={`${fieldClass} sm:col-span-2`}
                                >
                                    {categories.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name}
                                        </option>
                                    ))}
                                </select>
                                <InputError message={modalErrors.category_id} className="sm:col-span-2" />
                                <input
                                    value={mLatitude}
                                    onChange={(e) => setMLatitude(e.target.value)}
                                    placeholder="Enlem"
                                    className={fieldClass}
                                />
                                <input
                                    value={mLongitude}
                                    onChange={(e) => setMLongitude(e.target.value)}
                                    placeholder="Boylam"
                                    className={fieldClass}
                                />
                                <input
                                    value={mCapacity}
                                    onChange={(e) => setMCapacity(e.target.value)}
                                    placeholder="Kapasite"
                                    type="number"
                                    min={1}
                                    className={fieldClass}
                                />
                                <input
                                    value={mPhone}
                                    onChange={(e) => setMPhone(e.target.value)}
                                    placeholder="Telefon"
                                    className={fieldClass}
                                />
                                <input
                                    value={mWhatsapp}
                                    onChange={(e) => setMWhatsapp(e.target.value)}
                                    placeholder="WhatsApp"
                                    className={fieldClass}
                                />
                                <input
                                    value={mWebsite}
                                    onChange={(e) => setMWebsite(e.target.value)}
                                    placeholder="Web sitesi"
                                    className={`${fieldClass} sm:col-span-2`}
                                />
                                {(['instagram', 'twitter', 'youtube', 'spotify', 'tiktok', 'facebook'] as const).map((key) => (
                                    <input
                                        key={key}
                                        value={mSocial[key]}
                                        onChange={(e) => setMSocial((s) => ({ ...s, [key]: e.target.value }))}
                                        placeholder={key === 'twitter' ? 'X / Twitter URL' : `${key} URL`}
                                        className={fieldClass}
                                    />
                                ))}
                                <div className="sm:col-span-2">
                                    <label htmlFor="admin-event-venue-modal-cover" className="text-xs font-medium text-zinc-500">
                                        Kapak görseli (URL)
                                    </label>
                                    <input
                                        id="admin-event-venue-modal-cover"
                                        value={mCoverImage}
                                        onChange={(e) => setMCoverImage(e.target.value)}
                                        className={`${fieldClass} mt-1`}
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <span className="text-xs font-medium text-zinc-500">Açıklama</span>
                                    <RichTextEditor
                                        value={mDescription}
                                        onChange={setMDescription}
                                        placeholder="Mekan açıklaması…"
                                        className="mt-1"
                                    />
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2 border-t border-zinc-300 pt-4 dark:border-zinc-800">
                                <button
                                    type="button"
                                    disabled={saving}
                                    onClick={() => setModalOpen(false)}
                                    className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
                                >
                                    Vazgeç
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-amber-400 disabled:opacity-50"
                                >
                                    {saving ? 'Kaydediliyor…' : 'Kaydet ve bu etkinlikte kullan'}
                                </button>
                            </div>
                        </form>
                    </DialogPanel>
                </div>
            </Dialog>
        </div>
    );
}
