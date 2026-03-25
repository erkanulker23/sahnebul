import SeoHead from '@/Components/SeoHead';
import { formatTurkishDateTimeFromParts } from '@/lib/formatTurkishDateTime';
import AppLayout from '@/Layouts/AppLayout';
import { Link } from '@inertiajs/react';

interface Reservation {
    id: number;
    reservation_date: string;
    reservation_time: string;
    status: string;
    total_amount: number;
    venue: { name: string; slug: string };
    event: { title: string } | null;
}

interface Props {
    reservations: { data: Reservation[] };
}

export default function ReservationsIndex({ reservations }: Props) {
    const statusLabels: Record<string, string> = {
        pending: 'Onay Bekliyor',
        confirmed: 'Onaylandı',
        cancelled: 'İptal',
        completed: 'Tamamlandı',
    };

    return (
        <AppLayout>
            <SeoHead title="Rezervasyonlarım - Sahnebul" description="Masa ve etkinlik rezervasyonlarınızın durumu." noindex />

            <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
                <Link href={route('home')} className="mb-6 inline-block text-sm text-amber-400 hover:text-amber-300">
                    ← Mekanlar
                </Link>
                <h1 className="font-display mb-8 text-3xl font-bold text-white">Rezervasyonlarım</h1>

                <div>
                    {reservations.data.length === 0 ? (
                        <div className="rounded-2xl border border-white/5 bg-zinc-900/50 p-12 text-center">
                            <p className="text-5xl opacity-40">📋</p>
                            <p className="mt-4 text-zinc-400">Henüz rezervasyonunuz yok</p>
                            <Link href={route('home')} className="mt-4 inline-block text-amber-400 hover:text-amber-300">
                                Mekanları keşfet →
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {reservations.data.map((r) => (
                                <div key={r.id} className="rounded-xl border border-white/5 bg-zinc-900/50 p-6">
                                    <div className="flex flex-wrap items-start justify-between gap-4">
                                        <div>
                                            <Link href={route('venues.show', r.venue.slug)} className="font-semibold text-white hover:text-amber-400">
                                                {r.venue.name}
                                            </Link>
                                            {r.event && <p className="mt-1 text-sm text-zinc-500">{r.event.title}</p>}
                                            <p className="mt-2 text-sm text-zinc-400">{formatTurkishDateTimeFromParts(r.reservation_date, r.reservation_time)}</p>
                                        </div>
                                        <div className="text-right">
                                            <span className={`rounded-full px-3 py-1 text-sm ${
                                                r.status === 'confirmed' || r.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                                                r.status === 'pending' ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'
                                            }`}>
                                                {statusLabels[r.status] || r.status}
                                            </span>
                                            {r.total_amount > 0 && (
                                                <p className="mt-2 font-medium text-amber-400">₺{Number(r.total_amount).toLocaleString('tr-TR')}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
