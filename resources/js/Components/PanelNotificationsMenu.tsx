import Dropdown from '@/Components/Dropdown';
import { cn } from '@/lib/cn';
import { type PageProps, type PanelNotificationsPayload } from '@/types';
import { usePage } from '@inertiajs/react';
import { ChevronDown } from 'lucide-react';
import { useMemo } from 'react';

type PageWithPanel = PageProps & {
    panelNotifications?: PanelNotificationsPayload | null;
};

const notifLinkClass =
    'flex items-center justify-between gap-3 text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-white/5 dark:hover:text-white';

const notifBadgeClass = (c: number) =>
    cn(
        'inline-flex min-w-[1.5rem] justify-center rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums',
        c > 0 ? 'bg-amber-500/25 text-amber-900 dark:text-amber-300' : 'bg-zinc-200 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500',
    );

/**
 * Admin panelindeki «Bildirimler» menüsüne benzer özet — müşteri ve sahne panelleri (site üst çubuğu / hesap / sahne layout).
 */
export default function PanelNotificationsMenu({
    triggerClassName,
    align = 'right',
}: Readonly<{
    triggerClassName?: string;
    align?: 'left' | 'right';
}>) {
    const page = usePage<PageWithPanel>();
    const payload = page.props.panelNotifications;
    const auth = page.props.auth;

    const showSahneFooter = useMemo(() => {
        if (auth?.is_management_account === true) {
            return true;
        }
        if (auth?.linkedArtist != null) {
            return true;
        }
        if (auth?.sahne_compact_nav === true) {
            return true;
        }

        return false;
    }, [auth]);

    if (payload === null || payload === undefined) {
        return null;
    }

    const { total, items } = payload;

    return (
        <Dropdown>
            <Dropdown.Trigger>
                <span className="inline-flex rounded-lg">
                    <button
                        type="button"
                        className={cn(
                            'relative inline-flex items-center gap-1 rounded-lg border border-zinc-300 px-2.5 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800 sm:gap-1.5 sm:px-3 sm:text-sm',
                            triggerClassName,
                        )}
                        aria-haspopup="menu"
                    >
                        Bildirimler
                        {total > 0 && (
                            <span className="inline-flex min-w-[1.25rem] justify-center rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-zinc-900">
                                {total > 99 ? '99+' : total}
                            </span>
                        )}
                        <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60 sm:h-4 sm:w-4" aria-hidden />
                    </button>
                </span>
            </Dropdown.Trigger>
            <Dropdown.Content
                width="72"
                align={align}
                contentClasses="overflow-hidden rounded-xl border border-zinc-200 bg-white py-2 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
            >
                <div className="border-b border-zinc-100 px-4 pb-2 pt-1 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                    Bekleyen işlemler
                </div>
                {items.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">Şu an bekleyen bir işlem yok.</div>
                ) : (
                    items.map((row) => (
                        <Dropdown.Link key={row.key} href={row.href} className={notifLinkClass}>
                            <span className="min-w-0 flex-1 pe-2">{row.label}</span>
                            <span className={notifBadgeClass(row.count)}>{row.count}</span>
                        </Dropdown.Link>
                    ))
                )}
                <div className="mt-1 border-t border-zinc-100 pt-1 dark:border-zinc-800">
                    <Dropdown.Link
                        href={route('notifications.index')}
                        className="text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-zinc-200"
                    >
                        Tüm bildirimler
                    </Dropdown.Link>
                    <Dropdown.Link
                        href={route('dashboard')}
                        className="text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-zinc-200"
                    >
                        Hesap paneli
                    </Dropdown.Link>
                    {showSahneFooter ? (
                        <Dropdown.Link
                            href={route('artist.dashboard')}
                            className="text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-zinc-200"
                        >
                            Sahne paneli
                        </Dropdown.Link>
                    ) : null}
                </div>
            </Dropdown.Content>
        </Dropdown>
    );
}
