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

interface PaytrEnvProps {
    allowImport: boolean;
    presetAvailable: boolean;
}

interface Props {
    paytr: PaytrProps;
    paytrEnv: PaytrEnvProps;
    callbackUrl: string;
}

export default function AdminPaytrIndex({ paytr, paytrEnv, callbackUrl }: Readonly<Props>) {
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
                        PayTR Direkt API için{' '}
                        <strong className="font-medium text-zinc-800 dark:text-zinc-200">mağaza numarası, mağaza parolası ve gizli anahtar her zaman zorunludur</strong>; «Test modu»
                        yalnızca işlemin test amaçlı işaretlenmesi içindir (ortak/demo mağaza şifresi yoktur — bilgileri kendi PayTR mağaza panelinizden alırsınız).
                    </p>
                    <p className="mt-2 max-w-3xl text-xs text-zinc-500 dark:text-zinc-500">
                        Token üretimi ve bildirim doğrulaması bu anahtarlar olmadan çalışmaz. Yerel doğrulama sadece HMAC formülünü test eder; gerçek mağaza
                        eşlemesi için «PayTR’ye bağlantı dene»yi kullanın (sunucunuz PayTR’ye HTTPS POST atar, PayTR dokümantasyonundaki test kartı ile sync isteği).
                    </p>
                    <p className="mt-2 max-w-3xl text-sm text-zinc-600 dark:text-zinc-400">
                        Bildirim URL (2. adım) PayTR panelinde tam olarak şu adres olmalıdır (POST):
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
                        Test modu (işlem test / provizyon olarak işaretlenir — test bilgileri yine panelinizdeki mağaza anahtarlarıyla üretilir)
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
                        <button
                            type="button"
                            className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-500/20 dark:text-amber-200 dark:hover:bg-amber-500/15"
                            onClick={() => router.post(route('admin.paytr.probe'))}
                        >
                            PayTR’ye bağlantı dene
                        </button>
                        {paytrEnv.allowImport && paytrEnv.presetAvailable ? (
                            <button
                                type="button"
                                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                                onClick={() => {
                                    if (
                                        !confirm(
                                            '.env içindeki PAYTR_TEST_* değerleri mağaza ayarına yazılsın mı? (Yalnızca güvenilen ortamlarda PAYTR_ALLOW_ENV_IMPORT kullanın.)',
                                        )
                                    ) {
                                        return;
                                    }
                                    router.post(route('admin.paytr.import-env'));
                                }}
                            >
                                .env test mağazasını yükle
                            </button>
                        ) : null}
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-500">
                        «Bağlantı dene» IPv4 kullanır. Sunucu IPv6 ile çıkıyorsa veya paytr_token hatası alırsanız <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">PAYTR_PROBE_USER_IP</code> ile dış IPv4
                        adresinizi .env’de tanımlayın. Non3D + sync yetkisi kapalı mağazalarda PayTR anlamlı bir JSON hata mesajı döndürür.
                    </p>
                </form>
            </div>
        </AdminLayout>
    );
}
