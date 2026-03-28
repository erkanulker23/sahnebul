import { resolveEventListingThumbUrl } from '@/lib/eventPublicImage';
import { formatVenueLocationLine } from '@/lib/formatVenueLocationLine';
import { eventShowParam } from '@/lib/eventShowUrl';
import { formatTurkishDateTime } from '@/lib/formatTurkishDateTime';
import { Link } from '@inertiajs/react';
import { useCallback, useRef, useState } from 'react';

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
        city?: { name: string } | null;
        district?: { name: string } | null;
    };
    artists: { id: number; name: string; slug: string; avatar?: string | null }[];
    cover_image?: string | null;
    listing_image?: string | null;
}

function IconMapPin({ className }: Readonly<{ className?: string }>) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
            />
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

function CarouselCardImage({
    src,
    alt,
    className,
}: Readonly<{ src: string; alt: string; className?: string }>) {
    const [failed, setFailed] = useState(false);
    if (failed) {
        return (
            <div
                className={`absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-neutral-700 via-neutral-800 to-neutral-900 px-3 text-center ${className ?? ''}`}
            >
                <span aria-hidden className="text-3xl opacity-90">
                    🎤
                </span>
                <span className="line-clamp-3 max-w-[95%] text-center font-display text-xs font-bold leading-tight text-white">
                    {alt}
                </span>
            </div>
        );
    }
    return (
        <img
            src={src}
            alt=""
            loading="lazy"
            decoding="async"
            onError={() => setFailed(true)}
            className={className}
        />
    );
}

const cardShellClass =
    'group flex h-full flex-col overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-amber-400/40 hover:shadow-lg hover:shadow-amber-500/5 dark:border-white/[0.08] dark:bg-zinc-900/50 dark:hover:border-amber-500/35';

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
        const gap = parseFloat(getComputedStyle(el).gap || '16') || 16;
        el.scrollBy({ left: dir * (w + gap), behavior: 'smooth' });
    }, []);

    const subtitleClass =
        accent === 'violet' ? 'text-violet-400/80' : 'text-amber-400/70';

    return (
        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
                <div>
                    {subtitle ? (
                        <p className={`text-xs font-semibold uppercase tracking-wider ${subtitleClass}`}>{subtitle}</p>
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
                    className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-4 pr-4 pt-0.5 scrollbar-hide [-ms-overflow-style:none] [scrollbar-width:none] [scroll-padding-inline:1rem] sm:gap-4 sm:pr-6 [&::-webkit-scrollbar]:hidden"
                >
                    {events.map((event) => {
                        const headliner = event.artists[0];
                        const displayName = headliner?.name ?? event.title;
                        const bg = resolveEventListingThumbUrl(event.listing_image, event.cover_image);
                        const whenLabel = formatTurkishDateTime(event.start_date);
                        const locationLine = formatVenueLocationLine(event.venue.city?.name, event.venue.district?.name);
                        const showLocationOverlay = locationLine !== '';

                        return (
                            <Link
                                key={event.id}
                                data-carousel-card
                                href={route('events.show', eventShowParam(event))}
                                className={`${cardShellClass} min-w-[min(100%,300px)] max-w-[300px] shrink-0 snap-start sm:min-w-[min(100%,320px)] sm:max-w-[320px]`}
                            >
                                <div className="relative aspect-[4/3] shrink-0 overflow-hidden bg-zinc-100 dark:bg-zinc-800/80">
                                    {bg ? (
                                        <CarouselCardImage
                                            src={bg}
                                            alt={displayName}
                                            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                                        />
                                    ) : (
                                        <div className="flex h-full items-center justify-center bg-gradient-to-br from-zinc-200 via-zinc-100 to-amber-100/40 text-5xl dark:from-zinc-800 dark:via-zinc-900 dark:to-zinc-950">
                                            <span aria-hidden className="select-none opacity-70">
                                                🎤
                                            </span>
                                        </div>
                                    )}
                                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/45 to-transparent opacity-90" />
                                </div>
                                <div className="border-b border-zinc-200/90 bg-zinc-50/95 px-3 py-2.5 dark:border-white/[0.08] dark:bg-zinc-950/50">
                                    <div className="flex flex-col gap-2">
                                        {showLocationOverlay ? (
                                            <div className="flex min-w-0 items-start gap-2" title={locationLine}>
                                                <IconMapPin
                                                    className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${accent === 'violet' ? 'text-violet-600 dark:text-violet-400' : 'text-amber-600 dark:text-amber-400'}`}
                                                />
                                                <span className="min-w-0 text-[11px] font-semibold leading-snug text-zinc-800 dark:text-zinc-200 sm:text-xs">
                                                    {locationLine}
                                                </span>
                                            </div>
                                        ) : null}
                                        <div className="flex min-w-0 items-start gap-2">
                                            <IconCalendar
                                                className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${accent === 'violet' ? 'text-violet-600 dark:text-violet-400' : 'text-amber-600 dark:text-amber-400'}`}
                                            />
                                            <span className="min-w-0 text-[11px] font-semibold leading-snug text-zinc-800 dark:text-zinc-200 sm:text-xs">
                                                {whenLabel}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex min-h-0 flex-1 flex-col p-2.5 pt-2 sm:p-4 sm:pt-3.5">
                                    <h3 className="font-display text-xs font-bold leading-snug tracking-tight text-zinc-900 dark:text-white sm:text-lg">
                                        <span className="line-clamp-2">{displayName}</span>
                                    </h3>
                                    <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-zinc-600 dark:text-zinc-400 sm:mt-2 sm:text-sm">{event.venue.name}</p>
                                    {event.venue.category?.name ? (
                                        <p className="mt-0.5 truncate text-[10px] font-medium text-amber-700/90 dark:text-amber-400/90 sm:mt-1 sm:text-xs">
                                            {event.venue.category.name}
                                        </p>
                                    ) : null}
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
            )}
        </section>
    );
}
