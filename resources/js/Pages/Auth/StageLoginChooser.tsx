import SeoHead from '@/Components/SeoHead';
import GuestLayout from '@/Layouts/GuestLayout';
import { safeRoute } from '@/lib/safeRoute';
import { Link } from '@inertiajs/react';

export default function StageLoginChooser({
    status,
    canResetPassword,
}: Readonly<{
    status?: string;
    canResetPassword: boolean;
}>) {
    return (
        <GuestLayout>
            <SeoHead
                title="Sahne paneli — Giriş seçimi - Sahnebul"
                description="Sanatçı, mekân sahibi veya organizasyon firması hesabı ile sahne paneline giriş."
                noindex
            />

            {status && (
                <div className="mb-4 rounded-lg bg-green-500/15 p-3 text-sm text-green-800 dark:bg-green-500/20 dark:text-green-400">
                    {status}
                </div>
            )}

            <h2 className="font-display text-2xl font-bold text-zinc-900 dark:text-white">Sahne paneli</h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-500">
                Hesap türünüze uygun giriş sayfasını seçin. Organizasyon firması ile site yönetimi (admin) farklı hesaplardır.
            </p>

            <ul className="mt-8 space-y-3">
                <li>
                    <Link
                        href={safeRoute('login.sanatci')}
                        className="block rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-4 text-left transition hover:border-amber-500/40 hover:bg-amber-500/5 dark:border-white/10 dark:bg-zinc-900/40 dark:hover:bg-zinc-900/70"
                    >
                        <span className="font-semibold text-zinc-900 dark:text-white">Sanatçı paneli</span>
                        <span className="mt-1 block text-sm text-zinc-600 dark:text-zinc-400">Sanatçı rolüyle kayıtlı hesaplar</span>
                    </Link>
                </li>
                <li>
                    <Link
                        href={safeRoute('login.mekan')}
                        className="block rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-4 text-left transition hover:border-amber-500/40 hover:bg-amber-500/5 dark:border-white/10 dark:bg-zinc-900/40 dark:hover:bg-zinc-900/70"
                    >
                        <span className="font-semibold text-zinc-900 dark:text-white">Mekân paneli</span>
                        <span className="mt-1 block text-sm text-zinc-600 dark:text-zinc-400">
                            Mekân sahibi veya mekânı bağlı kullanıcı hesapları
                        </span>
                    </Link>
                </li>
                <li>
                    <Link
                        href={safeRoute('login.organizasyon')}
                        className="block rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-4 text-left transition hover:border-amber-500/40 hover:bg-amber-500/5 dark:border-white/10 dark:bg-zinc-900/40 dark:hover:bg-zinc-900/70"
                    >
                        <span className="font-semibold text-zinc-900 dark:text-white">Organizasyon firması</span>
                        <span className="mt-1 block text-sm text-zinc-600 dark:text-zinc-400">Ajans / organizasyon yönetimi hesapları</span>
                    </Link>
                </li>
            </ul>

            <p className="mt-8 border-t border-zinc-200 pt-6 text-center text-sm text-zinc-600 dark:border-white/10 dark:text-zinc-500">
                Bireysel kullanıcı mısınız?{' '}
                <Link
                    href={safeRoute('login')}
                    className="font-medium text-amber-700 hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-300"
                >
                    Kullanıcı girişi
                </Link>
                {canResetPassword ? (
                    <>
                        {' · '}
                        <Link
                            href={safeRoute('password.request')}
                            className="font-medium text-amber-700 hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-300"
                        >
                            Şifremi unuttum
                        </Link>
                    </>
                ) : null}
            </p>
        </GuestLayout>
    );
}
