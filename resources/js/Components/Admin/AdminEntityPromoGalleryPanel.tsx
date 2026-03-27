import { inputBaseClass } from '@/Components/ui/Input';
import { cn } from '@/lib/cn';
import { router } from '@inertiajs/react';
import { useMemo, useRef, useState } from 'react';

export type AdminEntityPromoGalleryRoutes = {
    importMedia: string;
    appendPromoFiles: string;
    clearPromoMedia: string;
    removePromoItem: string;
};

type PromoRow = {
    embed_url?: string | null;
    video_path?: string | null;
    poster_path?: string | null;
    promo_kind?: 'story' | 'post' | null;
};

type EntityWithPromo = {
    id: number;
    promo_gallery?: PromoRow[] | null;
    promo_video_path?: string | null;
    promo_embed_url?: string | null;
};

type AdminPromoPreviewRow = {
    video_path: string | null;
    poster_path: string | null;
    embed_url: string | null;
    promo_kind: 'story' | 'post' | null;
    galleryIndex: number;
};

function storageUrl(path: string | null): string | null {
    if (!path || path.trim() === '') return null;
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    return `/storage/${path}`;
}

function adminPromoRowKind(row: Pick<AdminPromoPreviewRow, 'promo_kind' | 'video_path' | 'embed_url' | 'poster_path'>): 'story' | 'post' {
    if (row.video_path) {
        return 'story';
    }
    if (row.poster_path || row.embed_url?.includes('instagram.com')) {
        return 'post';
    }
    if (row.promo_kind === 'post') {
        return 'post';
    }
    if (row.promo_kind === 'story') {
        return 'story';
    }
    return 'story';
}

const COPY = {
    venue: {
        lead: 'Mekân sayfasında gösterilir. Yalnızca bu mekân ve programınızla ilgili tanıtım ekleyin; ziyaretçi deneyimi için içeriği alakalı tutun.',
        postHint: 'Instagram / sosyal gönderi bağlantıları mekân veya buradaki etkinliklerle ilişkili olmalıdır.',
    },
    artist: {
        lead: 'Onaylı sanatçı profil sayfanızda yayınlanır. Kendi performans ve duyurularınızla ilgili tanıtım kullanın.',
        postHint: 'Gönderi bağlantıları sanatçı kimliğiniz veya sahne içeriğinizle uyumlu olmalıdır.',
    },
} as const;

export default function AdminEntityPromoGalleryPanel({
    entity,
    routes,
    variant,
}: Readonly<{
    entity: EntityWithPromo;
    routes: AdminEntityPromoGalleryRoutes;
    variant: 'venue' | 'artist';
}>) {
    const copy = COPY[variant];
    const fieldResize = cn(
        'mt-1 w-full resize-y font-mono text-sm',
        inputBaseClass,
        'placeholder:text-zinc-500 dark:placeholder:text-zinc-600',
    );
    const fieldSm = cn('mt-1 w-full sm:w-56', inputBaseClass);

    const [html5PromoUrls, setHtml5PromoUrls] = useState('');
    const [postPromoUrls, setPostPromoUrls] = useState('');
    const [appendHtml5PromoToGallery, setAppendHtml5PromoToGallery] = useState(true);
    const [appendPostPromoToGallery, setAppendPostPromoToGallery] = useState(true);
    const [html5PromoImporting, setHtml5PromoImporting] = useState(false);
    const [postPromoImporting, setPostPromoImporting] = useState(false);
    const [promoVideoFile, setPromoVideoFile] = useState<File | null>(null);
    const [promoPosterFile, setPromoPosterFile] = useState<File | null>(null);
    const [promoUploading, setPromoUploading] = useState(false);
    const [removingPromoIndex, setRemovingPromoIndex] = useState<number | null>(null);
    const promoVideoInputRef = useRef<HTMLInputElement>(null);
    const promoPosterInputRef = useRef<HTMLInputElement>(null);

    const submitHtml5PromoImport = () => {
        if (!html5PromoUrls.trim()) return;
        setHtml5PromoImporting(true);
        router.post(
            routes.importMedia,
            {
                urls_text: html5PromoUrls,
                mode: 'promo_video',
                append_promo: appendHtml5PromoToGallery,
            },
            {
                preserveScroll: true,
                onFinish: () => setHtml5PromoImporting(false),
                onSuccess: () => setHtml5PromoUrls(''),
            },
        );
    };

    const submitPostPromoImport = () => {
        if (!postPromoUrls.trim()) return;
        setPostPromoImporting(true);
        router.post(
            routes.importMedia,
            {
                urls_text: postPromoUrls,
                mode: 'promo_video',
                append_promo: appendPostPromoToGallery,
            },
            {
                preserveScroll: true,
                onFinish: () => setPostPromoImporting(false),
                onSuccess: () => setPostPromoUrls(''),
            },
        );
    };

    const submitPromoFileUpload = () => {
        if (!promoVideoFile && !promoPosterFile) return;
        setPromoUploading(true);
        const fd = new FormData();
        if (promoVideoFile) {
            fd.append('promo_video_upload', promoVideoFile);
        }
        if (promoPosterFile) {
            fd.append('promo_poster_upload', promoPosterFile);
        }
        fd.append('append_promo', appendHtml5PromoToGallery ? '1' : '0');
        router.post(routes.appendPromoFiles, fd, {
            preserveScroll: true,
            forceFormData: true,
            onFinish: () => setPromoUploading(false),
            onSuccess: () => {
                setPromoVideoFile(null);
                setPromoPosterFile(null);
                if (promoVideoInputRef.current) {
                    promoVideoInputRef.current.value = '';
                }
                if (promoPosterInputRef.current) {
                    promoPosterInputRef.current.value = '';
                }
            },
        });
    };

    const clearPromoFromServer = () => {
        if (!confirm('Tüm tanıtım videoları, önizleme görselleri ve bağlantılar kaldırılsın mı?')) return;
        router.post(routes.clearPromoMedia, {}, { preserveScroll: true });
    };

    const removePromoGalleryItem = (galleryIndex: number) => {
        if (!confirm('Bu tanıtım öğesini kaldırmak istiyor musunuz?')) return;
        setRemovingPromoIndex(galleryIndex);
        router.post(
            routes.removePromoItem,
            { index: galleryIndex },
            {
                preserveScroll: true,
                onFinish: () => setRemovingPromoIndex(null),
            },
        );
    };

    const adminPromoGalleryRows = useMemo((): AdminPromoPreviewRow[] => {
        const g = entity.promo_gallery;
        if (Array.isArray(g) && g.length > 0) {
            return g.map((row, galleryIndex) => ({
                video_path: row.video_path?.trim() || null,
                poster_path: row.poster_path?.trim() || null,
                embed_url: row.embed_url?.trim() || null,
                promo_kind:
                    row.promo_kind === 'post' ? ('post' as const) : row.promo_kind === 'story' ? ('story' as const) : null,
                galleryIndex,
            }));
        }
        if (entity.promo_video_path?.trim() || entity.promo_embed_url?.trim()) {
            return [
                {
                    video_path: entity.promo_video_path?.trim() || null,
                    poster_path: null,
                    embed_url: entity.promo_embed_url?.trim() || null,
                    promo_kind: 'story' as const,
                    galleryIndex: 0,
                },
            ];
        }
        return [];
    }, [entity.promo_gallery, entity.promo_video_path, entity.promo_embed_url]);

    const adminStoryPreviewRows = useMemo(
        () => adminPromoGalleryRows.filter((row) => adminPromoRowKind(row) === 'story'),
        [adminPromoGalleryRows],
    );
    const adminPostPreviewRows = useMemo(
        () => adminPromoGalleryRows.filter((row) => adminPromoRowKind(row) === 'post'),
        [adminPromoGalleryRows],
    );

    return (
        <div className="mt-10 space-y-4 rounded-lg border border-zinc-600/80 bg-zinc-950/40 p-4">
            <div>
                <h2 className="text-sm font-semibold text-zinc-200">Tanıtım — hikâye ve gönderi galerisi</h2>
                <p className="mt-1 text-xs text-zinc-500">{copy.lead}</p>
            </div>

            <div className="mt-6 space-y-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-zinc-600/80 pb-2">
                    <h3 className="text-base font-bold tracking-tight text-amber-200">
                        Hikâyeler — video dosyası veya MP4/WebM bağlantısı
                    </h3>
                    <span className="rounded bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-300">
                        Dikey şerit / ızgara
                    </span>
                </div>
                <p className="text-xs text-zinc-500">
                    Sitede yalnızca sunucunuza inen <strong className="text-zinc-400">MP4 / WebM / MOV</strong> oynatılır. Instagram reel için{' '}
                    <strong className="text-fuchsia-300">aşağıdaki pembe çerçeveli</strong> kutuyu kullanın.
                </p>
                <label className="flex cursor-pointer items-start gap-2 rounded-md border border-zinc-700/80 bg-zinc-900/50 p-3 text-xs text-zinc-400">
                    <input
                        type="checkbox"
                        checked={appendHtml5PromoToGallery}
                        onChange={(e) => setAppendHtml5PromoToGallery(e.target.checked)}
                        className="mt-0.5 rounded border-zinc-600 bg-zinc-800 text-amber-500"
                    />
                    <span>
                        Tanıtım galerisine <strong className="text-zinc-200">yanına ekle</strong>. İşaretsiz: önce tüm tanıtım öğeleri silinir.
                    </span>
                </label>

                <div className="grid gap-6 lg:grid-cols-2">
                    <section
                        aria-labelledby={`entity-promo-html5-file-${entity.id}`}
                        className="flex flex-col rounded-xl border-2 border-amber-500/45 bg-zinc-950/70 p-4 shadow-[0_0_0_1px_rgba(0,0,0,0.3)]"
                    >
                        <h4 id={`entity-promo-html5-file-${entity.id}`} className="text-sm font-semibold text-amber-100">
                            ① Video dosyası + poster
                        </h4>
                        <p className="mt-1 text-xs text-zinc-500">Bilgisayarınızdan seçin; poster isteğe bağlı.</p>
                        <div className="mt-4 flex flex-1 flex-col gap-3">
                            <div>
                                <label htmlFor={`entity-promo-video-${entity.id}`} className="block text-xs font-medium text-zinc-400">
                                    Video dosyası
                                </label>
                                <input
                                    id={`entity-promo-video-${entity.id}`}
                                    ref={promoVideoInputRef}
                                    type="file"
                                    accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
                                    onChange={(e) => setPromoVideoFile(e.target.files?.[0] ?? null)}
                                    className="mt-1 w-full text-sm text-zinc-300"
                                />
                            </div>
                            <div>
                                <label htmlFor={`entity-promo-poster-${entity.id}`} className="block text-xs font-medium text-zinc-400">
                                    Poster (isteğe bağlı)
                                </label>
                                <input
                                    id={`entity-promo-poster-${entity.id}`}
                                    ref={promoPosterInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => setPromoPosterFile(e.target.files?.[0] ?? null)}
                                    className="mt-1 w-full text-sm text-zinc-300"
                                />
                            </div>
                        </div>
                        <button
                            type="button"
                            disabled={promoUploading || (!promoVideoFile && !promoPosterFile)}
                            onClick={submitPromoFileUpload}
                            className="mt-4 w-full rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-amber-500 disabled:opacity-50"
                        >
                            {promoUploading ? 'Yükleniyor…' : 'Dosyayı galeriye kaydet'}
                        </button>
                    </section>

                    <section
                        aria-labelledby={`entity-promo-html5-url-${entity.id}`}
                        className="flex flex-col rounded-xl border-2 border-amber-500/45 bg-zinc-950/70 p-4 shadow-[0_0_0_1px_rgba(0,0,0,0.3)]"
                    >
                        <h4 id={`entity-promo-html5-url-${entity.id}`} className="text-sm font-semibold text-amber-100">
                            ② Doğrudan video URL’si
                        </h4>
                        <p className="mt-1 text-xs text-zinc-500">
                            Yol <code className="text-amber-200/90">.mp4</code> veya <code className="text-amber-200/90">.webm</code> ile bitsin; satır
                            başına bir adres.
                        </p>
                        <textarea
                            id={`entity-html5-promo-urls-${entity.id}`}
                            value={html5PromoUrls}
                            onChange={(e) => setHtml5PromoUrls(e.target.value)}
                            placeholder={'https://cdn.ornek.com/tanitim.mp4'}
                            rows={6}
                            className={cn(fieldResize, 'mt-3 min-h-[140px] flex-1')}
                        />
                        <button
                            type="button"
                            disabled={html5PromoImporting || !html5PromoUrls.trim()}
                            onClick={submitHtml5PromoImport}
                            className="mt-3 w-full rounded-lg bg-amber-600/90 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-amber-500 disabled:opacity-50"
                        >
                            {html5PromoImporting ? 'İndiriliyor…' : 'URL’lerden videoyu içe aktar'}
                        </button>
                    </section>
                </div>
            </div>

            <section
                className="mt-8 space-y-5 rounded-xl border-2 border-fuchsia-500/50 bg-gradient-to-b from-fuchsia-950/20 to-zinc-950/40 p-5 shadow-lg shadow-fuchsia-950/20"
                aria-labelledby={`entity-promo-posts-${entity.id}`}
            >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-base font-bold tracking-tight text-fuchsia-200" id={`entity-promo-posts-${entity.id}`}>
                        Tanıtım postaları — Instagram / sosyal bağlantı
                    </h3>
                    <span className="rounded bg-fuchsia-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-fuchsia-200">
                        Reel &amp; gönderi
                    </span>
                </div>
                <p className="text-xs text-zinc-500">{copy.postHint}</p>
                <p className="text-xs text-zinc-500">
                    Önizleme görseli alınır; video sunucuya indirilebiliyorsa sitede oynatılır. Gerekirse videoyu yukarıdaki amber bölümden yükleyin.
                </p>
                <label className="flex cursor-pointer items-start gap-2 rounded-md border border-fuchsia-500/25 bg-zinc-900/40 p-3 text-xs text-zinc-400">
                    <input
                        type="checkbox"
                        checked={appendPostPromoToGallery}
                        onChange={(e) => setAppendPostPromoToGallery(e.target.checked)}
                        className="mt-0.5 rounded border-zinc-600 bg-zinc-800 text-fuchsia-500"
                    />
                    <span>
                        Tanıtım galerisine <strong className="text-fuchsia-100">yanına ekle</strong> (yalnızca bu kutudaki post bağlantıları). İşaretsiz:
                        önce tüm tanıtım öğeleri silinir.
                    </span>
                </label>
                <div>
                    <label htmlFor={`entity-post-promo-urls-${entity.id}`} className="block text-xs font-medium text-fuchsia-200/90">
                        Post bağlantıları (satır başına bir URL)
                    </label>
                    <textarea
                        id={`entity-post-promo-urls-${entity.id}`}
                        value={postPromoUrls}
                        onChange={(e) => setPostPromoUrls(e.target.value)}
                        placeholder={'https://www.instagram.com/reel/…\nhttps://www.instagram.com/p/…'}
                        rows={5}
                        className={fieldResize}
                    />
                    <button
                        type="button"
                        disabled={postPromoImporting || !postPromoUrls.trim()}
                        onClick={submitPostPromoImport}
                        className="mt-3 w-full rounded-lg bg-fuchsia-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-fuchsia-500 disabled:opacity-50 sm:w-auto"
                    >
                        {postPromoImporting ? 'İndiriliyor…' : 'Postaları içe aktar'}
                    </button>
                </div>
            </section>

            {adminPromoGalleryRows.length > 0 && (
                <div className="mt-8 space-y-6 rounded-lg border border-zinc-600/80 bg-zinc-950/40 p-4">
                    <div>
                        <p className="text-xs font-medium text-zinc-400">Tanıtım önizlemesi</p>
                        <p className="mt-1 text-xs text-zinc-500">
                            Sitede <strong className="text-amber-200/90">hikâyeler</strong> ve{' '}
                            <strong className="text-fuchsia-200/90">gönderiler</strong> ayrı ızgarada. Her kartın köşesinden tek öğe silebilirsiniz.
                        </p>
                    </div>

                    {adminStoryPreviewRows.length > 0 ? (
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-400/90">Hikâyeler</p>
                            <ul className="mt-2 grid list-none grid-cols-3 gap-1 sm:grid-cols-4 sm:gap-2">
                                {adminStoryPreviewRows.map((row) => (
                                    <li
                                        key={`story-prev-${row.galleryIndex}`}
                                        className="relative aspect-square overflow-hidden rounded-md border border-zinc-700 bg-zinc-950"
                                    >
                                        <span className="absolute left-0.5 top-0.5 z-10 rounded bg-amber-600/90 px-1 py-0.5 text-[8px] font-bold uppercase text-zinc-950">
                                            Hikâye
                                        </span>
                                        <button
                                            type="button"
                                            disabled={removingPromoIndex === row.galleryIndex}
                                            onClick={() => removePromoGalleryItem(row.galleryIndex)}
                                            className="absolute right-0.5 top-0.5 z-10 rounded bg-red-600/90 px-1.5 py-0.5 text-[10px] font-bold text-white hover:bg-red-500 disabled:opacity-50"
                                            title="Bu öğeyi kaldır"
                                        >
                                            ×
                                        </button>
                                        {storageUrl(row.video_path) ? (
                                            <video
                                                src={storageUrl(row.video_path) ?? ''}
                                                controls
                                                playsInline
                                                className="h-full w-full object-cover"
                                                poster={storageUrl(row.poster_path) ?? undefined}
                                            />
                                        ) : storageUrl(row.poster_path) ? (
                                            <img
                                                src={storageUrl(row.poster_path) ?? ''}
                                                alt=""
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <div className="flex h-full items-center justify-center p-1 text-center text-[9px] text-zinc-500">
                                                {row.embed_url?.includes('instagram.com') ? 'IG' : '—'}
                                            </div>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ) : null}

                    {adminPostPreviewRows.length > 0 ? (
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-fuchsia-300/90">Gönderiler</p>
                            <ul className="mt-2 grid list-none grid-cols-3 gap-1 sm:grid-cols-4 sm:gap-2">
                                {adminPostPreviewRows.map((row) => (
                                    <li
                                        key={`post-prev-${row.galleryIndex}`}
                                        className="relative aspect-square overflow-hidden rounded-md border border-zinc-700 bg-zinc-950"
                                    >
                                        <span className="absolute left-0.5 top-0.5 z-10 rounded bg-fuchsia-600/90 px-1 py-0.5 text-[8px] font-bold uppercase text-white">
                                            Gönderi
                                        </span>
                                        <button
                                            type="button"
                                            disabled={removingPromoIndex === row.galleryIndex}
                                            onClick={() => removePromoGalleryItem(row.galleryIndex)}
                                            className="absolute right-0.5 top-0.5 z-10 rounded bg-red-600/90 px-1.5 py-0.5 text-[10px] font-bold text-white hover:bg-red-500 disabled:opacity-50"
                                            title="Bu öğeyi kaldır"
                                        >
                                            ×
                                        </button>
                                        {storageUrl(row.video_path) ? (
                                            <video
                                                src={storageUrl(row.video_path) ?? ''}
                                                controls
                                                playsInline
                                                className="h-full w-full object-cover"
                                                poster={storageUrl(row.poster_path) ?? undefined}
                                            />
                                        ) : storageUrl(row.poster_path) ? (
                                            <img
                                                src={storageUrl(row.poster_path) ?? ''}
                                                alt=""
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <div className="flex h-full items-center justify-center p-1 text-center text-[9px] text-zinc-500">
                                                {row.embed_url?.includes('instagram.com') ? 'IG' : '—'}
                                            </div>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ) : null}

                    {adminPromoGalleryRows.some((r) => r.embed_url) ? (
                        <p className="text-[10px] text-zinc-500">
                            {adminPromoGalleryRows
                                .map((r) => r.embed_url)
                                .filter(Boolean)
                                .slice(0, 4)
                                .join(' · ')}
                            {adminPromoGalleryRows.filter((r) => r.embed_url).length > 4 ? '…' : ''}
                        </p>
                    ) : null}
                    <button
                        type="button"
                        onClick={clearPromoFromServer}
                        className="text-sm font-medium text-red-400 hover:text-red-300"
                    >
                        Tüm tanıtımları kaldır
                    </button>
                </div>
            )}
        </div>
    );
}
