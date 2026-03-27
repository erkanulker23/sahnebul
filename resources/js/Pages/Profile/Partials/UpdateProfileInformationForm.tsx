import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import { Transition } from '@headlessui/react';
import { PageProps } from '@/types';
import { sanitizeEmailInput } from '@/lib/trPhoneInput';
import { Link, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler, useMemo, useState } from 'react';

function resolveStorageOrAbsoluteUrl(path: string | null | undefined): string | null {
    if (!path || typeof path !== 'string') {
        return null;
    }
    const t = path.trim();
    if (t === '') {
        return null;
    }
    if (/^https?:\/\//i.test(t)) {
        return t;
    }

    return `/storage/${t.replace(/^\//, '')}`;
}

interface City {
    id: number;
    name: string;
    slug: string;
}

export default function UpdateProfileInformation({
    mustVerifyEmail,
    status,
    cities = [],
    className = '',
    omitSectionHeader = false,
    omitCityField = false,
    omitInterestsField = false,
}: Readonly<{
    mustVerifyEmail: boolean;
    status?: string;
    cities?: City[];
    className?: string;
    /** Üst başlık dışarıda (ör. admin profil kartı) verildiğinde true. */
    omitSectionHeader?: boolean;
    /** Sahne paneli sanatçı profili: şehir seçimi gösterilmez. */
    omitCityField?: boolean;
    /** Sahne paneli `/sahne/profil`: ilgi alanları gösterilmez (mevcut değerler kayıtta korunur). */
    omitInterestsField?: boolean;
}>) {
    const { auth } = usePage<PageProps>().props;
    const user = auth.user;
    const linkedArtist = auth.linkedArtist;
    const isManagerOrganization = auth.is_manager_organization === true;
    const [interestInput, setInterestInput] = useState('');

    const initialName = useMemo(() => {
        if (omitCityField && linkedArtist?.name) {
            return linkedArtist.name;
        }

        return user.name;
    }, [omitCityField, linkedArtist?.name, user.name]);

    const artistPhotoUrl = useMemo(() => resolveStorageOrAbsoluteUrl(linkedArtist?.avatar), [linkedArtist?.avatar]);
    const userPhotoUrl = useMemo(() => resolveStorageOrAbsoluteUrl(user.avatar), [user.avatar]);

    const { data, setData, patch, errors, processing, recentlySuccessful } =
        useForm({
            name: initialName,
            email: user.email,
            city: user.city ?? '',
            interests: (user.interests as string[]) ?? [],
            avatar: null as File | null,
            organization_display_name: user.organization_display_name ?? '',
            organization_tax_office: user.organization_tax_office ?? '',
            organization_tax_number: user.organization_tax_number ?? '',
        });

    const storedOrArtistPhotoUrl = userPhotoUrl ?? artistPhotoUrl ?? null;

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        patch(route('profile.update'), {
            forceFormData: true,
        });
    };

    const addInterest = () => {
        const v = interestInput.trim();
        if (v && !data.interests.includes(v)) {
            setData('interests', [...data.interests, v]);
            setInterestInput('');
        }
    };

    const removeInterest = (i: number) => {
        setData('interests', data.interests.filter((_, idx) => idx !== i));
    };

    return (
        <section className={className}>
            {!omitSectionHeader && (
                <header>
                    <h2 className="text-lg font-medium text-white">Profil Bilgileri</h2>
                    <p className="mt-1 text-sm text-zinc-500">Hesap bilgilerinizi güncelleyin.</p>
                </header>
            )}

            <form onSubmit={submit} className={omitSectionHeader ? 'space-y-6' : 'mt-6 space-y-6'}>
                <div className="flex items-center gap-6">
                    <div className="shrink-0">
                        {data.avatar ? (
                            <img src={URL.createObjectURL(data.avatar)} alt="" className="h-24 w-24 rounded-full object-cover" />
                        ) : storedOrArtistPhotoUrl ? (
                            <img src={storedOrArtistPhotoUrl} alt="" className="h-24 w-24 rounded-full object-cover" />
                        ) : (
                            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-zinc-800 text-3xl text-zinc-500">👤</div>
                        )}
                    </div>
                    <div>
                        <InputLabel htmlFor="avatar" value="Profil fotoğrafı" />
                        <input
                            id="avatar"
                            type="file"
                            accept="image/*"
                            className="mt-2 block w-full text-sm text-zinc-400 file:mr-4 file:rounded-lg file:border-0 file:bg-amber-500/20 file:px-4 file:py-2 file:text-amber-400"
                            onChange={(e) => setData('avatar', e.target.files?.[0] ?? null)}
                        />
                        {omitCityField && artistPhotoUrl && !userPhotoUrl ? (
                            <p className="mt-2 max-w-md text-xs text-zinc-500">
                                Şu an sanatçı sayfanızdaki fotoğraf gösteriliyor. Buradan yüklediğiniz görsel hesap profilinize kaydedilir.
                            </p>
                        ) : null}
                    </div>
                </div>

                <div>
                    <InputLabel htmlFor="name" value="Ad" />
                    <TextInput
                        id="name"
                        className="mt-1 block w-full"
                        value={data.name}
                        onChange={(e) => setData('name', e.target.value)}
                        required
                        isFocused
                        autoComplete="name"
                    />
                    <InputError className="mt-2" message={errors.name} />
                </div>

                <div>
                    <InputLabel htmlFor="email" value="E-posta" />
                    <TextInput
                        id="email"
                        type="email"
                        className="mt-1 block w-full"
                        value={data.email}
                        onChange={(e) => setData('email', sanitizeEmailInput(e.target.value))}
                        required
                        autoComplete="username"
                    />
                    <InputError className="mt-2" message={errors.email} />
                </div>

                {isManagerOrganization && (
                    <div className="space-y-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                        <p className="text-sm font-medium text-amber-200/90">Organizasyon / firma bilgileri</p>
                        <p className="text-xs text-zinc-500">
                            Firma unvanı ve vergi alanları yalnızca hesabınız ve yönetim kayıtları için kullanılır; herkese açık sanatçı sayfalarından ayrıdır.
                        </p>
                        <div>
                            <InputLabel htmlFor="organization_display_name" value="Firma / organizasyon adı" />
                            <TextInput
                                id="organization_display_name"
                                className="mt-1 block w-full"
                                value={data.organization_display_name}
                                onChange={(e) => setData('organization_display_name', e.target.value)}
                                autoComplete="organization"
                            />
                            <InputError className="mt-2" message={errors.organization_display_name} />
                        </div>
                        <div>
                            <InputLabel htmlFor="organization_tax_office" value="Vergi dairesi" />
                            <TextInput
                                id="organization_tax_office"
                                className="mt-1 block w-full"
                                value={data.organization_tax_office}
                                onChange={(e) => setData('organization_tax_office', e.target.value)}
                            />
                            <InputError className="mt-2" message={errors.organization_tax_office} />
                        </div>
                        <div>
                            <InputLabel htmlFor="organization_tax_number" value="Vergi numarası (VKN)" />
                            <TextInput
                                id="organization_tax_number"
                                className="mt-1 block w-full"
                                value={data.organization_tax_number}
                                onChange={(e) => setData('organization_tax_number', e.target.value)}
                                inputMode="numeric"
                                autoComplete="off"
                            />
                            <InputError className="mt-2" message={errors.organization_tax_number} />
                        </div>
                    </div>
                )}

                {!omitCityField && (
                    <div>
                        <InputLabel htmlFor="city" value="Şehir" />
                        <select
                            id="city"
                            value={data.city}
                            onChange={(e) => setData('city', e.target.value)}
                            className="mt-1 block w-full rounded-xl border border-white/10 bg-zinc-800/50 px-4 py-3 text-white"
                        >
                            <option value="">Seçin</option>
                            {cities.map((c) => (
                                <option key={c.id} value={c.slug}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                )}

                {!omitInterestsField && (
                    <div>
                        <InputLabel value="İlgi alanları" />
                        <div className="mt-2 flex flex-wrap gap-2">
                            {data.interests.map((v, i) => (
                                <span key={`${v}-${i}`} className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-3 py-1 text-sm text-amber-400">
                                    {v}
                                    <button type="button" onClick={() => removeInterest(i)} className="hover:text-red-400">×</button>
                                </span>
                            ))}
                        </div>
                        <div className="mt-2 flex gap-2">
                            <TextInput
                                value={interestInput}
                                onChange={(e) => setInterestInput(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addInterest(); } }}
                                placeholder="Eklemek için yazıp Enter"
                                className="flex-1"
                            />
                            <button type="button" onClick={addInterest} className="rounded-xl bg-amber-500/20 px-4 py-2 text-sm text-amber-400 hover:bg-amber-500/30">
                                Ekle
                            </button>
                        </div>
                    </div>
                )}

                {mustVerifyEmail && user.email_verified_at === null && (
                    <div>
                        <p className="mt-2 text-sm text-zinc-400">
                            E-posta adresiniz doğrulanmamış.
                            <Link href={route('verification.send')} method="post" as="button" className="text-amber-400 underline">
                                Doğrulama e-postası gönder
                            </Link>
                        </p>
                        {status === 'verification-link-sent' && (
                            <p className="mt-2 text-sm text-green-400">Yeni doğrulama e-postası gönderildi.</p>
                        )}
                    </div>
                )}

                <div className="flex items-center gap-4">
                    <PrimaryButton disabled={processing}>Kaydet</PrimaryButton>
                    <Transition show={recentlySuccessful} enter="transition ease-in-out" enterFrom="opacity-0" leave="transition ease-in-out" leaveTo="opacity-0">
                        <p className="text-sm text-green-400">Kaydedildi.</p>
                    </Transition>
                </div>
            </form>
        </section>
    );
}
