import { cn } from '@/lib/cn';

export type AdminFormTabItem = {
    id: string;
    label: string;
};

/**
 * Admin düzenleme sayfalarında uzun formları sekmelere bölmek için.
 * Erişilebilirlik: rozetler `role="tab"` / `aria-selected`; panel dışarıda `role="tabpanel"` ile sarılmalı.
 */
export function AdminFormTabList({
    tabs,
    activeId,
    onChange,
    className,
}: Readonly<{
    tabs: AdminFormTabItem[];
    activeId: string;
    onChange: (id: string) => void;
    className?: string;
}>) {
    return (
        <div
            role="tablist"
            aria-label="Bölümler"
            className={cn(
                'flex flex-wrap gap-1 border-b border-zinc-200 bg-zinc-100/90 p-1 sm:gap-0 sm:rounded-t-xl dark:border-zinc-700/80 dark:bg-zinc-950/40',
                className,
            )}
        >
            {tabs.map((t) => {
                const active = t.id === activeId;
                return (
                    <button
                        key={t.id}
                        type="button"
                        role="tab"
                        id={`tab-${t.id}`}
                        aria-selected={active}
                        aria-controls={`tabpanel-${t.id}`}
                        tabIndex={active ? 0 : -1}
                        onClick={() => onChange(t.id)}
                        className={cn(
                            'min-h-10 rounded-lg px-3 py-2 text-sm font-medium transition sm:rounded-b-none sm:rounded-t-lg sm:px-4',
                            active
                                ? 'bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-800 dark:text-amber-200 dark:ring-zinc-600/80'
                                : 'text-zinc-600 hover:bg-white/80 hover:text-zinc-900 dark:text-zinc-500 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-300',
                        )}
                    >
                        {t.label}
                    </button>
                );
            })}
        </div>
    );
}

export function AdminFormTabPanel({
    id,
    activeId,
    children,
    className,
}: Readonly<{
    id: string;
    activeId: string;
    children: React.ReactNode;
    className?: string;
}>) {
    const visible = id === activeId;
    return (
        <div
            role="tabpanel"
            id={`tabpanel-${id}`}
            aria-labelledby={`tab-${id}`}
            hidden={!visible}
            className={className}
        >
            {children}
        </div>
    );
}
