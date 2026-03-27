import PhoneInput from '@/Components/PhoneInput';
import SeoHead from '@/Components/SeoHead';
import AppLayout from '@/Layouts/AppLayout';
import { Link, useForm } from '@inertiajs/react';
import { useMemo } from 'react';

interface Venue {
    id: number;
    name: string;
    slug: string;
}

interface TicketTier {
    id: number;
    name: string;
    description: string | null;
    price: string;
    sort_order: number;
}

interface Event {
    id: number;
    title: string;
    start_date: string;
    ticket_price: number | null;
    entry_is_paid?: boolean;
    ticket_tiers?: TicketTier[];
}

interface Props {
    venue: Venue & { city: { name: string }; category: { name: string } };
    events: Event[];
    preselectEventId?: number | null;
    whatsappReservationHref?: string | null;
}

function eventPriceLabel(ev: Event): string {
    if (ev.entry_is_paid === false) {
        return 'Ücretsiz giriş';
    }
    const tiers = ev.ticket_tiers ?? [];
    if (tiers.length > 0) {
        const nums = tiers.map((t) => parseFloat(t.price));
        const min = Math.min(...nums);
        const max = Math.max(...nums);
        if (min === max) {
            return `${min} ₺`;
        }
        return `${min} – ${max} ₺`;
    }
    return ev.ticket_price != null ? `${ev.ticket_price} ₺` : '—';
}

export default function ReservationCreate({
    venue,
    events,
    preselectEventId = null,
    whatsappReservationHref = null,
}: Readonly<Props>) {
    const preselectedEvent = useMemo(
        () => (preselectEventId ? events.find((e) => e.id === preselectEventId) ?? null : null),
        [preselectEventId, events],
    );

    const initialTicketTierId = useMemo((): number | null => {
        const tiers = preselectedEvent?.ticket_tiers ?? [];
        if (tiers.length === 0) {
            return null;
        }
        return [...tiers].sort((a, b) => a.sort_order - b.sort_order)[0].id;
    }, [preselectedEvent]);

    const { data, setData, post, processing, errors } = useForm({
        venue_id: venue.id,
        guest_name: '',
        guest_phone: '',
        event_id: preselectedEvent?.id ?? null,
        event_ticket_tier_id: initialTicketTierId,
        reservation_date: '',
        reservation_time: '',
        reservation_type: 'table' as 'table' | 'ticket',
        guest_count: 1,
        quantity: 1,
        notes: '',
    });

    const selectedEvent = useMemo(
        () => events.find((e) => e.id === data.event_id) ?? null,
        [events, data.event_id]
    );

    const tierOptions = selectedEvent?.ticket_tiers ?? [];
    const needsTier = Boolean(selectedEvent && tierOptions.length > 0);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('reservations.store'));
    };

    return (
        <AppLayout>
            <SeoHead
                title={`Rezervasyon - ${venue.name} | Sahnebul`}
                description={`${venue.name}, ${venue.city.name} — rezervasyon formu.`}
                noindex
            />

            <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
                <Link href={route('venues.show', venue.slug)} className="mb-6 inline-block text-amber-400 hover:text-amber-300">
                    ← {venue.name}
                </Link>
                <h1 className="font-display mb-4 text-3xl font-bold text-white">Rezervasyon Yap</h1>
                <p className="mb-8 text-sm text-zinc-400">
                    Bu form Sahnebul rezervasyon sistemidir. Talebiniz mekân yönetimine iletilir; aynı zamanda{' '}
                    <strong className="text-zinc-300">sahnebul.com yönetimi</strong> kayıt altına alır ve gerekirse size dönüş yapabilir.
                </p>

                {whatsappReservationHref ? (
                    <div className="mb-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5">
                        <p className="text-sm text-emerald-100/90">
                            WhatsApp üzerinden mekâna yazarken etkinlik bilgisi ve Sahnebul kaynağı mesaja eklenir.
                        </p>
                        <a
                            href={whatsappReservationHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 font-semibold text-white transition hover:bg-emerald-500 sm:w-auto sm:px-6"
                        >
                            WhatsApp ile rezervasyon mesajı hazırla
                        </a>
                    </div>
                ) : null}

                <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-white/5 bg-zinc-900/50 p-8">
                    <div>
                        <label htmlFor="res_guest_name" className="block text-sm font-medium text-zinc-400">
                            Adınız Soyadınız *
                        </label>
                        <input
                            id="res_guest_name"
                            type="text"
                            autoComplete="name"
                            value={data.guest_name}
                            onChange={(e) => setData('guest_name', e.target.value)}
                            required
                            maxLength={120}
                            className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-800 px-4 py-3 text-white"
                        />
                        {errors.guest_name && <p className="mt-1 text-sm text-red-400">{errors.guest_name}</p>}
                    </div>
                    <div>
                        <label htmlFor="res_guest_phone" className="block text-sm font-medium text-zinc-400">
                            Telefon numaranız *
                        </label>
                        <PhoneInput
                            id="res_guest_phone"
                            value={data.guest_phone}
                            onChange={(v) => setData('guest_phone', v)}
                            required
                            className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-800 px-4 py-3 text-white"
                        />
                        {errors.guest_phone && <p className="mt-1 text-sm text-red-400">{errors.guest_phone}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-zinc-400">Tarih</label>
                        <input
                            type="date"
                            value={data.reservation_date}
                            onChange={(e) => setData('reservation_date', e.target.value)}
                            required
                            min={new Date().toISOString().split('T')[0]}
                            className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-800 px-4 py-3 text-white"
                        />
                        {errors.reservation_date && <p className="mt-1 text-sm text-red-400">{errors.reservation_date}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-zinc-400">Saat</label>
                        <input
                            type="time"
                            value={data.reservation_time}
                            onChange={(e) => setData('reservation_time', e.target.value)}
                            required
                            className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-800 px-4 py-3 text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-zinc-400">Rezervasyon Tipi</label>
                        <select
                            value={data.reservation_type}
                            onChange={(e) => setData('reservation_type', e.target.value as 'table' | 'ticket')}
                            className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-800 px-4 py-3 text-white"
                        >
                            <option value="table">Masa</option>
                            <option value="ticket">Bilet</option>
                        </select>
                    </div>
                    {events.length > 0 && (
                        <div>
                            <label className="block text-sm font-medium text-zinc-400">Etkinlik (opsiyonel)</label>
                            <select
                                value={data.event_id ?? ''}
                                onChange={(e) => {
                                    const v = e.target.value;
                                    const id = v ? parseInt(v, 10) : null;
                                    setData('event_id', id);
                                    if (!id) {
                                        setData('event_ticket_tier_id', null);
                                        return;
                                    }
                                    const ev = events.find((x) => x.id === id);
                                    const tiers = ev?.ticket_tiers ?? [];
                                    if (tiers.length > 0) {
                                        const sorted = [...tiers].sort((a, b) => a.sort_order - b.sort_order);
                                        setData('event_ticket_tier_id', sorted[0].id);
                                    } else {
                                        setData('event_ticket_tier_id', null);
                                    }
                                }}
                                className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-800 px-4 py-3 text-white"
                            >
                                <option value="">Etkinlik yok</option>
                                {events.map((ev) => (
                                    <option key={ev.id} value={ev.id}>
                                        {ev.title} — {eventPriceLabel(ev)}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                    {needsTier && (
                        <div>
                            <label className="block text-sm font-medium text-zinc-400">Bilet kategorisi</label>
                            <p className="mt-1 text-xs text-zinc-500">Etkinlikte farklı fiyatlı koltuk / ayakta alanları seçin.</p>
                            <select
                                value={data.event_ticket_tier_id ?? ''}
                                onChange={(e) => setData('event_ticket_tier_id', e.target.value ? parseInt(e.target.value, 10) : null)}
                                required={needsTier}
                                className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-800 px-4 py-3 text-white"
                            >
                                {[...tierOptions]
                                    .sort((a, b) => a.sort_order - b.sort_order)
                                    .map((t) => (
                                        <option key={t.id} value={t.id}>
                                            {t.name}
                                            {t.description ? ` (${t.description})` : ''} — {parseFloat(t.price)} ₺
                                        </option>
                                    ))}
                            </select>
                            {errors.event_ticket_tier_id && (
                                <p className="mt-1 text-sm text-red-400">{errors.event_ticket_tier_id}</p>
                            )}
                        </div>
                    )}
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label className="block text-sm font-medium text-zinc-400">Kaç kişisiniz? *</label>
                            <input
                                type="number"
                                min={1}
                                max={50}
                                value={data.guest_count}
                                onChange={(e) => setData('guest_count', parseInt(e.target.value, 10) || 1)}
                                className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-800 px-4 py-3 text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-400">Adet (bilet için)</label>
                            <input
                                type="number"
                                min={1}
                                max={20}
                                value={data.quantity}
                                onChange={(e) => setData('quantity', parseInt(e.target.value, 10) || 1)}
                                className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-800 px-4 py-3 text-white"
                            />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="res_notes" className="block text-sm font-medium text-zinc-400">
                            Mesajınız (isteğe bağlı)
                        </label>
                        <textarea
                            id="res_notes"
                            value={data.notes}
                            onChange={(e) => setData('notes', e.target.value)}
                            rows={3}
                            maxLength={500}
                            placeholder="Özel istek, masa tercihi vb."
                            className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-800 px-4 py-3 text-white"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={processing}
                        className="w-full rounded-xl bg-amber-500 py-3 font-semibold text-zinc-950 hover:bg-amber-400 disabled:opacity-50"
                    >
                        Gönder
                    </button>
                </form>
            </div>
        </AppLayout>
    );
}
