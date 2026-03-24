import SeoHead from '@/Components/SeoHead';
import { eventShowParam } from '@/lib/eventShowUrl';
import { reservationStatusTr } from '@/lib/statusLabels';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Link } from '@inertiajs/react';

interface Reservation {
    id: number;
    reservation_date: string;
    reservation_time: string;
    status: string;
    total_amount: number;
    venue: { name: string; slug: string };
    event?: { title: string } | null;
}

interface Props {
    recentReservations: Reservation[];
    upcomingEvents: {
        id: number;
        slug: string;
        title: string;
        start_date: string;
        ticket_price: number | null;
        venue: { name: string; slug: string };
        artists: { id: number; name: string; slug: string; avatar: string | null }[];
    }[];
}

export default function Dashboard({ recentReservations = [], upcomingEvents = [] }: Readonly<Props>) {
    const imageSrc = (path: string | null) => {
        if (!path) return null;
        return path.startsWith('http://') || path.startsWith('https://') ? path : `/storage/${path}`;
    };

    return (
        <AuthenticatedLayout
            header={
                <h2 className="font-display text-xl font-semibold leading-tight text-white">
                    Panel
                </h2>
            }
        >
            <SeoHead title="Panel - Sahnebul" description="Rezervasyonlarınız ve yaklaşan etkinlik özetiniz." noindex />

            <div className="py-12">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="mb-8">
                        <Link href={route('reservations.index')} className="block rounded-2xl border border-white/5 bg-zinc-900/50 p-6 transition hover:border-amber-500/20">
                            <p className="text-sm text-zinc-500">Rezervasyonlarım</p>
                            <p className="mt-1 text-2xl font-bold text-amber-400">{recentReservations.length}</p>
                            <p className="mt-1 text-sm text-zinc-400">Son rezervasyonlarınızı görüntüleyin</p>
                        </Link>
                    </div>

                    <div className="mb-8">
                        <div className="rounded-2xl border border-white/5 bg-zinc-900/50">
                            <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
                                <h3 className="font-display text-lg font-bold text-white">Bu Hafta Etkinlikler</h3>
                                <Link href={route('home')} className="text-sm text-amber-400 hover:text-amber-300">Takvim →</Link>
                            </div>
                            <div className="divide-y divide-white/5">
                                {upcomingEvents.length === 0 ? (
                                    <p className="p-4 text-zinc-500">Yaklaşan etkinlik yok.</p>
                                ) : (
                                    upcomingEvents.map((e) => (
                                        <Link key={e.id} href={route('events.show', eventShowParam(e))} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-white/5">
                                            <div className="min-w-0">
                                                <p className="truncate font-medium text-white">{e.title}</p>
                                                <p className="text-sm text-zinc-500">{e.venue.name}</p>
                                                {e.artists.length > 0 && (
                                                    <div className="mt-2 flex items-center gap-1">
                                                        {e.artists.slice(0, 3).map((a) => (
                                                            <img key={a.id} src={imageSrc(a.avatar) ?? 'https://via.placeholder.com/20x20?text=%F0%9F%8E%A4'} alt={a.name} className="h-5 w-5 rounded-full object-cover" />
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="shrink-0 text-right">
                                                <p className="text-xs text-zinc-500">{new Date(e.start_date).toLocaleDateString('tr-TR')}</p>
                                                {e.ticket_price != null && <p className="text-sm text-amber-400">{e.ticket_price} ₺</p>}
                                            </div>
                                        </Link>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-white/5 bg-zinc-900/50">
                        <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
                            <h3 className="font-display text-lg font-bold text-white">Son Rezervasyonlar</h3>
                            <Link href={route('reservations.index')} className="text-sm text-amber-400 hover:text-amber-300">Tümü →</Link>
                        </div>
                        <div className="divide-y divide-white/5">
                            {recentReservations.length === 0 ? (
                                <p className="px-6 py-12 text-center text-zinc-500">Henüz rezervasyonunuz yok.</p>
                            ) : (
                                recentReservations.map((r) => (
                                    <Link key={r.id} href={route('reservations.index')} className="flex items-center justify-between px-6 py-4 transition hover:bg-white/5">
                                        <div>
                                            <p className="font-medium text-white">{r.venue.name}</p>
                                            <p className="text-sm text-zinc-500">
                                                {new Date(r.reservation_date).toLocaleDateString('tr-TR')} {r.reservation_time}
                                                {r.event && ` • ${r.event.title}`}
                                            </p>
                                        </div>
                                        <span className={`rounded-full px-3 py-1 text-sm ${
                                            r.status === 'confirmed' || r.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                                            r.status === 'pending' ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'
                                        }`}>
                                            {reservationStatusTr(r.status)}
                                        </span>
                                    </Link>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="mt-8 rounded-2xl border border-white/5 bg-zinc-900/50 p-8">
                        <p className="mb-4 text-white">Sahnebul'da neler yapabilirsiniz:</p>
                        <ul className="list-disc space-y-2 pl-6 text-zinc-400">
                            <li><Link href={route('venues.index')} className="text-amber-400 hover:text-amber-300">Mekanları keşfedin</Link></li>
                            <li>Rezervasyon yapın</li>
                            <li>Değerlendirme ve yorum bırakın</li>
                        </ul>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
