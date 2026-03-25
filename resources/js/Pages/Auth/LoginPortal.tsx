import Checkbox from '@/Components/Checkbox';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import SeoHead from '@/Components/SeoHead';
import GuestLayout from '@/Layouts/GuestLayout';
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
        description: 'Mekan üyeliği veya size bağlı mekan kaydı ile panel.',
        headline: 'Mekan paneli',
        sub: 'Mekan hesabınızla giriş yapın',
    },
    yonetim: {
        title: 'Yönetim girişi - Sahnebul',
        description: 'Yalnızca yönetici hesapları.',
        headline: 'Yönetim paneli',
        sub: 'Yönetici hesabınızla giriş yapın',
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
                return route('register', { claim_venue: claimVenueSlug });
            }
            if (claimArtistSlug) {
                return route('register', { claim_artist: claimArtistSlug });
            }
            return route('register.kullanici');
        }
        if (portal === 'sanatci') {
            if (claimArtistSlug) {
                return route('register', { claim_artist: claimArtistSlug });
            }
            return route('register', { uyelik: 'sanatci' });
        }
        if (portal === 'mekan') {
            if (claimVenueSlug) {
                return route('register', { claim_venue: claimVenueSlug });
            }
            return route('register', { uyelik: 'mekan' });
        }
        return route('register.kullanici');
    }, [portal, claimVenueSlug, claimArtistSlug]);

    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false as boolean,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('login.store', { portal }), { onFinish: () => reset('password') });
    };

    return (
        <GuestLayout>
            <SeoHead title={meta.title} description={meta.description} noindex />

            {status && (
                <div className="mb-4 rounded-lg bg-green-500/20 p-3 text-sm text-green-400">{status}</div>
            )}

            <h2 className="font-display text-2xl font-bold text-white">{meta.headline}</h2>
            <p className="mt-2 text-sm text-zinc-500">{meta.sub}</p>
            {portal === 'kullanici' && (
                <p className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-sm text-zinc-400">
                    Yönetici hesabıyla giriş için{' '}
                    <Link href={route('login.admin')} className="font-medium text-amber-400 hover:text-amber-300">
                        yönetim paneli girişi
                    </Link>{' '}
                    kullanın; bu sayfa yalnızca standart kullanıcı içindir.
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
                        onChange={(e) => setData('email', e.target.value)}
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
                            className="rounded border-zinc-600 bg-zinc-800 text-amber-500 focus:ring-amber-500"
                        />
                        <span className="ms-2 text-sm text-zinc-400">Beni hatırla</span>
                    </label>
                    {canResetPassword && (
                        <Link href={route('password.request')} className="text-sm text-amber-400 hover:text-amber-300">
                            Şifremi unuttum
                        </Link>
                    )}
                </div>

                <PrimaryButton className="mt-6" disabled={processing}>
                    Giriş Yap
                </PrimaryButton>
            </form>

            <div className="mt-6 space-y-3 border-t border-white/10 pt-6 text-center text-sm text-zinc-500">
                <p>Diğer girişler:</p>
                <div className="flex flex-wrap justify-center gap-x-4 gap-y-2">
                    <Link href={route('login')} className="text-amber-400 hover:text-amber-300">
                        Kullanıcı
                    </Link>
                    <Link href={route('login.sanatci')} className="text-amber-400 hover:text-amber-300">
                        Sanatçı
                    </Link>
                    <Link href={route('login.mekan')} className="text-amber-400 hover:text-amber-300">
                        Mekan
                    </Link>
                    <Link href={route('login.admin')} className="text-amber-400 hover:text-amber-300">
                        Yönetim
                    </Link>
                </div>
            </div>

            {portal === 'kullanici' && (
                <p className="mt-4 text-center text-sm text-zinc-500">
                    Hesabınız yok mu?{' '}
                    <a href={registerHref} className="font-medium text-amber-400 hover:text-amber-300">
                        Kullanıcı kaydı
                    </a>
                </p>
            )}
            {portal === 'sanatci' && (
                <p className="mt-4 text-center text-sm text-zinc-500">
                    Hesabınız yok mu?{' '}
                    <a href={registerHref} className="font-medium text-amber-400 hover:text-amber-300">
                        Sanatçı kaydı
                    </a>
                </p>
            )}
            {portal === 'mekan' && (
                <p className="mt-4 text-center text-sm text-zinc-500">
                    Hesabınız yok mu?{' '}
                    <a href={registerHref} className="font-medium text-amber-400 hover:text-amber-300">
                        Mekan kaydı
                    </a>
                </p>
            )}
        </GuestLayout>
    );
}
