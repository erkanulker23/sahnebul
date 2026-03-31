import SeoHead from '@/Components/SeoHead';
import AppLayout from '@/Layouts/AppLayout';
import { Link } from '@inertiajs/react';

interface Props {
    ok: boolean;
}

export default function PaytrCheckoutResult({ ok }: Readonly<Props>) {
    return (
        <AppLayout>
            <SeoHead title={ok ? 'Ödeme tamamlandı' : 'Ödeme başarısız'} noindex />
            <div className="mx-auto max-w-lg space-y-4 px-4 py-16 text-center">
                <h1 className="font-display text-2xl font-bold text-zinc-900 dark:text-white">
                    {ok ? 'Ödeme sayfasından dönüldünüz' : 'Ödeme tamamlanamadı'}
                </h1>
                {ok ? (
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        Kesin onay PayTR bildirimiyle oluşur; başarılı işlemde bilet rezervasyonunuz birkaç saniye içinde{' '}
                        <strong className="font-medium text-zinc-800 dark:text-zinc-200">onaylı</strong> görünür.
                    </p>
                ) : (
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        İşlem iptal edilmiş veya banka tarafından reddedilmiş olabilir. Gerekirse farklı kart deneyin veya rezervasyon formunu kullanın.
                    </p>
                )}
                <div className="flex flex-col gap-2 pt-4 sm:flex-row sm:justify-center">
                    <Link
                        href={route('reservations.index')}
                        className="rounded-xl bg-amber-500 px-4 py-3 text-sm font-semibold text-zinc-950 hover:bg-amber-400"
                    >
                        Rezervasyonlarım
                    </Link>
                    <Link
                        href={route('home')}
                        className="rounded-xl border border-zinc-300 px-4 py-3 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                        Ana sayfa
                    </Link>
                </div>
            </div>
        </AppLayout>
    );
}
