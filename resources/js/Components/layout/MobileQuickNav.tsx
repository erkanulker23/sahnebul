import { cn } from '@/lib/cn';
import { Link } from '@inertiajs/react';
import { Calendar, Home, MapPin, Mic2 } from 'lucide-react';

function navActive(routePatterns: string[]): boolean {
    try {
        return routePatterns.some((r) => route().current(r));
    } catch {
        return false;
    }
}

const itemClass = (active: boolean) =>
    cn(
        'flex min-h-[3.25rem] flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1 text-[11px] font-medium leading-tight transition-colors',
        active ? 'text-amber-600 dark:text-amber-400' : 'text-zinc-600 dark:text-zinc-400',
    );

/**
 * Küçük ekranlarda sabit alt şerit — PWA (Ana ekrana ekle) ve mobil Safari’de
 * hem görünürlük hem güvenli alan için üst menüye ek olarak.
 */
export function MobileQuickNav() {
    const home = navActive(['home']);
    const venues = navActive(['venues.index', 'venues.show', 'venues.nearby']);
    const events = navActive(['events.index', 'events.show', 'events.nearby', 'discover.tonight']);
    const artists = navActive(['artists.index', 'artists.show']);

    return (
        <nav
            className="fixed inset-x-0 bottom-0 z-[60] flex border-t border-zinc-200 bg-white/95 pb-[env(safe-area-inset-bottom,0px)] shadow-[0_-4px_24px_-8px_rgba(0,0,0,0.12)] backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/95 dark:shadow-black/30 lg:hidden"
            aria-label="Hızlı erişim"
        >
            <Link href={route('home')} className={itemClass(home)} prefetch>
                <Home className="h-5 w-5 shrink-0 opacity-90" aria-hidden />
                Ana sayfa
            </Link>
            <Link href={route('venues.index')} className={itemClass(venues)} prefetch>
                <MapPin className="h-5 w-5 shrink-0 opacity-90" aria-hidden />
                Mekanlar
            </Link>
            <Link href={route('events.index')} className={itemClass(events)} prefetch>
                <Calendar className="h-5 w-5 shrink-0 opacity-90" aria-hidden />
                Etkinlikler
            </Link>
            <Link href={route('artists.index')} className={itemClass(artists)} prefetch>
                <Mic2 className="h-5 w-5 shrink-0 opacity-90" aria-hidden />
                Sanatçılar
            </Link>
        </nav>
    );
}
