import { getEventListingTypeTileStyle } from '@/Components/EventListingHeroPlaceholder';
import { cn } from '@/lib/cn';
import { Link } from '@inertiajs/react';
import { ArrowUpRight, CalendarRange } from 'lucide-react';

export interface HomeEventTypeRow {
    slug: string;
    label: string;
    upcoming_count: number;
}

/**
 * Ana sayfa — tüm etkinlik türleri; `/etkinlik/{slug}` (ör. /etkinlik/konser) ile listeye gider.
 */
export function HomeEventTypesSection({ types }: Readonly<{ types: HomeEventTypeRow[] }>) {
    if (types.length === 0) {
        return null;
    }

    return (
        <section
            className="relative mx-auto max-w-7xl overflow-hidden px-3 py-10 sm:px-5 sm:py-12 lg:px-8"
            aria-labelledby="home-event-types-heading"
        >
            <div
                className="pointer-events-none absolute inset-0 -z-10 opacity-[0.55] dark:opacity-40"
                aria-hidden
            >
                <div className="absolute -left-1/4 top-0 h-72 w-[60%] rounded-full bg-amber-400/25 blur-3xl dark:bg-amber-500/15" />
                <div className="absolute -right-1/4 bottom-0 h-64 w-[55%] rounded-full bg-violet-400/20 blur-3xl dark:bg-violet-500/12" />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-300/90">
                        <CalendarRange className="h-4 w-4 opacity-80" aria-hidden />
                        Keşif
                    </p>
                    <h2 id="home-event-types-heading" className="font-display mt-1 text-2xl font-bold text-zinc-900 dark:text-white sm:text-3xl">
                        Etkinlik türleri
                    </h2>
                    <p className="mt-2 max-w-xl text-sm text-zinc-600 dark:text-zinc-400">
                        Konserden tiyatroya, yaklaşan programa türüne göre tek dokunuşla gidin.
                    </p>
                </div>
                <Link
                    href={route('events.index')}
                    className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full border border-zinc-200 bg-white/80 px-4 py-2 text-sm font-semibold text-zinc-800 shadow-sm transition hover:border-amber-400/50 hover:bg-amber-50/90 dark:border-white/10 dark:bg-zinc-900/70 dark:text-zinc-100 dark:hover:border-amber-500/35 dark:hover:bg-zinc-800/90 sm:self-auto"
                >
                    Tüm etkinlikler
                    <ArrowUpRight className="h-4 w-4 opacity-70" aria-hidden />
                </Link>
            </div>

            <ul className="mt-8 grid list-none grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-7">
                {types.map((row) => {
                    const visual = getEventListingTypeTileStyle(row.slug);
                    const Icon = visual?.Icon;
                    const href = route('events.index.by-type', { eventTypeSlug: row.slug });
                    const count = row.upcoming_count;

                    return (
                        <li key={row.slug} className="min-w-0">
                            <Link
                                href={href}
                                className={cn(
                                    'group relative flex h-full min-h-[8.5rem] flex-col overflow-hidden rounded-2xl border border-zinc-200/90 bg-white/90 p-4 shadow-sm transition',
                                    'hover:-translate-y-1 hover:border-amber-400/45 hover:shadow-lg hover:shadow-amber-500/10',
                                    'dark:border-white/[0.08] dark:bg-zinc-900/75 dark:hover:border-amber-500/30 dark:hover:shadow-black/40',
                                )}
                            >
                                <div
                                    className={cn(
                                        'pointer-events-none absolute inset-x-0 top-0 h-20 opacity-95 transition group-hover:opacity-100',
                                        visual?.surfaceClass ?? 'bg-gradient-to-br from-zinc-200/90 to-zinc-300/80 dark:from-zinc-800 dark:to-zinc-900',
                                    )}
                                    aria-hidden
                                />
                                <div className="relative flex flex-1 flex-col">
                                    <div
                                        className={cn(
                                            'mb-3 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/85 shadow-md ring-1 ring-white/70 dark:bg-zinc-950/50 dark:ring-white/10',
                                        )}
                                        aria-hidden
                                    >
                                        {Icon ? (
                                            <Icon
                                                className={cn(
                                                    'h-5 w-5',
                                                    visual?.iconClass ?? 'text-zinc-600 dark:text-zinc-300',
                                                )}
                                                strokeWidth={1.5}
                                            />
                                        ) : (
                                            <span className="text-lg">🎭</span>
                                        )}
                                    </div>
                                    <span className="line-clamp-2 font-display text-sm font-bold leading-snug text-zinc-900 dark:text-white">
                                        {row.label}
                                    </span>
                                    <span className="mt-auto pt-3 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                                        {count > 0 ? (
                                            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-amber-900 dark:bg-amber-400/15 dark:text-amber-200">
                                                {count} yaklaşan
                                            </span>
                                        ) : (
                                            <span className="text-zinc-400 dark:text-zinc-500">Listeyi aç →</span>
                                        )}
                                    </span>
                                </div>
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}
