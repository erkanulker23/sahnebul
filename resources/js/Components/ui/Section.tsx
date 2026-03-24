import { cn } from '@/lib/cn';
import { type HTMLAttributes, type PropsWithChildren } from 'react';

type SectionProps = PropsWithChildren<
    HTMLAttributes<HTMLElement> & {
        title?: string;
        description?: string;
        /** İçerik üst boşluğu */
        tight?: boolean;
    }
>;

export function Section({ title, description, tight, className, children, ...rest }: Readonly<SectionProps>) {
    return (
        <section className={cn(!tight && 'mt-10 first:mt-0', className)} {...rest}>
            {(title || description) && (
                <header className="mb-4 sm:mb-6">
                    {title && <h2 className="font-display text-xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-2xl">{title}</h2>}
                    {description && <p className="mt-1 max-w-3xl text-sm text-zinc-600 dark:text-zinc-400">{description}</p>}
                </header>
            )}
            {children}
        </section>
    );
}
