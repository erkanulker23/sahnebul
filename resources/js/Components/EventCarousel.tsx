import { eventShowParam } from '@/lib/eventShowUrl';
import { Link } from '@inertiajs/react';
import { useCallback, useRef } from 'react';

export interface CarouselEvent {
    id: number;
    slug: string;
    title: string;
    start_date: string;
    venue: {
        id: number;
        name: string;
        slug: string;
        category?: { name: string } | null;
    };
    artists: { id: number; name: string; slug: string }[];
    cover_image?: string | null;
    listing_image?: string | null;
}

function imageSrc(path: string | null | undefined): string | null {
    if (!path) return null;
    return path.startsWith('http://') || path.startsWith('https://') ? path : `/storage/${path}`;
}

function IconBuilding({ className }: Readonly<{ className?: string }>) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
            />
        </svg>
    );
}

function IconCalendar({ className }: Readonly<{ className?: string }>) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
        </svg>
    );
}

export default function EventCarousel({
    title,
    subtitle,
    events,
    emptyMessage,
    accent = 'amber',
}: Readonly<{
    title: string;
    subtitle?: string;
    events: CarouselEvent[];
    emptyMessage: string;
    accent?: 'amber' | 'violet';
}>) {
    const scrollRef = useRef<HTMLDivElement>(null);

    const scrollByDir = useCallback((dir: -1 | 1) => {
        const el = scrollRef.current;
        if (!el) return;
        const card = el.querySelector<HTMLElement>('[data-carousel-card]');
        const w = card?.offsetWidth ?? 300;
        const gap = 16;
        el.scrollBy({ left: dir * (w + gap), behavior: 'smooth' });
    }, []);

    const ring =
        accent === 'violet'
            ? 'border-violet-500/30 hover:border-violet-400/50 hover:bg-violet-500/5'
            : 'border-amber-500/25 hover:border-amber-400/40 hover:bg-amber-500/5';

    return (
        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
                <div>
                    {subtitle ? (
                        <p
                            className={`text-xs font-semibold uppercase tracking-wider ${
                                accent === 'violet' ? 'text-violet-400/80' : 'text-amber-400/70'
                            }`}
                        >
                            {subtitle}
                        </p>
                    ) : null}
                    <h2 className={`font-display text-2xl font-bold text-zinc-900 dark:text-white ${subtitle ? 'mt-1' : ''}`}>{title}</h2>
                </div>
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => scrollByDir(-1)}
                        className="rounded-full border border-zinc-300 bg-white/80 px-3 py-2 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-100 dark:border-white/10 dark:bg-zinc-900/80 dark:text-zinc-200 dark:hover:bg-zinc-800"
                        aria-label="Önceki"
                    >
                        ←
                    </button>
                    <button
                        type="button"
                        onClick={() => scrollByDir(1)}
                        className="rounded-full border border-zinc-300 bg-white/80 px-3 py-2 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-100 dark:border-white/10 dark:bg-zinc-900/80 dark:text-zinc-200 dark:hover:bg-zinc-800"
                        aria-label="Sonraki"
                    >
                        →
                    </button>
                </div>
            </div>

            {events.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/80 px-6 py-12 text-center text-zinc-600 dark:border-white/10 dark:bg-zinc-900/30 dark:text-zinc-400">
                    {emptyMessage}
                </div>
            ) : (
                <div
                    ref={scrollRef}
                    className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 scrollbar-hide [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                >
                    {events.map((event) => {
                        const cardImg =
                            event.listing_image && event.listing_image.trim() !== ''
                                ? event.listing_image
                                : event.cover_image;
                        const cardSrc = imageSrc(cardImg ?? null);
                        return (
                        <Link
                            key={event.id}
                            data-carousel-card
                            href={route('events.show', eventShowParam(event))}
                            className={`group relative min-w-[min(100%,320px)] max-w-[320px] shrink-0 snap-start overflow-hidden rounded-2xl border bg-white/90 shadow-sm transition dark:bg-zinc-900/60 ${ring}`}
                        >
                            <div className="relative h-36 w-full overflow-hidden bg-zinc-200 dark:bg-zinc-800">
                                {cardSrc ? (
                                    <img
                                        src={cardSrc}
                                        alt=""
                                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                                    />
                                ) : (
                                    <div className="flex h-full items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-950 text-5xl opacity-90">
                                        🎵
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/30" />
                                <div className="absolute left-3 top-3 z-10">
                                    <span
                                        className={`inline-block rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-md ring-1 ring-white/25 ${
                                            accent === 'violet' ? 'bg-violet-600/95' : 'bg-amber-600/95'
                                        }`}
                                    >
                                        {event.venue.category?.name ?? 'Etkinlik'}
                                    </span>
                                </div>
                                <div className="absolute bottom-3 left-3 right-3">
                                    <p className="line-clamp-2 font-display text-lg font-bold leading-tight text-white drop-shadow-md">
                                        {event.title}
                                    </p>
                                </div>
                            </div>
                            <div className="space-y-2 p-4">
                                <div
                                    className={`flex items-start gap-2 ${
                                        accent === 'violet'
                                            ? 'text-violet-800 dark:text-violet-200'
                                            : 'text-amber-900 dark:text-amber-200'
                                    }`}
                                >
                                    <IconBuilding className="mt-0.5 h-5 w-5 shrink-0 opacity-90" />
                                    <p className="min-w-0 text-lg font-bold leading-snug tracking-tight sm:text-xl">{event.venue.name}</p>
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                                    <IconCalendar className="h-4 w-4 shrink-0" />
                                    <time dateTime={event.start_date}>
                                        {new Date(event.start_date).toLocaleString('tr-TR', {
                                            weekday: 'short',
                                            day: 'numeric',
                                            month: 'short',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })}
                                    </time>
                                </div>
                                {event.artists.length > 0 && (
                                    <p
                                        className={`line-clamp-2 text-xs ${
                                            accent === 'violet'
                                                ? 'text-violet-700 dark:text-violet-300/90'
                                                : 'text-amber-800 dark:text-amber-300/90'
                                        }`}
                                    >
                                        {event.artists.map((a) => a.name).join(', ')}
                                    </p>
                                )}
                            </div>
                        </Link>
                        );
                    })}
                </div>
            )}
        </section>
    );
}
