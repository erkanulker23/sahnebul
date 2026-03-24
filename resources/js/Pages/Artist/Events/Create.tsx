import AdminArtistMultiSelect from '@/Components/AdminArtistMultiSelect';
import RichTextEditor from '@/Components/RichTextEditor';
import TicketSalesEditor, { emptyTicketOutletRow, type TicketAcquisitionMode } from '@/Components/TicketSalesEditor';
import TicketTiersEditor, { tiersToPayload, type TierRow } from '@/Components/TicketTiersEditor';
import ArtistLayout from '@/Layouts/ArtistLayout';
import SeoHead from '@/Components/SeoHead';
import { useForm } from '@inertiajs/react';

interface Venue {
    id: number;
    name: string;
}

interface CatalogArtist {
    id: number;
    name: string;
}

interface Props {
    venues: Venue[];
    artists: CatalogArtist[];
    defaultArtistId?: number | null;
}

export default function ArtistEventCreate({ venues, artists, defaultArtistId = null }: Readonly<Props>) {
    const { data, setData, post, processing, errors, transform } = useForm({
        venue_id: venues.length ? String(venues[0].id) : '',
        artist_ids: defaultArtistId ? [defaultArtistId] : ([] as number[]),
        title: '',
        description: '',
        event_rules: '18 yaş altı katılımcılar ebeveyn eşliğinde giriş yapabilir.\nEtkinlik alanına dışarıdan yiyecek-içecek alınmaz.\nProfesyonel kamera ve kayıt ekipmanı izinsiz kullanılamaz.\nBilet iadesi organizatör kurallarına tabidir.',
        start_date: '',
        end_date: '',
        ticket_price: '',
        capacity: '',
        ticket_tiers: [] as TierRow[],
        ticket_acquisition_mode: 'sahnebul' as TicketAcquisitionMode,
        ticket_outlets: [emptyTicketOutletRow()],
        ticket_purchase_note: '',
    });

    transform((form) => ({
        ...form,
        ticket_tiers: tiersToPayload(form.ticket_tiers),
        ticket_outlets: form.ticket_outlets.filter((o) => o.label.trim() && o.url.trim()),
        ticket_purchase_note: form.ticket_purchase_note.trim() || null,
    }));

    return (
        <ArtistLayout>
            <SeoHead title="Etkinlik Ekle - Sahnebul" description="Yeni etkinlik oluşturun." noindex />

            <h1 className="font-display mb-8 text-2xl font-bold text-white">Yeni Etkinlik</h1>

            <form onSubmit={(e) => { e.preventDefault(); post(route('artist.events.store')); }} className="max-w-2xl space-y-6 rounded-xl border border-white/5 bg-zinc-900/50 p-8">
                <div>
                    <label htmlFor="venue_id" className="block text-sm font-medium text-zinc-400">Mekan *</label>
                    <select id="venue_id" value={data.venue_id} onChange={(e) => setData('venue_id', e.target.value)} required className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-800 px-4 py-3 text-white">
                        {venues.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                    <p className="mt-1 text-xs text-zinc-500">Mekân, onaylı mekan listenizden seçilir; listeniz boşsa önce mekan ekleyin.</p>
                </div>
                <AdminArtistMultiSelect
                    label="Sanatçılar *"
                    artists={artists}
                    value={data.artist_ids}
                    onChange={(artist_ids) => setData('artist_ids', artist_ids)}
                    helperText="Katalogdaki onaylı sanatçılar. Etkinlik bu kişilerin profillerinde de listelenir. İlk sıra headliner."
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
                        <p className="mt-1 text-xs text-zinc-500">Kategori eklenmezse bu fiyat kullanılır.</p>
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
                <button type="submit" disabled={processing} className="rounded-xl bg-amber-500 px-8 py-3 font-semibold text-zinc-950 hover:bg-amber-400 disabled:opacity-50">
                    Oluştur
                </button>
            </form>
        </ArtistLayout>
    );
}
