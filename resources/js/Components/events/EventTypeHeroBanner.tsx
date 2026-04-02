import { cn } from '@/lib/cn';
import type { ReactNode } from 'react';

export type EventTypeHeroSlug =
    | 'konser'
    | 'sahne'
    | 'tiyatro'
    | 'festival'
    | 'stand-up'
    | 'cocuk-aktiviteleri'
    | 'workshop';

type HeroTheme = {
    tagline: string;
    /** bg-gradient-to-br için from/via/to (light) */
    bg: string;
    /** bg-gradient-to-br için dark:from / dark:via / dark:to */
    bgDark: string;
    accent: string;
    accentDark: string;
    decorations: ReactNode;
};

function isHeroSlug(s: string): s is EventTypeHeroSlug {
    return (
        s === 'konser' ||
        s === 'sahne' ||
        s === 'tiyatro' ||
        s === 'festival' ||
        s === 'stand-up' ||
        s === 'cocuk-aktiviteleri' ||
        s === 'workshop'
    );
}

const themes: Record<EventTypeHeroSlug, HeroTheme> = {
    konser: {
        tagline: 'Canlı müzik, salon ve açık hava — yaklaşan konserleri keşfedin.',
        bg: 'from-violet-100/90 via-fuchsia-50 to-amber-50',
        bgDark: 'dark:from-violet-950/80 dark:via-zinc-900 dark:to-zinc-950',
        accent: 'text-violet-800',
        accentDark: 'text-violet-200',
        decorations: (
            <>
                <svg
                    className="absolute -right-4 top-2 h-36 w-44 text-violet-400/35 dark:text-violet-400/20 sm:h-44 sm:w-52"
                    viewBox="0 0 120 100"
                    fill="none"
                    aria-hidden
                >
                    <path
                        d="M8 78c12-8 28-6 40 2s24 4 36-6"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                    />
                    <circle cx="28" cy="32" r="6" fill="currentColor" />
                    <path d="M52 28l8 14M72 26l-6 16M88 30l4 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
                <svg
                    className="absolute -left-6 bottom-0 h-32 w-40 text-amber-500/30 dark:text-amber-400/15"
                    viewBox="0 0 100 80"
                    fill="none"
                    aria-hidden
                >
                    <ellipse cx="50" cy="70" rx="42" ry="8" fill="currentColor" />
                    <path d="M20 40 Q50 8 80 40" stroke="currentColor" strokeWidth="4" strokeLinecap="round" fill="none" />
                </svg>
            </>
        ),
    },
    sahne: {
        tagline: 'Tiyatro dışı sahne gösterileri, performanslar ve özel geceler.',
        bg: 'from-rose-100/85 via-amber-50 to-zinc-100',
        bgDark: 'dark:from-rose-950/70 dark:via-zinc-900 dark:to-zinc-950',
        accent: 'text-rose-900',
        accentDark: 'text-rose-100',
        decorations: (
            <>
                <svg
                    className="absolute inset-y-0 left-0 w-[38%] max-w-sm text-rose-700/25 dark:text-rose-400/15"
                    viewBox="0 0 100 120"
                    preserveAspectRatio="none"
                    aria-hidden
                >
                    <path d="M0 0 L42 0 L38 120 L0 120 Z" fill="currentColor" />
                    <path d="M0 0 L38 4 L34 120 L0 120 Z" fill="currentColor" opacity="0.5" />
                </svg>
                <svg
                    className="absolute inset-y-0 right-0 w-[38%] max-w-sm text-rose-700/25 dark:text-rose-400/15"
                    viewBox="0 0 100 120"
                    preserveAspectRatio="none"
                    aria-hidden
                >
                    <path d="M100 0 L58 0 L62 120 L100 120 Z" fill="currentColor" />
                    <path d="M100 0 L62 4 L66 120 L100 120 Z" fill="currentColor" opacity="0.5" />
                </svg>
                <div
                    className="pointer-events-none absolute left-1/2 top-1/2 h-[min(90%,220px)] w-[min(55vw,320px)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-400/20 blur-3xl dark:bg-amber-500/10"
                    aria-hidden
                />
                <svg
                    className="absolute bottom-3 left-1/2 h-16 w-16 -translate-x-1/2 text-amber-600/40 dark:text-amber-400/25"
                    viewBox="0 0 64 64"
                    aria-hidden
                >
                    <path
                        d="M32 8 L38 26 L56 26 L42 36 L48 54 L32 44 L16 54 L22 36 L8 26 L26 26 Z"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinejoin="round"
                    />
                </svg>
            </>
        ),
    },
    tiyatro: {
        tagline: 'Oyunlar, klasik ve çağdaş tiyatro — programı tek yerden izleyin.',
        bg: 'from-zinc-200/90 via-stone-100 to-amber-50/80',
        bgDark: 'dark:from-zinc-900 dark:via-stone-950 dark:to-zinc-950',
        accent: 'text-zinc-900',
        accentDark: 'text-stone-100',
        decorations: (
            <>
                <svg
                    className="absolute right-[8%] top-4 h-28 w-28 text-zinc-800/20 dark:text-stone-300/15 sm:h-36 sm:w-36"
                    viewBox="0 0 100 100"
                    aria-hidden
                >
                    <ellipse cx="50" cy="38" rx="22" ry="28" fill="none" stroke="currentColor" strokeWidth="3" />
                    <path d="M28 38 Q50 58 72 38" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    <path d="M36 32h10M54 32h10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
                <svg
                    className="absolute -left-2 bottom-2 h-24 w-32 text-amber-700/25 dark:text-amber-500/15"
                    viewBox="0 0 80 60"
                    aria-hidden
                >
                    <path d="M4 52 L76 52 M40 52 L40 12 M20 12 L60 12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    <circle cx="40" cy="8" r="5" fill="currentColor" />
                </svg>
            </>
        ),
    },
    festival: {
        tagline: 'Çok günlük programlar, sahne ve açık alan etkinlikleri.',
        bg: 'from-sky-100/80 via-emerald-50 to-amber-50',
        bgDark: 'dark:from-sky-950/60 dark:via-emerald-950/40 dark:to-zinc-950',
        accent: 'text-emerald-900',
        accentDark: 'text-emerald-200',
        decorations: (
            <>
                <svg
                    className="absolute right-4 top-3 h-32 w-40 text-emerald-500/30 dark:text-emerald-400/18"
                    viewBox="0 0 100 80"
                    aria-hidden
                >
                    <path d="M10 60 L20 20 L30 60 L40 25 L50 60 L60 22 L70 60 L80 28 L90 60" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
                </svg>
                <svg
                    className="absolute left-6 top-8 h-20 w-20 text-sky-500/35 dark:text-sky-400/18"
                    viewBox="0 0 60 60"
                    aria-hidden
                >
                    <path d="M8 52 L52 8 M12 8 L52 48" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
            </>
        ),
    },
    'stand-up': {
        tagline: 'Tek mikrofon, güncel şovlar — komedi gecelerini yakalayın.',
        bg: 'from-amber-100/85 via-orange-50 to-zinc-50',
        bgDark: 'dark:from-amber-950/50 dark:via-zinc-900 dark:to-zinc-950',
        accent: 'text-amber-950',
        accentDark: 'text-amber-200',
        decorations: (
            <>
                <div
                    className="pointer-events-none absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-[60%] rounded-full border-4 border-amber-500/25 dark:border-amber-400/15"
                    aria-hidden
                />
                <svg
                    className="absolute bottom-2 left-[18%] h-24 w-10 text-zinc-800/30 dark:text-zinc-200/15"
                    viewBox="0 0 40 96"
                    aria-hidden
                >
                    <path d="M20 4v72" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                    <circle cx="20" cy="88" r="6" fill="currentColor" />
                </svg>
            </>
        ),
    },
    'cocuk-aktiviteleri': {
        tagline: 'Aile dostu gösteriler ve atölyeler — çocuklar için güvenli keşif.',
        bg: 'from-amber-50 via-sky-50 to-lime-50/90',
        bgDark: 'dark:from-sky-950/40 dark:via-amber-950/30 dark:to-zinc-950',
        accent: 'text-sky-900',
        accentDark: 'text-sky-100',
        decorations: (
            <>
                <svg
                    className="absolute -right-2 top-2 h-28 w-36 text-sky-400/40 dark:text-sky-400/15 sm:h-36 sm:w-44"
                    viewBox="0 0 120 90"
                    aria-hidden
                >
                    <path
                        d="M12 48 Q30 20 48 48 T84 48"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="4"
                        strokeLinecap="round"
                    />
                    <circle cx="98" cy="28" r="14" fill="currentColor" opacity="0.35" />
                </svg>
                <svg
                    className="absolute bottom-0 left-0 right-0 h-14 text-lime-600/35 dark:text-lime-400/12"
                    viewBox="0 0 400 40"
                    preserveAspectRatio="none"
                    aria-hidden
                >
                    <path
                        d="M0 28 Q40 8 80 28 T160 28 T240 22 T320 28 T400 24 L400 40 L0 40 Z"
                        fill="currentColor"
                    />
                </svg>
                <svg
                    className="absolute left-[10%] top-6 h-16 w-16 text-amber-500/45 dark:text-amber-400/18"
                    viewBox="0 0 64 64"
                    aria-hidden
                >
                    <circle cx="32" cy="32" r="16" fill="none" stroke="currentColor" strokeWidth="3" />
                    <path d="M18 32h28M32 18v28" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
            </>
        ),
    },
    workshop: {
        tagline: 'Öğretici seanslar ve ustalık sınıfları — kayıtlı programlar.',
        bg: 'from-teal-50 via-cyan-50/90 to-zinc-50',
        bgDark: 'dark:from-teal-950/45 dark:via-zinc-900 dark:to-zinc-950',
        accent: 'text-teal-900',
        accentDark: 'text-teal-100',
        decorations: (
            <>
                <svg
                    className="absolute right-[12%] top-6 h-24 w-24 text-teal-600/30 dark:text-teal-400/15"
                    viewBox="0 0 80 80"
                    aria-hidden
                >
                    <path d="M40 12 L52 36 L40 32 L28 36 Z" fill="currentColor" />
                    <rect x="34" y="32" width="12" height="28" rx="2" fill="currentColor" opacity="0.6" />
                </svg>
                <svg
                    className="absolute left-8 bottom-6 h-20 w-28 text-cyan-500/35 dark:text-cyan-400/12"
                    viewBox="0 0 100 60"
                    aria-hidden
                >
                    <path d="M8 44 L32 20 L56 36 L92 8" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
                    <circle cx="32" cy="20" r="4" fill="currentColor" />
                </svg>
            </>
        ),
    },
};

export function EventTypeHeroBanner({
    eventTypeSlug,
    typeLabel,
    cityName,
}: Readonly<{
    eventTypeSlug: string | undefined;
    typeLabel: string | undefined;
    /** Şehir + tür hub sayfalarında opsiyonel */
    cityName?: string | undefined;
}>) {
    const slug = eventTypeSlug?.trim() ?? '';
    if (!slug || !isHeroSlug(slug)) {
        return null;
    }
    const theme = themes[slug];
    const title = typeLabel?.trim() || slug;
    const subtitle = cityName?.trim()
        ? `${cityName} · ${title} etkinlikleri`
        : `${title} etkinlikleri`;

    return (
        <section
            className={cn(
                'relative isolate w-full overflow-hidden border-b border-zinc-200/80 bg-gradient-to-br dark:border-white/[0.08]',
                theme.bg,
                theme.bgDark,
            )}
            aria-labelledby="event-type-hero-heading"
        >
            <div className="pointer-events-none absolute inset-0 opacity-[0.65] dark:opacity-90" aria-hidden>
                {theme.decorations}
            </div>
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(245,158,11,0.12),transparent)] dark:bg-[radial-gradient(ellipse_70%_50%_at_50%_-10%,rgba(245,158,11,0.08),transparent)]" />
            <div className="relative mx-auto flex min-h-[168px] max-w-7xl flex-col justify-center px-4 py-8 sm:min-h-[200px] sm:px-6 sm:py-10 lg:min-h-[220px] lg:px-8">
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-700/90 dark:text-amber-400/90">Etkinlik türü</p>
                <h2
                    id="event-type-hero-heading"
                    className={cn(
                        'mt-2 max-w-3xl font-display text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl',
                        theme.accent,
                        theme.accentDark,
                    )}
                >
                    {subtitle}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-700/95 dark:text-zinc-300/95 sm:text-base">
                    {theme.tagline}
                </p>
            </div>
        </section>
    );
}
