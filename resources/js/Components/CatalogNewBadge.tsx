import { cn } from '@/lib/cn';

/** Kamuya açık katalog: oluşturulma takvim günü + 3 gün dahil (sunucu `is_new_on_platform`). */
export function CatalogNewBadge({ className }: Readonly<{ className?: string }>) {
    return (
        <span
            className={cn(
                'pointer-events-none inline-flex shrink-0 items-center rounded-full bg-amber-400 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-zinc-950 shadow-md ring-1 ring-black/15 dark:bg-amber-400 dark:text-zinc-950 dark:ring-white/25 sm:text-[10px]',
                className,
            )}
            aria-label="Yeni eklendi"
        >
            Yeni
        </span>
    );
}
