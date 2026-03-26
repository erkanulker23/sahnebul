import AdminLayout from '@/Layouts/AdminLayout';
import RichTextEditor from '@/Components/RichTextEditor';
import SeoHead from '@/Components/SeoHead';
import { cn } from '@/lib/cn';
import { Link, router, usePage } from '@inertiajs/react';
import {
    BarChart3,
    FileText,
    ImageIcon,
    MapPin,
    Search,
    Share2,
    type LucideIcon,
} from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';

type PageErrors = Record<string, string>;

interface SiteSocialLinks {
    instagram: string;
    facebook: string;
    twitter: string;
    youtube: string;
    linkedin: string;
    tiktok: string;
}

interface SitePublicProps {
    site_name: string;
    contact_email: string;
    support_email: string;
    phone: string;
    address: string;
    social_links: SiteSocialLinks;
    seo_default_description: string;
    seo_keywords: string;
    seo_twitter_handle: string;
    seo_google_site_verification: string;
    logo_url: string | null;
    favicon_url: string | null;
    seo_og_image_url: string | null;
    /** Ana sayfa (/) hero arka planı */
    home_hero_url: string | null;
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

type SettingsTabId = 'overview' | 'brand' | 'seo' | 'contact' | 'maps' | 'content';

const TABS: { id: SettingsTabId; label: string; description: string; icon: LucideIcon }[] = [
    { id: 'overview', label: 'Özet', description: 'Sayılar ve kısayollar', icon: BarChart3 },
    { id: 'brand', label: 'Marka & görseller', description: 'Logo, favicon, banner, site adı', icon: ImageIcon },
    { id: 'seo', label: 'SEO', description: 'Meta, OG, doğrulama', icon: Search },
    { id: 'contact', label: 'İletişim & sosyal', description: 'E-posta, telefon, sosyal bağlantılar', icon: Share2 },
    { id: 'maps', label: 'Harita API', description: 'Google Maps anahtarı', icon: MapPin },
    { id: 'content', label: 'İçerik', description: 'Yasal sayfalar ve footer', icon: FileText },
];

const SITE_FORM_TABS: SettingsTabId[] = ['brand', 'seo', 'contact', 'maps'];

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

    const [activeTab, setActiveTab] = useState<SettingsTabId>('overview');

    const sp = sitePublic;
    const [footer, setFooter] = useState(settings?.footer ?? '');
    const [legalBySlug, setLegalBySlug] = useState(() => buildLegalState(settings?.legal_pages));
    const [legalSlug, setLegalSlug] = useState(LEGAL_SLUGS[0].slug);

    const [siteName, setSiteName] = useState(sp?.site_name ?? '');
    const [contactEmail, setContactEmail] = useState(sp?.contact_email ?? '');
    const [supportEmail, setSupportEmail] = useState(sp?.support_email ?? '');
    const [phone, setPhone] = useState(sp?.phone ?? '');
    const [address, setAddress] = useState(sp?.address ?? '');
    const [socialInstagram, setSocialInstagram] = useState(sp?.social_links?.instagram ?? '');
    const [socialFacebook, setSocialFacebook] = useState(sp?.social_links?.facebook ?? '');
    const [socialTwitter, setSocialTwitter] = useState(sp?.social_links?.twitter ?? '');
    const [socialYoutube, setSocialYoutube] = useState(sp?.social_links?.youtube ?? '');
    const [socialLinkedin, setSocialLinkedin] = useState(sp?.social_links?.linkedin ?? '');
    const [socialTiktok, setSocialTiktok] = useState(sp?.social_links?.tiktok ?? '');
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
    const [removeHomeHero, setRemoveHomeHero] = useState(false);
    const [homeHeroFile, setHomeHeroFile] = useState<File | null>(null);
    const [mapsApiKeyInput, setMapsApiKeyInput] = useState('');
    const [removeMapsKey, setRemoveMapsKey] = useState(false);
    const [siteFormBusy, setSiteFormBusy] = useState(false);

    useEffect(() => {
        setFooter(settings?.footer ?? '');
        setLegalBySlug(buildLegalState(settings?.legal_pages));
    }, [settings?.footer, settings?.legal_pages]);

    useEffect(() => {
        if (!sp) return;
        setSiteName(sp.site_name ?? '');
        setContactEmail(sp.contact_email ?? '');
        setSupportEmail(sp.support_email ?? '');
        setPhone(sp.phone ?? '');
        setAddress(sp.address ?? '');
        setSocialInstagram(sp.social_links?.instagram ?? '');
        setSocialFacebook(sp.social_links?.facebook ?? '');
        setSocialTwitter(sp.social_links?.twitter ?? '');
        setSocialYoutube(sp.social_links?.youtube ?? '');
        setSocialLinkedin(sp.social_links?.linkedin ?? '');
        setSocialTiktok(sp.social_links?.tiktok ?? '');
        setSeoDesc(sp.seo_default_description ?? '');
        setSeoKeywords(sp.seo_keywords ?? '');
        setSeoTwitter(sp.seo_twitter_handle ?? '');
        setSeoGoogle(sp.seo_google_site_verification ?? '');
        setRemoveLogo(false);
        setRemoveFavicon(false);
        setRemoveOg(false);
        setRemoveHomeHero(false);
        setLogoFile(null);
        setFaviconFile(null);
        setOgFile(null);
        setHomeHeroFile(null);
    }, [
        sp?.site_name,
        sp?.contact_email,
        sp?.support_email,
        sp?.phone,
        sp?.address,
        sp?.social_links?.instagram,
        sp?.social_links?.facebook,
        sp?.social_links?.twitter,
        sp?.social_links?.youtube,
        sp?.social_links?.linkedin,
        sp?.social_links?.tiktok,
        sp?.seo_default_description,
        sp?.seo_keywords,
        sp?.seo_twitter_handle,
        sp?.seo_google_site_verification,
        sp?.logo_url,
        sp?.favicon_url,
        sp?.seo_og_image_url,
        sp?.home_hero_url,
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
        fd.append('social_instagram', socialInstagram);
        fd.append('social_facebook', socialFacebook);
        fd.append('social_twitter', socialTwitter);
        fd.append('social_youtube', socialYoutube);
        fd.append('social_linkedin', socialLinkedin);
        fd.append('social_tiktok', socialTiktok);
        fd.append('seo_default_description', seoDesc);
        fd.append('seo_keywords', seoKeywords);
        fd.append('seo_twitter_handle', seoTwitter);
        fd.append('seo_google_site_verification', seoGoogle);
        if (removeLogo) fd.append('remove_logo', '1');
        if (removeFavicon) fd.append('remove_favicon', '1');
        if (removeOg) fd.append('remove_seo_og_image', '1');
        if (removeHomeHero) fd.append('remove_home_hero', '1');
        if (logoFile) fd.append('logo', logoFile);
        if (faviconFile) fd.append('favicon', faviconFile);
        if (ogFile) fd.append('seo_og_image', ogFile);
        if (homeHeroFile) fd.append('home_hero', homeHeroFile);
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
            'home_hero',
            'google_maps_api_key',
            'remove_google_maps_api_key',
            'social_instagram',
            'social_facebook',
            'social_twitter',
            'social_youtube',
            'social_linkedin',
            'social_tiktok',
        ];
        return keys.map((k) => errors[k]).filter((m): m is string => typeof m === 'string' && m.trim() !== '');
    }, [errors]);

    const inputClass =
        'mt-1 w-full max-w-xl rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white disabled:cursor-not-allowed disabled:opacity-60';
    const labelClass = 'block text-sm font-medium text-zinc-400';

    const showSiteFormSave = superAdmin && SITE_FORM_TABS.includes(activeTab);

    return (
        <AdminLayout>
            <SeoHead title="Ayarlar - Admin | Sahnebul" description="Site ayarları ve içerik blokları." noindex />

            <div className="space-y-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Sistem ayarları</h1>
                        <p className="mt-1 text-sm text-zinc-500">
                            Sekmelerden ilgili bölüme geçin. Site kimliği ve harita ayarlarını yalnızca süper yönetici kaydedebilir.
                        </p>
                    </div>
                    <Link
                        href={route('admin.seo-tools.index')}
                        className="inline-flex items-center gap-2 self-start rounded-lg border border-zinc-600 bg-zinc-800/80 px-3 py-2 text-sm text-zinc-200 transition hover:border-amber-500/40 hover:text-white"
                    >
                        <Search className="h-4 w-4 text-amber-400" />
                        SEO / site haritası
                    </Link>
                </div>

                {/* Sekmeler */}
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-2">
                    <div
                        role="tablist"
                        aria-label="Ayarlar bölümleri"
                        className="flex gap-1 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                    >
                        {TABS.map(({ id, label, icon: Icon }) => {
                            const selected = activeTab === id;
                            return (
                                <button
                                    key={id}
                                    type="button"
                                    role="tab"
                                    aria-selected={selected}
                                    id={`settings-tab-${id}`}
                                    aria-controls={`settings-panel-${id}`}
                                    onClick={() => setActiveTab(id)}
                                    className={cn(
                                        'flex shrink-0 items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition',
                                        selected
                                            ? 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/40'
                                            : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200',
                                    )}
                                >
                                    <Icon className={cn('h-4 w-4 shrink-0', selected ? 'text-amber-400' : 'text-zinc-500')} />
                                    <span className="whitespace-nowrap">{label}</span>
                                </button>
                            );
                        })}
                    </div>
                    <p className="mt-2 border-t border-zinc-800/80 px-1 pt-2 text-xs text-zinc-500">
                        {TABS.find((t) => t.id === activeTab)?.description}
                    </p>
                </div>

                {/* Özet */}
                <section
                    id="settings-panel-overview"
                    role="tabpanel"
                    aria-labelledby="settings-tab-overview"
                    hidden={activeTab !== 'overview'}
                    className="rounded-xl border border-zinc-800 bg-zinc-900 p-6"
                >
                    <h2 className="sr-only">Özet</h2>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-5">
                            <p className="text-sm text-zinc-500">Toplam kullanıcı</p>
                            <p className="mt-1 text-2xl font-bold text-white">{systemStats.total_users}</p>
                        </div>
                        <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-5">
                            <p className="text-sm text-zinc-500">Toplam mekan</p>
                            <p className="mt-1 text-2xl font-bold text-white">{systemStats.total_venues}</p>
                        </div>
                        <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-5">
                            <p className="text-sm text-zinc-500">Kategori sayısı</p>
                            <p className="mt-1 text-2xl font-bold text-white">{systemStats.categories_count}</p>
                        </div>
                        <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-5">
                            <p className="text-sm text-zinc-500">Şehir sayısı</p>
                            <p className="mt-1 text-2xl font-bold text-white">{systemStats.cities_count}</p>
                        </div>
                    </div>
                    <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <Link
                            href={route('admin.smtp.index')}
                            className="rounded-lg border border-zinc-700 bg-zinc-950/40 px-4 py-3 text-sm text-zinc-200 transition hover:border-amber-500/30 hover:text-white"
                        >
                            <span className="font-medium text-amber-400">SMTP / E-posta</span>
                            <span className="mt-1 block text-xs text-zinc-500">Giden posta sunucusu (süper yönetici)</span>
                        </Link>
                        <Link
                            href={route('admin.ad-slots.index')}
                            className="rounded-lg border border-zinc-700 bg-zinc-950/40 px-4 py-3 text-sm text-zinc-200 transition hover:border-amber-500/30 hover:text-white"
                        >
                            <span className="font-medium text-amber-400">Reklam alanları</span>
                            <span className="mt-1 block text-xs text-zinc-500">Banner ve yerleşimler</span>
                        </Link>
                        <Link
                            href={route('admin.seo-tools.index')}
                            className="rounded-lg border border-zinc-700 bg-zinc-950/40 px-4 py-3 text-sm text-zinc-200 transition hover:border-amber-500/30 hover:text-white"
                        >
                            <span className="font-medium text-amber-400">SEO / site haritası</span>
                            <span className="mt-1 block text-xs text-zinc-500">Search Console ve sitemap.xml</span>
                        </Link>
                    </div>
                </section>

                {/* Site formu: marka, SEO, iletişim, harita — alanlar DOM’da kalır (dosya seçimleri korunur) */}
                <form
                    onSubmit={submitSite}
                    className="rounded-xl border border-zinc-800 bg-zinc-900 p-6"
                    hidden={!SITE_FORM_TABS.includes(activeTab)}
                >
                    <h2 className="sr-only">Site ve süper yönetici ayarları</h2>

                    {siteFormErrorList.length > 0 && (
                        <div
                            className="mb-6 rounded-lg border border-rose-500/50 bg-rose-950/40 px-4 py-3 text-sm text-rose-100"
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

                    {!superAdmin && (
                        <p className="mb-6 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
                            Hesabınız süper yönetici değil; aşağıdaki alanlar salt okunurdur.
                        </p>
                    )}

                    {superAdmin && (
                        <p className="mb-6 text-sm text-zinc-500">
                            Giden posta için{' '}
                            <Link href={route('admin.smtp.index')} className="font-medium text-amber-400 hover:underline">
                                SMTP / E-posta
                            </Link>{' '}
                            sayfasını kullanın.
                        </p>
                    )}

                    <fieldset disabled={!superAdmin} className="min-h-0 border-0 p-0">
                        {/* Marka */}
                        <div
                            id="settings-panel-brand"
                            role="tabpanel"
                            aria-labelledby="settings-tab-brand"
                            hidden={activeTab !== 'brand'}
                            className="space-y-5"
                        >
                            <h3 className="text-lg font-semibold text-white">Marka ve görseller</h3>
                            <p className="text-sm text-zinc-400">
                                Logo, favicon, ana sayfa banner’ı ve sitede görünen marka adı. Üst çubuk ve footer bu bilgilerle güncellenir.
                            </p>

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
                                <span className={labelClass}>Ana sayfa banner (hero)</span>
                                <p className="mt-1 max-w-xl text-xs text-zinc-500">
                                    Yalnızca ana sayfa (
                                    <code className="rounded bg-zinc-800 px-1 text-zinc-300">/</code>) üst bölümü. Öneri: geniş yatay (ör. 21:9), en
                                    fazla 6 MB, JPEG/PNG/WebP.
                                </p>
                                {sp?.home_hero_url && !removeHomeHero && (
                                    <div className="mt-3 max-w-xl overflow-hidden rounded-lg border border-zinc-700">
                                        <img
                                            src={sp.home_hero_url}
                                            alt="Mevcut ana sayfa banner önizlemesi"
                                            className="max-h-40 w-full object-cover object-center"
                                        />
                                    </div>
                                )}
                                <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    className="mt-2 block w-full max-w-xl text-sm text-zinc-300 file:mr-3 file:rounded file:border-0 file:bg-amber-500 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-zinc-950"
                                    onChange={(ev) => setHomeHeroFile(ev.target.files?.[0] ?? null)}
                                />
                                {sp?.home_hero_url && (
                                    <label className="mt-2 flex items-center gap-2 text-sm text-zinc-400">
                                        <input type="checkbox" checked={removeHomeHero} onChange={(e) => setRemoveHomeHero(e.target.checked)} />
                                        Banner’ı kaldır
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
                                <p className="mt-1 text-xs text-zinc-500">Sekme başlığı son eki, üst bar ve footer marka adı.</p>
                            </div>
                        </div>

                        {/* SEO */}
                        <div
                            id="settings-panel-seo"
                            role="tabpanel"
                            aria-labelledby="settings-tab-seo"
                            hidden={activeTab !== 'seo'}
                            className="space-y-4"
                        >
                            <h3 className="text-lg font-semibold text-white">Arama ve paylaşım (SEO)</h3>
                            <p className="text-sm text-zinc-400">
                                Varsayılan meta açıklama, anahtar kelimeler, sosyal önizleme görseli ve arama konsolu doğrulaması.
                            </p>

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
                                    placeholder="Virgülle ayırın"
                                />
                            </div>
                            <div>
                                <label htmlFor="seo-og" className={labelClass}>
                                    Varsayılan OG / paylaşım görseli
                                </label>
                                {sp?.seo_og_image_url && !removeOg && (
                                    <p className="mt-2 text-xs text-zinc-500">
                                        Mevcut:{' '}
                                        <a
                                            href={sp.seo_og_image_url}
                                            className="text-amber-400 hover:underline"
                                            target="_blank"
                                            rel="noreferrer"
                                        >
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
                                        OG görselini kaldır
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
                                    placeholder="Meta içerik değeri"
                                />
                            </div>
                        </div>

                        {/* İletişim + sosyal */}
                        <div
                            id="settings-panel-contact"
                            role="tabpanel"
                            aria-labelledby="settings-tab-contact"
                            hidden={activeTab !== 'contact'}
                            className="space-y-6"
                        >
                            <div>
                                <h3 className="text-lg font-semibold text-white">İletişim bilgileri</h3>
                                <p className="mt-1 text-sm text-zinc-400">Footer ve genel iletişim metinlerinde gösterilir.</p>
                                <div className="mt-4 grid max-w-xl gap-4">
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
                            <div className="border-t border-zinc-800 pt-6">
                                <h3 className="text-lg font-semibold text-white">Sosyal medya</h3>
                                <p className="mt-1 text-xs text-zinc-500">
                                    Tam URL (örn. <code className="rounded bg-zinc-800 px-1">https://instagram.com/…</code>). Boş bırakılanlar
                                    listelenmez.
                                </p>
                                <div className="mt-4 grid max-w-xl gap-4">
                                    <div>
                                        <label htmlFor="soc-ig" className={labelClass}>
                                            Instagram
                                        </label>
                                        <input
                                            id="soc-ig"
                                            type="url"
                                            value={socialInstagram}
                                            onChange={(e) => setSocialInstagram(e.target.value)}
                                            className={inputClass}
                                            placeholder="https://instagram.com/…"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="soc-fb" className={labelClass}>
                                            Facebook
                                        </label>
                                        <input
                                            id="soc-fb"
                                            type="url"
                                            value={socialFacebook}
                                            onChange={(e) => setSocialFacebook(e.target.value)}
                                            className={inputClass}
                                            placeholder="https://facebook.com/…"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="soc-x" className={labelClass}>
                                            X (Twitter)
                                        </label>
                                        <input
                                            id="soc-x"
                                            type="url"
                                            value={socialTwitter}
                                            onChange={(e) => setSocialTwitter(e.target.value)}
                                            className={inputClass}
                                            placeholder="https://x.com/…"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="soc-yt" className={labelClass}>
                                            YouTube
                                        </label>
                                        <input
                                            id="soc-yt"
                                            type="url"
                                            value={socialYoutube}
                                            onChange={(e) => setSocialYoutube(e.target.value)}
                                            className={inputClass}
                                            placeholder="https://youtube.com/…"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="soc-li" className={labelClass}>
                                            LinkedIn
                                        </label>
                                        <input
                                            id="soc-li"
                                            type="url"
                                            value={socialLinkedin}
                                            onChange={(e) => setSocialLinkedin(e.target.value)}
                                            className={inputClass}
                                            placeholder="https://linkedin.com/…"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="soc-tt" className={labelClass}>
                                            TikTok
                                        </label>
                                        <input
                                            id="soc-tt"
                                            type="url"
                                            value={socialTiktok}
                                            onChange={(e) => setSocialTiktok(e.target.value)}
                                            className={inputClass}
                                            placeholder="https://tiktok.com/@…"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Harita */}
                        <div
                            id="settings-panel-maps"
                            role="tabpanel"
                            aria-labelledby="settings-tab-maps"
                            hidden={activeTab !== 'maps'}
                            className="space-y-4"
                        >
                            <h3 className="text-lg font-semibold text-white">Google Maps (mekan adresi)</h3>
                            <p className="text-sm text-zinc-400">
                                Yönetici ve sanatçı mekan formlarında Places otomatik tamamlama. Maps JavaScript API ve Places açık olmalı; anahtarı
                                referrer ile kısıtlayın.
                            </p>
                            <div className="flex flex-wrap gap-2 text-xs">
                                {mapsApi?.key_set_in_db ? (
                                    <span className="rounded bg-emerald-500/15 px-2 py-0.5 text-emerald-300">Veritabanında anahtar kayıtlı</span>
                                ) : (
                                    <span className="rounded bg-zinc-800 px-2 py-0.5 text-zinc-400">Veritabanında anahtar yok</span>
                                )}
                                {mapsApi?.env_has_key ? (
                                    <span className="rounded bg-zinc-800 px-2 py-0.5 text-zinc-400">.env: GOOGLE_MAPS_API_KEY tanımlı</span>
                                ) : null}
                            </div>
                            <p className="text-xs text-amber-200/90">Buraya yazılan anahtar, .env içindeki değerin üzerindedir.</p>
                            <div className="max-w-xl">
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
                                        Veritabanındaki anahtarı sil (.env varsa o kullanılır)
                                    </label>
                                ) : null}
                            </div>
                        </div>
                    </fieldset>

                    {showSiteFormSave && (
                        <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-zinc-800 pt-6">
                            <button
                                type="submit"
                                disabled={siteFormBusy}
                                className="rounded-lg bg-amber-500 px-5 py-2.5 font-semibold text-zinc-950 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {siteFormBusy ? 'Kaydediliyor…' : 'Bu sekmeyi kaydet'}
                            </button>
                            <p className="text-xs text-zinc-500">
                                Tüm site alanları tek istekte gönderilir; diğer sekmelerde yaptığınız değişiklikler de kayda dahildir.
                            </p>
                        </div>
                    )}
                </form>

                {/* İçerik: yasal + footer */}
                <section
                    id="settings-panel-content"
                    role="tabpanel"
                    aria-labelledby="settings-tab-content"
                    hidden={activeTab !== 'content'}
                    className="rounded-xl border border-zinc-800 bg-zinc-900 p-6"
                >
                    <h2 className="text-lg font-semibold text-white">Platform içeriği</h2>
                    <p className="mt-1 text-sm text-zinc-400">
                        Yasal sayfalar ve footer JSON tüm yöneticiler tarafından düzenlenebilir. Reklamlar:{' '}
                        <Link href={route('admin.ad-slots.index')} className="font-medium text-amber-400 hover:underline">
                            Reklam alanları
                        </Link>
                        .
                    </p>

                    <div className="mt-8 border-t border-zinc-800 pt-8">
                        <h3 className="font-semibold text-white">Yasal sayfalar</h3>
                        <p className="mt-1 text-sm text-zinc-500">
                            <code className="text-amber-400/90">/sayfalar/…</code> adreslerinde yayınlanır.
                        </p>
                        <div className="mt-4">
                            <label htmlFor="legal-slug" className={labelClass}>
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
                        <div className="mt-4">
                            <label htmlFor="legal-title" className={labelClass}>
                                Sayfa başlığı
                            </label>
                            <input
                                id="legal-title"
                                value={currentLegal.title}
                                onChange={(e) => setLegalTitle(e.target.value)}
                                className="mt-1 w-full max-w-xl rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                            />
                        </div>
                        <div className="mt-4">
                            <span className={labelClass}>İçerik</span>
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
                                rows={6}
                                value={legalPagesJson}
                                className="mt-2 w-full rounded bg-zinc-900 px-3 py-2 font-mono text-xs text-zinc-400"
                            />
                        </details>
                    </div>

                    <div className="mt-8 border-t border-zinc-800 pt-8">
                        <h3 className="font-semibold text-white">Footer JSON</h3>
                        <p className="mt-1 text-xs text-zinc-500">Alt bilgi yapılandırması (bağlantılar, metinler).</p>
                        <textarea
                            value={footer}
                            onChange={(e) => setFooter(e.target.value)}
                            rows={10}
                            className="mt-3 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 font-mono text-sm text-white"
                        />
                    </div>

                    <button
                        type="button"
                        onClick={saveSettings}
                        className="mt-6 rounded-lg bg-amber-500 px-5 py-2.5 font-semibold text-zinc-950"
                    >
                        Yasal sayfalar ve footer’ı kaydet
                    </button>
                </section>
            </div>
        </AdminLayout>
    );
}
