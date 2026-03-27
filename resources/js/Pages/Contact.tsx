import PhoneInput from '@/Components/PhoneInput';
import SeoHead from '@/Components/SeoHead';
import AppLayout from '@/Layouts/AppLayout';
import { cn } from '@/lib/cn';
import { sanitizeEmailInput } from '@/lib/trPhoneInput';
import { Link, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler } from 'react';
import { ExternalLink, Mail, MapPin, Phone } from 'lucide-react';

const fieldClass = cn(
    'mt-1.5 w-full rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900',
    'placeholder:text-zinc-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500',
    'dark:border-zinc-600 dark:bg-zinc-900 dark:text-white dark:placeholder:text-zinc-500',
);

const labelClass = 'text-sm font-medium text-zinc-700 dark:text-zinc-300';

export default function Contact() {
    const page = usePage() as {
        props: {
            auth: { user: { name: string; email: string } | null };
            flash?: { success?: string; error?: string };
            settings?: {
                footer?: {
                    contact?: { email?: string; phone?: string; address?: string };
                    social?: { label: string; url: string }[];
                } | null;
            };
        };
    };
    const user = page.props.auth?.user;
    const flash = page.props.flash;
    const contact = page.props.settings?.footer?.contact;
    const socialLinks = page.props.settings?.footer?.social ?? [];

    const { data, setData, post, processing, errors, reset } = useForm({
        name: user?.name ?? '',
        email: user?.email ?? '',
        phone: '',
        subject: '',
        message: '',
        consent: false as boolean,
        company: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('contact.store'), {
            preserveScroll: true,
            onSuccess: () => {
                reset('message', 'subject', 'phone', 'company');
                setData('consent', false);
                if (user) {
                    setData('name', user.name);
                    setData('email', user.email);
                }
            },
        });
    };

    return (
        <AppLayout>
            <SeoHead
                title="İletişim - Sahnebul"
                description="Sahnebul ile iletişime geçin; soru, öneri ve iş birliği taleplerinizi iletin."
                type="website"
            />

            <div className="mx-auto max-w-5xl px-0 py-8 sm:px-4 sm:py-10 lg:px-8 lg:py-14">
                <div className="max-w-2xl">
                    <h1 className="font-display text-3xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-4xl">İletişim</h1>
                    <p className="mt-3 text-base text-zinc-600 dark:text-zinc-400">
                        Sorularınız, önerileriniz veya iş birliği talepleriniz için formu doldurun; ekibimiz en kısa sürede size döner.
                    </p>
                </div>

                <div className="mt-10 grid gap-10 lg:grid-cols-12 lg:gap-12">
                    <aside className="lg:col-span-4">
                        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
                            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Doğrudan iletişim</p>
                            <ul className="mt-4 space-y-4 text-sm text-zinc-700 dark:text-zinc-300">
                                {contact?.email && (
                                    <li className="flex gap-3">
                                        <Mail className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
                                        <a href={`mailto:${contact.email}`} className="break-all hover:text-amber-700 dark:hover:text-amber-300">
                                            {contact.email}
                                        </a>
                                    </li>
                                )}
                                {contact?.phone && (
                                    <li className="flex gap-3">
                                        <Phone className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
                                        <span>{contact.phone}</span>
                                    </li>
                                )}
                                {contact?.address && (
                                    <li className="flex gap-3">
                                        <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
                                        <span>{contact.address}</span>
                                    </li>
                                )}
                                {!contact?.email && !contact?.phone && !contact?.address && (
                                    <li className="text-zinc-500 dark:text-zinc-500">İletişim bilgileri ayarlardan eklenebilir.</li>
                                )}
                            </ul>
                            {socialLinks.length > 0 && (
                                <>
                                    <p className="mt-6 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                                        Sosyal medya
                                    </p>
                                    <ul className="mt-3 space-y-2">
                                        {socialLinks.map((s) => (
                                            <li key={s.url}>
                                                <a
                                                    href={s.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-2 text-sm text-zinc-700 hover:text-amber-700 dark:text-zinc-300 dark:hover:text-amber-400"
                                                >
                                                    <ExternalLink className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
                                                    {s.label}
                                                </a>
                                            </li>
                                        ))}
                                    </ul>
                                </>
                            )}
                            <p className="mt-6 text-xs leading-relaxed text-zinc-500 dark:text-zinc-500">
                                Kişisel verileriniz{' '}
                                <Link href={route('pages.show', 'gizlilik-politikasi')} className="text-amber-700 underline hover:no-underline dark:text-amber-400">
                                    gizlilik politikası
                                </Link>{' '}
                                ve{' '}
                                <Link href={route('pages.show', 'kvkk')} className="text-amber-700 underline hover:no-underline dark:text-amber-400">
                                    KVKK aydınlatma metni
                                </Link>{' '}
                                kapsamında işlenir.
                            </p>
                        </div>
                    </aside>

                    <div className="lg:col-span-8">
                        {flash?.success && (
                            <div
                                role="status"
                                className="mb-6 rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-900 dark:text-emerald-200"
                            >
                                {flash.success}
                            </div>
                        )}
                        {flash?.error && (
                            <div className="mb-6 rounded-xl border border-red-500/35 bg-red-500/10 px-4 py-3 text-sm text-red-800 dark:text-red-200">
                                {flash.error}
                            </div>
                        )}

                        <form
                            onSubmit={submit}
                            className="relative rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50 sm:p-8"
                            noValidate
                        >
                            <div className="pointer-events-none absolute -left-[9999px] top-0 h-0 w-0 overflow-hidden opacity-0" aria-hidden="true">
                                <label htmlFor="contact-company">Şirket</label>
                                <input
                                    id="contact-company"
                                    type="text"
                                    name="company"
                                    tabIndex={-1}
                                    autoComplete="off"
                                    value={data.company}
                                    onChange={(e) => setData('company', e.target.value)}
                                />
                            </div>

                            <div className="grid gap-5 sm:grid-cols-2">
                                <div className="sm:col-span-1">
                                    <label htmlFor="contact-name" className={labelClass}>
                                        Ad soyad <span className="text-red-600 dark:text-red-400">*</span>
                                    </label>
                                    <input
                                        id="contact-name"
                                        type="text"
                                        name="name"
                                        required
                                        value={data.name}
                                        onChange={(e) => setData('name', e.target.value)}
                                        className={fieldClass}
                                        autoComplete="name"
                                    />
                                    {errors.name && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>}
                                </div>
                                <div className="sm:col-span-1">
                                    <label htmlFor="contact-email" className={labelClass}>
                                        E-posta <span className="text-red-600 dark:text-red-400">*</span>
                                    </label>
                                    <input
                                        id="contact-email"
                                        type="email"
                                        name="email"
                                        required
                                        value={data.email}
                                        onChange={(e) => setData('email', e.target.value)}
                                        className={fieldClass}
                                        autoComplete="email"
                                    />
                                    {errors.email && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email}</p>}
                                </div>
                                <div className="sm:col-span-2">
                                    <label htmlFor="contact-phone" className={labelClass}>
                                        Telefon <span className="text-zinc-400">(isteğe bağlı)</span>
                                    </label>
                                    <PhoneInput
                                        id="contact-phone"
                                        name="phone"
                                        value={data.phone}
                                        onChange={(v) => setData('phone', v)}
                                        className={fieldClass}
                                        autoComplete="tel"
                                    />
                                    {errors.phone && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.phone}</p>}
                                </div>
                                <div className="sm:col-span-2">
                                    <label htmlFor="contact-subject" className={labelClass}>
                                        Konu <span className="text-zinc-400">(isteğe bağlı)</span>
                                    </label>
                                    <input
                                        id="contact-subject"
                                        type="text"
                                        name="subject"
                                        value={data.subject}
                                        onChange={(e) => setData('subject', e.target.value)}
                                        className={fieldClass}
                                        placeholder="Örn. Mekan listeleme, iş birliği"
                                    />
                                    {errors.subject && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.subject}</p>}
                                </div>
                                <div className="sm:col-span-2">
                                    <label htmlFor="contact-message" className={labelClass}>
                                        Mesaj <span className="text-red-600 dark:text-red-400">*</span>
                                    </label>
                                    <textarea
                                        id="contact-message"
                                        name="message"
                                        required
                                        rows={6}
                                        value={data.message}
                                        onChange={(e) => setData('message', e.target.value)}
                                        className={cn(fieldClass, 'resize-y min-h-[140px]')}
                                        placeholder="Mesajınızı buraya yazın…"
                                    />
                                    {errors.message && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.message}</p>}
                                </div>
                            </div>

                            <div className="mt-6">
                                <label className="flex cursor-pointer items-start gap-3 text-sm text-zinc-600 dark:text-zinc-400">
                                    <input
                                        type="checkbox"
                                        name="consent"
                                        checked={data.consent}
                                        onChange={(e) => setData('consent', e.target.checked)}
                                        className="mt-1 h-4 w-4 rounded border-zinc-400 text-amber-600 focus:ring-amber-500 dark:border-zinc-600 dark:bg-zinc-900"
                                        required
                                    />
                                    <span>
                                        <span className="text-red-600 dark:text-red-400">*</span> Kişisel verilerimin{' '}
                                        <Link href={route('pages.show', 'gizlilik-politikasi')} className="text-amber-700 underline hover:no-underline dark:text-amber-400">
                                            gizlilik politikası
                                        </Link>{' '}
                                        kapsamında işlenmesini kabul ediyorum.
                                    </span>
                                </label>
                                {errors.consent && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.consent}</p>}
                            </div>

                            <div className="mt-8">
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="inline-flex w-full items-center justify-center rounded-xl bg-amber-500 px-5 py-3 text-sm font-semibold text-zinc-950 shadow-sm transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:min-w-[12rem]"
                                >
                                    {processing ? 'Gönderiliyor…' : 'Gönder'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
