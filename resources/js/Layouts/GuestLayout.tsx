import ApplicationLogo from '@/Components/ApplicationLogo';
import FlashMessage from '@/Components/FlashMessage';
import { Link } from '@inertiajs/react';
import { PropsWithChildren } from 'react';

export default function GuestLayout({ children }: PropsWithChildren) {
    return (
        <div className="relative flex min-h-screen flex-col items-center justify-center bg-zinc-100 px-4 py-12 dark:bg-zinc-950">
            <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(251,191,36,0.12),transparent)] dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(251,191,36,0.08),transparent)]" />
            <div className="relative z-10 w-full max-w-md">
                <Link href={route('home')} className="flex justify-center">
                    <ApplicationLogo className="h-16 w-16 fill-amber-600 dark:fill-amber-500" />
                </Link>
                <p className="mt-4 text-center font-display text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
                    <span className="bg-gradient-to-r from-amber-500 to-amber-600 bg-clip-text text-transparent dark:from-amber-400 dark:to-amber-500">
                        SAHNEBUL
                    </span>
                </p>
            </div>

            <div className="relative z-10 mt-8 w-full max-w-md overflow-hidden rounded-2xl border border-zinc-200 bg-white/95 px-8 py-8 shadow-ds-lg backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/80">
                <FlashMessage />
                {children}
            </div>

            <Link href={route('home')} className="relative z-10 mt-8 text-sm text-zinc-600 hover:text-amber-600 dark:text-zinc-500 dark:hover:text-amber-400">
                ← Ana sayfaya dön
            </Link>
        </div>
    );
}
