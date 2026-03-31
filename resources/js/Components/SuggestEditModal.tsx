import { Modal } from '@/Components/ui/Modal';
import { sanitizeEmailInput } from '@/lib/trPhoneInput';
import type { RequestPayload } from '@inertiajs/core';
import { router } from '@inertiajs/react';
import { FormEvent, useEffect, useMemo, useState, type ReactNode } from 'react';

type EntityKind = 'artist' | 'venue';

/** Tek X (Twitter) alanı; gönderimde hem `twitter` hem `x` anahtarları senkron (eski verilerle uyum). */
const SOCIAL_KEYS = ['instagram', 'twitter', 'youtube', 'spotify', 'tiktok', 'facebook'] as const;
type SocialKey = (typeof SOCIAL_KEYS)[number];

function socialLabel(k: SocialKey): string {
    const map: Record<SocialKey, string> = {
        instagram: 'Instagram',
        twitter: 'X (Twitter)',
        youtube: 'YouTube',
        spotify: 'Spotify',
        tiktok: 'TikTok',
        facebook: 'Facebook',
    };
    return map[k];
}

function twitterXSnapshotHint(social: Record<string, string> | null | undefined): string | null {
    if (!social) {
        return null;
    }
    const t = typeof social.twitter === 'string' ? social.twitter.trim() : '';
    const x = typeof social.x === 'string' ? social.x.trim() : '';
    if (t !== '' && x !== '' && t !== x) {
        return `${t} · ${x}`;
    }
    const one = t || x;
    return one !== '' ? one : null;
}

function stripTagsToPlainPreview(raw: string, maxLen: number): string {
    const plain = raw.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    if (plain === '') {
        return '—';
    }
    return plain.length > maxLen ? `${plain.slice(0, maxLen)}…` : plain;
}

function firstError(v: unknown): string {
    if (Array.isArray(v)) {
        return typeof v[0] === 'string' ? v[0] : '';
    }
    if (typeof v === 'string') {
        return v;
    }
    return '';
}

function trimRecord(rec: Record<string, string>): Record<string, string> {
    return Object.fromEntries(Object.entries(rec).filter(([, v]) => v.trim() !== ''));
}

export type ArtistProfileSnapshot = {
    website: string | null;
    bio: string | null;
    social_links: Record<string, string> | null;
    manager_info?: Record<string, string> | null;
    public_contact?: Record<string, string> | null;
};

export type SuggestEditModalProps = {
    open: boolean;
    onClose: () => void;
    entityKind: EntityKind;
    entitySlug: string;
    entityName: string;
    isAuthenticated: boolean;
    /** Sanatçı sayfası: profildeki mevcut değerler (ipucu için) */
    artistProfileSnapshot?: ArtistProfileSnapshot | null;
};

function currentHint(value: string | null | undefined): string {
    const t = (value ?? '').trim();
    return t !== '' ? t : '—';
}

export default function SuggestEditModal({
    open,
    onClose,
    entityKind,
    entitySlug,
    entityName,
    isAuthenticated,
    artistProfileSnapshot = null,
}: Readonly<SuggestEditModalProps>) {
    const [message, setMessage] = useState('');
    const [guestName, setGuestName] = useState('');
    const [guestEmail, setGuestEmail] = useState('');
    const [website, setWebsite] = useState('');
    const [bio, setBio] = useState('');
    const [social, setSocial] = useState<Record<SocialKey, string>>(() =>
        Object.fromEntries(SOCIAL_KEYS.map((k) => [k, ''])) as Record<SocialKey, string>,
    );
    const [pubEmail, setPubEmail] = useState('');
    const [pubPhone, setPubPhone] = useState('');
    const [pubNote, setPubNote] = useState('');
    const [processing, setProcessing] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const isArtist = entityKind === 'artist';

    useEffect(() => {
        if (!open) {
            return;
        }
        setMessage('');
        setGuestName('');
        setGuestEmail('');
        setWebsite('');
        setBio('');
        setSocial(Object.fromEntries(SOCIAL_KEYS.map((k) => [k, ''])) as Record<SocialKey, string>);
        setPubEmail('');
        setPubPhone('');
        setPubNote('');
        setErrors({});
    }, [open]);

    const hasStructuredArtistInput = useMemo(() => {
        if (!isArtist) return false;
        if (website.trim() !== '' || bio.trim() !== '') return true;
        if (Object.values(social).some((v) => v.trim() !== '')) return true;
        if (pubEmail.trim() !== '' || pubPhone.trim() !== '' || pubNote.trim() !== '') {
            return true;
        }
        return false;
    }, [isArtist, website, bio, social, pubEmail, pubPhone, pubNote]);

    const canSubmitVenue = !isArtist && message.trim().length >= 20;
    const canSubmitArtist = isArtist && (hasStructuredArtistInput || message.trim().length >= 20);
    const canSubmit = isArtist ? canSubmitArtist : canSubmitVenue;

    const submit = (e: FormEvent) => {
        e.preventDefault();
        if (!canSubmit) return;
        setProcessing(true);
        setErrors({});
        const routeName =
            entityKind === 'artist' ? 'artists.edit-suggestion.store' : 'venues.edit-suggestion.store';

        const base: Record<string, unknown> = {
            ...(isAuthenticated ? {} : { guest_name: guestName, guest_email: guestEmail }),
        };

        if (isArtist) {
            const social_links = trimRecord(social as Record<string, string>);
            const tw = social_links.twitter?.trim();
            if (tw) {
                social_links.twitter = tw;
                social_links.x = tw;
            }

            const public_contact = trimRecord({
                email: pubEmail,
                phone: pubPhone,
                note: pubNote,
            });
            base.message = message;
            if (website.trim() !== '') base.website = website.trim();
            if (bio.trim() !== '') base.bio = bio.trim();
            if (Object.keys(social_links).length > 0) base.social_links = social_links;
            if (Object.keys(public_contact).length > 0) base.public_contact = public_contact;
        } else {
            base.message = message;
        }

        router.post(route(routeName, entitySlug), base as RequestPayload, {
            preserveScroll: true,
            onFinish: () => setProcessing(false),
            onSuccess: () => onClose(),
            onError: (errs) => {
                const out: Record<string, string> = {};
                for (const [k, v] of Object.entries(errs)) {
                    const msg = firstError(v);
                    if (msg) {
                        out[k] = msg;
                    }
                }
                setErrors(out);
            },
        });
    };

    const label = entityKind === 'artist' ? 'sanatçı' : 'mekân';
    const snap = artistProfileSnapshot;

    const inputClass =
        'mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white';
    const hintClass = 'text-xs leading-snug text-zinc-500 dark:text-zinc-400';
    /** Izgara hücrelerinde “Şu an” satırı yüksekliği sabit — girişler aynı hizada. */
    const gridHintSlotClass = 'flex min-h-[2.625rem] flex-col justify-end';

    const GridCurrentHint = ({ children }: { children: ReactNode }) =>
        snap ? <div className={gridHintSlotClass}>{children}</div> : null;

    const gridHintBody = (hasValue: boolean, line: ReactNode) =>
        hasValue ? (
            <p className={hintClass}>
                Şu an: <span className="break-all text-zinc-600 dark:text-zinc-300">{line}</span>
            </p>
        ) : (
            <p className={`${hintClass} invisible`} aria-hidden>
                Şu an: —
            </p>
        );

    return (
        <Modal show={open} onClose={onClose} maxWidth="lg">
            <div className="max-h-[min(90vh,40rem)] overflow-y-auto p-6 sm:p-8">
                <h2 className="font-display text-xl font-bold text-zinc-900 dark:text-white">Düzenleme öner</h2>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                    <strong className="text-zinc-800 dark:text-zinc-200">{entityName}</strong> {label} sayfasındaki bilgilerde
                    hata veya eksiklik görüyorsanız aşağıdaki alanlardan ilgili olanları doldurun. Öneriniz yönetim ekibine iletilir;
                    Google Haritalar’daki “düzenleme öner” akışına benzer şekilde değerlendirilir.
                </p>

                <form onSubmit={submit} className="mt-6 space-y-6">
                    {!isAuthenticated && (
                        <>
                            <div>
                                <label htmlFor="suggest-guest-name" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                    Adınız soyadınız *
                                </label>
                                <input
                                    id="suggest-guest-name"
                                    value={guestName}
                                    onChange={(ev) => setGuestName(ev.target.value)}
                                    required
                                    className={inputClass}
                                />
                                {errors.guest_name && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.guest_name}</p>}
                            </div>
                            <div>
                                <label htmlFor="suggest-guest-email" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                    E-posta *
                                </label>
                                <input
                                    id="suggest-guest-email"
                                    type="email"
                                    value={guestEmail}
                                    onChange={(ev) => setGuestEmail(sanitizeEmailInput(ev.target.value))}
                                    required
                                    className={inputClass}
                                />
                                {errors.guest_email && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.guest_email}</p>}
                            </div>
                        </>
                    )}

                    {isArtist && (
                        <>
                            <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-white/10 dark:bg-zinc-900/40">
                                <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">Profil alanları</p>
                                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                    Yalnızca değiştirilmesini istediğiniz bilgileri yazın. Boş bıraktığınız alanlar öneri olarak gönderilmez.
                                </p>

                                <div className="mt-4 space-y-4">
                                    <div>
                                        <label htmlFor="suggest-website" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                            Web sitesi
                                        </label>
                                        {snap ? (
                                            <div className="flex min-h-[2.625rem] flex-col justify-end">
                                                <p className={hintClass}>
                                                    Profilde şu an:{' '}
                                                    <span className="break-all text-zinc-600 dark:text-zinc-300">
                                                        {currentHint(snap.website)}
                                                    </span>
                                                </p>
                                            </div>
                                        ) : null}
                                        <input
                                            id="suggest-website"
                                            value={website}
                                            onChange={(ev) => setWebsite(ev.target.value)}
                                            placeholder="https://…"
                                            className={inputClass}
                                        />
                                        {errors.website && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.website}</p>}
                                    </div>

                                    <div>
                                        <label htmlFor="suggest-bio" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                            Biyografi (önerilen metin)
                                        </label>
                                        {snap ? (
                                            <div className="flex min-h-[3.25rem] flex-col justify-end">
                                                <p className={`${hintClass} line-clamp-2`}>
                                                    Profilde şu an:{' '}
                                                    <span className="text-zinc-600 dark:text-zinc-300">
                                                        {snap.bio?.trim()
                                                            ? stripTagsToPlainPreview(snap.bio, 220)
                                                            : '—'}
                                                    </span>
                                                </p>
                                            </div>
                                        ) : null}
                                        <textarea
                                            id="suggest-bio"
                                            value={bio}
                                            onChange={(ev) => setBio(ev.target.value)}
                                            rows={4}
                                            maxLength={12000}
                                            placeholder="Profilde görünmesini istediğiniz biyografi metni"
                                            className={inputClass}
                                        />
                                        {errors.bio && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.bio}</p>}
                                    </div>

                                    <div>
                                        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Sosyal medya</p>
                                        <p className={hintClass}>Bağlantı, kullanıcı adı veya tam URL girebilirsiniz.</p>
                                        <div className="mt-2 grid items-start gap-x-3 gap-y-4 sm:grid-cols-2">
                                            {SOCIAL_KEYS.map((k) => {
                                                const raw: string =
                                                    k === 'twitter'
                                                        ? twitterXSnapshotHint(snap?.social_links ?? undefined) ?? ''
                                                        : snap?.social_links?.[k]?.trim() ?? '';
                                                const showHint = raw !== '';
                                                const hintText = showHint ? raw : '';
                                                return (
                                                    <div key={k} className="flex min-w-0 flex-col">
                                                        <label
                                                            htmlFor={`suggest-soc-${k}`}
                                                            className="block text-xs font-medium text-zinc-600 dark:text-zinc-400"
                                                        >
                                                            {socialLabel(k)}
                                                        </label>
                                                        <GridCurrentHint>
                                                            {gridHintBody(
                                                                showHint,
                                                                <span className="line-clamp-2">{hintText}</span>,
                                                            )}
                                                        </GridCurrentHint>
                                                        <input
                                                            id={`suggest-soc-${k}`}
                                                            value={social[k]}
                                                            onChange={(ev) => setSocial((prev) => ({ ...prev, [k]: ev.target.value }))}
                                                            className={inputClass}
                                                        />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="border-t border-zinc-200 pt-4 dark:border-white/10">
                                        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Herkese açık iletişim (profildeki blok)</p>
                                        <div className="mt-2 grid items-start gap-x-3 gap-y-4 sm:grid-cols-2">
                                            <div>
                                                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">E-posta</label>
                                                <GridCurrentHint>
                                                    {gridHintBody(
                                                        !!snap?.public_contact?.email?.trim(),
                                                        currentHint(snap?.public_contact?.email),
                                                    )}
                                                </GridCurrentHint>
                                                <input
                                                    type="email"
                                                    value={pubEmail}
                                                    onChange={(e) => setPubEmail(sanitizeEmailInput(e.target.value))}
                                                    className={inputClass}
                                                />
                                                {errors['public_contact.email'] && (
                                                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors['public_contact.email']}</p>
                                                )}
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">Telefon</label>
                                                <GridCurrentHint>
                                                    {gridHintBody(
                                                        !!snap?.public_contact?.phone?.trim(),
                                                        currentHint(snap?.public_contact?.phone),
                                                    )}
                                                </GridCurrentHint>
                                                <input
                                                    value={pubPhone}
                                                    onChange={(e) => setPubPhone(e.target.value)}
                                                    className={inputClass}
                                                />
                                                {errors['public_contact.phone'] && (
                                                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors['public_contact.phone']}</p>
                                                )}
                                            </div>
                                            <div className="sm:col-span-2">
                                                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">Not / açıklama</label>
                                                <GridCurrentHint>
                                                    {gridHintBody(
                                                        !!snap?.public_contact?.note?.trim(),
                                                        currentHint(snap?.public_contact?.note),
                                                    )}
                                                </GridCurrentHint>
                                                <textarea
                                                    value={pubNote}
                                                    onChange={(e) => setPubNote(e.target.value)}
                                                    rows={2}
                                                    maxLength={2000}
                                                    className={inputClass}
                                                />
                                                {errors['public_contact.note'] && (
                                                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors['public_contact.note']}</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    <div>
                        <label htmlFor="suggest-message" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            {isArtist ? 'Ek açıklama (isteğe bağlı)' : 'Öneriniz *'}
                            {isArtist ? (
                                <span className="font-normal text-zinc-500"> — yalnızca yukarıda alan doldurmadıysanız en az 20 karakter yazın</span>
                            ) : (
                                <span className="font-normal text-zinc-500"> (en az 20 karakter)</span>
                            )}
                        </label>
                        <textarea
                            id="suggest-message"
                            value={message}
                            onChange={(ev) => setMessage(ev.target.value)}
                            required={!isArtist}
                            minLength={!isArtist ? 20 : undefined}
                            maxLength={5000}
                            rows={isArtist ? 4 : 6}
                            placeholder={
                                isArtist
                                    ? 'Örn: Birden fazla alanı birlikte güncellemeniz gerektiğini açıklayın…'
                                    : 'Örn: Doğru web sitesi … / Adres güncellenmeli … / Bu mekânla ilişkili değil …'
                            }
                            className={inputClass}
                        />
                        {errors.message && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.message}</p>}
                    </div>

                    <div className="flex flex-wrap gap-3 pt-2">
                        <button
                            type="submit"
                            disabled={processing || !canSubmit}
                            className="rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-amber-400 disabled:opacity-50"
                        >
                            {processing ? 'Gönderiliyor…' : 'Öneriyi gönder'}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
                        >
                            Vazgeç
                        </button>
                    </div>
                </form>
            </div>
        </Modal>
    );
}
