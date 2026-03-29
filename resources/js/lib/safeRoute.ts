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
        case 'login.organizasyon':
            return '/giris/organizasyon';
        case 'login.sahne':
            return '/giris/sahne';
        case 'login.admin':
            return '/yonetim/giris';
        case 'contact':
            return '/iletisim';
        case 'auth.google.credential':
            return '/auth/google/kimlik';
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
        case 'admin.seo-tools.index':
            return '/admin/seo-site-haritasi';
        case 'admin.content-sliders.index':
            return '/admin/slider';
        case 'admin.content-sliders.create':
            return '/admin/slider/ekle';
        case 'admin.content-sliders.store':
            return '/admin/slider';
        case 'admin.content-sliders.edit': {
            const id = params?.content_slider ?? params?.id;
            if (typeof id === 'string' || typeof id === 'number') {
                return `/admin/slider/${id}/duzenle`;
            }

            return '/admin/slider';
        }
        case 'admin.content-sliders.update': {
            const id = params?.content_slider ?? params?.id;
            if (typeof id === 'string' || typeof id === 'number') {
                return `/admin/slider/${id}/guncelle`;
            }

            return '/admin/slider';
        }
        case 'admin.content-sliders.destroy': {
            const id = params?.content_slider ?? params?.id;
            if (typeof id === 'string' || typeof id === 'number') {
                return `/admin/slider/${id}`;
            }

            return '/admin/slider';
        }
        case 'artist.organization.artists.index':
            return `/sahne/organizasyon/sanatcilar${queryString(params ?? {})}`;
        case 'artist.organization.artists.store':
            return '/sahne/organizasyon/sanatcilar';
        case 'artist.organization.artists.attach': {
            const slug = params?.artist;
            if (typeof slug === 'string' && slug !== '') {
                return `/sahne/organizasyon/sanatcilar/${encodeURIComponent(slug)}/kat`;
            }

            return '/sahne/organizasyon/sanatcilar';
        }
        case 'artist.organization.artists.detach': {
            const slug = params?.artist;
            if (typeof slug === 'string' && slug !== '') {
                return `/sahne/organizasyon/sanatcilar/${encodeURIComponent(slug)}/birak`;
            }

            return '/sahne/organizasyon/sanatcilar';
        }
        case 'artist.organization.artists.propose-update': {
            const slug = params?.artist;
            if (typeof slug === 'string' && slug !== '') {
                return `/sahne/organizasyon/sanatcilar/${encodeURIComponent(slug)}/duzenme-oneri`;
            }

            return '/sahne/organizasyon/sanatcilar';
        }
        case 'artist.public-profile.gallery.instagram.store':
            return '/sahne/sanatci-sayfam/galeri-instagram';
        case 'admin.artists.import-promo-media': {
            const id = params?.artist ?? params?.id;
            if (typeof id === 'string' || typeof id === 'number') {
                return `/admin/sanatcilar/${id}/adresten-tanitim-medya`;
            }

            return '/admin/sanatcilar';
        }
        case 'admin.artists.append-promo-files': {
            const id = params?.artist ?? params?.id;
            if (typeof id === 'string' || typeof id === 'number') {
                return `/admin/sanatcilar/${id}/tanitim-dosya-yukle`;
            }

            return '/admin/sanatcilar';
        }
        case 'admin.artists.clear-promo-media': {
            const id = params?.artist ?? params?.id;
            if (typeof id === 'string' || typeof id === 'number') {
                return `/admin/sanatcilar/${id}/tanitim-medya-temizle`;
            }

            return '/admin/sanatcilar';
        }
        case 'admin.artists.remove-promo-item': {
            const id = params?.artist ?? params?.id;
            if (typeof id === 'string' || typeof id === 'number') {
                return `/admin/sanatcilar/${id}/tanitim-galeri-oge-sil`;
            }

            return '/admin/sanatcilar';
        }
        case 'admin.venues.import-promo-media': {
            const id = params?.venue ?? params?.id;
            if (typeof id === 'string' || typeof id === 'number') {
                return `/admin/mekanlar/${id}/adresten-tanitim-medya`;
            }

            return '/admin/mekanlar';
        }
        case 'admin.venues.append-promo-files': {
            const id = params?.venue ?? params?.id;
            if (typeof id === 'string' || typeof id === 'number') {
                return `/admin/mekanlar/${id}/tanitim-dosya-yukle`;
            }

            return '/admin/mekanlar';
        }
        case 'admin.venues.clear-promo-media': {
            const id = params?.venue ?? params?.id;
            if (typeof id === 'string' || typeof id === 'number') {
                return `/admin/mekanlar/${id}/tanitim-medya-temizle`;
            }

            return '/admin/mekanlar';
        }
        case 'admin.venues.remove-promo-item': {
            const id = params?.venue ?? params?.id;
            if (typeof id === 'string' || typeof id === 'number') {
                return `/admin/mekanlar/${id}/tanitim-galeri-oge-sil`;
            }

            return '/admin/mekanlar';
        }
        case 'admin.external-events.index':
            return `/admin/dis-kaynak-etkinlikler${queryString(params ?? {})}`;
        case 'admin.external-events.crawl':
            return '/admin/dis-kaynak-etkinlikler/veri-cek';
        case 'admin.external-events.crawl-preview':
            return '/admin/dis-kaynak-etkinlikler/onizle';
        case 'admin.external-events.bulk':
            return '/admin/dis-kaynak-etkinlikler/toplu-islem';
        case 'admin.external-events.sync': {
            const id = params?.externalEvent ?? params?.external_event ?? params?.id;
            if (typeof id === 'string' || typeof id === 'number') {
                return `/admin/dis-kaynak-etkinlikler/${id}/aktar`;
            }

            return '/admin/dis-kaynak-etkinlikler';
        }
        case 'admin.external-events.reject': {
            const id = params?.externalEvent ?? params?.external_event ?? params?.id;
            if (typeof id === 'string' || typeof id === 'number') {
                return `/admin/dis-kaynak-etkinlikler/${id}/reddet`;
            }

            return '/admin/dis-kaynak-etkinlikler';
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
