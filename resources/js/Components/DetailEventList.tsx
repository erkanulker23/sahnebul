import { eventShowParam } from '@/lib/eventShowUrl';
import { eventTicketBadge } from '@/lib/eventTicketBadge';
import { Link } from '@inertiajs/react';
import { Clock, ChevronRight } from 'lucide-react';

export type DetailEventListItem = {
    id: number;
    slug: string;
    title: string;
    start_date: string;
    cover_image?: string | null;
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

function thumbUrl(ev: DetailEventListItem, context: 'artist' | 'venue', imageSrc: (p: string | null | undefined) => string | null): string | null {
    const cover = ev.cover_image?.trim();
    if (cover) {
        return cover.startsWith('http://') || cover.startsWith('https://') ? cover : imageSrc(cover);
    }
    if (context === 'venue') {
        const av = ev.artists?.find((a) => a.avatar)?.avatar ?? ev.artists?.[0]?.avatar;
        return av ? imageSrc(av) : null;
    }
    return null;
}

export default function DetailEventList({
    events,
    imageSrc,
    context,
    className = '',
    showHeading = true,
}: Readonly<DetailEventListProps>) {
    if (events.length === 0) return null;

    return (
        <section className={className}>
            {showHeading ? (
                <h2 className="font-display text-lg font-bold text-zinc-900 dark:text-white sm:text-xl">Etkinlikleri Listele</h2>
            ) : null}
            <ul className={showHeading ? 'mt-4 space-y-3' : 'space-y-3'}>
                {events.map((ev) => {
                    const start = new Date(ev.start_date);
                    const dayNum = start.toLocaleDateString('tr-TR', { day: 'numeric' });
                    const monthName = start.toLocaleDateString('tr-TR', { month: 'long' });
                    const timeStr = start.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
                    const badge = eventTicketBadge(ev);
                    const sub = subtitleForEvent(ev, context);
                    const thumb = thumbUrl(ev, context, imageSrc);

                    return (
                        <li key={ev.id}>
                            <Link
                                href={route('events.show', eventShowParam(ev))}
                                className="group flex overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm transition hover:border-zinc-300 hover:shadow-md dark:border-white/[0.08] dark:bg-zinc-900/40 dark:hover:border-white/15"
                                aria-label={`${ev.title}, ${sub}, ${timeStr}`}
                            >
                                <span className="w-1 shrink-0 bg-[#e9785c]" aria-hidden />
                                <div className="flex min-w-0 flex-1 items-stretch gap-3 py-3 pl-3 pr-2 sm:gap-4 sm:pl-4 sm:pr-3">
                                    <div className="flex w-[52px] shrink-0 flex-col items-center justify-center border-r border-zinc-200 pr-3 text-center dark:border-white/10 sm:w-[56px]">
                                        <span className="text-2xl font-bold tabular-nums text-zinc-900 dark:text-white sm:text-[1.65rem]">
                                            {dayNum}
                                        </span>
                                        <span className="mt-0.5 text-xs capitalize text-zinc-600 dark:text-zinc-400">{monthName}</span>
                                    </div>
                                    <div className="min-w-0 flex-1 self-center">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="inline-flex items-center gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
                                                <Clock className="h-3.5 w-3.5 text-zinc-400" strokeWidth={2} aria-hidden />
                                                {timeStr}
                                            </span>
                                            <span
                                                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge.pillClass}`}
                                            >
                                                {badge.label}
                                            </span>
                                        </div>
                                        <p className="mt-1 truncate text-sm font-bold text-zinc-900 dark:text-white sm:text-base">{sub}</p>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-1 sm:gap-2">
                                        {thumb ? (
                                            <span className="hidden h-14 w-14 overflow-hidden rounded-lg border border-zinc-100 sm:block dark:border-white/10">
                                                <img src={thumb} alt="" className="h-full w-full object-cover" loading="lazy" />
                                            </span>
                                        ) : null}
                                        <ChevronRight
                                            className="h-5 w-5 shrink-0 text-sky-600 dark:text-sky-400"
                                            strokeWidth={2.25}
                                            aria-hidden
                                        />
                                    </div>
                                </div>
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}
