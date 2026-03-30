import { CalendarRange } from 'lucide-react';
import { monthEventCountAriaLabel, weekEventCountAriaLabel } from '@/lib/weekEventCountTurkish';

type Variant = 'card' | 'slider';

interface Props {
    weekCount: number;
    /** Haftada yoksa takvim ayı içindeki yayınlanmış etkinlik sayısı */
    monthCount: number;
    variant?: Variant;
    className?: string;
}

/**
 * Önce önümüzdeki 7 gün, yoksa bu ay içindeki etkinlik sayısı — kapak üzerinde ince vurgu.
 */
export default function ThisWeekEventsBadge({
    weekCount,
    monthCount,
    variant = 'card',
    className = '',
}: Readonly<Props>) {
    const useWeek = weekCount > 0;
    const count = useWeek ? weekCount : monthCount;
    if (count <= 0) {
        return null;
    }

    const isSlider = variant === 'slider';
    const aria = useWeek ? weekEventCountAriaLabel(count) : monthEventCountAriaLabel(count);
    const periodShort = useWeek ? '7 gün' : 'bu ay';

    return (
        <div
            className={[
                'pointer-events-none absolute z-10 flex max-w-[min(100%,11rem)] items-center gap-1.5 rounded-full border border-white/18 bg-zinc-950/55 px-2 py-1 text-left shadow-md shadow-black/25 ring-1 ring-white/8 backdrop-blur-md dark:bg-black/50',
                isSlider ? 'left-2 top-2' : 'left-2 top-2 sm:left-3 sm:top-3 sm:gap-2 sm:px-2.5 sm:py-1.5',
                className,
            ].join(' ')}
            aria-label={aria}
            role="status"
        >
            <CalendarRange
                className={[
                    'shrink-0 text-emerald-300/90 opacity-95',
                    isSlider ? 'h-3 w-3' : 'h-3 w-3 sm:h-3.5 sm:w-3.5',
                ].join(' ')}
                strokeWidth={2}
                aria-hidden
            />
            <span className="min-w-0 leading-none text-white">
                <span
                    className={[
                        'font-semibold tabular-nums tracking-tight text-white',
                        isSlider ? 'text-[10px]' : 'text-[10px] sm:text-[11px]',
                    ].join(' ')}
                >
                    {count}
                </span>
                <span
                    className={[
                        'font-medium text-white/80',
                        isSlider ? 'text-[9px]' : 'text-[9px] sm:text-[10px]',
                    ].join(' ')}
                >
                    {' '}
                    etkinlik
                </span>
                <span className="mx-1 inline text-white/35" aria-hidden>
                    ·
                </span>
                <span
                    className={[
                        'font-medium tracking-tight text-white/65',
                        isSlider ? 'text-[9px]' : 'text-[9px] sm:text-[10px]',
                    ].join(' ')}
                >
                    {periodShort}
                </span>
            </span>
        </div>
    );
}
