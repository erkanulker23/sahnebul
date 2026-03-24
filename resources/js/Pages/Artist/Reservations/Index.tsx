import ArtistLayout from '@/Layouts/ArtistLayout';
import SeoHead from '@/Components/SeoHead';
import { reservationStatusTr } from '@/lib/statusLabels';
import { router } from '@inertiajs/react';

interface Reservation {
    id: number;
    reservation_date: string;
    reservation_time: string;
    status: string;
    total_amount: number;
    user: { name: string };
    venue: { name: string };
}

interface Props {
    reservations: { data: Reservation[] };
    stats: { pending: number; confirmed: number };
}

export default function ArtistReservationsIndex({ reservations, stats }: Props) {
    const updateStatus = (id: number, status: string) => {
        router.patch(route('artist.reservations.updateStatus', id), { status });
    };

    return (
        <ArtistLayout>
            <SeoHead title="Rezervasyonlar - Sahnebul" description="Mekanınıza gelen rezervasyon talepleri." noindex />

            <div className="mb-8 flex gap-4">
                <div className="rounded-xl border border-white/5 bg-zinc-900/50 px-6 py-4">
                    <p className="text-sm text-zinc-500">Bekleyen</p>
                    <p className="text-xl font-bold text-amber-400">{stats.pending}</p>
                </div>
                <div className="rounded-xl border border-white/5 bg-zinc-900/50 px-6 py-4">
                    <p className="text-sm text-zinc-500">Onaylı</p>
                    <p className="text-xl font-bold text-green-400">{stats.confirmed}</p>
                </div>
            </div>

            <div className="space-y-4">
                {reservations.data.map((r) => (
                    <div key={r.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/5 bg-zinc-900/50 p-6">
                        <div>
                            <p className="font-semibold text-white">{r.user.name}</p>
                            <p className="text-sm text-zinc-500">{r.venue.name}</p>
                            <p className="mt-1 text-zinc-400">{r.reservation_date} {r.reservation_time} • ₺{Number(r.total_amount).toLocaleString('tr-TR')}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            {r.status === 'pending' && (
                                <>
                                    <button onClick={() => updateStatus(r.id, 'confirmed')} className="rounded-lg bg-green-500/20 px-4 py-2 text-sm text-green-400 hover:bg-green-500/30">Onayla</button>
                                    <button onClick={() => updateStatus(r.id, 'cancelled')} className="rounded-lg bg-red-500/20 px-4 py-2 text-sm text-red-400 hover:bg-red-500/30">İptal</button>
                                </>
                            )}
                            <span className={`rounded-full px-3 py-1 text-sm ${
                                r.status === 'confirmed' || r.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                                r.status === 'pending' ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'
                            }`}>{reservationStatusTr(r.status)}</span>
                        </div>
                    </div>
                ))}
            </div>
        </ArtistLayout>
    );
}
