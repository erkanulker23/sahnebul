import { cn } from '@/lib/cn';
import { eventRelativeDayKind, eventRelativeDayTrLabel } from '@/lib/eventRelativeDay';

export type EventRelativeDayPlacement = 'overlay' | 'panel' | 'listTime' | 'compactLight' | 'compactDark';

/**
 * Bugün / Yarın etiketi — tarih satırına komşu; görsel üst köşede ayrı rozet kullanılmaz.
 */
export default function EventRelativeDayPill({
    startDate,
    placement,
    className,
}: Readonly<{
    startDate: string | null | undefined;
    placement: EventRelativeDayPlacement;
    className?: string;
}>) {
    const kind = eventRelativeDayKind(startDate);
    if (!kind) {
        return null;
    }
    const label = eventRelativeDayTrLabel(kind);
    const isToday = kind === 'today';

    const base = cn(
        'inline-flex max-w-full shrink-0 items-center justify-center rounded-full font-semibold uppercase tracking-wide',
        placement === 'listTime' && 'text-[9px] leading-none sm:text-[10px]',
        (placement === 'overlay' || placement === 'panel') && 'text-[9px] leading-tight sm:text-[10px]',
        (placement === 'compactLight' || placement === 'compactDark') && 'text-[9px] leading-none sm:text-[10px]',
        className,
    );

    if (placement === 'overlay') {
        return (
            <span
                className={cn(
                    base,
                    'px-2 py-0.5 shadow-sm ring-1 ring-white/30',
                    isToday
                        ? 'bg-emerald-300/95 text-emerald-950 dark:bg-emerald-400/95'
                        : 'bg-sky-300/95 text-sky-950 dark:bg-sky-400/95',
                )}
            >
                {label}
            </span>
        );
    }

    if (placement === 'panel') {
        return (
            <span
                className={cn(
                    base,
                    'px-2 py-0.5 shadow-sm ring-1 ring-black/10 dark:ring-white/10',
                    isToday
                        ? 'bg-emerald-600 text-white dark:bg-emerald-500'
                        : 'bg-sky-600 text-white dark:bg-sky-600',
                )}
            >
                {label}
            </span>
        );
    }

    if (placement === 'listTime') {
        return (
            <span
                className={cn(
                    base,
                    'px-2 py-0.5',
                    isToday
                        ? 'bg-emerald-500/15 text-emerald-800 ring-1 ring-emerald-500/25 dark:bg-emerald-400/15 dark:text-emerald-200 dark:ring-emerald-400/30'
                        : 'bg-sky-500/15 text-sky-900 ring-1 ring-sky-500/25 dark:bg-sky-400/15 dark:text-sky-100 dark:ring-sky-400/30',
                )}
            >
                {label}
            </span>
        );
    }

    if (placement === 'compactDark') {
        return (
            <span
                className={cn(
                    base,
                    'px-1.5 py-0.5',
                    isToday ? 'bg-emerald-500/25 text-emerald-100' : 'bg-sky-500/25 text-sky-100',
                )}
            >
                {label}
            </span>
        );
    }

    /* compactLight — arama / açık zemin */
    return (
        <span
            className={cn(
                base,
                'px-1.5 py-0.5',
                isToday
                    ? 'bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-100 dark:ring-emerald-500/30'
                    : 'bg-sky-100 text-sky-900 ring-1 ring-sky-200 dark:bg-sky-500/20 dark:text-sky-100 dark:ring-sky-500/30',
            )}
        >
            {label}
        </span>
    );
}
