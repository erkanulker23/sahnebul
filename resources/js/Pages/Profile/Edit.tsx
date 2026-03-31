import { AdminPageHeader } from '@/Components/Admin';
import PhoneInput from '@/Components/PhoneInput';
import SeoHead from '@/Components/SeoHead';
import AdminLayout from '@/Layouts/AdminLayout';
import UserPanelLayout from '@/Layouts/UserPanelLayout';
import { cn } from '@/lib/cn';
import { type PageProps } from '@/types';
import { Link, useForm, usePage } from '@inertiajs/react';
import { KeyRound, Trash2, UserCircle, type LucideIcon } from 'lucide-react';
import { FormEventHandler, PropsWithChildren, useMemo } from 'react';
import DeleteUserForm from './Partials/DeleteUserForm';
import UpdatePasswordForm from './Partials/UpdatePasswordForm';
import UpdateProfileInformationForm from './Partials/UpdateProfileInformationForm';

type Props = {
    mustVerifyEmail: boolean;
    status?: string;
    cities?: { id: number; name: string; slug: string }[];
    layoutVariant?: 'admin';
};

function AdminProfileSection({
    icon: Icon,
    title,
    description,
    children,
    variant = 'default',
}: PropsWithChildren<{
    icon: LucideIcon;
    title: string;
    description: string;
    variant?: 'default' | 'danger';
}>) {
    const danger = variant === 'danger';
    return (
        <section
            className={cn(
                'overflow-hidden rounded-xl border shadow-sm',
                danger
                    ? 'border-red-200/90 bg-white dark:border-red-900/40 dark:bg-zinc-900'
                    : 'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/60',
            )}
        >
            <div
                className={cn(
                    'flex items-start gap-4 border-b px-5 py-4 sm:px-6',
                    danger
                        ? 'border-red-100 bg-red-50/90 dark:border-red-950/50 dark:bg-red-950/20'
                        : 'border-zinc-100 bg-zinc-50/95 dark:border-zinc-800 dark:bg-zinc-950/40',
                )}
            >
                <div
                    className={cn(
                        'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
                        danger
                            ? 'bg-red-500/15 text-red-600 dark:bg-red-500/10 dark:text-red-400'
                            : 'bg-amber-500/15 text-amber-800 dark:bg-amber-500/12 dark:text-amber-400',
                    )}
                    aria-hidden
                >
                    <Icon className="h-5 w-5" strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                    <h2 className="font-display text-base font-semibold tracking-tight text-zinc-900 dark:text-white">{title}</h2>
                    <p className="mt-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{description}</p>
                </div>
            </div>
            <div className="p-5 sm:p-6">{children}</div>
        </section>
    );
}

export default function Edit({
    mustVerifyEmail,
    status,
    cities = [],
    layoutVariant,
}: Readonly<Props>) {
    const cardClass =
        layoutVariant === 'admin'
            ? 'rounded-lg border border-zinc-800 bg-zinc-900 p-6 sm:p-8'
            : 'rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-white/5 dark:bg-zinc-900/50 dark:shadow-none sm:p-8';

    const inner =
        layoutVariant === 'admin' ? (
            <>
                <SeoHead title="Hesabım" description="Site yönetimi hesabı: profil, şifre ve güvenlik." noindex />
                <div className="px-4 pb-10 pt-6 sm:px-6 lg:px-8">
                    <div className="mx-auto max-w-5xl">
                        <AdminPageHeader
                            title="Hesabım"
                            description="Görünen ad, e-posta, profil fotoğrafı ve şehir bilgilerinizi soldaki karttan; giriş şifrenizi sağdaki karttan güncellersiniz. Şifre değişiminde mevcut şifreniz istenir. En alttaki bölüm yalnızca hesabı kalıcı silmek içindir."
                        />

                        <div className="grid gap-6 lg:grid-cols-12 lg:gap-8">
                            <div className="space-y-6 lg:col-span-7">
                                <AdminProfileSection
                                    icon={UserCircle}
                                    title="Profil bilgileri"
                                    description="Fotoğraf, ad, e-posta, şehir ve ilgi alanları. Ziyaretçilere veya raporlarda görünen kimlik bilgileriniz buradan güncellenir."
                                >
                                    <UpdateProfileInformationForm
                                        mustVerifyEmail={mustVerifyEmail}
                                        status={status}
                                        cities={cities}
                                        omitSectionHeader
                                        className="max-w-none"
                                    />
                                </AdminProfileSection>
                            </div>

                            <div className="space-y-6 lg:col-span-5">
                                <AdminProfileSection
                                    icon={KeyRound}
                                    title="Şifre"
                                    description="Hesabınıza giriş için kullandığınız şifreyi değiştirin. Güçlü bir şifre için harf, rakam ve sembol karışımı kullanın."
                                >
                                    <UpdatePasswordForm omitSectionHeader className="max-w-none" />
                                </AdminProfileSection>

                                <AdminProfileSection
                                    icon={Trash2}
                                    variant="danger"
                                    title="Tehlikeli bölge"
                                    description="Hesabınızı kalıcı olarak silmek istiyorsanız bu bölümü kullanın. Bu işlem geri alınamaz; önemli verilerinizi yedeklediğinizden emin olun."
                                >
                                    <DeleteUserForm omitSectionHeader className="max-w-none" />
                                </AdminProfileSection>
                            </div>
                        </div>
                    </div>
                </div>
            </>
        ) : (
            <CustomerPanel mustVerifyEmail={mustVerifyEmail} status={status} cities={cities} cardClass={cardClass} />
        );

    if (layoutVariant === 'admin') {
        return <AdminLayout>{inner}</AdminLayout>;
    }

    return <UserPanelLayout>{inner}</UserPanelLayout>;
}

function CustomerPanel({
    mustVerifyEmail,
    status,
    cities,
    cardClass,
}: Readonly<{
    mustVerifyEmail: boolean;
    status?: string;
    cities: { id: number; name: string; slug: string }[];
    cardClass: string;
}>) {
    const { auth } = usePage<PageProps>().props;
    const user = auth.user;

    const reminderForm = useForm({
        event_reminder_email_enabled: user?.event_reminder_email_enabled !== false,
        event_reminder_sms_enabled: user?.event_reminder_sms_enabled === true,
        event_reminder_email_hour: typeof user?.event_reminder_email_hour === 'number' ? user.event_reminder_email_hour : 10,
        phone: user?.phone ?? '',
    });

    const hourOptions = useMemo(
        () =>
            Array.from({ length: 24 }, (_, h) => ({
                value: h,
                label: `${String(h).padStart(2, '0')}:00`,
            })),
        [],
    );

    const saveReminderPrefs: FormEventHandler = (e) => {
        e.preventDefault();
        reminderForm.patch(route('user.event-reminders.preferences'), { preserveScroll: true });
    };

    return (
        <>
            <SeoHead title="Hesabım" description="Profil, bildirim tercihleri ve güvenlik ayarları." noindex />
            <div className="pb-10">
                <div className="mx-auto max-w-3xl space-y-8">
                    <div>
                        <h1 className="font-display text-2xl font-bold tracking-tight text-zinc-900 dark:text-white lg:text-3xl">Profil ve güvenlik</h1>
                        <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                            Rezervasyon ve hatırlatmalar için{' '}
                            <Link href={route('dashboard')} className="font-medium text-amber-700 underline-offset-2 hover:underline dark:text-amber-400">
                                panele
                            </Link>{' '}
                            göz atın.
                        </p>
                    </div>

                    <section className={cardClass}>
                        <h2 className="font-display text-lg font-semibold text-zinc-900 dark:text-white">Profil bilgileri</h2>
                        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Ad, e-posta, fotoğraf ve şehir</p>
                        <div className="mt-6">
                            <UpdateProfileInformationForm
                                mustVerifyEmail={mustVerifyEmail}
                                status={status}
                                cities={cities}
                                className="max-w-none"
                            />
                        </div>
                    </section>

                    <section className={cardClass}>
                        <h2 className="font-display text-lg font-semibold text-zinc-900 dark:text-white">Etkinlik hatırlatmaları</h2>
                        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                            Takip ettiğiniz etkinlikler için e-posta veya SMS (açıksa) hatırlatma tercihleri.
                        </p>
                        <form onSubmit={saveReminderPrefs} className="mt-6 space-y-4">
                            <label className="flex items-center justify-between rounded-xl border border-zinc-200 px-4 py-3 dark:border-white/10">
                                <span>
                                    <span className="block text-sm font-medium text-zinc-800 dark:text-zinc-200">E-posta</span>
                                    <span className="text-xs text-zinc-500">Takip ettiğiniz etkinlikler için hatırlatma.</span>
                                </span>
                                <input
                                    type="checkbox"
                                    checked={reminderForm.data.event_reminder_email_enabled}
                                    onChange={(e) => reminderForm.setData('event_reminder_email_enabled', e.target.checked)}
                                />
                            </label>
                            <label className="flex items-center justify-between rounded-xl border border-zinc-200 px-4 py-3 dark:border-white/10">
                                <span>
                                    <span className="block text-sm font-medium text-zinc-800 dark:text-zinc-200">SMS</span>
                                    <span className="text-xs text-zinc-500">Önemli duyurular (altyapı açık olduğunda).</span>
                                </span>
                                <input
                                    type="checkbox"
                                    checked={reminderForm.data.event_reminder_sms_enabled}
                                    onChange={(e) => reminderForm.setData('event_reminder_sms_enabled', e.target.checked)}
                                />
                            </label>
                            <div>
                                <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Hatırlatma saati (İstanbul)</label>
                                <select
                                    value={reminderForm.data.event_reminder_email_hour}
                                    onChange={(e) => reminderForm.setData('event_reminder_email_hour', Number(e.target.value))}
                                    className="mt-1 block w-full max-w-xs rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm dark:border-white/10 dark:bg-zinc-900/70"
                                >
                                    {hourOptions.map((opt) => (
                                        <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            {reminderForm.data.event_reminder_sms_enabled ? (
                                <div>
                                    <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">SMS telefonu</label>
                                    <PhoneInput
                                        id="account-reminder-phone"
                                        name="account-reminder-phone"
                                        value={reminderForm.data.phone}
                                        onChange={(v) => reminderForm.setData('phone', v)}
                                        className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm dark:border-white/10 dark:bg-zinc-900/70"
                                    />
                                </div>
                            ) : null}
                            <button
                                type="submit"
                                disabled={reminderForm.processing}
                                className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-60"
                            >
                                Kaydet
                            </button>
                        </form>
                    </section>

                    <section className={cardClass}>
                        <h2 className="font-display text-lg font-semibold text-zinc-900 dark:text-white">Şifre</h2>
                        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Giriş şifrenizi güncelleyin.</p>
                        <div className="mt-6">
                            <UpdatePasswordForm className="max-w-none" />
                        </div>
                    </section>

                    <section className={cardClass}>
                        <DeleteUserForm className="max-w-none" />
                    </section>
                </div>
            </div>
        </>
    );
}
