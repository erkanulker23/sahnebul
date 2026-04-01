import { AdminButton, AdminPageHeader } from '@/Components/Admin';
import AdminLayout from '@/Layouts/AdminLayout';
import SeoHead from '@/Components/SeoHead';
import { formatTurkishDateTime } from '@/lib/formatTurkishDateTime';
import { venueArtistStatusTr, eventStatusTr } from '@/lib/statusLabels';
import { sanitizeEmailInput } from '@/lib/trPhoneInput';
import { Link, router, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';

interface UserRow {
    id: number;
    name: string;
    email: string;
    role: string;
    is_active: boolean;
    stage_trusted_publisher?: boolean;
}

interface StageActivityOrganization {
    kind: 'organization';
    counts: { managed_artists: number; events_created: number };
    managed_artists: { id: number; name: string; slug: string; status: string; created_at: string }[];
    events_created: {
        id: number;
        title: string;
        status: string;
        start_date: string | null;
        created_at: string;
        venue: { name: string; slug: string };
    }[];
}

interface StageActivityVenueOwner {
    kind: 'venue_owner';
    counts: { venues: number; events_created: number };
    venues: { id: number; name: string; slug: string; status: string; created_at: string }[];
    events_created: {
        id: number;
        title: string;
        status: string;
        start_date: string | null;
        created_at: string;
        venue: { name: string; slug: string };
    }[];
}

type StageActivity = StageActivityOrganization | StageActivityVenueOwner | null;

interface Props {
    user: UserRow;
    canAssignElevatedRoles?: boolean;
    stage_activity?: StageActivity;
}

function roleLabelTr(role: string): string {
    const map: Record<string, string> = {
        customer: 'Müşteri',
        artist: 'Sanatçı',
        venue_owner: 'Mekân sahibi',
        manager_organization: 'Organizasyon firması',
        admin: 'Admin',
        super_admin: 'Süper admin',
    };
    return map[role] ?? role;
}

const inputClass =
    'w-full min-w-0 rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500';

export default function AdminUsersEdit({ user, canAssignElevatedRoles = false, stage_activity = null }: Readonly<Props>) {
    const currentUserId = (usePage().props.auth as { user?: { id: number } })?.user?.id;
    const [resetBusy, setResetBusy] = useState(false);

    const form = useForm({
        name: user.name,
        email: user.email,
        password: '',
        role: user.role,
        is_active: user.is_active,
        stage_trusted_publisher: user.stage_trusted_publisher === true,
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        form.put(route('admin.users.update', user.id), { preserveScroll: true });
    };

    const sendReset = () => {
        if (!confirm(`${user.email} adresine şifre sıfırlama e-postası gönderilsin mi?`)) return;
        setResetBusy(true);
        router.post(route('admin.users.sendPasswordReset', user.id), {}, {
            preserveScroll: true,
            onFinish: () => setResetBusy(false),
        });
    };

    return (
        <AdminLayout>
            <SeoHead title={`${user.name} — Kullanıcı düzenle`} description="Kullanıcı hesabını düzenleyin." noindex />

            <div className="space-y-6">
                <div>
                    <Link href={route('admin.users.index')} className="text-sm text-amber-400 hover:text-amber-300">
                        ← Kullanıcı listesi
                    </Link>
                    <div className="mt-4">
                        <AdminPageHeader title="Kullanıcı düzenle" description={`${user.name} — ${roleLabelTr(user.role)}`} />
                    </div>
                </div>

                <form onSubmit={submit} className="max-w-xl space-y-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
                    <div>
                        <label htmlFor="u-name" className="block text-xs font-medium text-zinc-500">
                            Ad Soyad
                        </label>
                        <input
                            id="u-name"
                            value={form.data.name}
                            onChange={(e) => form.setData('name', e.target.value)}
                            className={inputClass}
                            required
                        />
                        {form.errors.name && <p className="mt-1 text-sm text-red-600">{form.errors.name}</p>}
                    </div>
                    <div>
                        <label htmlFor="u-email" className="block text-xs font-medium text-zinc-500">
                            E-posta
                        </label>
                        <input
                            id="u-email"
                            type="email"
                            value={form.data.email}
                            onChange={(e) => form.setData('email', sanitizeEmailInput(e.target.value))}
                            className={inputClass}
                            required
                        />
                        {form.errors.email && <p className="mt-1 text-sm text-red-600">{form.errors.email}</p>}
                    </div>
                    <div>
                        <label htmlFor="u-pass" className="block text-xs font-medium text-zinc-500">
                            Yeni şifre (opsiyonel)
                        </label>
                        <input
                            id="u-pass"
                            type="password"
                            value={form.data.password}
                            onChange={(e) => form.setData('password', e.target.value)}
                            className={inputClass}
                            autoComplete="new-password"
                        />
                        {form.errors.password && <p className="mt-1 text-sm text-red-600">{form.errors.password}</p>}
                    </div>
                    <div>
                        <label htmlFor="u-role" className="block text-xs font-medium text-zinc-500">
                            Rol
                        </label>
                        <select
                            id="u-role"
                            value={form.data.role}
                            onChange={(e) => {
                                const next = e.target.value;
                                form.setData('role', next);
                                if (next !== 'manager_organization' && next !== 'venue_owner') {
                                    form.setData('stage_trusted_publisher', false);
                                }
                            }}
                            className={inputClass}
                        >
                            <option value="customer">Müşteri</option>
                            <option value="artist">Sanatçı</option>
                            <option value="venue_owner">Mekân sahibi</option>
                            <option value="manager_organization">Organizasyon firması</option>
                            {canAssignElevatedRoles ? (
                                <>
                                    <option value="admin">Admin</option>
                                    <option value="super_admin">Süper admin</option>
                                </>
                            ) : null}
                        </select>
                        {form.errors.role && <p className="mt-1 text-sm text-red-600">{form.errors.role}</p>}
                    </div>
                    {(form.data.role === 'manager_organization' || form.data.role === 'venue_owner') ? (
                        <label className="flex items-start gap-3 rounded-lg border border-violet-200/70 bg-violet-50/60 p-4 text-sm text-zinc-800 dark:border-violet-500/30 dark:bg-violet-950/25 dark:text-zinc-200">
                            <input
                                type="checkbox"
                                checked={form.data.stage_trusted_publisher}
                                onChange={(e) => form.setData('stage_trusted_publisher', e.target.checked)}
                                className="mt-0.5 rounded border-zinc-400 text-violet-600 focus:ring-violet-500"
                            />
                            <span>
                                <span className="font-medium text-zinc-900 dark:text-white">Güvenilir sahne yayıncısı</span>
                                <span className="mt-1 block text-zinc-600 dark:text-zinc-400">
                                    Açıkken bu hesabın oluşturduğu yeni mekân ve organizasyon kadrosu sanatçısı kayıtları admin onayı
                                    beklemeden doğrudan onaylı yayına alınır.
                                </span>
                            </span>
                        </label>
                    ) : null}
                    <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                        <input
                            type="checkbox"
                            checked={form.data.is_active}
                            onChange={(e) => form.setData('is_active', e.target.checked)}
                            className="rounded border-zinc-400 text-amber-600 focus:ring-amber-500"
                        />
                        Aktif hesap
                    </label>
                    <div className="flex flex-wrap gap-2 pt-2">
                        <AdminButton type="submit" size="md" disabled={form.processing}>
                            Kaydet
                        </AdminButton>
                        <Link href={route('admin.users.index')}>
                            <AdminButton type="button" variant="secondary" size="md">
                                Listeye dön
                            </AdminButton>
                        </Link>
                    </div>
                </form>

                {stage_activity?.kind === 'organization' ? (
                    <div className="max-w-3xl space-y-6 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
                        <h2 className="text-base font-semibold text-zinc-900 dark:text-white">Organizasyon özeti</h2>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                            Kadrodaki sanatçı:{' '}
                            <span className="font-medium text-zinc-900 dark:text-white">{stage_activity.counts.managed_artists}</span>
                            {' · '}
                            Sahne panelinden oluşturduğu etkinlik:{' '}
                            <span className="font-medium text-zinc-900 dark:text-white">{stage_activity.counts.events_created}</span>
                        </p>
                        <div className="grid gap-6 md:grid-cols-2">
                            <div>
                                <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Son kadro sanatçıları</h3>
                                <ul className="mt-2 divide-y divide-zinc-200 dark:divide-zinc-800">
                                    {stage_activity.managed_artists.length === 0 ? (
                                        <li className="py-2 text-sm text-zinc-500">Kayıt yok.</li>
                                    ) : (
                                        stage_activity.managed_artists.map((a) => (
                                            <li key={a.id} className="py-2">
                                                <Link
                                                    href={route('admin.artists.edit', a.id)}
                                                    className="font-medium text-amber-700 hover:underline dark:text-amber-400"
                                                >
                                                    {a.name}
                                                </Link>
                                                <p className="text-xs text-zinc-500 sm:text-sm">
                                                    {venueArtistStatusTr(a.status)} · {formatTurkishDateTime(a.created_at)}
                                                </p>
                                            </li>
                                        ))
                                    )}
                                </ul>
                            </div>
                            <div>
                                <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Oluşturduğu etkinlikler</h3>
                                <ul className="mt-2 divide-y divide-zinc-200 dark:divide-zinc-800">
                                    {stage_activity.events_created.length === 0 ? (
                                        <li className="py-2 text-sm text-zinc-500">Henüz yok.</li>
                                    ) : (
                                        stage_activity.events_created.map((ev) => (
                                            <li key={ev.id} className="py-2">
                                                <Link
                                                    href={route('admin.events.edit', ev.id)}
                                                    className="font-medium text-amber-700 hover:underline dark:text-amber-400"
                                                >
                                                    {ev.title}
                                                </Link>
                                                <p className="text-xs text-zinc-500 sm:text-sm">
                                                    {ev.venue.name} · {eventStatusTr(ev.status)} ·{' '}
                                                    {formatTurkishDateTime(ev.created_at)}
                                                </p>
                                            </li>
                                        ))
                                    )}
                                </ul>
                            </div>
                        </div>
                    </div>
                ) : null}

                {stage_activity?.kind === 'venue_owner' ? (
                    <div className="max-w-3xl space-y-6 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
                        <h2 className="text-base font-semibold text-zinc-900 dark:text-white">Mekân sahibi özeti</h2>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                            Mekân kaydı:{' '}
                            <span className="font-medium text-zinc-900 dark:text-white">{stage_activity.counts.venues}</span>
                            {' · '}
                            Sahne panelinden oluşturduğu etkinlik:{' '}
                            <span className="font-medium text-zinc-900 dark:text-white">{stage_activity.counts.events_created}</span>
                        </p>
                        <div className="grid gap-6 md:grid-cols-2">
                            <div>
                                <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Mekânları</h3>
                                <ul className="mt-2 divide-y divide-zinc-200 dark:divide-zinc-800">
                                    {stage_activity.venues.length === 0 ? (
                                        <li className="py-2 text-sm text-zinc-500">Kayıt yok.</li>
                                    ) : (
                                        stage_activity.venues.map((v) => (
                                            <li key={v.id} className="py-2">
                                                <Link
                                                    href={route('admin.venues.edit', v.id)}
                                                    className="font-medium text-amber-700 hover:underline dark:text-amber-400"
                                                >
                                                    {v.name}
                                                </Link>
                                                <p className="text-xs text-zinc-500 sm:text-sm">
                                                    {venueArtistStatusTr(v.status)} · {formatTurkishDateTime(v.created_at)}
                                                </p>
                                            </li>
                                        ))
                                    )}
                                </ul>
                            </div>
                            <div>
                                <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Oluşturduğu etkinlikler</h3>
                                <ul className="mt-2 divide-y divide-zinc-200 dark:divide-zinc-800">
                                    {stage_activity.events_created.length === 0 ? (
                                        <li className="py-2 text-sm text-zinc-500">Henüz yok.</li>
                                    ) : (
                                        stage_activity.events_created.map((ev) => (
                                            <li key={ev.id} className="py-2">
                                                <Link
                                                    href={route('admin.events.edit', ev.id)}
                                                    className="font-medium text-amber-700 hover:underline dark:text-amber-400"
                                                >
                                                    {ev.title}
                                                </Link>
                                                <p className="text-xs text-zinc-500 sm:text-sm">
                                                    {ev.venue.name} · {eventStatusTr(ev.status)} ·{' '}
                                                    {formatTurkishDateTime(ev.created_at)}
                                                </p>
                                            </li>
                                        ))
                                    )}
                                </ul>
                            </div>
                        </div>
                    </div>
                ) : null}

                <div className="max-w-xl rounded-xl border border-amber-200/80 bg-amber-50/80 p-6 dark:border-amber-500/25 dark:bg-amber-500/10">
                    <h2 className="text-base font-semibold text-zinc-900 dark:text-white">Şifre sıfırlama</h2>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                        Kullanıcıya Laravel şifre sıfırlama e-postası gider. Gelen bağlantı ile yeni şifre belirleyip giriş yapabilir.
                    </p>
                    <div className="mt-4">
                        <AdminButton
                            type="button"
                            variant="secondary"
                            size="md"
                            disabled={resetBusy || user.id === currentUserId}
                            onClick={() => void sendReset()}
                        >
                            {resetBusy ? 'Gönderiliyor…' : 'Şifre sıfırlama e-postası gönder'}
                        </AdminButton>
                        {user.id === currentUserId ? (
                            <p className="mt-2 text-xs text-zinc-500">Kendi hesabınız için bu düğme devre dışıdır.</p>
                        ) : null}
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
