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
                <div className="mb-4 rounded-lg bg-green-500/20 p-3 text-sm text-green-400">{status}</div>
            )}

            <h2 className="font-display text-2xl font-bold text-white">Sahne paneli</h2>
            <p className="mt-2 text-sm text-zinc-500">
                Hesap türünüze uygun giriş sayfasını seçin. Organizasyon firması ile site yönetimi (admin) farklı hesaplardır.
            </p>

            <ul className="mt-8 space-y-3">
                <li>
                    <Link
                        href={safeRoute('login.sanatci')}
                        className="block rounded-xl border border-white/10 bg-zinc-900/40 px-4 py-4 text-left transition hover:border-amber-500/40 hover:bg-zinc-900/70"
                    >
                        <span className="font-semibold text-white">Sanatçı paneli</span>
                        <span className="mt-1 block text-sm text-zinc-400">Sanatçı rolüyle kayıtlı hesaplar</span>
                    </Link>
                </li>
                <li>
                    <Link
                        href={safeRoute('login.mekan')}
                        className="block rounded-xl border border-white/10 bg-zinc-900/40 px-4 py-4 text-left transition hover:border-amber-500/40 hover:bg-zinc-900/70"
                    >
                        <span className="font-semibold text-white">Mekân paneli</span>
                        <span className="mt-1 block text-sm text-zinc-400">Mekân sahibi veya mekânı bağlı kullanıcı hesapları</span>
                    </Link>
                </li>
                <li>
                    <Link
                        href={safeRoute('login.organizasyon')}
                        className="block rounded-xl border border-white/10 bg-zinc-900/40 px-4 py-4 text-left transition hover:border-amber-500/40 hover:bg-zinc-900/70"
                    >
                        <span className="font-semibold text-white">Organizasyon firması</span>
                        <span className="mt-1 block text-sm text-zinc-400">Ajans / organizasyon yönetimi hesapları</span>
                    </Link>
                </li>
            </ul>

            <p className="mt-8 border-t border-white/10 pt-6 text-center text-sm text-zinc-500">
                Bireysel kullanıcı mısınız?{' '}
                <Link href={safeRoute('login')} className="font-medium text-amber-400 hover:text-amber-300">
                    Kullanıcı girişi
                </Link>
                {canResetPassword ? (
                    <>
                        {' · '}
                        <Link href={safeRoute('password.request')} className="font-medium text-amber-400 hover:text-amber-300">
                            Şifremi unuttum
                        </Link>
                    </>
                ) : null}
            </p>
        </GuestLayout>
    );
}
