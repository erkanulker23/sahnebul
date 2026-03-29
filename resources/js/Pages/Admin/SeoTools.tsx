import SeoHead from '@/Components/SeoHead';
import { inputBaseClass } from '@/Components/ui/Input';
import { cn } from '@/lib/cn';
import AdminLayout from '@/Layouts/AdminLayout';
import { safeRoute } from '@/lib/safeRoute';
import { Link } from '@inertiajs/react';
import { ExternalLink, FileCode2, Map, Search } from 'lucide-react';

interface Props {
    sitemapUrl: string;
    robotsUrl: string;
    searchConsoleUrl: string;
    richResultsTestUrl: string;
}

function CopyField({ label, value }: Readonly<{ label: string; value: string }>) {
    return (
        <div className="space-y-1">
            <label className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</label>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input readOnly className={cn('w-full font-mono', inputBaseClass)} value={value} />
                <button
                    type="button"
                    className="shrink-0 rounded-lg border border-amber-500/40 bg-amber-500/15 px-4 py-2 text-sm font-medium text-amber-800 transition hover:bg-amber-500/25 dark:bg-amber-500/10 dark:text-amber-400 dark:hover:bg-amber-500/20"
                    onClick={() => void navigator.clipboard.writeText(value)}
                >
                    Kopyala
                </button>
            </div>
        </div>
    );
}

export default function AdminSeoTools({ sitemapUrl, robotsUrl, searchConsoleUrl, richResultsTestUrl }: Readonly<Props>) {
    return (
        <AdminLayout>
            <SeoHead title="SEO ve site haritası" description="Google Search Console ve XML site haritası bağlantıları." noindex />

            <div className="space-y-8">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">SEO ve site haritası</h1>
                    <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
                        Site haritası ve robots.txt canlı ortamda otomatik üretilir. Search Console’da özellik olarak site haritası URL’sini
                        eklemeniz yeterlidir; dosyayı manuel indirmeniz gerekmez.
                    </p>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                    <section className="rounded-xl border border-zinc-200 bg-white/80 p-6 dark:border-zinc-800 dark:bg-zinc-900/40">
                        <div className="mb-4 flex items-center gap-2 text-amber-800 dark:text-amber-400">
                            <Map className="h-5 w-5" />
                            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">XML site haritası</h2>
                        </div>
                        <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
                            Ana sayfa, listeler, yasal sayfalar, şehir seç sayfaları ve yayında olan tüm etkinlik, mekan, sanatçı ile blog
                            yazıları dahildir.
                        </p>
                        <CopyField label="Sitemap URL (Search Console’a bu adresi verin)" value={sitemapUrl} />
                        <div className="mt-4 flex flex-wrap gap-3">
                            <a
                                href={sitemapUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-zinc-100 px-4 py-2 text-sm text-zinc-800 transition hover:bg-zinc-200 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                            >
                                <ExternalLink className="h-4 w-4" />
                                Tarayıcıda aç
                            </a>
                            <a
                                href={sitemapUrl}
                                download="sitemap.xml"
                                className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-zinc-100 px-4 py-2 text-sm text-zinc-800 transition hover:bg-zinc-200 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                            >
                                <FileCode2 className="h-4 w-4" />
                                İndir
                            </a>
                        </div>
                    </section>

                    <section className="rounded-xl border border-zinc-200 bg-white/80 p-6 dark:border-zinc-800 dark:bg-zinc-900/40">
                        <div className="mb-4 flex items-center gap-2 text-amber-800 dark:text-amber-400">
                            <FileCode2 className="h-5 w-5" />
                            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">robots.txt</h2>
                        </div>
                        <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
                            Arama motorlarına site haritası konumunu bildirir. Ortamınızdaki{' '}
                            <code className="text-amber-800 dark:text-amber-200/90">APP_URL</code>{' '}
                            değerine göre üretilir.
                        </p>
                        <CopyField label="robots.txt URL" value={robotsUrl} />
                        <a
                            href={robotsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-4 inline-flex items-center gap-2 text-sm text-amber-700 hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-300"
                        >
                            <ExternalLink className="h-4 w-4" />
                            robots.txt’i görüntüle
                        </a>
                    </section>
                </div>

                <section className="rounded-xl border border-zinc-200 bg-white/80 p-6 dark:border-zinc-800 dark:bg-zinc-900/40">
                    <div className="mb-4 flex items-center gap-2 text-amber-800 dark:text-amber-400">
                        <Search className="h-5 w-5" />
                        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Google araçları</h2>
                    </div>
                    <ul className="space-y-3 text-sm text-zinc-700 dark:text-zinc-300">
                        <li>
                            <a
                                href={searchConsoleUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-amber-700 hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-300"
                            >
                                Google Search Console
                            </a>
                            <span className="text-zinc-500"> — Özellik → Site haritaları → Yeni site haritası ekle: </span>
                            <code className="rounded bg-zinc-200 px-1.5 py-0.5 text-xs text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                                sitemap.xml
                            </code>
                        </li>
                        <li>
                            <a
                                href={richResultsTestUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-amber-700 hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-300"
                            >
                                Zengin sonuçlar testi
                            </a>
                            <span className="text-zinc-500"> — Etkinlik ve sanatçı sayfalarında JSON-LD doğrulaması için bir detay URL’si yapıştırın.</span>
                        </li>
                        <li className="text-zinc-500">
                            <Link
                                href={safeRoute('admin.verification-scripts.index')}
                                className="text-amber-700 hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-300"
                            >
                                Doğrulama ve özel kodlar
                            </Link>
                            <span> — Search Console / Yandex / Bing meta içerikleri ve Analytics (head veya gövde sonu snippet).</span>
                        </li>
                    </ul>
                </section>

                <p className="text-sm text-zinc-500">
                    <Link
                        href={route('admin.settings.index')}
                        className="text-amber-700 hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-300"
                    >
                        Site ayarları
                    </Link>
                    ’na dön
                </p>
            </div>
        </AdminLayout>
    );
}
