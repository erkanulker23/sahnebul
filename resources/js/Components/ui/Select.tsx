import { cn } from '@/lib/cn';
import { forwardRef, type SelectHTMLAttributes } from 'react';

export const selectBaseClass =
    'block w-full min-h-10 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm transition focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/25 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-amber-500 dark:focus:ring-amber-500/20';

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
    invalid?: boolean;
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select({ className, invalid, children, ...rest }, ref) {
    return (
        <select
            ref={ref}
            className={cn(
                selectBaseClass,
                invalid && 'border-red-500 focus:border-red-500 focus:ring-red-500/20 dark:border-red-500',
                className,
            )}
            {...rest}
        >
            {children}
        </select>
    );
});
