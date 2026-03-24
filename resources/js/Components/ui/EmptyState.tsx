import { cn } from '@/lib/cn';
import { type LucideIcon } from 'lucide-react';
import { type PropsWithChildren, type ReactNode } from 'react';

type Props = PropsWithChildren<{
    icon?: LucideIcon;
    title: string;
    description?: string;
    action?: ReactNode;
    className?: string;
}>;

export function EmptyState({ icon: Icon, title, description, action, children, className }: Readonly<Props>) {
    return (
        <div
            className={cn(
                'flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/80 px-6 py-14 text-center dark:border-zinc-700 dark:bg-zinc-900/40',
                className,
            )}
        >
            {Icon && <Icon className="mb-3 h-12 w-12 text-zinc-400" strokeWidth={1.5} aria-hidden />}
            <p className="font-display text-lg font-semibold text-zinc-900 dark:text-white">{title}</p>
            {description && <p className="mt-2 max-w-md text-sm text-zinc-700 dark:text-zinc-400">{description}</p>}
            {action && <div className="mt-6">{action}</div>}
            {children}
        </div>
    );
}
