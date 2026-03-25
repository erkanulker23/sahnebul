import SeoHead from '@/Components/SeoHead';
import { eventShowParam } from '@/lib/eventShowUrl';
import { formatTurkishDateTime, formatTurkishDateTimeFromParts } from '@/lib/formatTurkishDateTime';
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

interface FavoriteArtistRow {
    id: number;
    name: string;
    slug: string;
    avatar: string | null;
}

interface ReminderEventRow {
    id: number;
    slug: string;
    title: string;
    start_date: string;
    venue: { name: string; slug: string };
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
    favoriteArtists?: FavoriteArtistRow[];
    reminderEvents?: ReminderEventRow[];
}

export default function Dashboard({
    recentReservations = [],
    upcomingEvents = [],
    favoriteArtists = [],
    reminderEvents = [],
}: Readonly<Props>) {
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
            <SeoHead title="Kullanıcı paneli - Sahnebul" description="Favori sanatçılar, etkinlik hatırlatmaları ve rezervasyonlar." noindex />

            <div className="py-12">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="mb-8 grid gap-4 sm:grid-cols-2">
                        <div className="rounded-2xl border border-white/5 bg-zinc-900/50 p-6">
                            <h3 className="font-display text-lg font-bold text-white">Favori sanatçılar</h3>
                            <p className="mt-1 text-sm text-zinc-500">Profillerden ♥ ile ekleyin.</p>
                            {favoriteArtists.length === 0 ? (
                                <p className="mt-4 text-sm text-zinc-500">Henüz favori yok.</p>
                            ) : (
                                <ul className="mt-4 space-y-2">
                                    {favoriteArtists.map((a) => (
                                        <li key={a.id}>
                                            <Link
                                                href={route('artists.show', a.slug)}
                                                className="flex items-center gap-2 text-sm text-amber-400 hover:text-amber-300"
                                            >
                                                {imageSrc(a.avatar) ? (
                                                    <img src={imageSrc(a.avatar)!} alt="" className="h-8 w-8 rounded-full object-cover" />
                                                ) : null}
                                                <span>{a.name}</span>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                        <div className="rounded-2xl border border-white/5 bg-zinc-900/50 p-6">
                            <h3 className="font-display text-lg font-bold text-white">Takvim ve hatırlatmalar</h3>
                            <p className="mt-1 text-sm text-zinc-500">Etkinlik sayfasından e-posta hatırlatıcı açın; yarın sabah özet e-postası gider.</p>
                            {reminderEvents.length === 0 ? (
                                <p className="mt-4 text-sm text-zinc-500">Kayıtlı hatırlatma yok.</p>
                            ) : (
                                <ul className="mt-4 space-y-2">
                                    {reminderEvents.map((e) => (
                                        <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                                            <Link
                                                href={route('events.show', eventShowParam(e))}
                                                className="font-medium text-white hover:text-amber-400"
                                            >
                                                {e.title}
                                            </Link>
                                            <a
                                                href={route('user.events.ics', e.id)}
                                                className="text-amber-400 hover:text-amber-300"
                                            >
                                                .ics
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>

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
                                                <p className="text-xs text-zinc-500">{formatTurkishDateTime(e.start_date)}</p>
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
                                                {formatTurkishDateTimeFromParts(r.reservation_date, r.reservation_time)}
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
                            <li><Link href={route('artists.index')} className="text-amber-400 hover:text-amber-300">Sanatçıları keşfedin</Link> ve favorileyin</li>
                            <li>Etkinliklere hatırlatıcı ekleyin; .ics ile takviminize alın</li>
                            <li>Rezervasyon yapın</li>
                            <li>Değerlendirme ve yorum bırakın</li>
                        </ul>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
