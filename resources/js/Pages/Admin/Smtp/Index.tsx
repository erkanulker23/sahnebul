import SeoHead from '@/Components/SeoHead';
import { inputBaseClass } from '@/Components/ui/Input';
import { cn } from '@/lib/cn';
import AdminLayout from '@/Layouts/AdminLayout';
import { router } from '@inertiajs/react';
import { useEffect, useState } from 'react';

interface SmtpSettings {
    mailer: string;
    host: string;
    port: number;
    username: string | null;
    encryption: string | null;
    from_address: string;
    from_name: string;
    password_set: boolean;
}

interface Props {
    smtp: SmtpSettings;
}

const defaultSmtp = (): SmtpSettings => ({
    mailer: 'smtp',
    host: '127.0.0.1',
    port: 587,
    username: null,
    encryption: null,
    from_address: '',
    from_name: 'Sahnebul',
    password_set: false,
});

export default function AdminSmtpIndex({ smtp: smtpProp }: Readonly<Props>) {
    const [smtp, setSmtp] = useState<SmtpSettings>(() => smtpProp ?? defaultSmtp());
    const [smtpPassword, setSmtpPassword] = useState('');
    const [testMailTo, setTestMailTo] = useState('');

    useEffect(() => {
        setSmtp(smtpProp ?? defaultSmtp());
    }, [smtpProp]);

    const encValue = smtp.encryption ?? '';
    const field = cn('mt-1', inputBaseClass);
    const lbl = 'block text-sm font-medium text-zinc-600 dark:text-zinc-400';

    const saveSmtp = () => {
        router.post(route('admin.smtp.update'), {
            smtp_mailer: smtp.mailer,
            smtp_host: smtp.host,
            smtp_port: smtp.port,
            smtp_username: smtp.username ?? '',
            smtp_password: smtpPassword,
            smtp_encryption: smtp.encryption ?? '',
            smtp_from_address: smtp.from_address,
            smtp_from_name: smtp.from_name,
        });
    };

    return (
        <AdminLayout>
            <SeoHead title="SMTP / E-posta - Admin | Sahnebul" description="Giden e-posta sunucusu ayarları." noindex />

            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">SMTP / E-posta</h1>
                    <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                        İletişim formu ve sistem e-postaları bu ayarlarla gönderilir. Şifre veritabanında Laravel Crypt ile saklanır; istemciye iletilmez.
                    </p>
                </div>

                <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
                    <p className="mb-4 text-sm text-zinc-500">
                        Gönderici şifresi boş bırakılırsa mevcut şifre korunur
                        {smtp.password_set ? ' (kayıtlı şifre var).' : ' (şifre tanımlı değil).'}
                    </p>
                    <div className="grid max-w-2xl gap-4 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                            <label className={lbl}>Mailer</label>
                            <select
                                className={field}
                                value={smtp.mailer}
                                onChange={(e) => setSmtp((s) => ({ ...s, mailer: e.target.value }))}
                            >
                                <option value="smtp">smtp</option>
                                <option value="log">log</option>
                                <option value="sendmail">sendmail</option>
                                <option value="array">array</option>
                            </select>
                        </div>
                        <div className="sm:col-span-2">
                            <label className={lbl}>Host</label>
                            <input
                                className={field}
                                value={smtp.host}
                                onChange={(e) => setSmtp((s) => ({ ...s, host: e.target.value }))}
                            />
                        </div>
                        <div>
                            <label className={lbl}>Port</label>
                            <input
                                type="number"
                                min={1}
                                max={65535}
                                className={field}
                                value={smtp.port}
                                onChange={(e) => setSmtp((s) => ({ ...s, port: Number.parseInt(e.target.value, 10) || 0 }))}
                            />
                        </div>
                        <div>
                            <label className={lbl}>Şifreleme</label>
                            <select
                                className={field}
                                value={encValue}
                                onChange={(e) => {
                                    const v = e.target.value;
                                    setSmtp((s) => ({
                                        ...s,
                                        encryption: v === '' ? null : v,
                                    }));
                                }}
                            >
                                <option value="">Yok</option>
                                <option value="tls">tls</option>
                                <option value="ssl">ssl</option>
                            </select>
                        </div>
                        <div className="sm:col-span-2">
                            <label className={lbl}>Kullanıcı adı</label>
                            <input
                                className={field}
                                value={smtp.username ?? ''}
                                onChange={(e) => setSmtp((s) => ({ ...s, username: e.target.value || null }))}
                            />
                        </div>
                        <div className="sm:col-span-2">
                            <label className={lbl}>Şifre (değiştirmek için yazın)</label>
                            <input
                                type="password"
                                autoComplete="new-password"
                                className={field}
                                value={smtpPassword}
                                onChange={(e) => setSmtpPassword(e.target.value)}
                                placeholder="••••••••"
                            />
                        </div>
                        <div>
                            <label className={lbl}>Gönderen e-posta</label>
                            <input
                                type="email"
                                className={field}
                                value={smtp.from_address}
                                onChange={(e) => setSmtp((s) => ({ ...s, from_address: e.target.value }))}
                            />
                        </div>
                        <div>
                            <label className={lbl}>Gönderen adı</label>
                            <input
                                className={field}
                                value={smtp.from_name}
                                onChange={(e) => setSmtp((s) => ({ ...s, from_name: e.target.value }))}
                            />
                        </div>
                    </div>

                    <div className="mt-6 flex flex-wrap items-center gap-2">
                        <input
                            value={testMailTo}
                            onChange={(e) => setTestMailTo(e.target.value)}
                            placeholder="Test e-posta alıcısı"
                            className={cn('max-w-xs', inputBaseClass)}
                        />
                        <button
                            type="button"
                            onClick={() => router.post(route('admin.smtp.test-mail'), { to: testMailTo })}
                            className="rounded border border-emerald-500/40 bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-emerald-800 dark:border-emerald-400/40 dark:bg-emerald-500/20 dark:text-emerald-300"
                        >
                            Test mail gönder
                        </button>
                    </div>
                    <button type="button" onClick={saveSmtp} className="mt-4 rounded bg-amber-500 px-4 py-2 font-semibold text-zinc-950">
                        SMTP ayarlarını kaydet
                    </button>
                </div>
            </div>
        </AdminLayout>
    );
}
