import { InputHTMLAttributes } from 'react';

export default function Checkbox({
    className = '',
    ...props
}: InputHTMLAttributes<HTMLInputElement>) {
    return (
        <input
            {...props}
            type="checkbox"
            className={
                'rounded border-zinc-300 bg-white text-amber-600 focus:ring-amber-500 focus:ring-offset-white dark:border-zinc-600 dark:bg-zinc-800 dark:text-amber-500 dark:focus:ring-offset-zinc-900 ' +
                className
            }
        />
    );
}
