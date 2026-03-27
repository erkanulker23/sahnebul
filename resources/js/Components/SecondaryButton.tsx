import { ButtonHTMLAttributes } from 'react';

export default function SecondaryButton({
    type = 'button',
    className = '',
    disabled,
    children,
    ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
        <button
            {...props}
            type={type}
            className={
                `inline-flex items-center rounded-md border border-zinc-300 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-widest text-zinc-700 shadow-sm transition duration-150 ease-in-out hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:ring-offset-2 disabled:opacity-25 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:focus:ring-amber-500/25 dark:focus:ring-offset-zinc-950 ${
                    disabled && 'opacity-25'
                } ` + className
            }
            disabled={disabled}
        >
            {children}
        </button>
    );
}
