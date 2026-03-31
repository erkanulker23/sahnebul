import { cn } from '@/lib/cn';
import { Link, usePage } from '@inertiajs/react';
import { Bell, LayoutDashboard, Ticket, User } from 'lucide-react';

/**
 * Kullanıcı paneli için tek navigasyon: masaüstünde sol sütun, mobilde yatay kaydırmalı.
 * Eski AccountQuickNav + AuthenticatedLayout üst çubuğunun yerini alır.
 */
export function AccountSidebar({ className }: Readonly<{ className?: string }>) {
    const { auth } = usePage().props as {
        auth: {
            is_platform_admin?: boolean;
        };
    };
    const hideCustomer = auth?.is_platform_admin === true;

    const items = [
        {
            key: 'dashboard',
            label: 'Panel',
            href: route('dashboard'),
            icon: LayoutDashboard,
            active: route().current('dashboard'),
        },
        ...(hideCustomer
            ? []
            : ([
                  {
                      key: 'reservations',
                      label: 'Rezervasyonlar',
                      href: route('reservations.index'),
                      icon: Ticket,
                      active: route().current('reservations.index'),
                  },
                  {
                      key: 'notifications',
                      label: 'Bildirimler',
                      href: route('notifications.index'),
                      icon: Bell,
                      active: route().current('notifications.index'),
                  },
              ] as const)),
        {
            key: 'account',
            label: 'Hesabım',
            href: route('profile.edit'),
            icon: User,
            active: route().current('profile.edit'),
        },
    ];

    const linkClass = (active: boolean) =>
        cn(
            'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
            active
                ? 'bg-amber-500/15 text-amber-900 ring-1 ring-amber-500/25 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20'
                : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-white',
        );

    return (
        <>
            {/* Mobil: üstte tek sıra */}
            <nav
                aria-label="Hesap menüsü"
                className={cn(
                    '-mx-1 flex gap-1 overflow-x-auto pb-1 pl-1 lg:hidden',
                    className,
                )}
            >
                {items.map((item) => (
                    <Link
                        key={item.key}
                        href={item.href}
                        prefetch
                        className={cn(
                            'shrink-0 rounded-full px-3 py-2 text-xs font-medium transition sm:text-sm',
                            item.active
                                ? 'bg-amber-500 text-zinc-950 shadow-sm dark:bg-amber-500 dark:text-zinc-950'
                                : 'border border-zinc-200 bg-white text-zinc-700 dark:border-white/10 dark:bg-zinc-900/60 dark:text-zinc-300',
                        )}
                    >
                        {item.label}
                    </Link>
                ))}
            </nav>

            {/* Masaüstü: sol sütun */}
            <nav
                aria-label="Hesap menüsü"
                className={cn(
                    'hidden w-52 shrink-0 flex-col gap-0.5 rounded-2xl border border-zinc-200/90 bg-white p-2 shadow-sm dark:border-white/10 dark:bg-zinc-900/50 dark:shadow-none lg:flex',
                    className,
                )}
            >
                <p className="px-3 pb-2 pt-1 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-500">Hesabım</p>
                {items.map((item) => {
                    const Icon = item.icon;
                    return (
                        <Link key={item.key} href={item.href} prefetch className={linkClass(item.active)}>
                            <Icon className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                            {item.label}
                        </Link>
                    );
                })}
            </nav>
        </>
    );
}
