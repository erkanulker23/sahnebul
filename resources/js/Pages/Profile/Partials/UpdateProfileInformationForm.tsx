import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PhoneInput from '@/Components/PhoneInput';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import { Transition } from '@headlessui/react';
import { PageProps } from '@/types';
import { sanitizeEmailInput } from '@/lib/trPhoneInput';
import { Link, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler, useMemo, useState } from 'react';

function buildOrgSocialForProfile(d: {
    org_social_instagram: string;
    org_social_twitter: string;
    org_social_youtube: string;
    org_social_facebook: string;
    org_social_tiktok: string;
    org_social_spotify: string;
}): Record<string, string> {
    const links: Record<string, string> = {};
    const add = (key: string, v: string) => {
        const t = v.trim();
        if (t !== '') links[key] = t;
    };
    add('instagram', d.org_social_instagram);
    add('twitter', d.org_social_twitter);
    add('youtube', d.org_social_youtube);
    add('facebook', d.org_social_facebook);
    add('tiktok', d.org_social_tiktok);
    add('spotify', d.org_social_spotify);
    return links;
}

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
    const user = auth.user!;
    const linkedArtist = auth.linkedArtist;
    const isManagementAccount = auth.is_management_account === true;
    const orgPublic = auth.organization_public_profile ?? null;
    const [interestInput, setInterestInput] = useState('');

    const initialName = useMemo(() => {
        if (omitCityField && linkedArtist?.name) {
            return linkedArtist.name;
        }

        return user.name;
    }, [omitCityField, linkedArtist?.name, user.name]);

    const artistPhotoUrl = useMemo(() => resolveStorageOrAbsoluteUrl(linkedArtist?.avatar), [linkedArtist?.avatar]);
    const userPhotoUrl = useMemo(() => resolveStorageOrAbsoluteUrl(user.avatar), [user.avatar]);

    const sl = (user.organization_social_links ?? {}) as Record<string, string>;

    const { data, setData, patch, errors, processing, recentlySuccessful, transform } =
        useForm({
            name: initialName,
            email: user.email,
            phone: user.phone ?? '',
            city: user.city ?? '',
            interests: (user.interests as string[]) ?? [],
            avatar: null as File | null,
            organization_display_name: user.organization_display_name ?? '',
            organization_tax_office: user.organization_tax_office ?? '',
            organization_tax_number: user.organization_tax_number ?? '',
            organization_public_slug: user.organization_public_slug ?? '',
            organization_about: user.organization_about ?? '',
            organization_website: user.organization_website ?? '',
            organization_cover: null as File | null,
            org_social_instagram: sl.instagram ?? '',
            org_social_twitter: sl.twitter ?? sl.x ?? '',
            org_social_youtube: sl.youtube ?? '',
            org_social_facebook: sl.facebook ?? '',
            org_social_tiktok: sl.tiktok ?? '',
            org_social_spotify: sl.spotify ?? '',
        });

    const storedOrArtistPhotoUrl = userPhotoUrl ?? artistPhotoUrl ?? null;

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        transform((raw) => {
            const d = raw as typeof data;
            const {
                org_social_instagram,
                org_social_twitter,
                org_social_youtube,
                org_social_facebook,
                org_social_tiktok,
                org_social_spotify,
                organization_cover: coverFile,
                ...rest
            } = d;
            const organization_social_links = buildOrgSocialForProfile({
                org_social_instagram,
                org_social_twitter,
                org_social_youtube,
                org_social_facebook,
                org_social_tiktok,
                org_social_spotify,
            });
            return {
                ...rest,
                organization_social_links,
                organization_cover: coverFile instanceof File ? coverFile : undefined,
            };
        });
        patch(route('profile.update'), {
            forceFormData: true,
            onFinish: () => {
                transform((d) => d);
            },
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
                    <h2 className="text-lg font-medium text-zinc-900 dark:text-white">Profil Bilgileri</h2>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-500">Hesap bilgilerinizi güncelleyin.</p>
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
                            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-zinc-200 text-3xl text-zinc-500 dark:bg-zinc-800">👤</div>
                        )}
                    </div>
                    <div>
                        <InputLabel htmlFor="avatar" value="Profil fotoğrafı" />
                        <input
                            id="avatar"
                            type="file"
                            accept="image/*"
                            className="mt-2 block w-full text-sm text-zinc-600 file:mr-4 file:rounded-lg file:border-0 file:bg-amber-100 file:px-4 file:py-2 file:text-amber-900 file:hover:bg-amber-200 dark:text-zinc-400 dark:file:bg-amber-500/20 dark:file:text-amber-400 dark:file:hover:bg-amber-500/30"
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

                <div>
                    <InputLabel htmlFor="phone" value="Cep telefonu" />
                    <PhoneInput
                        id="phone"
                        name="phone"
                        value={data.phone}
                        onChange={(v) => setData('phone', v)}
                        className="mt-1 block w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/25 dark:border-white/10 dark:bg-zinc-800/50 dark:text-white dark:focus:border-amber-500 dark:focus:ring-amber-500/20"
                    />
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
                        Kart ile bilet ödemesi (PayTR) ve isteğe bağlı SMS hatırlatması için geçerli bir Türkiye numarası kullanın. Boş bırakabilirsiniz.
                    </p>
                    <InputError className="mt-2" message={errors.phone} />
                </div>

                {isManagementAccount && (
                    <div className="space-y-4 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/5">
                        <p className="text-sm font-medium text-amber-900 dark:text-amber-200/90">Management / firma bilgileri</p>
                        <p className="text-xs text-zinc-600 dark:text-zinc-500">
                            Firma unvanı ve vergi alanları yalnızca hesabınız ve yönetim kayıtları için kullanılır; herkese açık sanatçı sayfalarından ayrıdır.
                        </p>
                        <div>
                            <InputLabel htmlFor="organization_display_name" value="Firma / görünen ad" />
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
                        <div className="mt-4 space-y-4 border-t border-amber-200/60 pt-4 dark:border-amber-500/15">
                            <p className="text-sm font-medium text-amber-950 dark:text-amber-200">Herkese açık firma sayfası</p>
                            {orgPublic?.published && orgPublic.url ? (
                                <p className="text-sm text-zinc-700 dark:text-zinc-300">
                                    <a
                                        href={orgPublic.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="font-medium text-amber-700 underline hover:text-amber-600 dark:text-amber-400"
                                    >
                                        Kamu profilini sitede aç
                                    </a>
                                </p>
                            ) : (
                                <p className="text-xs text-zinc-600 dark:text-zinc-500">
                                    İçeriği burada düzenlersiniz; sayfanın herkese açılması site yönetiminde «Management sayfası yayında» ile yapılır.
                                </p>
                            )}
                            <div>
                                <InputLabel htmlFor="organization_public_slug" value="Profil adresi (yalnızca küçük harf, rakam, tire)" />
                                <TextInput
                                    id="organization_public_slug"
                                    className="mt-1 block w-full font-mono text-sm"
                                    value={data.organization_public_slug}
                                    onChange={(e) =>
                                        setData(
                                            'organization_public_slug',
                                            e.target.value.toLowerCase().replaceAll(/[^a-z0-9-]/g, ''),
                                        )
                                    }
                                    autoComplete="off"
                                    placeholder="ornek-ajans"
                                />
                                <InputError className="mt-2" message={errors.organization_public_slug} />
                            </div>
                            <div>
                                <InputLabel htmlFor="organization_about" value="Hakkında (isteğe bağlı, düz metin veya HTML)" />
                                <textarea
                                    id="organization_about"
                                    value={data.organization_about}
                                    onChange={(e) => setData('organization_about', e.target.value)}
                                    rows={5}
                                    className="mt-1 block w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/25 dark:border-white/10 dark:bg-zinc-800/50 dark:text-white"
                                />
                                <InputError className="mt-2" message={errors.organization_about} />
                            </div>
                            <div>
                                <InputLabel htmlFor="organization_website" value="Web sitesi" />
                                <TextInput
                                    id="organization_website"
                                    className="mt-1 block w-full"
                                    value={data.organization_website}
                                    onChange={(e) => setData('organization_website', e.target.value)}
                                    autoComplete="url"
                                />
                                <InputError className="mt-2" message={errors.organization_website} />
                            </div>
                            <div>
                                <InputLabel htmlFor="organization_cover" value="Kapak görseli (kart ve sayfa üstü)" />
                                <input
                                    id="organization_cover"
                                    type="file"
                                    accept="image/*"
                                    className="mt-2 block w-full text-sm text-zinc-600 file:mr-4 file:rounded-lg file:border-0 file:bg-amber-100 file:px-4 file:py-2 file:text-amber-900 file:hover:bg-amber-200 dark:text-zinc-400 dark:file:bg-amber-500/20 dark:file:text-amber-400 dark:file:hover:bg-amber-500/30"
                                    onChange={(e) => setData('organization_cover', e.target.files?.[0] ?? null)}
                                />
                                <InputError className="mt-2" message={errors.organization_cover} />
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                                {(
                                    [
                                        ['org_social_instagram', 'Instagram'],
                                        ['org_social_twitter', 'X / Twitter'],
                                        ['org_social_youtube', 'YouTube'],
                                        ['org_social_facebook', 'Facebook'],
                                        ['org_social_tiktok', 'TikTok'],
                                        ['org_social_spotify', 'Spotify'],
                                    ] as const
                                ).map(([field, label]) => (
                                    <div key={field}>
                                        <InputLabel htmlFor={field} value={label} />
                                        <TextInput
                                            id={field}
                                            className="mt-1 block w-full text-sm"
                                            value={data[field]}
                                            onChange={(e) => setData(field, e.target.value)}
                                        />
                                    </div>
                                ))}
                            </div>
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
                            className="mt-1 block w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/25 dark:border-white/10 dark:bg-zinc-800/50 dark:text-white dark:focus:border-amber-500 dark:focus:ring-amber-500/20"
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
                                <span
                                    key={`${v}-${i}`}
                                    className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-sm text-amber-900 dark:bg-amber-500/20 dark:text-amber-400"
                                >
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
                            <button
                                type="button"
                                onClick={addInterest}
                                className="rounded-xl bg-amber-100 px-4 py-2 text-sm text-amber-900 hover:bg-amber-200 dark:bg-amber-500/20 dark:text-amber-400 dark:hover:bg-amber-500/30"
                            >
                                Ekle
                            </button>
                        </div>
                    </div>
                )}

                {mustVerifyEmail && user.email_verified_at === null && (
                    <div>
                        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                            E-posta adresiniz doğrulanmamış.{' '}
                            <Link
                                href={route('verification.send')}
                                method="post"
                                as="button"
                                className="text-amber-700 underline hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300"
                            >
                                Doğrulama e-postası gönder
                            </Link>
                        </p>
                        {status === 'verification-link-sent' && (
                            <p className="mt-2 text-sm text-emerald-700 dark:text-green-400">Yeni doğrulama e-postası gönderildi.</p>
                        )}
                    </div>
                )}

                <div className="flex items-center gap-4">
                    <PrimaryButton disabled={processing}>Kaydet</PrimaryButton>
                    <Transition show={recentlySuccessful} enter="transition ease-in-out" enterFrom="opacity-0" leave="transition ease-in-out" leaveTo="opacity-0">
                        <p className="text-sm text-emerald-700 dark:text-green-400">Kaydedildi.</p>
                    </Transition>
                </div>
            </form>
        </section>
    );
}
