import PhoneInput from '@/Components/PhoneInput';
import AdminArtistMultiSelect from '@/Components/AdminArtistMultiSelect';
import EventEntryPaidField from '@/Components/EventEntryPaidField';
import LocationSelect from '@/Components/LocationSelect';
import RichTextEditor from '@/Components/RichTextEditor';
import TicketSalesEditor, { emptyTicketOutletRow, type TicketAcquisitionMode } from '@/Components/TicketSalesEditor';
import TicketTiersEditor, { tiersToPayload, type TierRow } from '@/Components/TicketTiersEditor';
import VenueGoogleLocationField from '@/Components/VenueGoogleLocationField';
import { formatTrPhoneInput } from '@/lib/trPhoneInput';
import ArtistLayout from '@/Layouts/ArtistLayout';
import SeoHead from '@/Components/SeoHead';
import { router, useForm } from '@inertiajs/react';
import { FormEvent, useEffect, useState } from 'react';

interface Venue {
    id: number;
    name: string;
    city?: { name: string } | null;
}

interface CatalogArtist {
    id: number;
    name: string;
}

interface Category {
    id: number;
    name: string;
}

const venueSocialKeys = ['instagram', 'twitter', 'youtube', 'spotify', 'tiktok', 'facebook'] as const;

type ProposedVenueForm = {
    name: string;
    category_id: string;
    city_id: string;
    district_id: string;
    neighborhood_id: string;
    description: string;
    address: string;
    latitude: string;
    longitude: string;
    google_maps_url: string;
    capacity: string;
    phone: string;
    whatsapp: string;
    website: string;
    social_links: Record<(typeof venueSocialKeys)[number], string>;
    google_gallery_photo_urls: string[];
};

function emptyProposedVenue(): ProposedVenueForm {
    return {
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
        google_gallery_photo_urls: [],
    };
}

interface Props {
    venues: Venue[];
    venuePickerMode?: 'own' | 'catalog';
    venueSearch?: string;
    artists: CatalogArtist[];
    defaultArtistId?: number | null;
    lockArtistsToSelf?: boolean;
    linkedArtistName?: string | null;
    /** Organizasyon: yalnızca kadrodaki onaylı sanatçılar seçilebilir */
    managedRosterArtistPicker?: boolean;
    categories?: Category[];
    googleMapsBrowserKey?: string | null;
    eventTypeOptions: { slug: string; label: string }[];
}

export default function ArtistEventCreate({
    venues,
    venuePickerMode = 'own',
    venueSearch = '',
    artists,
    defaultArtistId = null,
    lockArtistsToSelf = false,
    linkedArtistName = null,
    managedRosterArtistPicker = false,
    categories = [],
    googleMapsBrowserKey = null,
    eventTypeOptions,
}: Readonly<Props>) {
    const [searchDraft, setSearchDraft] = useState(venueSearch);
    const [proposeNewVenue, setProposeNewVenue] = useState(false);

    useEffect(() => {
        setSearchDraft(venueSearch);
    }, [venueSearch]);

    useEffect(() => {
        if (venuePickerMode === 'catalog' && venues.length === 0) {
            setProposeNewVenue(true);
        }
    }, [venuePickerMode, venues.length]);

    const { data, setData, post, processing, errors, transform } = useForm({
        venue_id: venues.length ? String(venues[0].id) : '',
        artist_ids: defaultArtistId ? [defaultArtistId] : ([] as number[]),
        title: '',
        event_type: '' as string,
        description: '',
        event_rules: '18 yaş altı katılımcılar ebeveyn eşliğinde giriş yapabilir.\nEtkinlik alanına dışarıdan yiyecek-içecek alınmaz.\nProfesyonel kamera ve kayıt ekipmanı izinsiz kullanılamaz.\nBilet iadesi organizatör kurallarına tabidir.',
        start_date: '',
        end_date: '',
        ticket_price: '',
        entry_is_paid: true,
        capacity: '',
        ticket_tiers: [] as TierRow[],
        ticket_acquisition_mode: 'sahnebul_reservation' as TicketAcquisitionMode,
        sahnebul_reservation_enabled: true,
        paytr_checkout_enabled: false,
        ticket_outlets: [emptyTicketOutletRow()],
        ticket_purchase_note: '',
        proposed_venue: emptyProposedVenue(),
    });

    useEffect(() => {
        if (lockArtistsToSelf && defaultArtistId) {
            setData('artist_ids', [defaultArtistId]);
        }
    }, [lockArtistsToSelf, defaultArtistId, setData]);

    useEffect(() => {
        if (venues.length === 0 || proposeNewVenue) {
            return;
        }
        const ok = venues.some((v) => String(v.id) === data.venue_id);
        if (!ok) {
            setData('venue_id', String(venues[0].id));
        }
    }, [venues, data.venue_id, setData, proposeNewVenue]);

    const runVenueSearch = () => {
        router.get(
            route('artist.events.create'),
            { venue_search: searchDraft.trim() || undefined },
            { preserveState: true, preserveScroll: true, only: ['venues', 'venuePickerMode', 'venueSearch'] },
        );
    };

    transform((form) => {
        const paid = Boolean(form.entry_is_paid);
        return {
            ...form,
            entry_is_paid: paid,
            ticket_price: paid ? form.ticket_price || null : null,
            ticket_tiers: paid ? tiersToPayload(form.ticket_tiers) : [],
            ticket_outlets: form.ticket_outlets.filter((o) => o.label.trim() && o.url.trim()),
            ticket_purchase_note: form.ticket_purchase_note.trim() || null,
            proposed_venue: form.proposed_venue,
        };
    });

    const setPv = (patch: Partial<ProposedVenueForm>) => {
        setData('proposed_venue', { ...data.proposed_venue, ...patch });
    };

    const submitMain = (e: FormEvent) => {
        e.preventDefault();
        if (venuePickerMode === 'catalog' && proposeNewVenue) {
            post(route('artist.events.propose'));
            return;
        }
        if (venues.length === 0) {
            return;
        }
        post(route('artist.events.store'));
    };

    const canSubmitCatalog = proposeNewVenue || venues.length > 0;
    const submitDisabled =
        processing || (venuePickerMode === 'catalog' ? !canSubmitCatalog : venues.length === 0);

    const pvErr = (key: string) => {
        const k = `proposed_venue.${key}` as keyof typeof errors;
        return errors[k] as string | undefined;
    };

    return (
        <ArtistLayout>
            <SeoHead title="Etkinlik Ekle - Sahnebul" description="Yeni etkinlik oluşturun." noindex />

            <h1 className="font-display mb-8 text-2xl font-bold text-zinc-900 dark:text-white">Yeni Etkinlik</h1>

            <form onSubmit={submitMain} className="max-w-2xl space-y-6 rounded-xl border border-white/5 bg-zinc-900/50 p-8">
                <div>
                    <label htmlFor="venue_id" className="block text-sm font-medium text-zinc-400">
                        Mekân *
                    </label>
                    {venuePickerMode === 'catalog' ? (
                        <div className="mt-2 space-y-3">
                            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                                <input
                                    type="checkbox"
                                    className="mt-1 h-4 w-4 rounded border-zinc-600 text-amber-500"
                                    checked={proposeNewVenue}
                                    onChange={(e) => setProposeNewVenue(e.target.checked)}
                                    disabled={venues.length === 0}
                                />
                                <span>
                                    <span className="font-medium text-white">Listede yok — Google ile mekân ekle ve etkinlik öner</span>
                                    <span className="mt-1 block text-xs text-zinc-400">
                                        Mekân bilgilerini Google Haritalar’dan çekebilirsiniz. Öneri yöneticilere gider; onayda onaylı mekân ve taslak
                                        etkinlik oluşur.
                                    </span>
                                </span>
                            </label>
                            {venues.length === 0 ? (
                                <p className="text-xs text-amber-200/90">
                                    Arama sonucu yok; yeni mekân formu açıldı. Aşağıdan konum seçerek devam edin.
                                </p>
                            ) : null}

                            {!proposeNewVenue ? (
                                <>
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                        <input
                                            type="search"
                                            value={searchDraft}
                                            onChange={(e) => setSearchDraft(e.target.value)}
                                            placeholder="Mekân adı ile ara…"
                                            className="w-full rounded-xl border border-white/10 bg-zinc-800 px-4 py-2.5 text-white placeholder:text-zinc-600 sm:flex-1"
                                        />
                                        <button
                                            type="button"
                                            onClick={runVenueSearch}
                                            className="rounded-xl bg-zinc-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-600"
                                        >
                                            Ara
                                        </button>
                                    </div>
                                    <select
                                        id="venue_id"
                                        value={data.venue_id}
                                        onChange={(e) => setData('venue_id', e.target.value)}
                                        required
                                        className="w-full rounded-xl border border-white/10 bg-zinc-800 px-4 py-3 text-white"
                                    >
                                        {venues.length === 0 ? <option value="">— Liste boş —</option> : null}
                                        {venues.map((v) => (
                                            <option key={v.id} value={v.id}>
                                                {v.city?.name ? `${v.name} (${v.city.name})` : v.name}
                                            </option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-zinc-500">
                                        Onaylı mekânınız yok; etkinlik taslak olarak seçtiğiniz mekâna bağlanır. Yayın ve düzenleme yetkisi mekân sahibindedir.
                                        {venues.length >= 100 ? ' Çok sonuç varsa arama ile daraltın.' : null}
                                    </p>
                                </>
                            ) : (
                                <div className="space-y-4 rounded-xl border border-white/10 bg-zinc-950/40 p-4">
                                    <p className="text-sm font-medium text-amber-200/90">Önerilen mekân bilgileri</p>
                                    <div>
                                        <label className="block text-sm text-zinc-400">Mekân adı *</label>
                                        <input
                                            value={data.proposed_venue.name}
                                            onChange={(e) => setPv({ name: e.target.value })}
                                            required={proposeNewVenue}
                                            className="mt-1 w-full rounded-xl border border-white/10 bg-zinc-800 px-4 py-3 text-white"
                                        />
                                        {pvErr('name') && <p className="mt-1 text-sm text-red-400">{pvErr('name')}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-sm text-zinc-400">Kategori *</label>
                                        <select
                                            value={data.proposed_venue.category_id}
                                            onChange={(e) => setPv({ category_id: e.target.value })}
                                            required={proposeNewVenue}
                                            className="mt-1 w-full rounded-xl border border-white/10 bg-zinc-800 px-4 py-3 text-white"
                                        >
                                            <option value="">Seçin</option>
                                            {categories.map((c) => (
                                                <option key={c.id} value={c.id}>
                                                    {c.name}
                                                </option>
                                            ))}
                                        </select>
                                        {pvErr('category_id') && <p className="mt-1 text-sm text-red-400">{pvErr('category_id')}</p>}
                                    </div>
                                    <LocationSelect
                                        cityId={data.proposed_venue.city_id}
                                        districtId={data.proposed_venue.district_id}
                                        neighborhoodId={data.proposed_venue.neighborhood_id}
                                        onCityChange={(v) => setPv({ city_id: v, district_id: '', neighborhood_id: '' })}
                                        onDistrictChange={(v) => setPv({ district_id: v, neighborhood_id: '' })}
                                        onNeighborhoodChange={(v) => setPv({ neighborhood_id: v })}
                                        cityError={pvErr('city_id')}
                                    />
                                    {googleMapsBrowserKey ? (
                                        <VenueGoogleLocationField
                                            googleMapsBrowserKey={googleMapsBrowserKey}
                                            currentAddress={data.proposed_venue.address}
                                            onApply={(payload) => {
                                                const sl = { ...data.proposed_venue.social_links };
                                                if (payload.social_links) {
                                                    for (const [k, v] of Object.entries(payload.social_links)) {
                                                        if (typeof v === 'string' && v.trim() !== '') {
                                                            (sl as Record<string, string>)[k] = v;
                                                        }
                                                    }
                                                }
                                                setPv({
                                                    address: payload.address,
                                                    latitude: payload.latitude,
                                                    longitude: payload.longitude,
                                                    city_id: payload.city_id || data.proposed_venue.city_id,
                                                    district_id: payload.district_id ?? data.proposed_venue.district_id,
                                                    neighborhood_id: payload.neighborhood_id ?? data.proposed_venue.neighborhood_id,
                                                    name: payload.placeName || data.proposed_venue.name,
                                                    phone: payload.phone || data.proposed_venue.phone,
                                                    whatsapp: payload.whatsapp || data.proposed_venue.whatsapp,
                                                    website: payload.website || data.proposed_venue.website,
                                                    social_links: sl,
                                                    description: payload.descriptionPlainFromGoogle && !data.proposed_venue.description.trim()
                                                        ? payload.descriptionPlainFromGoogle
                                                        : data.proposed_venue.description,
                                                    google_maps_url: payload.googleMapsUrl || data.proposed_venue.google_maps_url,
                                                    google_gallery_photo_urls: payload.galleryImageUrlsFromGoogle?.length
                                                        ? payload.galleryImageUrlsFromGoogle.slice(0, 5)
                                                        : data.proposed_venue.google_gallery_photo_urls,
                                                });
                                            }}
                                        />
                                    ) : null}
                                    <div>
                                        <label className="block text-sm text-zinc-400">Adres *</label>
                                        <input
                                            value={data.proposed_venue.address}
                                            onChange={(e) => setPv({ address: e.target.value })}
                                            required={proposeNewVenue}
                                            className="mt-1 w-full rounded-xl border border-white/10 bg-zinc-800 px-4 py-3 text-white"
                                        />
                                        {pvErr('address') && <p className="mt-1 text-sm text-red-400">{pvErr('address')}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-sm text-zinc-400">Açıklama</label>
                                        <textarea
                                            value={data.proposed_venue.description}
                                            onChange={(e) => setPv({ description: e.target.value })}
                                            rows={3}
                                            className="mt-1 w-full rounded-xl border border-white/10 bg-zinc-800 px-4 py-3 text-white"
                                        />
                                    </div>
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div>
                                            <label className="block text-sm text-zinc-400">Kapasite</label>
                                            <input
                                                type="number"
                                                min={1}
                                                value={data.proposed_venue.capacity}
                                                onChange={(e) => setPv({ capacity: e.target.value })}
                                                className="mt-1 w-full rounded-xl border border-white/10 bg-zinc-800 px-4 py-3 text-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm text-zinc-400">Telefon</label>
                                            <PhoneInput
                                                value={data.proposed_venue.phone}
                                                onChange={(v) => setPv({ phone: v })}
                                                className="mt-1 w-full rounded-xl border border-white/10 bg-zinc-800 px-4 py-3 text-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm text-zinc-400">WhatsApp</label>
                                            <input
                                                value={data.proposed_venue.whatsapp}
                                                onChange={(e) => {
                                                    const v = e.target.value;
                                                    setPv({
                                                        whatsapp: /^https?:\/\//i.test(v.trim()) ? v : formatTrPhoneInput(v),
                                                    });
                                                }}
                                                placeholder="05XX XXX XX XX veya https://wa.me/…"
                                                className="mt-1 w-full rounded-xl border border-white/10 bg-zinc-800 px-4 py-3 text-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm text-zinc-400">Web sitesi</label>
                                            <input
                                                type="url"
                                                value={data.proposed_venue.website}
                                                onChange={(e) => setPv({ website: e.target.value })}
                                                className="mt-1 w-full rounded-xl border border-white/10 bg-zinc-800 px-4 py-3 text-white"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-sm text-zinc-400">Sosyal bağlantılar</p>
                                        <div className="grid gap-3 sm:grid-cols-2">
                                            {venueSocialKeys.map((k) => (
                                                <div key={k}>
                                                    <label className="text-xs capitalize text-zinc-500">{k}</label>
                                                    <input
                                                        value={data.proposed_venue.social_links[k]}
                                                        onChange={(e) =>
                                                            setPv({
                                                                social_links: { ...data.proposed_venue.social_links, [k]: e.target.value },
                                                            })
                                                        }
                                                        className="mt-0.5 w-full rounded-lg border border-white/10 bg-zinc-800 px-3 py-2 text-sm text-white"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <>
                            <select
                                id="venue_id"
                                value={data.venue_id}
                                onChange={(e) => setData('venue_id', e.target.value)}
                                required
                                className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-800 px-4 py-3 text-white"
                            >
                                {venues.map((v) => (
                                    <option key={v.id} value={v.id}>
                                        {v.name}
                                    </option>
                                ))}
                            </select>
                            <p className="mt-1 text-xs text-zinc-500">Mekân, onaylı mekân listenizden seçilir.</p>
                        </>
                    )}
                </div>
                {lockArtistsToSelf && linkedArtistName ? (
                    <div>
                        <span className="block text-sm font-medium text-zinc-400">Sanatçı</span>
                        <div className="mt-2 rounded-xl border border-white/10 bg-zinc-800/80 px-4 py-3">
                            <p className="font-medium text-white">{linkedArtistName}</p>
                            <p className="mt-1 text-xs text-zinc-500">Etkinlik yalnızca kendi onaylı profilinizle oluşturulur.</p>
                        </div>
                    </div>
                ) : (
                    <AdminArtistMultiSelect
                        label="Sanatçılar *"
                        artists={artists}
                        value={data.artist_ids}
                        onChange={(artist_ids) => setData('artist_ids', artist_ids)}
                        helperText={
                            managedRosterArtistPicker
                                ? 'Yalnızca kadronuzdaki onaylı sanatçılar. Etkinlik bu kişilerin profillerinde de listelenir. İlk sıra headliner.'
                                : 'Katalogdaki onaylı sanatçılar. Etkinlik bu kişilerin profillerinde de listelenir. İlk sıra headliner.'
                        }
                        showOrderControls
                    />
                )}
                {(errors.artist_ids || errors['artist_ids.0']) && (
                    <p className="text-sm text-red-400">{errors.artist_ids ?? errors['artist_ids.0']}</p>
                )}
                <div>
                    <label htmlFor="title" className="block text-sm font-medium text-zinc-400">
                        Etkinlik Adı *
                    </label>
                    <input
                        id="title"
                        value={data.title}
                        onChange={(e) => setData('title', e.target.value)}
                        required
                        className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-800 px-4 py-3 text-white"
                    />
                </div>
                <div>
                    <label htmlFor="artist-event-type-create" className="block text-sm font-medium text-zinc-400">
                        Etkinlik türü (isteğe bağlı)
                    </label>
                    <select
                        id="artist-event-type-create"
                        value={data.event_type}
                        onChange={(e) => setData('event_type', e.target.value)}
                        className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-800 px-4 py-3 text-white"
                    >
                        <option value="">Seçin</option>
                        {eventTypeOptions.map((o) => (
                            <option key={o.slug} value={o.slug}>
                                {o.label}
                            </option>
                        ))}
                    </select>
                    {errors.event_type && <p className="mt-2 text-sm text-red-400">{errors.event_type}</p>}
                </div>
                <div>
                    <label htmlFor="start_date" className="block text-sm font-medium text-zinc-400">
                        Başlangıç *
                    </label>
                    <input
                        id="start_date"
                        type="datetime-local"
                        value={data.start_date}
                        onChange={(e) => setData('start_date', e.target.value)}
                        required
                        className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-800 px-4 py-3 text-white"
                    />
                </div>
                <div>
                    <label htmlFor="end_date" className="block text-sm font-medium text-zinc-400">
                        Bitiş
                    </label>
                    <input
                        id="end_date"
                        type="datetime-local"
                        value={data.end_date}
                        onChange={(e) => setData('end_date', e.target.value)}
                        className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-800 px-4 py-3 text-white"
                    />
                </div>
                <EventEntryPaidField
                    variant="artist"
                    idPrefix="artist_event_create"
                    value={data.entry_is_paid}
                    onChange={(paid) => {
                        setData('entry_is_paid', paid);
                        if (!paid) {
                            setData('ticket_price', '');
                            setData('ticket_tiers', []);
                            if (data.ticket_acquisition_mode === 'sahnebul_card') {
                                setData('ticket_acquisition_mode', 'sahnebul_reservation');
                                setData('sahnebul_reservation_enabled', true);
                                setData('paytr_checkout_enabled', false);
                            }
                        }
                    }}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <label htmlFor="ticket_price" className="block text-sm font-medium text-zinc-400">
                            Genel bilet fiyatı (₺)
                        </label>
                        <input
                            id="ticket_price"
                            type="number"
                            step="0.01"
                            min={0}
                            value={data.ticket_price}
                            onChange={(e) => setData('ticket_price', e.target.value)}
                            disabled={!data.entry_is_paid}
                            className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-800 px-4 py-3 text-white disabled:cursor-not-allowed disabled:opacity-50"
                        />
                        <p className="mt-1 text-xs text-zinc-500">Kategori eklenmezse bu fiyat kullanılır.</p>
                    </div>
                    <div>
                        <label htmlFor="capacity" className="block text-sm font-medium text-zinc-400">
                            Kapasite
                        </label>
                        <input
                            id="capacity"
                            type="number"
                            min={1}
                            value={data.capacity}
                            onChange={(e) => setData('capacity', e.target.value)}
                            className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-800 px-4 py-3 text-white"
                        />
                    </div>
                </div>
                {data.entry_is_paid ? (
                    <TicketTiersEditor value={data.ticket_tiers} onChange={(ticket_tiers) => setData('ticket_tiers', ticket_tiers)} />
                ) : null}
                <TicketSalesEditor
                    acquisitionMode={data.ticket_acquisition_mode}
                    onAcquisitionModeChange={(mode) => {
                        setData('ticket_acquisition_mode', mode);
                        if (mode === 'phone_only') {
                            setData('ticket_outlets', [emptyTicketOutletRow()]);
                        }
                        if (mode === 'sahnebul_reservation') {
                            setData('sahnebul_reservation_enabled', true);
                            setData('paytr_checkout_enabled', false);
                        }
                        if (mode === 'sahnebul_card') {
                            setData('sahnebul_reservation_enabled', false);
                            setData('paytr_checkout_enabled', true);
                        }
                    }}
                    outlets={data.ticket_outlets}
                    onOutletsChange={(ticket_outlets) => setData('ticket_outlets', ticket_outlets)}
                    purchaseNote={data.ticket_purchase_note}
                    onPurchaseNoteChange={(ticket_purchase_note) => setData('ticket_purchase_note', ticket_purchase_note)}
                    entryIsPaid={data.entry_is_paid}
                    variant="artist"
                    errors={errors as Partial<Record<string, string>>}
                />
                <div>
                    <span className="block text-sm font-medium text-zinc-400">Açıklama</span>
                    <RichTextEditor
                        value={data.description}
                        onChange={(html) => setData('description', html)}
                        placeholder="Etkinlik açıklaması…"
                        className="mt-2"
                    />
                </div>
                <div>
                    <span className="block text-sm font-medium text-zinc-400">Etkinlik kuralları</span>
                    <p className="mt-1 text-xs text-zinc-500">Düz metinde satır başına bir madde; zengin metinle de liste kullanabilirsiniz.</p>
                    <RichTextEditor
                        value={data.event_rules}
                        onChange={(html) => setData('event_rules', html)}
                        placeholder="Kurallar…"
                        className="mt-2"
                    />
                </div>
                <button
                    type="submit"
                    disabled={submitDisabled}
                    className="rounded-xl bg-amber-500 px-8 py-3 font-semibold text-zinc-950 hover:bg-amber-400 disabled:opacity-50"
                >
                    {venuePickerMode === 'catalog' && proposeNewVenue ? 'Öneriyi gönder (admin onayı)' : 'Oluştur'}
                </button>
            </form>
        </ArtistLayout>
    );
}
