import AdminArtistMultiSelect from '@/Components/AdminArtistMultiSelect';
import RichTextEditor from '@/Components/RichTextEditor';
import TicketSalesEditor, { emptyTicketOutletRow, inferTicketAcquisitionMode, outletsFromServer } from '@/Components/TicketSalesEditor';
import TicketTiersEditor, { tiersToPayload, type TierRow } from '@/Components/TicketTiersEditor';
import ArtistLayout from '@/Layouts/ArtistLayout';
import SeoHead from '@/Components/SeoHead';
import { useForm } from '@inertiajs/react';

interface Event {
    id: number;
    venue_id: number;
    artists?: { id: number; name: string }[];
    title: string;
    description: string | null;
    event_rules: string | null;
    start_date: string;
    end_date: string | null;
    ticket_price: number | null;
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
}

interface Props {
    event: Event;
    venues: { id: number; name: string }[];
    artists: CatalogArtist[];
}

export default function ArtistEventEdit({ event, venues, artists }: Readonly<Props>) {
    const { data, setData, put, processing, errors, transform } = useForm({
        venue_id: String(event.venue_id),
        artist_ids: (event.artists ?? []).map((a) => a.id),
        title: event.title,
        description: event.description ?? '',
        event_rules: event.event_rules ?? '',
        start_date: event.start_date.slice(0, 16),
        end_date: event.end_date ? event.end_date.slice(0, 16) : '',
        ticket_price: event.ticket_price?.toString() ?? '',
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

    transform((form) => ({
        ...form,
        ticket_tiers: tiersToPayload(form.ticket_tiers),
        ticket_outlets: form.ticket_outlets.filter((o) => o.label.trim() && o.url.trim()),
        ticket_purchase_note: form.ticket_purchase_note.trim() || null,
    }));

    return (
        <ArtistLayout>
            <SeoHead title={`${event.title} Düzenle - Sahnebul`} description="Etkinlik bilgilerini güncelleyin." noindex />

            <h1 className="font-display mb-8 text-2xl font-bold text-white">Etkinlik Düzenle</h1>

            <form onSubmit={(e) => { e.preventDefault(); put(route('artist.events.update', event.id)); }} className="max-w-2xl space-y-6 rounded-xl border border-white/5 bg-zinc-900/50 p-8">
                <div>
                    <label htmlFor="venue_id" className="block text-sm font-medium text-zinc-400">Mekan *</label>
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
                    <label htmlFor="title" className="block text-sm font-medium text-zinc-400">Etkinlik Adı *</label>
                    <input id="title" value={data.title} onChange={(e) => setData('title', e.target.value)} required className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-800 px-4 py-3 text-white" />
                </div>
                <div>
                    <label htmlFor="start_date" className="block text-sm font-medium text-zinc-400">Başlangıç *</label>
                    <input id="start_date" type="datetime-local" value={data.start_date} onChange={(e) => setData('start_date', e.target.value)} required className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-800 px-4 py-3 text-white" />
                </div>
                <div>
                    <label htmlFor="end_date" className="block text-sm font-medium text-zinc-400">Bitiş</label>
                    <input id="end_date" type="datetime-local" value={data.end_date} onChange={(e) => setData('end_date', e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-800 px-4 py-3 text-white" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <label htmlFor="ticket_price" className="block text-sm font-medium text-zinc-400">Genel bilet fiyatı (₺)</label>
                        <input id="ticket_price" type="number" step="0.01" min={0} value={data.ticket_price} onChange={(e) => setData('ticket_price', e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-800 px-4 py-3 text-white" />
                        <p className="mt-1 text-xs text-zinc-500">Kategori yoksa bu fiyat gösterilir.</p>
                    </div>
                    <div>
                        <label htmlFor="capacity" className="block text-sm font-medium text-zinc-400">Kapasite</label>
                        <input id="capacity" type="number" min={1} value={data.capacity} onChange={(e) => setData('capacity', e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-800 px-4 py-3 text-white" />
                    </div>
                </div>
                <TicketTiersEditor value={data.ticket_tiers} onChange={(ticket_tiers) => setData('ticket_tiers', ticket_tiers)} />
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
                    <label htmlFor="status" className="block text-sm font-medium text-zinc-400">Durum</label>
                    <select id="status" value={data.status} onChange={(e) => setData('status', e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-800 px-4 py-3 text-white">
                        <option value="draft">Taslak</option>
                        <option value="published">Yayında</option>
                    </select>
                </div>
                <button type="submit" disabled={processing} className="rounded-xl bg-amber-500 px-8 py-3 font-semibold text-zinc-950 hover:bg-amber-400 disabled:opacity-50">
                    Güncelle
                </button>
            </form>
        </ArtistLayout>
    );
}
