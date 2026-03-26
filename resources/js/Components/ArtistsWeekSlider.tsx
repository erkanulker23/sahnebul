import VerifiedArtistProfileBadge from '@/Components/VerifiedArtistProfileBadge';
import { formatTurkishDateTime } from '@/lib/formatTurkishDateTime';
import { Link } from '@inertiajs/react';
import { useCallback, useRef } from 'react';

export type WeekSliderArtist = {
    id: number;
    name: string;
    slug: string;
    avatar: string | null;
    genre: string | null;
    is_verified_profile?: boolean;
    week_first_show: string | null;
    week_events_count?: number;
};

interface Props {
    artists: WeekSliderArtist[];
    weekRange: { start: string; end: string };
    imageSrc: (path: string | null) => string | null;
}

function initialsFromName(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    const a = parts[0][0] ?? '';
    const b = parts.at(-1)?.[0] ?? '';
    return (a + b).toUpperCase();
}

function formatShowTime(iso: string | null): string | null {
    if (!iso) return null;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return formatTurkishDateTime(d);
}

function formatWeekCaption(startIso: string, endIso: string): string {
    const s = new Date(startIso);
    const e = new Date(endIso);
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return '';
    return `${formatTurkishDateTime(s, { withTime: false })} – ${formatTurkishDateTime(e, { withTime: false })}`;
}

function IconTicket({ className }: Readonly<{ className?: string }>) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2M15 11v2M15 17v2M5 5h14a2 2 0 012 2v3a2 2 0 100 4v3a2 2 0 01-2 2H5a2 2 0 01-2-2v-3a2 2 0 100-4V7a2 2 0 012-2z" />
        </svg>
    );
}

function IconCalendar({ className }: Readonly<{ className?: string }>) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5a2.25 2.25 0 002.25-2.25m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5a2.25 2.25 0 012.25 2.25v7.5" />
        </svg>
    );
}

const cardShellClass =
    'group flex h-full flex-col overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-amber-400/40 hover:shadow-lg hover:shadow-amber-500/5 dark:border-white/[0.08] dark:bg-zinc-900/50 dark:hover:border-amber-500/35';

export default function ArtistsWeekSlider({ artists, weekRange, imageSrc }: Readonly<Props>) {
    const scrollerRef = useRef<HTMLDivElement>(null);

    const scrollByDir = useCallback((dir: -1 | 1) => {
        const el = scrollerRef.current;
        if (!el) return;
        const firstCard = el.querySelector<HTMLElement>('a');
        const step = firstCard ? firstCard.offsetWidth + 12 : Math.round(el.clientWidth * 0.5);
        el.scrollBy({ left: step * dir, behavior: 'smooth' });
    }, []);

    if (artists.length === 0) {
        return null;
    }

    const caption = formatWeekCaption(weekRange.start, weekRange.end);

    return (
        <section className="relative border-y border-zinc-200/80 bg-gradient-to-b from-amber-500/[0.06] via-white to-zinc-50 py-10 dark:border-white/[0.06] dark:from-amber-500/[0.08] dark:via-[#0f0f12] dark:to-[#0a0a0b]">
            <div className="mx-auto max-w-7xl px-0 sm:px-4 lg:px-8">
                <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400/90">Bu hafta sahnede</p>
                        <h2 className="font-display mt-1 text-2xl font-bold text-zinc-900 dark:text-white sm:text-3xl">
                            Yaklaşan etkinlikleri olan sanatçılar
                        </h2>
                        {caption && <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{caption}</p>}
                    </div>
                    <div className="hidden gap-2 sm:flex">
                        <button
                            type="button"
                            onClick={() => scrollByDir(-1)}
                            className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 shadow-sm hover:border-amber-400 hover:text-amber-800 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-amber-500/40"
                            aria-label="Önceki sanatçılar"
                        >
                            ←
                        </button>
                        <button
                            type="button"
                            onClick={() => scrollByDir(1)}
                            className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 shadow-sm hover:border-amber-400 hover:text-amber-800 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-amber-500/40"
                            aria-label="Sonraki sanatçılar"
                        >
                            →
                        </button>
                    </div>
                </div>

                <div className="relative">
                    <div
                        ref={scrollerRef}
                        className="scrollbar-hide -mx-2.5 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth px-2.5 pb-2 pt-1 [-ms-overflow-style:none] [scroll-padding-inline:0.625rem] [scrollbar-width:none] sm:mx-0 sm:gap-4 sm:px-0 sm:[scroll-padding-inline:0] [&::-webkit-scrollbar]:hidden"
                    >
                        {artists.map((artist) => {
                            const showLine = formatShowTime(artist.week_first_show);
                            const n = artist.week_events_count ?? 0;
                            return (
                                <Link
                                    key={artist.id}
                                    href={route('artists.show', artist.slug)}
                                    className={`${cardShellClass} min-w-0 shrink-0 snap-start sm:w-[min(100%,260px)] max-sm:flex-[0_0_calc(50%-0.375rem)]`}
                                >
                                    <div className="relative aspect-[4/3] shrink-0 overflow-hidden bg-zinc-100 dark:bg-zinc-800/80">
                                        {artist.avatar ? (
                                            <img
                                                src={imageSrc(artist.avatar) ?? ''}
                                                alt=""
                                                loading="lazy"
                                                decoding="async"
                                                className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                                            />
                                        ) : (
                                            <div className="flex h-full items-center justify-center bg-gradient-to-br from-zinc-200 via-zinc-100 to-amber-100/40 dark:from-zinc-800 dark:via-zinc-900 dark:to-zinc-950">
                                                <span className="font-display text-4xl font-bold text-amber-400/90" aria-hidden>
                                                    {initialsFromName(artist.name)}
                                                </span>
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent opacity-80 transition group-hover:opacity-100" />
                                        {n > 0 ? (
                                            <div className="pointer-events-none absolute left-1.5 top-1.5 z-[2] max-w-[calc(100%-5.5rem)] sm:left-3 sm:top-3">
                                                <span
                                                    className="inline-flex max-w-full items-center gap-1 rounded-lg bg-gradient-to-r from-violet-600 via-fuchsia-600 to-rose-500 px-2 py-1 text-[9px] font-bold leading-tight text-white shadow-lg shadow-fuchsia-900/25 ring-1 ring-white/25 sm:gap-1.5 sm:rounded-xl sm:px-2.5 sm:py-1.5 sm:text-[10px]"
                                                    aria-label={`Bu hafta ${n} etkinlik`}
                                                >
                                                    <IconTicket className="h-3 w-3 shrink-0 opacity-95 sm:h-3.5 sm:w-3.5" />
                                                    <span className="min-w-0 truncate">
                                                        {n} etkinlik
                                                    </span>
                                                </span>
                                            </div>
                                        ) : null}
                                        {showLine ? (
                                            <div className="absolute right-1.5 top-1.5 z-[2] max-w-[min(100%,11.5rem)] rounded-lg bg-gradient-to-br from-white/90 via-amber-50/95 to-amber-100/90 px-2 py-1 shadow-lg shadow-amber-900/10 ring-1 ring-amber-200/80 backdrop-blur-md dark:from-zinc-900/90 dark:via-zinc-900/85 dark:to-amber-950/40 dark:ring-amber-500/20 sm:right-3 sm:top-3 sm:rounded-xl sm:px-2.5 sm:py-1.5">
                                                <p className="flex items-start gap-1.5 text-left text-[9px] font-semibold leading-tight text-zinc-900 dark:text-amber-50 sm:gap-2 sm:text-[11px] sm:leading-snug">
                                                    <IconCalendar className="mt-0.5 h-3 w-3 shrink-0 text-amber-600 dark:text-amber-400 sm:h-3.5 sm:w-3.5" />
                                                    <span className="min-w-0">{showLine}</span>
                                                </p>
                                            </div>
                                        ) : null}
                                    </div>
                                    <div className="flex min-h-0 flex-1 flex-col p-2.5 pt-2 sm:p-4 sm:pt-3.5">
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            <h3 className="font-display text-xs font-bold leading-snug tracking-tight text-zinc-900 dark:text-white sm:text-lg">
                                                <span className="line-clamp-2">{artist.name}</span>
                                            </h3>
                                            {artist.is_verified_profile ? <VerifiedArtistProfileBadge /> : null}
                                        </div>
                                        <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-zinc-600 dark:text-zinc-400 sm:mt-2 sm:text-sm">
                                            {artist.genre ?? 'Sanatçı'}
                                        </p>
                                        <p className="mt-0.5 truncate text-[10px] font-medium text-amber-700/90 dark:text-amber-400/90 sm:mt-1 sm:text-xs">
                                            Bu hafta sahnede
                                        </p>
                                        <span className="mt-auto inline-flex items-center gap-1 pt-2 text-[11px] font-semibold text-amber-600 transition group-hover:gap-2 dark:text-amber-400 sm:gap-1.5 sm:pt-4 sm:text-sm">
                                            Detaylar
                                            <svg className="h-3 w-3 shrink-0 sm:h-4 sm:w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                                            </svg>
                                        </span>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </div>
        </section>
    );
}
