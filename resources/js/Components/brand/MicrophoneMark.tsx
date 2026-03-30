import { cn } from '@/lib/cn';
import { useId, type SVGAttributes } from 'react';

/**
 * Sahnebul mark — gradient condenser mic (küçük boyutta okunaklı: yan süs ve ayak yok).
 */
export function MicrophoneMark({ className, ...rest }: Readonly<SVGAttributes<SVGElement>>) {
    const paintId = `sahnebul-mic-${useId().replaceAll(':', '')}`;

    return (
        <svg
            viewBox="0 0 40 36"
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
            <rect x="13" y="5" width="14" height="19" rx="7" fill={`url(#${paintId})`} />
            <path
                d="M16 9h8M16 13h8M16 17h8"
                stroke="white"
                strokeOpacity="0.22"
                strokeWidth="0.9"
                strokeLinecap="round"
            />
            <path
                d="M11 26c0 4.5 4.5 8 9 8s9-3.5 9-8"
                fill="none"
                stroke={`url(#${paintId})`}
                strokeWidth="2"
                strokeLinecap="round"
            />
        </svg>
    );
}
