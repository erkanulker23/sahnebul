import AdminLayout from '@/Layouts/AdminLayout';
import InputError from '@/Components/InputError';
import RichTextEditor from '@/Components/RichTextEditor';
import SeoHead from '@/Components/SeoHead';
import { Link, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

export default function AdminSubscriptionCreate() {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        membership_type: 'venue' as 'venue' | 'artist',
        interval: 'monthly' as 'monthly' | 'yearly',
        trial_days: 0 as 0 | 7 | 14,
        price: '',
        features: '',
        is_active: true,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('admin.subscriptions.store'));
    };

    return (
        <AdminLayout>
            <SeoHead title="Yeni üyelik paketi | Admin" description="Üyelik planı oluşturun." noindex />
            <div className="space-y-6">
                <Link href={route('admin.subscriptions.index')} className="text-sm text-amber-400 hover:text-amber-300">
                    ← Paket listesine dön
                </Link>
                <h1 className="mt-6 text-2xl font-bold text-white">Yeni üyelik paketi</h1>

                <form onSubmit={submit} className="mt-8 max-w-2xl space-y-4 rounded-xl border border-zinc-800 bg-zinc-900 p-6">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-zinc-300">
                            Paket adı
                        </label>
                        <input
                            id="name"
                            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            required
                        />
                        <InputError message={errors.name} className="mt-1" />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label htmlFor="membership_type" className="block text-sm font-medium text-zinc-300">
                                Üyelik türü
                            </label>
                            <select
                                id="membership_type"
                                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                                value={data.membership_type}
                                onChange={(e) => setData('membership_type', e.target.value as 'venue' | 'artist')}
                            >
                                <option value="venue">Mekan</option>
                                <option value="artist">Sanatçı</option>
                            </select>
                            <InputError message={errors.membership_type} className="mt-1" />
                        </div>
                        <div>
                            <label htmlFor="interval" className="block text-sm font-medium text-zinc-300">
                                Periyot
                            </label>
                            <select
                                id="interval"
                                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                                value={data.interval}
                                onChange={(e) => setData('interval', e.target.value as 'monthly' | 'yearly')}
                            >
                                <option value="monthly">Aylık</option>
                                <option value="yearly">Yıllık</option>
                            </select>
                            <InputError message={errors.interval} className="mt-1" />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="trial_days" className="block text-sm font-medium text-zinc-300">
                            Deneme süresi
                        </label>
                        <p className="mt-0.5 text-xs text-zinc-500">
                            Deneme bittikten sonra seçilen periyot (aylık/yıllık) ücretli dönem olarak eklenir.
                        </p>
                        <select
                            id="trial_days"
                            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                            value={data.trial_days}
                            onChange={(e) => setData('trial_days', Number(e.target.value) as 0 | 7 | 14)}
                        >
                            <option value={0}>Başlangıç — deneme yok, hemen ücretli dönem</option>
                            <option value={7}>7 gün deneme</option>
                            <option value={14}>14 gün deneme</option>
                        </select>
                        <InputError message={errors.trial_days} className="mt-1" />
                    </div>
                    <div>
                        <label htmlFor="price" className="block text-sm font-medium text-zinc-300">
                            Fiyat (₺)
                        </label>
                        <input
                            id="price"
                            type="number"
                            step="0.01"
                            min={0}
                            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                            value={data.price}
                            onChange={(e) => setData('price', e.target.value)}
                            required
                        />
                        <InputError message={errors.price} className="mt-1" />
                    </div>
                    <div>
                        <span className="block text-sm font-medium text-zinc-300">Özellikler</span>
                        <p className="mt-0.5 text-xs text-zinc-500">Blog yazılarındaki gibi zengin metin; madde listesi, kalın vb. kullanabilirsiniz.</p>
                        <RichTextEditor
                            value={data.features}
                            onChange={(html) => setData('features', html)}
                            placeholder="Paket özelliklerini yazın…"
                            className="mt-2"
                        />
                        <InputError message={errors.features} className="mt-1" />
                    </div>
                    <div className="flex items-center gap-2 text-sm text-zinc-300">
                        <input
                            id="is_active"
                            type="checkbox"
                            checked={data.is_active}
                            onChange={(e) => setData('is_active', e.target.checked)}
                            className="rounded border-zinc-600"
                        />
                        <label htmlFor="is_active">Aktif</label>
                    </div>
                    <button
                        type="submit"
                        disabled={processing}
                        className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-amber-400 disabled:opacity-50"
                    >
                        Paketi ekle
                    </button>
                </form>
            </div>
        </AdminLayout>
    );
}
