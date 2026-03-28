import { Ticket } from 'lucide-react';
import { useId } from 'react';

/**
 * Etkinlik kapak/liste görseli yokken hero arka planı — mekân veya sanatçı fotoğrafı kullanılmaz.
 */
export default function EventHeroFallbackBackdrop() {
    const gid = useId().replace(/:/g, '');
    const spotA = `eventHeroSpotA-${gid}`;
    const spotB = `eventHeroSpotB-${gid}`;

    return (
        <div className="absolute inset-0 overflow-hidden" aria-hidden>
            {/* Derinlik */}
            <div className="absolute inset-0 bg-gradient-to-b from-stone-950 via-zinc-950 to-black" />
            {/* Üstten ılık spot */}
            <div className="pointer-events-none absolute -top-[45%] left-1/2 h-[min(95vh,42rem)] w-[min(140vw,80rem)] -translate-x-1/2 rounded-[100%] bg-gradient-to-b from-amber-500/35 via-amber-600/12 to-transparent blur-3xl" />
            {/* Yan dolgular */}
            <div className="pointer-events-none absolute -left-[20%] bottom-0 h-[70%] w-[70%] rounded-full bg-gradient-to-tr from-amber-600/20 via-transparent to-transparent blur-3xl" />
            <div className="pointer-events-none absolute -right-[15%] bottom-0 h-[60%] w-[60%] rounded-full bg-gradient-to-tl from-orange-500/15 via-rose-900/10 to-transparent blur-3xl" />
            {/* “Sahne” yatay çizgisi */}
            <div className="absolute bottom-[18%] left-[8%] right-[8%] h-px bg-gradient-to-r from-transparent via-amber-400/35 to-transparent" />
            <div className="absolute bottom-[18%] left-[8%] right-[8%] h-16 bg-gradient-to-t from-amber-500/5 to-transparent blur-sm" />
            {/* Izgara — çok düşük opaklık */}
            <div
                className="absolute inset-0 opacity-[0.12]"
                style={{
                    backgroundImage: `
                        linear-gradient(rgba(251,191,36,0.15) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(251,191,36,0.12) 1px, transparent 1px)
                    `,
                    backgroundSize: '48px 48px',
                }}
            />
            {/* SVG spot ışıkları */}
            <svg className="pointer-events-none absolute inset-0 h-full w-full text-amber-400/25" viewBox="0 0 1200 400" preserveAspectRatio="xMidYMid slice" fill="none">
                <defs>
                    <linearGradient id={spotA} x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="currentColor" stopOpacity="0.5" />
                        <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id={spotB} x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="currentColor" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                    </linearGradient>
                </defs>
                <path d="M280 -20 L420 420 L140 420 Z" fill={`url(#${spotA})`} className="text-amber-300/30" />
                <path d="M600 -40 L760 440 L440 440 Z" fill={`url(#${spotB})`} className="text-orange-200/25" />
                <path d="M920 -10 L1040 400 L800 400 Z" fill={`url(#${spotA})`} className="text-amber-400/20" />
            </svg>
            {/* Filigran bilet */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <Ticket
                    className="h-[min(42vw,13rem)] w-[min(42vw,13rem)] text-amber-500/[0.08] dark:text-amber-400/[0.09]"
                    strokeWidth={0.85}
                />
            </div>
            {/* Üst kenar vurgusu */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-amber-500/10 to-transparent" />
        </div>
    );
}
