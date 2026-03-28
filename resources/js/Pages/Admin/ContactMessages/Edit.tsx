import AdminLayout from '@/Layouts/AdminLayout';
import SeoHead from '@/Components/SeoHead';
import InputError from '@/Components/InputError';
import { inputBaseClass } from '@/Components/ui/Input';
import { Link, useForm, usePage } from '@inertiajs/react';
import { cn } from '@/lib/cn';

interface Message {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    subject: string | null;
    message: string;
    is_spam: boolean;
    admin_note: string | null;
}

interface Props {
    message: Message;
}

const field = cn('mt-1 w-full max-w-2xl', inputBaseClass);

export default function AdminContactMessageEdit({ message: m }: Readonly<Props>) {
    const flash = (usePage().props as { flash?: { success?: string; error?: string } }).flash;
    const { data, setData, put, processing, errors } = useForm({
        name: m.name,
        email: m.email,
        phone: m.phone ?? '',
        subject: m.subject ?? '',
        message: m.message,
        admin_note: m.admin_note ?? '',
        is_spam: m.is_spam,
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        put(route('admin.contact-messages.update', m.id));
    };

    return (
        <AdminLayout>
            <SeoHead title={`Mesaj düzenle #${m.id} - Admin`} description="" noindex />

            <div className="space-y-6">
                <div>
                    <Link
                        href={route('admin.contact-messages.show', m.id)}
                        className="text-sm text-amber-700 hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-300"
                    >
                        ← Mesaj detayı
                    </Link>
                    <h1 className="mt-2 font-display text-xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-2xl">
                        Mesaj düzenle #{m.id}
                    </h1>
                </div>

                {flash?.success ? (
                    <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-200">
                        {flash.success}
                    </p>
                ) : null}

                <form onSubmit={submit} className="max-w-3xl space-y-5 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label htmlFor="cm-name" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                Ad *
                            </label>
                            <input
                                id="cm-name"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                className={field}
                            />
                            <InputError message={errors.name} className="mt-1" />
                        </div>
                        <div>
                            <label htmlFor="cm-email" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                E-posta *
                            </label>
                            <input
                                id="cm-email"
                                type="email"
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                                className={field}
                            />
                            <InputError message={errors.email} className="mt-1" />
                        </div>
                        <div>
                            <label htmlFor="cm-phone" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                Telefon
                            </label>
                            <input
                                id="cm-phone"
                                value={data.phone}
                                onChange={(e) => setData('phone', e.target.value)}
                                className={field}
                            />
                            <InputError message={errors.phone} className="mt-1" />
                        </div>
                        <div className="sm:col-span-2">
                            <label htmlFor="cm-subject" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                Konu
                            </label>
                            <input
                                id="cm-subject"
                                value={data.subject}
                                onChange={(e) => setData('subject', e.target.value)}
                                className={field}
                            />
                            <InputError message={errors.subject} className="mt-1" />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="cm-message" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            Mesaj *
                        </label>
                        <textarea
                            id="cm-message"
                            value={data.message}
                            onChange={(e) => setData('message', e.target.value)}
                            rows={10}
                            className={cn(field, 'font-sans')}
                        />
                        <InputError message={errors.message} className="mt-1" />
                    </div>

                    <div>
                        <label htmlFor="cm-note" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            Yönetici notu
                        </label>
                        <textarea
                            id="cm-note"
                            value={data.admin_note}
                            onChange={(e) => setData('admin_note', e.target.value)}
                            rows={4}
                            placeholder="İç not (ziyaretçiye gösterilmez)"
                            className={cn(field, 'font-sans')}
                        />
                        <InputError message={errors.admin_note} className="mt-1" />
                    </div>

                    <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-800/40">
                        <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-zinc-300 text-amber-600 focus:ring-amber-500 dark:border-zinc-600"
                            checked={data.is_spam}
                            onChange={(e) => setData('is_spam', e.target.checked)}
                        />
                        <span className="text-sm text-zinc-800 dark:text-zinc-200">Spam olarak işaretle (gelen kutusunda gizlenir)</span>
                    </label>

                    <div className="flex flex-wrap gap-3 border-t border-zinc-100 pt-4 dark:border-white/10">
                        <button
                            type="submit"
                            disabled={processing}
                            className="rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-amber-400 disabled:opacity-50"
                        >
                            Kaydet
                        </button>
                        <Link
                            href={route('admin.contact-messages.show', m.id)}
                            className="rounded-lg border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                        >
                            İptal
                        </Link>
                    </div>
                </form>
            </div>
        </AdminLayout>
    );
}
