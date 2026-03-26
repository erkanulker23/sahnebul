import { eventShowParam } from '@/lib/eventShowUrl';
import { formatTurkishDateTime } from '@/lib/formatTurkishDateTime';
import { Link } from '@inertiajs/react';
import { useState } from 'react';

/** /etkinlikler ve diğer kamusal listelerde ortak kart şekli */
export type PublicEventTicketCardEvent = {
    id: number;
    slug: string;
    title: string;
    start_date: string;
    cover_image?: string | null;
    listing_image?: string | null;
    venue: {
        name: string;
        slug: string;
        cover_image?: string | null;
        category?: { name: string; slug?: string } | null;
        city?: { name: string } | null;
    };
    artists: { id: number; name: string; slug: string; avatar: string | null; genre?: string | null }[];
};

function imageSrc(path: string | null | undefined): string | null {
    if (!path) return null;
    return path.startsWith('http://') || path.startsWith('https://') ? path : `/storage/${path}`;
}

function eventCardImageSrc(listing: string | null | undefined, cover: string | null | undefined): string | null {
    const list = listing?.trim();
    if (list) {
        return imageSrc(list);
    }
    return imageSrc(cover ?? null);
}

function EventCardImage({
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
                <span aria-hidden className="text-3xl opacity-90 sm:text-4xl">
                    🎤
                </span>
                <span className="line-clamp-4 max-w-[95%] text-balance break-words text-center font-display text-sm font-bold leading-tight text-white sm:text-base md:text-lg">
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

export default function PublicEventTicketCard({
    event,
    distanceKm,
}: Readonly<{ event: PublicEventTicketCardEvent; distanceKm?: number | null }>) {
    const headliner = event.artists[0];
    const displayName = headliner?.name ?? event.title;
    const bg =
        eventCardImageSrc(event.listing_image, event.cover_image) ??
        imageSrc(headliner?.avatar) ??
        imageSrc(event.venue.cover_image);

    const whenLabel = formatTurkishDateTime(event.start_date);

    return (
        <div className="group h-full">
            <Link
                href={route('events.show', eventShowParam(event))}
                className="flex h-full flex-col overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-amber-400/40 hover:shadow-lg hover:shadow-amber-500/5 dark:border-white/[0.08] dark:bg-zinc-900/50 dark:hover:border-amber-500/35"
            >
                <div className="relative aspect-[4/3] shrink-0 overflow-hidden bg-zinc-100 dark:bg-zinc-800/80">
                    {bg ? (
                        <EventCardImage
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
                    <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent opacity-80 transition group-hover:opacity-100" />
                    <div
                        className={`pointer-events-none absolute left-1.5 right-1.5 top-1.5 z-[2] flex flex-col gap-1.5 sm:left-3 sm:right-3 sm:top-3 sm:flex-row sm:items-start sm:gap-2 ${
                            event.venue.city?.name ? 'sm:justify-between' : 'sm:justify-end'
                        }`}
                    >
                        {event.venue.city?.name ? (
                            <div className="min-w-0 max-w-full sm:max-w-[calc(100%-9.5rem)]">
                                <span
                                    className="inline-flex max-w-full items-center gap-1 truncate rounded-lg bg-gradient-to-r from-violet-600 via-fuchsia-600 to-rose-500 px-2 py-1 text-[9px] font-bold leading-tight text-white shadow-lg shadow-fuchsia-900/25 ring-1 ring-white/25 sm:gap-1.5 sm:rounded-xl sm:px-2.5 sm:py-1.5 sm:text-[10px]"
                                    title={event.venue.city.name}
                                >
                                    <IconMapPin className="h-3 w-3 shrink-0 opacity-95 sm:h-3.5 sm:w-3.5" />
                                    <span className="min-w-0 truncate">{event.venue.city.name}</span>
                                </span>
                            </div>
                        ) : null}
                        <div className="w-full min-w-0 rounded-lg bg-gradient-to-br from-white/90 via-amber-50/95 to-amber-100/90 px-2 py-1 shadow-lg shadow-amber-900/10 ring-1 ring-amber-200/80 backdrop-blur-md dark:from-zinc-900/90 dark:via-zinc-900/85 dark:to-amber-950/40 dark:ring-amber-500/20 sm:w-auto sm:max-w-[min(100%,12rem)] sm:shrink-0 sm:rounded-xl sm:px-2.5 sm:py-1.5">
                            <p className="flex items-start gap-1.5 text-left text-[9px] font-semibold leading-tight text-zinc-900 dark:text-amber-50 sm:gap-2 sm:text-[11px] sm:leading-snug">
                                <IconCalendar className="mt-0.5 h-3 w-3 shrink-0 text-amber-600 dark:text-amber-400 sm:h-3.5 sm:w-3.5" />
                                <span className="min-w-0 text-pretty break-words">{whenLabel}</span>
                            </p>
                        </div>
                    </div>
                    {distanceKm != null && Number.isFinite(distanceKm) ? (
                        <div className="pointer-events-none absolute bottom-2 right-2 z-[2] sm:bottom-3 sm:right-3">
                            <span
                                className="inline-flex items-center rounded-full bg-emerald-600 px-2 py-1 text-[9px] font-bold tabular-nums text-white shadow-lg shadow-emerald-900/30 ring-1 ring-white/25 sm:px-2.5 sm:text-[10px]"
                                title="Mekâna yaklaşık mesafe"
                            >
                                {distanceKm.toFixed(1)} km
                            </span>
                        </div>
                    ) : null}
                </div>
                <div className="flex min-h-0 flex-1 flex-col p-2.5 pt-2 sm:p-4 sm:pt-3.5">
                    <h2 className="font-display text-xs font-bold leading-snug tracking-tight text-zinc-900 dark:text-white sm:text-lg">
                        <span className="line-clamp-2">{displayName}</span>
                    </h2>
                    <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-zinc-600 dark:text-zinc-400 sm:mt-2 sm:text-sm">{event.venue.name}</p>
                    {event.venue.category?.name ? (
                        <p className="mt-0.5 truncate text-[10px] font-medium text-amber-700/90 dark:text-amber-400/90 sm:mt-1 sm:text-xs">{event.venue.category.name}</p>
                    ) : null}
                    <span className="mt-auto inline-flex items-center gap-1 pt-2 text-[11px] font-semibold text-amber-600 transition group-hover:gap-2 dark:text-amber-400 sm:gap-1.5 sm:pt-4 sm:text-sm">
                        Detaylar
                        <svg className="h-3 w-3 shrink-0 sm:h-4 sm:w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                        </svg>
                    </span>
                </div>
            </Link>
        </div>
    );
}
