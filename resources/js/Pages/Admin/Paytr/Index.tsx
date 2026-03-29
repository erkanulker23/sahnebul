import PrimaryButton from '@/Components/PrimaryButton';
import Checkbox from '@/Components/Checkbox';
import { inputBaseClass } from '@/Components/ui/Input';
import AdminLayout from '@/Layouts/AdminLayout';
import SeoHead from '@/Components/SeoHead';
import { cn } from '@/lib/cn';
import { Link, useForm, router } from '@inertiajs/react';
import { FormEventHandler } from 'react';

interface PaytrProps {
    enabled: boolean;
    test_mode: boolean;
    merchant_id: string;
    merchant_key_set: boolean;
    merchant_salt_set: boolean;
}

interface Props {
    paytr: PaytrProps;
    callbackUrl: string;
}

export default function AdminPaytrIndex({ paytr, callbackUrl }: Readonly<Props>) {
    const { data, setData, post, processing } = useForm({
        paytr_enabled: paytr.enabled,
        paytr_test_mode: paytr.test_mode,
        paytr_merchant_id: paytr.merchant_id,
        paytr_merchant_key: '',
        paytr_merchant_salt: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('admin.paytr.update'));
    };

    const field = cn('mt-1 max-w-xl', inputBaseClass);
    const lbl = 'block text-sm font-medium text-zinc-700 dark:text-zinc-300';

    return (
        <AdminLayout>
            <SeoHead title="PayTR | Admin" description="Direkt API mağaza ayarları." noindex />
            <div className="space-y-6">
                <div>
                    <Link href={route('admin.settings.index')} className="text-sm text-amber-700 hover:text-amber-600 dark:text-amber-400">
                        ← Ayarlara dön
                    </Link>
                    <h1 className="mt-4 text-2xl font-bold text-zinc-900 dark:text-white">PayTR — Direkt API</h1>
                    <p className="mt-2 max-w-3xl text-sm text-zinc-600 dark:text-zinc-400">
                        Mağaza panelinden alınan bilgiler. Bildirim URL (2. adım) PayTR panelinde tam olarak şu adres olmalıdır (POST):
                    </p>
                    <code className="mt-2 block max-w-3xl break-all rounded-lg bg-zinc-100 px-3 py-2 text-xs text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                        {callbackUrl}
                    </code>
                    <p className="mt-2 text-xs text-zinc-500">
                        <a
                            href="https://dev.paytr.com/direkt-api"
                            className="text-amber-600 hover:underline dark:text-amber-400"
                            target="_blank"
                            rel="noreferrer"
                        >
                            PayTR Direkt API dokümantasyonu
                        </a>
                    </p>
                </div>

                <form onSubmit={submit} className="max-w-xl space-y-4 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/50">
                    <label className="flex items-center gap-2 text-sm text-zinc-800 dark:text-zinc-200">
                        <Checkbox
                            name="paytr_enabled"
                            checked={data.paytr_enabled}
                            onChange={(e) => setData('paytr_enabled', Boolean(e.target.checked))}
                        />
                        Ödeme sistemi aktif
                    </label>
                    <label className="flex items-center gap-2 text-sm text-zinc-800 dark:text-zinc-200">
                        <Checkbox
                            name="paytr_test_mode"
                            checked={data.paytr_test_mode}
                            onChange={(e) => setData('paytr_test_mode', Boolean(e.target.checked))}
                        />
                        Test modu (canlı mağazada test işlemi)
                    </label>
                    <div>
                        <label htmlFor="mid" className={lbl}>
                            Mağaza numarası (merchant_id)
                        </label>
                        <input
                            id="mid"
                            className={field}
                            value={data.paytr_merchant_id}
                            onChange={(e) => setData('paytr_merchant_id', e.target.value)}
                            autoComplete="off"
                        />
                    </div>
                    <div>
                        <label htmlFor="mkey" className={lbl}>
                            Mağaza parolası (merchant_key)
                        </label>
                        <input
                            id="mkey"
                            type="password"
                            className={field}
                            value={data.paytr_merchant_key}
                            onChange={(e) => setData('paytr_merchant_key', e.target.value)}
                            placeholder={paytr.merchant_key_set ? '•••••••• (değiştirmek için doldurun)' : ''}
                            autoComplete="new-password"
                        />
                    </div>
                    <div>
                        <label htmlFor="msalt" className={lbl}>
                            Mağaza gizli anahtarı (merchant_salt)
                        </label>
                        <input
                            id="msalt"
                            type="password"
                            className={field}
                            value={data.paytr_merchant_salt}
                            onChange={(e) => setData('paytr_merchant_salt', e.target.value)}
                            placeholder={paytr.merchant_salt_set ? '•••••••• (değiştirmek için doldurun)' : ''}
                            autoComplete="new-password"
                        />
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <PrimaryButton disabled={processing}>Kaydet</PrimaryButton>
                        <button
                            type="button"
                            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                            onClick={() => router.post(route('admin.paytr.validate-local'))}
                        >
                            Yerel token doğrula
                        </button>
                    </div>
                </form>
            </div>
        </AdminLayout>
    );
}
