import AdminArtistMultiSelect from '@/Components/AdminArtistMultiSelect';
import AdminEntityPromoGalleryPanel from '@/Components/Admin/AdminEntityPromoGalleryPanel';
import AdminEventVenueField from '@/Components/AdminEventVenueField';
import EventEntryPaidField from '@/Components/EventEntryPaidField';
import { eventShowParam } from '@/lib/eventShowUrl';
import TicketSalesEditor, { emptyTicketOutletRow, inferTicketAcquisitionMode, outletsFromServer } from '@/Components/TicketSalesEditor';
import TicketTiersEditor, { tiersToPayload, type TierRow } from '@/Components/TicketTiersEditor';
import { inputBaseClass } from '@/Components/ui/Input';
import AdminLayout from '@/Layouts/AdminLayout';
import RichTextEditor from '@/Components/RichTextEditor';
import SeoHead from '@/Components/SeoHead';
import { Link, router, useForm, usePage } from '@inertiajs/react';
import { adminEventPromoGalleryRoutes } from '@/lib/adminEntityPromoUrls';
import { cn } from '@/lib/cn';
import { ImageOff, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

interface Tier {
    id: number;
    name: string;
    description: string | null;
    price: string;
    sort_order: number;
}

interface EventModel {
    id: number;
    slug: string;
    title: string;
    event_type?: string | null;
    description: string | null;
    event_rules: string | null;
    start_date: string | null;
    end_date: string | null;
    ticket_price: string | number | null;
    entry_is_paid?: boolean;
    capacity: number | null;
    status: string;
    venue_id: number;
    cover_image: string | null;
    listing_image?: string | null;
    venue: { id: number; name: string };
    artists: { id: number; name: string; avatar?: string | null }[];
    ticket_tiers: Tier[];
    sahnebul_reservation_enabled?: boolean;
    paytr_checkout_enabled?: boolean;
    ticket_acquisition_mode?: string | null;
    ticket_outlets?: { label: string; url: string }[];
    ticket_purchase_note?: string | null;
    promo_video_path?: string | null;
    promo_embed_url?: string | null;
    promo_gallery?: {
        embed_url?: string | null;
        video_path?: string | null;
        poster_path?: string | null;
        promo_kind?: 'story' | 'post' | null;
    }[] | null;
    promo_show_on_venue_profile_posts?: boolean;
    promo_show_on_venue_profile_videos?: boolean;
    promo_venue_profile_moderation?: string | null;
    promo_show_on_artist_profile_posts?: boolean;
    promo_show_on_artist_profile_videos?: boolean;
    promo_artist_profile_moderation?: string | null;
}

interface Props {
    event: EventModel;
    venues: { id: number; name: string }[];
    artists: { id: number; name: string; avatar?: string | null }[];
    venuePickerCategories: { id: number; name: string }[];
    googleMapsBrowserKey?: string | null;
    eventTypeOptions: { slug: string; label: string }[];
    /** PayTR panelde ödeme açık ve bilgiler tam mı? */
    paytrOnlineOperational?: boolean;
}

function storageUrl(path: string | null | undefined): string | null {
    if (!path || path.trim() === '') return null;
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    return `/storage/${path}`;
}

/** Sitede kart / liste: önce liste görseli, yoksa kapak. */
function listingPreviewUrl(listing: string, cover: string): string | null {
    return storageUrl(listing.trim() || cover.trim() || null);
}

function toTierRows(tiers: Tier[] | undefined): TierRow[] {
    if (!tiers?.length) return [];
    return tiers.map((t) => ({
        name: t.name,
        description: t.description ?? '',
        price: String(t.price),
    }));
}

type FlashProps = { success?: string | null; error?: string | null };

export default function AdminEventEdit({
    event,
    venues,
    artists,
    venuePickerCategories,
    googleMapsBrowserKey = null,
    eventTypeOptions,
    paytrOnlineOperational = false,
}: Readonly<Props>) {
    const page = usePage();
    const flash = (page.props as { flash?: FlashProps }).flash;
    const [imageImportUrls, setImageImportUrls] = useState('');
    const [imageImportMode, setImageImportMode] = useState<'image_cover' | 'image_listing'>('image_listing');
    const [imageImporting, setImageImporting] = useState(false);
    const [venueOptions, setVenueOptions] = useState(venues);
    const coverFileInputRef = useRef<HTMLInputElement>(null);
    const listingFileInputRef = useRef<HTMLInputElement>(null);
    /** Yayınla, form kaydı ile aynı istekte status=published gönderilsin (ayrı approve çağrısı DB'deki eski sanatçı listesiyle kalıyordu). */
    const forcePublishStatusRef = useRef(false);
    useEffect(() => {
        setVenueOptions(venues);
    }, [venues]);
    const { data, setData, put, processing, errors, progress, transform } = useForm({
        venue_id: String(event.venue_id),
        title: event.title,
        event_type: event.event_type ?? '',
        description: event.description ?? '',
        event_rules: event.event_rules ?? '',
        start_date: event.start_date != null && event.start_date !== '' ? event.start_date.slice(0, 16) : '',
        end_date: event.end_date?.slice(0, 16) ?? '',
        ticket_price: event.ticket_price != null ? String(event.ticket_price) : '',
        entry_is_paid: event.entry_is_paid !== false,
        capacity: event.capacity?.toString() ?? '',
        status: event.status,
        artist_ids: (event.artists ?? []).map((a) => a.id),
        ticket_tiers: toTierRows(event.ticket_tiers),
        cover_image: event.cover_image ?? '',
        cover_upload: null as File | null,
        listing_image: event.listing_image ?? '',
        listing_upload: null as File | null,
        ticket_acquisition_mode: inferTicketAcquisitionMode({
            ...event,
            paytr_checkout_enabled: event.paytr_checkout_enabled !== false,
        }),
        sahnebul_reservation_enabled: event.sahnebul_reservation_enabled !== false,
        paytr_checkout_enabled: event.paytr_checkout_enabled !== false,
        ticket_outlets: outletsFromServer(event.ticket_outlets),
        ticket_purchase_note: event.ticket_purchase_note ?? '',
        promo_show_on_venue_profile_posts: Boolean(event.promo_show_on_venue_profile_posts),
        promo_show_on_venue_profile_videos: Boolean(event.promo_show_on_venue_profile_videos),
        promo_show_on_artist_profile_posts: Boolean(event.promo_show_on_artist_profile_posts),
        promo_show_on_artist_profile_videos: Boolean(event.promo_show_on_artist_profile_videos),
    });

    transform((d) => {
        const { ticket_tiers: tiers, cover_upload, listing_upload, ticket_outlets, entry_is_paid, ...rest } = d;
        const paid = Boolean(entry_is_paid);
        const publishNow = forcePublishStatusRef.current;
        forcePublishStatusRef.current = false;
        return {
            ...rest,
            status: publishNow ? 'published' : rest.status,
            entry_is_paid: paid,
            description: rest.description || null,
            event_rules: rest.event_rules || null,
            end_date: rest.end_date || null,
            ticket_price: paid ? rest.ticket_price || null : null,
            capacity: rest.capacity || null,
            cover_image: rest.cover_image || null,
            listing_image: rest.listing_image || null,
            ticket_tiers: paid ? tiersToPayload(tiers) : [],
            ticket_outlets: ticket_outlets.filter((o) => o.label.trim() && o.url.trim()),
            ticket_purchase_note: rest.ticket_purchase_note.trim() || null,
            cover_upload,
            listing_upload,
        };
    });

    const field = cn('mt-1', inputBaseClass);
    const fieldDis = cn('mt-1', inputBaseClass, 'disabled:cursor-not-allowed disabled:opacity-50');
    const fieldResize = cn(
        'mt-1 w-full resize-y font-mono text-sm',
        inputBaseClass,
        'placeholder:text-zinc-500 dark:placeholder:text-zinc-600',
    );
    const fieldSm = cn('mt-1 w-full sm:w-56', inputBaseClass);

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        put(route('admin.events.update', event.id), {
            forceFormData: Boolean(data.cover_upload || data.listing_upload),
            preserveScroll: true,
            onSuccess: () => {
                setData('cover_upload', null);
                setData('listing_upload', null);
            },
        });
    };

    const destroyEvent = () => {
        if (!confirm('Etkinliği silmek istediğinize emin misiniz?')) return;
        router.delete(route('admin.events.destroy', event.id));
    };

    const clearCoverImage = () => {
        setData('cover_image', '');
        setData('cover_upload', null);
        if (coverFileInputRef.current) {
            coverFileInputRef.current.value = '';
        }
    };

    const clearListingImage = () => {
        setData('listing_image', '');
        setData('listing_upload', null);
        if (listingFileInputRef.current) {
            listingFileInputRef.current.value = '';
        }
    };

    const clearCoverUploadOnly = () => {
        setData('cover_upload', null);
        if (coverFileInputRef.current) {
            coverFileInputRef.current.value = '';
        }
    };

    const clearListingUploadOnly = () => {
        setData('listing_upload', null);
        if (listingFileInputRef.current) {
            listingFileInputRef.current.value = '';
        }
    };

    const clearAllEventImages = () => {
        clearCoverImage();
        clearListingImage();
    };

    const hasCoverStoredOrPending = Boolean(data.cover_image?.trim() || data.cover_upload);
    const hasListingStoredOrPending = Boolean(data.listing_image?.trim() || data.listing_upload);
    const hasAnyEventImage = hasCoverStoredOrPending || hasListingStoredOrPending;

    const submitImageImport = () => {
        if (!imageImportUrls.trim()) return;
        setImageImporting(true);
        router.post(
            route('admin.events.import-media', event.id),
            {
                urls_text: imageImportUrls,
                mode: imageImportMode,
                append_promo: true,
            },
            {
                preserveScroll: true,
                onFinish: () => setImageImporting(false),
                onSuccess: () => setImageImportUrls(''),
            },
        );
    };

    const validationSummary = useMemo(() => {
        const e = errors as Record<string, string | string[] | undefined>;
        const msgs: string[] = [];
        for (const val of Object.values(e)) {
            if (typeof val === 'string' && val.trim() !== '') {
                msgs.push(val);
            } else if (Array.isArray(val)) {
                for (const s of val) {
                    if (typeof s === 'string' && s.trim() !== '') {
                        msgs.push(s);
                    }
                }
            }
        }
        return [...new Set(msgs)];
    }, [errors]);

    return (
        <AdminLayout>
            <SeoHead title={`${event.title} — Düzenle`} description="Etkinliği düzenleyin." noindex />
            <div className="space-y-6">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <Link href={route('admin.events.index')} className="text-sm text-amber-400 hover:text-amber-300">
                            ← Etkinlik listesi
                        </Link>
                        <h1 className="mt-2 text-2xl font-bold text-zinc-900 dark:text-white">Etkinlik düzenle</h1>
                    </div>
                    <div className="flex gap-2">
                        <Link
                            href={route('events.show', eventShowParam(event))}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg border border-zinc-600 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
                        >
                            Sitede aç
                        </Link>
                        <button
                            type="button"
                            onClick={destroyEvent}
                            className="rounded-lg bg-red-600/90 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500"
                        >
                            Sil
                        </button>
                    </div>
                </div>

                <form onSubmit={submit} className="max-w-3xl space-y-6 rounded-xl border border-zinc-800 bg-zinc-900/60 p-6">
                    {flash?.success ? (
                        <div
                            className="rounded-lg border border-emerald-500/40 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-100"
                            role="status"
                        >
                            {flash.success}
                        </div>
                    ) : null}
                    {flash?.error ? (
                        <div className="rounded-lg border border-red-500/50 bg-red-950/50 px-4 py-3 text-sm text-red-100" role="alert">
                            {flash.error}
                        </div>
                    ) : null}
                    {validationSummary.length > 0 && (
                        <div
                            className="rounded-lg border border-red-500/50 bg-red-950/50 px-4 py-3 text-sm text-red-100"
                            role="alert"
                        >
                            <p className="font-semibold text-red-200">Kayıt yapılamadı — lütfen aşağıdaki uyarıları giderin:</p>
                            <ul className="mt-2 list-inside list-disc space-y-1">
                                {validationSummary.map((msg) => (
                                    <li key={msg}>{msg}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                    <div className="grid gap-4 sm:grid-cols-2">
                        <AdminEventVenueField
                            venues={venueOptions}
                            value={data.venue_id}
                            onChange={(id) => setData('venue_id', id)}
                            onVenueCreated={(v) => {
                                setVenueOptions((prev) =>
                                    [...prev.filter((p) => p.id !== v.id), v].sort((a, b) =>
                                        a.name.localeCompare(b.name, 'tr'),
                                    ),
                                );
                            }}
                            categories={venuePickerCategories}
                            googleMapsBrowserKey={googleMapsBrowserKey}
                            error={errors.venue_id}
                        />
                        <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-zinc-400">Başlık *</label>
                            <input
                                value={data.title}
                                onChange={(e) => setData('title', e.target.value)}
                                className={field}
                            />
                            {errors.title && <p className="mt-1 text-sm text-red-400">{errors.title}</p>}
                        </div>
                        <div className="sm:col-span-2">
                            <label htmlFor="admin-event-type-edit" className="block text-sm font-medium text-zinc-400">
                                Etkinlik türü (isteğe bağlı)
                            </label>
                            <select
                                id="admin-event-type-edit"
                                value={data.event_type}
                                onChange={(e) => setData('event_type', e.target.value)}
                                className={field}
                            >
                                <option value="">Seçin</option>
                                {eventTypeOptions.map((o) => (
                                    <option key={o.slug} value={o.slug}>
                                        {o.label}
                                    </option>
                                ))}
                            </select>
                            {errors.event_type && <p className="mt-1 text-sm text-red-400">{errors.event_type}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-400">Başlangıç (isteğe bağlı)</label>
                            <input
                                type="datetime-local"
                                value={data.start_date}
                                onChange={(e) => setData('start_date', e.target.value)}
                                className={field}
                            />
                            {errors.start_date && <p className="mt-1 text-sm text-red-400">{errors.start_date}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-400">Bitiş (isteğe bağlı)</label>
                            <input
                                type="datetime-local"
                                value={data.end_date}
                                onChange={(e) => setData('end_date', e.target.value)}
                                className={field}
                            />
                            {errors.end_date && <p className="mt-1 text-sm text-red-400">{errors.end_date}</p>}
                        </div>
                        <div className="sm:col-span-2">
                            <EventEntryPaidField
                                variant="admin"
                                idPrefix="admin_event_edit"
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
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-400">Genel bilet fiyatı (₺)</label>
                            <input
                                value={data.ticket_price}
                                onChange={(e) => setData('ticket_price', e.target.value)}
                                disabled={!data.entry_is_paid}
                                className={fieldDis}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-400">Kapasite</label>
                            <input
                                type="number"
                                min={1}
                                value={data.capacity}
                                onChange={(e) => setData('capacity', e.target.value)}
                                className={field}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-400">Durum *</label>
                            <select
                                value={data.status}
                                onChange={(e) => setData('status', e.target.value)}
                                className={field}
                            >
                                <option value="draft">Taslak</option>
                                <option value="published">Yayında</option>
                                <option value="cancelled">İptal</option>
                            </select>
                        </div>
                        <AdminArtistMultiSelect
                            label="Sanatçılar (isteğe bağlı)"
                            artists={artists}
                            value={data.artist_ids}
                            onChange={(artist_ids) => setData('artist_ids', artist_ids)}
                            helperText="Taslakta boş bırakılabilir. Yayına alırken en az bir sanatçı gerekir. İlk sıra headliner; ↑↓ ile sırayı değiştirin."
                            showOrderControls
                        />
                        {(errors.artist_ids || errors['artist_ids.0']) && (
                            <p className="sm:col-span-2 text-sm text-red-400">{errors.artist_ids ?? errors['artist_ids.0']}</p>
                        )}
                    </div>

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
                        <p className="mt-0.5 text-xs text-zinc-500">Düz metinde her satır ayrı madde; HTML ile de liste kullanılabilir.</p>
                        <RichTextEditor
                            value={data.event_rules}
                            onChange={(html) => setData('event_rules', html)}
                            placeholder="Kurallar…"
                            className="mt-2"
                        />
                    </div>

                    {data.entry_is_paid ? (
                        <TicketTiersEditor value={data.ticket_tiers} onChange={(ticket_tiers) => setData('ticket_tiers', ticket_tiers)} />
                    ) : null}

                    {data.entry_is_paid ? (
                        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm text-zinc-300">
                            <h3 className="font-semibold text-emerald-200">Sitede bilet: dört «nasıl alınır?» seçeneklerinden biri</h3>
                            <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                                «Sahnebul üzerinden kredi kartı ödemesi» seçildiğinde etkinlik sayfasında yeşil «Kart ile satın al» görünür; «Sahnebul üzerinden rezervasyon / bilet talebi»
                                seçildiğinde turuncu rezervasyon formu linki görünür (ikisi ayrı radyo seçimidir).
                            </p>
                            <ul className="mt-2 list-inside list-disc space-y-1.5 text-xs text-zinc-400">
                                <li>
                                    <span className="font-medium text-emerald-300/90">PayTR</span> — panelde ödeme açık olmalı.
                                    {!paytrOnlineOperational ? (
                                        <span className="block pt-1 text-amber-300/90">
                                            Şu an kapalı: süper yönetici «PayTR ödeme» menüsünden mağazayı etkinleştirmeli.
                                        </span>
                                    ) : (
                                        <span className="block pt-1 text-emerald-400/90">PayTR yapılandırması tamam görünüyor.</span>
                                    )}
                                </li>
                                <li>
                                    <span className="font-medium text-amber-300/90">Harici bilet siteleri</span> için satış yerini «Harici platformlar» seçin.
                                </li>
                            </ul>
                            {data.status === 'published' ? (
                                <p className="mt-3">
                                    <Link
                                        href={route('events.show', { event: eventShowParam(event) })}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-xs font-medium text-amber-400 hover:text-amber-300"
                                    >
                                        Canlı etkinlik sayfasını yeni sekmede aç →
                                    </Link>
                                </p>
                            ) : null}
                        </div>
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
                        variant="admin"
                        errors={errors as Partial<Record<string, string>>}
                    />

                    <div className="space-y-4 rounded-xl border border-zinc-700/80 bg-zinc-950/35 p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <h2 className="text-sm font-semibold text-zinc-200">Kapak ve liste görselleri</h2>
                                <p className="mt-1 max-w-xl text-xs text-zinc-500">
                                    Kapak yalnızca etkinlik detayında; liste görseli kartlarda kullanılır. Boş liste alanında kartta kapak
                                    gösterilir — kartta görseli tamamen kaldırmak için genelde kapak alanını da temizleyin veya aşağıdan tümünü
                                    kaldırın.
                                </p>
                            </div>
                            {hasAnyEventImage ? (
                                <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
                                    {hasCoverStoredOrPending ? (
                                        <button
                                            type="button"
                                            onClick={clearCoverImage}
                                            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-600 bg-zinc-900/80 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:border-amber-500/50 hover:bg-zinc-800"
                                        >
                                            <ImageOff className="h-3.5 w-3.5 opacity-90" aria-hidden />
                                            Kapak kaldır
                                        </button>
                                    ) : null}
                                    {hasListingStoredOrPending ? (
                                        <button
                                            type="button"
                                            onClick={clearListingImage}
                                            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-600 bg-zinc-900/80 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:border-amber-500/50 hover:bg-zinc-800"
                                        >
                                            <ImageOff className="h-3.5 w-3.5 opacity-90" aria-hidden />
                                            Liste kaldır
                                        </button>
                                    ) : null}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (
                                                !confirm(
                                                    'Kapak ve liste görselleri (URL + seçili dosyalar) tamamen temizlensin mi? Kaydet ile sunucuya işlenir.',
                                                )
                                            ) {
                                                return;
                                            }
                                            clearAllEventImages();
                                        }}
                                        className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/45 bg-rose-950/40 px-3 py-1.5 text-xs font-semibold text-rose-100 hover:bg-rose-950/70"
                                    >
                                        <X className="h-3.5 w-3.5 opacity-90" aria-hidden />
                                        Tüm görselleri kaldır
                                    </button>
                                </div>
                            ) : null}
                        </div>

                        <div>
                            <label htmlFor="admin-event-cover-url" className="block text-sm font-medium text-zinc-400">
                                Kapak görseli — etkinlik detayı (URL)
                            </label>
                            <p className="mt-0.5 text-xs text-zinc-500">Yalnızca detay sayfası üst alanı; liste / kartlarda kullanılmaz.</p>
                            <input
                                id="admin-event-cover-url"
                                value={data.cover_image}
                                onChange={(e) => setData('cover_image', e.target.value)}
                                className={field}
                            />
                            {storageUrl(data.cover_image) && (
                                <img
                                    src={storageUrl(data.cover_image) ?? ''}
                                    alt=""
                                    className="mt-2 h-32 max-w-md rounded-lg object-cover"
                                />
                            )}
                        </div>
                        <div>
                            <label htmlFor="admin-event-cover-file" className="block text-sm font-medium text-zinc-400">
                                Kapak görseli — detay (dosya)
                            </label>
                            <input
                                id="admin-event-cover-file"
                                ref={coverFileInputRef}
                                name="cover_upload"
                                type="file"
                                accept="image/*"
                                onChange={(e) => setData('cover_upload', e.target.files?.[0] ?? null)}
                                className="mt-1 w-full text-sm text-zinc-300"
                            />
                            {data.cover_upload ? (
                                <button
                                    type="button"
                                    onClick={clearCoverUploadOnly}
                                    className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-zinc-400 hover:text-amber-400"
                                >
                                    <X className="h-3 w-3" aria-hidden />
                                    Seçilen dosyayı iptal et (henüz kaydedilmedi)
                                </button>
                            ) : null}
                            {progress && (
                                <p className="mt-1 text-xs text-amber-400">Yükleniyor… {Math.round(progress.percentage ?? 0)}%</p>
                            )}
                        </div>
                        <div>
                            <label htmlFor="admin-event-listing-url" className="block text-sm font-medium text-zinc-400">
                                Liste / kart görseli (URL)
                            </label>
                            <p className="mt-0.5 text-xs text-zinc-500">
                                /etkinlikler ve kartlarda. Boş bırakırsanız sitede kapak görseli bu rol için kullanılır.
                            </p>
                            <input
                                id="admin-event-listing-url"
                                value={data.listing_image}
                                onChange={(e) => setData('listing_image', e.target.value)}
                                className={field}
                            />
                            {listingPreviewUrl(data.listing_image, data.cover_image) && (
                                <div className="mt-2">
                                    <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                                        Sitede kart / listede böyle görünür
                                    </p>
                                    <img
                                        src={listingPreviewUrl(data.listing_image, data.cover_image) ?? ''}
                                        alt=""
                                        className="h-24 max-w-xs rounded-lg object-cover ring-1 ring-zinc-600"
                                    />
                                    {!data.listing_image?.trim() && data.cover_image?.trim() ? (
                                        <p className="mt-1 text-xs text-amber-500/90">
                                            Şu an ayrı liste görseli yok; önizleme kapak görselidir. Kartta görseli kaldırmak için üstteki «Kapak
                                            kaldır» veya «Tüm görselleri kaldır» kullanın.
                                        </p>
                                    ) : null}
                                </div>
                            )}
                        </div>
                        <div>
                            <label htmlFor="admin-event-listing-file" className="block text-sm font-medium text-zinc-400">
                                Liste / kart görseli (dosya)
                            </label>
                            <input
                                id="admin-event-listing-file"
                                ref={listingFileInputRef}
                                name="listing_upload"
                                type="file"
                                accept="image/*"
                                onChange={(e) => setData('listing_upload', e.target.files?.[0] ?? null)}
                                className="mt-1 w-full text-sm text-zinc-300"
                            />
                            {data.listing_upload ? (
                                <button
                                    type="button"
                                    onClick={clearListingUploadOnly}
                                    className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-zinc-400 hover:text-amber-400"
                                >
                                    <X className="h-3 w-3" aria-hidden />
                                    Seçilen dosyayı iptal et (henüz kaydedilmedi)
                                </button>
                            ) : null}
                        </div>
                    </div>

                    <div className="space-y-4 rounded-lg border border-zinc-700/80 bg-zinc-950/40 p-4">
                        <h2 className="text-sm font-semibold text-zinc-200">Kapak ve liste — bağlantıdan içe aktar</h2>
                        <p className="text-xs text-zinc-500">
                            Her satıra bir <code className="text-zinc-400">https://</code> adresi; yalnızca{' '}
                            <strong className="text-zinc-400">ilk satır</strong> kullanılır.
                        </p>
                        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                            <div className="sm:col-span-2">
                                <label htmlFor="admin-event-image-import-urls" className="block text-xs font-medium text-zinc-400">
                                    Görsel bağlantıları
                                </label>
                                <textarea
                                    id="admin-event-image-import-urls"
                                    value={imageImportUrls}
                                    onChange={(e) => setImageImportUrls(e.target.value)}
                                    placeholder={'https://ornek.com/kapak.jpg'}
                                    rows={3}
                                    className={fieldResize}
                                />
                            </div>
                            <div>
                                <label htmlFor="admin-event-image-import-mode" className="block text-xs font-medium text-zinc-400">
                                    Hedef
                                </label>
                                <select
                                    id="admin-event-image-import-mode"
                                    value={imageImportMode}
                                    onChange={(e) => setImageImportMode(e.target.value as 'image_cover' | 'image_listing')}
                                    className={fieldSm}
                                >
                                    <option value="image_cover">Kapak görseli (detay)</option>
                                    <option value="image_listing">Liste / kart görseli</option>
                                </select>
                            </div>
                            <button
                                type="button"
                                disabled={imageImporting || !imageImportUrls.trim()}
                                onClick={submitImageImport}
                                className="rounded-lg bg-zinc-700 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-600 disabled:opacity-50"
                            >
                                {imageImporting ? 'İndiriliyor…' : 'Görseli içe aktar'}
                            </button>
                        </div>
                    </div>

                    <p className="text-xs text-zinc-500">
                        Etkinlik sayfasında üstte tanıtım videoları, altta gönderi görselleri (Instagram / görsel) gösterilir. Kapak ve liste görselleri
                        yukarıdaki alanlardır; bu bloktan farklıdır.
                    </p>
                    <AdminEntityPromoGalleryPanel
                        entity={event}
                        variant="event"
                        routes={adminEventPromoGalleryRoutes(event.id)}
                        eventVenueProfilePromoToggles={{
                            showPosts: data.promo_show_on_venue_profile_posts,
                            showVideos: data.promo_show_on_venue_profile_videos,
                            onChangeShowPosts: (v) => setData('promo_show_on_venue_profile_posts', v),
                            onChangeShowVideos: (v) => setData('promo_show_on_venue_profile_videos', v),
                            moderationStatus: event.promo_venue_profile_moderation ?? null,
                        }}
                        eventArtistProfilePromoToggles={{
                            showPosts: data.promo_show_on_artist_profile_posts,
                            showVideos: data.promo_show_on_artist_profile_videos,
                            onChangeShowPosts: (v) => setData('promo_show_on_artist_profile_posts', v),
                            onChangeShowVideos: (v) => setData('promo_show_on_artist_profile_videos', v),
                            moderationStatus: event.promo_artist_profile_moderation ?? null,
                        }}
                    />

                    <div className="flex flex-wrap gap-3">
                        <button
                            type="submit"
                            disabled={processing}
                            className="rounded-lg bg-amber-500 px-6 py-2.5 font-semibold text-zinc-950 hover:bg-amber-400 disabled:opacity-50"
                        >
                            Kaydet
                        </button>
                        {event.promo_venue_profile_moderation === 'pending_review' && (
                            <button
                                type="button"
                                onClick={() =>
                                    router.post(route('admin.events.approve-promo-venue-profile', event.id), {}, { preserveScroll: true })
                                }
                                className="rounded-lg border border-amber-500/60 bg-amber-950/50 px-4 py-2 text-sm font-semibold text-amber-100 hover:bg-amber-900/50"
                            >
                                Mekân profili tanıtımını onayla
                            </button>
                        )}
                        {event.promo_artist_profile_moderation === 'pending_review' && (
                            <button
                                type="button"
                                onClick={() =>
                                    router.post(route('admin.events.approve-promo-artist-profile', event.id), {}, { preserveScroll: true })
                                }
                                className="rounded-lg border border-sky-500/60 bg-sky-950/50 px-4 py-2 text-sm font-semibold text-sky-100 hover:bg-sky-900/50"
                            >
                                Sanatçı profili tanıtımını onayla
                            </button>
                        )}
                        {event.status === 'draft' && (
                            <button
                                type="button"
                                disabled={processing}
                                onClick={() => {
                                    forcePublishStatusRef.current = true;
                                    put(route('admin.events.update', event.id), {
                                        forceFormData: Boolean(data.cover_upload || data.listing_upload),
                                        preserveScroll: true,
                                        onSuccess: () => {
                                            setData('cover_upload', null);
                                            setData('listing_upload', null);
                                            setData('status', 'published');
                                        },
                                    });
                                }}
                                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                            >
                                Yayınla
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </AdminLayout>
    );
}
