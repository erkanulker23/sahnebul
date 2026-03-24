import VerifiedArtistProfileBadge from '@/Components/VerifiedArtistProfileBadge';
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
    return d.toLocaleString('tr-TR', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function formatWeekCaption(startIso: string, endIso: string): string {
    const s = new Date(startIso);
    const e = new Date(endIso);
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return '';
    const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' };
    return `${s.toLocaleDateString('tr-TR', opts)} – ${e.toLocaleDateString('tr-TR', { ...opts, year: 'numeric' })}`;
}

export default function ArtistsWeekSlider({ artists, weekRange, imageSrc }: Readonly<Props>) {
    const scrollerRef = useRef<HTMLDivElement>(null);

    const scrollByDir = useCallback((dir: -1 | 1) => {
        const el = scrollerRef.current;
        if (!el) return;
        const delta = Math.round(el.clientWidth * 0.85) * dir;
        el.scrollBy({ left: delta, behavior: 'smooth' });
    }, []);

    if (artists.length === 0) {
        return null;
    }

    const caption = formatWeekCaption(weekRange.start, weekRange.end);

    return (
        <section className="relative border-y border-zinc-200/80 bg-gradient-to-b from-amber-500/[0.06] via-white to-zinc-50 py-10 dark:border-white/[0.06] dark:from-amber-500/[0.08] dark:via-[#0f0f12] dark:to-[#0a0a0b]">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
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
                        className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 pt-1 scroll-smooth sm:mx-0 sm:px-0"
                        style={{ scrollbarGutter: 'stable' }}
                    >
                        {artists.map((artist) => {
                            const showLine = formatShowTime(artist.week_first_show);
                            return (
                                <Link
                                    key={artist.id}
                                    href={route('artists.show', artist.slug)}
                                    className="group relative w-[min(100%,260px)] shrink-0 snap-start overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-md transition hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-lg dark:border-white/[0.08] dark:bg-zinc-900/80 dark:hover:border-amber-500/30"
                                >
                                    <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-900">
                                        {artist.avatar ? (
                                            <img
                                                src={imageSrc(artist.avatar) ?? ''}
                                                alt=""
                                                loading="lazy"
                                                decoding="async"
                                                className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                                            />
                                        ) : (
                                            <div className="flex h-full items-center justify-center bg-gradient-to-br from-amber-900/35 via-zinc-800 to-zinc-900">
                                                <span className="font-display text-4xl font-bold text-amber-400/90" aria-hidden>
                                                    {initialsFromName(artist.name)}
                                                </span>
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
                                        {showLine && (
                                            <div className="absolute bottom-2 left-2 right-2">
                                                <span className="inline-flex rounded-lg bg-emerald-600/95 px-2 py-1 text-[11px] font-semibold text-white shadow-sm backdrop-blur-sm">
                                                    {showLine}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-4">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h3 className="font-display text-base font-bold text-zinc-900 group-hover:text-amber-700 dark:text-white dark:group-hover:text-amber-400">
                                                {artist.name}
                                            </h3>
                                            {artist.is_verified_profile && <VerifiedArtistProfileBadge />}
                                        </div>
                                        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{artist.genre ?? 'Sanatçı'}</p>
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
