import SiteShell from '@/Layouts/SiteShell';
import { cn } from '@/lib/cn';
import { Link } from '@inertiajs/react';
import { PropsWithChildren } from 'react';

/**
 * Giriş, kayıt, şifre: SiteShell + mobilde diğer sayfalarla aynı alt hızlı erişim şeridi.
 */
export default function GuestLayout({
    children,
    wide = false,
}: Readonly<PropsWithChildren<{ wide?: boolean }>>) {
    const maxW = wide ? 'max-w-xl' : 'max-w-md';

    return (
        <SiteShell>
            <div className="flex w-full flex-col items-center px-4 py-8 sm:py-14">
                <div
                    className={cn(
                        'w-full overflow-hidden rounded-2xl border border-zinc-200 bg-white/95 shadow-ds-lg backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/80',
                        maxW,
                        wide ? 'px-8 py-9 sm:px-10' : 'px-8 py-8',
                    )}
                >
                    {children}
                </div>

                <Link
                    href={route('home')}
                    className="mt-8 text-sm text-zinc-600 hover:text-amber-600 dark:text-zinc-500 dark:hover:text-amber-400"
                >
                    ← Ana sayfaya dön
                </Link>
            </div>
        </SiteShell>
    );
}
