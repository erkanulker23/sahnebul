/**
 * Ziggy listesi sunucu sürümüyle uyumsuzsa (ör. yeni rota adı deploy edilmeden önce
 * sadece frontend güncellendiyse) `route()` fırlatır ve React tamamen çökerek siyah ekran verir.
 * Bu yardımcı, bilinen rotalar için path yedekleri kullanır.
 */
function queryString(params: Record<string, unknown>): string {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
        if (v === undefined || v === null || v === '') {
            continue;
        }
        if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
            sp.set(k, String(v));
        }
    }
    const s = sp.toString();

    return s === '' ? '' : `?${s}`;
}

function pathFallback(name: string, params?: Record<string, unknown>): string {
    switch (name) {
        case 'register.kullanici':
            return '/kayit/kullanici';
        case 'register.kullanici.store':
            return '/kayit/kullanici';
        case 'register':
            return `/register${queryString(params ?? {})}`;
        case 'login':
            return '/giris/kullanici';
        case 'login.sanatci':
            return '/giris/sanatci';
        case 'login.mekan':
            return '/giris/mekan';
        case 'login.admin':
            return '/yonetim/giris';
        case 'login.store': {
            const portal = params?.portal;
            if (typeof portal === 'string' && portal !== '') {
                return `/giris/${portal}`;
            }

            return '/giris/kullanici';
        }
        case 'password.request':
            return '/forgot-password';
        case 'admin.event-artist-reports.index':
            return `/admin/sanatci-etkinlik-raporlari${queryString(params ?? {})}`;
        case 'admin.event-artist-reports.update': {
            const raw = params?.report ?? params?.id;
            if (typeof raw === 'string' || typeof raw === 'number') {
                return `/admin/sanatci-etkinlik-raporlari/${raw}`;
            }

            return '/admin/sanatci-etkinlik-raporlari';
        }
        default:
            return '/';
    }
}

export function safeRoute(name: string, params?: Record<string, string | number | undefined>): string {
    try {
        const r = globalThis.route;
        if (params !== undefined && Object.keys(params).length > 0) {
            return r(name as never, params as never) as unknown as string;
        }

        return r(name as never) as unknown as string;
    } catch {
        return pathFallback(name, params as Record<string, unknown> | undefined);
    }
}
