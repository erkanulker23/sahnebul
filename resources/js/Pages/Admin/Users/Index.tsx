import { AdminButton, AdminDataTable, AdminPageHeader, type AdminColumn } from '@/Components/Admin';
import AdminLayout from '@/Layouts/AdminLayout';
import SeoHead from '@/Components/SeoHead';
import { formatTurkishDateTime } from '@/lib/formatTurkishDateTime';
import { sanitizeEmailInput } from '@/lib/trPhoneInput';
import { Link, router, usePage } from '@inertiajs/react';
import { useMemo, useState } from 'react';

interface User {
    id: number;
    name: string;
    email: string;
    role: string;
    is_active: boolean;
    created_at: string;
    /** Hesaba bağlı sanatçı kaydı (admin sanatçı düzenleme) */
    linked_artist_id?: number | null;
}

interface Props {
    users: { data: User[]; links: unknown[] };
    filters: { search?: string; role?: string; status?: string };
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

export default function AdminUsersIndex({ users, filters }: Readonly<Props>) {
    const isOrganizationFirmsList = filters.role === 'manager_organization';
    const currentUserId = (usePage().props.auth as { user?: { id: number } })?.user?.id;
    const [newUserForm, setNewUserForm] = useState({
        name: '',
        email: '',
        password: '',
        role: 'customer',
        is_active: true,
    });

    const handleToggle = (user: User) => {
        router.post(route('admin.users.toggleActive', user.id));
    };

    const handleDelete = (user: User) => {
        if (confirm(`${user.name} kullanıcısını silmek istediğinize emin misiniz?`)) {
            router.delete(route('admin.users.destroy', user.id));
        }
    };

    const columns: AdminColumn<User>[] = useMemo(
        () => [
            {
                key: 'user',
                header: 'Kullanıcı',
                mobileLabel: 'Kullanıcı',
                className: 'max-w-[220px]',
                cell: (user) => (
                    <div className="min-w-0">
                        <p className="font-medium text-zinc-900 dark:text-white">{user.name}</p>
                        <p className="truncate text-sm text-zinc-500">{user.email}</p>
                    </div>
                ),
            },
            {
                key: 'role',
                header: 'Rol',
                mobileLabel: 'Rol',
                cell: (user) => (
                    <span className="inline-flex rounded-md bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200">
                        {roleLabelTr(user.role)}
                    </span>
                ),
            },
            {
                key: 'status',
                header: 'Durum',
                mobileLabel: 'Durum',
                cell: (user) => (
                    <span className={user.is_active ? 'font-medium text-emerald-600 dark:text-emerald-400' : 'font-medium text-red-600 dark:text-red-400'}>
                        {user.is_active ? 'Aktif' : 'Dondurulmuş'}
                    </span>
                ),
            },
            {
                key: 'created',
                header: 'Kayıt',
                mobileLabel: 'Kayıt',
                cell: (user) => <span className="text-zinc-600 dark:text-zinc-400">{formatTurkishDateTime(user.created_at)}</span>,
            },
        ],
        [],
    );

    return (
        <AdminLayout>
            <SeoHead
                title={
                    isOrganizationFirmsList
                        ? 'Organizasyon Firmaları - Admin | Sahnebul'
                        : 'Kullanıcılar - Admin | Sahnebul'
                }
                description={
                    isOrganizationFirmsList
                        ? 'Organizasyon firması hesaplarını listeleyin ve yönetin.'
                        : 'Kullanıcı hesaplarını yönetin.'
                }
                noindex
            />

            <div className="space-y-6">
                <AdminPageHeader
                    title={isOrganizationFirmsList ? 'Organizasyon Firmaları' : 'Kullanıcı Yönetimi'}
                    description={
                        isOrganizationFirmsList
                            ? 'Ajans ve organizasyon şirketi hesapları; yeni firma ekleyebilir veya mevcut kayıtları düzenleyebilirsiniz.'
                            : 'Hesapları oluşturun, düzenleyin veya dondurun.'
                    }
                />

                <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40 sm:p-6">
                    <h2 className="mb-4 text-base font-semibold text-zinc-900 dark:text-white">Yeni kullanıcı ekle</h2>
                    <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
                        Mevcut hesapları düzenlemek için listeden <strong className="font-medium text-zinc-800 dark:text-zinc-200">Düzenle</strong> ile ayrı sayfaya gidin.
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <input
                            value={newUserForm.name}
                            onChange={(e) => setNewUserForm((f) => ({ ...f, name: e.target.value }))}
                            placeholder="Ad Soyad"
                            className={inputClass}
                            autoComplete="name"
                        />
                        <input
                            value={newUserForm.email}
                            onChange={(e) => setNewUserForm((f) => ({ ...f, email: sanitizeEmailInput(e.target.value) }))}
                            placeholder="E-posta"
                            className={inputClass}
                            autoComplete="email"
                        />
                        <input
                            type="password"
                            value={newUserForm.password}
                            onChange={(e) => setNewUserForm((f) => ({ ...f, password: e.target.value }))}
                            placeholder="Şifre"
                            className={inputClass}
                            autoComplete="new-password"
                        />
                        <select
                            value={newUserForm.role}
                            onChange={(e) => setNewUserForm((f) => ({ ...f, role: e.target.value }))}
                            className={inputClass}
                        >
                            <option value="customer">Müşteri</option>
                            <option value="artist">Sanatçı</option>
                            <option value="venue_owner">Mekân sahibi</option>
                            <option value="manager_organization">Organizasyon firması</option>
                            <option value="admin">Admin</option>
                            <option value="super_admin">Süper admin</option>
                        </select>
                        <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300 sm:col-span-2 lg:col-span-1">
                            <input
                                type="checkbox"
                                checked={newUserForm.is_active}
                                onChange={(e) => setNewUserForm((f) => ({ ...f, is_active: e.target.checked }))}
                                className="rounded border-zinc-400 text-amber-600 focus:ring-amber-500"
                            />
                            Aktif hesap
                        </label>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                        <AdminButton size="md" onClick={() => router.post(route('admin.users.store'), newUserForm)}>
                            Kullanıcı Ekle
                        </AdminButton>
                    </div>
                </div>

                <form method="get" className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
                    <div className="min-w-0 flex-1 sm:max-w-xs">
                        <label htmlFor="user-search" className="mb-1 block text-xs font-medium text-zinc-500">
                            Arama
                        </label>
                        <input
                            id="user-search"
                            type="text"
                            name="search"
                            placeholder="İsim veya e-posta"
                            defaultValue={filters.search}
                            className={inputClass}
                        />
                    </div>
                    <div className="w-full sm:w-40">
                        <label htmlFor="user-role" className="mb-1 block text-xs font-medium text-zinc-500">
                            Rol
                        </label>
                        <select id="user-role" name="role" defaultValue={filters.role ?? ''} className={inputClass}>
                            <option value="">Tüm Roller</option>
                            <option value="customer">Müşteri</option>
                            <option value="artist">Sanatçı</option>
                            <option value="venue_owner">Mekân sahibi</option>
                            <option value="manager_organization">Organizasyon firması</option>
                            <option value="admin">Admin</option>
                            <option value="super_admin">Süper admin</option>
                        </select>
                    </div>
                    <div className="w-full sm:w-40">
                        <label htmlFor="user-status" className="mb-1 block text-xs font-medium text-zinc-500">
                            Durum
                        </label>
                        <select id="user-status" name="status" defaultValue={filters.status ?? ''} className={inputClass}>
                            <option value="">Tümü</option>
                            <option value="active">Aktif</option>
                            <option value="inactive">Dondurulmuş</option>
                        </select>
                    </div>
                    <AdminButton type="submit" variant="primary" className="w-full sm:w-auto">
                        Filtrele
                    </AdminButton>
                </form>

                <AdminDataTable
                    columns={columns}
                    rows={users.data}
                    getRowKey={(u) => u.id}
                    actions={(user) =>
                        !['admin', 'super_admin'].includes(user.role) && user.id !== currentUserId ? (
                            <>
                                <Link
                                    href={route('admin.users.edit', user.id)}
                                    className="text-sm font-medium text-sky-600 hover:text-sky-500 dark:text-sky-400"
                                >
                                    Düzenle
                                </Link>
                                {user.role === 'artist' && user.linked_artist_id != null ? (
                                    <Link
                                        href={route('admin.artists.edit', user.linked_artist_id)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm font-medium text-violet-600 hover:text-violet-500 dark:text-violet-400"
                                    >
                                        Sanatçı düzenle
                                    </Link>
                                ) : null}
                                <button type="button" onClick={() => handleToggle(user)} className="text-sm font-medium text-amber-600 hover:text-amber-500 dark:text-amber-400">
                                    {user.is_active ? 'Dondur' : 'Aktifleştir'}
                                </button>
                                <button type="button" onClick={() => handleDelete(user)} className="text-sm font-medium text-red-600 hover:text-red-500 dark:text-red-400">
                                    Sil
                                </button>
                            </>
                        ) : null
                    }
                />
            </div>
        </AdminLayout>
    );
}
