/**
 * Türkiye telefonu: 0 + 10 hane, görüntü 0XXX XXX XX XX (backend ile uyumlu).
 */
export function formatTrPhoneInput(raw: string): string {
    let digits = raw.replace(/\D/g, '');
    if (digits.startsWith('90')) {
        digits = `0${digits.slice(2)}`;
    }
    if (digits.length > 0 && !digits.startsWith('0')) {
        digits = `0${digits}`;
    }
    digits = digits.slice(0, 11);
    if (digits.length === 0) {
        return '';
    }
    const body = digits.slice(1);
    const p1 = body.slice(0, 3);
    const p2 = body.slice(3, 6);
    const p3 = body.slice(6, 8);
    const p4 = body.slice(8, 10);
    let out = '0';
    if (p1) {
        out += p1;
    }
    if (p2) {
        out += ` ${p2}`;
    }
    if (p3) {
        out += ` ${p3}`;
    }
    if (p4) {
        out += ` ${p4}`;
    }
    return out;
}

/** E-posta alanında boşluk ve görünmez karakterleri kaldırır (RFC dışı girişleri engeller). */
export function sanitizeEmailInput(raw: string): string {
    return raw.replace(/\s/g, '');
}
