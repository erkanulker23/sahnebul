import { cn } from '@/lib/cn';
import { eventShowParam } from '@/lib/eventShowUrl';
import axios from 'axios';
import { Link } from '@inertiajs/react';
import { Calendar, MapPin, Mic2, Search, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

type ArtistHit = { id: number; name: string; slug: string; avatar: string | null; genre: string | null };
type VenueHit = { id: number; name: string; slug: string; cover_image: string | null };
type EventHit = { id: number; slug: string; title: string; start_date: string; venue_name?: string | null };

type SearchPayload = {
    artists: ArtistHit[];
    venues: VenueHit[];
    events: EventHit[];
};

const img = (path: string | null | undefined) => {
    if (!path) return null;
    return path.startsWith('http://') || path.startsWith('https://') ? path : `/storage/${path}`;
};

export function GlobalSearch({ className }: Readonly<{ className?: string }>) {
    const [q, setQ] = useState('');
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<SearchPayload>({ artists: [], venues: [], events: [] });
    const rootRef = useRef<HTMLDivElement>(null);
    const tRef = useRef<ReturnType<typeof setTimeout>>();

    const fetchResults = useCallback(async (query: string) => {
        if (query.trim().length < 2) {
            setData({ artists: [], venues: [], events: [] });
            return;
        }
        setLoading(true);
        try {
            const res = await axios.get<SearchPayload>(route('search.quick'), { params: { q: query.trim() } });
            setData(res.data);
        } catch {
            setData({ artists: [], venues: [], events: [] });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        clearTimeout(tRef.current);
        tRef.current = setTimeout(() => {
            void fetchResults(q);
        }, 280);
        return () => clearTimeout(tRef.current);
    }, [q, fetchResults]);

    useEffect(() => {
        const onDoc = (e: MouseEvent) => {
            if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, []);

    const total = data.artists.length + data.venues.length + data.events.length;
    const showPanel = open && q.trim().length >= 2;

    return (
        <div ref={rootRef} className={cn('relative w-full min-w-0', className)}>
            <label htmlFor="global-search" className="sr-only">
                Ara
            </label>
            <div className="flex h-10 w-full min-w-0 items-center gap-2 rounded-full bg-zinc-100 px-3 ring-0 transition-[box-shadow,ring-color,background-color] focus-within:bg-white focus-within:shadow-[0_1px_2px_rgba(0,0,0,0.04)] focus-within:ring-2 focus-within:ring-amber-500/35 dark:bg-zinc-800/70 dark:focus-within:bg-zinc-800 dark:focus-within:shadow-none dark:focus-within:ring-amber-500/40">
                <Search className="pointer-events-none h-4 w-4 shrink-0 text-zinc-500 dark:text-zinc-400" aria-hidden />
                <input
                    id="global-search"
                    type="search"
                    autoComplete="off"
                    placeholder="Sanatçı, mekan veya etkinlik…"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    onFocus={() => setOpen(true)}
                    className="min-h-0 min-w-0 flex-1 appearance-none border-0 bg-transparent text-sm text-zinc-900 shadow-none placeholder:text-zinc-500 ring-0 focus:outline-none focus:ring-0 dark:text-zinc-100 dark:placeholder:text-zinc-500 [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
                />
                {q && (
                    <button
                        type="button"
                        className="shrink-0 rounded-full p-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        onClick={() => {
                            setQ('');
                            setData({ artists: [], venues: [], events: [] });
                        }}
                        aria-label="Temizle"
                    >
                        <X className="h-4 w-4" />
                    </button>
                )}
            </div>

            {showPanel && (
                <div
                    className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-[60] max-h-[min(70vh,24rem)] overflow-y-auto rounded-xl border border-zinc-200 bg-white shadow-ds-lg dark:border-zinc-700 dark:bg-zinc-900"
                    role="listbox"
                >
                    {loading && <p className="px-4 py-3 text-sm text-zinc-500">Aranıyor…</p>}
                    {!loading && total === 0 && <p className="px-4 py-3 text-sm text-zinc-500">Sonuç yok.</p>}
                    {!loading && data.artists.length > 0 && (
                        <div className="border-b border-zinc-100 py-2 dark:border-zinc-800">
                            <p className="px-4 pb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">Sanatçılar</p>
                            <ul>
                                {data.artists.map((a) => (
                                    <li key={`a-${a.id}`}>
                                        <Link
                                            href={route('artists.show', a.slug)}
                                            className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                            onClick={() => setOpen(false)}
                                        >
                                            <Mic2 className="h-4 w-4 shrink-0 text-amber-600" />
                                            <span className="min-w-0 truncate font-medium text-zinc-900 dark:text-white">{a.name}</span>
                                            {a.genre && <span className="truncate text-xs text-zinc-500">{a.genre}</span>}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    {!loading && data.venues.length > 0 && (
                        <div className="border-b border-zinc-100 py-2 dark:border-zinc-800">
                            <p className="px-4 pb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">Mekanlar</p>
                            <ul>
                                {data.venues.map((v) => (
                                    <li key={`v-${v.id}`}>
                                        <Link
                                            href={route('venues.show', v.slug)}
                                            className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                            onClick={() => setOpen(false)}
                                        >
                                            <MapPin className="h-4 w-4 shrink-0 text-rose-500" />
                                            <span className="min-w-0 truncate font-medium text-zinc-900 dark:text-white">{v.name}</span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    {!loading && data.events.length > 0 && (
                        <div className="py-2">
                            <p className="px-4 pb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">Etkinlikler</p>
                            <ul>
                                {data.events.map((ev) => (
                                    <li key={`e-${ev.id}`}>
                                        <Link
                                            href={route('events.show', eventShowParam(ev))}
                                            className="flex items-start gap-3 px-4 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                            onClick={() => setOpen(false)}
                                        >
                                            <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-violet-500" />
                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate font-medium text-zinc-900 dark:text-white">{ev.title}</span>
                                                <span className="block text-xs text-zinc-500">
                                                    {new Date(ev.start_date).toLocaleString('tr-TR')}
                                                    {ev.venue_name ? ` · ${ev.venue_name}` : ''}
                                                </span>
                                            </span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
