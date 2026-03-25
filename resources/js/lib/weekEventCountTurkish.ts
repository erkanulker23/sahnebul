/** Kısa erişilebilir metin (aria-label vb.) */
export function weekEventCountAriaLabel(count: number): string {
    if (count <= 0) return '';
    if (count === 1) return 'Bu hafta 1 etkinlik';
    return `Bu hafta ${count} etkinlik`;
}

export function monthEventCountAriaLabel(count: number): string {
    if (count <= 0) return '';
    if (count === 1) return 'Bu ay 1 etkinlik';
    return `Bu ay ${count} etkinlik`;
}
