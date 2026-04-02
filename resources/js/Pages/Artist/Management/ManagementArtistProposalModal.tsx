import { Modal } from '@/Components/ui/Modal';
import { sanitizeEmailInput } from '@/lib/trPhoneInput';
import { useForm } from '@inertiajs/react';
import { FormEvent } from 'react';

const SOCIAL_KEYS = ['instagram', 'twitter', 'x', 'youtube', 'spotify', 'tiktok', 'facebook'] as const;
type SocialKey = (typeof SOCIAL_KEYS)[number];

function socialLabel(k: SocialKey): string {
    const map: Record<SocialKey, string> = {
        instagram: 'Instagram',
        twitter: 'Twitter / X',
        x: 'X',
        youtube: 'YouTube',
        spotify: 'Spotify',
        tiktok: 'TikTok',
        facebook: 'Facebook',
    };
    return map[k];
}

export interface RosterArtistRef {
    slug: string;
    name: string;
    status: string;
}

const inputClass =
    'mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100';

type Props = {
    open: boolean;
    onClose: () => void;
    artist: RosterArtistRef | null;
};

export default function ManagementArtistProposalModal({ open, onClose, artist }: Readonly<Props>) {
    const pendingForm = useForm({ message: '', name: '', bio: '' });

    const approvedForm = useForm({
        message: '',
        website: '',
        bio: '',
        social_links: Object.fromEntries(SOCIAL_KEYS.map((k) => [k, ''])) as Record<SocialKey, string>,
        manager_info: { name: '', company: '', phone: '', email: '' },
        public_contact: { email: '', phone: '', note: '' },
    });

    if (!artist) {
        return null;
    }

    const isApproved = artist.status === 'approved';

    const submitPending = (e: FormEvent) => {
        e.preventDefault();
        pendingForm.post(route('artist.management.artists.propose-update', artist.slug), {
            preserveScroll: true,
            onSuccess: () => {
                onClose();
                pendingForm.reset();
            },
        });
    };

    const submitApproved = (e: FormEvent) => {
        e.preventDefault();
        approvedForm.post(route('artist.management.artists.propose-update', artist.slug), {
            preserveScroll: true,
            onSuccess: () => {
                onClose();
                approvedForm.reset();
            },
        });
    };

    return (
        <Modal show={open} onClose={onClose} maxWidth="2xl">
            <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-700">
                <h2 className="font-display text-lg font-semibold">Düzenleme önerisi — {artist.name}</h2>
            </div>
            <div className="px-5 py-4">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Değişiklikler doğrudan uygulanmaz; site yönetimi önerinizi inceler ve onaylar.
            </p>

            {isApproved ? (
                <form onSubmit={submitApproved} className="mt-4 max-h-[70vh] space-y-4 overflow-y-auto pr-1">
                    <div>
                        <label htmlFor="org-prop-msg-a" className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                            Not (isteğe bağlı)
                        </label>
                        <textarea
                            id="org-prop-msg-a"
                            value={approvedForm.data.message}
                            onChange={(ev) => approvedForm.setData('message', ev.target.value)}
                            rows={3}
                            maxLength={5000}
                            className={inputClass}
                        />
                        {approvedForm.errors.message && <p className="mt-1 text-xs text-red-600">{approvedForm.errors.message}</p>}
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">Web sitesi</label>
                        <input
                            value={approvedForm.data.website}
                            onChange={(ev) => approvedForm.setData('website', ev.target.value)}
                            className={inputClass}
                            placeholder="https://…"
                        />
                        {approvedForm.errors.website && <p className="mt-1 text-xs text-red-600">{approvedForm.errors.website}</p>}
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">Biyografi</label>
                        <textarea
                            value={approvedForm.data.bio}
                            onChange={(ev) => approvedForm.setData('bio', ev.target.value)}
                            rows={4}
                            maxLength={12000}
                            className={inputClass}
                        />
                        {approvedForm.errors.bio && <p className="mt-1 text-xs text-red-600">{approvedForm.errors.bio}</p>}
                    </div>
                    <div>
                        <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Sosyal medya</p>
                        <div className="mt-2 grid gap-2 sm:grid-cols-2">
                            {SOCIAL_KEYS.map((k) => (
                                <div key={k}>
                                    <label className="block text-xs text-zinc-500">{socialLabel(k)}</label>
                                    <input
                                        value={approvedForm.data.social_links[k]}
                                        onChange={(ev) =>
                                            approvedForm.setData('social_links', { ...approvedForm.data.social_links, [k]: ev.target.value })
                                        }
                                        className={inputClass}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                            <label className="block text-xs text-zinc-500">Menajer / temsilci adı</label>
                            <input
                                value={approvedForm.data.manager_info.name}
                                onChange={(ev) =>
                                    approvedForm.setData('manager_info', { ...approvedForm.data.manager_info, name: ev.target.value })
                                }
                                className={inputClass}
                            />
                        </div>
                        <div className="sm:col-span-2">
                            <label className="block text-xs text-zinc-500">Şirket / ajans</label>
                            <input
                                value={approvedForm.data.manager_info.company}
                                onChange={(ev) =>
                                    approvedForm.setData('manager_info', { ...approvedForm.data.manager_info, company: ev.target.value })
                                }
                                className={inputClass}
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-zinc-500">Menajer telefon</label>
                            <input
                                value={approvedForm.data.manager_info.phone}
                                onChange={(ev) =>
                                    approvedForm.setData('manager_info', { ...approvedForm.data.manager_info, phone: ev.target.value })
                                }
                                className={inputClass}
                            />
                            {approvedForm.errors['manager_info.phone'] && (
                                <p className="mt-1 text-xs text-red-600">{approvedForm.errors['manager_info.phone']}</p>
                            )}
                        </div>
                        <div>
                            <label className="block text-xs text-zinc-500">Menajer e-posta</label>
                            <input
                                type="email"
                                value={approvedForm.data.manager_info.email}
                                onChange={(ev) =>
                                    approvedForm.setData('manager_info', {
                                        ...approvedForm.data.manager_info,
                                        email: sanitizeEmailInput(ev.target.value),
                                    })
                                }
                                className={inputClass}
                            />
                            {approvedForm.errors['manager_info.email'] && (
                                <p className="mt-1 text-xs text-red-600">{approvedForm.errors['manager_info.email']}</p>
                            )}
                        </div>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                        <div>
                            <label className="block text-xs text-zinc-500">Herkese açık e-posta</label>
                            <input
                                type="email"
                                value={approvedForm.data.public_contact.email}
                                onChange={(ev) =>
                                    approvedForm.setData('public_contact', {
                                        ...approvedForm.data.public_contact,
                                        email: sanitizeEmailInput(ev.target.value),
                                    })
                                }
                                className={inputClass}
                            />
                            {approvedForm.errors['public_contact.email'] && (
                                <p className="mt-1 text-xs text-red-600">{approvedForm.errors['public_contact.email']}</p>
                            )}
                        </div>
                        <div>
                            <label className="block text-xs text-zinc-500">Herkese açık telefon</label>
                            <input
                                value={approvedForm.data.public_contact.phone}
                                onChange={(ev) =>
                                    approvedForm.setData('public_contact', { ...approvedForm.data.public_contact, phone: ev.target.value })
                                }
                                className={inputClass}
                            />
                            {approvedForm.errors['public_contact.phone'] && (
                                <p className="mt-1 text-xs text-red-600">{approvedForm.errors['public_contact.phone']}</p>
                            )}
                        </div>
                        <div className="sm:col-span-2">
                            <label className="block text-xs text-zinc-500">Herkese açık not</label>
                            <textarea
                                value={approvedForm.data.public_contact.note}
                                onChange={(ev) =>
                                    approvedForm.setData('public_contact', { ...approvedForm.data.public_contact, note: ev.target.value })
                                }
                                rows={2}
                                maxLength={2000}
                                className={inputClass}
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-600"
                        >
                            Vazgeç
                        </button>
                        <button
                            type="submit"
                            disabled={approvedForm.processing}
                            className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-zinc-900 disabled:opacity-50"
                        >
                            {approvedForm.processing ? 'Gönderiliyor…' : 'Öneriyi gönder'}
                        </button>
                    </div>
                </form>
            ) : (
                <form onSubmit={submitPending} className="mt-4 space-y-4">
                    <div>
                        <label htmlFor="org-prop-name" className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                            Önerilen sanatçı adı
                        </label>
                        <input
                            id="org-prop-name"
                            value={pendingForm.data.name}
                            onChange={(ev) => pendingForm.setData('name', ev.target.value)}
                            className={inputClass}
                        />
                        {pendingForm.errors.name && <p className="mt-1 text-xs text-red-600">{pendingForm.errors.name}</p>}
                    </div>
                    <div>
                        <label htmlFor="org-prop-bio" className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                            Önerilen biyografi
                        </label>
                        <textarea
                            id="org-prop-bio"
                            value={pendingForm.data.bio}
                            onChange={(ev) => pendingForm.setData('bio', ev.target.value)}
                            rows={5}
                            maxLength={12000}
                            className={inputClass}
                        />
                        {pendingForm.errors.bio && <p className="mt-1 text-xs text-red-600">{pendingForm.errors.bio}</p>}
                    </div>
                    <div>
                        <label htmlFor="org-prop-msg-p" className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                            Not (alanlardan en az biri veya 20+ karakter)
                        </label>
                        <textarea
                            id="org-prop-msg-p"
                            value={pendingForm.data.message}
                            onChange={(ev) => pendingForm.setData('message', ev.target.value)}
                            rows={3}
                            maxLength={5000}
                            className={inputClass}
                        />
                        {pendingForm.errors.message && <p className="mt-1 text-xs text-red-600">{pendingForm.errors.message}</p>}
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-600"
                        >
                            Vazgeç
                        </button>
                        <button
                            type="submit"
                            disabled={pendingForm.processing}
                            className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-zinc-900 disabled:opacity-50"
                        >
                            {pendingForm.processing ? 'Gönderiliyor…' : 'Öneriyi gönder'}
                        </button>
                    </div>
                </form>
            )}
            </div>
        </Modal>
    );
}
