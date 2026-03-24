import { ReactNode } from 'react';

type Props = {
    title: string;
    description?: ReactNode;
    actions?: ReactNode;
};

/** Admin sayfalarında tutarlı başlık + aksiyon satırı (mobilde sarılır). */
export function AdminPageHeader({ title, description, actions }: Readonly<Props>) {
    return (
        <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
                <h1 className="font-display text-xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-2xl">{title}</h1>
                {description && <p className="mt-1 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">{description}</p>}
            </div>
            {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
        </div>
    );
}
