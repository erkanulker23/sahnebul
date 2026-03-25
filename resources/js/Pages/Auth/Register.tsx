import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import SeoHead from '@/Components/SeoHead';
import GuestLayout from '@/Layouts/GuestLayout';
import { cn } from '@/lib/cn';
import { Link, useForm } from '@inertiajs/react';
import { Eye, EyeOff } from 'lucide-react';
import { FormEventHandler, KeyboardEvent, useMemo, useRef, useState } from 'react';

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

type PasswordRules = ReturnType<typeof passwordRuleStatus>;

function PasswordStrengthHints({ rules }: Readonly<{ rules: PasswordRules }>) {
    return (
        <>
            <p id="password-rules" className="mt-2 text-xs text-zinc-500">
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

type PasswordToggleInputProps = Readonly<{
    id: string;
    name: string;
    value: string;
    visible: boolean;
    onVisibleChange: (next: boolean) => void;
    onChange: (value: string) => void;
    ariaLabelShow: string;
    ariaLabelHide: string;
    ariaDescribedBy?: string;
}>;

function PasswordToggleInput({
    id,
    name,
    value,
    visible,
    onVisibleChange,
    onChange,
    ariaLabelShow,
    ariaLabelHide,
    ariaDescribedBy,
}: PasswordToggleInputProps) {
    return (
        <div className="relative mt-2">
            <TextInput
                id={id}
                type={visible ? 'text' : 'password'}
                name={name}
                value={value}
                className="block w-full pr-11"
                autoComplete="new-password"
                onChange={(e) => onChange(e.target.value)}
                required
                {...(ariaDescribedBy ? { 'aria-describedby': ariaDescribedBy } : {})}
            />
            <button
                type="button"
                onClick={() => onVisibleChange(!visible)}
                className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-200 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                aria-label={visible ? ariaLabelHide : ariaLabelShow}
                tabIndex={-1}
            >
                {visible ? <EyeOff className="h-4 w-4" strokeWidth={2} /> : <Eye className="h-4 w-4" strokeWidth={2} />}
            </button>
        </div>
    );
}

type ClaimProfile = { slug: string; name: string };

export default function Register({
    claimVenue = null,
    claimArtist = null,
}: Readonly<{
    claimVenue?: ClaimProfile | null;
    claimArtist?: ClaimProfile | null;
}>) {
    const venueTabRef = useRef<HTMLButtonElement>(null);
    const artistTabRef = useRef<HTMLButtonElement>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);

    const initialMembership: 'artist' | 'venue' = claimVenue ? 'venue' : claimArtist ? 'artist' : 'venue';

    const { data, setData, post, processing, errors, reset, transform } = useForm({
        venue_name: claimVenue?.name ?? '',
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
        membership_type: initialMembership,
    });

    transform((form) => ({
        ...form,
        return_to:
            form.membership_type === 'venue' && claimVenue
                ? `/mekanlar/${claimVenue.slug}`
                : form.membership_type === 'artist' && claimArtist
                  ? `/sanatcilar/${claimArtist.slug}`
                  : '',
    }));

    const loginHref = useMemo(() => {
        if (claimVenue) {
            return route('login', {
                redirect: `/mekanlar/${claimVenue.slug}`,
                claim_venue: claimVenue.slug,
            });
        }
        if (claimArtist) {
            return route('login', {
                redirect: `/sanatcilar/${claimArtist.slug}`,
                claim_artist: claimArtist.slug,
            });
        }
        return route('login');
    }, [claimVenue, claimArtist]);

    const pwdRules = passwordRuleStatus(data.password);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('register'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    const handleTabKeyDown = (e: KeyboardEvent<HTMLButtonElement>, current: 'venue' | 'artist') => {
        if (e.key === 'ArrowRight' && current === 'venue') {
            e.preventDefault();
            setData((prev) => ({ ...prev, membership_type: 'artist', venue_name: '' }));
            requestAnimationFrame(() => artistTabRef.current?.focus());
        } else if (e.key === 'ArrowLeft' && current === 'artist') {
            e.preventDefault();
            setData((prev) => ({ ...prev, membership_type: 'venue' }));
            requestAnimationFrame(() => venueTabRef.current?.focus());
        } else if (e.key === 'Home') {
            e.preventDefault();
            setData((prev) => ({ ...prev, membership_type: 'venue' }));
            venueTabRef.current?.focus();
        } else if (e.key === 'End') {
            e.preventDefault();
            setData((prev) => ({ ...prev, membership_type: 'artist', venue_name: '' }));
            artistTabRef.current?.focus();
        }
    };

    const isVenue = data.membership_type === 'venue';

    return (
        <GuestLayout>
            <SeoHead
                title="Kayıt Ol - Sahnebul"
                description="Sanatçı veya mekan üyeliği ile hesap oluşturun; Gold paketlere ve panele erişin."
                noindex
            />

            <h2 className="font-display text-2xl font-bold text-white">Kayıt Ol</h2>
            <p className="mt-2 text-sm text-zinc-500">Sanatçı veya mekan üyeliği için hesap oluşturun</p>

            {claimArtist && (
                <div
                    role="status"
                    className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
                >
                    <span className="font-medium text-amber-200">Sahiplenme talebi:</span>{' '}
                    <span className="text-white">{claimArtist.name}</span> profili seçili. Kayıt sonrası bu sayfada talep
                    formunu doldurabilirsiniz.
                </div>
            )}

            {claimVenue && !claimArtist && (
                <div
                    role="status"
                    className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
                >
                    <span className="font-medium text-amber-200">Sahiplenme talebi:</span> Mekan adı aşağıda{' '}
                    <span className="text-white">{claimVenue.name}</span> olarak ayarlandı.
                </div>
            )}

            <div
                role="tablist"
                aria-label="Üyelik türü"
                className="mt-6 flex w-full rounded-xl border border-white/20 bg-black/50 p-1 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]"
            >
                <button
                    ref={venueTabRef}
                    type="button"
                    role="tab"
                    aria-selected={data.membership_type === 'venue'}
                    tabIndex={data.membership_type === 'venue' ? 0 : -1}
                    onClick={() => setData((prev) => ({ ...prev, membership_type: 'venue' }))}
                    onKeyDown={(e) => handleTabKeyDown(e, 'venue')}
                    className={`min-h-10 min-w-0 flex-1 whitespace-nowrap rounded-lg px-3 py-2 text-center text-sm font-medium transition ${
                        data.membership_type === 'venue'
                            ? 'bg-amber-500 text-zinc-950 shadow-sm'
                            : 'text-zinc-300 hover:bg-white/5 hover:text-white'
                    }`}
                >
                    Mekan Üyeliği
                </button>
                <button
                    ref={artistTabRef}
                    type="button"
                    role="tab"
                    aria-selected={data.membership_type === 'artist'}
                    tabIndex={data.membership_type === 'artist' ? 0 : -1}
                    onClick={() => setData((prev) => ({ ...prev, membership_type: 'artist', venue_name: '' }))}
                    onKeyDown={(e) => handleTabKeyDown(e, 'artist')}
                    className={`min-h-10 min-w-0 flex-1 whitespace-nowrap rounded-lg px-3 py-2 text-center text-sm font-medium transition ${
                        data.membership_type === 'artist'
                            ? 'bg-amber-500 text-zinc-950 shadow-sm'
                            : 'text-zinc-300 hover:bg-white/5 hover:text-white'
                    }`}
                >
                    Sanatçı Üyeliği
                </button>
            </div>
            <InputError message={errors.membership_type} className="mt-2" />

            <form onSubmit={submit} className="mt-8 space-y-6">
                {isVenue && (
                    <div>
                        <InputLabel htmlFor="venue_name" value="Mekan adı" />
                        <TextInput
                            id="venue_name"
                            name="venue_name"
                            value={data.venue_name}
                            className="mt-2 block w-full"
                            autoComplete="organization"
                            isFocused={true}
                            onChange={(e) => setData('venue_name', e.target.value)}
                            required
                        />
                        <InputError message={errors.venue_name} className="mt-2" />
                    </div>
                )}

                <div>
                    <InputLabel htmlFor="name" value={isVenue ? 'İlgili kişi' : 'Ad Soyad'} />
                    <TextInput
                        id="name"
                        name="name"
                        value={data.name}
                        className="mt-2 block w-full"
                        autoComplete="name"
                        isFocused={!isVenue}
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
                        onChange={(e) => setData('email', e.target.value)}
                        required
                    />
                    <InputError message={errors.email} className="mt-2" />
                </div>

                <div>
                    <InputLabel htmlFor="password" value="Şifre" />
                    <PasswordToggleInput
                        id="password"
                        name="password"
                        value={data.password}
                        visible={showPassword}
                        onVisibleChange={setShowPassword}
                        onChange={(v) => setData('password', v)}
                        ariaLabelShow="Şifreyi göster"
                        ariaLabelHide="Şifreyi gizle"
                        ariaDescribedBy="password-rules"
                    />
                    <PasswordStrengthHints rules={pwdRules} />
                    <InputError message={errors.password} className="mt-2" />
                </div>

                <div>
                    <InputLabel htmlFor="password_confirmation" value="Şifre tekrar" />
                    <PasswordToggleInput
                        id="password_confirmation"
                        name="password_confirmation"
                        value={data.password_confirmation}
                        visible={showPasswordConfirmation}
                        onVisibleChange={setShowPasswordConfirmation}
                        onChange={(v) => setData('password_confirmation', v)}
                        ariaLabelShow="Şifre tekrarını göster"
                        ariaLabelHide="Şifre tekrarını gizle"
                    />
                    <InputError message={errors.password_confirmation} className="mt-2" />
                </div>

                <PrimaryButton className="mt-6" disabled={processing || !passwordMeetsAllRules(data.password)}>
                    Kayıt Ol
                </PrimaryButton>
            </form>

            <p className="mt-6 text-center text-sm text-zinc-500">
                Zaten hesabınız var mı?{' '}
                <Link href={loginHref} className="font-medium text-amber-400 hover:text-amber-300">
                    Giriş yapın
                </Link>
            </p>
        </GuestLayout>
    );
}
