import BrowserNotificationsBar from '@/Components/BrowserNotificationsBar';
import EmailVerificationBanner from '@/Components/EmailVerificationBanner';
import FlashMessage from '@/Components/FlashMessage';
import PanelNotificationsMenu from '@/Components/PanelNotificationsMenu';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/cn';
import { Link, usePage } from '@inertiajs/react';
import { PageProps } from '@/types';
import { Building2, Calendar, CalendarCheck, ClipboardList, LayoutDashboard, Menu, Mic, Moon, Sun, User, Users, X, type LucideIcon } from 'lucide-react';
import { PropsWithChildren, useCallback, useEffect, useState } from 'react';

const coreNavItems: { routeName: string; label: string; icon: typeof LayoutDashboard }[] = [
    { routeName: 'artist.dashboard', label: 'Panel', icon: LayoutDashboard },
    { routeName: 'artist.profile', label: 'Profil', icon: User },
    { routeName: 'artist.events.index', label: 'Etkinlikler', icon: Calendar },
];

const venueNavItems: { routeName: string; label: string; icon: LucideIcon }[] = [
    { routeName: 'artist.venues.index', label: 'Mekanlarım', icon: Building2 },
    { routeName: 'artist.reservations.index', label: 'Rezervasyonlar', icon: ClipboardList },
];

export default function ArtistLayout({ children }: Readonly<PropsWithChildren>) {
    const auth = usePage<PageProps>().props.auth;
    const { linkedArtist } = auth;
    const isManagerOrganization = auth.is_manager_organization === true;
    /** Eksik prop (eski önbellek): mekân sahipleri menüyü kaybetmesin. */
    const showVenueNav = auth.artist_panel_show_venue_nav !== false;
    const { theme, toggleTheme } = useTheme();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const closeSidebar = useCallback(() => setSidebarOpen(false), []);

    useEffect(() => {
        const onResize = () => {
            if (window.innerWidth >= 1024) {
                setSidebarOpen(false);
            }
        };
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    const isActive = (routeName: string) => {
        try {
            return route().current(routeName);
        } catch {
            return false;
        }
    };

    const matchesRoutePattern = (pattern: string) => {
        try {
            return Boolean(route().current(pattern));
        } catch {
            return false;
        }
    };

    const navBadge = auth.stage_sidebar_nav_badge ?? (showVenueNav === true ? 'Mekân ve etkinlik' : 'Sanatçı paneli');

    const NavLinks = (
        <>
            <p className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200/90">{navBadge}</p>
            {coreNavItems.map((item) => {
                const Icon = item.icon;
                return (
                    <Link
                        key={item.routeName}
                        href={route(item.routeName)}
                        onClick={closeSidebar}
                        className={cn(
                            'flex items-center gap-3 rounded-lg px-4 py-3 text-sm transition',
                            isActive(item.routeName)
                                ? 'bg-amber-500/15 font-medium text-amber-800 dark:text-amber-400'
                                : 'text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white',
                        )}
                    >
                        <Icon className="h-5 w-5 shrink-0 stroke-[1.75]" aria-hidden />
                        {item.label}
                    </Link>
                );
            })}
            {showVenueNav === true &&
                venueNavItems.map((item) => {
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.routeName}
                            href={route(item.routeName)}
                            onClick={closeSidebar}
                            className={cn(
                                'flex items-center gap-3 rounded-lg px-4 py-3 text-sm transition',
                                isActive(item.routeName)
                                    ? 'bg-amber-500/15 font-medium text-amber-800 dark:text-amber-400'
                                    : 'text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white',
                            )}
                        >
                            <Icon className="h-5 w-5 shrink-0 stroke-[1.75]" aria-hidden />
                            {item.label}
                        </Link>
                    );
                })}
            {linkedArtist && (
                <Link
                    href={route('artist.public-profile')}
                    onClick={closeSidebar}
                    className={cn(
                        'flex items-center gap-3 rounded-lg px-4 py-3 text-sm transition',
                        isActive('artist.public-profile')
                            ? 'bg-amber-500/15 font-medium text-amber-800 dark:text-amber-400'
                            : 'text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white',
                    )}
                >
                    <Mic className="h-5 w-5 shrink-0 stroke-[1.75]" aria-hidden />
                    Sanatçı sayfam
                </Link>
            )}
            {linkedArtist && (
                <Link
                    href={route('artist.availability.index')}
                    onClick={closeSidebar}
                    className={cn(
                        'flex items-center gap-3 rounded-lg px-4 py-3 text-sm transition',
                        matchesRoutePattern('artist.availability.*')
                            ? 'bg-amber-500/15 font-medium text-amber-800 dark:text-amber-400'
                            : 'text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white',
                    )}
                >
                    <CalendarCheck className="h-5 w-5 shrink-0 stroke-[1.75]" aria-hidden />
                    Müsaitlik takvimi
                </Link>
            )}
            {isManagerOrganization && (
                <Link
                    href={route('artist.organization.artists.index')}
                    onClick={closeSidebar}
                    className={cn(
                        'flex items-center gap-3 rounded-lg px-4 py-3 text-sm transition',
                        matchesRoutePattern('artist.organization.artists.*')
                            ? 'bg-amber-500/15 font-medium text-amber-800 dark:text-amber-400'
                            : 'text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white',
                    )}
                >
                    <Mic className="h-5 w-5 shrink-0 stroke-[1.75]" aria-hidden />
                    Sanatçı kadrosu
                </Link>
            )}
            {isManagerOrganization && (
                <Link
                    href={route('artist.manager-availability.index')}
                    onClick={closeSidebar}
                    className={cn(
                        'flex items-center gap-3 rounded-lg px-4 py-3 text-sm transition',
                        matchesRoutePattern('artist.manager-availability.*')
                            ? 'bg-amber-500/15 font-medium text-amber-800 dark:text-amber-400'
                            : 'text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white',
                    )}
                >
                    <Users className="h-5 w-5 shrink-0 stroke-[1.75]" aria-hidden />
                    Sanatçı müsaitlikleri
                </Link>
            )}
        </>
    );

    return (
        <div className="flex min-h-[100dvh] bg-zinc-100 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
            {sidebarOpen && (
                <button
                    type="button"
                    className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px] lg:hidden"
                    aria-label="Menüyü kapat"
                    onClick={closeSidebar}
                />
            )}

            <aside
                className={cn(
                    'fixed inset-y-0 left-0 z-50 flex w-[min(100vw-2.5rem,16rem)] max-w-[16rem] flex-col border-r border-zinc-200 bg-white shadow-xl transition-transform duration-200 ease-out dark:border-zinc-800 dark:bg-zinc-900 lg:translate-x-0',
                    sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
                )}
            >
                <div className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-200 px-4 dark:border-zinc-800">
                    <Link href={route('artist.dashboard')} className="min-w-0 font-display text-base font-bold" onClick={closeSidebar}>
                        <span className="bg-gradient-to-r from-amber-400 to-amber-500 bg-clip-text text-transparent">SAHNE PANEL</span>
                    </Link>
                    <button
                        type="button"
                        className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 lg:hidden"
                        onClick={closeSidebar}
                        aria-label="Kapat"
                    >
                        <X className="h-5 w-5 stroke-[1.75]" aria-hidden />
                    </button>
                </div>
                <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto p-4">{NavLinks}</nav>
                <div className="shrink-0 border-t border-zinc-200 p-4 dark:border-zinc-800">
                    <Link
                        href={route('home')}
                        className="flex items-center gap-2 text-sm text-zinc-600 transition hover:text-amber-600 dark:text-zinc-400 dark:hover:text-amber-400"
                        onClick={closeSidebar}
                    >
                        ← Siteye dön
                    </Link>
                </div>
            </aside>

            <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
                <header className="sticky top-0 z-30 flex flex-wrap items-center gap-2 border-b border-zinc-200 bg-white/95 px-3 py-2 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95 sm:px-4 lg:px-6">
                    <button
                        type="button"
                        className="inline-flex rounded-lg border border-zinc-300 p-2 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800 lg:hidden"
                        onClick={() => setSidebarOpen(true)}
                        aria-label="Menüyü aç"
                    >
                        <Menu className="h-6 w-6 stroke-[1.75]" aria-hidden />
                    </button>
                    <span className="min-w-0 flex-1 truncate text-sm text-zinc-600 dark:text-zinc-400">
                        {auth.stage_panel_title ?? 'Sahne yönetimi'}
                    </span>
                    <PanelNotificationsMenu />
                    <button
                        type="button"
                        onClick={toggleTheme}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 px-2.5 py-1.5 text-xs text-zinc-800 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800 sm:text-sm"
                        aria-label="Tema"
                    >
                        {theme === 'dark' ? <Sun className="h-4 w-4 stroke-[1.75]" /> : <Moon className="h-4 w-4 stroke-[1.75]" />}
                    </button>
                    <Link
                        href={route('logout')}
                        method="post"
                        as="button"
                        className="shrink-0 rounded-lg border border-red-500/30 px-3 py-1.5 text-sm text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                    >
                        Çıkış Yap
                    </Link>
                </header>
                <BrowserNotificationsBar />
                <EmailVerificationBanner />
                <FlashMessage />
                <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</div>
            </div>
        </div>
    );
}
