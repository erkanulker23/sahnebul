import FlashMessage from '@/Components/FlashMessage';
import SeoHead from '@/Components/SeoHead';
import AdminLayout from '@/Layouts/AdminLayout';
import { safeRoute } from '@/lib/safeRoute';
import { Link, router } from '@inertiajs/react';
import { useRef, useState } from 'react';

export interface BubiletCrawlCookiesPageProps {
    effectiveFileSource: 'none' | 'env' | 'upload';
    effectiveFileBasename: string | null;
    envFileConfigured: boolean;
    envFileReadable: boolean;
    envInlineCookiesConfigured: boolean;
    uploadedExists: boolean;
    uploadedUpdatedAt: string | null;
    uploadedSizeBytes: number | null;
    mergedPairCount: number;
    mergedHeaderNonEmpty: boolean;
    hasCfClearance: boolean;
}

function formatBytes(n: number | null): string {
    if (n === null) return '—';
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AdminBubiletCrawlCookiesIndex({
    effectiveFileSource,
    effectiveFileBasename,
    envFileConfigured,
    envFileReadable,
    envInlineCookiesConfigured,
    uploadedExists,
    uploadedUpdatedAt,
    uploadedSizeBytes,
    mergedPairCount,
    mergedHeaderNonEmpty,
    hasCfClearance,
}: Readonly<BubiletCrawlCookiesPageProps>) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [file, setFile] = useState<File | null>(null);
    const [pastedText, setPastedText] = useState('');

    const uploadFile = () => {
        if (!file) return;
        const fd = new FormData();
        fd.append('cookies_file', file);
        router.post(safeRoute('admin.external-events.bubilet-cookies.store'), fd, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                setFile(null);
                if (inputRef.current) inputRef.current.value = '';
            },
        });
    };

    const savePastedText = () => {
        const t = pastedText.trim();
        if (!t) return;
        router.post(
            safeRoute('admin.external-events.bubilet-cookies.store'),
            { cookies_text: pastedText },
            {
                preserveScroll: true,
                onSuccess: () => setPastedText(''),
            },
        );
    };

    const removeUploaded = () => {
        if (!confirm('Panelden yüklenen Bubilet çerez dosyasını kaldırmak istiyor musunuz?')) return;
        router.post(safeRoute('admin.external-events.bubilet-cookies.destroy'), {}, { preserveScroll: true });
    };

    const fileSourceLabel =
        effectiveFileSource === 'env'
            ? '.env (BUBILET_COOKIES_FILE) — öncelikli dosya'
            : effectiveFileSource === 'upload'
              ? 'Panel yüklemesi (storage/app/private/…)'
              : 'Netscape dosyası yok (yalnızca .env BUBILET_COOKIES satırı olabilir)';

    return (
        <AdminLayout>
            <SeoHead title="Bubilet crawl çerez — Admin | Sahnebul" description="Cloudflare / dış kaynak crawl." noindex />
            <FlashMessage />

            <div className="space-y-6">
                <div>
                    <p className="text-sm">
                        <Link
                            href={safeRoute('admin.external-events.index')}
                            className="font-medium text-sky-700 underline underline-offset-2 hover:text-sky-600 dark:text-sky-400"
                        >
                            ← Crawl adayları (dış kaynak etkinlikler)
                        </Link>
                    </p>
                    <h1 className="mt-2 text-2xl font-bold text-zinc-900 dark:text-white">Bubilet çerez (Cloudflare / crawl)</h1>
                    <p className="mt-2 max-w-3xl text-sm text-zinc-600 dark:text-zinc-400">
                        Yalnızca <strong className="text-zinc-800 dark:text-zinc-200">Bubilet</strong> kaynaklı HTTP taraması
                        (<code className="rounded bg-zinc-200 px-1 text-xs dark:bg-zinc-800">MarketplaceCrawlerService</code>) için kullanılır.
                        Tarayıcıda bubilet.com.tr üzerinden challenge geçtikten sonra Netscape{' '}
                        <strong className="text-zinc-800 dark:text-zinc-200">cookies.txt</strong> dışa aktarıp yükleyin veya metni yapıştırın. Dosya{' '}
                        <code className="rounded bg-zinc-200 px-1 text-xs dark:bg-zinc-800">storage/app/private/</code> altında kalır.{' '}
                        <strong>cf_clearance</strong> çoğu zaman gerekir; çerez genelde istek atan IP ile bağlıdır.
                    </p>
                </div>

                <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
                    <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Durum</h2>
                    <ul className="mt-3 space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                        <li>
                            <span className="font-medium text-zinc-800 dark:text-zinc-200">Netscape dosya kaynağı:</span> {fileSourceLabel}
                        </li>
                        {effectiveFileBasename ? (
                            <li>
                                <span className="font-medium text-zinc-800 dark:text-zinc-200">Seçilen dosya adı:</span> {effectiveFileBasename}
                            </li>
                        ) : null}
                        <li>
                            <span className="font-medium text-zinc-800 dark:text-zinc-200">.env BUBILET_COOKIES_FILE:</span>{' '}
                            {envFileConfigured ? (envFileReadable ? 'tanımlı, okunuyor' : 'tanımlı, okunamıyor') : 'tanımlı değil'}
                        </li>
                        <li>
                            <span className="font-medium text-zinc-800 dark:text-zinc-200">.env BUBILET_COOKIES (satır):</span>{' '}
                            {envInlineCookiesConfigured ? 'tanımlı (dosyadaki aynı isimleri ezer)' : 'tanımlı değil'}
                        </li>
                        <li>
                            <span className="font-medium text-zinc-800 dark:text-zinc-200">Panel Netscape yüklemesi:</span>{' '}
                            {uploadedExists
                                ? `${formatBytes(uploadedSizeBytes)}${uploadedUpdatedAt ? ` — ${new Date(uploadedUpdatedAt).toLocaleString('tr-TR')}` : ''}`
                                : 'yok'}
                        </li>
                        <li>
                            <span className="font-medium text-zinc-800 dark:text-zinc-200">Birleşik çerez (dosya + satır):</span>{' '}
                            {mergedHeaderNonEmpty
                                ? `${mergedPairCount} adet isim (cf_clearance: ${hasCfClearance ? 'var' : 'yok — Cloudflare yine engelleyebilir'})`
                                : 'henüz gönderilecek çerez yok'}
                        </li>
                    </ul>
                </div>

                <div className="rounded-lg border border-sky-500/40 bg-sky-50/80 p-5 dark:border-sky-500/30 dark:bg-sky-950/25">
                    <h2 className="text-sm font-semibold text-sky-950 dark:text-sky-100">Yükle veya yapıştır</h2>
                    <p className="mt-2 text-xs text-sky-900/90 dark:text-sky-200/90">
                        Okunabilir .env <code className="rounded bg-black/10 px-1">BUBILET_COOKIES_FILE</code> her zaman panel dosyasından önce gelir.
                        Hem dosya hem metin gönderirseniz <strong className="font-medium">dosya</strong> kullanılır. Yüklemeden sonra gerekirse{' '}
                        <code className="rounded bg-black/10 px-1">php artisan config:clear</code>.
                    </p>
                    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                        <div className="flex-1">
                            <label htmlFor="bubilet-cookies-file" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                                .txt dosyası (Netscape, bubilet.com.tr satırları)
                            </label>
                            <input
                                id="bubilet-cookies-file"
                                ref={inputRef}
                                type="file"
                                accept=".txt,.text,text/plain"
                                className="mt-1 block w-full text-sm text-zinc-700 file:mr-3 file:rounded file:border-0 file:bg-sky-600 file:px-3 file:py-1.5 file:text-white dark:text-zinc-300"
                                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                            />
                        </div>
                        <button
                            type="button"
                            disabled={!file}
                            onClick={uploadFile}
                            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-50"
                        >
                            Dosyayı kaydet
                        </button>
                    </div>
                    <div className="mt-6 border-t border-sky-500/30 pt-6">
                        <label htmlFor="bubilet-cookies-textarea" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                            Veya cookies.txt içeriğini buraya yapıştırın
                        </label>
                        <textarea
                            id="bubilet-cookies-textarea"
                            value={pastedText}
                            onChange={(e) => setPastedText(e.target.value)}
                            rows={10}
                            spellCheck={false}
                            placeholder={'# Netscape HTTP Cookie File\n.bubilet.com.tr\tTRUE\t/\tFALSE\t9999999999\tcf_clearance\t…'}
                            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-600"
                        />
                        <button
                            type="button"
                            disabled={!pastedText.trim()}
                            onClick={savePastedText}
                            className="mt-3 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-50"
                        >
                            Metni kaydet
                        </button>
                    </div>
                    {uploadedExists ? (
                        <button
                            type="button"
                            onClick={removeUploaded}
                            className="mt-4 text-sm font-medium text-red-600 underline hover:text-red-500 dark:text-red-400"
                        >
                            Panel yüklemesini kaldır
                        </button>
                    ) : null}
                </div>
            </div>
        </AdminLayout>
    );
}
