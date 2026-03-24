import { cn } from '@/lib/cn';

export function Skeleton({ className }: Readonly<{ className?: string }>) {
    return <div className={cn('animate-pulse rounded-lg bg-zinc-200/90 dark:bg-zinc-800', className)} aria-hidden />;
}

export function SkeletonCard() {
    return (
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
            <Skeleton className="h-36 w-full" />
            <Skeleton className="mt-3 h-4 w-3/4" />
            <Skeleton className="mt-2 h-3 w-1/2" />
        </div>
    );
}
