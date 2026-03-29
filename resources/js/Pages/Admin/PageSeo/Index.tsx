import PrimaryButton from '@/Components/PrimaryButton';
import { inputBaseClass } from '@/Components/ui/Input';
import AdminLayout from '@/Layouts/AdminLayout';
import SeoHead from '@/Components/SeoHead';
import { cn } from '@/lib/cn';
import { useForm } from '@inertiajs/react';
import { FormEventHandler, useMemo } from 'react';

interface PageRow {
    key: string;
    label: string;
    variables: string;
    title: string;
    description: string;
    suggested_title: string;
    suggested_description: string;
}

interface Props {
    pages: PageRow[];
}

export default function AdminPageSeoIndex({ pages }: Readonly<Props>) {
    const initial = useMemo(() => {
        const o: Record<string, { title: string; description: string }> = {};
        for (const p of pages) {
            o[p.key] = { title: p.title, description: p.description };
        }
        return { page_seo: o };
    }, [pages]);

    const { data, setData, post, processing } = useForm(initial);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('admin.page-seo.update'));
    };

    const field = cn('mt-1', inputBaseClass);
    const lbl = 'block text-sm font-medium text-zinc-700 dark:text-zinc-300';

    return (
        <AdminLayout>
            <SeoHead title="Sayfa SEO | Admin" description="Şablon başlık ve meta açıklamaları." noindex />
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">SEO — sayfa şablonları</h1>
                    <p className="mt-2 max-w-3xl text-sm text-zinc-600 dark:text-zinc-400">
                        Boş bıraktığınız alanlarda önce bu sayfadaki kayıtlı metin, yoksa yapılandırma dosyasındaki önerilen şablon, o da yoksa kod içi yedek
                        kullanılır. Süslü parantez içi etiketler yayında değiştirilir (ör.{' '}
                        <code className="rounded bg-zinc-200 px-1 text-xs dark:bg-zinc-800">{'{event_title}'}</code>).
                    </p>
                </div>

                <form onSubmit={submit} className="space-y-8">
                    {pages.map((p) => {
                        const row = data.page_seo[p.key] ?? { title: '', description: '' };
                        return (
                            <fieldset
                                key={p.key}
                                className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/50 sm:p-6"
                            >
                                <legend className="px-1 text-lg font-semibold text-zinc-900 dark:text-white">{p.label}</legend>
                                <p className="mt-1 text-xs text-zinc-500">Değişkenler: {p.variables}</p>
                                {(p.suggested_title.trim() !== '' || p.suggested_description.trim() !== '') && (
                                    <button
                                        type="button"
                                        className="mt-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-sm font-medium text-amber-900 transition hover:bg-amber-500/20 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200 dark:hover:bg-amber-500/20"
                                        onClick={() =>
                                            setData('page_seo', {
                                                ...data.page_seo,
                                                [p.key]: {
                                                    title: p.suggested_title.trim() !== '' ? p.suggested_title : row.title,
                                                    description:
                                                        p.suggested_description.trim() !== '' ? p.suggested_description : row.description,
                                                },
                                            })
                                        }
                                    >
                                        SEO uyumlu doldur
                                    </button>
                                )}
                                <div className="mt-4 space-y-3">
                                    <div>
                                        <label className={lbl} htmlFor={`seo-title-${p.key}`}>
                                            Başlık şablonu
                                        </label>
                                        <input
                                            id={`seo-title-${p.key}`}
                                            className={field}
                                            value={row.title}
                                            onChange={(e) =>
                                                setData('page_seo', {
                                                    ...data.page_seo,
                                                    [p.key]: { ...row, title: e.target.value },
                                                })
                                            }
                                            placeholder="Boş = kod varsayılanı"
                                        />
                                    </div>
                                    <div>
                                        <label className={lbl} htmlFor={`seo-desc-${p.key}`}>
                                            Meta açıklama şablonu
                                        </label>
                                        <textarea
                                            id={`seo-desc-${p.key}`}
                                            className={cn(field, 'min-h-[5rem]')}
                                            value={row.description}
                                            onChange={(e) =>
                                                setData('page_seo', {
                                                    ...data.page_seo,
                                                    [p.key]: { ...row, description: e.target.value },
                                                })
                                            }
                                            rows={3}
                                            placeholder="Boş = kod varsayılanı"
                                        />
                                    </div>
                                </div>
                            </fieldset>
                        );
                    })}
                    <PrimaryButton disabled={processing}>Kaydet</PrimaryButton>
                </form>
            </div>
        </AdminLayout>
    );
}
