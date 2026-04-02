import type { LucideIcon } from 'lucide-react';
import {
    Baby,
    Clapperboard,
    Disc3,
    Drama,
    GraduationCap,
    Headphones,
    Laugh,
    Mic2,
    Music2,
    PartyPopper,
    Radio,
    Sparkles,
    Theater,
    Ticket,
    Zap,
} from 'lucide-react';

import { cn } from '@/lib/cn';

/** Admin’deki `EventListingTypes` slug’ları ile aynı (app/Support/EventListingTypes.php). */
export const EVENT_LISTING_TYPE_SLUGS = [
    'konser',
    'sahne',
    'tiyatro',
    'festival',
    'stand-up',
    'cocuk-aktiviteleri',
    'workshop',
] as const;

export type EventListingTypeSlug = (typeof EVENT_LISTING_TYPE_SLUGS)[number];

type PlaceholderVariant = {
    Icon: LucideIcon;
    surfaceClass: string;
    iconClass: string;
    errorShellClass: string;
    errorIconClass: string;
};

/**
 * Etkinlik türü seçiliyse konuya uygun ikon; yoksa havuz + hash ile çeşitlilik.
 */
const BY_EVENT_TYPE: Readonly<Record<EventListingTypeSlug, PlaceholderVariant>> = {
    konser: {
        Icon: Mic2,
        surfaceClass:
            'bg-gradient-to-br from-amber-100/90 via-rose-950/25 to-zinc-900 dark:from-amber-950/35 dark:via-zinc-900 dark:to-zinc-950',
        iconClass: 'text-amber-700/95 dark:text-amber-300/95',
        errorShellClass: 'bg-gradient-to-br from-amber-950/90 via-neutral-900 to-neutral-950',
        errorIconClass: 'text-amber-200/95',
    },
    sahne: {
        Icon: Theater,
        surfaceClass:
            'bg-gradient-to-br from-violet-100/85 via-indigo-950/30 to-zinc-900 dark:from-violet-950/50 dark:via-zinc-900 dark:to-zinc-950',
        iconClass: 'text-violet-700/95 dark:text-violet-300/95',
        errorShellClass: 'bg-gradient-to-br from-violet-950/90 via-neutral-900 to-neutral-950',
        errorIconClass: 'text-violet-200/95',
    },
    tiyatro: {
        Icon: Drama,
        surfaceClass:
            'bg-gradient-to-br from-rose-100/80 via-red-950/25 to-zinc-900 dark:from-rose-950/45 dark:via-zinc-900 dark:to-zinc-950',
        iconClass: 'text-rose-700/95 dark:text-rose-300/95',
        errorShellClass: 'bg-gradient-to-br from-rose-950/90 via-neutral-900 to-neutral-950',
        errorIconClass: 'text-rose-200/95',
    },
    festival: {
        Icon: PartyPopper,
        surfaceClass:
            'bg-gradient-to-br from-fuchsia-100/75 via-orange-950/20 to-zinc-900 dark:from-fuchsia-950/40 dark:via-zinc-900 dark:to-zinc-950',
        iconClass: 'text-fuchsia-700/95 dark:text-fuchsia-300/95',
        errorShellClass: 'bg-gradient-to-br from-fuchsia-950/85 via-neutral-900 to-neutral-950',
        errorIconClass: 'text-fuchsia-200/95',
    },
    'stand-up': {
        Icon: Laugh,
        surfaceClass:
            'bg-gradient-to-br from-yellow-100/80 via-zinc-800/40 to-zinc-950 dark:from-yellow-950/35 dark:via-zinc-900 dark:to-zinc-950',
        iconClass: 'text-yellow-800/95 dark:text-yellow-300/95',
        errorShellClass: 'bg-gradient-to-br from-yellow-950/75 via-neutral-900 to-neutral-950',
        errorIconClass: 'text-yellow-200/95',
    },
    'cocuk-aktiviteleri': {
        Icon: Baby,
        surfaceClass:
            'bg-gradient-to-br from-sky-100/85 via-emerald-950/15 to-zinc-900 dark:from-sky-950/40 dark:via-zinc-900 dark:to-zinc-950',
        iconClass: 'text-sky-700/95 dark:text-sky-300/95',
        errorShellClass: 'bg-gradient-to-br from-sky-950/80 via-neutral-900 to-neutral-950',
        errorIconClass: 'text-sky-200/95',
    },
    workshop: {
        Icon: GraduationCap,
        surfaceClass:
            'bg-gradient-to-br from-emerald-100/80 via-teal-950/25 to-zinc-900 dark:from-emerald-950/40 dark:via-zinc-900 dark:to-zinc-950',
        iconClass: 'text-emerald-700/95 dark:text-emerald-300/95',
        errorShellClass: 'bg-gradient-to-br from-emerald-950/85 via-neutral-900 to-neutral-950',
        errorIconClass: 'text-emerald-200/95',
    },
};

const FALLBACK_VARIANTS: ReadonlyArray<PlaceholderVariant> = [
    {
        Icon: Mic2,
        surfaceClass:
            'bg-gradient-to-br from-amber-100/90 via-zinc-200 to-zinc-300 dark:from-zinc-800 dark:via-zinc-900 dark:to-zinc-950',
        iconClass: 'text-amber-600/95 dark:text-amber-300/95',
        errorShellClass: 'bg-gradient-to-br from-neutral-800 via-amber-950/40 to-neutral-950',
        errorIconClass: 'text-amber-200/95',
    },
    {
        Icon: Music2,
        surfaceClass:
            'bg-gradient-to-br from-violet-100/80 via-zinc-200 to-zinc-300 dark:from-violet-950/80 dark:via-zinc-900 dark:to-zinc-950',
        iconClass: 'text-violet-600/95 dark:text-violet-300/95',
        errorShellClass: 'bg-gradient-to-br from-violet-950/90 via-neutral-900 to-neutral-950',
        errorIconClass: 'text-violet-200/95',
    },
    {
        Icon: Disc3,
        surfaceClass:
            'bg-gradient-to-br from-rose-100/80 via-zinc-200 to-zinc-300 dark:from-rose-950/70 dark:via-zinc-900 dark:to-zinc-950',
        iconClass: 'text-rose-600/95 dark:text-rose-300/95',
        errorShellClass: 'bg-gradient-to-br from-rose-950/85 via-neutral-900 to-neutral-950',
        errorIconClass: 'text-rose-200/95',
    },
    {
        Icon: Sparkles,
        surfaceClass:
            'bg-gradient-to-br from-sky-100/85 via-zinc-200 to-zinc-300 dark:from-sky-950/75 dark:via-zinc-900 dark:to-zinc-950',
        iconClass: 'text-sky-600/95 dark:text-sky-300/95',
        errorShellClass: 'bg-gradient-to-br from-sky-950/80 via-neutral-900 to-neutral-950',
        errorIconClass: 'text-sky-200/95',
    },
    {
        Icon: Headphones,
        surfaceClass:
            'bg-gradient-to-br from-emerald-100/80 via-zinc-200 to-zinc-300 dark:from-emerald-950/70 dark:via-zinc-900 dark:to-zinc-950',
        iconClass: 'text-emerald-600/95 dark:text-emerald-300/95',
        errorShellClass: 'bg-gradient-to-br from-emerald-950/80 via-neutral-900 to-neutral-950',
        errorIconClass: 'text-emerald-200/95',
    },
    {
        Icon: Radio,
        surfaceClass:
            'bg-gradient-to-br from-fuchsia-100/75 via-zinc-200 to-zinc-300 dark:from-fuchsia-950/70 dark:via-zinc-900 dark:to-zinc-950',
        iconClass: 'text-fuchsia-600/95 dark:text-fuchsia-300/95',
        errorShellClass: 'bg-gradient-to-br from-fuchsia-950/85 via-neutral-900 to-neutral-950',
        errorIconClass: 'text-fuchsia-200/95',
    },
    {
        Icon: Ticket,
        surfaceClass:
            'bg-gradient-to-br from-orange-100/85 via-zinc-200 to-zinc-300 dark:from-orange-950/65 dark:via-zinc-900 dark:to-zinc-950',
        iconClass: 'text-orange-600/95 dark:text-orange-300/95',
        errorShellClass: 'bg-gradient-to-br from-orange-950/80 via-neutral-900 to-neutral-950',
        errorIconClass: 'text-orange-200/95',
    },
    {
        Icon: PartyPopper,
        surfaceClass:
            'bg-gradient-to-br from-indigo-100/80 via-zinc-200 to-zinc-300 dark:from-indigo-950/75 dark:via-zinc-900 dark:to-zinc-950',
        iconClass: 'text-indigo-600/95 dark:text-indigo-300/95',
        errorShellClass: 'bg-gradient-to-br from-indigo-950/85 via-neutral-900 to-neutral-950',
        errorIconClass: 'text-indigo-200/95',
    },
    {
        Icon: Zap,
        surfaceClass:
            'bg-gradient-to-br from-teal-100/80 via-zinc-200 to-zinc-300 dark:from-teal-950/70 dark:via-zinc-900 dark:to-zinc-950',
        iconClass: 'text-teal-600/95 dark:text-teal-300/95',
        errorShellClass: 'bg-gradient-to-br from-teal-950/80 via-neutral-900 to-neutral-950',
        errorIconClass: 'text-teal-200/95',
    },
    {
        Icon: Clapperboard,
        surfaceClass:
            'bg-gradient-to-br from-yellow-100/70 via-zinc-200 to-zinc-400/90 dark:from-yellow-950/50 dark:via-zinc-900 dark:to-zinc-950',
        iconClass: 'text-yellow-700/90 dark:text-yellow-300/95',
        errorShellClass: 'bg-gradient-to-br from-yellow-950/70 via-neutral-900 to-neutral-950',
        errorIconClass: 'text-yellow-200/95',
    },
];

function placeholderHash(eventId: number, slug: string, eventType: string | null | undefined): number {
    const typeKey = typeof eventType === 'string' ? eventType.trim() : '';
    const s = `${eventId}\x1e${slug}\x1et:${typeKey}`;
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return Math.abs(h);
}

function isEventListingTypeSlug(s: string): s is EventListingTypeSlug {
    return (EVENT_LISTING_TYPE_SLUGS as readonly string[]).includes(s);
}

/** Ana sayfa / gezinme karoları — tür slug’ına göre ikon ve gradient. */
export type EventListingTypeTileStyle = {
    Icon: LucideIcon;
    surfaceClass: string;
    iconClass: string;
};

export function getEventListingTypeTileStyle(slug: string): EventListingTypeTileStyle | null {
    const key = typeof slug === 'string' ? slug.trim() : '';
    if (key !== '' && isEventListingTypeSlug(key)) {
        const v = BY_EVENT_TYPE[key];

        return { Icon: v.Icon, surfaceClass: v.surfaceClass, iconClass: v.iconClass };
    }

    return null;
}

export function getEventListingPlaceholderVariant(eventId: number, slug: string, eventType?: string | null): PlaceholderVariant {
    const key = typeof eventType === 'string' ? eventType.trim() : '';
    if (key !== '' && isEventListingTypeSlug(key)) {
        return BY_EVENT_TYPE[key];
    }
    return FALLBACK_VARIANTS[placeholderHash(eventId, slug, key) % FALLBACK_VARIANTS.length]!;
}

export function EventListingHeroPlaceholder({
    eventId,
    slug,
    eventType = null,
    className,
    iconClassName,
}: Readonly<{
    eventId: number;
    slug: string;
    /** Admin «Etkinlik türü» slug’ı — yer tutucu konuya göre ikon */
    eventType?: string | null;
    className?: string;
    iconClassName?: string;
}>) {
    const v = getEventListingPlaceholderVariant(eventId, slug, eventType);
    const Icon = v.Icon;

    return (
        <div className={cn('flex h-full min-h-0 w-full items-center justify-center', v.surfaceClass, className)}>
            <div
                className={cn(
                    'pointer-events-none flex shrink-0 items-center justify-center rounded-full',
                    'bg-white/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] ring-2 ring-white/50',
                    'dark:bg-zinc-950/40 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] dark:ring-white/12',
                    'p-[0.85rem] sm:p-5',
                )}
                aria-hidden
            >
                <Icon
                    className={cn('h-[2.35rem] w-[2.35rem] shrink-0 opacity-95 sm:h-14 sm:w-14', v.iconClass, iconClassName)}
                    strokeWidth={1.35}
                    aria-hidden
                />
            </div>
        </div>
    );
}

/** Görsel yüklenemediğinde — koyu panel + aynı varyant ikonu + başlık. */
export function EventListingImageErrorFallback({
    eventId,
    slug,
    eventType = null,
    title,
    className,
}: Readonly<{
    eventId: number;
    slug: string;
    eventType?: string | null;
    title: string;
    className?: string;
}>) {
    const v = getEventListingPlaceholderVariant(eventId, slug, eventType);
    const Icon = v.Icon;

    return (
        <div
            className={cn(
                'absolute inset-0 flex flex-col items-center justify-center gap-2 px-3 text-center',
                v.errorShellClass,
                className,
            )}
        >
            <div
                className={cn(
                    'flex shrink-0 items-center justify-center rounded-full',
                    'bg-white/12 ring-2 ring-white/25',
                    'dark:bg-white/8 dark:ring-white/15',
                    'p-3 sm:p-4',
                )}
                aria-hidden
            >
                <Icon className={cn('h-10 w-10 shrink-0 opacity-95 sm:h-12 sm:w-12', v.errorIconClass)} strokeWidth={1.35} aria-hidden />
            </div>
            <span className="line-clamp-4 max-w-[95%] text-balance break-words text-center font-display text-sm font-bold leading-tight text-white sm:text-base md:text-lg">
                {title}
            </span>
        </div>
    );
}
