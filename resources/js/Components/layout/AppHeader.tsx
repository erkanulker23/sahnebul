import PanelNotificationsMenu from '@/Components/PanelNotificationsMenu';
import { SahnebulWordmark } from '@/Components/brand/SahnebulWordmark';
import { GlobalSearch } from '@/Components/GlobalSearch';
import { useTheme } from '@/contexts/ThemeContext';
import { iconClass } from '@/lib/icons';
import { cn } from '@/lib/cn';
import { safeRoute } from '@/lib/safeRoute';
import { Link, usePage } from '@inertiajs/react';
import { Calendar, ChevronDown, Home, LogIn, MapPin, Menu, Mic2, Moon, Sun, User, UserPlus, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
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

const flyoutItemClass =
    'flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-800 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800';

function NavFlyout({
    label,
    active,
    children,
}: Readonly<{
    label: string;
    active: boolean;
    children: (close: () => void) => ReactNode;
}>) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const close = useCallback(() => setOpen(false), []);

    useEffect(() => {
        if (!open) return;
        const onDoc = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, [open]);

    return (
        <div className="relative" ref={ref}>
            <button
                type="button"
                className={cn(navLinkClass(active), 'inline-flex items-center gap-1')}
                aria-expanded={open}
                aria-haspopup="true"
                onClick={() => setOpen((o) => !o)}
            >
                {label}
                <ChevronDown className={cn('h-3.5 w-3.5 shrink-0 opacity-70 transition', open && 'rotate-180')} aria-hidden />
            </button>
            {open && (
                <div
                    className="absolute left-0 top-full z-[60] mt-1 min-w-[14rem] rounded-xl border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
                    role="menu"
                >
                    {children(close)}
                </div>
            )}
        </div>
    );
}

export function AppHeader() {
    const page = usePage();
    const pageProps = page.props as {
        auth: {
            user: { name: string; email: string; role?: string } | null;
            sahne_compact_nav?: boolean;
            is_platform_admin?: boolean;
        };
    };
    const auth = pageProps.auth;
    const user = auth?.user;
    const sahneCompactNav = auth?.sahne_compact_nav === true;
    const hideCustomerReservations = auth?.is_platform_admin === true;
    const mekanSahibiPanelHref = route('artist.dashboard');
    const mekanSahibiPanelLabel = `Panel · ${user?.name ?? ''}`;
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

    const inertiaUrl = page.url;
    const navActiveState = {
        venues: navActive(['venues.index']),
        events:
            navActive(['events.index', 'events.show', 'events.nearby', 'discover.tonight']) ||
            inertiaUrl.startsWith('/kesfet/bu-aksam'),
        artists: navActive(['artists.index', 'artists.show']),
    };

    return (
        <>
        <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/95 pt-[env(safe-area-inset-top)] shadow-sm backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/95 dark:shadow-none">
            <div className="mx-auto max-w-[1600px] px-3 sm:px-4 lg:px-8">
                {/* Masaüstü: logo | nav | arama | aksiyonlar */}
                <div className="hidden items-center gap-4 py-3 lg:flex lg:flex-nowrap">
                    <SahnebulWordmark size="lg" className="shrink-0" />
                    <nav className="flex shrink-0 items-center gap-1" aria-label="Ana menü">
                        <NavFlyout label="Mekanlar" active={navActiveState.venues}>
                            {(close) => (
                                <>
                                    <Link href={route('venues.index')} className={flyoutItemClass} onClick={close} role="menuitem">
                                        <MapPin className="h-4 w-4 opacity-70" aria-hidden />
                                        Tüm mekanlar
                                    </Link>
                                    {!user ? (
                                        <>
                                            <Link href={safeRoute('login.mekan')} className={flyoutItemClass} onClick={close} role="menuitem">
                                                <LogIn className="h-4 w-4 opacity-70" aria-hidden />
                                                Mekan girişi
                                            </Link>
                                            <Link
                                                href={route('register', { uyelik: 'mekan' })}
                                                className={flyoutItemClass}
                                                onClick={close}
                                                role="menuitem"
                                            >
                                                <UserPlus className="h-4 w-4 opacity-70" aria-hidden />
                                                Mekan kaydı
                                            </Link>
                                            <Link href={safeRoute('login.management')} className={flyoutItemClass} onClick={close} role="menuitem">
                                                <LogIn className="h-4 w-4 opacity-70" aria-hidden />
                                                Management girişi
                                            </Link>
                                            <Link
                                                href={route('register', { uyelik: 'management' })}
                                                className={flyoutItemClass}
                                                onClick={close}
                                                role="menuitem"
                                            >
                                                <UserPlus className="h-4 w-4 opacity-70" aria-hidden />
                                                Management kaydı
                                            </Link>
                                        </>
                                    ) : null}
                                </>
                            )}
                        </NavFlyout>
                        <NavFlyout label="Etkinlikler" active={navActiveState.events}>
                            {(close) => (
                                <>
                                    <Link href={route('events.index')} className={flyoutItemClass} onClick={close} role="menuitem">
                                        <Calendar className="h-4 w-4 opacity-70" aria-hidden />
                                        Tüm etkinlikler
                                    </Link>
                                    <Link href={safeRoute('discover.tonight')} className={flyoutItemClass} onClick={close} role="menuitem">
                                        <MapPin className="h-4 w-4 opacity-70" aria-hidden />
                                        Nereye mi gidelim? · Canlı harita
                                    </Link>
                                </>
                            )}
                        </NavFlyout>
                        <NavFlyout label="Sanatçılar" active={navActiveState.artists}>
                            {(close) => (
                                <>
                                    <Link href={route('artists.index')} className={flyoutItemClass} onClick={close} role="menuitem">
                                        <Mic2 className="h-4 w-4 opacity-70" aria-hidden />
                                        Tüm sanatçılar
                                    </Link>
                                    {!user ? (
                                        <>
                                            <Link href={safeRoute('login.sanatci')} className={flyoutItemClass} onClick={close} role="menuitem">
                                                <LogIn className="h-4 w-4 opacity-70" aria-hidden />
                                                Sanatçı girişi
                                            </Link>
                                            <Link
                                                href={route('register', { uyelik: 'sanatci' })}
                                                className={flyoutItemClass}
                                                onClick={close}
                                                role="menuitem"
                                            >
                                                <UserPlus className="h-4 w-4 opacity-70" aria-hidden />
                                                Sanatçı kaydı
                                            </Link>
                                        </>
                                    ) : null}
                                </>
                            )}
                        </NavFlyout>
                        <SehirSecLink className={navLinkClass(navActive(['sehir-sec']))} />
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
                        {user && !hideCustomerReservations ? (
                            <div className="hidden md:block">
                                <PanelNotificationsMenu />
                            </div>
                        ) : null}
                        {user ? (
                            <>
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
                                <Link href={safeRoute('login')} className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                    Giriş
                                </Link>
                                <Link
                                    href={safeRoute('register.kullanici')}
                                    className="rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-amber-400"
                                >
                                    Kayıt ol
                                </Link>
                            </>
                        )}
                    </div>
                </div>

                {/* Mobil: logo + aksiyonlar; arama tam genişlik */}
                <div className="flex min-w-0 flex-col gap-3 py-3 lg:hidden">
                    <div className="flex min-w-0 items-center justify-between gap-2 sm:gap-3">
                        <SahnebulWordmark size="lg" className="shrink-0" onClick={closeDrawer} />
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={toggleTheme}
                                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-zinc-300 text-zinc-700 dark:border-zinc-600 dark:text-zinc-200"
                                aria-label="Tema"
                            >
                                {theme === 'dark' ? <Sun className={iconClass.md} /> : <Moon className={iconClass.md} />}
                            </button>
                            {user && !hideCustomerReservations ? (
                                <div className="flex items-center md:hidden">
                                    <PanelNotificationsMenu />
                                </div>
                            ) : null}
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
                                href={route('home')}
                                className="flex items-center gap-3 rounded-lg px-3 py-3 text-base font-medium text-zinc-900 dark:text-white"
                                onClick={closeDrawer}
                            >
                                <Home className={iconClass.md} />
                                Ana sayfa
                            </Link>
                            <Link
                                href={route('venues.index')}
                                className="flex items-center gap-3 rounded-lg px-3 py-3 text-base font-medium text-zinc-900 dark:text-white"
                                onClick={closeDrawer}
                            >
                                <MapPin className={iconClass.md} />
                                Mekanlar
                            </Link>
                            {!user ? (
                                <div className="ms-2 flex flex-col gap-0.5 border-l border-zinc-200 py-1 pl-3 dark:border-zinc-700">
                                    <Link
                                        href={safeRoute('login.mekan')}
                                        className="flex items-center gap-2 rounded-md py-2 text-sm text-zinc-600 dark:text-zinc-400"
                                        onClick={closeDrawer}
                                    >
                                        <LogIn className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                                        Mekan girişi
                                    </Link>
                                    <Link
                                        href={route('register', { uyelik: 'mekan' })}
                                        className="flex items-center gap-2 rounded-md py-2 text-sm text-zinc-600 dark:text-zinc-400"
                                        onClick={closeDrawer}
                                    >
                                        <UserPlus className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                                        Mekan kaydı
                                    </Link>
                                    <Link
                                        href={safeRoute('login.management')}
                                        className="flex items-center gap-2 rounded-md py-2 text-sm text-zinc-600 dark:text-zinc-400"
                                        onClick={closeDrawer}
                                    >
                                        <LogIn className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                                        Management girişi
                                    </Link>
                                    <Link
                                        href={route('register', { uyelik: 'management' })}
                                        className="flex items-center gap-2 rounded-md py-2 text-sm text-zinc-600 dark:text-zinc-400"
                                        onClick={closeDrawer}
                                    >
                                        <UserPlus className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                                        Management kaydı
                                    </Link>
                                </div>
                            ) : null}
                            <div className="flex flex-col rounded-lg bg-zinc-50 dark:bg-zinc-900/50">
                                <Link
                                    href={route('events.index')}
                                    className="flex items-center gap-3 px-3 py-3 text-base font-medium text-zinc-900 dark:text-white"
                                    onClick={closeDrawer}
                                >
                                    <Calendar className={iconClass.md} />
                                    Tüm etkinlikler
                                </Link>
                                <Link
                                    href={safeRoute('discover.tonight')}
                                    className="flex items-center gap-3 border-t border-zinc-200 px-3 py-3 text-base font-medium text-zinc-900 dark:border-zinc-700 dark:text-white"
                                    onClick={closeDrawer}
                                >
                                    <MapPin className={iconClass.md} />
                                    Canlı harita — yakın etkinlikler
                                </Link>
                            </div>
                            <Link
                                href={route('artists.index')}
                                className="flex items-center gap-3 rounded-lg px-3 py-3 text-base font-medium text-zinc-900 dark:text-white"
                                onClick={closeDrawer}
                            >
                                <Mic2 className={iconClass.md} />
                                Sanatçılar
                            </Link>
                            {!user ? (
                                <div className="ms-2 flex flex-col gap-0.5 border-l border-zinc-200 py-1 pl-3 dark:border-zinc-700">
                                    <Link
                                        href={safeRoute('login.sanatci')}
                                        className="flex items-center gap-2 rounded-md py-2 text-sm text-zinc-600 dark:text-zinc-400"
                                        onClick={closeDrawer}
                                    >
                                        <LogIn className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                                        Sanatçı girişi
                                    </Link>
                                    <Link
                                        href={route('register', { uyelik: 'sanatci' })}
                                        className="flex items-center gap-2 rounded-md py-2 text-sm text-zinc-600 dark:text-zinc-400"
                                        onClick={closeDrawer}
                                    >
                                        <UserPlus className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                                        Sanatçı kaydı
                                    </Link>
                                </div>
                            ) : null}
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
                                <div className="flex flex-col gap-2.5">
                                    <Link
                                        href={safeRoute('login')}
                                        className="flex w-full min-h-[48px] items-center justify-center rounded-xl bg-white px-4 py-3 text-center text-sm font-semibold text-zinc-900 shadow-sm transition hover:bg-zinc-50 dark:bg-zinc-700 dark:text-white dark:hover:bg-zinc-600"
                                        onClick={closeDrawer}
                                    >
                                        Giriş
                                    </Link>
                                    <Link
                                        href={safeRoute('register.kullanici')}
                                        className="flex w-full min-h-[48px] items-center justify-center rounded-xl bg-amber-500 px-4 py-3 text-center text-sm font-semibold text-zinc-950 shadow-sm transition hover:bg-amber-400"
                                        onClick={closeDrawer}
                                    >
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
