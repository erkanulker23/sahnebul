import { eventShowParam } from '@/lib/eventShowUrl';
import { formatTurkishDateTime } from '@/lib/formatTurkishDateTime';
import { stripHtmlToText } from '@/utils/seo';
import { Link } from '@inertiajs/react';
import { Music2 } from 'lucide-react';
import { useCallback, useMemo, useRef, useState } from 'react';

const WEEKDAYS_TR = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'] as const;

export type CalendarSliderEvent = {
    id: number;
    slug: string;
    title: string;
    description?: string | null;
    start_date: string;
    ticket_price?: number | null;
    entry_is_paid?: boolean;
    artists?: { id: number; name: string; slug: string; avatar?: string | null }[];
    venue?: { name: string; slug?: string; city?: { name: string } | null };
};

function localDateKey(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function parseEventDateKey(iso: string): string {
    return localDateKey(new Date(iso));
}

function calendarDayCellClass(isSelected: boolean, isToday: boolean, hasEvent: boolean): string {
    const base =
        'relative flex aspect-square flex-col items-center justify-center rounded-lg text-[11px] font-medium transition sm:text-xs';
    let state: string;
    if (isSelected) {
        state =
            'bg-gradient-to-b from-amber-400/25 to-amber-600/10 text-amber-50 ring-2 ring-amber-400/50 shadow-[0_0_24px_-4px_rgba(251,191,36,0.35)]';
    } else if (isToday) {
        state = 'border border-amber-500/35 bg-amber-500/5 text-amber-100';
    } else {
        state = 'text-zinc-200 hover:bg-white/5';
    }
    const eventRing = hasEvent && !isSelected ? 'ring-1 ring-amber-500/20' : '';
    return [base, state, eventRing].filter(Boolean).join(' ');
}

export interface EventCalendarSliderProps {
    events: CalendarSliderEvent[];
    imageSrc: (path: string | null | undefined) => string | null;
    /** venue: sanatçı avatarları; artist: mekan + bilet satırı */
    variant?: 'venue' | 'artist';
    sectionId?: string;
    /** Daha geniş içerik alanı (sanatçı sayfası vb.) */
    wide?: boolean;
}

export default function EventCalendarSlider({
    events,
    imageSrc,
    variant = 'venue',
    sectionId = 'takvim',
    wide = false,
}: Readonly<EventCalendarSliderProps>) {
    const [calendarMonth, setCalendarMonth] = useState(() => {
        const first = events[0]?.start_date;
        return first ? new Date(first) : new Date();
    });
    const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
    const sliderRef = useRef<HTMLDivElement>(null);

    const eventDateKeys = useMemo(() => {
        const s = new Set<string>();
        events.forEach((e) => s.add(parseEventDateKey(e.start_date)));
        return s;
    }, [events]);

    const sliderEvents = useMemo(() => {
        if (!events.length) return [];
        if (!selectedDateKey) return events;
        return events.filter((e) => parseEventDateKey(e.start_date) === selectedDateKey);
    }, [events, selectedDateKey]);

    const calendarMeta = useMemo(() => {
        const y = calendarMonth.getFullYear();
        const m = calendarMonth.getMonth();
        const first = new Date(y, m, 1);
        const daysInMonth = new Date(y, m + 1, 0).getDate();
        const startPad = (first.getDay() + 6) % 7;
        const monthLabel = calendarMonth.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
        return { y, m, daysInMonth, startPad, monthLabel };
    }, [calendarMonth]);

    const scrollEventSlider = useCallback((dir: -1 | 1) => {
        const el = sliderRef.current;
        if (!el) return;
        const gap = 16;
        const firstCard = el.querySelector<HTMLElement>('[data-slider-card]');
        const step = firstCard ? firstCard.offsetWidth + gap : Math.min(440, el.clientWidth * 0.92);
        el.scrollBy({ left: dir * step, behavior: 'smooth' });
    }, []);

    const todayKey = localDateKey(new Date());

    if (!events.length) {
        return null;
    }

    return (
        <section
            id={sectionId}
            className="scroll-mt-28 border-t border-white/[0.06] bg-gradient-to-b from-[#080809] via-zinc-950/80 to-black pb-20 pt-14 dark:border-white/[0.06]"
        >
            <div
                className={
                    wide
                        ? 'mx-auto w-full max-w-[min(100%,96rem)] px-4 sm:px-6 lg:px-10 xl:px-12'
                        : 'mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'
                }
            >
                <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-500/80">Program</p>
                        <h2 className="font-display mt-1 text-2xl font-bold text-zinc-900 dark:text-white sm:text-3xl">Etkinlik takvimi</h2>
                        <p className="mt-2 max-w-xl text-sm text-zinc-600 dark:text-zinc-500">
                            Tarihe dokunarak o güne göre süzün; kartları yatay kaydırarak programı gezin.
                        </p>
                    </div>
                    {selectedDateKey && (
                        <button
                            type="button"
                            onClick={() => setSelectedDateKey(null)}
                            className="self-start rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-700 transition hover:border-amber-500/30 hover:text-amber-700 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300 dark:hover:text-amber-200"
                        >
                            Tüm tarihleri göster
                        </button>
                    )}
                </div>

                <div className="grid gap-8 lg:grid-cols-12 lg:items-start lg:gap-6">
                    {/* Küçük takvim */}
                    <div className="flex justify-center lg:col-span-3 lg:justify-start">
                        <div className={`w-full ${wide ? 'max-w-[280px]' : 'max-w-[260px]'}`}>
                            <div className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-gradient-to-br from-zinc-900/90 via-zinc-950 to-[#0c0c0e] p-px shadow-[0_0_0_1px_rgba(251,191,36,0.06),0_24px_80px_-32px_rgba(0,0,0,0.9)] dark:border-white/[0.07]">
                                <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-amber-500/10 blur-3xl" aria-hidden />
                                <div className="absolute -bottom-8 -left-8 h-28 w-28 rounded-full bg-violet-500/5 blur-3xl" aria-hidden />
                                <div className="relative rounded-[1.15rem] bg-zinc-950/60 p-3 sm:p-3.5">
                                    <div className="flex items-center justify-between gap-1">
                                        <button
                                            type="button"
                                            onClick={() => setCalendarMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
                                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-zinc-300 transition hover:border-amber-500/40 hover:text-amber-200"
                                            aria-label="Önceki ay"
                                        >
                                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                            </svg>
                                        </button>
                                        <p className="min-w-0 flex-1 px-1 text-center font-display text-xs font-semibold capitalize leading-tight text-white sm:text-sm">
                                            {calendarMeta.monthLabel}
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => setCalendarMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
                                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-zinc-300 transition hover:border-amber-500/40 hover:text-amber-200"
                                            aria-label="Sonraki ay"
                                        >
                                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </button>
                                    </div>
                                    <div className="mt-3 grid grid-cols-7 gap-y-0.5 text-center text-[9px] font-medium uppercase tracking-wide text-zinc-500 sm:text-[10px]">
                                        {WEEKDAYS_TR.map((wd) => (
                                            <div key={wd} className="py-0.5">
                                                {wd}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-0.5 grid grid-cols-7 gap-1">
                                        {Array.from({ length: calendarMeta.startPad }).map((_, i) => (
                                            <div key={`pad-${calendarMeta.y}-${calendarMeta.m}-${i}`} className="aspect-square" />
                                        ))}
                                        {Array.from({ length: calendarMeta.daysInMonth }, (_, i) => i + 1).map((day) => {
                                            const cellDate = new Date(calendarMeta.y, calendarMeta.m, day);
                                            const key = localDateKey(cellDate);
                                            const hasEvent = eventDateKeys.has(key);
                                            const isToday = key === todayKey;
                                            const isSelected = selectedDateKey === key;
                                            return (
                                                <button
                                                    key={key}
                                                    type="button"
                                                    onClick={() => setSelectedDateKey((prev) => (prev === key ? null : key))}
                                                    className={calendarDayCellClass(isSelected, isToday, hasEvent)}
                                                >
                                                    <span>{day}</span>
                                                    {hasEvent && (
                                                        <span className="absolute bottom-1 h-0.5 w-0.5 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)] sm:bottom-1.5 sm:h-1 sm:w-1" />
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <p className="mt-3 text-center text-[10px] text-zinc-500">
                                        <span className="inline-flex items-center gap-1">
                                            <span className="h-1 w-1 rounded-full bg-amber-400 shadow-[0_0_4px_rgba(251,191,36,0.7)]" />
                                            Etkinlik günleri
                                        </span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Geniş slider */}
                    <div className="min-w-0 lg:col-span-9">
                        <div className="flex items-center justify-between gap-4">
                            <h3 className="font-display text-lg font-semibold text-zinc-900 dark:text-white">
                                {selectedDateKey
                                    ? formatTurkishDateTime(`${selectedDateKey}T12:00:00`, { withTime: false })
                                    : 'Yaklaşan etkinlikler'}
                            </h3>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => scrollEventSlider(-1)}
                                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-300 bg-white text-zinc-600 transition hover:border-amber-500/35 hover:text-amber-700 dark:border-white/10 dark:bg-zinc-900/80 dark:text-zinc-300 dark:hover:text-amber-200"
                                    aria-label="Önceki"
                                >
                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => scrollEventSlider(1)}
                                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-300 bg-white text-zinc-600 transition hover:border-amber-500/35 hover:text-amber-700 dark:border-white/10 dark:bg-zinc-900/80 dark:text-zinc-300 dark:hover:text-amber-200"
                                    aria-label="Sonraki"
                                >
                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {sliderEvents.length === 0 ? (
                            <p className="mt-6 rounded-2xl border border-zinc-200 bg-zinc-50 px-6 py-10 text-center text-sm text-zinc-600 dark:border-white/5 dark:bg-zinc-900/40 dark:text-zinc-500">
                                Bu tarihte etkinlik yok. Başka bir gün seçin veya tüm tarihleri gösterin.
                            </p>
                        ) : (
                            <div
                                ref={sliderRef}
                                className="scrollbar-hide mt-5 flex snap-x snap-mandatory gap-5 overflow-x-auto pb-2 pt-1"
                            >
                                {sliderEvents.map((event) => (
                                    <Link
                                        key={event.id}
                                        data-slider-card=""
                                        href={route('events.show', eventShowParam(event))}
                                        className="group relative min-w-[min(100%,420px)] max-w-[420px] shrink-0 snap-start overflow-hidden rounded-2xl border border-zinc-200 bg-gradient-to-b from-zinc-50 to-white transition hover:border-amber-400/40 dark:border-white/[0.07] dark:from-zinc-900/90 dark:to-zinc-950 dark:hover:border-amber-500/25"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-violet-500/5 opacity-0 transition group-hover:opacity-100" />
                                        <div className="relative flex gap-5 p-5">
                                            <div className="flex min-w-[5.75rem] max-w-[6.5rem] flex-col items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/[0.07] px-2 py-3 text-center">
                                                <span className="text-[10px] font-semibold leading-snug text-amber-700 dark:text-amber-200/95">
                                                    {formatTurkishDateTime(event.start_date)}
                                                </span>
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-lg font-semibold leading-snug text-zinc-900 group-hover:text-amber-700 dark:text-white dark:group-hover:text-amber-100">
                                                    {event.title}
                                                </p>
                                                {variant === 'venue' && event.artists && event.artists.length > 0 && (
                                                    <div className="mt-3 flex items-center gap-2">
                                                        <div className="flex -space-x-2">
                                                            {event.artists.slice(0, 3).map((a) =>
                                                                a.avatar ? (
                                                                    <img
                                                                        key={a.id}
                                                                        src={imageSrc(a.avatar) ?? ''}
                                                                        alt={a.name}
                                                                        className="h-8 w-8 rounded-full object-cover ring-2 ring-white dark:ring-zinc-900"
                                                                    />
                                                                ) : (
                                                                    <span
                                                                        key={a.id}
                                                                        className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-700 ring-2 ring-white dark:ring-zinc-900"
                                                                        title={a.name}
                                                                    >
                                                                        <Music2 className="h-4 w-4 text-zinc-400" strokeWidth={1.75} aria-hidden />
                                                                    </span>
                                                                ),
                                                            )}
                                                        </div>
                                                        <span className="truncate text-sm text-zinc-600 dark:text-zinc-500">
                                                            {event.artists.map((a) => a.name).join(', ')}
                                                        </span>
                                                    </div>
                                                )}
                                                {variant === 'artist' && event.venue && (
                                                    <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                                                        {[event.venue.city?.name, event.venue.name].filter(Boolean).join(' • ')}
                                                    </p>
                                                )}
                                                {variant === 'artist' && (
                                                    <p className="mt-2 text-base font-semibold text-emerald-600 dark:text-emerald-400">
                                                        {event.entry_is_paid === false
                                                            ? 'Ücretsiz giriş'
                                                            : event.ticket_price == null
                                                              ? 'Ücret bilgisi yok'
                                                              : `${event.ticket_price} ₺`}
                                                    </p>
                                                )}
                                                {event.description?.trim() && (
                                                    <p className="mt-2 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-500">
                                                        {stripHtmlToText(event.description)}
                                                    </p>
                                                )}
                                                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-amber-600 dark:text-amber-400/90">
                                                    Detaylar
                                                    <svg
                                                        className="h-4 w-4 transition group-hover:translate-x-0.5"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                    </svg>
                                                </span>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}
