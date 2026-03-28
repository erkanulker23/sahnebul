import { cn } from '@/lib/cn';
import { eventRelativeDayKind, eventRelativeDayTrLabel } from '@/lib/eventRelativeDay';

export type EventRelativeDayPlacement = 'overlay' | 'panel' | 'listTime' | 'compactLight' | 'compactDark';

function toneClasses(placement: EventRelativeDayPlacement, variant: 'today' | 'tomorrow' | 'ongoing'): string {
    if (variant === 'ongoing') {
        if (placement === 'overlay') {
            return 'self-start bg-amber-950/65 px-2.5 py-1 text-amber-50 shadow-[0_2px_14px_rgba(0,0,0,0.45)] ring-2 ring-amber-400/60 backdrop-blur-md';
        }
        if (placement === 'panel') {
            return 'self-start bg-amber-500/[0.22] px-2.5 py-1 text-amber-950 ring-2 ring-amber-500/45 dark:bg-amber-500/[0.28] dark:text-amber-50 dark:ring-amber-400/50';
        }
        if (placement === 'listTime') {
            return 'bg-amber-500/[0.2] px-2 py-0.5 text-amber-950 ring-2 ring-amber-500/35 dark:bg-amber-500/[0.18] dark:text-amber-50 dark:ring-amber-400/45';
        }
        if (placement === 'compactDark') {
            return 'bg-amber-500/28 px-2 py-0.5 text-amber-50 ring-2 ring-amber-400/45';
        }
        return 'bg-amber-500/[0.18] px-2 py-0.5 text-amber-950 ring-2 ring-amber-600/30 dark:bg-amber-400/[0.2] dark:text-amber-50 dark:ring-amber-400/45';
    }
    const isToday = variant === 'today';
    if (placement === 'overlay') {
        return isToday
            ? 'self-start bg-emerald-950/55 px-2.5 py-1 text-emerald-50 shadow-[0_2px_14px_rgba(0,0,0,0.45)] ring-2 ring-emerald-400/55 backdrop-blur-md'
            : 'self-start bg-sky-950/55 px-2.5 py-1 text-sky-50 shadow-[0_2px_14px_rgba(0,0,0,0.45)] ring-2 ring-sky-400/55 backdrop-blur-md';
    }
    if (placement === 'panel') {
        return isToday
            ? 'self-start bg-emerald-500/[0.18] px-2.5 py-1 text-emerald-900 ring-2 ring-emerald-500/35 dark:bg-emerald-500/[0.22] dark:text-emerald-50 dark:ring-emerald-400/45'
            : 'self-start bg-sky-500/[0.18] px-2.5 py-1 text-sky-950 ring-2 ring-sky-500/35 dark:bg-sky-500/[0.22] dark:text-sky-50 dark:ring-sky-400/45';
    }
    if (placement === 'listTime') {
        return isToday
            ? 'bg-emerald-500/[0.14] px-2 py-0.5 text-emerald-900 ring-2 ring-emerald-500/28 dark:bg-emerald-400/[0.14] dark:text-emerald-100 dark:ring-emerald-400/35'
            : 'bg-sky-500/[0.14] px-2 py-0.5 text-sky-950 ring-2 ring-sky-500/28 dark:bg-sky-400/[0.14] dark:text-sky-50 dark:ring-sky-400/35';
    }
    if (placement === 'compactDark') {
        return isToday
            ? 'bg-emerald-500/22 px-2 py-0.5 text-emerald-50 ring-2 ring-emerald-400/35'
            : 'bg-sky-500/22 px-2 py-0.5 text-sky-50 ring-2 ring-sky-400/35';
    }
    return isToday
        ? 'bg-emerald-500/[0.14] px-2 py-0.5 text-emerald-950 ring-2 ring-emerald-600/25 dark:bg-emerald-400/[0.18] dark:text-emerald-50 dark:ring-emerald-400/40'
        : 'bg-sky-500/[0.14] px-2 py-0.5 text-sky-950 ring-2 ring-sky-600/25 dark:bg-sky-400/[0.18] dark:text-sky-50 dark:ring-sky-400/40';
}

function sizeClasses(placement: EventRelativeDayPlacement): string {
    if (placement === 'listTime') {
        return 'text-[10px] leading-tight sm:text-[11px]';
    }
    if (placement === 'overlay' || placement === 'panel') {
        return 'text-[11px] leading-snug sm:text-[12px]';
    }
    return 'text-[10px] leading-tight sm:text-[11px]';
}

/**
 * Bugün / Yarın — kart ve listelerde hafif cam / ince çerçeve; afiş üzerinde üst köşede kullanılmalı (PublicEventTicketCard).
 */
export default function EventRelativeDayPill({
    startDate,
    endDate,
    placement,
    className,
}: Readonly<{
    startDate: string | null | undefined;
    /** Bitiş ISO — geceyi aşan etkinliklerde “Devam ediyor” için gerekli */
    endDate?: string | null;
    placement: EventRelativeDayPlacement;
    className?: string;
}>) {
    const kind = eventRelativeDayKind(startDate, endDate);
    if (!kind) {
        return null;
    }
    const label = eventRelativeDayTrLabel(kind);
    const variant = kind === 'ongoing' ? 'ongoing' : kind === 'today' ? 'today' : 'tomorrow';

    return (
        <span
            className={cn(
                'inline-flex max-w-max shrink-0 items-center justify-center rounded-full font-semibold tracking-tight',
                sizeClasses(placement),
                toneClasses(placement, variant),
                className,
            )}
        >
            {label}
        </span>
    );
}
