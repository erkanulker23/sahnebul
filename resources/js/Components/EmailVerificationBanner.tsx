import { cn } from '@/lib/cn';
import { Link, usePage } from '@inertiajs/react';
import { Mail } from 'lucide-react';

export default function EmailVerificationBanner() {
    const pageProps = usePage().props as { auth?: { email_verification_banner?: boolean } };

    if (pageProps.auth?.email_verification_banner !== true) {
        return null;
    }

    return (
        <div
            className={cn(
                'box-border w-full min-w-0 shrink-0 self-stretch',
                'flex flex-wrap items-center gap-3 border-b px-4 py-3 text-sm',
                'border-sky-200 bg-sky-50 text-sky-950 dark:border-sky-500/30 dark:bg-sky-950/40 dark:text-sky-100',
            )}
            role="region"
            aria-label="E-posta doğrulama hatırlatması"
        >
            <Mail className="h-5 w-5 shrink-0 opacity-80" aria-hidden />
            <p className="min-w-0 flex-1">
                E-posta adresinizi henüz doğrulamadınız. Hesabınızı kullanmaya devam edebilirsiniz; güvenlik ve bazı özellikler için doğrulamanızı
                öneririz.
            </p>
            <Link
                href={route('verification.notice')}
                className="shrink-0 rounded-lg bg-sky-600 px-3 py-1.5 font-medium text-white transition hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-400"
            >
                E-postayı doğrula
            </Link>
        </div>
    );
}
