import { SahnebulWordmark } from '@/Components/brand/SahnebulWordmark';
import FlashMessage from '@/Components/FlashMessage';
import { cn } from '@/lib/cn';
import { Link } from '@inertiajs/react';
import { PropsWithChildren } from 'react';

export default function GuestLayout({
    children,
    wide = false,
}: Readonly<PropsWithChildren<{ wide?: boolean }>>) {
    const maxW = wide ? 'max-w-xl' : 'max-w-md';

    return (
        <div className="relative flex min-h-screen flex-col items-center justify-center bg-zinc-100 px-4 py-12 dark:bg-zinc-950">
            <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(251,191,36,0.12),transparent)] dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(251,191,36,0.08),transparent)]" />
            <div className={cn('relative z-10 flex w-full justify-center', maxW)}>
                <SahnebulWordmark layout="vertical" size="xl" />
            </div>

            <div
                className={cn(
                    'relative z-10 mt-8 w-full overflow-hidden rounded-2xl border border-zinc-200 bg-white/95 shadow-ds-lg backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/80',
                    maxW,
                    wide ? 'px-8 py-9 sm:px-10' : 'px-8 py-8',
                )}
            >
                <FlashMessage />
                {children}
            </div>

            <Link href={route('home')} className="relative z-10 mt-8 text-sm text-zinc-600 hover:text-amber-600 dark:text-zinc-500 dark:hover:text-amber-400">
                ← Ana sayfaya dön
            </Link>
        </div>
    );
}
