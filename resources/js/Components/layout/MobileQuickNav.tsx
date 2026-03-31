import { iconClass } from '@/lib/icons';
import { cn } from '@/lib/cn';
import { safeRoute } from '@/lib/safeRoute';
import { Link, usePage } from '@inertiajs/react';
import { Calendar, Home, Map, MapPin, Mic2 } from 'lucide-react';

function isHomeUrl(url: string): boolean {
    const u = url.split('?')[0] ?? '';
    return u === '/' || u === '';
}

function isVenuesIndexUrl(url: string): boolean {
    const path = url.split('?')[0] ?? '';
    if (isHomeUrl(path)) return false;
    try {
        if (route().current('venues.index')) return true;
    } catch {
        /* */
    }
    return path === '/mekanlar' || path.startsWith('/mekanlar/');
}

function isDiscoverTonightUrl(url: string): boolean {
    try {
        if (route().current('discover.tonight') || route().current('events.nearby')) return true;
    } catch {
        /* */
    }
    return url.startsWith('/kesfet/bu-aksam');
}

function isArtistsSectionUrl(url: string): boolean {
    try {
        if (route().current('artists.index') || route().current('artists.show')) return true;
    } catch {
        /* */
    }
    const path = url.split('?')[0] ?? '';
    return path === '/sanatcilar' || path.startsWith('/sanatcilar/');
}

/** Canlı harita (Harita sekmesi) hariç genel etkinlik bölümü */
function isEventsSectionUrl(url: string): boolean {
    if (isDiscoverTonightUrl(url)) return false;
    try {
        if (route().current('events.index') || route().current('events.show') || route().current('events.nearby')) {
            return true;
        }
    } catch {
        /* */
    }
    const path = url.split('?')[0] ?? '';
    return path === '/etkinlikler' || path.startsWith('/etkinlikler/');
}

export function MobileQuickNav() {
    const page = usePage();
    const url = page.url ?? '';

    const items = [
        {
            href: route('home'),
            label: 'Ana',
            icon: Home,
            active: isHomeUrl(url),
        },
        {
            href: route('venues.index'),
            label: 'Mekan',
            icon: MapPin,
            active: isVenuesIndexUrl(url),
        },
        {
            href: route('events.index'),
            label: 'Etkinlikler',
            icon: Calendar,
            active: isEventsSectionUrl(url),
        },
        {
            href: safeRoute('discover.tonight'),
            label: 'Harita',
            icon: Map,
            active: isDiscoverTonightUrl(url),
        },
        {
            href: route('artists.index'),
            label: 'Sanatçı',
            icon: Mic2,
            active: isArtistsSectionUrl(url),
        },
    ] as const;

    return (
        <nav
            className="fixed inset-x-0 bottom-0 z-[60] border-t border-zinc-200 bg-white/95 pt-1 shadow-[0_-4px_24px_-4px_rgba(0,0,0,0.08)] backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/95 dark:shadow-[0_-4px_24px_-4px_rgba(0,0,0,0.2)] lg:hidden"
            style={{ paddingBottom: 'max(0.2rem, env(safe-area-inset-bottom))' }}
            aria-label="Hızlı erişim"
        >
            <div className="mx-auto flex max-w-[1600px] items-stretch justify-around gap-0.5 px-1">
                {items.map(({ href, label, icon: Icon, active }) => (
                    <Link
                        key={href}
                        href={href}
                        prefetch
                        className={cn(
                            'flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-0.5 py-2 text-[10px] font-medium transition-colors sm:text-[11px]',
                            active
                                ? 'text-amber-700 dark:text-amber-400'
                                : 'text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white',
                        )}
                    >
                        <Icon
                            className={cn(iconClass.md, active ? 'text-amber-600 dark:text-amber-400' : 'opacity-85')}
                            aria-hidden
                        />
                        <span className="max-w-full truncate">{label}</span>
                    </Link>
                ))}
            </div>
        </nav>
    );
}
