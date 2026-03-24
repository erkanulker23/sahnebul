import Dropdown from '@/Components/Dropdown';
import FlashMessage from '@/Components/FlashMessage';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/cn';
import { Link, usePage } from '@inertiajs/react';
import {
    Building2,
    Calendar,
    ChevronDown,
    ClipboardList,
    CreditCard,
    FileText,
    Folder,
    Globe,
    LayoutDashboard,
    Mail,
    MapPin,
    Megaphone,
    Menu,
    MessageSquare,
    Mic,
    Mic2,
    Settings,
    Tags,
    User,
    Users,
    X,
} from 'lucide-react';
import { PropsWithChildren, useCallback, useEffect, useMemo, useState } from 'react';

const navItems: { href: string; label: string; icon: typeof LayoutDashboard }[] = [
    { href: 'admin.dashboard', label: 'Yönetim paneli', icon: LayoutDashboard },
    { href: 'admin.profile', label: 'Hesabım', icon: User },
    { href: 'admin.users.index', label: 'Kullanıcılar', icon: Users },
    { href: 'admin.venues.index', label: 'Mekanlar', icon: Building2 },
    { href: 'admin.events.index', label: 'Etkinlikler', icon: Calendar },
    { href: 'admin.external-events.index', label: 'Crawl Adayları', icon: Globe },
    { href: 'admin.artists.index', label: 'Sanatçılar', icon: Mic },
    { href: 'admin.music-genres.index', label: 'Müzik türleri', icon: Tags },
    { href: 'admin.blog.index', label: 'Blog', icon: FileText },
    { href: 'admin.subscriptions.index', label: 'Üyelik Paketleri', icon: CreditCard },
    { href: 'admin.venue-claims.index', label: 'Mekan Sahiplenme', icon: Building2 },
    { href: 'admin.artist-claims.index', label: 'Sanatçı Sahiplenme', icon: Mic2 },
    { href: 'admin.reservations.index', label: 'Rezervasyonlar', icon: ClipboardList },
    { href: 'admin.reviews.index', label: 'Yorumlar', icon: MessageSquare },
    { href: 'admin.categories.index', label: 'Kategoriler', icon: Folder },
    { href: 'admin.cities.index', label: 'Şehirler', icon: MapPin },
    { href: 'admin.ad-slots.index', label: 'Reklam alanları', icon: Megaphone },
    { href: 'admin.smtp.index', label: 'SMTP / E-posta', icon: Mail },
    { href: 'admin.settings.index', label: 'Ayarlar', icon: Settings },
];

export default function AdminLayout({ children }: Readonly<PropsWithChildren>) {
    const pageProps = usePage().props as {
        adminNotifications?: {
            pending_venues: number;
            pending_artists: number;
            draft_events: number;
            pending_reviews: number;
        } | null;
    };
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

    const notificationCounts = useMemo(() => {
        const n = pageProps.adminNotifications;
        return {
            pending_venues: n?.pending_venues ?? 0,
            pending_artists: n?.pending_artists ?? 0,
            draft_events: n?.draft_events ?? 0,
            pending_reviews: n?.pending_reviews ?? 0,
        };
    }, [pageProps.adminNotifications]);

    const notificationCount = useMemo(
        () =>
            notificationCounts.pending_venues +
            notificationCounts.pending_artists +
            notificationCounts.draft_events +
            notificationCounts.pending_reviews,
        [notificationCounts],
    );

    const notifLinkClass =
        'flex items-center justify-between gap-3 text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-white/5 dark:hover:text-white';

    const notifBadgeClass = (c: number) =>
        cn(
            'inline-flex min-w-[1.5rem] justify-center rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums',
            c > 0 ? 'bg-amber-500/25 text-amber-900 dark:text-amber-300' : 'bg-zinc-200 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500',
        );

    const isActive = (href: string) => {
        try {
            if (route().current(href)) {
                return true;
            }
            if (href === 'admin.blog.index' && route().current('admin.blog.create')) {
                return true;
            }
            if (href === 'admin.subscriptions.index' && route().current('admin.subscriptions.create')) {
                return true;
            }
            return false;
        } catch {
            return false;
        }
    };

    const NavLinks = (
        <>
            <div className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300">
                Süper Admin Kontrol Merkezi
            </div>
            {navItems.map((item) => {
                const Icon = item.icon;
                return (
                    <Link
                        key={item.href}
                        href={route(item.href)}
                        onClick={closeSidebar}
                        className={cn(
                            'flex items-center gap-3 rounded-lg px-4 py-3 text-sm transition',
                            isActive(item.href)
                                ? 'bg-amber-500/20 font-medium text-amber-800 dark:text-amber-400'
                                : 'text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white',
                        )}
                    >
                        <Icon className="h-5 w-5 shrink-0 stroke-[1.75]" aria-hidden />
                        {item.label}
                    </Link>
                );
            })}
        </>
    );

    return (
        <div className="flex min-h-[100dvh] bg-zinc-100 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
            {sidebarOpen && (
                <button
                    type="button"
                    className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px] transition-opacity lg:hidden"
                    aria-label="Menüyü kapat"
                    onClick={closeSidebar}
                />
            )}

            <aside
                className={cn(
                    'fixed inset-y-0 left-0 z-50 flex w-[min(100vw-2.5rem,18rem)] max-w-[18rem] flex-col border-r border-zinc-200 bg-white shadow-xl transition-transform duration-200 ease-out dark:border-zinc-800 dark:bg-zinc-900 lg:translate-x-0',
                    sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
                )}
            >
                <div className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-200 px-4 dark:border-zinc-800 lg:h-16 lg:px-5">
                    <Link href={route('admin.dashboard')} className="min-w-0 text-lg font-bold text-amber-600 dark:text-amber-400" onClick={closeSidebar}>
                        SAHNEBUL
                    </Link>
                    <span className="shrink-0 rounded bg-amber-500/20 px-2 py-0.5 text-xs text-amber-800 dark:text-amber-400">Admin</span>
                    <button
                        type="button"
                        className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 lg:hidden"
                        onClick={closeSidebar}
                        aria-label="Kapat"
                    >
                        <X className="h-5 w-5 stroke-[1.75]" aria-hidden />
                    </button>
                </div>
                <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto overflow-x-hidden overscroll-y-contain p-4 [scrollbar-gutter:stable]" aria-label="Yönetim menüsü">
                    {NavLinks}
                </nav>
                <div className="shrink-0 border-t border-zinc-200 p-4 dark:border-zinc-800">
                    <Link
                        href={route('home')}
                        className="flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                        onClick={closeSidebar}
                    >
                        ← Siteye Dön
                    </Link>
                </div>
            </aside>

            {/* Sidebar fixed genişliği max 18rem — pl-64 (16rem) ile çakışıyordu */}
            <div className="flex min-w-0 flex-1 flex-col lg:pl-[18rem]">
                <header className="sticky top-0 z-30 flex min-h-14 flex-wrap items-center gap-2 border-b border-zinc-200 bg-white/95 px-3 py-2 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95 sm:gap-3 sm:px-4 lg:px-6">
                    <button
                        type="button"
                        className="inline-flex items-center justify-center rounded-lg border border-zinc-300 p-2 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800 lg:hidden"
                        onClick={() => setSidebarOpen(true)}
                        aria-label="Menüyü aç"
                    >
                        <Menu className="h-6 w-6 stroke-[1.75]" aria-hidden />
                    </button>
                    <div className="min-w-0 flex-1 text-sm font-medium text-zinc-600 dark:text-zinc-400">Yönetim Paneli</div>
                    <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto sm:flex-nowrap">
                        <Link
                            href={route('admin.profile')}
                            className="rounded-lg border border-zinc-300 px-2.5 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800 sm:px-3 sm:text-sm"
                        >
                            Hesabım
                        </Link>
                        <Dropdown>
                            <Dropdown.Trigger>
                                <span className="inline-flex rounded-lg">
                                    <button
                                        type="button"
                                        className="relative inline-flex items-center gap-1 rounded-lg border border-zinc-300 px-2.5 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800 sm:gap-1.5 sm:px-3 sm:text-sm"
                                        aria-haspopup="menu"
                                    >
                                        Bildirimler
                                        {notificationCount > 0 && (
                                            <span className="inline-flex min-w-[1.25rem] justify-center rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-zinc-900">
                                                {notificationCount > 99 ? '99+' : notificationCount}
                                            </span>
                                        )}
                                        <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60 sm:h-4 sm:w-4" aria-hidden />
                                    </button>
                                </span>
                            </Dropdown.Trigger>
                            <Dropdown.Content
                                width="72"
                                align="right"
                                contentClasses="overflow-hidden rounded-xl border border-zinc-200 bg-white py-2 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
                            >
                                <div className="border-b border-zinc-100 px-4 pb-2 pt-1 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                                    Bekleyen işlemler
                                </div>
                                <Dropdown.Link
                                    href={route('admin.venues.index', { status: 'pending' })}
                                    className={notifLinkClass}
                                >
                                    <span>Mekan onayı</span>
                                    <span className={notifBadgeClass(notificationCounts.pending_venues)}>
                                        {notificationCounts.pending_venues}
                                    </span>
                                </Dropdown.Link>
                                <Dropdown.Link
                                    href={route('admin.artists.index', { status: 'pending' })}
                                    className={notifLinkClass}
                                >
                                    <span>Sanatçı onayı</span>
                                    <span className={notifBadgeClass(notificationCounts.pending_artists)}>
                                        {notificationCounts.pending_artists}
                                    </span>
                                </Dropdown.Link>
                                <Dropdown.Link
                                    href={route('admin.events.index', { status: 'draft' })}
                                    className={notifLinkClass}
                                >
                                    <span>Taslak etkinlik</span>
                                    <span className={notifBadgeClass(notificationCounts.draft_events)}>
                                        {notificationCounts.draft_events}
                                    </span>
                                </Dropdown.Link>
                                <Dropdown.Link
                                    href={route('admin.reviews.index', { approved: 'pending' })}
                                    className={notifLinkClass}
                                >
                                    <span>Yorum onayı</span>
                                    <span className={notifBadgeClass(notificationCounts.pending_reviews)}>
                                        {notificationCounts.pending_reviews}
                                    </span>
                                </Dropdown.Link>
                                <div className="mt-1 border-t border-zinc-100 pt-1 dark:border-zinc-800">
                                    <Dropdown.Link
                                        href={route('admin.dashboard')}
                                        className="text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-zinc-200"
                                    >
                                        Özete git (dashboard)
                                    </Dropdown.Link>
                                </div>
                            </Dropdown.Content>
                        </Dropdown>
                        <button
                            type="button"
                            onClick={toggleTheme}
                            className="rounded-lg border border-zinc-300 px-2.5 py-1.5 text-xs text-zinc-800 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800 sm:px-3 sm:text-sm"
                        >
                            {theme === 'dark' ? 'Açık mod' : 'Koyu mod'}
                        </button>
                        <Link
                            href={route('logout')}
                            method="post"
                            as="button"
                            className="rounded-lg border border-red-500/40 px-2.5 py-1.5 text-xs text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40 sm:px-3 sm:text-sm"
                        >
                            Çıkış
                        </Link>
                    </div>
                </header>
                <main className="admin-shell">
                    <FlashMessage />
                    {children}
                </main>
            </div>
        </div>
    );
}
