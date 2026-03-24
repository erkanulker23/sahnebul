import AdminLayout from '@/Layouts/AdminLayout';
import SeoHead from '@/Components/SeoHead';
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
                    <h1 className="text-2xl font-bold text-white">SMTP / E-posta</h1>
                    <p className="mt-2 text-sm text-zinc-400">
                        İletişim formu ve sistem e-postaları bu ayarlarla gönderilir. Şifre veritabanında Laravel Crypt ile saklanır; istemciye iletilmez.
                    </p>
                </div>

                <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
                    <p className="mb-4 text-sm text-zinc-500">
                        Gönderici şifresi boş bırakılırsa mevcut şifre korunur
                        {smtp.password_set ? ' (kayıtlı şifre var).' : ' (şifre tanımlı değil).'}
                    </p>
                    <div className="grid max-w-2xl gap-4 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                            <label className="block text-sm text-zinc-400">Mailer</label>
                            <select
                                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
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
                            <label className="block text-sm text-zinc-400">Host</label>
                            <input
                                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                                value={smtp.host}
                                onChange={(e) => setSmtp((s) => ({ ...s, host: e.target.value }))}
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-zinc-400">Port</label>
                            <input
                                type="number"
                                min={1}
                                max={65535}
                                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                                value={smtp.port}
                                onChange={(e) => setSmtp((s) => ({ ...s, port: Number.parseInt(e.target.value, 10) || 0 }))}
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-zinc-400">Şifreleme</label>
                            <select
                                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
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
                            <label className="block text-sm text-zinc-400">Kullanıcı adı</label>
                            <input
                                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                                value={smtp.username ?? ''}
                                onChange={(e) => setSmtp((s) => ({ ...s, username: e.target.value || null }))}
                            />
                        </div>
                        <div className="sm:col-span-2">
                            <label className="block text-sm text-zinc-400">Şifre (değiştirmek için yazın)</label>
                            <input
                                type="password"
                                autoComplete="new-password"
                                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                                value={smtpPassword}
                                onChange={(e) => setSmtpPassword(e.target.value)}
                                placeholder="••••••••"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-zinc-400">Gönderen e-posta</label>
                            <input
                                type="email"
                                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                                value={smtp.from_address}
                                onChange={(e) => setSmtp((s) => ({ ...s, from_address: e.target.value }))}
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-zinc-400">Gönderen adı</label>
                            <input
                                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
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
                            className="rounded bg-zinc-800 px-3 py-2 text-sm text-white"
                        />
                        <button
                            type="button"
                            onClick={() => router.post(route('admin.smtp.test-mail'), { to: testMailTo })}
                            className="rounded border border-emerald-400/40 bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-300"
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
