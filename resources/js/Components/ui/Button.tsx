import { cn } from '@/lib/cn';
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg';

const variantStyles: Record<ButtonVariant, string> = {
    primary:
        'bg-amber-500 text-zinc-950 shadow-sm hover:bg-amber-400 focus-visible:ring-amber-500/80 dark:bg-amber-500 dark:text-zinc-950 dark:hover:bg-amber-400',
    secondary:
        'border border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50 focus-visible:ring-zinc-400 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700',
    danger:
        'border border-red-300 bg-white text-red-700 hover:bg-red-50 focus-visible:ring-red-500 dark:border-red-500/40 dark:bg-transparent dark:text-red-400 dark:hover:bg-red-950/50',
    ghost: 'text-zinc-700 hover:bg-zinc-100 focus-visible:ring-zinc-400 dark:text-zinc-300 dark:hover:bg-zinc-800',
    outline:
        'border border-zinc-300 bg-transparent text-zinc-800 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800',
};

const sizeStyles: Record<ButtonSize, string> = {
    sm: 'min-h-9 px-3 py-1.5 text-xs rounded-lg gap-1.5',
    md: 'min-h-10 px-4 py-2 text-sm rounded-lg gap-2',
    lg: 'min-h-11 px-5 py-2.5 text-sm font-semibold rounded-xl gap-2',
};

const base =
    'inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:pointer-events-none disabled:opacity-50 dark:focus-visible:ring-offset-zinc-950';

/** Inertia Link vb. için aynı görünüm */
export function buttonStyles(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', className?: string): string {
    return cn(base, variantStyles[variant], sizeStyles[size], className);
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant;
    size?: ButtonSize;
    className?: string;
    leftIcon?: ReactNode;
    rightIcon?: ReactNode;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
    { variant = 'primary', size = 'md', className, type = 'button', leftIcon, rightIcon, children, ...rest },
    ref,
) {
    return (
        <button ref={ref} type={type} className={buttonStyles(variant, size, className)} {...rest}>
            {leftIcon && <span className="inline-flex [&_svg]:h-5 [&_svg]:w-5 [&_svg]:shrink-0 [&_svg]:stroke-[1.75]">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="inline-flex [&_svg]:h-5 [&_svg]:w-5 [&_svg]:shrink-0 [&_svg]:stroke-[1.75]">{rightIcon}</span>}
        </button>
    );
});
