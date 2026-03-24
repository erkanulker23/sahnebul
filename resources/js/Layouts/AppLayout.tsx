import { AdSlot } from '@/Components/AdSlot';
import { AppHeader } from '@/Components/layout/AppHeader';
import { Link, usePage } from '@inertiajs/react';
import { PropsWithChildren } from 'react';

export default function AppLayout({ children }: Readonly<PropsWithChildren>) {
    const pageProps = usePage().props as {
        auth: {
            user: { name: string; email: string; role?: string } | null;
            is_super_admin?: boolean;
        };
        settings?: {
            footer?: {
                brand?: string;
                description?: string;
                contact?: { email?: string; phone?: string; address?: string };
                links?: { label: string; route: string }[];
                social?: { label: string; url: string }[];
                copyright?: string;
            } | null;
        };
    };
    const isSuperAdmin = pageProps.auth?.is_super_admin === true;
    const footer = pageProps.settings?.footer;
    const footerLinks = (() => {
        const links = [...(footer?.links ?? [])];
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
        if (!links.some((link) => link.route === 'contact')) {
            links.push({ label: 'İletişim', route: 'contact' });
        }
        return links;
    })();

    return (
        <div className="flex min-h-[100dvh] flex-col overflow-x-hidden bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
            <AppHeader />

            <AdSlot
                slotKey="header_below_nav"
                variant="full"
                className="w-full border-b border-zinc-200 bg-zinc-100/90 dark:border-zinc-800 dark:bg-zinc-900/40"
            />

            <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>

            {footer && (
                <>
                    <AdSlot
                        slotKey="footer_above"
                        variant="full"
                        className="mt-auto w-full bg-zinc-100/90 py-3 dark:bg-zinc-900/40"
                    />
                    <footer className="border-t border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950/80">
                    <div className="mx-auto grid max-w-[1600px] grid-cols-1 gap-10 px-4 py-12 sm:px-6 lg:grid-cols-6 lg:gap-8 lg:px-8">
                        <div className="min-w-0 lg:col-span-2">
                            <p className="font-display text-2xl font-bold text-zinc-900 dark:text-white">{footer.brand ?? 'SAHNEBUL'}</p>
                            <p className="mt-3 max-w-xl text-sm text-zinc-600 dark:text-zinc-400">{footer.description}</p>
                            <div className="mt-4 space-y-1 text-sm text-zinc-600 dark:text-zinc-500">
                                {footer.contact?.email && <p>{footer.contact.email}</p>}
                                {footer.contact?.phone && <p>{footer.contact.phone}</p>}
                                {footer.contact?.address && <p>{footer.contact.address}</p>}
                            </div>
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-zinc-900 dark:text-white">Hızlı linkler</p>
                            <div className="mt-3 flex flex-col gap-2">
                                {footerLinks.map((link) => (
                                    <Link
                                        key={link.label}
                                        href={route(link.route)}
                                        className="text-sm text-zinc-600 hover:text-amber-600 dark:text-zinc-400 dark:hover:text-amber-400"
                                    >
                                        {link.label}
                                    </Link>
                                ))}
                            </div>
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-zinc-900 dark:text-white">Sosyal</p>
                            <div className="mt-3 flex flex-col gap-2">
                                {(footer.social ?? []).map((social) => (
                                    <a
                                        key={social.label}
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
                        {!isSuperAdmin && (
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-zinc-900 dark:text-white">Üyelik</p>
                                <div className="mt-3 flex flex-col gap-2">
                                    <Link href={route('subscriptions.index', { type: 'venue' })} className="text-sm text-zinc-600 hover:text-amber-600 dark:text-zinc-400 dark:hover:text-amber-400">
                                        Mekan üyeliği
                                    </Link>
                                    <Link href={route('subscriptions.index', { type: 'artist' })} className="text-sm text-zinc-600 hover:text-amber-600 dark:text-zinc-400 dark:hover:text-amber-400">
                                        Sanatçı üyeliği
                                    </Link>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="border-t border-zinc-200 py-4 text-center text-xs text-zinc-500 dark:border-zinc-800">{footer.copyright}</div>
                    </footer>
                </>
            )}
        </div>
    );
}
