import EmailVerificationBanner from '@/Components/EmailVerificationBanner';
import { SahnebulWordmark } from '@/Components/brand/SahnebulWordmark';
import Dropdown from '@/Components/Dropdown';
import FlashMessage from '@/Components/FlashMessage';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/cn';
import { safeRoute } from '@/lib/safeRoute';
import { Link, usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    Briefcase,
    Building2,
    Calendar,
    ChevronDown,
    Cloud,
    ClipboardList,
    Cookie,
    CreditCard,
    FileText,
    Folder,
    GalleryHorizontal,
    Globe,
    Image,
    Inbox,
    LayoutDashboard,
    LogIn,
    Mail,
    MapPin,
    Megaphone,
    Menu,
    MessageSquare,
    Mic,
    PenLine,
    Mic2,
    Search,
    ShieldCheck,
    NotebookText,
    Settings,
    Tags,
    User,
    Users,
    X,
} from 'lucide-react';
import { PropsWithChildren, useCallback, useEffect, useMemo, useState } from 'react';

type AdminNavItem = {
    navKey: string;
    href: string;
    label: string;
    icon: typeof LayoutDashboard;
    /** URL sorgu parametreleri (örn. ?role=…) */
    query?: Record<string, string>;
};

const navItems: AdminNavItem[] = [
    { navKey: 'admin.dashboard', href: 'admin.dashboard', label: 'Yönetim paneli', icon: LayoutDashboard },
    { navKey: 'admin.profile', href: 'admin.profile', label: 'Hesabım', icon: User },
    { navKey: 'admin.users.index', href: 'admin.users.index', label: 'Kullanıcılar', icon: Users },
    {
        navKey: 'admin.users.organization_firms',
        href: 'admin.users.index',
        label: 'Organizasyon Firmaları',
        icon: Briefcase,
        query: { role: 'manager_organization' },
    },
    { navKey: 'admin.venues.index', href: 'admin.venues.index', label: 'Mekanlar', icon: Building2 },
    { navKey: 'admin.events.index', href: 'admin.events.index', label: 'Etkinlikler', icon: Calendar },
    { navKey: 'admin.external-events.index', href: 'admin.external-events.index', label: 'Dış kaynak adayları', icon: Globe },
    {
        navKey: 'admin.external-events.bubilet-cookies.index',
        href: 'admin.external-events.bubilet-cookies.index',
        label: 'Bubilet çerezi',
        icon: Cloud,
    },
    { navKey: 'admin.artists.index', href: 'admin.artists.index', label: 'Sanatçılar', icon: Mic },
    { navKey: 'admin.music-genres.index', href: 'admin.music-genres.index', label: 'Müzik türleri', icon: Tags },
    { navKey: 'admin.blog.index', href: 'admin.blog.index', label: 'Blog', icon: FileText },
    { navKey: 'admin.subscriptions.index', href: 'admin.subscriptions.index', label: 'Üyelik Paketleri', icon: CreditCard },
    { navKey: 'admin.venue-claims.index', href: 'admin.venue-claims.index', label: 'Mekan Sahiplenme', icon: Building2 },
    { navKey: 'admin.artist-claims.index', href: 'admin.artist-claims.index', label: 'Sanatçı Sahiplenme', icon: Mic2 },
    { navKey: 'admin.reservations.index', href: 'admin.reservations.index', label: 'Rezervasyonlar', icon: ClipboardList },
    { navKey: 'admin.contact-messages.index', href: 'admin.contact-messages.index', label: 'İletişim mesajları', icon: Inbox },
    { navKey: 'admin.reviews.index', href: 'admin.reviews.index', label: 'Yorumlar', icon: MessageSquare },
    { navKey: 'admin.edit-suggestions.index', href: 'admin.edit-suggestions.index', label: 'Düzenleme önerileri', icon: PenLine },
    { navKey: 'admin.event-artist-reports.index', href: 'admin.event-artist-reports.index', label: 'Kadro raporları', icon: AlertTriangle },
    { navKey: 'admin.artist-event-proposals.index', href: 'admin.artist-event-proposals.index', label: 'Sanatçı etkinlik önerileri', icon: FileText },
    { navKey: 'admin.artist-gallery-moderation.index', href: 'admin.artist-gallery-moderation.index', label: 'Sanatçı galeri onayları', icon: Image },
    { navKey: 'admin.categories.index', href: 'admin.categories.index', label: 'Kategoriler', icon: Folder },
    { navKey: 'admin.cities.index', href: 'admin.cities.index', label: 'Şehirler', icon: MapPin },
    { navKey: 'admin.ad-slots.index', href: 'admin.ad-slots.index', label: 'Reklam alanları', icon: Megaphone },
    { navKey: 'admin.smtp.index', href: 'admin.smtp.index', label: 'SMTP / E-posta', icon: Mail },
    {
        navKey: 'admin.instagram-promo-cookies.index',
        href: 'admin.instagram-promo-cookies.index',
        label: 'Instagram çerez (video)',
        icon: Cookie,
    },
    { navKey: 'admin.settings.index', href: 'admin.settings.index', label: 'Ayarlar', icon: Settings },
    {
        navKey: 'admin.google-sign-in.index',
        href: 'admin.google-sign-in.index',
        label: 'Google ile giriş (kullanıcı)',
        icon: LogIn,
    },
    {
        navKey: 'admin.verification-scripts.index',
        href: 'admin.verification-scripts.index',
        label: 'Doğrulama ve özel kodlar',
        icon: ShieldCheck,
    },
    { navKey: 'admin.content-sliders.index', href: 'admin.content-sliders.index', label: 'Slider ekle', icon: GalleryHorizontal },
    { navKey: 'admin.page-seo.index', href: 'admin.page-seo.index', label: 'SEO sayfaları', icon: NotebookText },
    { navKey: 'admin.paytr.index', href: 'admin.paytr.index', label: 'PayTR ödeme', icon: CreditCard },
    { navKey: 'admin.seo-tools.index', href: 'admin.seo-tools.index', label: 'SEO / Site haritası', icon: Search },
];

export default function AdminLayout({ children }: Readonly<PropsWithChildren>) {
    const pageProps = usePage().props as {
        auth?: { is_super_admin?: boolean; email_verification_banner?: boolean };
        adminNotifications?: {
            pending_venues: number;
            pending_artists: number;
            draft_events: number;
            pending_reviews: number;
            pending_event_artist_reports: number;
            pending_artist_event_proposals?: number;
            pending_artist_media?: number;
        } | null;
    };
    const isSuperAdmin = pageProps.auth?.is_super_admin === true;

    const visibleNavItems = useMemo(
        () =>
            isSuperAdmin
                ? navItems
                : navItems.filter(
                      (i) =>
                          i.navKey !== 'admin.smtp.index' &&
                          i.navKey !== 'admin.google-sign-in.index' &&
                          i.navKey !== 'admin.verification-scripts.index' &&
                          i.navKey !== 'admin.page-seo.index' &&
                          i.navKey !== 'admin.paytr.index',
                  ),
        [isSuperAdmin],
    );
    const currentUrl = usePage().url;
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
            pending_event_artist_reports: n?.pending_event_artist_reports ?? 0,
            pending_artist_event_proposals: n?.pending_artist_event_proposals ?? 0,
            pending_artist_media: n?.pending_artist_media ?? 0,
        };
    }, [pageProps.adminNotifications]);

    const notificationCount = useMemo(
        () =>
            notificationCounts.pending_venues +
            notificationCounts.pending_artists +
            notificationCounts.draft_events +
            notificationCounts.pending_reviews +
            notificationCounts.pending_event_artist_reports +
            notificationCounts.pending_artist_event_proposals +
            notificationCounts.pending_artist_media,
        [notificationCounts],
    );

    const notifLinkClass =
        'flex items-center justify-between gap-3 text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-white/5 dark:hover:text-white';

    const notifBadgeClass = (c: number) =>
        cn(
            'inline-flex min-w-[1.5rem] justify-center rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums',
            c > 0 ? 'bg-amber-500/25 text-amber-900 dark:text-amber-300' : 'bg-zinc-200 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500',
        );

    const navItemIsActive = (item: AdminNavItem) => {
        if (item.href === 'admin.content-sliders.index' && currentUrl.startsWith('/admin/slider')) {
            return true;
        }
        if (item.href === 'admin.external-events.index' && currentUrl.startsWith('/admin/dis-kaynak-etkinlikler')) {
            if (currentUrl.startsWith('/admin/dis-kaynak-etkinlikler-bubilet-cerezleri')) {
                return false;
            }

            return true;
        }
        if (
            item.href === 'admin.external-events.bubilet-cookies.index' &&
            currentUrl.startsWith('/admin/dis-kaynak-etkinlikler-bubilet-cerezleri')
        ) {
            return true;
        }
        if (item.href === 'admin.instagram-promo-cookies.index' && currentUrl.startsWith('/admin/tanitim-video-instagram-cerezleri')) {
            return true;
        }
        if (item.href === 'admin.google-sign-in.index' && currentUrl.startsWith('/admin/google-ile-kullanici-girisi')) {
            return true;
        }
        if (item.href === 'admin.verification-scripts.index' && currentUrl.startsWith('/admin/dogrulama-ve-ozel-kodlar')) {
            return true;
        }
        try {
            if (item.query && Object.keys(item.query).length > 0) {
                if (! route().current(item.href)) {
                    return false;
                }
                const qs = currentUrl.includes('?') ? currentUrl.slice(currentUrl.indexOf('?') + 1) : '';
                const params = new URLSearchParams(qs);
                for (const [k, v] of Object.entries(item.query)) {
                    if (params.get(k) !== v) {
                        return false;
                    }
                }

                return true;
            }
            if (item.href === 'admin.users.index') {
                if (! route().current('admin.users.index')) {
                    return false;
                }
                const qs = currentUrl.includes('?') ? currentUrl.slice(currentUrl.indexOf('?') + 1) : '';
                const role = new URLSearchParams(qs).get('role');

                return role !== 'manager_organization';
            }
            if (route().current(item.href)) {
                return true;
            }
            if (item.href === 'admin.blog.index' && route().current('admin.blog.create')) {
                return true;
            }
            if (item.href === 'admin.subscriptions.index' && route().current('admin.subscriptions.create')) {
                return true;
            }

            return false;
        } catch {
            return false;
        }
    };

    const NavLinks = (
        <>
            <div
                className={cn(
                    'mb-3 rounded-lg border p-3 text-xs',
                    isSuperAdmin
                        ? 'border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300'
                        : 'border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-400',
                )}
            >
                {isSuperAdmin
                    ? 'Süper yönetici — SMTP ve site kimliği ayarlarını düzenleyebilirsiniz.'
                    : 'Yönetim menüsü — SMTP ve site kimliği yalnızca süper yöneticidedir.'}
            </div>
            {visibleNavItems.map((item) => {
                const Icon = item.icon;
                /** Ziggy listesi deploy/önbellek uyumsuzluğunda route() patlamasın — yedek path kullan */
                const href =
                    item.href === 'admin.event-artist-reports.index' ||
                    item.href === 'admin.seo-tools.index' ||
                    item.href === 'admin.content-sliders.index' ||
                    item.href === 'admin.external-events.index' ||
                    item.href === 'admin.external-events.bubilet-cookies.index' ||
                    item.href === 'admin.google-sign-in.index' ||
                    item.href === 'admin.verification-scripts.index' ||
                    item.href === 'admin.instagram-promo-cookies.index'
                        ? safeRoute(item.href, item.query ?? {})
                        : route(item.href, item.query ?? {});

                return (
                    <Link
                        key={item.navKey}
                        href={href}
                        onClick={closeSidebar}
                        className={cn(
                            'flex items-center gap-3 rounded-lg px-4 py-3 text-sm transition',
                            navItemIsActive(item)
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
                    <SahnebulWordmark
                        size="sm"
                        href={route('admin.dashboard')}
                        onClick={closeSidebar}
                        className="min-w-0 flex-1"
                    />
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
                                <Dropdown.Link
                                    href={safeRoute('admin.event-artist-reports.index', { status: 'pending' })}
                                    className={notifLinkClass}
                                >
                                    <span>Kadro / etkinlik raporu</span>
                                    <span className={notifBadgeClass(notificationCounts.pending_event_artist_reports)}>
                                        {notificationCounts.pending_event_artist_reports}
                                    </span>
                                </Dropdown.Link>
                                <Dropdown.Link
                                    href={route('admin.artist-event-proposals.index')}
                                    className={notifLinkClass}
                                >
                                    <span>Sanatçı etkinlik + mekân önerisi</span>
                                    <span className={notifBadgeClass(notificationCounts.pending_artist_event_proposals)}>
                                        {notificationCounts.pending_artist_event_proposals}
                                    </span>
                                </Dropdown.Link>
                                <Dropdown.Link
                                    href={route('admin.artist-gallery-moderation.index')}
                                    className={notifLinkClass}
                                >
                                    <span>Sanatçı galeri onayı</span>
                                    <span className={notifBadgeClass(notificationCounts.pending_artist_media)}>
                                        {notificationCounts.pending_artist_media}
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
                <EmailVerificationBanner />
                <FlashMessage />
                <main className="admin-shell">{children}</main>
            </div>
        </div>
    );
}
