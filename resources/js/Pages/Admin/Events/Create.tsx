import AdminArtistMultiSelect from '@/Components/AdminArtistMultiSelect';
import AdminEventVenueField from '@/Components/AdminEventVenueField';
import EventEntryPaidField from '@/Components/EventEntryPaidField';
import TicketSalesEditor, { emptyTicketOutletRow, type TicketAcquisitionMode } from '@/Components/TicketSalesEditor';
import TicketTiersEditor, { tiersToPayload, type TierRow } from '@/Components/TicketTiersEditor';
import AdminLayout from '@/Layouts/AdminLayout';
import RichTextEditor from '@/Components/RichTextEditor';
import SeoHead from '@/Components/SeoHead';
import { Link, useForm } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';

interface Props {
    venues: { id: number; name: string }[];
    artists: { id: number; name: string; avatar?: string | null }[];
    venuePickerCategories: { id: number; name: string }[];
    googleMapsBrowserKey?: string | null;
    eventTypeOptions: { slug: string; label: string }[];
}

export default function AdminEventCreate({
    venues,
    artists,
    venuePickerCategories,
    googleMapsBrowserKey = null,
    eventTypeOptions,
}: Readonly<Props>) {
    const [venueOptions, setVenueOptions] = useState(venues);
    useEffect(() => {
        setVenueOptions(venues);
    }, [venues]);
    const { data, setData, post, processing, errors, progress, transform } = useForm({
        venue_id: venues[0]?.id?.toString() ?? '',
        title: '',
        event_type: '' as string,
        description: '',
        event_rules: '',
        start_date: '',
        end_date: '',
        ticket_price: '',
        entry_is_paid: true,
        capacity: '',
        status: 'draft',
        artist_ids: [] as number[],
        ticket_tiers: [] as TierRow[],
        cover_image: '',
        cover_upload: null as File | null,
        listing_image: '',
        listing_upload: null as File | null,
        ticket_acquisition_mode: 'sahnebul_reservation' as TicketAcquisitionMode,
        sahnebul_reservation_enabled: true,
        paytr_checkout_enabled: false,
        ticket_outlets: [emptyTicketOutletRow()],
        ticket_purchase_note: '',
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
        post(route('admin.events.store'), {
            forceFormData: Boolean(data.cover_upload || data.listing_upload),
            onSuccess: () => {
                setData('cover_upload', null);
                setData('listing_upload', null);
            },
        });
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
            <SeoHead title="Etkinlik Ekle" description="Yeni etkinlik kaydı." noindex />
            <div className="space-y-6">
                <Link href={route('admin.events.index')} className="text-sm text-amber-600 hover:text-amber-500 dark:text-amber-400">
                    ← Etkinlik listesi
                </Link>
                <h1 className="mb-6 text-2xl font-bold text-zinc-900 dark:text-white">Yeni Etkinlik Ekle</h1>
                <form onSubmit={submit} className="max-w-3xl space-y-6 rounded-xl border border-zinc-300 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/60">
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
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-400">Başlık *</label>
                            <input
                                value={data.title}
                                onChange={(e) => setData('title', e.target.value)}
                                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                            />
                            {errors.title && <p className="mt-1 text-sm text-red-400">{errors.title}</p>}
                        </div>
                        <div className="sm:col-span-2">
                            <label htmlFor="admin-event-type" className="block text-sm font-medium text-zinc-700 dark:text-zinc-400">
                                Etkinlik türü (isteğe bağlı)
                            </label>
                            <select
                                id="admin-event-type"
                                value={data.event_type}
                                onChange={(e) => setData('event_type', e.target.value)}
                                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
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
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-400">Başlangıç (isteğe bağlı)</label>
                            <input
                                type="datetime-local"
                                value={data.start_date}
                                onChange={(e) => setData('start_date', e.target.value)}
                                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                            />
                            {errors.start_date && <p className="mt-1 text-sm text-red-400">{errors.start_date}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-400">Bitiş (isteğe bağlı)</label>
                            <input
                                type="datetime-local"
                                value={data.end_date}
                                onChange={(e) => setData('end_date', e.target.value)}
                                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                            />
                            {errors.end_date && <p className="mt-1 text-sm text-red-400">{errors.end_date}</p>}
                        </div>
                        <div className="sm:col-span-2">
                            <EventEntryPaidField
                                variant="admin"
                                idPrefix="admin_event_create"
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
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-400">Genel bilet fiyatı (₺)</label>
                            <input
                                value={data.ticket_price}
                                onChange={(e) => setData('ticket_price', e.target.value)}
                                disabled={!data.entry_is_paid}
                                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-400">Kapasite</label>
                            <input
                                type="number"
                                min={1}
                                value={data.capacity}
                                onChange={(e) => setData('capacity', e.target.value)}
                                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-400">Durum *</label>
                            <select
                                value={data.status}
                                onChange={(e) => setData('status', e.target.value)}
                                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
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
                            helperText="Taslakta boş bırakılabilir. Yayına alırken en az bir sanatçı gerekir. İlk sıra headliner — ↑↓ ile sırayı değiştirebilirsiniz."
                            showOrderControls
                        />
                        {(errors.artist_ids || errors['artist_ids.0']) && (
                            <p className="text-sm text-red-400">{errors.artist_ids ?? errors['artist_ids.0']}</p>
                        )}
                    </div>
                    <div>
                        <span className="block text-sm font-medium text-zinc-700 dark:text-zinc-400">Açıklama</span>
                        <RichTextEditor
                            value={data.description}
                            onChange={(html) => setData('description', html)}
                            placeholder="Etkinlik açıklaması…"
                            className="mt-2"
                        />
                    </div>
                    <div>
                        <span className="block text-sm font-medium text-zinc-700 dark:text-zinc-400">Etkinlik kuralları</span>
                        <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-500">Düz metinde her satır ayrı madde olarak da gösterilebilir; HTML ile liste de kullanabilirsiniz.</p>
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
                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-400">Kapak — etkinlik detay sayfası (URL)</label>
                        <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-500">Sayfa üstü büyük görsel.</p>
                        <input
                            value={data.cover_image}
                            onChange={(e) => setData('cover_image', e.target.value)}
                            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-400">Kapak — detay (dosya)</label>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => setData('cover_upload', e.target.files?.[0] ?? null)}
                            className="mt-1 w-full text-sm text-zinc-700 dark:text-zinc-300"
                        />
                        {progress && (
                            <p className="mt-1 text-xs text-amber-400">Yükleniyor… {Math.round(progress.percentage ?? 0)}%</p>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-400">Liste / kart görseli (URL)</label>
                        <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-500">
                            Kartlarda ve listelerde kullanılır. Boş bırakılırsa kapak görseli kullanılır.
                        </p>
                        <input
                            value={data.listing_image}
                            onChange={(e) => setData('listing_image', e.target.value)}
                            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-400">Liste / kart görseli (dosya)</label>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => setData('listing_upload', e.target.files?.[0] ?? null)}
                            className="mt-1 w-full text-sm text-zinc-700 dark:text-zinc-300"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={processing}
                        className="rounded-lg bg-amber-500 px-6 py-2.5 font-semibold text-zinc-950 hover:bg-amber-400 disabled:opacity-50"
                    >
                        Kaydet
                    </button>
                </form>
            </div>
        </AdminLayout>
    );
}
