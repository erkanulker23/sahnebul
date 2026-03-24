import { cn } from '@/lib/cn';
import { forwardRef, type InputHTMLAttributes } from 'react';

export const inputBaseClass =
    'block w-full min-h-10 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm placeholder:text-zinc-400 transition focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/25 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:border-amber-500 dark:focus:ring-amber-500/20';

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
    /** Ek çerçeve */
    invalid?: boolean;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ className, invalid, ...rest }, ref) {
    return (
        <input
            ref={ref}
            className={cn(
                inputBaseClass,
                invalid && 'border-red-500 focus:border-red-500 focus:ring-red-500/20 dark:border-red-500',
                className,
            )}
            {...rest}
        />
    );
});
