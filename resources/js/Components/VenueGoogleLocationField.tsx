import { buildVenueGoogleLocationPayload, type VenueGoogleLocationApplyPayload } from '@/lib/buildVenuePayloadFromGooglePlace';
import { extractLatLngFromGoogleMapsUrl } from '@/lib/extractGoogleMapsCoords';
import { googlePlaceFieldText } from '@/lib/googlePlaceFieldText';
import {
    normalizeGoogleAddressComponents,
    resolveTurkeyLocationFromGoogle,
    type GoogleAddressComponent,
} from '@/lib/resolveTurkeyLocationFromGoogle';
import { useCallback, useEffect, useRef, useState } from 'react';

export type { VenueGoogleLocationApplyPayload };

interface Props {
    googleMapsBrowserKey: string | null;
    onApply: (payload: VenueGoogleLocationApplyPayload) => void;
    currentAddress: string;
}

declare global {
    interface Window {
        google?: unknown;
        __sahnebulGmapsInit?: () => void;
        gm_authFailure?: () => void;
    }
}

function formatCoordShort(n: number): string {
    return n.toFixed(8);
}

type TabId = 'search' | 'link';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GoogleMapsNs = any;

/** Eski PlacesService — telefon, web, adres bileşenleri yeni Place API’ye göre daha tutarlı döner */
function fetchLegacyPlaceDetails(google: GoogleMapsNs, placeId: string): Promise<GoogleMapsNs | null> {
    return new Promise((resolve) => {
        const PlacesService = google?.maps?.places?.PlacesService;
        if (!PlacesService) {
            resolve(null);
            return;
        }
        const dummy = document.createElement('div');
        const ps = new PlacesService(dummy);
        ps.getDetails(
            {
                placeId,
                fields: [
                    'formatted_address',
                    'geometry',
                    'name',
                    'address_components',
                    'international_phone_number',
                    'formatted_phone_number',
                    'website',
                    'url',
                    'opening_hours',
                    'editorial_summary',
                    'photos',
                ],
            },
            (place: GoogleMapsNs | null, status: string) => {
                const OK = google.maps.places.PlacesServiceStatus.OK;
                resolve(status === OK && place ? place : null);
            },
        );
    });
}

const MAX_GOOGLE_VENUE_PHOTOS = 5;

function pushPhotoUrl(bucket: string[], url: string | undefined): void {
    if (!url || !/^https?:\/\//i.test(url)) {
        return;
    }
    const base = url.split('?')[0];
    if (bucket.some((x) => x.split('?')[0] === base)) {
        return;
    }
    if (bucket.length >= MAX_GOOGLE_VENUE_PHOTOS) {
        return;
    }
    bucket.push(url);
}

/** Eski PlacesService: photos[].getUrl (en fazla 5) */
function extractLegacyPhotoUrls(place: GoogleMapsNs | null | undefined): string[] {
    const out: string[] = [];
    const photos = place?.photos as GoogleMapsNs[] | undefined;
    if (!photos?.length) {
        return out;
    }
    for (const ph of photos) {
        if (out.length >= MAX_GOOGLE_VENUE_PHOTOS) {
            break;
        }
        if (ph && typeof ph.getUrl === 'function') {
            try {
                const u = ph.getUrl({ maxWidth: 1600 });
                if (typeof u === 'string') {
                    pushPhotoUrl(out, u);
                }
            } catch {
                /* ignore */
            }
        }
    }
    return out;
}

/** Yeni Place (JS) API: photos + getUrl / getURI */
async function fetchNewPlacePhotoUrls(google: GoogleMapsNs, placeId: string): Promise<string[]> {
    const out: string[] = [];
    if (typeof google?.maps?.importLibrary !== 'function') {
        return out;
    }
    try {
        const lib = await google.maps.importLibrary('places');
        const Place = lib.Place as
            | (new (opts: { id: string }) => { fetchFields: (o: { fields: string[] }) => Promise<void> })
            | undefined;
        if (!Place) {
            return out;
        }
        const p = new Place({ id: placeId });
        await p.fetchFields({ fields: ['photos'] });
        const raw = p as {
            photos?: Array<{
                getUrl?: (opts: { maxWidth?: number }) => string;
                getURI?: (opts: { maxWidth?: number }) => Promise<string>;
            }>;
        };
        for (const ph0 of raw.photos ?? []) {
            if (out.length >= MAX_GOOGLE_VENUE_PHOTOS) {
                break;
            }
            if (ph0?.getUrl) {
                const u = ph0.getUrl({ maxWidth: 1600 });
                pushPhotoUrl(out, typeof u === 'string' ? u : undefined);
            } else if (ph0?.getURI) {
                const u = await ph0.getURI({ maxWidth: 1600 });
                pushPhotoUrl(out, typeof u === 'string' ? u : undefined);
            }
        }
    } catch (e) {
        console.error(e);
    }
    return out;
}

/** Legacy + yeni API ile en fazla 5 benzersiz foto URL */
async function resolveGooglePlaceGalleryUrls(
    google: GoogleMapsNs,
    placeId: string,
    legacy: GoogleMapsNs | null | undefined,
): Promise<string[]> {
    const out: string[] = [];
    for (const u of extractLegacyPhotoUrls(legacy)) {
        pushPhotoUrl(out, u);
    }
    if (out.length < MAX_GOOGLE_VENUE_PHOTOS) {
        const fromNew = await fetchNewPlacePhotoUrls(google, placeId);
        for (const u of fromNew) {
            pushPhotoUrl(out, u);
        }
    }
    return out;
}

function textOf(v: unknown): string {
    if (v == null) {
        return '';
    }
    if (typeof v === 'string') {
        return v;
    }
    if (typeof v === 'object' && v !== null && 'text' in v) {
        const t = (v as { text?: unknown }).text;
        if (typeof t === 'string') {
            return t;
        }
    }
    if (typeof (v as { toString?: () => string }).toString === 'function') {
        const s = (v as { toString: () => string }).toString();
        if (s !== '[object Object]') {
            return s;
        }
    }
    return '';
}

const SEARCH_TIMEOUT_MS = 20000;

/** Google Cloud → Credentials → API anahtarı → Uygulama kısıtlaması: HTTP referansları (web siteleri) */
function mapsReferrerAllowlistForThisSite(): { https: string; http: string } {
    if (typeof window === 'undefined') {
        return { https: 'https://localhost/*', http: 'http://localhost/*' };
    }
    const host = window.location.host || 'localhost';
    return {
        https: `https://${host}/*`,
        http: `http://${host}/*`,
    };
}

export default function VenueGoogleLocationField({ googleMapsBrowserKey, onApply, currentAddress }: Readonly<Props>) {
    const onApplyRef = useRef(onApply);
    onApplyRef.current = onApply;
    const addressRef = useRef(currentAddress);
    addressRef.current = currentAddress;

    const [mapsReady, setMapsReady] = useState(false);
    const [activeTab, setActiveTab] = useState<TabId>('search');
    const [query, setQuery] = useState('');
    const [predictions, setPredictions] = useState<
        { place_id: string; main: string; secondary: string }[]
    >([]);
    const [searchStatus, setSearchStatus] = useState<'idle' | 'loading' | 'error' | 'empty'>('idle');
    const [searchMessage, setSearchMessage] = useState<string | null>(null);
    const [detailPlaceId, setDetailPlaceId] = useState<string | null>(null);

    const [linkDraft, setLinkDraft] = useState('');
    const [linkError, setLinkError] = useState<string | null>(null);
    const [mapsLoadError, setMapsLoadError] = useState<string | null>(null);

    useEffect(() => {
        if (!googleMapsBrowserKey) {
            return;
        }

        const prevAuthFailure = window.gm_authFailure;
        window.gm_authFailure = () => {
            const { https, http } = mapsReferrerAllowlistForThisSite();
            setMapsLoadError(
                `Google Maps API anahtarı bu siteye izin vermiyor (RefererNotAllowed). Google Cloud Console → APIs & Services → Credentials → bu anahtarı açın → “Application restrictions” → HTTP referrers (web sitesi) → “Add” ile şunları ekleyin: ${https} ve yerelde http kullanıyorsanız ${http}. Kaydedin, 1–5 dk bekleyip sayfayı yenileyin.`,
            );
            setSearchStatus((s) => (s === 'loading' ? 'error' : s));
            setSearchMessage(`RefererNotAllowed — HTTP referrer listesine ekleyin: ${https} (gerekirse ${http})`);
            prevAuthFailure?.();
        };

        const g = window.google as { maps?: { places?: unknown } } | undefined;
        if (g?.maps?.places) {
            setMapsReady(true);
            return () => {
                window.gm_authFailure = prevAuthFailure;
            };
        }

        const existing = document.getElementById('google-maps-places-js');
        if (existing) {
            const t = window.setInterval(() => {
                const gg = window.google as { maps?: { places?: unknown } } | undefined;
                if (gg?.maps?.places != null) {
                    window.clearInterval(t);
                    window.clearTimeout(max);
                    setMapsReady(true);
                }
            }, 150);
            const max = window.setTimeout(() => {
                window.clearInterval(t);
                setMapsLoadError('Google Haritalar zaman aşımı. Sayfayı yenileyin.');
            }, 20000);
            return () => {
                window.clearInterval(t);
                window.clearTimeout(max);
                window.gm_authFailure = prevAuthFailure;
            };
        }

        window.__sahnebulGmapsInit = () => {
            setMapsReady(true);
            setMapsLoadError(null);
        };

        const script = document.createElement('script');
        script.id = 'google-maps-places-js';
        script.async = true;
        script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(googleMapsBrowserKey)}&v=weekly&loading=async&libraries=places&callback=__sahnebulGmapsInit`;
        script.onerror = () => {
            setMapsLoadError('Google Haritalar betiği yüklenemedi. Anahtarı ve ağ bağlantısını kontrol edin.');
        };
        document.head.appendChild(script);

        return () => {
            delete window.__sahnebulGmapsInit;
            window.gm_authFailure = prevAuthFailure;
        };
    }, [googleMapsBrowserKey]);

    const runLegacyPredictions = useCallback((q: string, google: GoogleMapsNs, clearTimer: () => void) => {
        const AutocompleteService = google?.maps?.places?.AutocompleteService;
        if (!AutocompleteService) {
            clearTimer();
            setPredictions([]);
            setSearchStatus('error');
            setSearchMessage('Places (AutocompleteService) kullanılamıyor. Tarayıcı konsolunu kontrol edin.');
            return;
        }

        const service = new AutocompleteService();
        service.getPlacePredictions(
            {
                input: q,
                componentRestrictions: { country: 'tr' },
            },
            (results: GoogleMapsNs[] | null, status: string) => {
                clearTimer();
                const St = google.maps.places.PlacesServiceStatus;
                if (status === St.OK && results && results.length > 0) {
                    const mapped = results.map((p) => ({
                        place_id: p.place_id as string,
                        main: (p.structured_formatting?.main_text as string) || (p.description as string) || '',
                        secondary: (p.structured_formatting?.secondary_text as string) || '',
                    }));
                    setPredictions(mapped);
                    setSearchStatus('idle');
                    setSearchMessage(null);
                    return;
                }

                setPredictions([]);
                if (status === St.ZERO_RESULTS || (status === St.OK && (!results || results.length === 0))) {
                    setSearchStatus('empty');
                    setSearchMessage('Sonuç bulunamadı. Farklı anahtar kelime deneyin.');
                } else {
                    setSearchStatus('error');
                    const ref = mapsReferrerAllowlistForThisSite();
                    setSearchMessage(
                        `Arama tamamlanamadı (${status}). API anahtarı ve faturalandırma; ayrıca HTTP referrer: ${ref.https} (ve gerekirse ${ref.http}).`,
                    );
                }
            },
        );
    }, []);

    const runSearch = useCallback(async () => {
        const q = query.trim();
        if (!q) {
            setSearchStatus('error');
            setSearchMessage('Arama metni girin.');
            setPredictions([]);
            return;
        }
        if (!mapsReady) {
            return;
        }

        setSearchStatus('loading');
        setSearchMessage(null);
        setPredictions([]);

        let timeoutId = window.setTimeout(() => {
            setSearchStatus('error');
            const ref = mapsReferrerAllowlistForThisSite();
            setSearchMessage(
                `Yanıt alınamadı (zaman aşımı). Google Cloud’da HTTP referrer ekleyin: ${ref.https} (gerekirse ${ref.http}).`,
            );
        }, SEARCH_TIMEOUT_MS);

        const clearTimer = () => {
            if (timeoutId !== 0) {
                window.clearTimeout(timeoutId);
                timeoutId = 0;
            }
        };

        const google = window.google as GoogleMapsNs;

        try {
            if (typeof google?.maps?.importLibrary === 'function') {
                const lib = await google.maps.importLibrary('places');
                const AutocompleteSuggestion = lib.AutocompleteSuggestion as
                    | {
                          fetchAutocompleteSuggestions: (req: GoogleMapsNs) => Promise<{ suggestions?: GoogleMapsNs[] }>;
                      }
                    | undefined;
                const AutocompleteSessionToken = lib.AutocompleteSessionToken as (new () => GoogleMapsNs) | undefined;

                if (AutocompleteSuggestion?.fetchAutocompleteSuggestions && AutocompleteSessionToken) {
                    const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
                        input: q,
                        includedRegionCodes: ['tr'],
                        language: 'tr',
                        region: 'tr',
                        sessionToken: new AutocompleteSessionToken(),
                    });

                    clearTimer();

                    const mapped: { place_id: string; main: string; secondary: string }[] = [];
                    for (const s of suggestions ?? []) {
                        const pp = s.placePrediction as
                            | {
                                  placeId?: string;
                                  mainText?: unknown;
                                  secondaryText?: unknown;
                                  text?: unknown;
                              }
                            | undefined;
                        if (!pp?.placeId) {
                            continue;
                        }
                        mapped.push({
                            place_id: pp.placeId,
                            main: textOf(pp.mainText) || textOf(pp.text),
                            secondary: textOf(pp.secondaryText),
                        });
                    }

                    if (mapped.length === 0) {
                        setPredictions([]);
                        setSearchStatus('empty');
                        setSearchMessage('Sonuç bulunamadı. Farklı anahtar kelime deneyin.');
                    } else {
                        setPredictions(mapped);
                        setSearchStatus('idle');
                        setSearchMessage(null);
                    }
                    return;
                }
            }
        } catch (e) {
            console.error(e);
        }

        runLegacyPredictions(q, google, clearTimer);
    }, [mapsReady, query, runLegacyPredictions]);

    const addPlaceById = useCallback(async (placeId: string) => {
        const google = window.google as GoogleMapsNs;
        setDetailPlaceId(placeId);

        const emit = (payload: VenueGoogleLocationApplyPayload) => {
            onApplyRef.current(payload);
        };

        let lat = 0;
        let lng = 0;
        let addr = '';
        let displayNameText = '';
        let comps: GoogleAddressComponent[] = [];
        let intlPhone: string | null = null;
        let natPhone: string | null = null;
        let websiteUrl: string | null = null;
        let mapsUrl: string | null = null;
        let editorialSummary: unknown;
        let openingHours: unknown;
        let gotNewPlace = false;

        try {
            if (typeof google?.maps?.importLibrary === 'function') {
                const lib = await google.maps.importLibrary('places');
                const Place = lib.Place as
                    | (new (opts: { id: string }) => {
                          fetchFields: (o: { fields: string[] }) => Promise<void>;
                      })
                    | undefined;

                if (Place) {
                    const place = new Place({ id: placeId });
                    const extendedFields = [
                        'displayName',
                        'formattedAddress',
                        'location',
                        'addressComponents',
                        'internationalPhoneNumber',
                        'nationalPhoneNumber',
                        'websiteURI',
                        'googleMapsUri',
                        'editorialSummary',
                        'regularOpeningHours',
                        'photos',
                    ];
                    try {
                        await place.fetchFields({ fields: extendedFields });
                    } catch {
                        try {
                            await place.fetchFields({
                                fields: ['displayName', 'formattedAddress', 'location', 'addressComponents'],
                            });
                        } catch (e2) {
                            console.error(e2);
                        }
                    }

                    const raw = place as Record<string, unknown>;
                    const loc = raw.location as GoogleMapsNs | undefined;
                    if (loc) {
                        gotNewPlace = true;
                        lat = typeof loc.lat === 'function' ? loc.lat() : (loc.lat as number);
                        lng = typeof loc.lng === 'function' ? loc.lng() : (loc.lng as number);
                        const displayNameRaw = raw.displayName;
                        displayNameText =
                            typeof displayNameRaw === 'string' ? displayNameRaw : textOf(displayNameRaw);
                        const fallback = addressRef.current;
                        addr =
                            googlePlaceFieldText(raw.formattedAddress) ||
                            googlePlaceFieldText(raw.formatted_address) ||
                            displayNameText.trim() ||
                            fallback;
                        comps = normalizeGoogleAddressComponents(raw.addressComponents);
                        const gi = googlePlaceFieldText(raw.internationalPhoneNumber);
                        const gn = googlePlaceFieldText(raw.nationalPhoneNumber);
                        intlPhone = gi || null;
                        natPhone = gn || null;
                        websiteUrl = googlePlaceFieldText(raw.websiteURI || raw.websiteUri) || null;
                        mapsUrl = googlePlaceFieldText(raw.googleMapsUri || raw.googleMapsURI) || null;
                        editorialSummary = raw.editorialSummary;
                        openingHours = raw.regularOpeningHours;
                    }
                }
            }
        } catch (e) {
            console.error(e);
        }

        const legacy = await fetchLegacyPlaceDetails(google, placeId);
        if (legacy?.geometry?.location) {
            const loc = legacy.geometry.location;
            const llat = typeof loc.lat === 'function' ? loc.lat() : loc.lat;
            const llng = typeof loc.lng === 'function' ? loc.lng() : loc.lng;
            if (!gotNewPlace) {
                lat = llat;
                lng = llng;
                addr =
                    String(legacy.formatted_address || '').trim() ||
                    String(legacy.name || '').trim() ||
                    addressRef.current;
                displayNameText = String(legacy.name || '').trim();
            }
            if (!comps.length && Array.isArray(legacy.address_components)) {
                comps = legacy.address_components as GoogleAddressComponent[];
            }
            const lp = String(legacy.international_phone_number || '').trim() || null;
            const lf = String(legacy.formatted_phone_number || '').trim() || null;
            if (!intlPhone && lp) {
                intlPhone = lp;
            }
            if (!natPhone && lf) {
                natPhone = lf;
            }
            if (!websiteUrl && legacy.website) {
                websiteUrl = String(legacy.website).trim() || null;
            }
            if (!mapsUrl && legacy.url) {
                mapsUrl = String(legacy.url).trim() || null;
            }
            if (editorialSummary == null) {
                const es = legacy.editorial_summary as { overview?: string } | string | undefined;
                editorialSummary =
                    typeof es === 'string'
                        ? es
                        : typeof es === 'object' && es?.overview != null
                          ? es.overview
                          : es;
            }
            if (openingHours == null) {
                openingHours = legacy.opening_hours;
            }
            const legacyAddr = String(legacy.formatted_address || '').trim();
            if (legacyAddr && (!addr || legacyAddr.length > addr.length)) {
                addr = legacyAddr;
            }
            if (!displayNameText.trim() && legacy.name) {
                displayNameText = String(legacy.name).trim();
            }
        }

        if (!gotNewPlace && !legacy?.geometry?.location) {
            setDetailPlaceId(null);
            setSearchMessage('Seçilen yerin ayrıntıları alınamadı. Tekrar deneyin.');
            return;
        }

        const galleryImageUrlsFromGoogle = await resolveGooglePlaceGalleryUrls(google, placeId, legacy);

        const bizName = displayNameText.trim() || undefined;
        const base = buildVenueGoogleLocationPayload({
            address: addr.trim(),
            latitude: lat,
            longitude: lng,
            placeName: bizName,
            internationalPhone: intlPhone,
            nationalPhone: natPhone,
            websiteUrl,
            mapsUrl,
            editorialSummary,
            openingHours,
            galleryImageUrlsFromGoogle,
        });

        let admin: { city_id?: string; district_id?: string; neighborhood_id?: string } = {};
        try {
            admin = await resolveTurkeyLocationFromGoogle(google, lat, lng, comps.length ? comps : null, addr);
        } catch (err) {
            console.error(err);
        }
        setDetailPlaceId(null);
        emit({
            ...base,
            ...admin,
        });
    }, []);

    const applyLink = () => {
        setLinkError(null);
        const coords = extractLatLngFromGoogleMapsUrl(linkDraft);
        if (!coords) {
            setLinkError('Bu bağlantıda koordinat bulunamadı. Haritada konuma tıklayıp “Paylaş” ile @enlem,boylam içeren linki yapıştırın.');
            return;
        }
        if (coords.lat < -90 || coords.lat > 90 || coords.lng < -180 || coords.lng > 180) {
            setLinkError('Geçersiz koordinat aralığı.');
            return;
        }
        const pasted = linkDraft.trim();
        const baseLink: VenueGoogleLocationApplyPayload = {
            address: currentAddress,
            latitude: formatCoordShort(coords.lat),
            longitude: formatCoordShort(coords.lng),
            ...(pasted && /google\.[^/]*\/maps|maps\.google|goo\.gl\/maps/i.test(pasted) ? { googleMapsUrl: pasted } : {}),
        };
        const g = window.google as GoogleMapsNs;
        void (async () => {
            let admin: { city_id?: string; district_id?: string; neighborhood_id?: string } = {};
            try {
                admin = await resolveTurkeyLocationFromGoogle(g, coords.lat, coords.lng, null, currentAddress);
            } catch (err) {
                console.error(err);
            }
            onApply({ ...baseLink, ...admin });
        })();
    };

    const tabBtn = (id: TabId, label: string) => (
        <button
            type="button"
            onClick={() => setActiveTab(id)}
            className={`rounded-lg border px-3 py-2 text-xs font-medium transition sm:text-sm ${
                activeTab === id
                    ? 'border-amber-500/50 bg-amber-500/15 text-amber-800 dark:text-amber-200'
                    : 'border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400 hover:text-zinc-900 dark:border-white/10 dark:bg-zinc-800/50 dark:text-zinc-400 dark:hover:border-white/20 dark:hover:text-zinc-200'
            }`}
        >
            {label}
        </button>
    );

    return (
        <div className="space-y-4 rounded-xl border border-amber-500/25 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/5">
            <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200/90">Konum — Google Haritalar</p>
                <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-500">
                    Listeden seçince adres, il/ilçe (eşleşirse), koordinatlar, varsa en fazla <strong className="text-zinc-400">5</strong> Google fotoğrafı galeriye, ilki kapak olarak; işletme özeti ve çalışma saatleri açıklamaya; telefon, web ve sosyal bağlantılar forma aktarılır.
                </p>
            </div>

            <div className="flex flex-wrap gap-2">
                {tabBtn('search', 'Ara ve seç')}
                {tabBtn('link', 'Harita linki')}
            </div>

            {activeTab === 'search' && (
                <div className="space-y-3">
                    {!googleMapsBrowserKey ? (
                        <p className="text-xs text-zinc-500">
                            Arama için Google Maps API anahtarı gerekir: Admin → Ayarlar → Site kimliği bölümünde (süper yönetici) veya sunucuda{' '}
                            <code className="rounded bg-zinc-200 px-1 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">GOOGLE_MAPS_API_KEY</code> (Maps JavaScript API + Places).
                        </p>
                    ) : (
                        <>
                            <div>
                                <label htmlFor="venue-google-place-query" className="block text-xs font-medium text-zinc-700 dark:text-zinc-400">
                                    İşletme veya adres ara
                                </label>
                                <div className="mt-1.5 flex flex-col gap-2 sm:flex-row sm:items-stretch">
                                    <input
                                        id="venue-google-place-query"
                                        type="search"
                                        autoComplete="off"
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                void runSearch();
                                            }
                                        }}
                                        placeholder="Örn: Jolly Joker Vadistanbul, Kadıköy pub…"
                                        className="min-w-0 flex-1 rounded-xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 placeholder:text-zinc-500 dark:border-white/10 dark:bg-zinc-800 dark:text-white dark:placeholder:text-zinc-600"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => void runSearch()}
                                        disabled={searchStatus === 'loading' || !mapsReady}
                                        className="shrink-0 rounded-xl border border-amber-500/40 bg-amber-500/20 px-4 py-3 text-sm font-semibold text-amber-800 transition hover:bg-amber-500/30 disabled:cursor-not-allowed disabled:opacity-50 dark:text-amber-200"
                                    >
                                        {searchStatus === 'loading' ? 'Aranıyor…' : 'Konumları ara'}
                                    </button>
                                </div>
                                <p className="mt-1.5 text-xs text-zinc-600 dark:text-zinc-500">
                                    İpucu: “Mekan adı + semt” veya tam adres deneyin.
                                </p>
                            </div>

                            {mapsLoadError && <p className="text-xs text-red-400">{mapsLoadError}</p>}
                            {!mapsReady && !mapsLoadError && <p className="text-xs text-zinc-600 dark:text-zinc-500">Haritalar yükleniyor…</p>}
                            {searchMessage && (
                                <p className="text-xs text-amber-800 dark:text-amber-200/80">{searchMessage}</p>
                            )}

                            {predictions.length > 0 && (
                                <div>
                                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">Arama sonuçları</p>
                                    <ul className="max-h-64 space-y-1 overflow-y-auto rounded-xl border border-zinc-200 bg-white p-1 dark:border-white/10 dark:bg-zinc-900/40">
                                        {predictions.map((p) => (
                                            <li
                                                key={p.place_id}
                                                className="flex items-start gap-2 rounded-lg border border-transparent px-2 py-2 hover:border-zinc-200 hover:bg-zinc-50 dark:hover:border-white/10 dark:hover:bg-zinc-800/60"
                                            >
                                                <span className="mt-0.5 text-zinc-500" aria-hidden>
                                                    📍
                                                </span>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-semibold text-zinc-900 dark:text-white">{p.main}</p>
                                                    {p.secondary ? (
                                                        <p className="text-xs text-zinc-500 dark:text-zinc-400">{p.secondary}</p>
                                                    ) : null}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => void addPlaceById(p.place_id)}
                                                    disabled={detailPlaceId === p.place_id}
                                                    className="shrink-0 rounded-lg border border-amber-500/40 bg-amber-500/15 px-2.5 py-1.5 text-lg font-medium leading-none text-amber-800 transition hover:bg-amber-500/25 disabled:opacity-50 dark:border-amber-500/35 dark:bg-amber-500/10 dark:text-amber-300 dark:hover:bg-amber-500/20"
                                                    title="Forma ekle"
                                                    aria-label={`${p.main} konumunu forma ekle`}
                                                >
                                                    {detailPlaceId === p.place_id ? '…' : '+'}
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            {activeTab === 'link' && (
                <div>
                    <label htmlFor="venue-google-map-link" className="block text-xs font-medium text-zinc-700 dark:text-zinc-400">
                        Google Maps bağlantısı
                    </label>
                    <div className="mt-1.5 flex flex-col gap-2 sm:flex-row sm:items-stretch">
                        <input
                            id="venue-google-map-link"
                            type="url"
                            value={linkDraft}
                            onChange={(e) => setLinkDraft(e.target.value)}
                            placeholder="https://maps.google.com/... veya goo.gl / maps.app.goo.gl ..."
                            className="min-w-0 flex-1 rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-500 dark:border-white/10 dark:bg-zinc-800 dark:text-white dark:placeholder:text-zinc-600"
                        />
                        <button
                            type="button"
                            onClick={applyLink}
                            className="shrink-0 rounded-xl border border-amber-500/40 bg-amber-500/15 px-4 py-3 text-sm font-medium text-amber-800 transition hover:bg-amber-500/25 dark:text-amber-300"
                        >
                            Koordinatları al
                        </button>
                    </div>
                    {linkError && <p className="mt-1 text-xs text-red-400">{linkError}</p>}
                </div>
            )}
        </div>
    );
}
