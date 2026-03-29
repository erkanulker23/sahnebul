import GoogleSignInButton from '@/Components/GoogleSignInButton';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import SeoHead from '@/Components/SeoHead';
import GuestLayout from '@/Layouts/GuestLayout';
import { cn } from '@/lib/cn';
import { sanitizeEmailInput } from '@/lib/trPhoneInput';
import { safeRoute } from '@/lib/safeRoute';
import { useForm } from '@inertiajs/react';
import { Eye, EyeOff } from 'lucide-react';
import { FormEventHandler, useState } from 'react';

function passwordRuleStatus(password: string | undefined | null) {
    const p = password ?? '';
    return {
        minLength: p.length >= 10,
        letters: /[a-z]/.test(p) && /[A-Z]/.test(p),
        number: /\d/.test(p),
        symbol: /[^A-Za-z0-9]/.test(p),
    };
}

function passwordMeetsAllRules(password: string | undefined | null): boolean {
    const s = passwordRuleStatus(password);
    return s.minLength && s.letters && s.number && s.symbol;
}

type Rules = ReturnType<typeof passwordRuleStatus>;

function PasswordStrengthHints({ rules }: Readonly<{ rules: Rules }>) {
    return (
        <>
            <p id="password-rules-k" className="mt-2 text-xs text-zinc-500">
                Güçlü şifre için tüm maddeler sağlanmalıdır.
            </p>
            <ul className="mt-2 space-y-1 text-xs" aria-live="polite">
                <li className={cn(rules.minLength ? 'text-emerald-500' : 'text-zinc-500')}>
                    {rules.minLength ? '✓' : '○'} En az 10 karakter
                </li>
                <li className={cn(rules.letters ? 'text-emerald-500' : 'text-zinc-500')}>
                    {rules.letters ? '✓' : '○'} En az bir büyük ve bir küçük harf
                </li>
                <li className={cn(rules.number ? 'text-emerald-500' : 'text-zinc-500')}>
                    {rules.number ? '✓' : '○'} En az bir rakam
                </li>
                <li className={cn(rules.symbol ? 'text-emerald-500' : 'text-zinc-500')}>
                    {rules.symbol ? '✓' : '○'} En az bir özel karakter (ör. ! @ # ? *)
                </li>
            </ul>
        </>
    );
}

export default function RegisterKullanici() {
    const [showPassword, setShowPassword] = useState(false);
    const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
    });

    const pwdRules = passwordRuleStatus(data.password);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(safeRoute('register.kullanici.store'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <GuestLayout>
            <SeoHead
                title="Kullanıcı kaydı - Sahnebul"
                description="Standart kullanıcı hesabı oluşturun; favoriler ve etkinlik hatırlatmaları."
                noindex
            />

            <h2 className="font-display text-2xl font-bold text-zinc-900 dark:text-white">Kullanıcı kaydı</h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-500">Favoriler ve hatırlatmalar için ücretsiz hesap oluşturun.</p>

            <GoogleSignInButton />
            {(errors as { credential?: string }).credential ? (
                <p className="mt-3 text-sm text-red-600 dark:text-red-400">{(errors as { credential?: string }).credential}</p>
            ) : null}

            <form onSubmit={submit} className="mt-6 space-y-6">
                <div>
                    <InputLabel htmlFor="name" value="Ad Soyad" />
                    <TextInput
                        id="name"
                        name="name"
                        value={data.name}
                        className="mt-2 block w-full"
                        autoComplete="name"
                        isFocused={true}
                        onChange={(e) => setData('name', e.target.value)}
                        required
                    />
                    <InputError message={errors.name} className="mt-2" />
                </div>

                <div>
                    <InputLabel htmlFor="email" value="E-posta" />
                    <TextInput
                        id="email"
                        type="email"
                        name="email"
                        value={data.email}
                        className="mt-2 block w-full"
                        autoComplete="username"
                        onChange={(e) => setData('email', sanitizeEmailInput(e.target.value))}
                        required
                    />
                    <InputError message={errors.email} className="mt-2" />
                </div>

                <div>
                    <InputLabel htmlFor="password" value="Şifre" />
                    <div className="relative mt-2">
                        <TextInput
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            name="password"
                            value={data.password}
                            className="block w-full pr-11"
                            autoComplete="new-password"
                            onChange={(e) => setData('password', e.target.value)}
                            required
                            aria-describedby="password-rules-k"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-200 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                            aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                            tabIndex={-1}
                        >
                            {showPassword ? <EyeOff className="h-4 w-4" strokeWidth={2} /> : <Eye className="h-4 w-4" strokeWidth={2} />}
                        </button>
                    </div>
                    <PasswordStrengthHints rules={pwdRules} />
                    <InputError message={errors.password} className="mt-2" />
                </div>

                <div>
                    <InputLabel htmlFor="password_confirmation" value="Şifre tekrar" />
                    <div className="relative mt-2">
                        <TextInput
                            id="password_confirmation"
                            type={showPasswordConfirmation ? 'text' : 'password'}
                            name="password_confirmation"
                            value={data.password_confirmation}
                            className="block w-full pr-11"
                            autoComplete="new-password"
                            onChange={(e) => setData('password_confirmation', e.target.value)}
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setShowPasswordConfirmation(!showPasswordConfirmation)}
                            className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-200 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                            aria-label={showPasswordConfirmation ? 'Şifre tekrarını gizle' : 'Şifre tekrarını göster'}
                            tabIndex={-1}
                        >
                            {showPasswordConfirmation ? <EyeOff className="h-4 w-4" strokeWidth={2} /> : <Eye className="h-4 w-4" strokeWidth={2} />}
                        </button>
                    </div>
                    <InputError message={errors.password_confirmation} className="mt-2" />
                </div>

                <PrimaryButton className="mt-6" disabled={processing || !passwordMeetsAllRules(data.password)}>
                    Hesap oluştur
                </PrimaryButton>
            </form>

            <p className="mt-6 text-center text-sm text-zinc-500">
                Sanatçı veya mekan üyeliği mi istiyorsunuz?{' '}
                <a href={route('register')} className="font-medium text-amber-400 hover:text-amber-300">
                    Sanatçı / mekan kaydı
                </a>
            </p>

            <p className="mt-4 text-center text-sm text-zinc-500">
                Zaten hesabınız var mı?{' '}
                <a href={route('login')} className="font-medium text-amber-400 hover:text-amber-300">
                    Kullanıcı girişi
                </a>
            </p>
        </GuestLayout>
    );
}
