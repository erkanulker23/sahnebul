import SeoHead, { metaDescriptionFromContent } from '@/Components/SeoHead';
import { inferTicketAcquisitionMode, type TicketAcquisitionMode } from '@/Components/TicketSalesEditor';
import PublicEventTicketCard, { type PublicEventTicketCardEvent } from '@/Components/PublicEventTicketCard';
import { RichOrPlainContent, isLikelyRichHtml } from '@/Components/SafeRichContent';
import { eventShowParam } from '@/lib/eventShowUrl';
import { formatTurkishDateTime } from '@/lib/formatTurkishDateTime';
import AppLayout from '@/Layouts/AppLayout';
import { sortVenueSocialEntries, venueSocialLinkTitle } from '@/utils/venueSocial';
import { Link, router, useForm, usePage } from '@inertiajs/react';
import { ExternalLink, MessageCircle, Ticket } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Artist {
    id: number;
    name: string;
    slug: string;
    avatar: string | null;
    /** Sunucu: avatar yoksa galeriden tek görsel */
    display_image?: string | null;
    genre: string | null;
    bio: string | null;
}

interface TicketTier {
    id: number;
    name: string;
    description: string | null;
    price: string;
    sort_order: number;
}

interface Event {
    id: number;
    slug: string;
    title: string;
    description: string | null;
    event_rules: string | null;
    start_date: string | null;
    end_date: string | null;
    ticket_price: number | null;
    cover_image: string | null;
    venue: {
        name: string;
        slug: string;
        address: string;
        phone: string | null;
        whatsapp?: string | null;
        website: string | null;
        social_links?: Record<string, string> | null;
        cover_image?: string | null;
        city?: { name: string } | null;
        category?: { name: string } | null;
    };
    artists: Artist[];
    ticket_tiers?: TicketTier[];
    sahnebul_reservation_enabled?: boolean;
    ticket_acquisition_mode?: TicketAcquisitionMode | string | null;
    ticket_outlets?: { label: string; url: string }[];
    ticket_purchase_note?: string | null;
    promo_video_path?: string | null;
    promo_embed_url?: string | null;
}

interface EventReviewRow {
    id: number;
    rating: number;
    comment: string | null;
    created_at: string;
    user: { id: number; name: string; avatar?: string | null };
}

interface Props {
    event: Event;
    venueUpcomingEvents?: PublicEventTicketCardEvent[];
    artistUpcomingEvents?: PublicEventTicketCardEvent[];
    eventReviews?: EventReviewRow[];
    eventCustomerActions?: { canToggle: boolean; hasReminder: boolean };
}

function formatTry(n: number): string {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 2 }).format(n);
}

function isWhatsappUrl(url: string): boolean {
    return /wa\.me|api\.whatsapp\.com|whatsapp\.com/i.test(url);
}

type SharedSeo = { appUrl: string };

function eventReviewStars(rating: number): string {
    const n = Math.min(5, Math.max(1, Math.round(rating)));
    return `${'★'.repeat(n)}${'☆'.repeat(5 - n)}`;
}

function EventPromoSection({
    promoVideoPath,
    promoEmbedUrl,
    resolveStorageSrc,
}: Readonly<{
    promoVideoPath: string | null | undefined;
    promoEmbedUrl: string | null | undefined;
    resolveStorageSrc: (path: string | null) => string | null;
}>) {
    const videoSrc = promoVideoPath ? resolveStorageSrc(promoVideoPath) : null;
    const embed = promoEmbedUrl?.trim() ?? '';

    useEffect(() => {
        if (!embed || !embed.includes('instagram.com')) {
            return;
        }
        const w = window as Window & { instgrm?: { Embeds: { process: () => void } } };
        const scriptSrc = 'https://www.instagram.com/embed.js';
        const existing = document.querySelector(`script[src="${scriptSrc}"]`) as HTMLScriptElement | null;
        const runProcess = () => w.instgrm?.Embeds?.process();
        if (!existing) {
            const script = document.createElement('script');
            script.src = scriptSrc;
            script.async = true;
            script.addEventListener('load', runProcess);
            document.body.appendChild(script);
        } else {
            runProcess();
        }
    }, [embed]);

    if (!videoSrc && !embed) {
        return null;
    }

    const permalink = embed && embed.includes('instagram.com') ? (embed.endsWith('/') ? embed : `${embed}/`) : embed;

    return (
        <section className="scroll-mt-24 rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-zinc-900/60 sm:p-8">
            <h2 className="font-display text-xl font-bold text-zinc-900 dark:text-white">Tanıtım videosu</h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Etkinlik için eklenen tanıtım görüntüsü.</p>
            <div className="mt-5 space-y-6">
                {videoSrc ? (
                    <video src={videoSrc} controls playsInline className="mx-auto w-full max-w-3xl rounded-xl bg-black" />
                ) : null}
                {embed && embed.includes('instagram.com') ? (
                    <div className="flex justify-center overflow-x-auto">
                        <blockquote
                            className="instagram-media"
                            data-instgrm-captioned
                            data-instgrm-permalink={permalink}
                            data-instgrm-version="14"
                            style={{
                                background: 'transparent',
                                border: 0,
                                borderRadius: 12,
                                margin: 0,
                                maxWidth: 540,
                                minWidth: 280,
                                padding: 0,
                                width: '100%',
                            }}
                        />
                    </div>
                ) : embed ? (
                    <a
                        href={embed}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-amber-600 underline dark:text-amber-400"
                    >
                        Tanıtım bağlantısını aç
                    </a>
                ) : null}
            </div>
        </section>
    );
}

function UpcomingEventsSection({
    title,
    description,
    items,
}: Readonly<{
    title: string;
    description?: string;
    items: PublicEventTicketCardEvent[];
}>) {
    if (items.length === 0) return null;
    return (
        <section className="scroll-mt-24">
            <h2 className="font-display text-2xl font-bold text-zinc-900 dark:text-white">{title}</h2>
            {description ? (
                <p className="mt-2 max-w-3xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{description}</p>
            ) : null}
            <ul className="mt-5 grid list-none grid-cols-2 gap-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
                {items.map((ev) => (
                    <li key={ev.id} className="h-full">
                        <PublicEventTicketCard event={ev} />
                    </li>
                ))}
            </ul>
        </section>
    );
}

export default function EventShow({
    event,
    venueUpcomingEvents = [],
    artistUpcomingEvents = [],
    eventReviews = [],
    eventCustomerActions = { canToggle: false, hasReminder: false },
}: Readonly<Props>) {
    const page = usePage();
    const authPayload = (page.props as { auth?: { user?: { id: number } | null } }).auth;
    const authUser = authPayload?.user ?? null;
    const authed = Boolean(authUser);
    const seo = (page.props as { seo?: SharedSeo }).seo;
    const appUrl = (seo?.appUrl ?? '').replace(/\/$/, '');
    const canonicalUrl = appUrl ? `${appUrl}/etkinlikler/${eventShowParam(event)}` : undefined;
    const imageSrc = (path: string | null) => {
        if (!path) return null;
        return path.startsWith('http://') || path.startsWith('https://') ? path : `/storage/${path}`;
    };
    const artistVisual = (a: Artist) => imageSrc(a.display_image ?? a.avatar);
    const heroBackdrop =
        imageSrc(event.cover_image) ??
        event.artists.map((a) => artistVisual(a)).find((src): src is string => Boolean(src)) ??
        imageSrc(event.venue.cover_image ?? null) ??
        null;
    const tiers = event.ticket_tiers ?? [];
    const hasTiers = tiers.length > 0;
    const acquisitionMode = inferTicketAcquisitionMode(event);
    const reservationEnabled = acquisitionMode === 'sahnebul';
    const ticketOutlets = acquisitionMode === 'phone_only' ? [] : (event.ticket_outlets ?? []);
    const purchaseNote = event.ticket_purchase_note?.trim() ?? '';
    const hasTicketChannels =
        acquisitionMode === 'phone_only' ||
        acquisitionMode === 'sahnebul' ||
        ticketOutlets.length > 0 ||
        purchaseNote.length > 0;
    const ticketSectionIntro =
        acquisitionMode === 'external_platforms'
            ? 'Bilet veya rezervasyon aşağıdaki platform bağlantıları üzerinden yapılır; Sahnebul rezervasyon formu bu etkinlik için kullanılmaz.'
            : acquisitionMode === 'sahnebul'
              ? 'Önce Sahnebul üzerinden rezervasyon / bilet talebi oluşturabilirsiniz. Ek olarak harici bağlantılar varsa onlar da listelenir.'
              : 'Bu etkinlikte çevrimiçi bilet satışı yoktur. Rezervasyon için aşağıdaki notu ve mekân iletişim bilgilerini (telefon, WhatsApp) kullanın.';
    const reservationHref = `${route('reservations.create', event.venue.slug)}?event=${event.id}`;
    const mapUrl = `https://www.google.com/maps/search/${encodeURIComponent(event.venue.address)}`;
    const rulesRaw = event.event_rules ?? '';
    const rules = rulesRaw
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
    const defaultRules = [
        'Etkinlik alanına girişte bilet ve kimlik kontrolü yapılır.',
        'Dışarıdan yiyecek ve içecek getirilmesine izin verilmez.',
        'Profesyonel kamera ve kayıt ekipmanları için organizatör onayı gerekir.',
        'Etkinlik başlangıcından sonra iade ve değişim koşulları organizatör kurallarına tabidir.',
    ];
    const displayRules = rules.length > 0 ? rules : defaultRules;
    const ogImage = heroBackdrop;
    const [eventReviewOpen, setEventReviewOpen] = useState(false);
    const eventReviewForm = useForm({ rating: 5, comment: '' });
    const hasEventReviewed = Boolean(authUser && eventReviews.some((r) => r.user.id === authUser.id));
    const submitEventReview = (e: React.FormEvent) => {
        e.preventDefault();
        if (!authed || hasEventReviewed) return;
        eventReviewForm.post(route('event-reviews.store', event.id), {
            preserveScroll: true,
            onSuccess: () => {
                eventReviewForm.reset();
                setEventReviewOpen(false);
            },
        });
    };
    const socialEntries =
        event.venue.social_links && Object.keys(event.venue.social_links).length > 0
            ? sortVenueSocialEntries(event.venue.social_links)
            : [];
    const dateSummary = event.start_date
        ? `Tarih: ${formatTurkishDateTime(event.start_date)}.`
        : 'Tarih yakında açıklanacak.';
    const eventDesc = metaDescriptionFromContent(
        event.description,
        `${event.title} — ${event.venue.name}${event.venue.city?.name ? `, ${event.venue.city.name}` : ''}. ${dateSummary} Bilet ve detaylar Sahnebul’da.`,
    );

    return (
        <AppLayout>
            <SeoHead
                title={`${event.title} - Etkinlik`}
                description={eventDesc}
                image={ogImage}
                type="article"
                canonicalUrl={canonicalUrl}
            />
            <section
                className={`hero-full-bleed relative min-h-[min(52vh,28rem)] overflow-hidden ${heroBackdrop ? 'bg-zinc-950' : 'bg-zinc-200 dark:bg-zinc-950'}`}
            >
                {heroBackdrop ? (
                    <img src={heroBackdrop} alt={event.title} className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                    <div className="absolute inset-0" aria-hidden>
                        <div className="absolute inset-0 bg-gradient-to-br from-zinc-100 via-zinc-200 to-zinc-300 dark:from-zinc-800 dark:via-zinc-950 dark:to-black" />
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_20%_25%,rgba(217,119,6,0.2),transparent_55%)] dark:bg-[radial-gradient(ellipse_80%_60%_at_20%_25%,rgba(245,158,11,0.22),transparent_55%)]" />
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_85%_70%,rgba(180,83,9,0.1),transparent_50%)] dark:bg-[radial-gradient(ellipse_70%_50%_at_85%_70%,rgba(180,83,9,0.12),transparent_50%)]" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Ticket
                                className="h-[min(40vw,11rem)] w-[min(40vw,11rem)] text-amber-700/20 dark:text-amber-400/15"
                                strokeWidth={1}
                            />
                        </div>
                    </div>
                )}
                <div
                    className={
                        heroBackdrop
                            ? 'absolute inset-0 bg-zinc-950/70'
                            : 'absolute inset-0 bg-zinc-950/52 dark:bg-zinc-950/70'
                    }
                />
                <div className="relative mx-auto w-full max-w-7xl px-3 py-10 sm:px-5 sm:py-12 lg:px-8 lg:py-16">
                    <Link href={route('venues.show', event.venue.slug)} className="text-sm text-amber-300 hover:text-amber-200">← Mekana dön</Link>
                    <div className="mt-6 max-w-4xl">
                        <p className="text-sm">
                            <Link
                                href={route('venues.show', event.venue.slug)}
                                className="inline-flex flex-wrap items-baseline gap-x-1.5 rounded-sm text-zinc-100 transition hover:text-amber-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
                            >
                                <span className="font-medium">{event.venue.name}</span>
                                {event.venue.city?.name ? (
                                    <span className="font-normal text-zinc-300">· {event.venue.city.name}</span>
                                ) : null}
                            </Link>
                        </p>
                        <h1 className="mt-2 font-display text-4xl font-bold text-white sm:text-5xl">{event.title}</h1>
                        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                            <span className="rounded-full bg-amber-500 px-3 py-1 font-semibold text-zinc-900">{event.venue.category?.name ?? 'Etkinlik'}</span>
                            {event.start_date ? (
                                <span className="rounded-full bg-white/10 px-3 py-1 text-zinc-100">
                                    {formatTurkishDateTime(event.start_date)}
                                </span>
                            ) : (
                                <span className="rounded-full bg-white/10 px-3 py-1 text-zinc-200">Tarih duyurulacak</span>
                            )}
                            {!hasTiers && event.ticket_price != null && (
                                <span className="rounded-full bg-emerald-500 px-3 py-1 font-semibold text-white">{formatTry(Number(event.ticket_price))}</span>
                            )}
                            {hasTiers && (
                                <span className="rounded-full bg-emerald-500 px-3 py-1 font-semibold text-white">
                                    {formatTry(Math.min(...tiers.map((t) => parseFloat(t.price))))}
                                    {Math.max(...tiers.map((t) => parseFloat(t.price))) !== Math.min(...tiers.map((t) => parseFloat(t.price))) &&
                                        ` – ${formatTry(Math.max(...tiers.map((t) => parseFloat(t.price))))}`}
                                </span>
                            )}
                        </div>
                        <div className="mt-6 flex flex-wrap items-center gap-3">
                            {eventCustomerActions.canToggle ? (
                                <>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            router.post(route('user.event-reminders.toggle', event.id), {}, { preserveScroll: true })
                                        }
                                        className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20"
                                    >
                                        {eventCustomerActions.hasReminder
                                            ? 'E-posta hatırlatıcısını kapat'
                                            : 'Yarın e-posta hatırlat + takvime ekle'}
                                    </button>
                                    {eventCustomerActions.hasReminder ? (
                                        <a
                                            href={route('user.events.ics', event.id)}
                                            className="text-sm text-amber-300 underline hover:text-amber-200"
                                        >
                                            Takvim dosyası (.ics) indir
                                        </a>
                                    ) : null}
                                </>
                            ) : !authed ? (
                                <Link
                                    href={route('login', { redirect: `/etkinlikler/${eventShowParam(event)}` })}
                                    className="rounded-full border border-amber-400/40 px-4 py-2 text-sm font-medium text-amber-200 hover:bg-amber-500/10"
                                >
                                    Hatırlatıcı için giriş yapın
                                </Link>
                            ) : null}
                        </div>
                    </div>
                </div>
            </section>

            <div className="mx-auto w-full max-w-6xl -mx-2.5 px-3 py-8 sm:mx-auto sm:px-5 sm:py-10 lg:px-8">
                <div className="lg:grid lg:grid-cols-3 lg:items-start lg:gap-10">
                    <div className="space-y-8 lg:col-span-2">
                        <EventPromoSection
                            promoVideoPath={event.promo_video_path}
                            promoEmbedUrl={event.promo_embed_url}
                            resolveStorageSrc={imageSrc}
                        />
                        <div className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-zinc-900/60 sm:p-8">
                            {event.description?.trim() && (
                                <RichOrPlainContent
                                    content={event.description}
                                    richClassName="prose prose-zinc max-w-none dark:prose-invert prose-p:leading-relaxed prose-p:text-zinc-700 dark:prose-p:text-zinc-300 prose-headings:font-semibold prose-a:text-amber-600 dark:prose-a:text-amber-400"
                                    plainParagraphClassName="leading-relaxed text-zinc-700 dark:text-zinc-300"
                                />
                            )}
                        </div>

                        {hasTiers && (
                            <div className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-zinc-900/60 sm:p-6">
                                <h2 className="font-display text-xl font-bold text-zinc-900 dark:text-white">Bilet fiyatları</h2>
                                <p className="mt-1 text-sm text-zinc-500">Kategoriye göre farklı fiyatlar geçerlidir.</p>
                                <div className="mt-4 overflow-x-auto">
                                    <table className="w-full min-w-[280px] text-left text-sm">
                                        <thead>
                                            <tr className="border-b border-zinc-200 dark:border-white/10">
                                                <th className="pb-3 pr-4 font-semibold text-zinc-700 dark:text-zinc-200">Kategori</th>
                                                <th className="pb-3 font-semibold text-zinc-700 dark:text-zinc-200">Fiyat</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-zinc-100 dark:divide-white/10">
                                            {tiers
                                                .slice()
                                                .sort((a, b) => a.sort_order - b.sort_order)
                                                .map((t) => (
                                                    <tr key={t.id}>
                                                        <td className="py-3 pr-4 align-top">
                                                            <span className="font-medium text-zinc-900 dark:text-white">{t.name}</span>
                                                            {t.description && (
                                                                <span className="mt-0.5 block text-xs text-zinc-500">{t.description}</span>
                                                            )}
                                                        </td>
                                                        <td className="py-3 align-top font-bold text-amber-600 dark:text-amber-400 whitespace-nowrap">
                                                            {formatTry(parseFloat(t.price))}
                                                        </td>
                                                    </tr>
                                                ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        <div
                            id="bilet-kanallari"
                            className="scroll-mt-24 rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-zinc-900/60 sm:p-6"
                        >
                            <h2 className="font-display text-xl font-bold text-zinc-900 dark:text-white">Biletleri nereden alabilirsiniz?</h2>
                            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{ticketSectionIntro}</p>
                            {hasTicketChannels ? (
                                <div className="mt-5 space-y-4">
                                    {reservationEnabled && (
                                        <Link
                                            href={reservationHref}
                                            className="flex items-center gap-3 rounded-xl border-2 border-amber-400/60 bg-amber-500/10 p-4 transition hover:border-amber-400 hover:bg-amber-500/15 dark:border-amber-500/40 dark:bg-amber-500/10"
                                        >
                                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-500 text-zinc-950">
                                                <Ticket className="h-5 w-5" aria-hidden />
                                            </span>
                                            <span className="min-w-0 text-left">
                                                <span className="block font-semibold text-zinc-900 dark:text-white">Sahnebul üzerinden rezervasyon</span>
                                                <span className="mt-0.5 block text-xs text-zinc-600 dark:text-zinc-400">
                                                    Giriş yaparak bilet / masa talebi oluşturabilirsiniz; etkinlik bu formda önceden seçilir.
                                                </span>
                                            </span>
                                        </Link>
                                    )}
                                    {ticketOutlets.length > 0 && (
                                        <ul className="space-y-2">
                                            {ticketOutlets.map((o) => {
                                                const wa = isWhatsappUrl(o.url);
                                                return (
                                                    <li key={`${o.label}-${o.url}`}>
                                                        <a
                                                            href={o.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition ${
                                                                wa
                                                                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-800 hover:border-emerald-500/60 dark:text-emerald-200'
                                                                    : 'border-zinc-200 bg-zinc-50 text-zinc-900 hover:border-amber-400/50 dark:border-white/10 dark:bg-zinc-800/80 dark:text-white dark:hover:border-amber-500/30'
                                                            }`}
                                                        >
                                                            <span className="flex min-w-0 items-center gap-2">
                                                                {wa ? (
                                                                    <MessageCircle className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
                                                                ) : (
                                                                    <ExternalLink className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                                                                )}
                                                                <span className="truncate">{o.label}</span>
                                                            </span>
                                                            <span className="shrink-0 text-xs font-normal opacity-80">Aç →</span>
                                                        </a>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    )}
                                    {purchaseNote.length > 0 && (
                                        <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-4 text-sm text-zinc-700 dark:border-white/10 dark:bg-zinc-800/50 dark:text-zinc-300">
                                            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Rezervasyon / bilet notu</p>
                                            <div className="mt-2 whitespace-pre-wrap">{purchaseNote}</div>
                                        </div>
                                    )}
                                    {acquisitionMode === 'phone_only' && purchaseNote.length === 0 && (
                                        <p className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-4 text-sm text-zinc-700 dark:border-white/10 dark:bg-zinc-800/50 dark:text-zinc-300">
                                            Rezervasyon ve bilgi için bu sayfadaki <strong>Mekan iletişimi</strong> bölümündeki telefon veya WhatsApp satırlarını kullanın.
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
                                    Bu etkinlik için henüz bilet veya rezervasyon kanalı tanımlanmamış. Bilgi için aşağıdaki mekân iletişimini kullanabilirsiniz.
                                </p>
                            )}
                        </div>

                        <div className="grid gap-6 sm:grid-cols-2">
                            <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-zinc-900/60">
                                <p className="text-xs uppercase tracking-wide text-zinc-500">Etkinlik Tarihi</p>
                                {event.start_date ? (
                                    <p className="mt-2 font-semibold">{formatTurkishDateTime(event.start_date)}</p>
                                ) : (
                                    <p className="mt-2 font-semibold text-zinc-600 dark:text-zinc-400">Henüz açıklanmadı</p>
                                )}
                            </div>
                            <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-zinc-900/60">
                                <p className="text-xs uppercase tracking-wide text-zinc-500">Mekan / Kategori</p>
                                <p className="mt-2 font-semibold">
                                    <Link
                                        href={route('venues.show', event.venue.slug)}
                                        className="text-zinc-900 hover:text-amber-600 hover:underline dark:text-white dark:hover:text-amber-400"
                                    >
                                        {event.venue.name}
                                    </Link>
                                </p>
                                <p className="mt-1 text-sm text-amber-600 dark:text-amber-400">{event.venue.category?.name ?? '-'}</p>
                                <p className="mt-1 text-sm text-zinc-500">{event.venue.address}</p>
                            </div>
                            <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-zinc-900/60 sm:col-span-2">
                                <p className="text-xs uppercase tracking-wide text-zinc-500">Mekan iletişimi</p>
                                <p className="mt-2 font-semibold text-zinc-900 dark:text-white">
                                    <Link
                                        href={route('venues.show', event.venue.slug)}
                                        className="hover:text-amber-600 hover:underline dark:hover:text-amber-400"
                                    >
                                        {event.venue.name}
                                    </Link>
                                </p>
                                <div className="mt-4 space-y-4 text-sm">
                                    {event.venue.phone && (
                                        <div>
                                            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Telefon</p>
                                            <a
                                                href={`tel:${event.venue.phone.replaceAll(/\s/g, '')}`}
                                                className="mt-1 block text-amber-600 hover:text-amber-500 dark:text-amber-400"
                                            >
                                                {event.venue.phone}
                                            </a>
                                        </div>
                                    )}
                                    {event.venue.whatsapp && (
                                        <div>
                                            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">WhatsApp</p>
                                            <a
                                                href={`https://wa.me/${event.venue.whatsapp.replaceAll(/[^\d]/g, '')}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="mt-1 block text-emerald-600 hover:text-emerald-500 dark:text-emerald-400"
                                            >
                                                {event.venue.whatsapp}
                                            </a>
                                        </div>
                                    )}
                                    {event.venue.website && (
                                        <div>
                                            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Web sitesi</p>
                                            <a
                                                href={event.venue.website}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="mt-1 block text-amber-600 hover:text-amber-500 dark:text-amber-400"
                                            >
                                                {event.venue.website.replace(/^https?:\/\//, '')}
                                            </a>
                                        </div>
                                    )}
                                    {socialEntries.length > 0 && (
                                        <div>
                                            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Sosyal medya</p>
                                            <div className="mt-2 flex flex-wrap gap-2">
                                                {socialEntries.map(([key, url]) => (
                                                    <a
                                                        key={key}
                                                        href={url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:border-amber-400/50 hover:text-amber-600 dark:border-white/10 dark:bg-zinc-800/80 dark:text-zinc-300 dark:hover:text-amber-400"
                                                    >
                                                        {venueSocialLinkTitle(key)}
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="mt-4 flex flex-wrap gap-3 border-t border-zinc-100 pt-4 dark:border-white/10">
                                    <a
                                        href={mapUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-sm font-medium text-amber-600 hover:text-amber-500 dark:text-amber-400"
                                    >
                                        Haritada aç →
                                    </a>
                                    <Link
                                        href={route('venues.show', event.venue.slug)}
                                        className="inline-flex items-center gap-1 text-sm font-medium text-zinc-600 hover:text-amber-600 dark:text-zinc-400 dark:hover:text-amber-400"
                                    >
                                        Mekan sayfası →
                                    </Link>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-zinc-900/60 sm:p-6">
                    <h2 className="font-display text-2xl font-bold">Etkinlik Kuralları</h2>
                    {isLikelyRichHtml(rulesRaw) ? (
                        <div className="mt-4 text-sm text-zinc-700 dark:text-zinc-300">
                            <RichOrPlainContent
                                content={rulesRaw}
                                richClassName="prose prose-zinc max-w-none dark:prose-invert prose-p:my-2 prose-ul:my-2 prose-a:text-amber-600 dark:prose-a:text-amber-400"
                                plainParagraphClassName="text-zinc-700 dark:text-zinc-300"
                            />
                        </div>
                    ) : (
                        <ul className="mt-4 space-y-2">
                            {displayRules.map((rule) => (
                                <li key={rule} className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                                    <span className="mt-0.5 text-amber-500">•</span>
                                    <span>{rule}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-zinc-900/60 sm:p-6">
                    <h2 className="font-display text-xl font-bold text-zinc-900 dark:text-white">Etkinlik değerlendirmeleri</h2>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        Bu geceyi deneyimleyenlerin notları. Mekân yorumları için{' '}
                        <Link href={route('venues.show', event.venue.slug)} className="text-amber-600 hover:underline dark:text-amber-400">
                            mekân sayfasına
                        </Link>{' '}
                        göz atın.
                    </p>
                    {eventReviews.length > 0 && (
                        <ul className="mt-5 space-y-4">
                            {eventReviews.map((r) => {
                                const av = imageSrc(r.user.avatar ?? null);
                                return (
                                    <li
                                        key={r.id}
                                        className="border-b border-zinc-100 pb-4 last:border-0 last:pb-0 dark:border-white/10"
                                    >
                                        <div className="flex gap-3">
                                            {av ? (
                                                <img src={av} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
                                            ) : (
                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-sm text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400">
                                                    {(r.user.name || '?').slice(0, 1).toUpperCase()}
                                                </div>
                                            )}
                                            <div className="min-w-0">
                                                <p className="font-medium text-zinc-900 dark:text-white">{r.user.name}</p>
                                                <p className="text-sm text-amber-600 dark:text-amber-400">
                                                    {eventReviewStars(r.rating)}{' '}
                                                    <span className="text-zinc-500 dark:text-zinc-400">{r.rating}/5</span>
                                                </p>
                                                {r.comment?.trim() ? (
                                                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{r.comment}</p>
                                                ) : null}
                                                <p className="mt-1 text-xs text-zinc-400">
                                                    {formatTurkishDateTime(r.created_at)}
                                                </p>
                                            </div>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                    {authed && !hasEventReviewed && (
                        <div className="mt-5">
                            {!eventReviewOpen ? (
                                <button
                                    type="button"
                                    onClick={() => setEventReviewOpen(true)}
                                    className="rounded-xl border border-amber-500/50 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-500/15 dark:text-amber-200"
                                >
                                    Bu etkinliği değerlendir
                                </button>
                            ) : (
                                <form onSubmit={submitEventReview} className="max-w-md space-y-3 rounded-xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-white/10 dark:bg-zinc-800/50">
                                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">
                                        Puan
                                        <select
                                            value={eventReviewForm.data.rating}
                                            onChange={(e) => eventReviewForm.setData('rating', Number(e.target.value))}
                                            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-white/10 dark:bg-zinc-900 dark:text-white"
                                        >
                                            {[5, 4, 3, 2, 1].map((n) => (
                                                <option key={n} value={n}>
                                                    {n} — {eventReviewStars(n)}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">
                                        Yorum (isteğe bağlı)
                                        <textarea
                                            value={eventReviewForm.data.comment}
                                            onChange={(e) => eventReviewForm.setData('comment', e.target.value)}
                                            rows={3}
                                            maxLength={2000}
                                            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-white/10 dark:bg-zinc-900 dark:text-white"
                                        />
                                    </label>
                                    {(eventReviewForm.errors as { rating?: string; comment?: string }).rating && (
                                        <p className="text-sm text-red-600">
                                            {(eventReviewForm.errors as { rating?: string }).rating}
                                        </p>
                                    )}
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            type="submit"
                                            disabled={eventReviewForm.processing}
                                            className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-amber-400 disabled:opacity-50"
                                        >
                                            Gönder
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setEventReviewOpen(false)}
                                            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm dark:border-white/15"
                                        >
                                            Vazgeç
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    )}
                    {!authed && (
                        <p className="mt-4 text-sm text-zinc-500">
                            Değerlendirme yapmak için{' '}
                            <Link
                                href={route('login', { redirect: `/etkinlikler/${eventShowParam(event)}` })}
                                className="text-amber-600 hover:underline dark:text-amber-400"
                            >
                                giriş yapın
                            </Link>
                            .
                        </p>
                    )}
                    {authed && hasEventReviewed && (
                        <p className="mt-4 text-sm text-zinc-500">Bu etkinlik için zaten değerlendirme yaptınız.</p>
                    )}
                </div>

                {event.artists.length > 0 && (
                    <div className="mt-8">
                        <h2 className="mb-4 font-display text-2xl font-bold">Performans Sanatçıları</h2>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {event.artists.map((artist) => (
                                <Link key={artist.id} href={route('artists.show', artist.slug)} className="rounded-xl border border-zinc-200 bg-white p-4 transition hover:border-amber-400 dark:border-white/10 dark:bg-zinc-900/60">
                                    <div className="flex items-center gap-3">
                                        {artistVisual(artist) ? (
                                            <img src={artistVisual(artist) ?? ''} alt={artist.name} className="h-14 w-14 rounded-full object-cover" />
                                        ) : (
                                            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-700">🎤</div>
                                        )}
                                        <div>
                                            <p className="font-semibold">{artist.name}</p>
                                            <p className="text-sm text-zinc-500">{artist.genre ?? 'Sanatçı'}</p>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
                    </div>

                    <aside className="mt-10 lg:mt-0">
                        {hasTicketChannels && (
                            <div className="mb-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-zinc-900/80">
                                <h3 className="font-display text-sm font-bold uppercase tracking-wide text-zinc-500">Hızlı erişim</h3>
                                <div className="mt-3 space-y-2">
                                    {acquisitionMode === 'phone_only' ? (
                                        <a
                                            href="#bilet-kanallari"
                                            className="block w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-center text-sm font-medium text-zinc-800 hover:border-amber-400/50 dark:border-white/10 dark:text-zinc-200"
                                        >
                                            Rezervasyon / iletişim ↓
                                        </a>
                                    ) : (
                                        <>
                                            {reservationEnabled && (
                                                <Link
                                                    href={reservationHref}
                                                    className="block w-full rounded-xl bg-amber-500 px-4 py-3 text-center text-sm font-semibold text-zinc-950 hover:bg-amber-400"
                                                >
                                                    Sahnebul’da rezervasyon
                                                </Link>
                                            )}
                                            {ticketOutlets.slice(0, 4).map((o) => (
                                                <a
                                                    key={`aside-${o.label}-${o.url}`}
                                                    href={o.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="block w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-center text-sm font-medium text-zinc-800 hover:border-amber-400/50 dark:border-white/10 dark:text-zinc-200"
                                                >
                                                    {o.label}
                                                </a>
                                            ))}
                                            {(ticketOutlets.length > 4 || purchaseNote.length > 0) && (
                                                <a
                                                    href="#bilet-kanallari"
                                                    className="block w-full py-2 text-center text-xs font-medium text-amber-600 hover:text-amber-500 dark:text-amber-400"
                                                >
                                                    Tüm kanallar ve notlar ↓
                                                </a>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                        {hasTiers ? (
                            <div className="sticky top-24 rounded-2xl border-2 border-zinc-200 bg-white p-4 shadow-lg dark:border-white/10 dark:bg-zinc-900/80 sm:p-6">
                                <h3 className="font-display text-lg font-bold text-zinc-900 dark:text-white">Bilet kategorileri</h3>
                                <p className="mt-1 text-xs text-zinc-500">Salon bölümüne göre fiyatlar</p>
                                <label htmlFor="tier-select" className="mt-4 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                    Kategori
                                </label>
                                <select
                                    id="tier-select"
                                    className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-3 py-3 text-sm font-medium text-zinc-900 dark:border-white/10 dark:bg-zinc-800 dark:text-white"
                                    defaultValue={tiers[0]?.id}
                                >
                                    {tiers.map((t) => (
                                        <option key={t.id} value={t.id}>
                                            {t.name}
                                            {t.description ? ` (${t.description})` : ''} — {formatTry(parseFloat(t.price))}
                                        </option>
                                    ))}
                                </select>
                                <ul className="mt-4 space-y-3 border-t border-zinc-100 pt-4 dark:border-white/10">
                                    {tiers.map((t) => (
                                        <li key={t.id} className="flex items-start justify-between gap-3 text-sm">
                                            <span className="text-zinc-700 dark:text-zinc-300">
                                                <span className="font-semibold">{t.name}</span>
                                                {t.description && <span className="block text-xs text-zinc-500">{t.description}</span>}
                                            </span>
                                            <span className="shrink-0 font-bold text-amber-600 dark:text-amber-400">{formatTry(parseFloat(t.price))}</span>
                                        </li>
                                    ))}
                                </ul>
                                <p className="mt-4 text-xs text-zinc-500">
                                    {hasTicketChannels
                                        ? 'Satın alma seçenekleri yukarıda ve “Biletleri nereden alabilirsiniz?” bölümünde.'
                                        : 'Bilet bilgisi için mekân iletişimini kullanın.'}
                                </p>
                            </div>
                        ) : (
                            event.ticket_price != null && (
                                <div className="sticky top-24 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-zinc-900/80 sm:p-6">
                                    <h3 className="font-display text-lg font-bold">Bilet fiyatı</h3>
                                    <p className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">{formatTry(Number(event.ticket_price))}</p>
                                    {hasTicketChannels && (
                                        <a
                                            href="#bilet-kanallari"
                                            className="mt-4 inline-block text-sm font-medium text-amber-600 hover:text-amber-500 dark:text-amber-400"
                                        >
                                            Nereden alınır? →
                                        </a>
                                    )}
                                </div>
                            )
                        )}
                    </aside>

                    <div className="mt-12 space-y-12 border-t border-zinc-200 pt-12 dark:border-white/10 lg:col-span-3 lg:mt-14 lg:space-y-14 lg:pt-14">
                        <UpcomingEventsSection
                            title="Bu mekânda yaklaşan etkinlikler"
                            description="Aynı mekânda, bugünden sonra gerçekleşecek diğer yayında etkinlikler (farklı sanatçılar dahil)."
                            items={venueUpcomingEvents}
                        />
                        <UpcomingEventsSection
                            title="Sanatçıların diğer yaklaşan etkinlikleri"
                            description="Bu etkinlikte sahne alan sanatçıların, başka mekânlarda planlanan yakın tarihli yayınları."
                            items={artistUpcomingEvents}
                        />
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}

