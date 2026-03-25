import ArtistLayout from '@/Layouts/ArtistLayout';
import SeoHead from '@/Components/SeoHead';
import { eventStatusTr } from '@/lib/statusLabels';
import { Link } from '@inertiajs/react';

interface Event {
    id: number;
    title: string;
    start_date: string | null;
    status: string;
    view_count?: number;
    public_url_segment?: string | null;
    venue: { name: string };
}

interface Props {
    events: { data: Event[] };
}

function formatInt(n: number | undefined): string {
    return (n ?? 0).toLocaleString('tr-TR');
}

export default function ArtistEventsIndex({ events }: Props) {
    return (
        <ArtistLayout>
            <SeoHead title="Etkinlikler - Sahnebul" description="Mekan paneli etkinlik listesi." noindex />

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="font-display text-2xl font-bold text-white">Etkinliklerim</h1>
                    <p className="mt-1 text-sm text-zinc-500">
                        Görüntülenme: yalnızca yayındaki etkinliğin kamu sayfası her açıldığında artar.
                    </p>
                </div>
                <Link href={route('artist.events.create')} className="rounded-xl bg-amber-500 px-6 py-2 font-medium text-zinc-950 hover:bg-amber-400">
                    + Etkinlik Ekle
                </Link>
            </div>

            <div className="mt-8 space-y-4">
                {events.data.map((ev) => (
                    <div
                        key={ev.id}
                        className="flex flex-col gap-4 rounded-xl border border-white/5 bg-zinc-900/50 p-6 sm:flex-row sm:items-center sm:justify-between"
                    >
                        <div className="min-w-0">
                            <h3 className="font-semibold text-white">{ev.title}</h3>
                            <p className="text-sm text-zinc-500">
                                {ev.venue.name} ·{' '}
                                {ev.start_date ? new Date(ev.start_date).toLocaleString('tr-TR') : 'Tarih yok'}
                            </p>
                            <p className="mt-2 text-sm tabular-nums text-amber-300/90">{formatInt(ev.view_count)} görüntülenme</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                            <span
                                className={`rounded-full px-3 py-1 text-sm ${ev.status === 'published' ? 'bg-green-500/20 text-green-400' : 'bg-zinc-500/20 text-zinc-400'}`}
                            >
                                {eventStatusTr(ev.status)}
                            </span>
                            {ev.public_url_segment ? (
                                <Link
                                    href={route('events.show', { event: ev.public_url_segment })}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-zinc-400 hover:text-amber-300"
                                >
                                    Kamu sayfası
                                </Link>
                            ) : null}
                            <Link href={route('artist.events.edit', ev.id)} className="text-sm font-medium text-amber-400 hover:text-amber-300">
                                Düzenle
                            </Link>
                        </div>
                    </div>
                ))}
            </div>
        </ArtistLayout>
    );
}
