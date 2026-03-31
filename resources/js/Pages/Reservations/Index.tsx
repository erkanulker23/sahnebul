import SeoHead from '@/Components/SeoHead';
import { formatTurkishDateTimeFromParts } from '@/lib/formatTurkishDateTime';
import UserPanelLayout from '@/Layouts/UserPanelLayout';
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
        <UserPanelLayout>
            <SeoHead title="Rezervasyonlarım - Sahnebul" description="Masa ve etkinlik rezervasyonlarınızın durumu." noindex />

            <div className="mx-auto max-w-3xl pb-8">
                <h1 className="font-display text-2xl font-bold text-zinc-900 dark:text-white lg:text-3xl">Rezervasyonlarım</h1>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Masa ve etkinlik rezervasyonlarınız</p>

                <div className="mt-8">
                    {reservations.data.length === 0 ? (
                        <div className="rounded-2xl border border-zinc-200 bg-white p-12 text-center shadow-sm dark:border-white/10 dark:bg-zinc-900/40 dark:shadow-none">
                            <p className="text-5xl opacity-40">📋</p>
                            <p className="mt-4 text-zinc-600 dark:text-zinc-400">Henüz rezervasyonunuz yok</p>
                            <Link href={route('home')} className="mt-4 inline-block text-amber-700 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300">
                                Mekanları keşfet →
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {reservations.data.map((r) => (
                                <div key={r.id} className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-900/40 dark:shadow-none">
                                    <div className="flex flex-wrap items-start justify-between gap-4">
                                        <div>
                                            <Link
                                                href={route('venues.show', r.venue.slug)}
                                                className="font-semibold text-zinc-900 hover:text-amber-700 dark:text-white dark:hover:text-amber-400"
                                            >
                                                {r.venue.name}
                                            </Link>
                                            {r.event && <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-500">{r.event.title}</p>}
                                            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                                                {formatTurkishDateTimeFromParts(r.reservation_date, r.reservation_time)}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <span
                                                className={`rounded-full px-3 py-1 text-sm ${
                                                    r.status === 'confirmed' || r.status === 'completed'
                                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-green-500/20 dark:text-green-400'
                                                        : r.status === 'pending'
                                                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400'
                                                          : 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-400'
                                                }`}
                                            >
                                                {statusLabels[r.status] || r.status}
                                            </span>
                                            {r.total_amount > 0 && (
                                                <p className="mt-2 font-medium text-amber-700 dark:text-amber-400">
                                                    ₺{Number(r.total_amount).toLocaleString('tr-TR')}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </UserPanelLayout>
    );
}
