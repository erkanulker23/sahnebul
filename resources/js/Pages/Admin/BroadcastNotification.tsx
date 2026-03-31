import { AdminPageHeader } from '@/Components/Admin';
import AdminLayout from '@/Layouts/AdminLayout';
import SeoHead from '@/Components/SeoHead';
import { cn } from '@/lib/cn';
import { safeRoute } from '@/lib/safeRoute';
import { useForm, usePage } from '@inertiajs/react';

interface AudienceOption {
    value: string;
    label: string;
    description: string;
    recipient_count: number;
}

interface Props {
    audiences: AudienceOption[];
}

export default function AdminBroadcastNotification({ audiences }: Readonly<Props>) {
    const flash = (usePage().props as { flash?: { success?: string; error?: string } }).flash;
    const firstAudience = audiences[0]?.value ?? 'browser_opt_in';

    const { data, setData, post, processing, errors, reset } = useForm({
        title: '',
        message: '',
        action_url: '',
        audience: firstAudience,
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(safeRoute('admin.notifications.broadcast.store'), {
            preserveScroll: true,
            onSuccess: () => reset('title', 'message', 'action_url'),
        });
    };

    return (
        <AdminLayout>
            <SeoHead title="Üye bildirimi - Admin | Sahnebul" description="Toplu bildirim gönderimi." noindex />

            <div className="space-y-6">
                <AdminPageHeader
                    title="Üye bildirimi gönder"
                    description="Kullanıcıların «Bildirimler» sayfasına kaydedilir. Tarayıcı veya PWA için izin vermiş olanlar, sayfa veya uygulama açıkken sistem bildiriminde de görebilir (periyodik kontrol)."
                />

                {flash?.success ? (
                    <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-200">
                        {flash.success}
                    </p>
                ) : null}
                {flash?.error ? (
                    <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-800 dark:text-red-200">{flash.error}</p>
                ) : null}

                <form onSubmit={submit} className="max-w-2xl space-y-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
                    <div>
                        <p className="text-sm font-semibold text-zinc-900 dark:text-white">Hedef kitle</p>
                        <div className="mt-3 space-y-3">
                            {audiences.map((a) => (
                                <label
                                    key={a.value}
                                    className={cn(
                                        'flex cursor-pointer gap-3 rounded-xl border p-4 transition',
                                        data.audience === a.value
                                            ? 'border-amber-500/50 bg-amber-500/5 ring-1 ring-amber-500/30 dark:bg-amber-500/10'
                                            : 'border-zinc-200 hover:border-zinc-300 dark:border-zinc-700 dark:hover:border-zinc-600',
                                    )}
                                >
                                    <input
                                        type="radio"
                                        name="audience"
                                        value={a.value}
                                        checked={data.audience === a.value}
                                        onChange={() => setData('audience', a.value)}
                                        className="mt-1 border-zinc-300 text-amber-600 focus:ring-amber-500"
                                    />
                                    <span className="min-w-0">
                                        <span className="font-medium text-zinc-900 dark:text-white">{a.label}</span>
                                        <span className="ml-2 tabular-nums text-sm text-amber-700 dark:text-amber-400">({a.recipient_count})</span>
                                        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{a.description}</p>
                                    </span>
                                </label>
                            ))}
                        </div>
                        {errors.audience ? <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.audience}</p> : null}
                    </div>

                    <div>
                        <label htmlFor="bn-title" className="block text-sm font-medium text-zinc-800 dark:text-zinc-200">
                            Başlık <span className="font-normal text-zinc-500">(isteğe bağlı)</span>
                        </label>
                        <input
                            id="bn-title"
                            type="text"
                            value={data.title}
                            onChange={(e) => setData('title', e.target.value)}
                            className="mt-1.5 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-zinc-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-zinc-600 dark:bg-zinc-950 dark:text-white"
                            placeholder="Örn. Yeni etkinlikler"
                            maxLength={120}
                        />
                        {errors.title ? <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.title}</p> : null}
                    </div>

                    <div>
                        <label htmlFor="bn-message" className="block text-sm font-medium text-zinc-800 dark:text-zinc-200">
                            Mesaj <span className="text-red-600">*</span>
                        </label>
                        <textarea
                            id="bn-message"
                            required
                            rows={5}
                            value={data.message}
                            onChange={(e) => setData('message', e.target.value)}
                            className="mt-1.5 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-zinc-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-zinc-600 dark:bg-zinc-950 dark:text-white"
                            placeholder="Kullanıcılara gösterilecek metin"
                            maxLength={2000}
                        />
                        {errors.message ? <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.message}</p> : null}
                    </div>

                    <div>
                        <label htmlFor="bn-url" className="block text-sm font-medium text-zinc-800 dark:text-zinc-200">
                            İç bağlantı <span className="font-normal text-zinc-500">(isteğe bağlı)</span>
                        </label>
                        <input
                            id="bn-url"
                            type="text"
                            value={data.action_url}
                            onChange={(e) => setData('action_url', e.target.value)}
                            className="mt-1.5 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 font-mono text-sm text-zinc-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-zinc-600 dark:bg-zinc-950 dark:text-white"
                            placeholder="/etkinlikler"
                        />
                        <p className="mt-1 text-xs text-zinc-500">Yalnızca site içi yol: / ile başlamalı (harici adres yok).</p>
                        {errors.action_url ? <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.action_url}</p> : null}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 border-t border-zinc-200 pt-6 dark:border-zinc-800">
                        <button
                            type="submit"
                            disabled={processing || data.message.trim() === ''}
                            className="rounded-xl bg-amber-500 px-5 py-2.5 font-semibold text-zinc-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {processing ? 'Gönderiliyor…' : 'Bildirimi gönder'}
                        </button>
                    </div>
                </form>
            </div>
        </AdminLayout>
    );
}
