import { cn } from '@/lib/cn';
import { Link, usePage } from '@inertiajs/react';
import { Bell, Heart, LayoutDashboard, LifeBuoy, Settings, Star, Ticket, User } from 'lucide-react';

type Props = {
    className?: string;
};

export default function AccountQuickNav({ className = '' }: Readonly<Props>) {
    const page = usePage();
    const tab = new URLSearchParams(page.url.split('?')[1] ?? '').get('tab');
    const items = [
        { key: 'dashboard', label: 'Panel', href: route('dashboard'), icon: LayoutDashboard, active: route().current('dashboard') },
        { key: 'profile', label: 'Profil', href: route('profile.edit'), icon: User, active: route().current('profile.edit') && !tab },
        { key: 'tickets', label: 'Biletlerim', href: `${route('profile.edit')}?tab=biletler`, icon: Ticket, active: route().current('profile.edit') && tab === 'biletler' },
        { key: 'favorites', label: 'Favoriler', href: `${route('profile.edit')}?tab=favoriler`, icon: Heart, active: route().current('profile.edit') && tab === 'favoriler' },
        {
            key: 'reviews',
            label: 'Değerlendirmelerim',
            href: `${route('profile.edit')}?tab=degerlendirmeler`,
            icon: Star,
            active: route().current('profile.edit') && tab === 'degerlendirmeler',
        },
        { key: 'support', label: 'Destek', href: `${route('profile.edit')}?tab=destek`, icon: LifeBuoy, active: route().current('profile.edit') && tab === 'destek' },
        { key: 'settings', label: 'Ayarlar', href: `${route('profile.edit')}?tab=ayarlar`, icon: Settings, active: route().current('profile.edit') && tab === 'ayarlar' },
        { key: 'notifications', label: 'Bildirimler', href: route('notifications.index'), icon: Bell, active: route().current('notifications.index') },
    ];

    return (
        <div className={cn('rounded-2xl border border-zinc-200 bg-white p-2 shadow-sm dark:border-white/10 dark:bg-zinc-900/60 dark:shadow-none', className)}>
            <div className="flex flex-wrap gap-2">
                {items.map((item) => {
                    const Icon = item.icon;
                    const active = item.active;
                    return (
                        <Link
                            key={item.key}
                            href={item.href}
                            className={cn(
                                'inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition',
                                active
                                    ? 'bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                                    : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-white/10 dark:hover:text-white',
                            )}
                        >
                            <Icon className="h-4 w-4" />
                            {item.label}
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
