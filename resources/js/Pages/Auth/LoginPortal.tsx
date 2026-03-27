import Checkbox from '@/Components/Checkbox';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import SeoHead from '@/Components/SeoHead';
import GuestLayout from '@/Layouts/GuestLayout';
import { safeRoute } from '@/lib/safeRoute';
import { sanitizeEmailInput } from '@/lib/trPhoneInput';
import { Link, useForm } from '@inertiajs/react';
import { FormEventHandler, useMemo } from 'react';

const portalMeta: Record<
    string,
    { title: string; description: string; headline: string; sub: string }
> = {
    kullanici: {
        title: 'Kullanıcı girişi - Sahnebul',
        description: 'Favoriler, etkinlik hatırlatmaları ve rezervasyonlar.',
        headline: 'Kullanıcı girişi',
        sub: 'Standart hesabınızla giriş yapın',
    },
    sanatci: {
        title: 'Sanatçı paneli girişi - Sahnebul',
        description: 'Sanatçı paneli: profil, etkinlikler ve mekanlar.',
        headline: 'Sanatçı paneli',
        sub: 'Sanatçı hesabınızla giriş yapın',
    },
    mekan: {
        title: 'Mekan paneli girişi - Sahnebul',
        description: 'Mekân sahibi hesabı veya mekânı/üyeliği olan kullanıcı hesabı ile sahne paneli.',
        headline: 'Mekan paneli',
        sub: 'Mekân kaydı veya mekânınız bağlı kullanıcı hesabı ile giriş',
    },
    organizasyon: {
        title: 'Organizasyon girişi - Sahnebul',
        description: 'Organizasyon firması hesabı ile sahne paneli: mekân ve etkinlik yönetimi, sanatçı müsaitlik talepleri.',
        headline: 'Organizasyon firması',
        sub: 'Organizasyon / ajans hesabınızla giriş yapın',
    },
    yonetim: {
        title: 'Site yönetimi girişi - Sahnebul',
        description: 'Yalnızca platform süper yöneticisi ve admin hesapları (/admin).',
        headline: 'Site yönetimi',
        sub: 'Süper yönetici veya admin hesabınızla giriş yapın',
    },
};

export default function LoginPortal({
    portal,
    status,
    canResetPassword,
    claimVenueSlug = null,
    claimArtistSlug = null,
}: Readonly<{
    portal: string;
    status?: string;
    canResetPassword: boolean;
    claimVenueSlug?: string | null;
    claimArtistSlug?: string | null;
}>) {
    const meta = portalMeta[portal] ?? portalMeta.kullanici;

    const registerHref = useMemo(() => {
        if (portal === 'kullanici') {
            if (claimVenueSlug) {
                return safeRoute('register', { claim_venue: claimVenueSlug });
            }
            if (claimArtistSlug) {
                return safeRoute('register', { claim_artist: claimArtistSlug });
            }
            return safeRoute('register.kullanici');
        }
        if (portal === 'sanatci') {
            if (claimArtistSlug) {
                return safeRoute('register', { claim_artist: claimArtistSlug });
            }
            return safeRoute('register', { uyelik: 'sanatci' });
        }
        if (portal === 'mekan') {
            if (claimVenueSlug) {
                return safeRoute('register', { claim_venue: claimVenueSlug });
            }
            return safeRoute('register', { uyelik: 'mekan' });
        }
        if (portal === 'organizasyon') {
            return safeRoute('register', { uyelik: 'organizasyon' });
        }
        return safeRoute('register.kullanici');
    }, [portal, claimVenueSlug, claimArtistSlug]);

    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false as boolean,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(safeRoute('login.store', { portal }), { onFinish: () => reset('password') });
    };

    return (
        <GuestLayout>
            <SeoHead title={meta.title} description={meta.description} noindex />

            {status && (
                <div className="mb-4 rounded-lg bg-green-500/15 p-3 text-sm text-green-800 dark:bg-green-500/20 dark:text-green-400">
                    {status}
                </div>
            )}

            <h2 className="font-display text-2xl font-bold text-zinc-900 dark:text-white">{meta.headline}</h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-500">{meta.sub}</p>
            {portal === 'kullanici' && (
                <p className="mt-3 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-sm text-zinc-700 dark:border-amber-500/20 dark:bg-amber-500/5 dark:text-zinc-400">
                    Bu sayfa bireysel kullanıcı hesapları içindir. Sanatçı, mekân sahibi veya organizasyon firması hesabı için aşağıdaki «Diğer girişler» bağlantılarını kullanın.
                </p>
            )}
            {portal === 'mekan' && (
                <p className="mt-3 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-sm text-zinc-700 dark:border-amber-500/20 dark:bg-amber-500/5 dark:text-zinc-400">
                    <strong className="font-medium text-zinc-900 dark:text-zinc-300">Kimler?</strong> Mekân üyeliğiyle kayıt olduysanız (mekân sahibi hesabı) doğrudan buradan girin. Hesabınız
                    standart kullanıcıysa ve size ait mekân kaydı veya mekân üyeliği varsa yine bu sayfa uygundur. Sanatçı için{' '}
                    <Link
                        href={safeRoute('login.sanatci')}
                        className="font-medium text-amber-700 hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-300"
                    >
                        Sanatçı paneli girişi
                    </Link>
                    , organizasyon firması için{' '}
                    <Link
                        href={safeRoute('login.organizasyon')}
                        className="font-medium text-amber-700 hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-300"
                    >
                        Organizasyon girişi
                    </Link>{' '}
                    kullanılır.
                </p>
            )}
            {portal === 'organizasyon' && (
                <p className="mt-3 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-sm text-zinc-700 dark:border-amber-500/20 dark:bg-amber-500/5 dark:text-zinc-400">
                    <strong className="font-medium text-zinc-900 dark:text-zinc-300">Not:</strong> Bu sayfa organizasyon / ajans firması hesapları içindir. Platformun tamamını yöneten{' '}
                    <strong className="font-medium text-zinc-900 dark:text-zinc-300">site yönetimi</strong> hesabı değildir; site yönetimi{' '}
                    <code className="rounded bg-zinc-200 px-1 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300">/yonetim/giris</code> adresinden giriş yapar.
                </p>
            )}

            <form onSubmit={submit} className="mt-8 space-y-6">
                <div>
                    <InputLabel htmlFor="email" value="E-posta" />
                    <TextInput
                        id="email"
                        type="email"
                        name="email"
                        value={data.email}
                        className="mt-2 block w-full"
                        autoComplete="username"
                        isFocused={true}
                        onChange={(e) => setData('email', sanitizeEmailInput(e.target.value))}
                    />
                    <InputError message={errors.email} className="mt-2" />
                </div>

                <div>
                    <InputLabel htmlFor="password" value="Şifre" />
                    <TextInput
                        id="password"
                        type="password"
                        name="password"
                        value={data.password}
                        className="mt-2 block w-full"
                        autoComplete="current-password"
                        onChange={(e) => setData('password', e.target.value)}
                    />
                    <InputError message={errors.password} className="mt-2" />
                </div>

                <div className="flex items-center justify-between">
                    <label className="flex items-center">
                        <Checkbox
                            name="remember"
                            checked={data.remember}
                            onChange={(e) => setData('remember', (e.target.checked || false) as false)}
                        />
                        <span className="ms-2 text-sm text-zinc-600 dark:text-zinc-400">Beni hatırla</span>
                    </label>
                    {canResetPassword && (
                        <Link
                            href={safeRoute('password.request')}
                            className="text-sm text-amber-700 hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-300"
                        >
                            Şifremi unuttum
                        </Link>
                    )}
                </div>

                <PrimaryButton className="mt-6" disabled={processing}>
                    Giriş Yap
                </PrimaryButton>
            </form>

            <div className="mt-6 space-y-3 border-t border-zinc-200 pt-6 text-center text-sm text-zinc-600 dark:border-white/10 dark:text-zinc-500">
                <p>Diğer girişler:</p>
                <div className="flex flex-wrap justify-center gap-x-4 gap-y-2">
                    <Link
                        href={safeRoute('login')}
                        className="text-amber-700 hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-300"
                    >
                        Kullanıcı
                    </Link>
                    <Link
                        href={safeRoute('login.sanatci')}
                        className="text-amber-700 hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-300"
                    >
                        Sanatçı
                    </Link>
                    <Link
                        href={safeRoute('login.mekan')}
                        className="text-amber-700 hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-300"
                    >
                        Mekan
                    </Link>
                    <Link
                        href={safeRoute('login.organizasyon')}
                        className="text-amber-700 hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-300"
                    >
                        Organizasyon
                    </Link>
                </div>
            </div>

            {portal === 'kullanici' && (
                <p className="mt-4 text-center text-sm text-zinc-600 dark:text-zinc-500">
                    Hesabınız yok mu?{' '}
                    <a
                        href={registerHref}
                        className="font-medium text-amber-700 hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-300"
                    >
                        Kullanıcı kaydı
                    </a>
                </p>
            )}
            {portal === 'sanatci' && (
                <p className="mt-4 text-center text-sm text-zinc-600 dark:text-zinc-500">
                    Hesabınız yok mu?{' '}
                    <a
                        href={registerHref}
                        className="font-medium text-amber-700 hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-300"
                    >
                        Sanatçı kaydı
                    </a>
                </p>
            )}
            {portal === 'mekan' && (
                <p className="mt-4 text-center text-sm text-zinc-600 dark:text-zinc-500">
                    Hesabınız yok mu?{' '}
                    <a
                        href={registerHref}
                        className="font-medium text-amber-700 hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-300"
                    >
                        Mekan kaydı
                    </a>
                </p>
            )}
            {portal === 'organizasyon' && (
                <p className="mt-4 text-center text-sm text-zinc-600 dark:text-zinc-500">
                    Hesabınız yok mu?{' '}
                    <a
                        href={registerHref}
                        className="font-medium text-amber-700 hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-300"
                    >
                        Organizasyon kaydı
                    </a>
                </p>
            )}
        </GuestLayout>
    );
}
