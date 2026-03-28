import EventRelativeDayPill from '@/Components/EventRelativeDayPill';
import { eventRelativeDayKind } from '@/lib/eventRelativeDay';
import { resolveEventListingThumbUrl } from '@/lib/eventPublicImage';
import { formatVenueLocationLine } from '@/lib/formatVenueLocationLine';
import { eventShowParam } from '@/lib/eventShowUrl';
import { formatTurkishEventTimeRange } from '@/lib/eventRuntime';
import { Link } from '@inertiajs/react';
import { useState } from 'react';

/** /etkinlikler ve diğer kamusal listelerde ortak kart şekli */
export type PublicEventTicketCardEvent = {
    id: number;
    slug: string;
    title: string;
    start_date: string;
    end_date?: string | null;
    cover_image?: string | null;
    listing_image?: string | null;
    status?: string | null;
    is_full?: boolean | null;
    ticket_acquisition_mode?: string | null;
    sahnebul_reservation_enabled?: boolean | null;
    venue: {
        name: string;
        slug: string;
        cover_image?: string | null;
        category?: { name: string; slug?: string } | null;
        city?: { name: string } | null;
        district?: { name: string } | null;
    };
    artists: { id: number; name: string; slug: string; avatar: string | null; genre?: string | null }[];
};

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
    const displayName = event.title;
    const artistSubtitle =
        headliner?.name && headliner.name.trim() !== '' && headliner.name.trim() !== event.title.trim()
            ? headliner.name
            : null;
    /** Yalnız etkinlik liste/kapak görselleri; sanatçı / mekân fotoğrafı kartta kullanılmaz. */
    const bg = resolveEventListingThumbUrl(event.listing_image, event.cover_image);

    const whenLabel = formatTurkishEventTimeRange(event.start_date, event.end_date ?? null);
    const locationLine = formatVenueLocationLine(event.venue.city?.name, event.venue.district?.name);
    const showLocationOverlay = locationLine !== '';

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
                    {/** Hafif üstten gölge — afiş yüzü açık kalsın; meta bilgi altta şeritte */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-black/10 opacity-90 transition group-hover:opacity-100" />
                    {/** Bugün/Yarın: üst sol — alttaki şeridi kaplamaz */}
                    {eventRelativeDayKind(event.start_date, event.end_date) ? (
                        <div className="pointer-events-none absolute left-2.5 top-2.5 z-[3] sm:left-3 sm:top-3">
                            <EventRelativeDayPill startDate={event.start_date} endDate={event.end_date} placement="overlay" />
                        </div>
                    ) : null}
                    {/** sm altı: poster temiz; konum/tarih kart metninde. sm ve üstü: görsel alt şerit. */}
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] hidden bg-gradient-to-t from-black/85 from-[18%] via-black/45 via-[55%] to-transparent px-2 pb-2 pt-10 sm:block sm:px-3 sm:pb-2.5 sm:pt-12">
                        <div className="flex min-w-0 flex-col items-start gap-1">
                            {showLocationOverlay ? (
                                <p
                                    className="flex min-w-0 items-center gap-1 text-[10px] font-semibold leading-tight tracking-tight text-white/95 drop-shadow-sm sm:gap-1.5 sm:text-[11px]"
                                    title={locationLine}
                                >
                                    <IconMapPin className="h-3 w-3 shrink-0 text-amber-300/95 sm:h-3.5 sm:w-3.5" />
                                    <span className="min-w-0 truncate">{locationLine}</span>
                                </p>
                            ) : null}
                            <p className="flex min-w-0 items-start gap-1 text-[10px] font-semibold leading-snug text-white drop-shadow-sm sm:gap-1.5 sm:text-[11px] sm:leading-snug">
                                <IconCalendar className="mt-0.5 h-3 w-3 shrink-0 text-amber-300/95 sm:h-3.5 sm:w-3.5" />
                                <span className="min-w-0 line-clamp-2 text-pretty text-white/95">{whenLabel}</span>
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
                    <div className="mb-1.5 flex flex-col items-start gap-1 sm:hidden">
                        <EventRelativeDayPill startDate={event.start_date} endDate={event.end_date} placement="panel" />
                        {showLocationOverlay ? (
                            <p className="flex min-w-0 items-center gap-1 text-[10px] font-semibold leading-tight text-zinc-600 dark:text-zinc-400" title={locationLine}>
                                <IconMapPin className="h-3 w-3 shrink-0 text-amber-600 dark:text-amber-500" />
                                <span className="min-w-0 truncate">{locationLine}</span>
                            </p>
                        ) : null}
                        <p className="flex min-w-0 items-start gap-1 text-[10px] font-semibold leading-snug text-zinc-700 dark:text-zinc-300">
                            <IconCalendar className="mt-0.5 h-3 w-3 shrink-0 text-amber-600 dark:text-amber-500" />
                            <span className="min-w-0 line-clamp-2 text-pretty">{whenLabel}</span>
                        </p>
                    </div>
                    <h2 className="font-display text-xs font-bold leading-snug tracking-tight text-zinc-900 dark:text-white sm:text-lg">
                        <span className="line-clamp-2">{displayName}</span>
                    </h2>
                    {artistSubtitle ? (
                        <p className="mt-0.5 line-clamp-1 text-[10px] font-medium text-zinc-500 dark:text-zinc-400 sm:text-xs">{artistSubtitle}</p>
                    ) : null}
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
