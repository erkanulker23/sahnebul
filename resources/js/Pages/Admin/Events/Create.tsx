import AdminArtistMultiSelect from '@/Components/AdminArtistMultiSelect';
import TicketSalesEditor, { emptyTicketOutletRow, type TicketAcquisitionMode } from '@/Components/TicketSalesEditor';
import TicketTiersEditor, { emptyTierRow, tiersToPayload, type TierRow } from '@/Components/TicketTiersEditor';
import AdminLayout from '@/Layouts/AdminLayout';
import RichTextEditor from '@/Components/RichTextEditor';
import SeoHead from '@/Components/SeoHead';
import { Link, useForm } from '@inertiajs/react';

interface Props {
    venues: { id: number; name: string }[];
    artists: { id: number; name: string }[];
}

export default function AdminEventCreate({ venues, artists }: Readonly<Props>) {
    const { data, setData, post, processing, errors, progress, transform } = useForm({
        venue_id: venues[0]?.id?.toString() ?? '',
        title: '',
        description: '',
        event_rules: '',
        start_date: '',
        end_date: '',
        ticket_price: '',
        capacity: '',
        status: 'draft',
        artist_ids: [] as number[],
        ticket_tiers: [emptyTierRow()] as TierRow[],
        cover_image: '',
        cover_upload: null as File | null,
        ticket_acquisition_mode: 'sahnebul' as TicketAcquisitionMode,
        ticket_outlets: [emptyTicketOutletRow()],
        ticket_purchase_note: '',
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
        post(route('admin.events.store'), {
            forceFormData: Boolean(data.cover_upload),
            onSuccess: () => setData('cover_upload', null),
        });
    };

    return (
        <AdminLayout>
            <SeoHead title="Etkinlik Ekle" description="Yeni etkinlik kaydı." noindex />
            <div className="space-y-6">
                <Link href={route('admin.events.index')} className="text-sm text-amber-600 hover:text-amber-500 dark:text-amber-400">
                    ← Etkinlik listesi
                </Link>
                <h1 className="mb-6 text-2xl font-bold dark:text-white">Yeni Etkinlik Ekle</h1>
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
                            helperText="En az bir onaylı sanatçı zorunludur; etkinlik hem mekân hem sanatçı sayfalarında görünür. İlk sıra headliner — ↑↓ ile sırayı değiştirebilirsiniz."
                            showOrderControls
                        />
                        {(errors.artist_ids || errors['artist_ids.0']) && (
                            <p className="text-sm text-red-400">{errors.artist_ids ?? errors['artist_ids.0']}</p>
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
                        <p className="mt-0.5 text-xs text-zinc-500">Düz metinde her satır ayrı madde olarak da gösterilebilir; HTML ile liste de kullanabilirsiniz.</p>
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
                        <label className="block text-sm font-medium text-zinc-400">Kapak (URL)</label>
                        <input
                            value={data.cover_image}
                            onChange={(e) => setData('cover_image', e.target.value)}
                            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-zinc-400">Kapak (dosya)</label>
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
