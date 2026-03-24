import { cn } from '@/lib/cn';
import { type HTMLAttributes, type PropsWithChildren } from 'react';

type CardProps = PropsWithChildren<
    HTMLAttributes<HTMLDivElement> & {
        /** Daha belirgin gölge */
        elevated?: boolean;
        /** İç padding */
        padding?: 'none' | 'sm' | 'md' | 'lg';
    }
>;

const paddingMap = {
    none: '',
    sm: 'p-3 sm:p-4',
    md: 'p-4 sm:p-6',
    lg: 'p-6 sm:p-8',
};

export function Card({ className, elevated, padding = 'md', children, ...rest }: Readonly<CardProps>) {
    return (
        <div
            className={cn(
                'rounded-xl border border-zinc-200 bg-white text-zinc-900 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-100',
                elevated && 'shadow-lg dark:shadow-zinc-950/40',
                paddingMap[padding],
                className,
            )}
            {...rest}
        >
            {children}
        </div>
    );
}

export function CardHeader({ className, children, ...rest }: Readonly<HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }>) {
    return (
        <div className={cn('mb-4 border-b border-zinc-100 pb-3 dark:border-zinc-800', className)} {...rest}>
            {children}
        </div>
    );
}

export function CardTitle({ className, children, ...rest }: Readonly<HTMLAttributes<HTMLHeadingElement>>) {
    return (
        <h3 className={cn('text-base font-semibold text-zinc-900 dark:text-white', className)} {...rest}>
            {children}
        </h3>
    );
}
