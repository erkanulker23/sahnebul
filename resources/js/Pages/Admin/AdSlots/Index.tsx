import AdminLayout from '@/Layouts/AdminLayout';
import SeoHead from '@/Components/SeoHead';
import { useForm } from '@inertiajs/react';
import { useEffect } from 'react';

interface PlacementDef {
    key: string;
    label: string;
    description: string;
}

interface SlotRow {
    enabled: boolean;
    type: 'banner' | 'adsense' | 'custom_html';
    image_url: string;
    link_url: string;
    alt: string;
    title: string;
    html: string;
}

interface Props {
    placements: PlacementDef[];
    slots: Record<string, SlotRow>;
}

const fieldClass =
    'mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder:text-zinc-500';

export default function AdminAdSlotsIndex({ placements, slots: slotsProp }: Readonly<Props>) {
    const { data, setData, post, processing } = useForm({
        slots: slotsProp,
    });

    useEffect(() => {
        setData('slots', slotsProp);
    }, [slotsProp, setData]);

    const patchSlot = (key: string, patch: Partial<SlotRow>) => {
        const cur = data.slots[key] ?? slotsProp[key];
        if (!cur) return;
        setData('slots', {
            ...data.slots,
            [key]: { ...cur, ...patch },
        });
    };

    const save = () => {
        post(route('admin.ad-slots.update'));
    };

    return (
        <AdminLayout>
            <SeoHead title="Reklam alanları - Admin | Sahnebul" description="Yerleşim bazlı reklam ve AdSense yönetimi." noindex />

            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-white">Reklam alanları</h1>
                    <p className="mt-2 max-w-3xl text-sm text-zinc-400">
                        Her alan sitede sabit bir konuma bağlıdır. <strong className="text-zinc-300">Banner</strong> için görsel URL ve isteğe bağlı
                        tıklama linki kullanın. <strong className="text-zinc-300">Google AdSense</strong> veya özel kod için{' '}
                        <strong className="text-zinc-300">AdSense / özel HTML</strong> seçip reklam sağlayıcınızın verdiği kodu (script dahil) yapıştırın.
                    </p>
                </div>

                <div className="space-y-4">
                    {placements.map((p) => {
                        const row = data.slots[p.key];
                        if (!row) return null;
                        return (
                            <details
                                key={p.key}
                                className="group rounded-lg border border-zinc-800 bg-zinc-900 open:border-amber-500/25 open:ring-1 open:ring-amber-500/10"
                            >
                                <summary className="cursor-pointer list-none px-4 py-3 [&::-webkit-details-marker]:hidden">
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                            <p className="font-semibold text-white">{p.label}</p>
                                            <p className="mt-1 text-xs text-zinc-500">{p.description}</p>
                                            <p className="mt-1 font-mono text-[10px] text-amber-500/80">slot: {p.key}</p>
                                        </div>
                                        <label className="flex shrink-0 cursor-pointer items-center gap-2 text-sm text-zinc-300">
                                            <input
                                                type="checkbox"
                                                checked={row.enabled}
                                                onClick={(e) => e.stopPropagation()}
                                                onChange={(e) => patchSlot(p.key, { enabled: e.target.checked })}
                                                className="h-4 w-4 rounded border-zinc-600 text-amber-500"
                                            />
                                            Aktif
                                        </label>
                                    </div>
                                </summary>
                                <div className="border-t border-zinc-800 px-4 py-4 space-y-4">
                                    <div>
                                        <label className="block text-xs font-medium text-zinc-400">Tür</label>
                                        <select
                                            className={fieldClass}
                                            value={row.type}
                                            onChange={(e) => patchSlot(p.key, { type: e.target.value as SlotRow['type'] })}
                                        >
                                            <option value="banner">Görsel banner (URL + link)</option>
                                            <option value="adsense">Google AdSense / script kodu</option>
                                            <option value="custom_html">Özel HTML (iframe, başka ağlar)</option>
                                        </select>
                                    </div>

                                    {row.type === 'banner' && (
                                        <div className="grid gap-3 sm:grid-cols-2">
                                            <div className="sm:col-span-2">
                                                <label className="block text-xs font-medium text-zinc-400">Görsel URL</label>
                                                <input
                                                    type="url"
                                                    className={fieldClass}
                                                    value={row.image_url}
                                                    onChange={(e) => patchSlot(p.key, { image_url: e.target.value })}
                                                    placeholder="https://… veya /storage/…"
                                                />
                                            </div>
                                            <div className="sm:col-span-2">
                                                <label className="block text-xs font-medium text-zinc-400">Tıklanınca gidilecek link (isteğe bağlı)</label>
                                                <input
                                                    type="url"
                                                    className={fieldClass}
                                                    value={row.link_url}
                                                    onChange={(e) => patchSlot(p.key, { link_url: e.target.value })}
                                                    placeholder="https://…"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-zinc-400">Alt metin</label>
                                                <input
                                                    type="text"
                                                    className={fieldClass}
                                                    value={row.alt}
                                                    onChange={(e) => patchSlot(p.key, { alt: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-zinc-400">Başlık (banner üzerinde kullanılmaz; not)</label>
                                                <input
                                                    type="text"
                                                    className={fieldClass}
                                                    value={row.title}
                                                    onChange={(e) => patchSlot(p.key, { title: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {(row.type === 'adsense' || row.type === 'custom_html') && (
                                        <div>
                                            <label className="block text-xs font-medium text-zinc-400">HTML / script</label>
                                            <textarea
                                                className={`${fieldClass} font-mono text-xs`}
                                                rows={10}
                                                value={row.html}
                                                onChange={(e) => patchSlot(p.key, { html: e.target.value })}
                                                placeholder="AdSense veya diğer ağların verdiği &lt;script&gt; ve &lt;ins&gt; kodunu buraya yapıştırın."
                                            />
                                        </div>
                                    )}
                                </div>
                            </details>
                        );
                    })}
                </div>

                <button
                    type="button"
                    onClick={save}
                    disabled={processing}
                    className="rounded-lg bg-amber-500 px-5 py-2.5 font-semibold text-zinc-950 disabled:opacity-50"
                >
                    {processing ? 'Kaydediliyor…' : 'Tümünü kaydet'}
                </button>
            </div>
        </AdminLayout>
    );
}
