import { usePage } from '@inertiajs/react';
import { useEffect, useRef } from 'react';

import { ensureGoogleIdentityInitialized, gsiGoogle } from '@/lib/googleIdentityGsi';

/**
 * Google Identity Services — sunucu `googleAuth` paylaşımına göre; kimlik jetonu `auth.google.credential` rotasına gönderilir.
 * `initialize` ortak modülde (One Tap ile tek sefer).
 */
export default function GoogleSignInButton(_props: Readonly<{ redirect?: string | null }>) {
    const rootRef = useRef<HTMLDivElement>(null);
    const page = usePage();
    const ga = (page.props as { googleAuth?: { enabled?: boolean; clientId?: string | null } }).googleAuth;
    const clientId = ga?.clientId;
    const enabled = ga?.enabled === true && typeof clientId === 'string' && clientId.trim() !== '';

    useEffect(() => {
        if (!enabled || !clientId || !rootRef.current) {
            return;
        }

        let cancelled = false;

        void (async () => {
            const ok = await ensureGoogleIdentityInitialized(clientId);
            if (cancelled || !ok || !rootRef.current) {
                return;
            }
            const el = rootRef.current;
            const g = gsiGoogle();
            if (!el || !g?.accounts?.id) {
                return;
            }
            el.innerHTML = '';
            g.accounts.id.renderButton(el, {
                type: 'standard',
                theme: 'outline',
                size: 'large',
                text: 'continue_with',
                locale: 'tr',
                width: 320,
            });
        })();

        return () => {
            cancelled = true;
        };
    }, [enabled, clientId]);

    if (!enabled) {
        return null;
    }

    return (
        <div className="w-full">
            <p className="mb-3 text-center text-xs text-zinc-500 dark:text-zinc-400">veya</p>
            <div ref={rootRef} className="flex w-full justify-center [&>div]:!w-full [&>div]:!max-w-none" />
        </div>
    );
}
