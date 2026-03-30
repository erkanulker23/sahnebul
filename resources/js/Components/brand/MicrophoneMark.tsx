import { cn } from '@/lib/cn';
import { useId, type SVGAttributes } from 'react';

/**
 * Sahnebul mark — Lucide "Mic" bazlı, yüksek kontrast ikon.
 * (Fav/ikon ile benzer görsel dili korumak için aynı formu kullanıyoruz.)
 */
export function MicrophoneMark({ className, ...rest }: Readonly<SVGAttributes<SVGElement>>) {
    const paintId = `sahnebul-mic-${useId().replaceAll(':', '')}`;

    return (
        <svg
            viewBox="0 0 24 24"
            className={cn('shrink-0', className)}
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
            {...rest}
        >
            <defs>
                <linearGradient id={paintId} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#fbbf24" />
                    <stop offset="45%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#ea580c" />
                </linearGradient>
            </defs>
            {/* Lucide "Mic" (24x24) */}
            <rect x="9" y="2" width="6" height="13" rx="3" fill={`url(#${paintId})`} />
            <path
                d="M19 10v2a7 7 0 0 1-14 0v-2"
                fill="none"
                stroke="white"
                strokeOpacity="0.92"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M12 19v3"
                fill="none"
                stroke="white"
                strokeOpacity="0.92"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}
