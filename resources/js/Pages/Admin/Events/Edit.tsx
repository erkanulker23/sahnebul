import AdminArtistMultiSelect from '@/Components/AdminArtistMultiSelect';
import AdminEventVenueField from '@/Components/AdminEventVenueField';
import EventEntryPaidField from '@/Components/EventEntryPaidField';
import { eventShowParam } from '@/lib/eventShowUrl';
import TicketSalesEditor, { emptyTicketOutletRow, inferTicketAcquisitionMode, outletsFromServer } from '@/Components/TicketSalesEditor';
import TicketTiersEditor, { tiersToPayload, type TierRow } from '@/Components/TicketTiersEditor';
import AdminLayout from '@/Layouts/AdminLayout';
import RichTextEditor from '@/Components/RichTextEditor';
import SeoHead from '@/Components/SeoHead';
import { Link, router, useForm, usePage } from '@inertiajs/react';
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
    ticket_acquisition_mode?: string | null;
    ticket_outlets?: { label: string; url: string }[];
    ticket_purchase_note?: string | null;
    promo_video_path?: string | null;
    promo_embed_url?: string | null;
    promo_gallery?: { embed_url?: string | null; video_path?: string | null; poster_path?: string | null }[] | null;
}

interface Props {
    event: EventModel;
    venues: { id: number; name: string }[];
    artists: { id: number; name: string; avatar?: string | null }[];
    venuePickerCategories: { id: number; name: string }[];
    googleMapsBrowserKey?: string | null;
    eventTypeOptions: { slug: string; label: string }[];
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
}: Readonly<Props>) {
    const page = usePage();
    const flash = (page.props as { flash?: FlashProps }).flash;
    const [mediaImportUrls, setMediaImportUrls] = useState('');
    const [mediaImportMode, setMediaImportMode] = useState<'image_cover' | 'image_listing' | 'promo_video'>('image_listing');
    const [appendPromoToGallery, setAppendPromoToGallery] = useState(true);
    const [mediaImporting, setMediaImporting] = useState(false);
    const [promoVideoFile, setPromoVideoFile] = useState<File | null>(null);
    const [promoPosterFile, setPromoPosterFile] = useState<File | null>(null);
    const [promoUploading, setPromoUploading] = useState(false);
    const [venueOptions, setVenueOptions] = useState(venues);
    const coverFileInputRef = useRef<HTMLInputElement>(null);
    const listingFileInputRef = useRef<HTMLInputElement>(null);
    const promoVideoInputRef = useRef<HTMLInputElement>(null);
    const promoPosterInputRef = useRef<HTMLInputElement>(null);
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
        ticket_acquisition_mode: inferTicketAcquisitionMode(event),
        ticket_outlets: outletsFromServer(event.ticket_outlets),
        ticket_purchase_note: event.ticket_purchase_note ?? '',
    });

    transform((d) => {
        const { ticket_tiers: tiers, cover_upload, listing_upload, ticket_outlets, entry_is_paid, ...rest } = d;
        const paid = Boolean(entry_is_paid);
        return {
            ...rest,
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

    const hasCoverToRemove = Boolean(data.cover_image?.trim() || data.cover_upload);
    const hasListingToRemove = Boolean(data.listing_image?.trim() || data.listing_upload);

    const submitMediaImport = () => {
        if (!mediaImportUrls.trim()) return;
        setMediaImporting(true);
        router.post(
            route('admin.events.import-media', event.id),
            {
                urls_text: mediaImportUrls,
                mode: mediaImportMode,
                append_promo: mediaImportMode === 'promo_video' ? appendPromoToGallery : true,
            },
            {
                preserveScroll: true,
                onFinish: () => setMediaImporting(false),
                onSuccess: () => setMediaImportUrls(''),
            },
        );
    };

    const submitPromoFileUpload = () => {
        if (!promoVideoFile && !promoPosterFile) return;
        setPromoUploading(true);
        const fd = new FormData();
        if (promoVideoFile) {
            fd.append('promo_video_upload', promoVideoFile);
        }
        if (promoPosterFile) {
            fd.append('promo_poster_upload', promoPosterFile);
        }
        fd.append('append_promo', appendPromoToGallery ? '1' : '0');
        router.post(route('admin.events.append-promo-files', event.id), fd, {
            preserveScroll: true,
            forceFormData: true,
            onFinish: () => setPromoUploading(false),
            onSuccess: () => {
                setPromoVideoFile(null);
                setPromoPosterFile(null);
                if (promoVideoInputRef.current) {
                    promoVideoInputRef.current.value = '';
                }
                if (promoPosterInputRef.current) {
                    promoPosterInputRef.current.value = '';
                }
            },
        });
    };

    const clearPromoFromServer = () => {
        if (!confirm('Tüm tanıtım videoları, önizleme görselleri ve Instagram gömüleri kaldırılsın mı?')) return;
        router.post(route('admin.events.clear-promo-media', event.id), {}, { preserveScroll: true });
    };

    const adminPromoPreviewItems = useMemo(() => {
        const g = event.promo_gallery;
        if (Array.isArray(g) && g.length > 0) {
            return g.map((row) => ({
                video_path: row.video_path?.trim() || null,
                poster_path: row.poster_path?.trim() || null,
                embed_url: row.embed_url?.trim() || null,
            }));
        }
        if (event.promo_video_path?.trim() || event.promo_embed_url?.trim()) {
            return [
                {
                    video_path: event.promo_video_path?.trim() || null,
                    poster_path: null,
                    embed_url: event.promo_embed_url?.trim() || null,
                },
            ];
        }
        return [];
    }, [event.promo_gallery, event.promo_video_path, event.promo_embed_url]);

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
                        <h1 className="mt-2 text-2xl font-bold text-white">Etkinlik düzenle</h1>
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
                                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
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
                                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
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
                                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                            />
                            {errors.start_date && <p className="mt-1 text-sm text-red-400">{errors.start_date}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-400">Bitiş (isteğe bağlı)</label>
                            <input
                                type="datetime-local"
                                value={data.end_date}
                                onChange={(e) => setData('end_date', e.target.value)}
                                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
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
                                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
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

                    <TicketSalesEditor
                        acquisitionMode={data.ticket_acquisition_mode}
                        onAcquisitionModeChange={(ticket_acquisition_mode) => {
                            setData('ticket_acquisition_mode', ticket_acquisition_mode);
                            if (ticket_acquisition_mode === 'phone_only') {
                                setData('ticket_outlets', [emptyTicketOutletRow()]);
                            }
                        }}
                        outlets={data.ticket_outlets}
                        onOutletsChange={(ticket_outlets) => setData('ticket_outlets', ticket_outlets)}
                        purchaseNote={data.ticket_purchase_note}
                        onPurchaseNoteChange={(ticket_purchase_note) => setData('ticket_purchase_note', ticket_purchase_note)}
                        variant="admin"
                        errors={errors as Partial<Record<string, string>>}
                    />

                    <div>
                        <label htmlFor="admin-event-cover-url" className="block text-sm font-medium text-zinc-400">
                            Kapak görseli — etkinlik detayı (URL)
                        </label>
                        <p className="mt-0.5 text-xs text-zinc-500">Yalnızca detay sayfası üst alanı; liste / kartlarda kullanılmaz.</p>
                        <input
                            id="admin-event-cover-url"
                            value={data.cover_image}
                            onChange={(e) => setData('cover_image', e.target.value)}
                            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                        />
                        {storageUrl(data.cover_image) && (
                            <img
                                src={storageUrl(data.cover_image) ?? ''}
                                alt=""
                                className="mt-2 h-32 max-w-md rounded-lg object-cover"
                            />
                        )}
                        {hasCoverToRemove ? (
                            <button
                                type="button"
                                onClick={clearCoverImage}
                                className="mt-2 text-sm font-medium text-red-400 hover:text-red-300"
                            >
                                Kapak görselini kaldır
                            </button>
                        ) : null}
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
                            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
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
                                        Şu an ayrı liste görseli yok; önizleme kapak görselidir.
                                    </p>
                                ) : null}
                            </div>
                        )}
                        {hasListingToRemove ? (
                            <button
                                type="button"
                                onClick={clearListingImage}
                                className="mt-2 text-sm font-medium text-red-400 hover:text-red-300"
                            >
                                Liste görselini kaldır
                            </button>
                        ) : null}
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
                    </div>

                    <div className="space-y-6 rounded-lg border border-zinc-700/80 bg-zinc-950/40 p-4">
                        <div>
                            <h2 className="text-sm font-semibold text-zinc-200">Tanıtım videosu (HTML5 — sitede oynatılır)</h2>
                            <p className="mt-1 text-xs text-zinc-500">
                                Ziyaretçiler yalnızca sunucunuza kaydedilen <strong className="text-zinc-400">MP4 / WebM / MOV</strong>{' '}
                                dosyasını görür; Instagram gömülüsü kullanılmaz. Videoyu harici bir siteden indirip aşağıdan yükleyin veya
                                doğrudan <code className="text-zinc-400">https://…/dosya.mp4</code> gibi bir adres yapıştırın. Instagram reel
                                bağlantısı yalnızca sunucuda <code className="text-zinc-400">yt-dlp</code> (
                                <code className="text-zinc-400">YTDLP_BINARY</code>) tanımlıysa otomatik indirilebilir; aksi halde hata
                                verir — o zaman dosyayı elle yükleyin.
                            </p>
                            <label className="mt-3 flex cursor-pointer items-start gap-2 text-xs text-zinc-400">
                                <input
                                    type="checkbox"
                                    checked={appendPromoToGallery}
                                    onChange={(e) => setAppendPromoToGallery(e.target.checked)}
                                    className="mt-0.5 rounded border-zinc-600 bg-zinc-800 text-amber-500"
                                />
                                <span>
                                    Tanıtım galerisine <strong className="text-zinc-300">yanına ekle</strong> (dosya yükleme ve tanıtım
                                    bağlantıları için). İşaretsiz: önce mevcut tüm tanıtım öğeleri silinir; ardından yüklediğiniz dosya veya
                                    yapıştırdığınız bağlantılar uygulanır.
                                </span>
                            </label>
                        </div>

                        <div className="border-t border-zinc-700/60 pt-5">
                            <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Dosyadan ekle</h3>
                            <p className="mt-1 text-xs text-zinc-500">MP4, WebM veya MOV video; isteğe bağlı tanıtım poster görseli.</p>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                            <div>
                                <label htmlFor="admin-event-promo-video-file" className="block text-xs font-medium text-zinc-400">
                                    Tanıtım videosu (dosya)
                                </label>
                                <input
                                    id="admin-event-promo-video-file"
                                    ref={promoVideoInputRef}
                                    type="file"
                                    accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
                                    onChange={(e) => setPromoVideoFile(e.target.files?.[0] ?? null)}
                                    className="mt-1 w-full text-sm text-zinc-300"
                                />
                            </div>
                            <div>
                                <label htmlFor="admin-event-promo-poster-file" className="block text-xs font-medium text-zinc-400">
                                    Tanıtım görseli / poster
                                </label>
                                <input
                                    id="admin-event-promo-poster-file"
                                    ref={promoPosterInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => setPromoPosterFile(e.target.files?.[0] ?? null)}
                                    className="mt-1 w-full text-sm text-zinc-300"
                                />
                            </div>
                        </div>
                        <button
                            type="button"
                            disabled={promoUploading || (!promoVideoFile && !promoPosterFile)}
                            onClick={submitPromoFileUpload}
                            className="mt-3 rounded-lg bg-zinc-700 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-600 disabled:opacity-50"
                        >
                            {promoUploading ? 'Yükleniyor…' : 'Tanıtım dosyalarını kaydet'}
                        </button>
                        </div>

                        <div className="border-t border-zinc-700/60 pt-5">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Bağlantıdan içe aktar</h3>
                        <p className="mt-1 text-xs text-zinc-500">
                            Her satıra bir <code className="text-zinc-400">https://</code> adresi. Kapak / liste modunda yalnızca ilk satır
                            kullanılır.
                        </p>
                        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                            <div className="sm:col-span-2">
                                <label htmlFor="admin-event-import-urls" className="block text-xs font-medium text-zinc-400">
                                    Bağlantılar (satır başına bir URL)
                                </label>
                                <textarea
                                    id="admin-event-import-urls"
                                    value={mediaImportUrls}
                                    onChange={(e) => setMediaImportUrls(e.target.value)}
                                    placeholder={
                                        'https://cdn.ornek.com/tanitim.mp4\nhttps://www.instagram.com/reel/… (yalnızca yt-dlp ile)'
                                    }
                                    rows={5}
                                    className="mt-1 w-full resize-y rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 font-mono text-sm text-white placeholder:text-zinc-600"
                                />
                            </div>
                            <div>
                                <label htmlFor="admin-event-import-mode" className="block text-xs font-medium text-zinc-400">
                                    Ne indirilsin?
                                </label>
                                <select
                                    id="admin-event-import-mode"
                                    value={mediaImportMode}
                                    onChange={(e) =>
                                        setMediaImportMode(e.target.value as 'image_cover' | 'image_listing' | 'promo_video')
                                    }
                                    className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white sm:w-56"
                                >
                                    <option value="image_cover">Kapak görseli (detay)</option>
                                    <option value="image_listing">Liste / kart görseli</option>
                                    <option value="promo_video">Tanıtım videosu — MP4 indir / IG (yt-dlp)</option>
                                </select>
                            </div>
                            <button
                                type="button"
                                disabled={mediaImporting || !mediaImportUrls.trim()}
                                onClick={submitMediaImport}
                                className="rounded-lg bg-zinc-700 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-600 disabled:opacity-50"
                            >
                                {mediaImporting ? 'İndiriliyor…' : 'İçe aktar'}
                            </button>
                        </div>
                        {adminPromoPreviewItems.length > 0 && (
                            <div className="mt-4 border-t border-zinc-700/60 pt-4">
                                <p className="text-xs text-zinc-500">
                                    Kayıtlı tanıtım{adminPromoPreviewItems.length > 1 ? `lar (${adminPromoPreviewItems.length})` : ''}
                                </p>
                                <ul className="mt-3 grid list-none grid-cols-2 gap-2 sm:grid-cols-4">
                                    {adminPromoPreviewItems.map((row, idx) => (
                                        <li
                                            key={`${row.embed_url ?? ''}-${row.poster_path ?? ''}-${idx}`}
                                            className="relative aspect-[9/16] overflow-hidden rounded-lg border border-zinc-700 bg-zinc-950"
                                        >
                                            {storageUrl(row.video_path) ? (
                                                <video
                                                    src={storageUrl(row.video_path) ?? ''}
                                                    controls
                                                    playsInline
                                                    className="h-full w-full object-cover"
                                                    poster={storageUrl(row.poster_path) ?? undefined}
                                                />
                                            ) : storageUrl(row.poster_path) ? (
                                                <img
                                                    src={storageUrl(row.poster_path) ?? ''}
                                                    alt=""
                                                    className="h-full w-full object-cover"
                                                />
                                            ) : (
                                                <div className="flex h-full items-center justify-center p-2 text-center text-[10px] text-zinc-500">
                                                    {row.embed_url?.includes('instagram.com')
                                                        ? 'Yalnızca IG URL (sitede gösterilmez — video yükleyin)'
                                                        : 'Bağlantı'}
                                                </div>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                                {adminPromoPreviewItems.some((r) => r.embed_url) ? (
                                    <p className="mt-2 text-[10px] text-zinc-500">
                                        {adminPromoPreviewItems
                                            .map((r) => r.embed_url)
                                            .filter(Boolean)
                                            .slice(0, 3)
                                            .join(' · ')}
                                        {adminPromoPreviewItems.filter((r) => r.embed_url).length > 3 ? '…' : ''}
                                    </p>
                                ) : null}
                                <button
                                    type="button"
                                    onClick={clearPromoFromServer}
                                    className="mt-3 text-sm font-medium text-red-400 hover:text-red-300"
                                >
                                    Tüm tanıtımları kaldır
                                </button>
                            </div>
                        )}
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <button
                            type="submit"
                            disabled={processing}
                            className="rounded-lg bg-amber-500 px-6 py-2.5 font-semibold text-zinc-950 hover:bg-amber-400 disabled:opacity-50"
                        >
                            Kaydet
                        </button>
                        {event.status === 'draft' && (
                            <button
                                type="button"
                                onClick={() => router.post(route('admin.events.approve', event.id), {}, { preserveScroll: true })}
                                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
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
