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
    /** Yalnızca koyu tema — mutlaka `dark:` ile başlamalı (aksi halde açık modda da uygulanır). */
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
        tagline: 'Salon ve açık hava — yaklaşan konserleri tarih ve şehre göre süzün.',
        bg: 'from-amber-100/90 via-amber-50 to-zinc-100',
        bgDark: 'dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950',
        accent: 'text-zinc-900',
        accentDark: 'dark:text-white',
        decorations: (
            <>
                <div
                    className="pointer-events-none absolute -right-8 top-0 h-48 w-48 rounded-full bg-amber-400/35 blur-2xl dark:bg-amber-500/10 sm:h-56 sm:w-56"
                    aria-hidden
                />
                <svg
                    className="absolute bottom-4 right-[6%] h-20 w-[min(42vw,200px)] text-amber-700/70 dark:text-amber-500/25 sm:bottom-6 sm:h-24"
                    viewBox="0 0 200 48"
                    fill="none"
                    aria-hidden
                >
                    <path d="M4 40V8M24 40V16M44 40V4M64 40V20M84 40V12M104 40V24M124 40V8M144 40V18M164 40V6M184 40V22" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
                <svg
                    className="absolute left-4 top-1/2 h-24 w-24 -translate-y-1/2 text-zinc-500/70 dark:text-zinc-600/50 sm:left-8 sm:h-28 sm:w-28"
                    viewBox="0 0 80 80"
                    fill="none"
                    aria-hidden
                >
                    <circle cx="40" cy="40" r="28" stroke="currentColor" strokeWidth="1.5" opacity="0.85" />
                    <circle cx="40" cy="40" r="18" stroke="currentColor" strokeWidth="1.5" opacity="0.65" />
                    <circle cx="40" cy="40" r="8" fill="currentColor" opacity="0.5" />
                </svg>
                <div
                    className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-amber-600/55 to-transparent dark:via-amber-400/25"
                    aria-hidden
                />
            </>
        ),
    },
    sahne: {
        tagline: 'Gösteri ve performans geceleri — tiyatro dışı sahne programını keşfedin.',
        bg: 'from-amber-100/80 via-stone-200/70 to-zinc-100',
        bgDark: 'dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950',
        accent: 'text-zinc-900',
        accentDark: 'dark:text-amber-50',
        decorations: (
            <>
                <svg
                    className="pointer-events-none absolute inset-0 text-amber-600/28 dark:text-amber-400/10"
                    viewBox="0 0 400 120"
                    preserveAspectRatio="none"
                    aria-hidden
                >
                    <path d="M120 0 L200 120 L80 120 Z" fill="currentColor" />
                    <path d="M200 0 L280 120 L120 120 Z" fill="currentColor" opacity="0.65" />
                    <path d="M280 0 L360 120 L200 120 Z" fill="currentColor" opacity="0.45" />
                </svg>
                <div
                    className="pointer-events-none absolute inset-x-0 bottom-0 h-[38%] bg-gradient-to-t from-zinc-800/12 to-transparent dark:from-black/40 dark:to-transparent"
                    aria-hidden
                />
                <svg
                    className="absolute bottom-0 left-0 right-0 h-16 text-zinc-700/50 dark:text-zinc-950/80"
                    viewBox="0 0 400 48"
                    preserveAspectRatio="none"
                    aria-hidden
                >
                    <path d="M0 8 L400 8 L400 48 L0 48 Z" fill="currentColor" opacity="0.55" />
                    <path d="M0 12 L400 12" stroke="currentColor" strokeOpacity="0.65" strokeWidth="1" />
                </svg>
                <div
                    className="pointer-events-none absolute bottom-3 left-1/2 h-1 w-[min(72vw,28rem)] -translate-x-1/2 rounded-full bg-gradient-to-r from-transparent via-amber-600/70 to-transparent dark:via-amber-400/35"
                    aria-hidden
                />
            </>
        ),
    },
    tiyatro: {
        tagline: 'Oyunlar, klasik ve çağdaş tiyatro — programı tek yerden izleyin.',
        bg: 'from-stone-200 via-amber-100/80 to-zinc-100',
        bgDark: 'dark:from-zinc-900 dark:via-stone-950 dark:to-zinc-950',
        accent: 'text-zinc-900',
        accentDark: 'dark:text-stone-100',
        decorations: (
            <>
                <svg
                    className="absolute right-[8%] top-4 h-28 w-28 text-zinc-700/55 dark:text-stone-300/15 sm:h-36 sm:w-36"
                    viewBox="0 0 100 100"
                    aria-hidden
                >
                    <ellipse cx="50" cy="38" rx="22" ry="28" fill="none" stroke="currentColor" strokeWidth="3" />
                    <path d="M28 38 Q50 58 72 38" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    <path d="M36 32h10M54 32h10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
                <svg
                    className="absolute -left-2 bottom-2 h-24 w-32 text-amber-800/50 dark:text-amber-500/15"
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
        bg: 'from-sky-200/90 via-emerald-100 to-amber-100/90',
        bgDark: 'dark:from-sky-950/60 dark:via-emerald-950/40 dark:to-zinc-950',
        accent: 'text-emerald-950',
        accentDark: 'dark:text-emerald-200',
        decorations: (
            <>
                <svg
                    className="absolute right-4 top-3 h-32 w-40 text-emerald-700/60 dark:text-emerald-400/18"
                    viewBox="0 0 100 80"
                    aria-hidden
                >
                    <path d="M10 60 L20 20 L30 60 L40 25 L50 60 L60 22 L70 60 L80 28 L90 60" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
                </svg>
                <svg
                    className="absolute left-6 top-8 h-20 w-20 text-sky-600/55 dark:text-sky-400/18"
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
        bg: 'from-amber-200/90 via-orange-100/80 to-zinc-100',
        bgDark: 'dark:from-amber-950/50 dark:via-zinc-900 dark:to-zinc-950',
        accent: 'text-amber-950',
        accentDark: 'dark:text-amber-200',
        decorations: (
            <>
                <div
                    className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-48 w-48 -translate-x-1/2 -translate-y-[60%] rounded-full border-[3px] border-amber-700/45 dark:border-amber-400/15"
                    aria-hidden
                />
                <svg
                    className="absolute bottom-2 left-[4%] h-24 w-10 text-zinc-800/60 dark:text-zinc-200/15 max-sm:left-1 max-sm:opacity-40"
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
        bg: 'from-sky-100 via-amber-100/90 to-lime-100/80',
        bgDark: 'dark:from-sky-950/40 dark:via-amber-950/30 dark:to-zinc-950',
        accent: 'text-sky-950',
        accentDark: 'dark:text-sky-100',
        decorations: (
            <>
                <svg
                    className="absolute -right-2 top-2 h-28 w-36 text-sky-600/65 dark:text-sky-400/15 sm:h-36 sm:w-44"
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
                    <g className="opacity-[0.55] dark:opacity-[0.32]">
                        <circle cx="98" cy="28" r="14" fill="currentColor" />
                    </g>
                </svg>
                <svg
                    className="absolute bottom-0 left-0 right-0 h-14 text-lime-700/55 dark:text-lime-400/12"
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
                    className="absolute left-[10%] top-6 h-16 w-16 text-amber-600/70 dark:text-amber-400/18"
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
        bg: 'from-teal-100 via-cyan-100/90 to-zinc-100',
        bgDark: 'dark:from-teal-950/45 dark:via-zinc-900 dark:to-zinc-950',
        accent: 'text-teal-950',
        accentDark: 'dark:text-teal-100',
        decorations: (
            <>
                <svg
                    className="absolute right-[12%] top-6 h-24 w-24 text-teal-800/55 dark:text-teal-400/15"
                    viewBox="0 0 80 80"
                    aria-hidden
                >
                    <path d="M40 12 L52 36 L40 32 L28 36 Z" fill="currentColor" />
                    <rect x="34" y="32" width="12" height="28" rx="2" fill="currentColor" className="opacity-75 dark:opacity-60" />
                </svg>
                <svg
                    className="absolute left-8 bottom-6 h-20 w-28 text-cyan-700/60 dark:text-cyan-400/12"
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
                'relative isolate w-full overflow-hidden border-b border-zinc-300/90 bg-gradient-to-br shadow-[inset_0_1px_0_0_rgba(255,255,255,0.65)] dark:border-white/[0.08] dark:shadow-none',
                theme.bg,
                theme.bgDark,
            )}
            aria-labelledby="event-type-hero-heading"
        >
            <div className="pointer-events-none absolute inset-0 opacity-100 dark:opacity-[0.88]" aria-hidden>
                {theme.decorations}
            </div>
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_70%_at_50%_-30%,rgba(245,158,11,0.28),transparent)] dark:bg-[radial-gradient(ellipse_70%_50%_at_50%_-10%,rgba(245,158,11,0.08),transparent)]" />
            <div className="relative z-10 mx-auto flex min-h-[168px] max-w-7xl flex-col justify-center px-4 py-8 sm:min-h-[200px] sm:px-6 sm:py-10 lg:min-h-[220px] lg:px-8">
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-400/90">Etkinlik türü</p>
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
                <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-zinc-800 dark:text-zinc-300/95 sm:text-base">
                    {theme.tagline}
                </p>
            </div>
        </section>
    );
}
