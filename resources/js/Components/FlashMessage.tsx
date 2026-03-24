import { cn } from '@/lib/cn';
import { usePage } from '@inertiajs/react';
import { CheckCircle2, X as CloseIcon, XCircle } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

/** tailwind `toast-progress` animasyon süresi ile aynı olmalı */
const DISMISS_MS = 5500;

/** İlk cümle başlık, ". " sonrası açıklama (örn. "Eklendi. Detayları düzenleyin.") */
function splitFlashText(text: string): { headline: string; supporting?: string } {
    const t = text.trim();
    const i = t.indexOf('. ');
    if (i > 0) {
        return {
            headline: t.slice(0, i + 1).trim(),
            supporting: t.slice(i + 2).trim() || undefined,
        };
    }
    return { headline: t };
}

export default function FlashMessage() {
    const { flash } = usePage().props as { flash?: { success?: string; error?: string } };
    const [visible, setVisible] = useState(false);
    const [rendered, setRendered] = useState(false);

    const payload = useMemo(() => {
        if (flash?.error) {
            return { variant: 'error' as const, raw: flash.error };
        }
        if (flash?.success) {
            return { variant: 'success' as const, raw: flash.success };
        }
        return null;
    }, [flash?.error, flash?.success]);

    const { headline, supporting } = useMemo(
        () => (payload ? splitFlashText(payload.raw) : { headline: '', supporting: undefined as string | undefined }),
        [payload],
    );

    const dismiss = useCallback(() => setVisible(false), []);

    useEffect(() => {
        if (!payload) {
            setRendered(false);
            setVisible(false);
            return;
        }
        setRendered(true);
        setVisible(true);
        const t = setTimeout(() => setVisible(false), DISMISS_MS);
        return () => clearTimeout(t);
    }, [payload]);

    useEffect(() => {
        if (!visible && rendered && payload) {
            const t = setTimeout(() => setRendered(false), 300);
            return () => clearTimeout(t);
        }
    }, [visible, rendered, payload]);

    if (!rendered || !payload || typeof document === 'undefined') {
        return null;
    }

    const isError = payload.variant === 'error';

    const toast = (
        <div
            className={cn(
                'pointer-events-none fixed left-3 right-3 top-3 z-[200] flex justify-center sm:left-auto sm:right-5 sm:top-5 sm:justify-end',
                !visible &&
                    'animate-toast-out motion-reduce:animate-none motion-reduce:opacity-0 motion-reduce:duration-0',
            )}
            role="status"
            aria-live={isError ? 'assertive' : 'polite'}
            aria-atomic="true"
        >
            <div
                className={cn(
                    'pointer-events-auto relative w-full max-w-md overflow-hidden rounded-2xl border shadow-ds-lg',
                    visible && 'animate-toast-in motion-reduce:animate-none',
                    !visible && 'motion-reduce:animate-none',
                )}
            >
                <div
                    className={cn(
                        'absolute left-0 top-0 h-full w-1 rounded-l-2xl',
                        isError ? 'bg-rose-500 dark:bg-rose-500' : 'bg-emerald-500 dark:bg-emerald-400',
                    )}
                    aria-hidden
                />
                <div className="flex gap-3 px-4 py-3.5 pl-5 pr-11">
                    <div
                        className={cn(
                            'mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                            isError
                                ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/80 dark:text-rose-400'
                                : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/80 dark:text-emerald-400',
                        )}
                    >
                        {isError ? <XCircle className="h-5 w-5 stroke-[2]" aria-hidden /> : <CheckCircle2 className="h-5 w-5 stroke-[2]" aria-hidden />}
                    </div>
                    <div className="min-w-0 flex-1 pt-0.5">
                        <p className="font-display text-sm font-semibold leading-snug text-zinc-900 dark:text-zinc-50">{headline}</p>
                        {supporting ? (
                            <p className="mt-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{supporting}</p>
                        ) : null}
                    </div>
                </div>
                <button
                    type="button"
                    onClick={dismiss}
                    className="absolute right-2 top-2 rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                    aria-label="Bildirimi kapat"
                >
                    <CloseIcon className="h-4 w-4 stroke-[2]" aria-hidden />
                </button>
                <div
                    className={cn(
                        'h-0.5 origin-left rounded-b-2xl',
                        isError ? 'bg-rose-400/80 dark:bg-rose-500/60' : 'bg-emerald-400/80 dark:bg-emerald-500/60',
                        visible && 'motion-reduce:hidden animate-toast-progress',
                    )}
                    aria-hidden
                />
            </div>
        </div>
    );

    return createPortal(toast, document.body);
}
