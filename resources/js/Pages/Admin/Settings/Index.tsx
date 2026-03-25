import AdminLayout from '@/Layouts/AdminLayout';
import RichTextEditor from '@/Components/RichTextEditor';
import SeoHead from '@/Components/SeoHead';
import { Link, router, usePage } from '@inertiajs/react';
import { FormEvent, useEffect, useMemo, useState } from 'react';

type PageErrors = Record<string, string>;

interface SitePublicProps {
    site_name: string;
    contact_email: string;
    support_email: string;
    phone: string;
    address: string;
    seo_default_description: string;
    seo_keywords: string;
    seo_twitter_handle: string;
    seo_google_site_verification: string;
    logo_url: string | null;
    favicon_url: string | null;
    seo_og_image_url: string | null;
}

interface MapsApiProps {
    key_set_in_db: boolean;
    env_has_key: boolean;
}

interface Props {
    systemStats: Record<string, number>;
    settings?: {
        footer?: string | null;
        legal_pages?: string | null;
    };
    sitePublic?: SitePublicProps;
    canManageSiteIdentity?: boolean;
    mapsApi?: MapsApiProps;
}

const LEGAL_SLUGS: { slug: string; label: string; defaultTitle: string }[] = [
    { slug: 'gizlilik-politikasi', label: 'Gizlilik politikası', defaultTitle: 'Gizlilik' },
    { slug: 'cerez-politikasi', label: 'Çerez politikası', defaultTitle: 'Çerez Politikası' },
    { slug: 'kvkk', label: 'KVKK', defaultTitle: 'Kişisel Verilerin Korunması' },
    { slug: 'ticari-elektronik-ileti', label: 'Ticari elektronik ileti', defaultTitle: 'Ticari Elektronik İleti Bilgilendirme Metni' },
    { slug: 'sss', label: 'SSS', defaultTitle: 'Sıkça Sorulan Sorular' },
];

type LegalEntry = { title: string; content: string };

function buildLegalState(raw: string | undefined | null): Record<string, LegalEntry> {
    let parsed: Record<string, unknown> = {};
    try {
        if (raw) {
            parsed = JSON.parse(raw) as Record<string, unknown>;
        }
    } catch {
        parsed = {};
    }
    const out: Record<string, LegalEntry> = {};
    for (const row of LEGAL_SLUGS) {
        const e = parsed[row.slug];
        if (e && typeof e === 'object' && e !== null) {
            const obj = e as { title?: unknown; content?: unknown };
            out[row.slug] = {
                title: typeof obj.title === 'string' ? obj.title : row.defaultTitle,
                content: typeof obj.content === 'string' ? obj.content : '',
            };
        } else {
            out[row.slug] = { title: row.defaultTitle, content: '' };
        }
    }
    return out;
}

function legalStateToJson(data: Record<string, LegalEntry>): string {
    const slim: Record<string, LegalEntry> = {};
    for (const row of LEGAL_SLUGS) {
        slim[row.slug] = data[row.slug] ?? { title: row.defaultTitle, content: '' };
    }
    return JSON.stringify(slim);
}

export default function AdminSettingsIndex({
    systemStats,
    settings,
    sitePublic,
    canManageSiteIdentity = false,
    mapsApi,
}: Readonly<Props>) {
    const page = usePage();
    const { auth, errors: pageErrors } = page.props as {
        auth?: { is_super_admin?: boolean };
        errors?: PageErrors;
    };
    const errors = pageErrors ?? {};
    const superAdmin = canManageSiteIdentity || auth?.is_super_admin === true;

    const sp = sitePublic;
    const [footer, setFooter] = useState(settings?.footer ?? '');
    const [legalBySlug, setLegalBySlug] = useState(() => buildLegalState(settings?.legal_pages));
    const [legalSlug, setLegalSlug] = useState(LEGAL_SLUGS[0].slug);

    const [siteName, setSiteName] = useState(sp?.site_name ?? '');
    const [contactEmail, setContactEmail] = useState(sp?.contact_email ?? '');
    const [supportEmail, setSupportEmail] = useState(sp?.support_email ?? '');
    const [phone, setPhone] = useState(sp?.phone ?? '');
    const [address, setAddress] = useState(sp?.address ?? '');
    const [seoDesc, setSeoDesc] = useState(sp?.seo_default_description ?? '');
    const [seoKeywords, setSeoKeywords] = useState(sp?.seo_keywords ?? '');
    const [seoTwitter, setSeoTwitter] = useState(sp?.seo_twitter_handle ?? '');
    const [seoGoogle, setSeoGoogle] = useState(sp?.seo_google_site_verification ?? '');
    const [removeLogo, setRemoveLogo] = useState(false);
    const [removeFavicon, setRemoveFavicon] = useState(false);
    const [removeOg, setRemoveOg] = useState(false);
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [faviconFile, setFaviconFile] = useState<File | null>(null);
    const [ogFile, setOgFile] = useState<File | null>(null);
    const [mapsApiKeyInput, setMapsApiKeyInput] = useState('');
    const [removeMapsKey, setRemoveMapsKey] = useState(false);
    const [siteFormBusy, setSiteFormBusy] = useState(false);

    useEffect(() => {
        setFooter(settings?.footer ?? '');
        setLegalBySlug(buildLegalState(settings?.legal_pages));
    }, [settings?.footer, settings?.legal_pages]);

    /** Sunucudaki sitePublic yalnızca gerçekten değişince senkronize et (nesne referansına bağlanma — her Inertia yanıtında formu sıfırlıyordu). */
    useEffect(() => {
        if (!sp) return;
        setSiteName(sp.site_name ?? '');
        setContactEmail(sp.contact_email ?? '');
        setSupportEmail(sp.support_email ?? '');
        setPhone(sp.phone ?? '');
        setAddress(sp.address ?? '');
        setSeoDesc(sp.seo_default_description ?? '');
        setSeoKeywords(sp.seo_keywords ?? '');
        setSeoTwitter(sp.seo_twitter_handle ?? '');
        setSeoGoogle(sp.seo_google_site_verification ?? '');
        setRemoveLogo(false);
        setRemoveFavicon(false);
        setRemoveOg(false);
        setLogoFile(null);
        setFaviconFile(null);
        setOgFile(null);
    }, [
        sp?.site_name,
        sp?.contact_email,
        sp?.support_email,
        sp?.phone,
        sp?.address,
        sp?.seo_default_description,
        sp?.seo_keywords,
        sp?.seo_twitter_handle,
        sp?.seo_google_site_verification,
        sp?.logo_url,
        sp?.favicon_url,
        sp?.seo_og_image_url,
    ]);

    const legalPagesJson = useMemo(() => legalStateToJson(legalBySlug), [legalBySlug]);
    const currentLegal = legalBySlug[legalSlug] ?? { title: '', content: '' };

    const setLegalTitle = (title: string) => {
        setLegalBySlug((prev) => ({
            ...prev,
            [legalSlug]: { ...prev[legalSlug], title },
        }));
    };

    const setLegalContent = (content: string) => {
        setLegalBySlug((prev) => ({
            ...prev,
            [legalSlug]: { ...prev[legalSlug], content },
        }));
    };

    const saveSettings = () => {
        router.post(route('admin.settings.update'), {
            footer,
            legal_pages: legalPagesJson,
        });
    };

    const submitSite = (e: FormEvent) => {
        e.preventDefault();
        if (!superAdmin) return;
        const fd = new FormData();
        fd.append('site_name', siteName);
        fd.append('contact_email', contactEmail);
        fd.append('support_email', supportEmail);
        fd.append('phone', phone);
        fd.append('address', address);
        fd.append('seo_default_description', seoDesc);
        fd.append('seo_keywords', seoKeywords);
        fd.append('seo_twitter_handle', seoTwitter);
        fd.append('seo_google_site_verification', seoGoogle);
        if (removeLogo) fd.append('remove_logo', '1');
        if (removeFavicon) fd.append('remove_favicon', '1');
        if (removeOg) fd.append('remove_seo_og_image', '1');
        if (logoFile) fd.append('logo', logoFile);
        if (faviconFile) fd.append('favicon', faviconFile);
        if (ogFile) fd.append('seo_og_image', ogFile);
        if (removeMapsKey) fd.append('remove_google_maps_api_key', '1');
        if (mapsApiKeyInput.trim() !== '') fd.append('google_maps_api_key', mapsApiKeyInput.trim());
        router.post(route('admin.settings.site'), fd, {
            forceFormData: true,
            preserveScroll: true,
            onStart: () => setSiteFormBusy(true),
            onFinish: () => setSiteFormBusy(false),
            onSuccess: () => {
                setMapsApiKeyInput('');
                setRemoveMapsKey(false);
            },
        });
    };

    const siteFormErrorList = useMemo(() => {
        const keys = [
            'site_name',
            'contact_email',
            'support_email',
            'phone',
            'address',
            'seo_default_description',
            'seo_keywords',
            'seo_twitter_handle',
            'seo_google_site_verification',
            'logo',
            'favicon',
            'seo_og_image',
            'google_maps_api_key',
            'remove_google_maps_api_key',
        ];
        return keys.map((k) => errors[k]).filter((m): m is string => typeof m === 'string' && m.trim() !== '');
    }, [errors]);

    const inputClass =
        'mt-1 w-full max-w-xl rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white disabled:cursor-not-allowed disabled:opacity-60';
    const labelClass = 'block text-sm font-medium text-zinc-400';

    return (
        <AdminLayout>
            <SeoHead title="Ayarlar - Admin | Sahnebul" description="Site ayarları ve içerik blokları." noindex />

            <div className="space-y-6">
                <h1 className="mb-8 text-2xl font-bold text-white">Sistem Ayarları</h1>

                <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
                        <p className="text-sm text-zinc-500">Toplam Kullanıcı</p>
                        <p className="text-2xl font-bold text-white">{systemStats.total_users}</p>
                    </div>
                    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
                        <p className="text-sm text-zinc-500">Toplam Sahne</p>
                        <p className="text-2xl font-bold text-white">{systemStats.total_venues}</p>
                    </div>
                    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
                        <p className="text-sm text-zinc-500">Kategori Sayısı</p>
                        <p className="text-2xl font-bold text-white">{systemStats.categories_count}</p>
                    </div>
                    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
                        <p className="text-sm text-zinc-500">Şehir Sayısı</p>
                        <p className="text-2xl font-bold text-white">{systemStats.cities_count}</p>
                    </div>
                </div>

                <form onSubmit={submitSite} className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
                    {siteFormErrorList.length > 0 && (
                        <div
                            className="mb-4 rounded-lg border border-rose-500/50 bg-rose-950/40 px-4 py-3 text-sm text-rose-100"
                            role="alert"
                        >
                            <p className="font-semibold text-rose-200">Kayıt yapılamadı — lütfen alanları kontrol edin:</p>
                            <ul className="mt-2 list-inside list-disc space-y-1 text-rose-100/95">
                                {siteFormErrorList.map((msg, i) => (
                                    <li key={`${i}-${msg.slice(0, 40)}`}>{msg}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                    <h2 className="font-semibold text-white">Site kimliği, SEO ve iletişim</h2>
                    <p className="mt-2 text-sm text-zinc-400">
                        Logo, favicon, site adı, varsayılan meta açıklaması, iletişim ve destek e-postaları. Bu alanları{' '}
                        <span className="font-medium text-zinc-300">yalnızca süper yönetici</span> düzenleyebilir. Üst menü ve footer
                        marka / iletişim bilgileri buradan güncellenir.
                    </p>
                    {!superAdmin && (
                        <p className="mt-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
                            Hesabınız süper yönetici değil; bu bölüm salt okunurdur.
                        </p>
                    )}
                    {superAdmin && (
                        <p className="mt-3 text-sm text-zinc-500">
                            Giden posta sunucusu (SMTP) için{' '}
                            <Link href={route('admin.smtp.index')} className="font-medium text-amber-400 hover:underline">
                                SMTP / E-posta
                            </Link>{' '}
                            sayfasını kullanın.
                        </p>
                    )}

                    <fieldset disabled={!superAdmin} className="mt-6 space-y-5 border-0 p-0">
                        <div>
                            <span className={labelClass}>Site logosu</span>
                            {sp?.logo_url && !removeLogo && (
                                <p className="mt-2 text-xs text-zinc-500">
                                    Mevcut:{' '}
                                    <a href={sp.logo_url} className="text-amber-400 hover:underline" target="_blank" rel="noreferrer">
                                        görüntüle
                                    </a>
                                </p>
                            )}
                            <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp,image/svg+xml"
                                className="mt-2 block w-full max-w-xl text-sm text-zinc-300 file:mr-3 file:rounded file:border-0 file:bg-amber-500 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-zinc-950"
                                onChange={(ev) => setLogoFile(ev.target.files?.[0] ?? null)}
                            />
                            {sp?.logo_url && (
                                <label className="mt-2 flex items-center gap-2 text-sm text-zinc-400">
                                    <input type="checkbox" checked={removeLogo} onChange={(e) => setRemoveLogo(e.target.checked)} />
                                    Logoyu kaldır
                                </label>
                            )}
                        </div>

                        <div>
                            <span className={labelClass}>Favicon</span>
                            {sp?.favicon_url && !removeFavicon && (
                                <p className="mt-2 text-xs text-zinc-500">
                                    Mevcut:{' '}
                                    <a href={sp.favicon_url} className="text-amber-400 hover:underline" target="_blank" rel="noreferrer">
                                        görüntüle
                                    </a>
                                </p>
                            )}
                            <input
                                type="file"
                                accept=".ico,image/png,image/jpeg,image/webp,image/svg+xml"
                                className="mt-2 block w-full max-w-xl text-sm text-zinc-300 file:mr-3 file:rounded file:border-0 file:bg-amber-500 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-zinc-950"
                                onChange={(ev) => setFaviconFile(ev.target.files?.[0] ?? null)}
                            />
                            {sp?.favicon_url && (
                                <label className="mt-2 flex items-center gap-2 text-sm text-zinc-400">
                                    <input type="checkbox" checked={removeFavicon} onChange={(e) => setRemoveFavicon(e.target.checked)} />
                                    Favicon’u kaldır
                                </label>
                            )}
                        </div>

                        <div>
                            <label htmlFor="site-name" className={labelClass}>
                                Site adı
                            </label>
                            <input
                                id="site-name"
                                value={siteName}
                                onChange={(e) => setSiteName(e.target.value)}
                                placeholder="Örn. Sahnebul"
                                className={inputClass}
                            />
                            <p className="mt-1 text-xs text-zinc-500">Üst bar, sekme başlığı son eki ve footer marka adı için kullanılır.</p>
                        </div>

                        <div className="border-t border-zinc-800 pt-5">
                            <h3 className="text-sm font-semibold text-zinc-300">SEO</h3>
                            <div className="mt-4 space-y-4">
                                <div>
                                    <label htmlFor="seo-desc" className={labelClass}>
                                        Varsayılan meta açıklama
                                    </label>
                                    <textarea
                                        id="seo-desc"
                                        value={seoDesc}
                                        onChange={(e) => setSeoDesc(e.target.value)}
                                        rows={3}
                                        className={inputClass}
                                        placeholder="Arama ve sosyal önizleme için kısa site özeti (yaklaşık 160 karakter)."
                                    />
                                </div>
                                <div>
                                    <label htmlFor="seo-kw" className={labelClass}>
                                        Anahtar kelimeler
                                    </label>
                                    <input
                                        id="seo-kw"
                                        value={seoKeywords}
                                        onChange={(e) => setSeoKeywords(e.target.value)}
                                        className={inputClass}
                                        placeholder="virgülle ayırın"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="seo-og" className={labelClass}>
                                        Varsayılan OG / paylaşım görseli
                                    </label>
                                    {sp?.seo_og_image_url && !removeOg && (
                                        <p className="mt-2 text-xs text-zinc-500">
                                            Mevcut:{' '}
                                            <a href={sp.seo_og_image_url} className="text-amber-400 hover:underline" target="_blank" rel="noreferrer">
                                                görüntüle
                                            </a>
                                        </p>
                                    )}
                                    <input
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp"
                                        className="mt-2 block w-full max-w-xl text-sm text-zinc-300 file:mr-3 file:rounded file:border-0 file:bg-amber-500 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-zinc-950"
                                        onChange={(ev) => setOgFile(ev.target.files?.[0] ?? null)}
                                    />
                                    {sp?.seo_og_image_url && (
                                        <label className="mt-2 flex items-center gap-2 text-sm text-zinc-400">
                                            <input type="checkbox" checked={removeOg} onChange={(e) => setRemoveOg(e.target.checked)} />
                                            OG görselini kaldır (varsayılan site görseline dönülür)
                                        </label>
                                    )}
                                </div>
                                <div>
                                    <label htmlFor="seo-tw" className={labelClass}>
                                        Twitter / X kullanıcı adı
                                    </label>
                                    <input
                                        id="seo-tw"
                                        value={seoTwitter}
                                        onChange={(e) => setSeoTwitter(e.target.value)}
                                        className={inputClass}
                                        placeholder="@hesap veya hesap"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="seo-g" className={labelClass}>
                                        Google Search Console doğrulama
                                    </label>
                                    <input
                                        id="seo-g"
                                        value={seoGoogle}
                                        onChange={(e) => setSeoGoogle(e.target.value)}
                                        className={inputClass}
                                        placeholder="meta içerik değeri"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-zinc-800 pt-5">
                            <h3 className="text-sm font-semibold text-zinc-300">İletişim ve e-posta (yayın)</h3>
                            <p className="mt-1 text-xs text-zinc-500">
                                Footer ve genel iletişim metinlerinde gösterilir. Gönderim sunucusu SMTP sayfasındadır.
                            </p>
                            <div className="mt-4 grid gap-4 sm:max-w-xl">
                                <div>
                                    <label htmlFor="c-email" className={labelClass}>
                                        İletişim e-postası
                                    </label>
                                    <input
                                        id="c-email"
                                        type="email"
                                        value={contactEmail}
                                        onChange={(e) => setContactEmail(e.target.value)}
                                        className={inputClass}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="s-email" className={labelClass}>
                                        Destek e-postası
                                    </label>
                                    <input
                                        id="s-email"
                                        type="email"
                                        value={supportEmail}
                                        onChange={(e) => setSupportEmail(e.target.value)}
                                        className={inputClass}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="c-phone" className={labelClass}>
                                        Telefon
                                    </label>
                                    <input id="c-phone" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
                                </div>
                                <div>
                                    <label htmlFor="c-addr" className={labelClass}>
                                        Adres
                                    </label>
                                    <textarea id="c-addr" value={address} onChange={(e) => setAddress(e.target.value)} rows={2} className={inputClass} />
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-zinc-800 pt-5">
                            <h3 className="text-sm font-semibold text-zinc-300">Google Maps (mekan adresi)</h3>
                            <p className="mt-1 text-xs text-zinc-500">
                                Yönetici ve sanatçı mekan formlarında Places otomatik tamamlama için. Maps JavaScript API ve Places açık olmalı; anahtarı
                                HTTP referrer kısıtlarıyla koruyun.
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2 text-xs">
                                {mapsApi?.key_set_in_db ? (
                                    <span className="rounded bg-emerald-500/15 px-2 py-0.5 text-emerald-300">Veritabanında kayıtlı anahtar var</span>
                                ) : (
                                    <span className="rounded bg-zinc-800 px-2 py-0.5 text-zinc-400">Veritabanında anahtar yok</span>
                                )}
                                {mapsApi?.env_has_key ? (
                                    <span className="rounded bg-zinc-800 px-2 py-0.5 text-zinc-400">.env: GOOGLE_MAPS_API_KEY tanımlı</span>
                                ) : null}
                            </div>
                            <p className="mt-2 text-xs text-amber-200/90">Buraya yazılan anahtar, .env içindeki değerin üzerindedir.</p>
                            <div className="mt-4 sm:max-w-xl">
                                <label htmlFor="gmaps-key" className={labelClass}>
                                    API anahtarı
                                </label>
                                <input
                                    id="gmaps-key"
                                    type="password"
                                    autoComplete="off"
                                    value={mapsApiKeyInput}
                                    onChange={(e) => setMapsApiKeyInput(e.target.value)}
                                    className={inputClass}
                                    placeholder={mapsApi?.key_set_in_db ? 'Değiştirmek için yeni anahtar yazın' : 'AIza…'}
                                />
                                <p className="mt-1 text-xs text-zinc-500">Boş bırakırsanız mevcut veritabanı anahtarı değişmez.</p>
                                {mapsApi?.key_set_in_db ? (
                                    <label className="mt-3 flex items-center gap-2 text-sm text-zinc-400">
                                        <input
                                            type="checkbox"
                                            checked={removeMapsKey}
                                            onChange={(e) => {
                                                setRemoveMapsKey(e.target.checked);
                                                if (e.target.checked) setMapsApiKeyInput('');
                                            }}
                                        />
                                        Veritabanındaki anahtarı sil (.env tanımlıysa o kullanılır)
                                    </label>
                                ) : null}
                            </div>
                        </div>
                    </fieldset>

                    {superAdmin && (
                        <button
                            type="submit"
                            disabled={siteFormBusy}
                            className="mt-6 rounded bg-amber-500 px-4 py-2 font-semibold text-zinc-950 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {siteFormBusy ? 'Kaydediliyor…' : 'Site / SEO / iletişim kaydet'}
                        </button>
                    )}
                </form>

                <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
                    <h2 className="mb-4 font-semibold text-white">Platform içerikleri</h2>
                    <p className="text-sm text-zinc-400">
                        Footer JSON ve yasal sayfalar tüm yöneticiler tarafından düzenlenebilir. Reklamlar için{' '}
                        <Link href={route('admin.ad-slots.index')} className="font-medium text-amber-400 hover:underline">
                            Reklam alanları
                        </Link>
                        .
                    </p>
                </div>

                <div className="mt-6 rounded-lg border border-zinc-800 bg-zinc-900 p-6">
                    <h2 className="mb-3 font-semibold text-white">Yasal sayfalar (zengin metin)</h2>
                    <p className="mb-4 text-sm text-zinc-500">
                        Aşağıdaki sayfalar <code className="text-amber-400/90">/sayfalar/…</code> adreslerinde yayınlanır. İçerik HTML olarak kaydedilir.
                    </p>
                    <div className="mb-4">
                        <label htmlFor="legal-slug" className="block text-sm font-medium text-zinc-400">
                            Sayfa
                        </label>
                        <select
                            id="legal-slug"
                            value={legalSlug}
                            onChange={(e) => setLegalSlug(e.target.value)}
                            className="mt-1 w-full max-w-md rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                        >
                            {LEGAL_SLUGS.map((row) => (
                                <option key={row.slug} value={row.slug}>
                                    {row.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="mb-4">
                        <label htmlFor="legal-title" className="block text-sm font-medium text-zinc-400">
                            Sayfa başlığı
                        </label>
                        <input
                            id="legal-title"
                            value={currentLegal.title}
                            onChange={(e) => setLegalTitle(e.target.value)}
                            className="mt-1 w-full max-w-xl rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                        />
                    </div>
                    <div>
                        <span className="block text-sm font-medium text-zinc-400">İçerik</span>
                        <RichTextEditor
                            key={legalSlug}
                            value={currentLegal.content}
                            onChange={setLegalContent}
                            placeholder="Yasal metin…"
                            className="mt-2"
                        />
                    </div>
                    <details className="mt-4 rounded-lg border border-zinc-700/80 bg-zinc-950/50 p-3">
                        <summary className="cursor-pointer text-sm text-zinc-400">Ham JSON (yasal sayfalar)</summary>
                        <textarea
                            readOnly
                            rows={8}
                            value={legalPagesJson}
                            className="mt-2 w-full rounded bg-zinc-900 px-3 py-2 font-mono text-xs text-zinc-400"
                        />
                    </details>

                    <h2 className="mb-3 mt-8 font-semibold text-white">Footer JSON</h2>
                    <textarea value={footer} onChange={(e) => setFooter(e.target.value)} rows={10} className="w-full rounded bg-zinc-800 px-3 py-2 text-sm text-white" />

                    <button type="button" onClick={saveSettings} className="mt-6 rounded bg-amber-500 px-4 py-2 font-semibold text-zinc-950">
                        Footer ve yasal sayfaları kaydet
                    </button>
                </div>
            </div>
        </AdminLayout>
    );
}
