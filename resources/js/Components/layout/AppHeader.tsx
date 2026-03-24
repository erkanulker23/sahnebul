import { GlobalSearch } from '@/Components/GlobalSearch';
import { useTheme } from '@/contexts/ThemeContext';
import { iconClass } from '@/lib/icons';
import { cn } from '@/lib/cn';
import { Link, usePage } from '@inertiajs/react';
import { Calendar, FileText, MapPin, Menu, Mic2, Moon, Sun, User, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

function navActive(routePatterns: string[]): boolean {
    try {
        return routePatterns.some((r) => route().current(r));
    } catch {
        return false;
    }
}

function SehirSecLink({ className, onClick }: Readonly<{ className: string; onClick?: () => void }>) {
    return (
        <Link href={route('sehir-sec')} className={className} onClick={onClick}>
            <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                Şehir seç
            </span>
        </Link>
    );
}

const navLinkClass = (active: boolean) =>
    cn(
        'rounded-lg px-3 py-2 text-sm font-medium transition',
        active
            ? 'bg-zinc-200/95 text-zinc-950 ring-1 ring-zinc-300/80 dark:bg-zinc-800 dark:text-white dark:ring-zinc-600'
            : 'text-zinc-800 hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white',
    );

function PrimaryNavLinks({
    active,
    onNavigate,
}: {
    active: { venues: boolean; events: boolean; artists: boolean; blog: boolean };
    onNavigate?: () => void;
}) {
    return (
        <>
            <Link href={route('venues.index')} className={navLinkClass(active.venues)} onClick={onNavigate}>
                Mekanlar
            </Link>
            <Link href={route('events.index')} className={navLinkClass(active.events)} onClick={onNavigate}>
                Etkinlikler
            </Link>
            <Link href={route('artists.index')} className={navLinkClass(active.artists)} onClick={onNavigate}>
                Sanatçılar
            </Link>
            <Link href={route('blog.index')} className={navLinkClass(active.blog)} onClick={onNavigate}>
                Blog
            </Link>
        </>
    );
}

export function AppHeader() {
    const pageProps = usePage().props as {
        auth: {
            user: { name: string; email: string; role?: string } | null;
            has_active_gold?: boolean;
            sahne_compact_nav?: boolean;
            is_platform_admin?: boolean;
        };
    };
    const auth = pageProps.auth;
    const user = auth?.user;
    const sahneCompactNav = auth?.sahne_compact_nav === true;
    const hasActiveGold = auth?.has_active_gold === true;
    const hideCustomerReservations = auth?.is_platform_admin === true;
    const mekanSahibiPanelHref = hasActiveGold ? route('artist.dashboard') : route('subscriptions.index', { type: 'venue' });
    const mekanSahibiPanelLabel = hasActiveGold ? `Panel · ${user?.name ?? ''}` : `Gold · ${user?.name ?? ''}`;
    const profileHref = auth?.is_platform_admin === true ? route('admin.profile') : route('profile.edit');

    const { theme, toggleTheme } = useTheme();
    const [drawerOpen, setDrawerOpen] = useState(false);

    const closeDrawer = useCallback(() => setDrawerOpen(false), []);

    useEffect(() => {
        if (!drawerOpen) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') closeDrawer();
        };
        globalThis.addEventListener('keydown', onKey);
        return () => {
            document.body.style.overflow = prev;
            globalThis.removeEventListener('keydown', onKey);
        };
    }, [drawerOpen, closeDrawer]);

    const navActiveState = {
        venues: navActive(['venues.index']),
        events: navActive(['events.index', 'events.show', 'events.nearby']),
        artists: navActive(['artists.index', 'artists.show']),
        blog: navActive(['blog.index', 'blog.show']),
    };

    return (
        <>
        <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/95 pt-[env(safe-area-inset-top)] shadow-sm backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/95 dark:shadow-none">
            <div className="mx-auto max-w-[1600px] px-3 sm:px-4 lg:px-8">
                {/* Masaüstü: logo | nav | arama | aksiyonlar */}
                <div className="hidden items-center gap-4 py-3 lg:flex lg:flex-nowrap">
                    <Link href={route('home')} className="shrink-0 font-display text-xl font-bold tracking-tight">
                        <span className="bg-gradient-to-r from-amber-500 to-amber-600 bg-clip-text text-transparent dark:from-amber-400 dark:to-amber-500">
                            SAHNEBUL
                        </span>
                    </Link>
                    <nav className="flex shrink-0 items-center gap-1" aria-label="Ana menü">
                        <PrimaryNavLinks active={navActiveState} />
                        <SehirSecLink
                            className={navLinkClass(navActive(['sehir-sec']))}
                        />
                    </nav>
                    <div className="flex min-w-0 flex-1 justify-center px-2">
                        <GlobalSearch className="w-full max-w-2xl" />
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                        <button
                            type="button"
                            onClick={toggleTheme}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-zinc-300 text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                            aria-label={theme === 'dark' ? 'Açık moda geç' : 'Koyu moda geç'}
                        >
                            {theme === 'dark' ? <Sun className={iconClass.sm} /> : <Moon className={iconClass.sm} />}
                        </button>
                        {user ? (
                            <>
                                {!sahneCompactNav && !hideCustomerReservations && (
                                    <>
                                        <Link
                                            href={route('reservations.index')}
                                            className="hidden rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 xl:inline dark:text-zinc-300 dark:hover:bg-zinc-800"
                                        >
                                            Rezervasyonlar
                                        </Link>
                                        <Link
                                            href={route('dashboard')}
                                            className="hidden rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 xl:inline dark:text-zinc-300 dark:hover:bg-zinc-800"
                                        >
                                            Panel
                                        </Link>
                                    </>
                                )}
                                <Link
                                    href={sahneCompactNav ? mekanSahibiPanelHref : profileHref}
                                    className="hidden max-w-[10rem] truncate rounded-full border border-amber-600/35 bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-950 sm:inline-block dark:border-amber-500/40 dark:bg-amber-500/15 dark:font-medium dark:text-amber-300"
                                >
                                    {sahneCompactNav ? 'Mekan paneli' : user.name}
                                </Link>
                                <Link
                                    href={route('logout')}
                                    method="post"
                                    as="button"
                                    className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400"
                                >
                                    Çıkış
                                </Link>
                            </>
                        ) : (
                            <>
                                <Link href={route('login')} className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                    Giriş
                                </Link>
                                <Link
                                    href={route('register')}
                                    className="rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-amber-400"
                                >
                                    Kayıt ol
                                </Link>
                            </>
                        )}
                    </div>
                </div>

                {/* Mobil: logo + aksiyonlar; arama tam genişlik */}
                <div className="flex flex-col gap-3 py-3 lg:hidden">
                    <div className="flex items-center justify-between gap-3">
                        <Link href={route('home')} className="shrink-0 font-display text-lg font-bold" onClick={closeDrawer}>
                            <span className="bg-gradient-to-r from-amber-500 to-amber-600 bg-clip-text text-transparent">SAHNEBUL</span>
                        </Link>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={toggleTheme}
                                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-zinc-300 text-zinc-700 dark:border-zinc-600 dark:text-zinc-200"
                                aria-label="Tema"
                            >
                                {theme === 'dark' ? <Sun className={iconClass.md} /> : <Moon className={iconClass.md} />}
                            </button>
                            <button
                                type="button"
                                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-zinc-300 dark:border-zinc-600"
                                onClick={() => setDrawerOpen(true)}
                                aria-expanded={drawerOpen}
                                aria-label="Menüyü aç"
                            >
                                <Menu className={iconClass.md} />
                            </button>
                        </div>
                    </div>
                    <GlobalSearch className="w-full" />
                </div>
            </div>
        </header>

        {drawerOpen &&
            typeof document !== 'undefined' &&
            createPortal(
                <>
                    <button
                        type="button"
                        className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm lg:hidden"
                        aria-label="Menüyü kapat"
                        onClick={closeDrawer}
                    />
                    <div
                        className="fixed inset-y-0 right-0 z-[110] flex w-[min(100vw-3rem,20rem)] flex-col border-l border-zinc-200 bg-white pt-[env(safe-area-inset-top)] shadow-xl dark:border-zinc-800 dark:bg-zinc-950 lg:hidden"
                        role="dialog"
                        aria-modal="true"
                        aria-label="Menü"
                    >
                        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
                            <span className="font-semibold text-zinc-900 dark:text-white">Menü</span>
                            <button type="button" onClick={closeDrawer} className="rounded-lg p-2 text-zinc-600 dark:text-zinc-400" aria-label="Kapat">
                                <X className={iconClass.md} />
                            </button>
                        </div>
                        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3" aria-label="Mobil menü">
                            <Link
                                href={route('venues.index')}
                                className="flex items-center gap-3 rounded-lg px-3 py-3 text-base font-medium text-zinc-900 dark:text-white"
                                onClick={closeDrawer}
                            >
                                <MapPin className={iconClass.md} />
                                Mekanlar
                            </Link>
                            <Link
                                href={route('events.index')}
                                className="flex items-center gap-3 rounded-lg px-3 py-3 text-base font-medium text-zinc-900 dark:text-white"
                                onClick={closeDrawer}
                            >
                                <Calendar className={iconClass.md} />
                                Etkinlikler
                            </Link>
                            <Link
                                href={route('artists.index')}
                                className="flex items-center gap-3 rounded-lg px-3 py-3 text-base font-medium text-zinc-900 dark:text-white"
                                onClick={closeDrawer}
                            >
                                <Mic2 className={iconClass.md} />
                                Sanatçılar
                            </Link>
                            <Link
                                href={route('blog.index')}
                                className="flex items-center gap-3 rounded-lg px-3 py-3 text-base font-medium text-zinc-900 dark:text-white"
                                onClick={closeDrawer}
                            >
                                <FileText className={iconClass.md} />
                                Blog
                            </Link>
                            <Link
                                href={route('sehir-sec')}
                                className="flex items-center gap-3 rounded-lg px-3 py-3 text-base font-medium text-zinc-900 dark:text-white"
                                onClick={closeDrawer}
                            >
                                <MapPin className={iconClass.md} />
                                Şehir seç
                            </Link>
                        </nav>
                        <div className="border-t border-zinc-200 p-3 dark:border-zinc-800">
                            {user ? (
                                <div className="flex flex-col gap-2">
                                    {!sahneCompactNav && !hideCustomerReservations && (
                                        <>
                                            <Link href={route('reservations.index')} className="rounded-lg px-3 py-2.5 text-zinc-800 dark:text-zinc-200" onClick={closeDrawer}>
                                                Rezervasyonlarım
                                            </Link>
                                            <Link href={route('dashboard')} className="rounded-lg px-3 py-2.5 text-zinc-800 dark:text-zinc-200" onClick={closeDrawer}>
                                                Panelim
                                            </Link>
                                        </>
                                    )}
                                    <Link
                                        href={sahneCompactNav ? mekanSahibiPanelHref : profileHref}
                                        className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-amber-800 dark:text-amber-400"
                                        onClick={closeDrawer}
                                    >
                                        <User className={iconClass.md} />
                                        {sahneCompactNav ? mekanSahibiPanelLabel : user.name}
                                    </Link>
                                    <Link
                                        href={route('logout')}
                                        method="post"
                                        as="button"
                                        className="rounded-lg px-3 py-2.5 text-left text-red-600 dark:text-red-400"
                                        onClick={closeDrawer}
                                    >
                                        Çıkış
                                    </Link>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-2">
                                    <Link href={route('login')} className="rounded-lg px-3 py-2.5" onClick={closeDrawer}>
                                        Giriş yap
                                    </Link>
                                    <Link href={route('register')} className="rounded-lg bg-amber-500 px-3 py-2.5 text-center font-semibold text-zinc-950" onClick={closeDrawer}>
                                        Kayıt ol
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>
                </>,
                document.body,
            )}
        </>
    );
}
