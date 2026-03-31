import type { LucideIcon } from 'lucide-react';
import { Clapperboard, Disc3, Headphones, Mic2, Music2, PartyPopper, Radio, Sparkles, Ticket, Zap } from 'lucide-react';

import { cn } from '@/lib/cn';

/**
 * Liste / kart görseli yokken aynı düzeni koruyarak etkinlikten etkinliğe farklı ikon + gradient.
 * Sunucu değişmeden: id + slug ile deterministik (yenilemede aynı kalır).
 */
const VARIANTS: ReadonlyArray<{
    Icon: LucideIcon;
    surfaceClass: string;
    iconClass: string;
    errorShellClass: string;
    errorIconClass: string;
}> = [
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

function placeholderHash(eventId: number, slug: string): number {
    const s = `${eventId}\x1e${slug}`;
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return Math.abs(h);
}

export function getEventListingPlaceholderVariant(eventId: number, slug: string) {
    return VARIANTS[placeholderHash(eventId, slug) % VARIANTS.length]!;
}

export function EventListingHeroPlaceholder({
    eventId,
    slug,
    className,
    iconClassName,
}: Readonly<{
    eventId: number;
    slug: string;
    className?: string;
    iconClassName?: string;
}>) {
    const v = getEventListingPlaceholderVariant(eventId, slug);
    const Icon = v.Icon;

    return (
        <div className={cn('flex h-full w-full items-center justify-center', v.surfaceClass, className)}>
            <Icon
                className={cn('h-[2.35rem] w-[2.35rem] shrink-0 opacity-90 sm:h-14 sm:w-14', v.iconClass, iconClassName)}
                strokeWidth={1.35}
                aria-hidden
            />
        </div>
    );
}

/** Görsel yüklenemediğinde — koyu panel + aynı varyant ikonu + başlık. */
export function EventListingImageErrorFallback({
    eventId,
    slug,
    title,
    className,
}: Readonly<{
    eventId: number;
    slug: string;
    title: string;
    className?: string;
}>) {
    const v = getEventListingPlaceholderVariant(eventId, slug);
    const Icon = v.Icon;

    return (
        <div
            className={cn(
                'absolute inset-0 flex flex-col items-center justify-center gap-2 px-3 text-center',
                v.errorShellClass,
                className,
            )}
        >
            <Icon className={cn('h-10 w-10 shrink-0 opacity-95 sm:h-12 sm:w-12', v.errorIconClass)} strokeWidth={1.35} aria-hidden />
            <span className="line-clamp-4 max-w-[95%] text-balance break-words text-center font-display text-sm font-bold leading-tight text-white sm:text-base md:text-lg">
                {title}
            </span>
        </div>
    );
}
