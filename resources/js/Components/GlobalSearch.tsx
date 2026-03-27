import { cn } from '@/lib/cn';
import { eventShowParam } from '@/lib/eventShowUrl';
import { formatTurkishDateTime } from '@/lib/formatTurkishDateTime';
import type { PageProps } from '@/types';
import axios from 'axios';
import { Link, usePage } from '@inertiajs/react';
import { Calendar, MapPin, Mic2, Search, Tag, TrendingUp, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

type ArtistHit = { id: number; name: string; slug: string; avatar: string | null; genre: string | null };
type VenueHit = { id: number; name: string; slug: string; cover_image: string | null };
type EventHit = { id: number; slug: string; title: string; start_date: string; venue_name?: string | null };

type SearchPayload = {
    artists: ArtistHit[];
    venues: VenueHit[];
    events: EventHit[];
};

type TrendingEvent = {
    id: number;
    slug: string;
    title: string;
    start_date: string | null;
    end_date: string | null;
    venue_name?: string | null;
    image?: string | null;
};

function formatTrendDateLine(start: string | null | undefined, end: string | null | undefined): string {
    if (start == null || start === '') {
        return '—';
    }
    const s = new Date(start);
    if (Number.isNaN(s.getTime())) {
        return '—';
    }
    const d1 = s.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
    if (end == null || end === '') {
        return d1;
    }
    const e = new Date(end);
    if (Number.isNaN(e.getTime())) {
        return d1;
    }
    const sameDay =
        s.getFullYear() === e.getFullYear() && s.getMonth() === e.getMonth() && s.getDate() === e.getDate();
    if (sameDay) {
        return d1;
    }
    const d2 = e.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
    return `${d1}, ${d2}`;
}

const storageUrl = (path: string | null | undefined) => {
    if (!path) {
        return null;
    }
    return path.startsWith('http://') || path.startsWith('https://') ? path : `/storage/${path}`;
};

const tagPillClass =
    'inline-flex shrink-0 items-center rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-800 transition hover:border-amber-400/60 hover:bg-amber-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:border-amber-500/50 dark:hover:bg-zinc-700/80 sm:text-sm';

export function GlobalSearch({ className }: Readonly<{ className?: string }>) {
    const page = usePage<PageProps>();
    const globalSearch = page.props.globalSearch ?? { event_type_tags: [], music_genre_tags: [] };

    const [q, setQ] = useState('');
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<SearchPayload>({ artists: [], venues: [], events: [] });
    const [trending, setTrending] = useState<TrendingEvent[]>([]);
    const [trendingLoading, setTrendingLoading] = useState(false);
    const [trendingFetched, setTrendingFetched] = useState(false);
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
        if (!open || q.trim().length >= 2 || trendingFetched) {
            return;
        }
        let cancelled = false;
        setTrendingLoading(true);
        axios
            .get<{ events: TrendingEvent[] }>(route('search.trending'), { params: { limit: 10 } })
            .then((res) => {
                if (!cancelled) {
                    setTrending(Array.isArray(res.data.events) ? res.data.events : []);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setTrending([]);
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setTrendingLoading(false);
                    setTrendingFetched(true);
                }
            });
        return () => {
            cancelled = true;
        };
    }, [open, q, trendingFetched]);

    useEffect(() => {
        const onDoc = (e: MouseEvent) => {
            if (!rootRef.current?.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, []);

    useEffect(() => {
        if (!open) {
            return;
        }
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setOpen(false);
            }
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [open]);

    const total = data.artists.length + data.venues.length + data.events.length;
    const showSearchPanel = open && q.trim().length >= 2;
    const showIdlePanel = open && q.trim().length < 2;
    const hasTagRow =
        globalSearch.event_type_tags.length > 0 || globalSearch.music_genre_tags.length > 0;

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
                    placeholder="Etkinlik, mekan, sanatçı ara…"
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

            {showIdlePanel && (
                <div
                    className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-[70] max-h-[min(85vh,32rem)] overflow-y-auto overflow-x-hidden rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.18)] dark:border-zinc-700 dark:bg-zinc-900 sm:p-5"
                    role="dialog"
                    aria-label="Öne çıkan etkinlikler ve etiketler"
                >
                    <div className="mb-5">
                        <div className="mb-3 flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                            <TrendingUp className="h-4 w-4 shrink-0" aria-hidden />
                            <span className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-white">
                                Trendler
                            </span>
                        </div>
                        {trendingLoading && (
                            <p className="py-6 text-center text-sm text-zinc-500">Yükleniyor…</p>
                        )}
                        {!trendingLoading && trending.length === 0 && (
                            <p className="rounded-xl border border-dashed border-zinc-200 py-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
                                Yaklaşan etkinlik bulunamadı. Arama kutusunu kullanarak keşfedin.
                            </p>
                        )}
                        {!trendingLoading && trending.length > 0 && (
                            <div className="-mx-1 flex gap-3 overflow-x-auto pb-2 pt-0.5">
                                {trending.map((ev) => {
                                    const href = route('events.show', eventShowParam(ev));
                                    const src = storageUrl(ev.image);
                                    return (
                                        <Link
                                            key={ev.id}
                                            href={href}
                                            onClick={() => setOpen(false)}
                                            className="group flex w-[7.25rem] shrink-0 flex-col sm:w-[8.25rem]"
                                        >
                                            <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-zinc-100 ring-1 ring-zinc-200/80 transition group-hover:ring-amber-400/50 dark:bg-zinc-800 dark:ring-zinc-700">
                                                {src ? (
                                                    <img
                                                        src={src}
                                                        alt=""
                                                        className="h-full w-full object-cover transition group-hover:scale-[1.02]"
                                                    />
                                                ) : (
                                                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-200 to-zinc-300 text-2xl dark:from-zinc-700 dark:to-zinc-800">
                                                        🎫
                                                    </div>
                                                )}
                                            </div>
                                            <p className="mt-2 line-clamp-2 text-xs font-semibold leading-snug text-zinc-900 dark:text-white sm:text-[13px]">
                                                {ev.title}
                                            </p>
                                            {ev.venue_name ? (
                                                <p className="mt-0.5 line-clamp-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                                                    {ev.venue_name}
                                                </p>
                                            ) : null}
                                            <p className="mt-0.5 text-[11px] text-zinc-400 dark:text-zinc-500">
                                                {formatTrendDateLine(ev.start_date, ev.end_date)}
                                            </p>
                                        </Link>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {hasTagRow && (
                        <div className="border-t border-zinc-100 pt-5 dark:border-zinc-800">
                            <div className="mb-3 flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                                <Tag className="h-4 w-4 shrink-0" aria-hidden />
                                <span className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-white">
                                    Etiketler
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {globalSearch.event_type_tags.map((t) => (
                                    <Link
                                        key={t.slug}
                                        href={route('events.index', { event_type: t.slug })}
                                        onClick={() => setOpen(false)}
                                        className={tagPillClass}
                                    >
                                        # {t.label}
                                    </Link>
                                ))}
                                {globalSearch.music_genre_tags.map((name) => (
                                    <Link
                                        key={name}
                                        href={route('events.index', { genre: name })}
                                        onClick={() => setOpen(false)}
                                        className={tagPillClass}
                                    >
                                        # {name}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {showSearchPanel && (
                <div
                    className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-[70] max-h-[min(70vh,24rem)] overflow-y-auto rounded-xl border border-zinc-200 bg-white shadow-ds-lg dark:border-zinc-700 dark:bg-zinc-900"
                    role="listbox"
                >
                    {loading && <p className="px-4 py-3 text-sm text-zinc-500">Aranıyor…</p>}
                    {!loading && total === 0 && <p className="px-4 py-3 text-sm text-zinc-500">Sonuç yok.</p>}
                    {!loading && data.artists.length > 0 && (
                        <div className="border-b border-zinc-100 py-2 dark:border-zinc-800">
                            <p className="px-4 pb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                Sanatçılar
                            </p>
                            <ul>
                                {data.artists.map((a) => (
                                    <li key={`a-${a.id}`}>
                                        <Link
                                            href={route('artists.show', a.slug)}
                                            className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                            onClick={() => setOpen(false)}
                                        >
                                            <Mic2 className="h-4 w-4 shrink-0 text-amber-600" />
                                            <span className="min-w-0 truncate font-medium text-zinc-900 dark:text-white">
                                                {a.name}
                                            </span>
                                            {a.genre && (
                                                <span className="truncate text-xs text-zinc-500">{a.genre}</span>
                                            )}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    {!loading && data.venues.length > 0 && (
                        <div className="border-b border-zinc-100 py-2 dark:border-zinc-800">
                            <p className="px-4 pb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                Mekanlar
                            </p>
                            <ul>
                                {data.venues.map((v) => (
                                    <li key={`v-${v.id}`}>
                                        <Link
                                            href={route('venues.show', v.slug)}
                                            className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                            onClick={() => setOpen(false)}
                                        >
                                            <MapPin className="h-4 w-4 shrink-0 text-rose-500" />
                                            <span className="min-w-0 truncate font-medium text-zinc-900 dark:text-white">
                                                {v.name}
                                            </span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    {!loading && data.events.length > 0 && (
                        <div className="py-2">
                            <p className="px-4 pb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                Etkinlikler
                            </p>
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
                                                <span className="block truncate font-medium text-zinc-900 dark:text-white">
                                                    {ev.title}
                                                </span>
                                                <span className="block text-xs text-zinc-500">
                                                    {formatTurkishDateTime(ev.start_date)}
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
