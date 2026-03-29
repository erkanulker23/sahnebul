import { ensureGoogleIdentityInitialized, gsiGoogle } from '@/lib/googleIdentityGsi';
import { usePage } from '@inertiajs/react';
import { useEffect } from 'react';

const SESSION_PROMPT_KEY = 'sahnebul_google_one_tap_prompted';

let oneTapScheduleInFlight = false;

function shouldSkipOneTapForPath(url: string): boolean {
    const path = url.split('?')[0] ?? url;
    if (path.startsWith('/admin') || path.startsWith('/yonetim') || path.startsWith('/sahne')) {
        return true;
    }
    if (path.startsWith('/giris') || path.startsWith('/kayit')) {
        return true;
    }
    if (path.includes('forgot-password') || path.includes('reset-password') || path.includes('verify-email')) {
        return true;
    }
    return false;
}

/**
 * Google ile giriş açıksa, oturumu olmayan ziyaretçilere One Tap / FedCM istemini gösterir.
 * Oturum başına en fazla bir kez (sayfa yenilemede tekrar denemez).
 */
export default function GoogleOneTapPrompt() {
    const page = usePage();
    const user = (page.props as { auth?: { user?: unknown } }).auth?.user;
    const ga = (page.props as { googleAuth?: { enabled?: boolean; clientId?: string | null } }).googleAuth;
    const clientId = ga?.clientId;
    const enabled = ga?.enabled === true && typeof clientId === 'string' && clientId.trim() !== '';
    const url = page.url;

    useEffect(() => {
        if (typeof window === 'undefined' || user != null || !enabled || !clientId) {
            return;
        }
        if (shouldSkipOneTapForPath(url)) {
            return;
        }
        if (sessionStorage.getItem(SESSION_PROMPT_KEY) === '1') {
            return;
        }
        if (oneTapScheduleInFlight) {
            return;
        }
        oneTapScheduleInFlight = true;

        let cancelled = false;
        const t = window.setTimeout(() => {
            void (async () => {
                if (cancelled || sessionStorage.getItem(SESSION_PROMPT_KEY) === '1') {
                    oneTapScheduleInFlight = false;
                    return;
                }
                const ok = await ensureGoogleIdentityInitialized(clientId);
                if (cancelled || !ok) {
                    oneTapScheduleInFlight = false;
                    return;
                }
                const idApi = gsiGoogle()?.accounts?.id;
                if (!idApi?.prompt) {
                    oneTapScheduleInFlight = false;
                    return;
                }
                sessionStorage.setItem(SESSION_PROMPT_KEY, '1');
                idApi.prompt();
                oneTapScheduleInFlight = false;
            })();
        }, 400);

        return () => {
            cancelled = true;
            window.clearTimeout(t);
            oneTapScheduleInFlight = false;
        };
    }, [user, enabled, clientId, url]);

    return null;
}
