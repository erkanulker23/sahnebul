import Checkbox from '@/Components/Checkbox';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import SeoHead from '@/Components/SeoHead';
import GuestLayout from '@/Layouts/GuestLayout';
import { Link, useForm } from '@inertiajs/react';
import { FormEventHandler, useMemo } from 'react';

export default function Login({
    status,
    canResetPassword,
    claimVenueSlug = null,
    claimArtistSlug = null,
}: Readonly<{
    status?: string;
    canResetPassword: boolean;
    claimVenueSlug?: string | null;
    claimArtistSlug?: string | null;
}>) {
    const registerHref = useMemo(() => {
        if (claimVenueSlug) {
            return route('register', {
                claim_venue: claimVenueSlug,
            });
        }
        if (claimArtistSlug) {
            return route('register', {
                claim_artist: claimArtistSlug,
            });
        }
        return route('register');
    }, [claimVenueSlug, claimArtistSlug]);
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false as boolean,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('login'), { onFinish: () => reset('password') });
    };

    return (
        <GuestLayout>
            <SeoHead title="Giriş Yap - Sahnebul" description="Sahnebul hesabınıza giriş yapın." noindex />

            {status && (
                <div className="mb-4 rounded-lg bg-green-500/20 p-3 text-sm text-green-400">
                    {status}
                </div>
            )}

            <h2 className="font-display text-2xl font-bold text-white">Giriş Yap</h2>
            <p className="mt-2 text-sm text-zinc-500">Hesabınıza giriş yapın</p>

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
                        <Link
                            href={route('password.request')}
                            className="text-sm text-amber-400 hover:text-amber-300"
                        >
                            Şifremi unuttum
                        </Link>
                    )}
                </div>

                <PrimaryButton className="mt-6" disabled={processing}>
                    Giriş Yap
                </PrimaryButton>
            </form>

            <p className="mt-6 text-center text-sm text-zinc-500">
                Hesabınız yok mu?{' '}
                <Link href={registerHref} className="font-medium text-amber-400 hover:text-amber-300">
                    Kayıt olun
                </Link>
            </p>
        </GuestLayout>
    );
}
