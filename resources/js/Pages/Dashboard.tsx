import EventRelativeDayPill from '@/Components/EventRelativeDayPill';
import SeoHead from '@/Components/SeoHead';
import { eventShowParam } from '@/lib/eventShowUrl';
import { formatTurkishDateTime, formatTurkishDateTimeFromParts } from '@/lib/formatTurkishDateTime';
import { reservationStatusTr } from '@/lib/statusLabels';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { type PageProps, type User } from '@/types';
import { Link, useForm, usePage } from '@inertiajs/react';
import { BellRing, Heart, Mail, MessageSquare, Sparkles } from 'lucide-react';
import { useMemo } from 'react';

interface Reservation {
    id: number;
    reservation_date: string;
    reservation_time: string;
    status: string;
    total_amount: number;
    venue: { name: string; slug: string };
    event?: { title: string } | null;
}

interface FavoriteArtistRow {
    id: number;
    name: string;
    slug: string;
    avatar: string | null;
}

interface ReminderEventRow {
    id: number;
    slug: string;
    title: string;
    start_date: string;
    end_date?: string | null;
    venue: { name: string; slug: string };
}

interface Props {
    recentReservations: Reservation[];
    upcomingEvents: {
        id: number;
        slug: string;
        title: string;
        start_date: string;
        end_date?: string | null;
        ticket_price: number | null;
        entry_is_paid?: boolean;
        venue: { name: string; slug: string };
        artists: { id: number; name: string; slug: string; avatar: string | null }[];
    }[];
    favoriteArtists?: FavoriteArtistRow[];
    reminderEvents?: ReminderEventRow[];
}

export default function Dashboard({
    recentReservations = [],
    upcomingEvents = [],
    favoriteArtists = [],
    reminderEvents = [],
}: Readonly<Props>) {
    const page = usePage<PageProps>();
    const panelTitle = page.props.auth.stage_panel_title ?? 'Panel';
    const authUser = page.props.auth.user as User | null;

    const hourOptions = useMemo(
        () =>
            Array.from({ length: 24 }, (_, h) => ({
                value: h,
                label: `${String(h).padStart(2, '0')}:00`,
            })),
        [],
    );

    const reminderForm = useForm({
        event_reminder_email_enabled: authUser?.event_reminder_email_enabled !== false,
        event_reminder_sms_enabled: authUser?.event_reminder_sms_enabled === true,
        event_reminder_email_hour:
            typeof authUser?.event_reminder_email_hour === 'number' ? authUser.event_reminder_email_hour : 10,
        phone: authUser?.phone ?? '',
    });

    const saveReminderPrefs = (e: React.FormEvent) => {
        e.preventDefault();
        reminderForm.patch(route('user.event-reminders.preferences'), { preserveScroll: true });
    };

    const imageSrc = (path: string | null) => {
        if (!path) return null;
        return path.startsWith('http://') || path.startsWith('https://') ? path : `/storage/${path}`;
    };

    return (
        <AuthenticatedLayout
            header={
                <h2 className="font-display text-xl font-semibold leading-tight text-zinc-900 dark:text-white">
                    {panelTitle}
                </h2>
            }
        >
            <SeoHead title="Kullanıcı paneli - Sahnebul" description="Favori sanatçılar, etkinlik hatırlatmaları ve rezervasyonlar." noindex />

            <div className="py-12">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="mb-8 grid gap-4 sm:grid-cols-2">
                        <div className="relative overflow-hidden rounded-2xl border border-rose-200/90 bg-gradient-to-br from-rose-50 via-white to-white p-6 shadow-sm dark:border-rose-500/25 dark:from-rose-500/[0.12] dark:via-zinc-900/40 dark:to-zinc-900/50 dark:shadow-none">
                            <div
                                className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-rose-400/20 blur-2xl dark:bg-rose-500/20"
                                aria-hidden
                            />
                            <div className="relative flex items-start gap-3">
                                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-600 shadow-inner ring-1 ring-rose-500/20 dark:bg-rose-400/10 dark:text-rose-300 dark:ring-rose-400/25">
                                    <Heart className="h-5 w-5 fill-rose-500/25 stroke-[2.25]" aria-hidden />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <h3 className="font-display text-lg font-bold text-zinc-900 dark:text-white">Favori sanatçılar</h3>
                                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                                        Sanatçı profillerindeki kalp ile ekleyin; yeni etkinliklerden haberdar olun.
                                    </p>
                                </div>
                            </div>
                            {favoriteArtists.length === 0 ? (
                                <div className="relative mt-5 flex flex-col items-center rounded-xl border border-dashed border-rose-200/80 bg-rose-50/50 px-4 py-10 text-center dark:border-rose-500/30 dark:bg-rose-500/[0.06]">
                                    <Sparkles className="h-8 w-8 text-rose-400 dark:text-rose-400/90" strokeWidth={1.75} aria-hidden />
                                    <p className="mt-3 max-w-xs text-sm font-medium text-zinc-700 dark:text-zinc-300">Henüz favori sanatçınız yok</p>
                                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
                                        Keşfet sayfasından profillere girip kalbe dokunarak listeyi oluşturun.
                                    </p>
                                    <Link
                                        href={route('artists.index')}
                                        className="mt-4 inline-flex items-center rounded-full bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-rose-700 dark:bg-rose-500 dark:hover:bg-rose-400"
                                    >
                                        Sanatçıları keşfet
                                    </Link>
                                </div>
                            ) : (
                                <ul className="relative mt-5 space-y-2">
                                    {favoriteArtists.map((a) => (
                                        <li key={a.id}>
                                            <Link
                                                href={route('artists.show', a.slug)}
                                                className="flex items-center gap-3 rounded-xl border border-rose-100/90 bg-white/90 px-3 py-2.5 shadow-sm transition hover:border-rose-300/80 hover:bg-white dark:border-white/10 dark:bg-zinc-900/60 dark:hover:border-rose-500/35 dark:hover:bg-zinc-900/80"
                                            >
                                                {imageSrc(a.avatar) ? (
                                                    <img
                                                        src={imageSrc(a.avatar)!}
                                                        alt=""
                                                        className="h-10 w-10 rounded-full object-cover ring-2 ring-rose-200/80 dark:ring-rose-500/30"
                                                    />
                                                ) : (
                                                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-sm font-bold text-rose-600 dark:bg-rose-500/20 dark:text-rose-300">
                                                        {a.name.slice(0, 1).toLocaleUpperCase('tr')}
                                                    </span>
                                                )}
                                                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-zinc-900 dark:text-white">{a.name}</span>
                                                <Heart className="h-4 w-4 shrink-0 fill-rose-500/40 text-rose-600 dark:fill-rose-400/35 dark:text-rose-400" aria-hidden />
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                        <div className="relative overflow-hidden rounded-2xl border border-amber-200/90 bg-gradient-to-br from-amber-50 via-white to-white p-6 shadow-sm dark:border-amber-500/25 dark:from-amber-500/[0.1] dark:via-zinc-900/40 dark:to-zinc-900/50 dark:shadow-none">
                            <div
                                className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-amber-400/25 blur-2xl dark:bg-amber-500/15"
                                aria-hidden
                            />
                            <div className="relative flex items-start gap-3">
                                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-700 shadow-inner ring-1 ring-amber-500/25 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/30">
                                    <BellRing className="h-5 w-5" strokeWidth={2.25} aria-hidden />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <h3 className="font-display text-lg font-bold text-zinc-900 dark:text-white">Takvim ve hatırlatmalar</h3>
                                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                                        Etkinlik sayfasından «Takip listesine ekle» ile kayıt olun. Hatırlatma, etkinlikten <strong>bir gün önce</strong>{' '}
                                        aşağıda seçtiğiniz <strong>İstanbul saatinde</strong> gönderilir (e-posta ve/veya SMS). Hesap bildirimlerinizde de
                                        görünür.
                                    </p>
                                </div>
                            </div>

                            <form
                                onSubmit={saveReminderPrefs}
                                className="relative mt-5 space-y-4 rounded-xl border border-amber-200/80 bg-white/90 p-4 dark:border-amber-500/25 dark:bg-zinc-900/50"
                            >
                                <p className="text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-200/90">
                                    Hatırlatma gönderimi
                                </p>
                                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                                    <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-800 dark:text-zinc-200">
                                        <input
                                            type="checkbox"
                                            className="rounded border-amber-400 text-amber-600 focus:ring-amber-500 dark:border-amber-500/50 dark:bg-zinc-900"
                                            checked={reminderForm.data.event_reminder_email_enabled}
                                            onChange={(ev) => reminderForm.setData('event_reminder_email_enabled', ev.target.checked)}
                                        />
                                        <Mail className="h-4 w-4 text-amber-600 dark:text-amber-400" aria-hidden />
                                        E-posta
                                    </label>
                                    <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-800 dark:text-zinc-200">
                                        <input
                                            type="checkbox"
                                            className="rounded border-amber-400 text-amber-600 focus:ring-amber-500 dark:border-amber-500/50 dark:bg-zinc-900"
                                            checked={reminderForm.data.event_reminder_sms_enabled}
                                            onChange={(ev) => reminderForm.setData('event_reminder_sms_enabled', ev.target.checked)}
                                        />
                                        <MessageSquare className="h-4 w-4 text-amber-600 dark:text-amber-400" aria-hidden />
                                        SMS
                                    </label>
                                </div>
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-4">
                                    <div className="min-w-0 flex-1">
                                        <label htmlFor="reminder-hour" className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                                            Gönderim saati (İstanbul)
                                        </label>
                                        <select
                                            id="reminder-hour"
                                            value={reminderForm.data.event_reminder_email_hour}
                                            onChange={(ev) => reminderForm.setData('event_reminder_email_hour', Number(ev.target.value))}
                                            className="mt-1 w-full max-w-[12rem] rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-white/15 dark:bg-zinc-900 dark:text-white"
                                        >
                                            {hourOptions.map((o) => (
                                                <option key={o.value} value={o.value}>
                                                    {o.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                {reminderForm.data.event_reminder_sms_enabled ? (
                                    <div>
                                        <label htmlFor="reminder-phone" className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                                            Cep telefonu (SMS)
                                        </label>
                                        <input
                                            id="reminder-phone"
                                            type="tel"
                                            autoComplete="tel"
                                            placeholder="+90 5xx xxx xx xx"
                                            value={reminderForm.data.phone}
                                            onChange={(ev) => reminderForm.setData('phone', ev.target.value)}
                                            className="mt-1 w-full max-w-md rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-white/15 dark:bg-zinc-900 dark:text-white"
                                        />
                                        <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-500">
                                            SMS altyapısı yönetici tarafından açıldığında gönderilir; tercih şimdiden kaydedilir.
                                        </p>
                                    </div>
                                ) : null}
                                {reminderForm.errors.phone ? (
                                    <p className="text-sm text-red-600 dark:text-red-400">{reminderForm.errors.phone}</p>
                                ) : null}
                                {reminderForm.errors.event_reminder_email_hour ? (
                                    <p className="text-sm text-red-600 dark:text-red-400">{reminderForm.errors.event_reminder_email_hour}</p>
                                ) : null}
                                <div className="flex flex-wrap items-center gap-2">
                                    <button
                                        type="submit"
                                        disabled={reminderForm.processing}
                                        className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-700 disabled:opacity-60 dark:bg-amber-500 dark:hover:bg-amber-400"
                                    >
                                        {reminderForm.processing ? 'Kaydediliyor…' : 'Tercihleri kaydet'}
                                    </button>
                                </div>
                            </form>

                            {reminderEvents.length === 0 ? (
                                <p className="relative mt-5 rounded-xl border border-dashed border-amber-200/80 bg-amber-50/40 px-4 py-8 text-center text-sm text-zinc-600 dark:border-amber-500/25 dark:bg-amber-500/[0.06] dark:text-zinc-400">
                                    Takip ettiğiniz etkinlik yok. Etkinlik kartındaki «Takip listesine ekle» ile burada görünür.
                                </p>
                            ) : (
                                <ul className="relative mt-5 space-y-2.5">
                                    {reminderEvents.map((e) => (
                                        <li key={e.id}>
                                            <Link
                                                href={route('events.show', eventShowParam(e))}
                                                className="group flex items-stretch gap-3 overflow-hidden rounded-xl border border-zinc-200/90 bg-white/95 p-3 shadow-sm transition hover:border-amber-300/70 hover:shadow-md dark:border-white/10 dark:bg-zinc-900/55 dark:hover:border-amber-500/35"
                                            >
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-semibold leading-snug text-zinc-900 group-hover:text-amber-800 dark:text-white dark:group-hover:text-amber-300">
                                                        {e.title}
                                                    </p>
                                                    <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">{e.venue.name}</p>
                                                    <div className="mt-2 flex flex-wrap items-center gap-2">
                                                        <EventRelativeDayPill
                                                            startDate={e.start_date}
                                                            endDate={e.end_date}
                                                            placement="compactLight"
                                                        />
                                                        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                                                            {formatTurkishDateTime(e.start_date)}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex shrink-0 items-center border-l border-zinc-100 pl-3 dark:border-white/10">
                                                    <span
                                                        className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/[0.14] px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800 ring-1 ring-emerald-500/25 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/30"
                                                        title="E-posta hatırlatması açık; ek dosya gerekmez"
                                                    >
                                                        <BellRing className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
                                                        Takipte
                                                    </span>
                                                </div>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>

                    <div className="mb-8">
                        <Link
                            href={route('reservations.index')}
                            className="block rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:border-amber-400/50 dark:border-white/5 dark:bg-zinc-900/50 dark:shadow-none dark:hover:border-amber-500/20"
                        >
                            <p className="text-sm text-zinc-600 dark:text-zinc-500">Rezervasyonlarım</p>
                            <p className="mt-1 text-2xl font-bold text-amber-600 dark:text-amber-400">{recentReservations.length}</p>
                            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Son rezervasyonlarınızı görüntüleyin</p>
                        </Link>
                    </div>

                    <div className="mb-8">
                        <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-white/5 dark:bg-zinc-900/50 dark:shadow-none">
                            <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-white/5">
                                <h3 className="font-display text-lg font-bold text-zinc-900 dark:text-white">Bu Hafta Etkinlikler</h3>
                                <Link href={route('home')} className="text-sm text-amber-700 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300">
                                    Takvim →
                                </Link>
                            </div>
                            <div className="divide-y divide-zinc-100 dark:divide-white/5">
                                {upcomingEvents.length === 0 ? (
                                    <p className="p-4 text-zinc-600 dark:text-zinc-500">Yaklaşan etkinlik yok.</p>
                                ) : (
                                    upcomingEvents.map((e) => (
                                        <Link
                                            key={e.id}
                                            href={route('events.show', eventShowParam(e))}
                                            className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-white/5"
                                        >
                                            <div className="min-w-0">
                                                <p className="truncate font-medium text-zinc-900 dark:text-white">{e.title}</p>
                                                <p className="text-sm text-zinc-600 dark:text-zinc-500">{e.venue.name}</p>
                                                {e.artists.length > 0 && (
                                                    <div className="mt-2 flex items-center gap-1">
                                                        {e.artists.slice(0, 3).map((a) => (
                                                            <img key={a.id} src={imageSrc(a.avatar) ?? 'https://via.placeholder.com/20x20?text=%F0%9F%8E%A4'} alt={a.name} className="h-5 w-5 rounded-full object-cover" />
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex shrink-0 flex-col items-end gap-1 text-right">
                                                <EventRelativeDayPill
                                                    startDate={e.start_date}
                                                    endDate={e.end_date}
                                                    placement="compactLight"
                                                />
                                                <p className="text-xs text-zinc-600 dark:text-zinc-500">{formatTurkishDateTime(e.start_date)}</p>
                                                {e.entry_is_paid === false ? (
                                                    <p className="text-sm text-emerald-700 dark:text-emerald-400">Ücretsiz giriş</p>
                                                ) : (
                                                    e.ticket_price != null && (
                                                        <p className="text-sm text-amber-700 dark:text-amber-400">{e.ticket_price} ₺</p>
                                                    )
                                                )}
                                            </div>
                                        </Link>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-white/5 dark:bg-zinc-900/50 dark:shadow-none">
                        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-white/5">
                            <h3 className="font-display text-lg font-bold text-zinc-900 dark:text-white">Son Rezervasyonlar</h3>
                            <Link href={route('reservations.index')} className="text-sm text-amber-700 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300">
                                Tümü →
                            </Link>
                        </div>
                        <div className="divide-y divide-zinc-100 dark:divide-white/5">
                            {recentReservations.length === 0 ? (
                                <p className="px-6 py-12 text-center text-zinc-600 dark:text-zinc-500">Henüz rezervasyonunuz yok.</p>
                            ) : (
                                recentReservations.map((r) => (
                                    <Link
                                        key={r.id}
                                        href={route('reservations.index')}
                                        className="flex items-center justify-between px-6 py-4 transition hover:bg-zinc-50 dark:hover:bg-white/5"
                                    >
                                        <div>
                                            <p className="font-medium text-zinc-900 dark:text-white">{r.venue.name}</p>
                                            <p className="text-sm text-zinc-600 dark:text-zinc-500">
                                                {formatTurkishDateTimeFromParts(r.reservation_date, r.reservation_time)}
                                                {r.event && ` • ${r.event.title}`}
                                            </p>
                                        </div>
                                        <span
                                            className={`rounded-full px-3 py-1 text-sm ${
                                                r.status === 'confirmed' || r.status === 'completed'
                                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-green-500/20 dark:text-green-400'
                                                    : r.status === 'pending'
                                                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400'
                                                      : 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-400'
                                            }`}
                                        >
                                            {reservationStatusTr(r.status)}
                                        </span>
                                    </Link>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-white/5 dark:bg-zinc-900/50 dark:shadow-none">
                        <p className="mb-4 font-medium text-zinc-900 dark:text-white">Sahnebul'da neler yapabilirsiniz:</p>
                        <ul className="list-disc space-y-2 pl-6 text-zinc-700 dark:text-zinc-400">
                            <li>
                                <Link href={route('venues.index')} className="text-amber-700 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300">
                                    Mekanları keşfedin
                                </Link>
                            </li>
                            <li>
                                <Link href={route('artists.index')} className="text-amber-700 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300">
                                    Sanatçıları keşfedin
                                </Link>{' '}
                                ve favorileyin
                            </li>
                            <li>Etkinliklere hatırlatıcı ekleyin; panelden e-posta/SMS ve gönderim saatini seçin</li>
                            <li>Rezervasyon yapın</li>
                            <li>Onaylanmış etkinlik rezervasyonunuz varsa etkinlik sayfasından değerlendirme bırakın</li>
                        </ul>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
