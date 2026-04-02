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
