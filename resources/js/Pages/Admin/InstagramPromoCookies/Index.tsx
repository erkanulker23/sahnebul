import FlashMessage from '@/Components/FlashMessage';
import SeoHead from '@/Components/SeoHead';
import AdminLayout from '@/Layouts/AdminLayout';
import { router } from '@inertiajs/react';
import { useRef, useState } from 'react';

export interface InstagramPromoCookiesPageProps {
    effectiveSource: 'none' | 'env' | 'upload';
    effectivePathBasename: string | null;
    envPathConfigured: boolean;
    envPathReadable: boolean;
    uploadedExists: boolean;
    uploadedUpdatedAt: string | null;
    uploadedSizeBytes: number | null;
    phpCookieHeaderWorks: boolean;
}

function formatBytes(n: number | null): string {
    if (n === null) return '—';
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AdminInstagramPromoCookiesIndex({
    effectiveSource,
    effectivePathBasename,
    envPathConfigured,
    envPathReadable,
    uploadedExists,
    uploadedUpdatedAt,
    uploadedSizeBytes,
    phpCookieHeaderWorks,
}: Readonly<InstagramPromoCookiesPageProps>) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [file, setFile] = useState<File | null>(null);
    const [pastedText, setPastedText] = useState('');

    const uploadFile = () => {
        if (!file) return;
        const fd = new FormData();
        fd.append('cookies_file', file);
        router.post(route('admin.instagram-promo-cookies.store'), fd, {
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
            route('admin.instagram-promo-cookies.store'),
            { cookies_text: pastedText },
            {
                preserveScroll: true,
                onSuccess: () => setPastedText(''),
            },
        );
    };

    const removeUploaded = () => {
        if (!confirm('Panelden yüklenen çerez dosyasını kaldırmak istiyor musunuz?')) return;
        router.post(route('admin.instagram-promo-cookies.destroy'), {}, { preserveScroll: true });
    };

    const sourceLabel =
        effectiveSource === 'env'
            ? '.env (YTDLP_COOKIES_FILE) — öncelikli'
            : effectiveSource === 'upload'
              ? 'Panel yüklemesi (storage/app/private/…)'
              : 'Aktif çerez dosyası yok';

    return (
        <AdminLayout>
            <SeoHead title="Instagram çerez — Admin | Sahnebul" description="yt-dlp tanıtım video içe aktarımı." noindex />
            <FlashMessage />

            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Instagram çerez (tanıtım video)</h1>
                    <p className="mt-2 max-w-3xl text-sm text-zinc-600 dark:text-zinc-400">
                        Tarayıcıda Instagram&apos;a giriş yapın; «Get cookies.txt LOCALLY» veya benzeri eklentiyle{' '}
                        <strong className="text-zinc-800 dark:text-zinc-200">Netscape cookies.txt</strong> dışa aktarın; .txt dosyası olarak yükleyin veya
                        içeriği aşağıya yapıştırıp kaydedin. Dosya{' '}
                        <code className="rounded bg-zinc-200 px-1 text-xs dark:bg-zinc-800">storage/app/private/</code> altında tutulur; web kökünden
                        servis edilmez. Şifre kullanmayın — yalnız çerez dosyası.
                    </p>
                </div>

                <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
                    <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Durum</h2>
                    <ul className="mt-3 space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                        <li>
                            <span className="font-medium text-zinc-800 dark:text-zinc-200">Aktif kaynak:</span> {sourceLabel}
                        </li>
                        {effectivePathBasename ? (
                            <li>
                                <span className="font-medium text-zinc-800 dark:text-zinc-200">Dosya:</span> {effectivePathBasename}
                            </li>
                        ) : null}
                        <li>
                            <span className="font-medium text-zinc-800 dark:text-zinc-200">.env YTDLP_COOKIES_FILE:</span>{' '}
                            {envPathConfigured ? (envPathReadable ? 'tanımlı, okunuyor' : 'tanımlı, okunamıyor') : 'tanımlı değil'}
                        </li>
                        <li>
                            <span className="font-medium text-zinc-800 dark:text-zinc-200">Panel yüklemesi:</span>{' '}
                            {uploadedExists
                                ? `${formatBytes(uploadedSizeBytes)}${uploadedUpdatedAt ? ` — ${new Date(uploadedUpdatedAt).toLocaleString('tr-TR')}` : ''}`
                                : 'yok'}
                        </li>
                        <li>
                            <span className="font-medium text-zinc-800 dark:text-zinc-200">PHP Cookie üretimi (HTML istekleri):</span>{' '}
                            {phpCookieHeaderWorks ? 'çalışıyor' : effectiveSource === 'none' ? 'çerez yok' : 'üretilemedi (dosyayı kontrol edin)'}
                        </li>
                    </ul>
                </div>

                <div className="rounded-lg border border-amber-500/40 bg-amber-50/80 p-5 dark:border-amber-500/30 dark:bg-amber-950/25">
                    <h2 className="text-sm font-semibold text-amber-950 dark:text-amber-100">Yükle veya yapıştır</h2>
                    <p className="mt-2 text-xs text-amber-900/90 dark:text-amber-200/90">
                        .env içinde okunabilir <code className="rounded bg-black/10 px-1">YTDLP_COOKIES_FILE</code> varsa o her zaman önce gelir; panel
                        dosyası yedek olarak kalır. Hem dosya hem metin gönderirseniz{' '}
                        <strong className="font-medium">dosya</strong> kullanılır.
                    </p>
                    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                        <div className="flex-1">
                            <label htmlFor="ig-cookies-file" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                                .txt dosyası (Netscape cookies)
                            </label>
                            <input
                                id="ig-cookies-file"
                                ref={inputRef}
                                type="file"
                                accept=".txt,.text,text/plain"
                                className="mt-1 block w-full text-sm text-zinc-700 file:mr-3 file:rounded file:border-0 file:bg-amber-600 file:px-3 file:py-1.5 file:text-white dark:text-zinc-300"
                                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                            />
                        </div>
                        <button
                            type="button"
                            disabled={!file}
                            onClick={uploadFile}
                            className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-500 disabled:opacity-50"
                        >
                            Dosyayı kaydet
                        </button>
                    </div>
                    <div className="mt-6 border-t border-amber-500/30 pt-6">
                        <label htmlFor="ig-cookies-textarea" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                            Veya cookies.txt içeriğini buraya yapıştırın
                        </label>
                        <textarea
                            id="ig-cookies-textarea"
                            value={pastedText}
                            onChange={(e) => setPastedText(e.target.value)}
                            rows={10}
                            spellCheck={false}
                            placeholder={"# Netscape HTTP Cookie File\n.instagram.com\tTRUE\t/\tTRUE\t…\t…\t…"}
                            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-600"
                        />
                        <button
                            type="button"
                            disabled={!pastedText.trim()}
                            onClick={savePastedText}
                            className="mt-3 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-500 disabled:opacity-50"
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
