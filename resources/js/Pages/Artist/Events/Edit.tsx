import AdminArtistMultiSelect from '@/Components/AdminArtistMultiSelect';
import EventEntryPaidField from '@/Components/EventEntryPaidField';
import RichTextEditor from '@/Components/RichTextEditor';
import TicketSalesEditor, { emptyTicketOutletRow, inferTicketAcquisitionMode, outletsFromServer } from '@/Components/TicketSalesEditor';
import TicketTiersEditor, { tiersToPayload, type TierRow } from '@/Components/TicketTiersEditor';
import ArtistLayout from '@/Layouts/ArtistLayout';
import SeoHead from '@/Components/SeoHead';
import { formatTurkishDateTime } from '@/lib/formatTurkishDateTime';
import { Link, useForm } from '@inertiajs/react';

interface EventArtistLineup {
    id: number;
    name: string;
    slug?: string;
    avatar?: string | null;
    display_image?: string | null;
}

interface Event {
    id: number;
    venue_id: number;
    artists?: EventArtistLineup[];
    title: string;
    description: string | null;
    event_rules: string | null;
    start_date: string;
    end_date: string | null;
    ticket_price: number | null;
    entry_is_paid?: boolean;
    capacity: number | null;
    status: string;
    ticket_tiers?: { id: number; name: string; description: string | null; price: string; sort_order: number }[];
    sahnebul_reservation_enabled?: boolean;
    ticket_acquisition_mode?: string | null;
    ticket_outlets?: { label: string; url: string }[];
    ticket_purchase_note?: string | null;
}

interface CatalogArtist {
    id: number;
    name: string;
    avatar?: string | null;
}

interface PanelReviewRow {
    id: number;
    rating: number;
    comment: string | null;
    created_at: string | null;
    user: { id: number; name: string; avatar?: string | null };
}

interface Props {
    event: Event;
    venues: { id: number; name: string }[];
    artists: CatalogArtist[];
    venueReviews: PanelReviewRow[];
    eventReviews: PanelReviewRow[];
}

function storageSrc(path: string | null | undefined): string | null {
    const p = path?.trim();
    if (!p) return null;
    if (p.startsWith('http://') || p.startsWith('https://')) return p;
    return `/storage/${p}`;
}

function starLabel(rating: number): string {
    const n = Math.min(5, Math.max(1, Math.round(rating)));
    return `${'★'.repeat(n)}${'☆'.repeat(5 - n)}`;
}

function ReviewColumn({
    title,
    hint,
    rows,
}: Readonly<{ title: string; hint: string; rows: PanelReviewRow[] }>) {
    return (
        <div className="rounded-xl border border-white/10 bg-zinc-900/40 p-5">
            <h2 className="font-display text-lg font-semibold text-white">{title}</h2>
            <p className="mt-1 text-xs text-zinc-500">{hint}</p>
            {rows.length === 0 ? (
                <p className="mt-4 text-sm text-zinc-500">Henüz değerlendirme yok.</p>
            ) : (
                <ul className="mt-4 max-h-80 space-y-4 overflow-y-auto pr-1">
                    {rows.map((r) => (
                        <li key={r.id} className="border-b border-white/5 pb-4 last:border-0 last:pb-0">
                            <div className="flex items-start gap-3">
                                {storageSrc(r.user.avatar) ? (
                                    <img
                                        src={storageSrc(r.user.avatar) ?? ''}
                                        alt=""
                                        className="mt-0.5 h-9 w-9 shrink-0 rounded-full object-cover"
                                    />
                                ) : (
                                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-xs text-zinc-400">
                                        {(r.user.name || '?').slice(0, 1).toUpperCase()}
                                    </div>
                                )}
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-zinc-200">{r.user.name}</p>
                                    <p className="text-xs text-amber-500/90" aria-label={`${r.rating} üzerinden 5`}>
                                        {starLabel(r.rating)}
                                        <span className="ml-1.5 text-zinc-500">{r.rating}/5</span>
                                    </p>
                                    {r.comment?.trim() ? (
                                        <p className="mt-1 text-sm text-zinc-400">{r.comment}</p>
                                    ) : null}
                                    {r.created_at ? (
                                        <p className="mt-1 text-xs text-zinc-600">
                                            {formatTurkishDateTime(r.created_at)}
                                        </p>
                                    ) : null}
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export default function ArtistEventEdit({
    event,
    venues,
    artists,
    venueReviews,
    eventReviews,
}: Readonly<Props>) {
    const { data, setData, put, processing, errors, transform } = useForm({
        venue_id: String(event.venue_id),
        artist_ids: (event.artists ?? []).map((a) => a.id),
        title: event.title,
        description: event.description ?? '',
        event_rules: event.event_rules ?? '',
        start_date: event.start_date.slice(0, 16),
        end_date: event.end_date ? event.end_date.slice(0, 16) : '',
        ticket_price: event.ticket_price?.toString() ?? '',
        entry_is_paid: event.entry_is_paid !== false,
        capacity: event.capacity?.toString() ?? '',
        status: event.status,
        ticket_tiers: (event.ticket_tiers ?? []).map((t) => ({
            name: t.name,
            description: t.description ?? '',
            price: String(t.price),
        })) as TierRow[],
        ticket_acquisition_mode: inferTicketAcquisitionMode(event),
        ticket_outlets: outletsFromServer(event.ticket_outlets),
        ticket_purchase_note: event.ticket_purchase_note ?? '',
    });

    transform((form) => {
        const paid = Boolean(form.entry_is_paid);
        return {
            ...form,
            entry_is_paid: paid,
            ticket_price: paid ? form.ticket_price || null : null,
            ticket_tiers: paid ? tiersToPayload(form.ticket_tiers) : [],
            ticket_outlets: form.ticket_outlets.filter((o) => o.label.trim() && o.url.trim()),
            ticket_purchase_note: form.ticket_purchase_note.trim() || null,
        };
    });

    const lineup = event.artists ?? [];

    return (
        <ArtistLayout>
            <SeoHead title={`${event.title} Düzenle - Sahnebul`} description="Etkinlik bilgilerini güncelleyin." noindex />

            <h1 className="font-display mb-6 text-2xl font-bold text-white">Etkinlik Düzenle</h1>

            {lineup.length > 0 && (
                <section className="mb-8 max-w-2xl rounded-xl border border-white/10 bg-zinc-900/40 p-5">
                    <h2 className="text-sm font-medium text-zinc-400">Sanatçı görselleri (sıra: headliner önce)</h2>
                    <ul className="mt-4 flex flex-wrap gap-4">
                        {lineup.map((a, i) => {
                            const src = storageSrc(a.display_image ?? a.avatar);
                            const href = a.slug ? route('artists.show', a.slug) : null;
                            const inner = (
                                <>
                                    {src ? (
                                        <img src={src} alt="" className="h-16 w-16 rounded-full object-cover ring-2 ring-amber-500/30" />
                                    ) : (
                                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-700 text-lg text-zinc-400 ring-2 ring-white/10">
                                            🎤
                                        </div>
                                    )}
                                    <span className="mt-2 max-w-[5.5rem] truncate text-center text-xs font-medium text-zinc-200">{a.name}</span>
                                    <span className="text-[10px] text-zinc-500">{i === 0 ? 'Headliner' : `${i + 1}. sıra`}</span>
                                </>
                            );
                            return (
                                <li key={a.id} className="flex w-24 flex-col items-center">
                                    {href ? (
                                        <Link href={href} className="flex flex-col items-center hover:opacity-90">
                                            {inner}
                                        </Link>
                                    ) : (
                                        <div className="flex flex-col items-center">{inner}</div>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                </section>
            )}

            <div className="mb-10 grid max-w-4xl gap-6 lg:grid-cols-2">
                <ReviewColumn
                    title="Mekân değerlendirmeleri"
                    hint="Bu etkinliğin yapıldığı mekâna yazılmış onaylı yorumlar."
                    rows={venueReviews}
                />
                <ReviewColumn
                    title="Etkinlik değerlendirmeleri"
                    hint="Ziyaretçilerin bu etkinlik sayfası üzerinden bıraktığı değerlendirmeler."
                    rows={eventReviews}
                />
            </div>

            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    put(route('artist.events.update', event.id));
                }}
                className="max-w-2xl space-y-6 rounded-xl border border-white/5 bg-zinc-900/50 p-8"
            >
                <div>
                    <label htmlFor="venue_id" className="block text-sm font-medium text-zinc-400">
                        Mekan *
                    </label>
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
                    {errors.venue_id && <p className="mt-1 text-sm text-red-400">{errors.venue_id}</p>}
                    <p className="mt-1 text-xs text-zinc-500">Etkinliğin gerçekleşeceği onaylı mekanı seçin.</p>
                </div>
                <AdminArtistMultiSelect
                    label="Sanatçılar *"
                    artists={artists}
                    value={data.artist_ids}
                    onChange={(artist_ids) => setData('artist_ids', artist_ids)}
                    helperText="Yayınlandığında bu sanatçıların profillerinde de görünür. İlk sıra headliner."
                    showOrderControls
                />
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
                    idPrefix="artist_event_edit"
                    value={data.entry_is_paid}
                    onChange={(paid) => {
                        setData('entry_is_paid', paid);
                        if (!paid) {
                            setData('ticket_price', '');
                            setData('ticket_tiers', []);
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
                        <p className="mt-1 text-xs text-zinc-500">Kategori yoksa bu fiyat gösterilir.</p>
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
                    <RichTextEditor
                        value={data.event_rules}
                        onChange={(html) => setData('event_rules', html)}
                        placeholder="Kurallar…"
                        className="mt-2"
                    />
                </div>
                <div>
                    <label htmlFor="status" className="block text-sm font-medium text-zinc-400">
                        Durum
                    </label>
                    <select
                        id="status"
                        value={data.status}
                        onChange={(e) => setData('status', e.target.value)}
                        className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-800 px-4 py-3 text-white"
                    >
                        <option value="draft">Taslak</option>
                        <option value="published">Yayında</option>
                    </select>
                </div>
                <button
                    type="submit"
                    disabled={processing}
                    className="rounded-xl bg-amber-500 px-8 py-3 font-semibold text-zinc-950 hover:bg-amber-400 disabled:opacity-50"
                >
                    Güncelle
                </button>
            </form>
        </ArtistLayout>
    );
}
