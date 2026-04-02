import { AdSlot } from '@/Components/AdSlot';
import BrowserNotificationsBar from '@/Components/BrowserNotificationsBar';
import EmailVerificationBanner from '@/Components/EmailVerificationBanner';
import FlashMessage from '@/Components/FlashMessage';
import GoogleOneTapPrompt from '@/Components/GoogleOneTapPrompt';
import { MicrophoneMark } from '@/Components/brand/MicrophoneMark';
import { AppHeader } from '@/Components/layout/AppHeader';
import { MobileQuickNav } from '@/Components/layout/MobileQuickNav';
import { safeRoute } from '@/lib/safeRoute';
import { cn } from '@/lib/cn';
import { Link, usePage } from '@inertiajs/react';
import { PropsWithChildren } from 'react';

type SiteShellProps = PropsWithChildren<{
    /** Giriş / kayıt / şifre gibi sayfalarda sabit alt «hızlı erişim» şeridini gösterme. */
    hideMobileQuickNav?: boolean;
}>;

/**
 * Ortak site iskeleti: üst menü, banner’lar, ana içerik alanı, footer.
 * AppLayout ve UserPanelLayout bu bileşeni kullanır.
 */
export default function SiteShell({ children, hideMobileQuickNav = false }: Readonly<SiteShellProps>) {
    const pageProps = usePage().props as {
        auth: {
            user: { name: string; email: string; role?: string } | null;
            is_super_admin?: boolean;
            email_verification_banner?: boolean;
        };
        seo?: { logoUrl?: string | null };
        settings?: {
            footer?: {
                brand?: string;
                description?: string;
                contact?: { email?: string; phone?: string; address?: string };
                support_email?: string;
                links?: { label: string; route: string; slug?: string }[];
                social?: { label: string; url: string }[];
                copyright?: string;
            } | null;
        };
    };
    const footerLogoUrl = pageProps.seo?.logoUrl?.trim() || null;
    const footer = pageProps.settings?.footer ?? {
        brand: 'SAHNEBUL',
        description: 'Türkiye genelinde mekanları, sanatçıları ve etkinlikleri keşfet.',
        contact: { email: 'iletisim@sahnebul.com', phone: '', address: '' },
        links: [] as { label: string; route: string; slug?: string }[],
        social: [] as { label: string; url: string }[],
        copyright: '',
    };
    const footerLinks = (() => {
        const links = [...(footer?.links ?? [])] as { label: string; route: string; slug?: string }[];
        if (!links.some((link) => link.route === 'venues.index')) {
            links.unshift({ label: 'Mekanlar', route: 'venues.index' });
        }
        if (!links.some((link) => link.route === 'events.index')) {
            links.push({ label: 'Etkinlikler', route: 'events.index' });
        }
        if (!links.some((link) => link.route === 'artists.index')) {
            links.push({ label: 'Sanatçılar', route: 'artists.index' });
        }
        if (!links.some((link) => link.route === 'blog.index')) {
            links.push({ label: 'Blog', route: 'blog.index' });
        }
        if (!links.some((link) => link.route === 'pages.show' && link.slug === 'hakkimizda')) {
            const contactIdx = links.findIndex((l) => l.route === 'contact');
            const about = { label: 'Hakkımızda', route: 'pages.show', slug: 'hakkimizda' };
            if (contactIdx >= 0) {
                links.splice(contactIdx, 0, about);
            } else {
                links.push(about);
            }
        }
        if (!links.some((link) => link.route === 'contact')) {
            links.push({ label: 'İletişim', route: 'contact' });
        }
        return links;
    })();

    const footerSecondaryLinks = footerLinks.filter(
        (link) => !['venues.index', 'events.index', 'artists.index'].includes(link.route),
    );

    const footerLinkHref = (link: { label: string; route: string; slug?: string }) => {
        if (link.route === 'pages.show' && link.slug) {
            try {
                return route('pages.show', link.slug);
            } catch {
                return `/sayfalar/${encodeURIComponent(link.slug)}`;
            }
        }
        return safeRoute(link.route);
    };

    return (
        <div className="flex min-h-[100dvh] flex-col overflow-x-visible bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
            <AppHeader />
            <EmailVerificationBanner />
            <BrowserNotificationsBar />
            <FlashMessage />
            <GoogleOneTapPrompt />

            <AdSlot
                slotKey="header_below_nav"
                variant="full"
                className="w-full border-b border-zinc-200 bg-zinc-100/90 dark:border-zinc-800 dark:bg-zinc-900/40"
            />

            {/*
              Tam genişlik <main>: hero / tam ekran bantlar viewport kenarına kadar gider (sanatçı detayı gibi).
              Eski max-w-[1600px] + px burada içeriği kutuya hapsediyordu. Kenar boşluğu sayfa içinde
              mx-auto max-w-* ile verilir; hesap paneli düzenlerinde dış flex’e px eklenir.
            */}
            <main
                className={cn(
                    'w-full max-w-none flex-1 overflow-x-visible px-0 pt-0',
                    hideMobileQuickNav
                        ? 'pb-[max(1.5rem,env(safe-area-inset-bottom))] lg:pb-8'
                        : 'pb-6 lg:pb-8',
                )}
            >
                {children}
            </main>

            <div
                className={cn(
                    'mt-auto flex w-full flex-col',
                    !hideMobileQuickNav &&
                        'max-lg:pb-[calc(3.5rem+env(safe-area-inset-bottom,0px))]',
                )}
            >
                <AdSlot
                    slotKey="footer_above"
                    variant="full"
                    className="w-full bg-zinc-100/90 py-3 dark:bg-zinc-900/40"
                />
                <footer className="border-t border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950/80">
                    <div className="mx-auto grid max-w-[1600px] grid-cols-1 gap-10 px-2.5 py-12 sm:px-5 lg:grid-cols-6 lg:gap-8 lg:px-8">
                        <div className="min-w-0 lg:col-span-2">
                            <div className="flex flex-wrap items-center gap-3">
                                {footerLogoUrl ? (
                                    <img
                                        src={footerLogoUrl}
                                        alt=""
                                        className="h-11 w-auto max-w-[220px] object-contain object-left dark:brightness-110"
                                    />
                                ) : (
                                    <MicrophoneMark className="mt-0.5 h-11 w-11 shrink-0" />
                                )}
                                <p className="font-display text-2xl font-bold text-zinc-900 dark:text-white">{footer.brand ?? 'SAHNEBUL'}</p>
                            </div>
                            <p className="mt-3 max-w-xl text-sm text-zinc-600 dark:text-zinc-400">{footer.description}</p>
                            <div className="mt-4 space-y-1 text-sm text-zinc-600 dark:text-zinc-500">
                                {footer.contact?.email && <p>{footer.contact.email}</p>}
                                {footer.support_email && footer.support_email !== footer.contact?.email && (
                                    <p>Destek: {footer.support_email}</p>
                                )}
                                {footer.contact?.phone && <p>{footer.contact.phone}</p>}
                                {footer.contact?.address && <p>{footer.contact.address}</p>}
                            </div>
                        </div>
                        {footerSecondaryLinks.length > 0 ? (
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-zinc-900 dark:text-white">Bilgi</p>
                                <div className="mt-3 flex flex-col gap-2">
                                    {footerSecondaryLinks.map((link) => (
                                        <Link
                                            key={link.route === 'pages.show' && link.slug ? `${link.route}:${link.slug}` : link.route}
                                            href={footerLinkHref(link)}
                                            className="text-sm text-zinc-600 hover:text-amber-600 dark:text-zinc-400 dark:hover:text-amber-400"
                                        >
                                            {link.label}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        ) : null}
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-zinc-900 dark:text-white">Sosyal</p>
                            <div className="mt-3 flex flex-col gap-2">
                                {(footer.social ?? []).map((social) => (
                                    <a
                                        key={social.url}
                                        href={social.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm text-zinc-600 hover:text-amber-600 dark:text-zinc-400 dark:hover:text-amber-400"
                                    >
                                        {social.label}
                                    </a>
                                ))}
                            </div>
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-zinc-900 dark:text-white">Yasal</p>
                            <div className="mt-3 flex flex-col gap-2">
                                <Link href={route('pages.show', 'gizlilik-politikasi')} className="text-sm text-zinc-600 hover:text-amber-600 dark:text-zinc-400 dark:hover:text-amber-400">
                                    Gizlilik
                                </Link>
                                <Link href={route('pages.show', 'cerez-politikasi')} className="text-sm text-zinc-600 hover:text-amber-600 dark:text-zinc-400 dark:hover:text-amber-400">
                                    Çerez politikası
                                </Link>
                                <Link href={route('pages.show', 'kvkk')} className="text-sm text-zinc-600 hover:text-amber-600 dark:text-zinc-400 dark:hover:text-amber-400">
                                    KVKK
                                </Link>
                                <Link href={route('pages.show', 'ticari-elektronik-ileti')} className="text-sm text-zinc-600 hover:text-amber-600 dark:text-zinc-400 dark:hover:text-amber-400">
                                    Ticari elektronik ileti
                                </Link>
                                <Link href={route('pages.show', 'sss')} className="text-sm text-zinc-600 hover:text-amber-600 dark:text-zinc-400 dark:hover:text-amber-400">
                                    SSS
                                </Link>
                            </div>
                        </div>
                    </div>
                    <div className="border-t border-zinc-200 py-4 text-center text-xs text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
                        {footer.copyright || `© ${new Date().getFullYear()} Sahnebul. Tüm hakları saklıdır.`}
                    </div>
                </footer>
            </div>

            {!hideMobileQuickNav ? <MobileQuickNav /> : null}
        </div>
    );
}
