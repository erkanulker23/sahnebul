import { cn } from '@/lib/cn';
import { type PageProps } from '@/types';
import { Link, router, usePage } from '@inertiajs/react';
import { Bell, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

/** Eski tek anahtar — oturumdaki kullanıcıya taşınır */
const LEGACY_DISMISS_KEY = 'sahnebul_browser_notif_prompt_dismissed';

function dismissKeyForUser(userId: number): string {
    return `sahnebul_browser_notif_prompt_dismissed_${userId}`;
}

function readDismissedFromStorage(userId: number): boolean {
    try {
        if (localStorage.getItem(dismissKeyForUser(userId)) === '1') {
            return true;
        }
        if (localStorage.getItem(LEGACY_DISMISS_KEY) === '1') {
            localStorage.setItem(dismissKeyForUser(userId), '1');
            return true;
        }
    } catch {
        /* private mode vb. */
    }
    return false;
}

function persistDismiss(userId: number): void {
    try {
        localStorage.setItem(dismissKeyForUser(userId), '1');
    } catch {
        /* ignore */
    }
}

async function patchBrowserNotifications(enabled: boolean): Promise<void> {
    const token = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
    const res = await fetch(route('user.browser-notifications'), {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-CSRF-TOKEN': token,
            'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({ enabled }),
    });
    if (!res.ok) {
        throw new Error('Kayıt başarısız');
    }
    router.reload({ only: ['auth'] });
}

export default function BrowserNotificationsBar() {
    const { auth } = usePage<PageProps>().props;
    const user = auth.user;
    const [mounted, setMounted] = useState(false);
    const [dismissed, setDismissed] = useState(false);
    const [busy, setBusy] = useState(false);
    const [deniedHint, setDeniedHint] = useState(false);
    const prevUnread = useRef<number | null>(null);

    useEffect(() => {
        setMounted(true);
        if (!user) {
            return;
        }
        const fromStorage = readDismissedFromStorage(user.id);
        const permDenied = typeof Notification !== 'undefined' && Notification.permission === 'denied';
        setDismissed(fromStorage || permDenied);
        if (permDenied && !fromStorage) {
            persistDismiss(user.id);
        }
    }, [user?.id]);

    const pollUnread = useCallback(async () => {
        if (typeof window === 'undefined' || !('Notification' in window)) {
            return;
        }
        if (Notification.permission !== 'granted') {
            return;
        }
        if (user?.browser_notifications_enabled !== true) {
            return;
        }
        try {
            const res = await fetch(route('api.notifications.summary'), {
                credentials: 'same-origin',
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });
            if (!res.ok) {
                return;
            }
            const data = (await res.json()) as {
                unread_count?: number;
                latest?: { id?: string; title?: string | null; message?: string } | null;
            };
            const count = typeof data.unread_count === 'number' ? data.unread_count : 0;
            const prev = prevUnread.current;
            prevUnread.current = count;
            if (prev !== null && count > prev && data.latest?.message) {
                try {
                    const nTitle =
                        typeof data.latest.title === 'string' && data.latest.title.trim() !== ''
                            ? data.latest.title.trim()
                            : 'Sahnebul';
                    new Notification(nTitle, {
                        body: data.latest.message,
                        tag: data.latest.id ?? 'sahnebul-notif',
                    });
                } catch {
                    /* bazı tarayıcılar Notification oluşturmayı reddedebilir */
                }
            }
        } catch {
            /* ağ hatası — sessiz */
        }
    }, [user?.browser_notifications_enabled]);

    useEffect(() => {
        if (!mounted || user?.browser_notifications_enabled !== true) {
            return;
        }
        if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') {
            return;
        }
        void pollUnread();
        const id = window.setInterval(() => void pollUnread(), 40_000);
        return () => window.clearInterval(id);
    }, [mounted, user?.browser_notifications_enabled, pollUnread]);

    if (!mounted || !user) {
        return null;
    }

    if (typeof window === 'undefined' || !('Notification' in window)) {
        return null;
    }

    const permissionDenied = Notification.permission === 'denied';
    const showPrompt =
        !user.browser_notifications_enabled && !dismissed && !permissionDenied;

    const onEnable = async () => {
        setDeniedHint(false);
        setBusy(true);
        try {
            const perm = await Notification.requestPermission();
            if (perm === 'denied') {
                persistDismiss(user.id);
                setDismissed(true);
                return;
            }
            if (perm !== 'granted') {
                setDeniedHint(true);
                return;
            }
            await patchBrowserNotifications(true);
        } catch {
            setDeniedHint(true);
        } finally {
            setBusy(false);
        }
    };

    const onDismiss = () => {
        persistDismiss(user.id);
        setDismissed(true);
        setDeniedHint(false);
    };

    if (!showPrompt && !deniedHint) {
        return null;
    }

    return (
        <div
            className={cn(
                'flex flex-wrap items-start gap-3 border-b px-4 py-3 text-sm',
                'border-violet-200 bg-violet-50 text-violet-950 dark:border-violet-500/30 dark:bg-violet-950/35 dark:text-violet-100',
            )}
            role="region"
            aria-label="Tarayıcı bildirimleri"
        >
            <Bell className="mt-0.5 h-5 w-5 shrink-0 opacity-80" aria-hidden />
            <div className="min-w-0 flex-1 space-y-2">
                <p>
                    Yeni hesap bildirimlerinizi (ör. etkinlik hatırlatmaları) tarayıcıda da görmek için bildirim izni verin. Sayfa açıkken gelen
                    uyarılar, izin verdiğinizde gösterilir.
                </p>
                {deniedHint ? (
                    <p className="text-xs text-violet-800/90 dark:text-violet-200/85">
                        İzin reddedildiyse tarayıcı adres çubuğundaki kilit veya site ayarlarından Sahnebul için bildirimleri açabilirsiniz. Ardından
                        aşağıdan tekrar deneyin.
                    </p>
                ) : null}
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        disabled={busy}
                        onClick={() => void onEnable()}
                        className="rounded-lg bg-violet-600 px-3 py-1.5 font-medium text-white transition hover:bg-violet-700 disabled:opacity-60 dark:bg-violet-500 dark:hover:bg-violet-400"
                    >
                        {busy ? 'İşleniyor…' : 'Bildirimlere izin ver'}
                    </button>
                    {deniedHint ? (
                        <button
                            type="button"
                            disabled={busy}
                            onClick={() => void onEnable()}
                            className="rounded-lg border border-violet-400/60 px-3 py-1.5 font-medium text-violet-900 transition hover:bg-violet-100 disabled:opacity-60 dark:border-violet-400/40 dark:text-violet-100 dark:hover:bg-violet-900/50"
                        >
                            Tekrar dene
                        </button>
                    ) : null}
                    <Link
                        href={route('notifications.index')}
                        className="text-xs font-medium text-violet-800 underline-offset-2 hover:underline dark:text-violet-200"
                    >
                        Bildirimler sayfası
                    </Link>
                </div>
            </div>
            <button
                type="button"
                onClick={onDismiss}
                className="shrink-0 rounded-lg p-1 text-violet-700 hover:bg-violet-100 dark:text-violet-200 dark:hover:bg-violet-900/60"
                aria-label="Bir daha gösterme"
            >
                <X className="h-5 w-5" aria-hidden />
            </button>
        </div>
    );
}
