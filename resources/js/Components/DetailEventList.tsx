import { eventShowParam } from '@/lib/eventShowUrl';
import { eventTicketBadge } from '@/lib/eventTicketBadge';
import { formatTurkishDateTime } from '@/lib/formatTurkishDateTime';
import { Link } from '@inertiajs/react';
import { ChevronRight, Clock } from 'lucide-react';
import { useMemo } from 'react';

export type DetailEventListItem = {
    id: number;
    slug: string;
    title: string;
    start_date: string;
    cover_image?: string | null;
    listing_image?: string | null;
    status?: string | null;
    is_full?: boolean | null;
    ticket_acquisition_mode?: string | null;
    sahnebul_reservation_enabled?: boolean | null;
    venue?: { name: string; slug?: string; city?: { name: string } | null };
    artists?: { id: number; name: string; slug: string; avatar?: string | null }[];
};

export interface DetailEventListProps {
    events: DetailEventListItem[];
    imageSrc: (path: string | null | undefined) => string | null;
    /** Sanatçı sayfasında alt satır mekan; mekan sayfasında sanatçı listesi */
    context: 'artist' | 'venue';
    className?: string;
    /** Üst başlık (sanatçı sayfasında dışarıda başlık varsa false) */
    showHeading?: boolean;
}

function subtitleForEvent(ev: DetailEventListItem, context: 'artist' | 'venue'): string {
    if (context === 'artist') {
        const v = ev.venue;
        if (!v) return '';
        const city = v.city?.name;
        return [v.name, city].filter(Boolean).join(' — ');
    }
    const names = ev.artists?.map((a) => a.name).filter(Boolean) ?? [];
    return names.length > 0 ? names.join(', ') : ev.title;
}

function startOfMonth(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), 1);
}

function monthKeyFromDate(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthHeading(year: number, monthIndex: number): string {
    const d = new Date(year, monthIndex, 1);
    const s = d.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
    return s.length > 0 ? s.charAt(0).toLocaleUpperCase('tr-TR') + s.slice(1) : s;
}

export type MonthGroup = { key: string; heading: string; events: DetailEventListItem[] };

/** Sanatçı / ortak: takvim ayına göre gruplar (başlık tr-TR, ay adı büyük harfle başlar). */
export function groupDetailEventsByMonthForDisplay(
    events: DetailEventListItem[],
    order: 'asc' | 'desc',
): MonthGroup[] {
    const sorted = [...events].sort((a, b) => {
        const ta = new Date(a.start_date).getTime();
        const tb = new Date(b.start_date).getTime();
        if (Number.isNaN(ta) || Number.isNaN(tb)) {
            return 0;
        }
        return order === 'asc' ? ta - tb : tb - ta;
    });
    const map = new Map<string, DetailEventListItem[]>();
    for (const ev of sorted) {
        const sd = new Date(ev.start_date);
        if (Number.isNaN(sd.getTime())) {
            continue;
        }
        const key = monthKeyFromDate(sd);
        const cur = map.get(key) ?? [];
        cur.push(ev);
        map.set(key, cur);
    }
    const keys = [...map.keys()].sort((a, b) => (order === 'asc' ? a.localeCompare(b) : b.localeCompare(a)));
    return keys.map((key) => {
        const [y, m] = key.split('-').map(Number);
        const heading = monthHeading(y, m - 1);
        return { key, heading, events: map.get(key) ?? [] };
    });
}

function groupVenueEventsByMonth(events: DetailEventListItem[]): { upcoming: MonthGroup[]; past: MonthGroup[] } {
    const sorted = [...events].sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
    const now = new Date();
    const currentMonthStart = startOfMonth(now);

    const upcomingFlat: DetailEventListItem[] = [];
    const pastFlat: DetailEventListItem[] = [];
    for (const ev of sorted) {
        const sd = new Date(ev.start_date);
        if (Number.isNaN(sd.getTime())) {
            continue;
        }
        if (startOfMonth(sd) < currentMonthStart) {
            pastFlat.push(ev);
        } else {
            upcomingFlat.push(ev);
        }
    }

    const toGroups = (list: DetailEventListItem[], pastOrderDesc: boolean): MonthGroup[] => {
        const map = new Map<string, DetailEventListItem[]>();
        for (const ev of list) {
            const sd = new Date(ev.start_date);
            const key = monthKeyFromDate(sd);
            const cur = map.get(key) ?? [];
            cur.push(ev);
            map.set(key, cur);
        }
        const keys = [...map.keys()].sort((a, b) => (pastOrderDesc ? b.localeCompare(a) : a.localeCompare(b)));
        return keys.map((key) => {
            const [y, m] = key.split('-').map(Number);
            const heading = monthHeading(y, m - 1);
            return { key, heading, events: map.get(key) ?? [] };
        });
    };

    return {
        upcoming: toGroups(upcomingFlat, false),
        past: toGroups(pastFlat, true),
    };
}

function thumbVisual(
    ev: DetailEventListItem,
    context: 'artist' | 'venue',
    imageSrcFn: (p: string | null | undefined) => string | null,
): { url: string | null; objectFit: 'contain' | 'cover' } {
    const listing = ev.listing_image?.trim();
    if (listing) {
        const url = listing.startsWith('http://') || listing.startsWith('https://') ? listing : imageSrcFn(listing);
        return { url, objectFit: 'contain' };
    }
    const cover = ev.cover_image?.trim();
    if (cover) {
        const url = cover.startsWith('http://') || cover.startsWith('https://') ? cover : imageSrcFn(cover);
        return { url, objectFit: 'contain' };
    }
    if (context === 'venue') {
        const av = ev.artists?.find((a) => a.avatar)?.avatar ?? ev.artists?.[0]?.avatar;
        const url = av ? imageSrcFn(av) : null;
        return { url, objectFit: 'cover' };
    }
    return { url: null, objectFit: 'cover' };
}

function EventListRow({
    ev,
    context,
    imageSrc,
}: Readonly<{
    ev: DetailEventListItem;
    context: 'artist' | 'venue';
    imageSrc: (path: string | null | undefined) => string | null;
}>) {
    const start = new Date(ev.start_date);
    const whenLabel = formatTurkishDateTime(ev.start_date);
    const badge = eventTicketBadge(ev);
    const sub = subtitleForEvent(ev, context);
    const thumb = thumbVisual(ev, context, imageSrc);
    const ended = start.getTime() < Date.now();

    return (
        <li>
            <Link
                href={route('events.show', eventShowParam(ev))}
                className={`group flex overflow-hidden rounded-xl border bg-white shadow-sm transition hover:border-zinc-300 hover:shadow-md dark:border-white/[0.08] dark:bg-zinc-900/40 dark:hover:border-white/15 ${
                    ended ? 'border-zinc-200 opacity-80 dark:border-white/10' : 'border-zinc-200'
                }`}
                aria-label={`${ev.title}, ${sub}, ${whenLabel}`}
            >
                <span className={`w-1 shrink-0 ${ended ? 'bg-zinc-400 dark:bg-zinc-600' : 'bg-[#e9785c]'}`} aria-hidden />
                <div className="flex min-w-0 flex-1 items-stretch gap-3 py-3 pl-3 pr-2 sm:gap-4 sm:pl-4 sm:pr-3">
                    <div className="flex w-[min(100%,7.5rem)] shrink-0 flex-col items-center justify-center border-r border-zinc-200 px-1.5 py-1 text-center dark:border-white/10 sm:w-32">
                        <span className="inline-flex items-start gap-1 text-center text-[11px] font-semibold leading-snug text-zinc-800 dark:text-zinc-200 sm:text-xs">
                            <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-400" strokeWidth={2} aria-hidden />
                            {whenLabel}
                        </span>
                    </div>
                    <div className="min-w-0 flex-1 self-center">
                        <div className="flex flex-wrap items-center gap-2">
                            {ended ? (
                                <span className="rounded-full bg-zinc-500/15 px-2.5 py-0.5 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                                    Sona erdi
                                </span>
                            ) : null}
                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge.pillClass}`}>{badge.label}</span>
                        </div>
                        <p className="mt-1 truncate text-sm font-bold text-zinc-900 dark:text-white sm:text-base">{sub}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1 sm:gap-2">
                        {thumb.url ? (
                            <span className="hidden h-14 w-14 overflow-hidden rounded-lg border border-zinc-100 bg-zinc-100 sm:block dark:border-white/10 dark:bg-zinc-900/60">
                                <img
                                    src={thumb.url}
                                    alt=""
                                    className={`h-full w-full ${thumb.objectFit === 'contain' ? 'object-contain object-center' : 'object-cover'}`}
                                    loading="lazy"
                                />
                            </span>
                        ) : null}
                        <ChevronRight className="h-5 w-5 shrink-0 text-sky-600 dark:text-sky-400" strokeWidth={2.25} aria-hidden />
                    </div>
                </div>
            </Link>
        </li>
    );
}

export default function DetailEventList({
    events,
    imageSrc,
    context,
    className = '',
    showHeading = true,
}: Readonly<DetailEventListProps>) {
    const venueMonthGroups = useMemo(
        () => (context === 'venue' ? groupVenueEventsByMonth(events) : null),
        [context, events],
    );

    const artistMonthGroups = useMemo(
        () => (context === 'artist' ? groupDetailEventsByMonthForDisplay(events, 'asc') : null),
        [context, events],
    );

    if (events.length === 0) return null;

    if (context === 'artist' && artistMonthGroups) {
        return (
            <section className={className}>
                {showHeading ? (
                    <h2 className="font-display text-lg font-bold text-zinc-900 dark:text-white sm:text-xl">Etkinlikleri Listele</h2>
                ) : null}
                <div className={showHeading ? 'mt-4 space-y-8' : 'space-y-8'}>
                    {artistMonthGroups.map((group) => (
                        <div key={group.key}>
                            <h3 className="border-b border-zinc-200 pb-2 font-display text-base font-semibold text-zinc-800 dark:border-white/10 dark:text-zinc-100">
                                {group.heading}
                            </h3>
                            <ul className="mt-3 space-y-3">
                                {group.events.map((ev) => (
                                    <EventListRow key={ev.id} ev={ev} context={context} imageSrc={imageSrc} />
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </section>
        );
    }

    if (context === 'venue' && venueMonthGroups) {
        const { upcoming, past } = venueMonthGroups;
        const pastCount = past.reduce((n, g) => n + g.events.length, 0);

        return (
            <section id="takvim" className={className}>
                {showHeading ? (
                    <>
                        <h2 className="font-display text-lg font-bold text-zinc-900 dark:text-white sm:text-xl">Etkinlik takvimi</h2>
                        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                            Etkinlikler ay ay listelenir. Geçmiş aylar aşağıda daraltılabilir bölümde yer alır.
                        </p>
                    </>
                ) : null}

                <div className={showHeading ? 'mt-6 space-y-8' : 'space-y-8'}>
                    {upcoming.map((group) => (
                        <div key={group.key}>
                            <h3 className="border-b border-zinc-200 pb-2 font-display text-base font-semibold text-zinc-800 dark:border-white/10 dark:text-zinc-100">
                                {group.heading}
                            </h3>
                            <ul className="mt-3 space-y-3">
                                {group.events.map((ev) => (
                                    <EventListRow key={ev.id} ev={ev} context={context} imageSrc={imageSrc} />
                                ))}
                            </ul>
                        </div>
                    ))}

                    {pastCount > 0 ? (
                        <details className="rounded-xl border border-zinc-200 bg-zinc-50/80 dark:border-white/10 dark:bg-zinc-900/40">
                            <summary className="cursor-pointer list-none px-4 py-3 font-display text-sm font-semibold text-zinc-800 marker:hidden dark:text-zinc-200 [&::-webkit-details-marker]:hidden">
                                <span className="inline-flex items-center gap-2">
                                    Geçmiş etkinlikler
                                    <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300">
                                        {pastCount}
                                    </span>
                                </span>
                            </summary>
                            <div className="space-y-6 border-t border-zinc-200 px-4 pb-4 pt-4 dark:border-white/10">
                                {past.map((group) => (
                                    <div key={group.key}>
                                        <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{group.heading}</h4>
                                        <ul className="mt-2 space-y-2">
                                            {group.events.map((ev) => (
                                                <EventListRow key={ev.id} ev={ev} context={context} imageSrc={imageSrc} />
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        </details>
                    ) : null}

                    {upcoming.length === 0 && pastCount === 0 ? (
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">Bu mekanda listelenecek etkinlik yok.</p>
                    ) : null}
                </div>
            </section>
        );
    }

    return (
        <section className={className}>
            {showHeading ? (
                <h2 className="font-display text-lg font-bold text-zinc-900 dark:text-white sm:text-xl">Etkinlikleri Listele</h2>
            ) : null}
            <ul className={showHeading ? 'mt-4 space-y-3' : 'space-y-3'}>
                {events.map((ev) => (
                    <EventListRow key={ev.id} ev={ev} context={context} imageSrc={imageSrc} />
                ))}
            </ul>
        </section>
    );
}
