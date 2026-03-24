import AdminArtistMultiSelect from '@/Components/AdminArtistMultiSelect';
import { eventShowParam } from '@/lib/eventShowUrl';
import TicketSalesEditor, { emptyTicketOutletRow, inferTicketAcquisitionMode, outletsFromServer } from '@/Components/TicketSalesEditor';
import TicketTiersEditor, { emptyTierRow, tiersToPayload, type TierRow } from '@/Components/TicketTiersEditor';
import AdminLayout from '@/Layouts/AdminLayout';
import RichTextEditor from '@/Components/RichTextEditor';
import SeoHead from '@/Components/SeoHead';
import { Link, router, useForm } from '@inertiajs/react';

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
    description: string | null;
    event_rules: string | null;
    start_date: string;
    end_date: string | null;
    ticket_price: string | number | null;
    capacity: number | null;
    status: string;
    venue_id: number;
    cover_image: string | null;
    venue: { id: number; name: string };
    artists: { id: number; name: string }[];
    ticket_tiers: Tier[];
    sahnebul_reservation_enabled?: boolean;
    ticket_acquisition_mode?: string | null;
    ticket_outlets?: { label: string; url: string }[];
    ticket_purchase_note?: string | null;
}

interface Props {
    event: EventModel;
    venues: { id: number; name: string }[];
    artists: { id: number; name: string }[];
}

function storageUrl(path: string | null): string | null {
    if (!path) return null;
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    return `/storage/${path}`;
}

function toTierRows(tiers: Tier[] | undefined): TierRow[] {
    if (!tiers?.length) return [emptyTierRow()];
    return tiers.map((t) => ({
        name: t.name,
        description: t.description ?? '',
        price: String(t.price),
    }));
}

export default function AdminEventEdit({ event, venues, artists }: Readonly<Props>) {
    const { data, setData, put, processing, errors, progress, transform } = useForm({
        venue_id: String(event.venue_id),
        title: event.title,
        description: event.description ?? '',
        event_rules: event.event_rules ?? '',
        start_date: event.start_date?.slice(0, 16) ?? '',
        end_date: event.end_date?.slice(0, 16) ?? '',
        ticket_price: event.ticket_price != null ? String(event.ticket_price) : '',
        capacity: event.capacity?.toString() ?? '',
        status: event.status,
        artist_ids: (event.artists ?? []).map((a) => a.id),
        ticket_tiers: toTierRows(event.ticket_tiers),
        cover_image: event.cover_image ?? '',
        cover_upload: null as File | null,
        ticket_acquisition_mode: inferTicketAcquisitionMode(event),
        ticket_outlets: outletsFromServer(event.ticket_outlets),
        ticket_purchase_note: event.ticket_purchase_note ?? '',
    });

    transform((d) => {
        const { ticket_tiers: tiers, cover_upload, ticket_outlets, ...rest } = d;
        return {
            ...rest,
            description: rest.description || null,
            event_rules: rest.event_rules || null,
            end_date: rest.end_date || null,
            ticket_price: rest.ticket_price || null,
            capacity: rest.capacity || null,
            cover_image: rest.cover_image || null,
            ticket_tiers: tiersToPayload(tiers),
            ticket_outlets: ticket_outlets.filter((o) => o.label.trim() && o.url.trim()),
            ticket_purchase_note: rest.ticket_purchase_note.trim() || null,
            cover_upload,
        };
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        put(route('admin.events.update', event.id), {
            forceFormData: Boolean(data.cover_upload),
            preserveScroll: true,
            onSuccess: () => setData('cover_upload', null),
        });
    };

    const destroyEvent = () => {
        if (!confirm('Etkinliği silmek istediğinize emin misiniz?')) return;
        router.delete(route('admin.events.destroy', event.id));
    };

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
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-zinc-400">Mekan *</label>
                            <select
                                value={data.venue_id}
                                onChange={(e) => setData('venue_id', e.target.value)}
                                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                            >
                                {venues.map((v) => (
                                    <option key={v.id} value={v.id}>
                                        {v.name}
                                    </option>
                                ))}
                            </select>
                            {errors.venue_id && <p className="mt-1 text-sm text-red-400">{errors.venue_id}</p>}
                        </div>
                        <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-zinc-400">Başlık *</label>
                            <input
                                value={data.title}
                                onChange={(e) => setData('title', e.target.value)}
                                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                            />
                            {errors.title && <p className="mt-1 text-sm text-red-400">{errors.title}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-400">Başlangıç *</label>
                            <input
                                type="datetime-local"
                                value={data.start_date}
                                onChange={(e) => setData('start_date', e.target.value)}
                                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-400">Bitiş</label>
                            <input
                                type="datetime-local"
                                value={data.end_date}
                                onChange={(e) => setData('end_date', e.target.value)}
                                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-400">Genel bilet fiyatı (₺)</label>
                            <input
                                value={data.ticket_price}
                                onChange={(e) => setData('ticket_price', e.target.value)}
                                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
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
                            label="Sanatçılar *"
                            artists={artists}
                            value={data.artist_ids}
                            onChange={(artist_ids) => setData('artist_ids', artist_ids)}
                            helperText="En az bir sanatçı zorunludur. İlk sıra headliner; ↑↓ ile sırayı değiştirin."
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
                        variant="admin"
                        errors={errors as Partial<Record<string, string>>}
                    />

                    <div>
                        <label className="block text-sm font-medium text-zinc-400">Kapak görseli (URL)</label>
                        <input
                            value={data.cover_image}
                            onChange={(e) => setData('cover_image', e.target.value)}
                            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                        />
                        {storageUrl(data.cover_image) && (
                            <img src={storageUrl(data.cover_image) ?? ''} alt="" className="mt-2 h-32 max-w-md rounded-lg object-cover" />
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-zinc-400">Kapak görseli (dosya)</label>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => setData('cover_upload', e.target.files?.[0] ?? null)}
                            className="mt-1 w-full text-sm text-zinc-300"
                        />
                        {progress && (
                            <p className="mt-1 text-xs text-amber-400">Yükleniyor… {Math.round(progress.percentage ?? 0)}%</p>
                        )}
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
