import { AdminPageHeader } from '@/Components/Admin';
import InputError from '@/Components/InputError';
import { inputBaseClass } from '@/Components/ui/Input';
import AdminLayout from '@/Layouts/AdminLayout';
import SeoHead from '@/Components/SeoHead';
import FlashMessage from '@/Components/FlashMessage';
import { cn } from '@/lib/cn';
import { safeRoute } from '@/lib/safeRoute';
import { Link, router, useForm, usePage } from '@inertiajs/react';
import { ExternalLink, Loader2 } from 'lucide-react';
import { FormEvent, useState } from 'react';

interface Props {
    google_sign_in_enabled: boolean;
    google_sign_in_client_id: string;
    google_sign_in_client_secret_set?: boolean;
    customerLoginPath: string;
    customerRegisterPath: string;
}

type TestPayload = { ok: boolean; message: string; checks?: string[] };

export default function AdminGoogleSignInSettings({
    google_sign_in_enabled,
    google_sign_in_client_id,
    google_sign_in_client_secret_set,
    customerLoginPath,
    customerRegisterPath,
}: Readonly<Props>) {
    const page = usePage();
    const appUrl = ((page.props as { seo?: { appUrl?: string } }).seo?.appUrl ?? '').replace(/\/$/, '');
    const errors = (page.props as { errors?: Record<string, string> }).errors ?? {};

    const form = useForm({
        google_sign_in_enabled,
        google_sign_in_client_id,
        google_sign_in_client_secret: '',
        remove_google_sign_in_client_secret: false,
    });

    const [testBusy, setTestBusy] = useState(false);
    const [testResult, setTestResult] = useState<TestPayload | null>(null);

    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.post(safeRoute('admin.google-sign-in.update'), { preserveScroll: true });
    };

    const runTest = async () => {
        setTestBusy(true);
        setTestResult(null);
        try {
            const token = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
            const res = await fetch(safeRoute('admin.google-sign-in.test'), {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': token,
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'same-origin',
                body: '{}',
            });
            const data = (await res.json()) as TestPayload;
            setTestResult(data);
        } catch {
            setTestResult({ ok: false, message: 'İstek başarısız oldu.' });
        } finally {
            setTestBusy(false);
        }
    };

    const loginAbs = appUrl ? `${appUrl}${customerLoginPath.startsWith('/') ? '' : '/'}${customerLoginPath}` : customerLoginPath;
    const registerAbs = appUrl ? `${appUrl}${customerRegisterPath.startsWith('/') ? '' : '/'}${customerRegisterPath}` : customerRegisterPath;

    const labelClass = 'block text-sm font-medium text-zinc-700 dark:text-zinc-300';
    const inputClass = cn('mt-1 max-w-xl', inputBaseClass);

    return (
        <AdminLayout>
            <SeoHead title="Google ile kullanıcı girişi" noindex />
            <FlashMessage />
            <div className="space-y-6">
                <AdminPageHeader
                    title="Google ile giriş (kullanıcılar)"
                    description="Yalnızca bireysel kullanıcı girişi ve kayıt sayfalarında görünür. Google ile ilk kez gelenler otomatik «kullanıcı» (müşteri) hesabı oluşturur; sanatçı / mekân / yönetim hesapları bu akışa dahil değildir."
                    actions={
                        <Link
                            href={route('admin.settings.index')}
                            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                        >
                            ← Genel ayarlara dön
                        </Link>
                    }
                />

                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-950 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-100">
                    <p className="font-semibold">Canlı test</p>
                    <p className="mt-1 text-amber-900/90 dark:text-amber-100/90">
                        Aşağıdaki «Yapılandırmayı test et» kayıtlı ayarlarla sunucu kontrollerini çalıştırır. Gerçek Google oturumu için kullanıcı giriş sayfasını yeni sekmede açıp düğmeyi deneyin.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                        <a
                            href={loginAbs}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-amber-500"
                        >
                            Kullanıcı girişi (yeni sekme)
                            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                        </a>
                        <a
                            href={registerAbs}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-700/40 px-3 py-2 text-sm font-medium text-amber-950 transition hover:bg-amber-500/20 dark:border-amber-400/40 dark:text-amber-50"
                        >
                            Kullanıcı kaydı (yeni sekme)
                            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                        </a>
                        <button
                            type="button"
                            onClick={() => void runTest()}
                            disabled={testBusy}
                            className="inline-flex items-center gap-2 rounded-lg border border-zinc-400 bg-white px-3 py-2 text-sm font-medium text-zinc-900 transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
                        >
                            {testBusy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                            Yapılandırmayı test et
                        </button>
                    </div>
                    {testResult ? (
                        <div
                            className={cn(
                                'mt-4 rounded-lg border p-3 text-sm',
                                testResult.ok
                                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100'
                                    : 'border-red-500/40 bg-red-500/10 text-red-950 dark:text-red-100',
                            )}
                        >
                            <p className="font-medium">{testResult.message}</p>
                            {testResult.checks && testResult.checks.length > 0 ? (
                                <ul className="mt-2 list-inside list-disc space-y-1 text-xs opacity-95">
                                    {testResult.checks.map((c) => (
                                        <li key={c}>{c}</li>
                                    ))}
                                </ul>
                            ) : null}
                        </div>
                    ) : null}
                </div>

                <form onSubmit={submit} className="max-w-3xl space-y-6 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/60">
                    <div>
                        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">OAuth istemcisi</h2>
                        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                            Google Cloud Console’da <strong className="font-medium text-zinc-800 dark:text-zinc-200">Web uygulaması</strong> oluşturun;
                            yetkili JavaScript kökenlerine site adresinizi ekleyin.{' '}
                            <a
                                href="https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid?hl=tr"
                                className="text-amber-600 underline hover:text-amber-500 dark:text-amber-400"
                                target="_blank"
                                rel="noreferrer"
                            >
                                İstemci kimliği rehberi
                            </a>
                        </p>
                    </div>

                    <label className="flex items-center gap-2 text-sm text-zinc-800 dark:text-zinc-200">
                        <input
                            type="checkbox"
                            checked={form.data.google_sign_in_enabled}
                            onChange={(e) => form.setData('google_sign_in_enabled', e.target.checked)}
                        />
                        Aktif (kullanıcı giriş ve kayıt sayfalarında Google düğmesi)
                    </label>

                    <div>
                        <label htmlFor="gsi-client" className={labelClass}>
                            Client ID
                        </label>
                        <input
                            id="gsi-client"
                            value={form.data.google_sign_in_client_id}
                            onChange={(e) => form.setData('google_sign_in_client_id', e.target.value)}
                            className={inputClass}
                            placeholder="xxxx.apps.googleusercontent.com"
                            autoComplete="off"
                        />
                        <InputError message={errors.google_sign_in_client_id} className="mt-1" />
                    </div>

                    <div>
                        <label htmlFor="gsi-secret" className={labelClass}>
                            Client Secret
                        </label>
                        <input
                            id="gsi-secret"
                            type="password"
                            value={form.data.google_sign_in_client_secret}
                            onChange={(e) => form.setData('google_sign_in_client_secret', e.target.value)}
                            className={inputClass}
                            placeholder={
                                google_sign_in_client_secret_set
                                    ? '•••• kayıtlı — değiştirmek için yeni değer girin'
                                    : 'Cloud Console → istemci → İstemci sırrı'
                            }
                            autoComplete="new-password"
                        />
                        {google_sign_in_client_secret_set ? (
                            <label className="mt-2 flex items-center gap-2 text-sm text-zinc-500">
                                <input
                                    type="checkbox"
                                    checked={form.data.remove_google_sign_in_client_secret}
                                    onChange={(e) => {
                                        const on = e.target.checked;
                                        form.setData('remove_google_sign_in_client_secret', on);
                                        if (on) {
                                            form.setData('google_sign_in_client_secret', '');
                                        }
                                    }}
                                />
                                İstemci sırrını kaldır
                            </label>
                        ) : null}
                        <p className="mt-1 text-xs text-zinc-500">Veritabanında Laravel Crypt ile şifrelenir.</p>
                        <InputError message={errors.google_sign_in_client_secret} className="mt-1" />
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <button
                            type="submit"
                            disabled={form.processing}
                            className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-amber-400 disabled:opacity-60"
                        >
                            {form.processing ? 'Kaydediliyor…' : 'Kaydet'}
                        </button>
                        <button
                            type="button"
                            onClick={() => router.visit(route('admin.dashboard'))}
                            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 dark:border-zinc-600 dark:text-zinc-200"
                        >
                            Vazgeç
                        </button>
                    </div>
                </form>
            </div>
        </AdminLayout>
    );
}
