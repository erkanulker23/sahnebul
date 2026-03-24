import { MicrophoneMark } from '@/Components/brand/MicrophoneMark';
import { cn } from '@/lib/cn';
import { Link } from '@inertiajs/react';

const sizeMap = {
    sm: { icon: 'h-7 w-7', text: 'text-base sm:text-lg' },
    md: { icon: 'h-8 w-8', text: 'text-lg sm:text-xl' },
    lg: { icon: 'h-9 w-9', text: 'text-xl sm:text-2xl' },
    xl: { icon: 'h-[4.5rem] w-[4.5rem]', text: 'text-3xl sm:text-4xl' },
} as const;

type Size = keyof typeof sizeMap;

export function SahnebulWordmark({
    size = 'md',
    layout = 'horizontal',
    className,
    href,
    onClick,
}: Readonly<{
    size?: Size;
    layout?: 'horizontal' | 'vertical';
    className?: string;
    href?: string;
    onClick?: () => void;
}>) {
    const to = href ?? route('home');
    const s = sizeMap[size];
    const textClass = cn(
        'font-display font-bold tracking-tight bg-gradient-to-r from-amber-500 to-amber-600 bg-clip-text text-transparent dark:from-amber-400 dark:to-amber-500',
        s.text,
    );

    return (
        <Link
            href={to}
            onClick={onClick}
            className={cn(
                'group inline-flex shrink-0 items-center gap-2 transition-opacity hover:opacity-90',
                layout === 'vertical' && 'flex-col gap-4 text-center',
                className,
            )}
        >
            <MicrophoneMark
                className={cn(s.icon, 'transition-transform duration-300 ease-out group-hover:scale-[1.03]')}
            />
            <span className={textClass}>SAHNEBUL</span>
        </Link>
    );
}
