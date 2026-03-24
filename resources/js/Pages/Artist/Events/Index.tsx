import ArtistLayout from '@/Layouts/ArtistLayout';
import SeoHead from '@/Components/SeoHead';
import { eventStatusTr } from '@/lib/statusLabels';
import { Link } from '@inertiajs/react';

interface Event {
    id: number;
    title: string;
    start_date: string;
    status: string;
    venue: { name: string };
}

interface Props {
    events: { data: Event[] };
}

export default function ArtistEventsIndex({ events }: Props) {
    return (
        <ArtistLayout>
            <SeoHead title="Etkinlikler - Sahnebul" description="Mekan paneli etkinlik listesi." noindex />

            <div className="flex items-center justify-between">
                <h1 className="font-display text-2xl font-bold text-white">Etkinliklerim</h1>
                <Link href={route('artist.events.create')} className="rounded-xl bg-amber-500 px-6 py-2 font-medium text-zinc-950 hover:bg-amber-400">
                    + Etkinlik Ekle
                </Link>
            </div>

            <div className="mt-8 space-y-4">
                {events.data.map((ev) => (
                    <div key={ev.id} className="flex items-center justify-between rounded-xl border border-white/5 bg-zinc-900/50 p-6">
                        <div>
                            <h3 className="font-semibold text-white">{ev.title}</h3>
                            <p className="text-sm text-zinc-500">{ev.venue.name} • {new Date(ev.start_date).toLocaleString('tr-TR')}</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className={`rounded-full px-3 py-1 text-sm ${ev.status === 'published' ? 'bg-green-500/20 text-green-400' : 'bg-zinc-500/20 text-zinc-400'}`}>
                                {eventStatusTr(ev.status)}
                            </span>
                            <Link href={route('artist.events.edit', ev.id)} className="text-amber-400 hover:text-amber-300">Düzenle</Link>
                        </div>
                    </div>
                ))}
            </div>
        </ArtistLayout>
    );
}
