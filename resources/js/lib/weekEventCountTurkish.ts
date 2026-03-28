/** Kısa erişilebilir metin (aria-label vb.) — sanatçı/mekân kartı: önümüzdeki 7 gün penceresi */
export function weekEventCountAriaLabel(count: number): string {
    if (count <= 0) return '';
    if (count === 1) return 'Önümüzdeki 7 günde 1 etkinlik';
    return `Önümüzdeki 7 günde ${count} etkinlik`;
}

export function monthEventCountAriaLabel(count: number): string {
    if (count <= 0) return '';
    if (count === 1) return 'Bu ay 1 etkinlik';
    return `Bu ay ${count} etkinlik`;
}
