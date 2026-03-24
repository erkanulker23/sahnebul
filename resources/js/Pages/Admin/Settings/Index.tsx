import AdminLayout from '@/Layouts/AdminLayout';
import RichTextEditor from '@/Components/RichTextEditor';
import SeoHead from '@/Components/SeoHead';
import { Link, router } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';

interface Props {
    systemStats: Record<string, number>;
    settings?: {
        footer?: string | null;
        legal_pages?: string | null;
    };
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

export default function AdminSettingsIndex({ systemStats, settings }: Readonly<Props>) {
    const [footer, setFooter] = useState(settings?.footer ?? '');

    const [legalBySlug, setLegalBySlug] = useState(() => buildLegalState(settings?.legal_pages));
    const [legalSlug, setLegalSlug] = useState(LEGAL_SLUGS[0].slug);

    useEffect(() => {
        setFooter(settings?.footer ?? '');
        setLegalBySlug(buildLegalState(settings?.legal_pages));
    }, [settings?.footer, settings?.legal_pages]);

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

                <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
                    <h2 className="mb-4 font-semibold text-white">Platform bilgileri</h2>
                    <p className="text-sm text-zinc-400">
                        Footer ve yasal sayfa içerikleri bu sayfadan yönetilir. Reklamlar için{' '}
                        <Link href={route('admin.ad-slots.index')} className="font-medium text-amber-400 hover:underline">
                            Reklam alanları
                        </Link>
                        , giden e-posta için{' '}
                        <Link href={route('admin.smtp.index')} className="font-medium text-amber-400 hover:underline">
                            SMTP / E-posta
                        </Link>{' '}
                        sayfalarını kullanın.
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
                        Ayarları kaydet
                    </button>
                </div>
            </div>
        </AdminLayout>
    );
}
