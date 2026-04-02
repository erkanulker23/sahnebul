import { cn } from '@/lib/cn';
import { Link, usePage } from '@inertiajs/react';
import type { PageProps } from '@/types';
import {
    Building2,
    Calendar,
    CalendarCheck,
    ClipboardList,
    Home,
    LayoutDashboard,
    Mic,
    User,
    Users,
    type LucideIcon,
} from 'lucide-react';
import { useMemo } from 'react';

function routeActive(name: string): boolean {
    try {
        return route().current(name);
    } catch {
        return false;
    }
}

function routeMatches(pattern: string): boolean {
    try {
        return Boolean(route().current(pattern));
    } catch {
        return false;
    }
}

type Item = { key: string; href: string; label: string; icon: LucideIcon; active: boolean };

/**
 * Sahne paneli (sanatçı / mekân / Management) sol menüsü — AccountSidebar ile aynı görsel dil.
 */
export function StagePanelSidebar({ className }: Readonly<{ className?: string }>) {
    const auth = usePage<PageProps>().props.auth;
    const { linkedArtist } = auth;
    const isManagementAccount = auth.is_management_account === true;
    const showVenueNav = auth.artist_panel_show_venue_nav !== false;
    const navBadge = auth.stage_sidebar_nav_badge ?? (showVenueNav === true ? 'Mekân ve etkinlik' : 'Sanatçı paneli');

    const items = useMemo((): Item[] => {
        const core: Item[] = [
            {
                key: 'dash',
                href: route('artist.dashboard'),
                label: 'Panel',
                icon: LayoutDashboard,
                active: routeActive('artist.dashboard'),
            },
            {
                key: 'profile',
                href: route('artist.profile'),
                label: 'Profil',
                icon: User,
                active: routeActive('artist.profile'),
            },
            {
                key: 'events',
                href: route('artist.events.index'),
                label: 'Etkinlikler',
                icon: Calendar,
                active: routeMatches('artist.events.*'),
            },
        ];

        const venueItems: Item[] = showVenueNav
            ? [
                  {
                      key: 'venues',
                      href: route('artist.venues.index'),
                      label: 'Mekanlarım',
                      icon: Building2,
                      active: routeMatches('artist.venues.*'),
                  },
                  {
                      key: 'res',
                      href: route('artist.reservations.index'),
                      label: 'Rezervasyonlar',
                      icon: ClipboardList,
                      active: routeActive('artist.reservations.index'),
                  },
              ]
            : [];

        const linkedArtistItems: Item[] = linkedArtist
            ? [
                  {
                      key: 'public',
                      href: route('artist.public-profile'),
                      label: 'Sanatçı sayfam',
                      icon: Mic,
                      active: routeMatches('artist.public-profile*'),
                  },
                  {
                      key: 'avail',
                      href: route('artist.availability.index'),
                      label: 'Müsaitlik takvimi',
                      icon: CalendarCheck,
                      active: routeMatches('artist.availability.*'),
                  },
              ]
            : [];

        const orgItems: Item[] = isManagementAccount
            ? [
                  {
                      key: 'org-artists',
                      href: route('artist.management.artists.index'),
                      label: 'Sanatçı kadrosu',
                      icon: Mic,
                      active: routeMatches('artist.management.artists.*'),
                  },
                  {
                      key: 'mgr-avail',
                      href: route('artist.management.availability.index'),
                      label: 'Sanatçı müsaitlikleri',
                      icon: Users,
                      active: routeMatches('artist.management.availability.*'),
                  },
              ]
            : [];

        return [...core, ...venueItems, ...linkedArtistItems, ...orgItems];
    }, [linkedArtist, isManagementAccount, showVenueNav]);

    const linkClass = (active: boolean) =>
        cn(
            'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
            active
                ? 'bg-amber-500/15 text-amber-900 ring-1 ring-amber-500/25 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20'
                : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-white',
        );

    return (
        <>
            <nav
                aria-label="Sahne paneli menüsü"
                className={cn('-mx-1 flex gap-1 overflow-x-auto pb-1 pl-1 lg:hidden', className)}
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

            <nav
                aria-label="Sahne paneli menüsü"
                className={cn(
                    'hidden w-56 shrink-0 flex-col gap-0.5 rounded-2xl border border-zinc-200/90 bg-white p-2 shadow-sm dark:border-white/10 dark:bg-zinc-900/50 dark:shadow-none lg:flex',
                    className,
                )}
            >
                <p className="px-3 pb-1 pt-1 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-500">Sahne paneli</p>
                <p className="mb-2 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs leading-snug text-amber-900 dark:text-amber-200/90">
                    {navBadge}
                </p>
                {items.map((item) => {
                    const Icon = item.icon;
                    return (
                        <Link key={item.key} href={item.href} prefetch className={linkClass(item.active)}>
                            <Icon className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                            {item.label}
                        </Link>
                    );
                })}
                <div className="mt-2 border-t border-zinc-200 pt-2 dark:border-white/10">
                    <Link
                        href={route('home')}
                        className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-white"
                    >
                        <Home className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                        Ana sayfa
                    </Link>
                </div>
            </nav>
        </>
    );
}
