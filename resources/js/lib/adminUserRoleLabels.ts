/** Admin arayüzünde kullanıcı `role` alanı için Türkçe etiket (kullanıcı listesi, mekân ekleyen vb.). */
export function adminUserRoleLabelTr(role: string): string {
    const map: Record<string, string> = {
        customer: 'Müşteri',
        artist: 'Sanatçı',
        venue_owner: 'Mekân sahibi',
        manager_organization: 'Management firması',
        admin: 'Admin',
        super_admin: 'Süper admin',
    };
    return map[role] ?? role;
}

/** `/admin/kullanicilar` tablosu — rol sütunu için ayırt edici renkler (açık / koyu tema). */
export function adminUserRoleBadgeClass(role: string): string {
    const base = 'inline-flex rounded-md px-2 py-0.5 text-xs font-medium';
    const byRole: Record<string, string> = {
        customer: 'bg-sky-500/15 text-sky-900 dark:bg-sky-400/20 dark:text-sky-200',
        artist: 'bg-violet-500/15 text-violet-900 dark:bg-violet-400/20 dark:text-violet-200',
        venue_owner: 'bg-emerald-500/15 text-emerald-900 dark:bg-emerald-400/20 dark:text-emerald-200',
        manager_organization: 'bg-amber-500/15 text-amber-950 dark:bg-amber-400/20 dark:text-amber-100',
        admin: 'bg-zinc-500/15 text-zinc-800 dark:bg-zinc-400/15 dark:text-zinc-200',
        super_admin: 'bg-rose-500/15 text-rose-950 dark:bg-rose-400/20 dark:text-rose-100',
    };

    return `${base} ${byRole[role] ?? 'bg-zinc-500/15 text-zinc-800 dark:bg-zinc-400/15 dark:text-zinc-200'}`;
}

/**
 * Mekânın `user_id` bağlı hesabına göre «kim ekledi» özeti.
 * Bağlı kullanıcı yoksa kayıt tipik olarak yönetim panelinden sahipsiz oluşturulmuştur → Admin.
 */
export function venueAdderKindLabelTr(user: { role: string } | null | undefined): string {
    if (user == null || user.role === '') {
        return 'Admin';
    }
    return adminUserRoleLabelTr(user.role);
}
