import { AdminPageHeader } from '@/Components/Admin';
import AccountQuickNav from '@/Components/AccountQuickNav';
import PhoneInput from '@/Components/PhoneInput';
import SeoHead from '@/Components/SeoHead';
import AdminLayout from '@/Layouts/AdminLayout';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { cn } from '@/lib/cn';
import { type PageProps } from '@/types';
import { Link, useForm, usePage } from '@inertiajs/react';
import { Heart, KeyRound, MessageSquareText, Trash2, UserCircle, type LucideIcon } from 'lucide-react';
import { FormEventHandler, PropsWithChildren, useMemo } from 'react';
import DeleteUserForm from './Partials/DeleteUserForm';
import UpdatePasswordForm from './Partials/UpdatePasswordForm';
import UpdateProfileInformationForm from './Partials/UpdateProfileInformationForm';

type Props = {
    mustVerifyEmail: boolean;
    status?: string;
    cities?: { id: number; name: string; slug: string }[];
    panelSummary?: {
        activeTicketCount: number;
        favoriteCount: number;
        pastEventCount: number;
        reviewCount: number;
    };
    reservations?: {
        id: number;
        reservation_date: string;
        reservation_time: string;
        status: string;
        venue?: { name: string; slug: string } | null;
        event?: { title: string } | null;
    }[];
    favoriteArtists?: { id: number; name: string; slug: string }[];
    reminderEvents?: {
        id: number;
        slug: string;
        title: string;
        start_date: string;
        end_date?: string | null;
        venue: { name: string; slug: string };
    }[];
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
            <CustomerPanel
                mustVerifyEmail={mustVerifyEmail}
                status={status}
                cities={cities}
                cardClass={cardClass}
            />
        );

    if (layoutVariant === 'admin') {
        return <AdminLayout>{inner}</AdminLayout>;
    }

    return (
        <AuthenticatedLayout
            header={
                <h2 className="font-display text-xl font-semibold leading-tight text-zinc-900 dark:text-white">
                    Profil
                </h2>
            }
        >
            {inner}
        </AuthenticatedLayout>
    );
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
    const { panelSummary, reservations = [], favoriteArtists = [], reminderEvents = [] } = usePage<PageProps & Props>().props;
    const user = auth.user;
    const currentTab = (new URLSearchParams(usePage().url.split('?')[1] ?? '').get('tab') ??
        'profil') as 'profil' | 'biletler' | 'favoriler' | 'degerlendirmeler' | 'destek' | 'ayarlar';
    const activeTab: 'profil' | 'biletler' | 'favoriler' | 'degerlendirmeler' | 'destek' | 'ayarlar' =
        currentTab === 'profil' ||
        currentTab === 'biletler' ||
        currentTab === 'favoriler' ||
        currentTab === 'degerlendirmeler' ||
        currentTab === 'destek' ||
        currentTab === 'ayarlar'
            ? currentTab
            : 'profil';

    const supportForm = useForm({
        name: user?.name ?? '',
        email: user?.email ?? '',
        phone: user?.phone ?? '',
        subject: 'Diğer Talepler',
        message: '',
        consent: true as boolean,
        sahnebul_hp: '',
    });

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

    const submitSupport: FormEventHandler = (e) => {
        e.preventDefault();
        supportForm.post(route('contact.store'), {
            preserveScroll: true,
            onSuccess: () => supportForm.reset('message', 'sahnebul_hp'),
        });
    };

    const saveReminderPrefs: FormEventHandler = (e) => {
        e.preventDefault();
        reminderForm.patch(route('user.event-reminders.preferences'), { preserveScroll: true });
    };

    return (
        <>
            <SeoHead title="Kullanıcı Paneli" description="Profil, bilet, favori, destek ve ayarlar." noindex />
            <div className="py-10">
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
                    <AccountQuickNav />
                    <section className="overflow-hidden rounded-2xl border border-emerald-100 bg-emerald-50/65 p-6 dark:border-emerald-500/20 dark:bg-emerald-500/10">
                        <h1 className="font-display text-3xl font-bold text-zinc-900 dark:text-white">Hoş geldin, {user?.name}</h1>
                        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                            Biletlerini yönetebilir, favorilerini görüntüleyebilir ve hesap ayarlarını düzenleyebilirsin.
                        </p>
                        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            <SummaryCard title="Aktif Bilet" value={panelSummary?.activeTicketCount ?? 0} />
                            <SummaryCard title="Favori" value={panelSummary?.favoriteCount ?? 0} />
                            <SummaryCard title="Geçmiş Etkinlik" value={panelSummary?.pastEventCount ?? 0} />
                            <SummaryCard title="Değerlendirme" value={panelSummary?.reviewCount ?? 0} />
                        </div>
                    </section>

                    {activeTab === 'profil' && (
                        <section className={cardClass}>
                            <UpdateProfileInformationForm mustVerifyEmail={mustVerifyEmail} status={status} cities={cities} className="max-w-3xl" />
                        </section>
                    )}

                    {activeTab === 'biletler' && (
                        <section className={cardClass}>
                            <div className="mb-4 flex items-center justify-between gap-3">
                                <h3 className="font-display text-xl font-semibold text-zinc-900 dark:text-white">Biletlerim</h3>
                                <Link href={route('reservations.index')} className="text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-300">
                                    Tümünü görüntüle
                                </Link>
                            </div>
                            {reservations.length === 0 ? (
                                <EmptyState
                                    title="Henüz bilet bulunamadı"
                                    description="Etkinliklere göz atıp bilet satın alabilirsiniz."
                                    ctaLabel="Etkinliklere Göz At"
                                    href={route('events.index')}
                                />
                            ) : (
                                <ul className="space-y-2">
                                    {reservations.map((r) => (
                                        <li key={r.id} className="flex items-center justify-between rounded-xl border border-zinc-200 px-4 py-3 dark:border-white/10">
                                            <div>
                                                <p className="font-medium text-zinc-900 dark:text-white">{r.event?.title ?? r.venue?.name ?? 'Rezervasyon'}</p>
                                                <p className="text-sm text-zinc-500 dark:text-zinc-400">{r.reservation_date} {r.reservation_time}</p>
                                            </div>
                                            <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700 dark:bg-white/10 dark:text-zinc-200">{r.status}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>
                    )}

                    {activeTab === 'favoriler' && (
                        <section className={cardClass}>
                            <h3 className="font-display text-xl font-semibold text-zinc-900 dark:text-white">Favorilerim</h3>
                            {favoriteArtists.length === 0 && reminderEvents.length === 0 ? (
                                <div className="mt-4 space-y-6">
                                    <EmptyState
                                        title="Henüz favori etkinlik bulunamadı"
                                        description="Etkinliklere göz atıp beğendiklerini favorilerine ekleyebilirsin."
                                        ctaLabel="Etkinliklere Göz At"
                                        href={route('events.index')}
                                    />
                                    <div>
                                        <h4 className="font-display text-lg font-semibold text-zinc-900 dark:text-white">Takip Ettiğin Sanatçılar</h4>
                                        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">Henüz sanatçı takip etmiyorsun.</p>
                                    </div>
                                    <div>
                                        <h4 className="font-display text-lg font-semibold text-zinc-900 dark:text-white">Takip Ettiğin Mekanlar</h4>
                                        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">Henüz mekan takip etmiyorsun.</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="mt-4 space-y-6">
                                    <div>
                                        <h4 className="font-display text-lg font-semibold text-zinc-900 dark:text-white">Takip Ettiğin Etkinlikler</h4>
                                        {reminderEvents.length === 0 ? (
                                            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">Henüz etkinlik takip etmiyorsun.</p>
                                        ) : (
                                            <ul className="mt-3 space-y-2">
                                                {reminderEvents.map((event) => (
                                                    <li key={event.id}>
                                                        <Link
                                                            href={route('events.show', event.slug)}
                                                            className="flex items-center justify-between rounded-xl border border-zinc-200 px-4 py-3 text-sm hover:border-emerald-300 dark:border-white/10 dark:hover:border-emerald-500/30"
                                                        >
                                                            <span className="font-medium text-zinc-800 dark:text-zinc-200">{event.title}</span>
                                                            <span className="text-xs text-zinc-500 dark:text-zinc-400">{event.venue.name}</span>
                                                        </Link>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                    <div>
                                        <h4 className="font-display text-lg font-semibold text-zinc-900 dark:text-white">Takip Ettiğin Sanatçılar</h4>
                                        {favoriteArtists.length === 0 ? (
                                            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">Henüz sanatçı takip etmiyorsun.</p>
                                        ) : (
                                            <ul className="mt-3 space-y-2">
                                                {favoriteArtists.map((artist) => (
                                                    <li key={artist.id}>
                                                        <Link
                                                            href={route('artists.show', artist.slug)}
                                                            className="flex items-center justify-between rounded-xl border border-zinc-200 px-4 py-3 text-sm hover:border-emerald-300 dark:border-white/10 dark:hover:border-emerald-500/30"
                                                        >
                                                            <span className="font-medium text-zinc-800 dark:text-zinc-200">{artist.name}</span>
                                                            <Heart className="h-4 w-4 text-rose-500" />
                                                        </Link>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                </div>
                            )}
                        </section>
                    )}

                    {activeTab === 'degerlendirmeler' && (
                        <section className={cardClass}>
                            <div className="mb-4 flex items-center justify-between gap-3">
                                <h3 className="font-display text-xl font-semibold text-zinc-900 dark:text-white">Değerlendirmelerim</h3>
                                <div className="inline-flex rounded-xl bg-zinc-100 p-1 text-sm dark:bg-white/10">
                                    <span className="rounded-lg bg-white px-3 py-1 text-zinc-900 dark:bg-zinc-800 dark:text-white">Değerlendirme Bekleyenler</span>
                                    <span className="px-3 py-1 text-zinc-500">Yayınlanan Değerlendirmelerim</span>
                                </div>
                            </div>
                            <EmptyState
                                title="Değerlendirme bekleyen etkinlik bulunamadı"
                                description="Şu an değerlendirme yapabileceğiniz etkinlik bulunmamaktadır."
                            />
                        </section>
                    )}

                    {activeTab === 'destek' && (
                        <section className={cardClass}>
                            <h3 className="font-display text-xl font-semibold text-zinc-900 dark:text-white">Sahnebul Destek</h3>
                            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Size en hızlı şekilde yardımcı olmak için buradayız.</p>
                            <form onSubmit={submitSupport} className="mt-6 space-y-4">
                                <div>
                                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Yardım Konusu</label>
                                    <select
                                        value={supportForm.data.subject}
                                        onChange={(e) => supportForm.setData('subject', e.target.value)}
                                        className="mt-1 block w-full rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm dark:border-white/10 dark:bg-zinc-900/70"
                                    >
                                        <option value="Diğer Talepler">Diğer Talepler</option>
                                        <option value="Bilet işlemleri">Bilet işlemleri</option>
                                        <option value="Ödeme">Ödeme</option>
                                        <option value="Hesap">Hesap</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Telefon</label>
                                    <PhoneInput
                                        id="support-phone"
                                        name="support-phone"
                                        value={supportForm.data.phone}
                                        onChange={(v) => supportForm.setData('phone', v)}
                                        className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm dark:border-white/10 dark:bg-zinc-900/70"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Mesajınız</label>
                                    <textarea
                                        rows={5}
                                        value={supportForm.data.message}
                                        onChange={(e) => supportForm.setData('message', e.target.value)}
                                        placeholder="Lütfen talebinizi detaylı bir şekilde açıklayın..."
                                        className="mt-1 block w-full rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm dark:border-white/10 dark:bg-zinc-900/70"
                                    />
                                    {supportForm.errors.message ? <p className="mt-1 text-sm text-red-600">{supportForm.errors.message}</p> : null}
                                </div>
                                <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                                    <input type="checkbox" checked={supportForm.data.consent} onChange={(e) => supportForm.setData('consent', e.target.checked)} />
                                    Kişisel verilerimin gizlilik politikası kapsamında işlenmesini kabul ediyorum.
                                </label>
                                <button
                                    type="submit"
                                    disabled={supportForm.processing}
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-60"
                                >
                                    <MessageSquareText className="h-4 w-4" />
                                    Destek Talebi Gönder
                                </button>
                            </form>
                        </section>
                    )}

                    {activeTab === 'ayarlar' && (
                        <section className="grid gap-6 lg:grid-cols-2">
                            <div className={cardClass}>
                                <h3 className="font-display text-xl font-semibold text-zinc-900 dark:text-white">Bildirim Tercihleri</h3>
                                <form onSubmit={saveReminderPrefs} className="mt-4 space-y-4">
                                    <label className="flex items-center justify-between rounded-xl border border-zinc-200 px-4 py-3 dark:border-white/10">
                                        <span>
                                            <span className="block text-sm font-medium text-zinc-800 dark:text-zinc-200">E-posta Bildirimleri</span>
                                            <span className="text-xs text-zinc-500">Etkinlik hatırlatıcıları ve kampanyalar.</span>
                                        </span>
                                        <input
                                            type="checkbox"
                                            checked={reminderForm.data.event_reminder_email_enabled}
                                            onChange={(e) => reminderForm.setData('event_reminder_email_enabled', e.target.checked)}
                                        />
                                    </label>
                                    <label className="flex items-center justify-between rounded-xl border border-zinc-200 px-4 py-3 dark:border-white/10">
                                        <span>
                                            <span className="block text-sm font-medium text-zinc-800 dark:text-zinc-200">SMS Bildirimleri</span>
                                            <span className="text-xs text-zinc-500">Bilet bilgileri ve önemli duyurular.</span>
                                        </span>
                                        <input
                                            type="checkbox"
                                            checked={reminderForm.data.event_reminder_sms_enabled}
                                            onChange={(e) => reminderForm.setData('event_reminder_sms_enabled', e.target.checked)}
                                        />
                                    </label>
                                    <label className="flex items-center justify-between rounded-xl border border-zinc-200 px-4 py-3 dark:border-white/10">
                                        <span>
                                            <span className="block text-sm font-medium text-zinc-800 dark:text-zinc-200">E-Bülten Aboneliği</span>
                                            <span className="text-xs text-zinc-500">Kampanyalar ve özel teklifler.</span>
                                        </span>
                                        <input
                                            type="checkbox"
                                            checked={reminderForm.data.event_reminder_email_enabled}
                                            onChange={(e) => reminderForm.setData('event_reminder_email_enabled', e.target.checked)}
                                        />
                                    </label>
                                    <div>
                                        <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Hatırlatma saati</label>
                                        <select
                                            value={reminderForm.data.event_reminder_email_hour}
                                            onChange={(e) => reminderForm.setData('event_reminder_email_hour', Number(e.target.value))}
                                            className="mt-1 block w-full rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm dark:border-white/10 dark:bg-zinc-900/70"
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
                                                id="settings-reminder-phone"
                                                name="settings-reminder-phone"
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
                            </div>

                            <div className="space-y-6">
                                <div className={cardClass}>
                                    <h3 className="font-display text-xl font-semibold text-zinc-900 dark:text-white">Güvenlik</h3>
                                    <div className="mt-4">
                                        <UpdatePasswordForm className="max-w-none" />
                                    </div>
                                </div>
                                <div className={cardClass}>
                                    <DeleteUserForm className="max-w-none" />
                                </div>
                            </div>
                        </section>
                    )}
                </div>
            </div>
        </>
    );
}

function SummaryCard({ title, value }: Readonly<{ title: string; value: number }>) {
    return (
        <div className="rounded-xl border border-emerald-100 bg-white px-4 py-3 dark:border-emerald-500/20 dark:bg-zinc-900/40">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{title}</p>
            <p className="mt-1 text-2xl font-semibold text-emerald-600 dark:text-emerald-300">{value}</p>
        </div>
    );
}

function EmptyState({
    title,
    description,
    ctaLabel,
    href,
}: Readonly<{ title: string; description: string; ctaLabel?: string; href?: string }>) {
    return (
        <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50/60 px-4 py-12 text-center dark:border-white/10 dark:bg-white/[0.03]">
            <p className="font-display text-2xl font-semibold text-zinc-900 dark:text-white">{title}</p>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
            {ctaLabel && href ? (
                <Link
                    href={href}
                    className="mt-4 inline-flex items-center rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
                >
                    {ctaLabel}
                </Link>
            ) : null}
        </div>
    );
}
