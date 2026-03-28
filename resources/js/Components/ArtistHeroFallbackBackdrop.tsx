import { Mic2 } from 'lucide-react';
import { useId } from 'react';

/**
 * Sanatçı kapak (banner) görseli yokken hero arka planı — sahne ışığı + mikrofon teması (etkinlik sayfasındaki mantıkla uyumlu).
 */
export default function ArtistHeroFallbackBackdrop() {
    const gid = useId().replace(/:/g, '');
    const spotA = `artistHeroSpotA-${gid}`;
    const spotB = `artistHeroSpotB-${gid}`;

    return (
        <div className="absolute inset-0 overflow-hidden" aria-hidden>
            <div className="absolute inset-0 bg-gradient-to-b from-zinc-950 via-zinc-900 to-black dark:from-stone-950 dark:via-zinc-950 dark:to-black" />
            <div className="pointer-events-none absolute -top-[42%] left-1/2 h-[min(92vh,40rem)] w-[min(130vw,76rem)] -translate-x-1/2 rounded-[100%] bg-gradient-to-b from-fuchsia-500/25 via-amber-500/18 to-transparent blur-3xl dark:from-fuchsia-500/30 dark:via-amber-500/22" />
            <div className="pointer-events-none absolute -left-[18%] bottom-0 h-[68%] w-[65%] rounded-full bg-gradient-to-tr from-violet-600/18 via-transparent to-transparent blur-3xl dark:from-violet-500/22" />
            <div className="pointer-events-none absolute -right-[12%] bottom-0 h-[58%] w-[58%] rounded-full bg-gradient-to-tl from-amber-500/20 via-rose-500/12 to-transparent blur-3xl" />
            <div className="absolute bottom-[16%] left-[6%] right-[6%] h-px bg-gradient-to-r from-transparent via-amber-400/40 to-transparent dark:via-amber-300/35" />
            <div className="absolute bottom-[16%] left-[6%] right-[6%] h-20 bg-gradient-to-t from-fuchsia-500/8 via-amber-500/6 to-transparent blur-md dark:from-fuchsia-500/10" />
            <div
                className="absolute inset-0 opacity-[0.1] dark:opacity-[0.12]"
                style={{
                    backgroundImage: `
                        linear-gradient(rgba(251,191,36,0.14) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(167,139,250,0.12) 1px, transparent 1px)
                    `,
                    backgroundSize: '44px 44px',
                }}
            />
            <svg className="pointer-events-none absolute inset-0 h-full w-full text-amber-400/22 dark:text-amber-300/28" viewBox="0 0 1200 400" preserveAspectRatio="xMidYMid slice" fill="none">
                <defs>
                    <linearGradient id={spotA} x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="currentColor" stopOpacity="0.45" />
                        <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id={spotB} x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="currentColor" stopOpacity="0.32" />
                        <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                    </linearGradient>
                </defs>
                <path d="M260 -24 L400 430 L120 430 Z" fill={`url(#${spotA})`} className="text-violet-300/25 dark:text-violet-200/30" />
                <path d="M580 -36 L740 450 L420 450 Z" fill={`url(#${spotB})`} className="text-amber-200/28" />
                <path d="M900 -8 L1020 410 L780 410 Z" fill={`url(#${spotA})`} className="text-fuchsia-300/22 dark:text-fuchsia-200/26" />
            </svg>
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <Mic2
                    className="h-[min(38vw,11rem)] w-[min(38vw,11rem)] text-amber-500/[0.07] dark:text-amber-400/[0.09]"
                    strokeWidth={0.9}
                />
            </div>
            <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-amber-500/8 via-fuchsia-500/5 to-transparent dark:from-amber-500/12" />
        </div>
    );
}
