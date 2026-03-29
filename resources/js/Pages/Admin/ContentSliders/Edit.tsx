import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import Checkbox from '@/Components/Checkbox';
import { inputBaseClass } from '@/Components/ui/Input';
import AdminLayout from '@/Layouts/AdminLayout';
import SeoHead from '@/Components/SeoHead';
import { cn } from '@/lib/cn';
import { safeRoute } from '@/lib/safeRoute';
import { Link, useForm } from '@inertiajs/react';
import { FormEventHandler, useMemo } from 'react';

const PLACEMENT_HOME_HERO = 'home_hero';
const PLACEMENT_FEATURED = 'featured';

interface Slider {
    id: number;
    placement: string;
    title: string;
    subtitle: string | null;
    link_url: string | null;
    hero_eyebrow: string | null;
    hero_headline: string | null;
    hero_headline_accent: string | null;
    hero_body: string | null;
    image_path: string;
    sort_order: number;
    is_active: boolean;
}

interface Props {
    slider: Slider | null;
}

export default function AdminContentSliderEdit({ slider }: Readonly<Props>) {
    const isEdit = slider !== null;

    const defaultPlacement = useMemo(() => {
        if (slider?.placement === PLACEMENT_HOME_HERO || slider?.placement === PLACEMENT_FEATURED) {
            return slider.placement;
        }
        return PLACEMENT_FEATURED;
    }, [slider]);

    const { data, setData, post, processing, errors } = useForm({
        placement: defaultPlacement,
        title: slider?.title ?? '',
        subtitle: slider?.subtitle ?? '',
        link_url: slider?.link_url ?? '',
        hero_eyebrow: slider?.hero_eyebrow ?? '',
        hero_headline: slider?.hero_headline ?? '',
        hero_headline_accent: slider?.hero_headline_accent ?? '',
        hero_body: slider?.hero_body ?? '',
        sort_order: slider?.sort_order ?? 0,
        is_active: slider?.is_active ?? true,
        image: null as File | null,
    });

    const isHomeHero = data.placement === PLACEMENT_HOME_HERO;

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        if (isEdit && slider) {
            post(safeRoute('admin.content-sliders.update', { content_slider: slider.id }), { forceFormData: true });
        } else {
            post(safeRoute('admin.content-sliders.store'), { forceFormData: true });
        }
    };

    const field = cn('mt-1', inputBaseClass);
    const lbl = 'block text-sm font-medium text-zinc-700 dark:text-zinc-300';

    return (
        <AdminLayout>
            <SeoHead title={isEdit ? 'Slider düzenle | Admin' : 'Yeni slider | Admin'} description="" noindex />
            <div className="space-y-6">
                <Link
                    href={safeRoute('admin.content-sliders.index')}
                    className="text-sm text-amber-700 hover:text-amber-600 dark:text-amber-400"
                >
                    ← Slider listesi
                </Link>
                <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">{isEdit ? 'Slider düzenle' : 'Yeni slider'}</h1>

                <form onSubmit={submit} className="max-w-xl space-y-4 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/50">
                    <div>
                        <label htmlFor="placement" className={lbl}>
                            Tür
                        </label>
                        <select
                            id="placement"
                            className={field}
                            value={data.placement}
                            onChange={(e) => setData('placement', e.target.value)}
                        >
                            <option value={PLACEMENT_HOME_HERO}>Ana sayfa hero (üst tam genişlik, en fazla 3)</option>
                            <option value={PLACEMENT_FEATURED}>Öne çıkanlar şeridi (hero altı yatay kartlar)</option>
                        </select>
                        <p className="mt-1 text-xs text-zinc-500">
                            Hero slaytları ana sayfa ve /mekanlar üst bölümünde aynı görselleri paylaşır; /mekanlar metinleri Ayarlar → Mekân listesi hero
                            sekmesindedir.
                        </p>
                        <InputError message={errors.placement} className="mt-1" />
                    </div>

                    <div>
                        <label htmlFor="title" className={lbl}>
                            {isHomeHero ? 'İç ad (isteğe bağlı)' : 'Başlık'}
                        </label>
                        <input
                            id="title"
                            className={field}
                            value={data.title}
                            onChange={(e) => setData('title', e.target.value)}
                            required={!isHomeHero}
                            placeholder={isHomeHero ? 'Örn. Kampanya 1' : 'Kart başlığı'}
                        />
                        <InputError message={errors.title} className="mt-1" />
                    </div>

                    {!isHomeHero ? (
                        <>
                            <div>
                                <label htmlFor="subtitle" className={lbl}>
                                    Alt başlık (isteğe bağlı)
                                </label>
                                <input
                                    id="subtitle"
                                    className={field}
                                    value={data.subtitle}
                                    onChange={(e) => setData('subtitle', e.target.value)}
                                />
                                <InputError message={errors.subtitle} className="mt-1" />
                            </div>
                            <div>
                                <label htmlFor="link_url" className={lbl}>
                                    Bağlantı URL (isteğe bağlı)
                                </label>
                                <input
                                    id="link_url"
                                    type="url"
                                    className={field}
                                    value={data.link_url}
                                    onChange={(e) => setData('link_url', e.target.value)}
                                    placeholder="https://"
                                />
                                <InputError message={errors.link_url} className="mt-1" />
                            </div>
                        </>
                    ) : (
                        <div className="space-y-3 rounded-lg border border-amber-500/25 bg-amber-500/5 p-4 dark:border-amber-500/20 dark:bg-amber-500/5">
                            <p className="text-xs font-semibold uppercase tracking-wide text-amber-900 dark:text-amber-300">
                                Ana sayfa (/) — bu slaytın metinleri
                            </p>
                            <div>
                                <label htmlFor="hero_eyebrow" className={lbl}>
                                    Üst etiket (küçük, altın)
                                </label>
                                <input
                                    id="hero_eyebrow"
                                    className={field}
                                    value={data.hero_eyebrow}
                                    onChange={(e) => setData('hero_eyebrow', e.target.value)}
                                    placeholder="Boş = varsayılan"
                                />
                                <InputError message={errors.hero_eyebrow} className="mt-1" />
                            </div>
                            <div>
                                <label htmlFor="hero_headline" className={lbl}>
                                    Ana başlık (beyaz satır)
                                </label>
                                <input
                                    id="hero_headline"
                                    className={field}
                                    value={data.hero_headline}
                                    onChange={(e) => setData('hero_headline', e.target.value)}
                                    placeholder="Boş = varsayılan"
                                />
                                <InputError message={errors.hero_headline} className="mt-1" />
                            </div>
                            <div>
                                <label htmlFor="hero_headline_accent" className={lbl}>
                                    Vurgu satırı (gradient)
                                </label>
                                <input
                                    id="hero_headline_accent"
                                    className={field}
                                    value={data.hero_headline_accent}
                                    onChange={(e) => setData('hero_headline_accent', e.target.value)}
                                    placeholder="Boş = varsayılan"
                                />
                                <InputError message={errors.hero_headline_accent} className="mt-1" />
                            </div>
                            <div>
                                <label htmlFor="hero_body" className={lbl}>
                                    Açıklama paragrafı
                                </label>
                                <textarea
                                    id="hero_body"
                                    className={cn(field, 'min-h-[5rem]')}
                                    value={data.hero_body}
                                    onChange={(e) => setData('hero_body', e.target.value)}
                                    rows={3}
                                    placeholder="Boş = varsayılan"
                                />
                                <InputError message={errors.hero_body} className="mt-1" />
                            </div>
                        </div>
                    )}

                    <div>
                        <label htmlFor="sort_order" className={lbl}>
                            Sıra
                        </label>
                        <input
                            id="sort_order"
                            type="number"
                            min={0}
                            className={field}
                            value={data.sort_order}
                            onChange={(e) => setData('sort_order', Number(e.target.value))}
                        />
                        <InputError message={errors.sort_order} className="mt-1" />
                    </div>
                    <div>
                        <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                            <Checkbox
                                name="is_active"
                                checked={data.is_active}
                                onChange={(e) => setData('is_active', (e.target.checked || false) as false)}
                            />
                            Aktif
                        </label>
                    </div>
                    <div>
                        <InputLabel value={isEdit ? 'Görsel (değiştirmek için yükleyin)' : 'Görsel'} />
                        {isEdit ? (
                            <img src={`/storage/${slider.image_path}`} alt="" className="mt-2 h-24 w-40 rounded-lg object-cover" />
                        ) : null}
                        <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="mt-2 block w-full text-sm"
                            onChange={(e) => setData('image', e.target.files?.[0] ?? null)}
                            required={!isEdit}
                        />
                        <InputError message={errors.image} className="mt-1" />
                    </div>
                    <PrimaryButton disabled={processing}>{isEdit ? 'Kaydet' : 'Oluştur'}</PrimaryButton>
                </form>
            </div>
        </AdminLayout>
    );
}
