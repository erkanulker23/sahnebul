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
 * Önce bu hafta, yoksa bu ay içindeki etkinlik sayısı — kapak görseli üzerinde vurgu.
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
    const periodLabel = useWeek ? 'Bu hafta' : 'Bu ay';
    /**
     * Gradient’i inline veriyoruz: (1) Tailwind önbelleği / derleme gecikmesinde turuncu kalmasın
     * (2) lime/açık sarımsı yeşil yerine net zümrüt–teal (şeritte “hâlâ sarı” şikâyetini önler)
     */
    const surfaceStyle = useWeek
        ? {
              background: 'linear-gradient(145deg, #059669 0%, #047857 42%, #0f766e 100%)',
              boxShadow: '0 8px 22px -4px rgba(6, 78, 59, 0.55), inset 0 1px 0 rgba(255,255,255,0.12)',
          }
        : {
              background: 'linear-gradient(145deg, #0d9488 0%, #0f766e 45%, #14532d 100%)',
              boxShadow: '0 8px 22px -4px rgba(20, 83, 45, 0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
          };

    return (
        <div
            className={[
                'pointer-events-none absolute z-10 flex flex-col rounded-xl border border-emerald-200/40 p-2.5 text-left text-white shadow-xl backdrop-blur-sm',
                isSlider ? 'left-2 top-2 max-w-[min(100%,9rem)]' : 'left-2 top-2 sm:left-3 sm:top-3',
                className,
            ].join(' ')}
            style={surfaceStyle}
            aria-label={aria}
        >
            <span
                className={[
                    'font-semibold uppercase leading-none tracking-[0.14em] text-emerald-50 drop-shadow-[0_1px_2px_rgba(0,0,0,0.75)]',
                    isSlider ? 'text-[8px]' : 'text-[9px] sm:text-[10px]',
                ].join(' ')}
            >
                {periodLabel}
            </span>
            <span
                className={[
                    'mt-1 font-display font-bold leading-none tabular-nums tracking-tight text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)]',
                    isSlider ? 'text-sm' : 'text-base sm:text-lg',
                ].join(' ')}
            >
                {count}
                {' '}
                <span className="font-semibold text-emerald-50/95">etkinlik</span>
            </span>
        </div>
    );
}
