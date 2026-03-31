import { AdminPageHeader } from '@/Components/Admin';
import FlashMessage from '@/Components/FlashMessage';
import InputError from '@/Components/InputError';
import SeoHead from '@/Components/SeoHead';
import { inputBaseClass } from '@/Components/ui/Input';
import AdminLayout from '@/Layouts/AdminLayout';
import { cn } from '@/lib/cn';
import { safeRoute } from '@/lib/safeRoute';
import { Link, useForm, usePage } from '@inertiajs/react';
import { ExternalLink } from 'lucide-react';
import { FormEvent } from 'react';

interface Props {
    seo_google_site_verification: string;
    seo_yandex_verification: string;
    seo_bing_verification: string;
    custom_head_html: string;
    custom_body_html: string;
}

export default function AdminVerificationAndScripts({
    seo_google_site_verification,
    seo_yandex_verification,
    seo_bing_verification,
    custom_head_html,
    custom_body_html,
}: Readonly<Props>) {
    const page = usePage();
    const appUrl = ((page.props as { seo?: { appUrl?: string } }).seo?.appUrl ?? '').replace(/\/$/, '');
    const errors = (page.props as { errors?: Record<string, string> }).errors ?? {};

    const form = useForm({
        seo_google_site_verification,
        seo_yandex_verification,
        seo_bing_verification,
        custom_head_html,
        custom_body_html,
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.post(safeRoute('admin.verification-scripts.update'), { preserveScroll: true });
    };

    const homePreview = appUrl ? `${appUrl}/` : '/';

    const labelClass = 'block text-sm font-medium text-zinc-700 dark:text-zinc-300';
    const inputClass = cn('mt-1 max-w-xl', inputBaseClass);
    const textareaClass = cn(
        'mt-1 max-w-3xl font-mono text-xs leading-relaxed',
        inputBaseClass,
        'min-h-[140px] resize-y',
    );

    return (
        <AdminLayout>
            <SeoHead title="Doğrulama ve özel kodlar" noindex />
            <FlashMessage />
            <div className="space-y-6">
                <AdminPageHeader
                    title="Doğrulama ve özel kodlar"
                    description="Arama motoru site sahipliği meta etiketleri ile ön yüzde çalışacak Analytics, GTM veya diğer üçüncü taraf snippet’leri. Yalnızca güvenilir kod yapıştırın."
                    actions={
                        <Link
                            href={safeRoute('admin.settings.index')}
                            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                        >
                            ← Genel ayarlara dön
                        </Link>
                    }
                />

                <div className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-300">
                    <p className="font-medium text-zinc-900 dark:text-white">Ön yüzde nereye yazılır?</p>
                    <ul className="mt-2 list-inside list-disc space-y-1 text-zinc-600 dark:text-zinc-400">
                        <li>
                            Doğrulama değerleri, tüm sayfalarda{' '}
                            <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">google-site-verification</code>,{' '}
                            <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">yandex-verification</code>,{' '}
                            <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">msvalidate.01</code> meta olarak eklenir.
                        </li>
                        <li>
                            «Head içi kod» — Vite ve Inertia head bölümünden hemen sonra (Google Analytics’in verdiği{' '}
                            <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">&lt;script&gt;</code> buraya).
                        </li>
                        <li>«Gövde sonu kod» — React kökünden sonra, kapanan body öncesi (ör. GTM noscript).</li>
                    </ul>
                    <a
                        href={homePreview}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center gap-1.5 text-amber-700 hover:text-amber-600 hover:underline dark:text-amber-400"
                    >
                        Ana sayfayı kaynak görünümünde kontrol et
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                    </a>
                </div>

                <form onSubmit={submit} className="max-w-4xl space-y-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/60">
                    <section className="space-y-4">
                        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Site sahipliği doğrulama</h2>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                            Konsollarda verilen meta <strong className="font-medium text-zinc-800 dark:text-zinc-200">content</strong> değerini girin
                            — yalnız tırnak içindeki kod, örn. Yandex için{' '}
                            <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">8a9797528a6428f7</code>. Tüm{' '}
                            <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">&lt;meta … /&gt;</code> satırını yapıştırsanız bile kayıt
                            sırasında otomatik ayıklanır.
                        </p>

                        <div>
                            <label htmlFor="v-google" className={labelClass}>
                                Google Search Console
                            </label>
                            <input
                                id="v-google"
                                value={form.data.seo_google_site_verification}
                                onChange={(e) => form.setData('seo_google_site_verification', e.target.value)}
                                className={inputClass}
                                placeholder="Meta content değeri"
                                autoComplete="off"
                            />
                            <InputError message={errors.seo_google_site_verification} className="mt-1" />
                        </div>

                        <div>
                            <label htmlFor="v-yandex" className={labelClass}>
                                Yandex Webmaster
                            </label>
                            <input
                                id="v-yandex"
                                value={form.data.seo_yandex_verification}
                                onChange={(e) => form.setData('seo_yandex_verification', e.target.value)}
                                className={inputClass}
                                placeholder="Örn. 8a9797528a6428f7 (veya konsoldaki meta satırının tamamı)"
                                autoComplete="off"
                            />
                            <InputError message={errors.seo_yandex_verification} className="mt-1" />
                        </div>

                        <div>
                            <label htmlFor="v-bing" className={labelClass}>
                                Bing Webmaster
                            </label>
                            <input
                                id="v-bing"
                                value={form.data.seo_bing_verification}
                                onChange={(e) => form.setData('seo_bing_verification', e.target.value)}
                                className={inputClass}
                                placeholder="msvalidate.01 content"
                                autoComplete="off"
                            />
                            <InputError message={errors.seo_bing_verification} className="mt-1" />
                        </div>
                    </section>

                    <section className="space-y-4 border-t border-zinc-200 pt-8 dark:border-zinc-700">
                        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Özel script / HTML</h2>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                            Ham HTML olarak yapıştırın. Süper yönetici hesabı bu alanı değiştirebilir; kötü amaçlı kod XSS riski taşır.
                        </p>

                        <div>
                            <label htmlFor="custom-head" className={labelClass}>
                                Head içi kod (Analytics, gtag, GTM script vb.)
                            </label>
                            <textarea
                                id="custom-head"
                                value={form.data.custom_head_html}
                                onChange={(e) => form.setData('custom_head_html', e.target.value)}
                                className={textareaClass}
                                rows={8}
                                spellCheck={false}
                                placeholder="Örn. Google etiket yöneticisinden kopyalanan &lt;script&gt;...&lt;/script&gt;"
                            />
                            <InputError message={errors.custom_head_html} className="mt-1" />
                        </div>

                        <div>
                            <label htmlFor="custom-body" className={labelClass}>
                                Gövde sonu kod
                            </label>
                            <textarea
                                id="custom-body"
                                value={form.data.custom_body_html}
                                onChange={(e) => form.setData('custom_body_html', e.target.value)}
                                className={textareaClass}
                                rows={6}
                                spellCheck={false}
                                placeholder="Örn. &lt;noscript&gt;...&lt;/noscript&gt; veya canlı destek widget'ı"
                            />
                            <InputError message={errors.custom_body_html} className="mt-1" />
                        </div>
                    </section>

                    <div className="flex flex-wrap gap-3 border-t border-zinc-200 pt-6 dark:border-zinc-700">
                        <button
                            type="submit"
                            disabled={form.processing}
                            className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-amber-400 disabled:opacity-60"
                        >
                            {form.processing ? 'Kaydediliyor…' : 'Kaydet'}
                        </button>
                    </div>
                </form>
            </div>
        </AdminLayout>
    );
}
