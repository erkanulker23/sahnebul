import { CatalogNewBadge } from '@/Components/CatalogNewBadge';
import EventRelativeDayPill from '@/Components/EventRelativeDayPill';
import { cn } from '@/lib/cn';
import { eventRelativeDayKind } from '@/lib/eventRelativeDay';
import { pickEventListingThumbPath } from '@/lib/eventPublicImage';
import { eventShowParam } from '@/lib/eventShowUrl';
import { formatTurkishDateTime, SAHNE_EVENT_DISPLAY_TZ } from '@/lib/formatTurkishDateTime';
import type { PageProps } from '@/types';
import axios from 'axios';
import { Link, usePage } from '@inertiajs/react';
import { Calendar, MapPin, Mic2, Search, Tag, TrendingUp, X } from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

type ArtistHit = {
    id: number;
    name: string;
    slug: string;
    avatar: string | null;
    genre: string | null;
    is_new_on_platform?: boolean;
};
type VenueHit = { id: number; name: string; slug: string; cover_image: string | null; is_new_on_platform?: boolean };
type EventHit = {
    id: number;
    slug: string;
    title: string;
    start_date: string;
    end_date?: string | null;
    venue_name?: string | null;
    /** listing_image veya cover_image */
    image?: string | null;
};

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

function istanbulYmd(d: Date): string {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: SAHNE_EVENT_DISPLAY_TZ,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(d);
}

function formatTrendDateLine(start: string | null | undefined, end: string | null | undefined): string {
    if (start == null || start === '') {
        return '—';
    }
    const s = new Date(start);
    if (Number.isNaN(s.getTime())) {
        return '—';
    }
    const d1 = formatTurkishDateTime(s, { withTime: false, timeZone: SAHNE_EVENT_DISPLAY_TZ });
    if (end == null || end === '') {
        return d1;
    }
    const e = new Date(end);
    if (Number.isNaN(e.getTime())) {
        return d1;
    }
    const sameDay = istanbulYmd(s) === istanbulYmd(e);
    if (sameDay) {
        return d1;
    }
    const d2 = formatTurkishDateTime(e, { withTime: false, timeZone: SAHNE_EVENT_DISPLAY_TZ });
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

const quickThumbClass =
    'relative h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-zinc-100 ring-1 ring-zinc-200/80 dark:bg-zinc-800 dark:ring-white/10';

function QuickSearchThumb({
    src,
    fallback,
    className,
}: Readonly<{ src: string | null | undefined; fallback: ReactNode; className?: string }>) {
    const url = storageUrl(src ?? null);
    if (url) {
        return (
            <span className={cn(quickThumbClass, className)}>
                <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
            </span>
        );
    }
    return (
        <span
            className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100 ring-1 ring-zinc-200/60 dark:bg-zinc-800 dark:ring-white/10',
                className,
            )}
        >
            {fallback}
        </span>
    );
}

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
    const panelSurfaceRef = useRef<HTMLDivElement>(null);
    const tRef = useRef<ReturnType<typeof setTimeout>>();
    const [panelBox, setPanelBox] = useState<{ top: number; left: number; width: number } | null>(null);

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

    useLayoutEffect(() => {
        if (!open) {
            setPanelBox(null);
            return;
        }
        const measure = () => {
            const el = rootRef.current;
            if (!el) {
                return;
            }
            const r = el.getBoundingClientRect();
            const narrow = globalThis.matchMedia('(max-width: 1023px)').matches;
            const pad = 12;
            const w = globalThis;
            const vv = w.visualViewport;
            if (narrow) {
                const layoutW = vv?.width ?? w.innerWidth;
                const vLeft = vv?.offsetLeft ?? 0;
                const width = Math.max(200, layoutW - pad * 2);
                setPanelBox({
                    top: r.bottom + 6,
                    left: vLeft + pad,
                    width,
                });
            } else {
                const vw = w.innerWidth;
                /** Üst bardaki arama kutusu flex yüzünden dar kalabiliyor; panel en az okunaklı genişlikte olmalı. */
                const maxPanel = Math.min(672, vw - pad * 2);
                const minPanel = Math.min(400, maxPanel);
                const width = Math.min(maxPanel, Math.max(minPanel, r.width));
                let left = r.left + (r.width - width) / 2;
                left = Math.max(pad, Math.min(left, vw - pad - width));
                setPanelBox({
                    top: r.bottom + 6,
                    left,
                    width,
                });
            }
        };
        measure();
        const w = globalThis;
        w.addEventListener('resize', measure);
        w.addEventListener('scroll', measure, true);
        const vv = w.visualViewport;
        if (vv) {
            vv.addEventListener('resize', measure);
            vv.addEventListener('scroll', measure);
        }
        return () => {
            w.removeEventListener('resize', measure);
            w.removeEventListener('scroll', measure, true);
            if (vv) {
                vv.removeEventListener('resize', measure);
                vv.removeEventListener('scroll', measure);
            }
        };
    }, [open, q, loading, data.artists.length, data.venues.length, data.events.length, trending.length, trendingLoading]);

    /** Mobil klavye / viewport kaydırmasında arka planın oynayıp düzeni kaydırmasını önler */
    useEffect(() => {
        if (!open || typeof document === 'undefined') {
            return;
        }
        const narrow = globalThis.matchMedia('(max-width: 1023px)').matches;
        if (!narrow) {
            return;
        }
        const y = window.scrollY;
        const { style } = document.body;
        const prev = {
            position: style.position,
            top: style.top,
            left: style.left,
            right: style.right,
            width: style.width,
            overflow: style.overflow,
        };
        style.position = 'fixed';
        style.top = `-${y}px`;
        style.left = '0';
        style.right = '0';
        style.width = '100%';
        style.overflow = 'hidden';
        return () => {
            style.position = prev.position;
            style.top = prev.top;
            style.left = prev.left;
            style.right = prev.right;
            style.width = prev.width;
            style.overflow = prev.overflow;
            window.scrollTo(0, y);
        };
    }, [open]);

    useEffect(() => {
        const onDoc = (e: MouseEvent) => {
            const t = e.target as Node;
            if (rootRef.current?.contains(t) || panelSurfaceRef.current?.contains(t)) {
                return;
            }
            setOpen(false);
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

    const viewportH =
        typeof globalThis.window !== 'undefined'
            ? globalThis.window.visualViewport?.height ?? globalThis.window.innerHeight
            : 600;
    const panelMaxHeight =
        panelBox !== null
            ? Math.max(
                  168,
                  Math.min(
                      viewportH - panelBox.top - 16,
                      showSearchPanel ? 340 : 460,
                  ),
              )
            : undefined;

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
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
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

            {open &&
                panelBox &&
                typeof document !== 'undefined' &&
                (showIdlePanel || showSearchPanel) &&
                createPortal(
                    <div
                        ref={panelSurfaceRef}
                        style={{
                            position: 'fixed',
                            top: panelBox.top,
                            left: panelBox.left,
                            width: panelBox.width,
                            maxWidth: 'calc(100vw - 24px)',
                            boxSizing: 'border-box',
                            zIndex: 130,
                            maxHeight: panelMaxHeight,
                            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
                            touchAction: 'pan-y',
                        }}
                        className={cn(
                            'overflow-y-auto overflow-x-hidden overscroll-contain rounded-2xl border border-zinc-200/90 bg-white shadow-[0_16px_48px_-12px_rgba(0,0,0,0.22)] dark:border-zinc-700 dark:bg-zinc-900',
                            showSearchPanel && 'rounded-xl shadow-ds-lg',
                        )}
                    >
                        {showIdlePanel ? (
                            <div className="p-4 sm:p-5" role="dialog" aria-label="Öne çıkan etkinlikler ve etiketler">
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
                                        <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-pb-2 scroll-pl-1 scroll-pr-3 pb-2 pt-0.5 [-webkit-overflow-scrolling:touch]">
                                            {trending.map((ev) => {
                                                const href = route('events.show', eventShowParam(ev));
                                                const raw = pickEventListingThumbPath(ev.image, null);
                                                const src = raw ? storageUrl(raw) : null;
                                                return (
                                                    <Link
                                                        key={ev.id}
                                                        href={href}
                                                        onClick={() => setOpen(false)}
                                                        className="group flex w-[6.5rem] shrink-0 snap-start flex-col sm:w-[7.5rem] lg:w-[8.25rem]"
                                                    >
                                                        <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-zinc-100 ring-1 ring-zinc-200/80 transition group-hover:ring-amber-400/50 dark:bg-zinc-800 dark:ring-zinc-700">
                                                            {ev.start_date && eventRelativeDayKind(ev.start_date, ev.end_date) ? (
                                                                <div className="pointer-events-none absolute left-1 top-1 z-[2] sm:left-1.5 sm:top-1.5">
                                                                    <EventRelativeDayPill
                                                                        startDate={ev.start_date}
                                                                        endDate={ev.end_date}
                                                                        placement="overlay"
                                                                    />
                                                                </div>
                                                            ) : null}
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
                                                        <p className="mt-2 line-clamp-2 text-[11px] font-semibold leading-snug text-zinc-900 dark:text-white sm:text-xs">
                                                            {ev.title}
                                                        </p>
                                                        {ev.venue_name ? (
                                                            <p className="mt-0.5 line-clamp-1 text-[10px] text-zinc-500 dark:text-zinc-400 sm:text-[11px]">
                                                                {ev.venue_name}
                                                            </p>
                                                        ) : null}
                                                        <p className="mt-0.5 text-[10px] text-zinc-400 dark:text-zinc-500 sm:text-[11px]">
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
                        ) : null}

                        {showSearchPanel ? (
                            <div role="listbox">
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
                                                        className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                                        onClick={() => setOpen(false)}
                                                    >
                                                        <QuickSearchThumb
                                                            src={a.avatar}
                                                            fallback={<Mic2 className="h-4 w-4 text-amber-600" aria-hidden />}
                                                        />
                                                        <span className="min-w-0 flex-1">
                                                            <span className="flex min-w-0 items-center gap-2">
                                                                <span className="truncate font-medium text-zinc-900 dark:text-white">{a.name}</span>
                                                                {a.is_new_on_platform ? <CatalogNewBadge className="!text-[8px] sm:!text-[9px]" /> : null}
                                                            </span>
                                                            {a.genre ? (
                                                                <span className="block truncate text-xs text-zinc-500">{a.genre}</span>
                                                            ) : null}
                                                        </span>
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
                                                        className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                                        onClick={() => setOpen(false)}
                                                    >
                                                        <QuickSearchThumb
                                                            src={v.cover_image}
                                                            fallback={<MapPin className="h-4 w-4 text-rose-500" aria-hidden />}
                                                        />
                                                        <span className="flex min-w-0 flex-1 items-center gap-2">
                                                            <span className="truncate font-medium text-zinc-900 dark:text-white">{v.name}</span>
                                                            {v.is_new_on_platform ? <CatalogNewBadge className="!text-[8px] sm:!text-[9px]" /> : null}
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
                                                        className="flex items-start gap-3 px-4 py-2.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                                        onClick={() => setOpen(false)}
                                                    >
                                                        <QuickSearchThumb
                                                            src={pickEventListingThumbPath(ev.image, null)}
                                                            fallback={<Calendar className="h-4 w-4 text-violet-500" aria-hidden />}
                                                            className="mt-0.5"
                                                        />
                                                        <span className="min-w-0 flex-1">
                                                            <span className="block truncate font-medium text-zinc-900 dark:text-white">
                                                                {ev.title}
                                                            </span>
                                                            <span className="flex flex-wrap items-center gap-1.5 text-xs text-zinc-500">
                                                                <EventRelativeDayPill
                                                                    startDate={ev.start_date}
                                                                    endDate={ev.end_date}
                                                                    placement="compactLight"
                                                                />
                                                                <span>
                                                                    {formatTurkishDateTime(ev.start_date)}
                                                                    {ev.venue_name ? ` · ${ev.venue_name}` : ''}
                                                                </span>
                                                            </span>
                                                        </span>
                                                    </Link>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        ) : null}
                    </div>,
                    document.body,
                )}
        </div>
    );
}
