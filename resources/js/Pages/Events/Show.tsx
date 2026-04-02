import {
    PublicPromoGallerySection,
    type PromoGalleryItem,
    promoGalleryItemsFromEntity,
} from '@/Components/PublicPromoGallerySection';
import SeoHead, { metaDescriptionFromContent } from '@/Components/SeoHead';
import {
    inferTicketAcquisitionMode,
    isSahnebulTicketFamily,
    type TicketAcquisitionMode,
} from '@/Components/TicketSalesEditor';
import DetailEventList, { type DetailEventListItem } from '@/Components/DetailEventList';
import PublicEventTicketCard, { type PublicEventTicketCardEvent } from '@/Components/PublicEventTicketCard';
import { AdSlot } from '@/Components/AdSlot';
import EventHeroFallbackBackdrop from '@/Components/EventHeroFallbackBackdrop';
import { EditorialShareStrip } from '@/Components/EditorialShareStrip';
import EventRelativeDayPill from '@/Components/EventRelativeDayPill';
import { RichOrPlainContent, isLikelyRichHtml } from '@/Components/SafeRichContent';
import { eventShowParam } from '@/lib/eventShowUrl';
import {
    googleMapsDirectionsUrl,
    googleMapsOpenUrl,
    venueMapAddressDisplay,
} from '@/lib/googleMapsOpenUrl';
import { isRemoteSocialOgJunkUrl } from '@/lib/eventPublicImage';
import { formatTurkishEventTimeRange, isEventOngoingNow } from '@/lib/eventRuntime';
import { eventRelativeDayKind } from '@/lib/eventRelativeDay';
import { formatTurkishDateTime } from '@/lib/formatTurkishDateTime';
import AppLayout from '@/Layouts/AppLayout';
import { sortVenueSocialEntries, venueSocialLinkTitle } from '@/utils/venueSocial';
import { Link, router, useForm, usePage } from '@inertiajs/react';
import { CalendarDays, ExternalLink, MessageCircle, Navigation, Sparkles, Ticket } from 'lucide-react';
import { useLayoutEffect, useMemo, useState } from 'react';

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
    /** Konser, tiyatro, stand-up vb. — admin/sahne panelinde isteğe bağlı */
    event_type?: string | null;
    description: string | null;
    event_rules: string | null;
    start_date: string | null;
    end_date: string | null;
    ticket_price: number | null;
    entry_is_paid?: boolean;
    cover_image: string | null;
    /** Kart görseli; kapak yokken kahraman alanında sanatçı yerine etkinliğe ait görsel olarak kullanılır */
    listing_image?: string | null;
    venue: {
        name: string;
        slug: string;
        address: string;
        phone: string | null;
        whatsapp?: string | null;
        website: string | null;
        social_links?: Record<string, string> | null;
        cover_image?: string | null;
        latitude?: number | string | null;
        longitude?: number | string | null;
        google_maps_url?: string | null;
        city?: { name: string } | null;
        category?: { name: string } | null;
    };
    artists: Artist[];
    ticket_tiers?: TicketTier[];
    sahnebul_reservation_enabled?: boolean;
    paytr_checkout_enabled?: boolean;
    ticket_acquisition_mode?: TicketAcquisitionMode | string | null;
    ticket_outlets?: { label: string; url: string }[];
    ticket_purchase_note?: string | null;
    promo_video_path?: string | null;
    promo_embed_url?: string | null;
    promo_gallery?: PromoGalleryItem[] | null;
    /** Sunucu: başlangıç–bitiş aralığında (PHP ile aynı mantık) */
    is_ongoing?: boolean;
    /** Sunucu: bitiş zamanı geçtiyse bilet / rezervasyon / harici linkler kapalı */
    has_finished?: boolean;
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
    /** Sunucu: Organization + MusicEvent + BreadcrumbList (@graph) */
    documentStructuredData?: Record<string, unknown> | null;
    venueUpcomingEvents?: PublicEventTicketCardEvent[];
    artistUpcomingEvents?: PublicEventTicketCardEvent[];
    eventReviews?: EventReviewRow[];
    eventCustomerActions?: {
        /** Sunucu start_date->isFuture() — istemci saat/tarih parse ile uyumsuzluk olmasın */
        followUiVisible?: boolean;
        canToggle: boolean;
        hasReminder: boolean;
        needsEmailVerificationForFollow?: boolean;
    };
    /** Onaylı / tamamlanmış etkinlik rezervasyonu olan ziyaretçi değerlendirme gönderebilir */
    eventReviewEligibility?: { canSubmit: boolean };
    /** Sunucu: PayTR açık + Sahnebul satış + ücretli bilet */
    paytrCheckoutAvailable?: boolean;
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

/** Sanatçı profilindeki “Etkinlikleri Listele” ile aynı satır / ay gruplu düzen */
function ArtistOtherUpcomingOnEventShow({
    description,
    items,
    artistNamesLine,
    imageSrc,
}: Readonly<{
    description?: string;
    items: PublicEventTicketCardEvent[];
    artistNamesLine: string;
    imageSrc: (path: string | null | undefined) => string | null;
}>) {
    const [selectedCity, setSelectedCity] = useState('Tümü');
    const cityOptions = useMemo(() => {
        const set = new Set<string>();
        items.forEach((ev) => {
            const n = ev.venue?.city?.name?.trim();
            if (n) set.add(n);
        });
        return ['Tümü', ...Array.from(set).sort((a, b) => a.localeCompare(b, 'tr'))];
    }, [items]);
    const filtered = useMemo(
        () => items.filter((ev) => selectedCity === 'Tümü' || ev.venue?.city?.name === selectedCity),
        [items, selectedCity],
    );
    const detailItems: DetailEventListItem[] = useMemo(
        () =>
            filtered.map((ev) => ({
                id: ev.id,
                slug: ev.slug,
                title: ev.title,
                start_date: ev.start_date,
                end_date: ev.end_date ?? null,
                cover_image: ev.cover_image,
                listing_image: ev.listing_image,
                status: ev.status,
                is_full: ev.is_full,
                ticket_acquisition_mode: ev.ticket_acquisition_mode,
                sahnebul_reservation_enabled: ev.sahnebul_reservation_enabled,
                venue: {
                    name: ev.venue.name,
                    slug: ev.venue.slug,
                    city: ev.venue.city,
                    district: ev.venue.district,
                },
                artists: ev.artists.map((a) => ({
                    id: a.id,
                    name: a.name,
                    slug: a.slug,
                    avatar: a.avatar,
                })),
            })),
        [filtered],
    );
    const showCityFilter = cityOptions.length > 1;

    return (
        <section className="scroll-mt-24">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
                <div className="min-w-0">
                    <h2 className="font-display text-lg font-bold text-zinc-900 dark:text-white sm:text-xl">
                        Sanatçıların diğer yaklaşan etkinlikleri
                    </h2>
                    <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">
                        {artistNamesLine}
                        {' '}
                        — yaklaşan etkinlikler (ay ay)
                    </p>
                    {description ? (
                        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{description}</p>
                    ) : null}
                </div>
                {showCityFilter ? (
                    <div className="flex items-center gap-2">
                        <label
                            htmlFor="event-show-artist-other-city"
                            className="shrink-0 text-xs font-medium text-zinc-500 dark:text-zinc-400"
                        >
                            Şehir
                        </label>
                        <select
                            id="event-show-artist-other-city"
                            value={selectedCity}
                            onChange={(e) => setSelectedCity(e.target.value)}
                            className="max-w-[min(100vw-6rem,14rem)] rounded-md border border-zinc-300 bg-white py-1.5 pr-8 pl-2.5 text-sm text-zinc-900 shadow-sm focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400 dark:border-white/15 dark:bg-zinc-800 dark:text-zinc-100"
                        >
                            {cityOptions.map((city) => (
                                <option key={city} value={city}>
                                    {city}
                                </option>
                            ))}
                        </select>
                    </div>
                ) : null}
            </div>
            {detailItems.length > 0 ? (
                <DetailEventList events={detailItems} imageSrc={imageSrc} context="artist" showHeading={false} />
            ) : (
                <p className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-6 py-10 text-center text-sm text-zinc-600 dark:border-white/10 dark:bg-zinc-900/40 dark:text-zinc-400">
                    Seçilen şehir için yaklaşan etkinlik yok. Farklı bir şehir seçin veya &quot;Tümü&quot;ne dönün.
                </p>
            )}
        </section>
    );
}

export default function EventShow({
    event,
    documentStructuredData = null,
    venueUpcomingEvents = [],
    artistUpcomingEvents = [],
    eventReviews = [],
    eventCustomerActions = {
        followUiVisible: false,
        canToggle: false,
        hasReminder: false,
        needsEmailVerificationForFollow: false,
    },
    eventReviewEligibility = { canSubmit: false },
    paytrCheckoutAvailable = false,
}: Readonly<Props>) {
    const page = usePage();
    const eventTypeSlug = event.event_type?.trim() ?? '';
    const eventTypeTags =
        (page.props as { globalSearch?: { event_type_tags?: { slug: string; label: string }[] } }).globalSearch?.event_type_tags ??
        [];
    const eventTypeLabel =
        eventTypeSlug !== '' ? eventTypeTags.find((t) => t.slug === eventTypeSlug)?.label ?? null : null;
    const authPayload = (page.props as { auth?: { user?: { id: number } | null } }).auth;
    const authUser = authPayload?.user ?? null;
    const authed = Boolean(authUser);
    const canSubmitEventReview = eventReviewEligibility.canSubmit === true;
    const seo = (page.props as { seo?: SharedSeo }).seo;
    const appUrl = (seo?.appUrl ?? '').replace(/\/$/, '');
    const canonicalUrl = appUrl ? `${appUrl}/etkinlikler/${eventShowParam(event)}` : undefined;
    const imageSrc = (path: string | null | undefined) => {
        if (!path) return null;
        return path.startsWith('http://') || path.startsWith('https://') ? path : `/storage/${path}`;
    };
    const artistVisual = (a: Artist) => imageSrc(a.display_image ?? a.avatar);
    /** Yalnız «kapak» (detay); liste görseli veya IG önizleme URL’si hero’da kullanılmaz. */
    const coverRaw = event.cover_image?.trim() ?? '';
    const heroBackdrop =
        coverRaw !== '' && !isRemoteSocialOgJunkUrl(coverRaw) ? imageSrc(coverRaw) : null;
    const tiers = event.ticket_tiers ?? [];
    const hasTiers = tiers.length > 0;
    const [checkoutTierId, setCheckoutTierId] = useState(() => tiers[0]?.id ?? 0);
    const entryFree = event.entry_is_paid === false;
    const acquisitionMode = inferTicketAcquisitionMode({
        ...event,
        paytr_checkout_enabled: event.paytr_checkout_enabled !== false,
    });
    const reservationEnabled =
        acquisitionMode === 'sahnebul_reservation' ||
        (acquisitionMode === 'sahnebul' && event.sahnebul_reservation_enabled !== false);
    const ticketOutlets = acquisitionMode === 'phone_only' ? [] : (event.ticket_outlets ?? []);
    const purchaseNote = event.ticket_purchase_note?.trim() ?? '';
    const hasTicketChannels =
        acquisitionMode === 'phone_only' ||
        (isSahnebulTicketFamily(acquisitionMode) &&
            (reservationEnabled || paytrCheckoutAvailable || ticketOutlets.length > 0 || purchaseNote.length > 0)) ||
        (acquisitionMode === 'external_platforms' && (ticketOutlets.length > 0 || purchaseNote.length > 0));
    const eventHasFinished = event.has_finished === true;
    const ticketUiActive = hasTicketChannels && !eventHasFinished;
    const ticketSectionIntro =
        acquisitionMode === 'external_platforms'
            ? 'Bilet veya rezervasyon aşağıdaki platform bağlantıları üzerinden yapılır; bu etkinlik için Sahnebul rezervasyon formu kullanılmaz.'
            : isSahnebulTicketFamily(acquisitionMode)
              ? (() => {
                    const card = paytrCheckoutAvailable;
                    const res = reservationEnabled;
                    if (entryFree) {
                        return 'Bu etkinlik ücretsiz girişlidir. Aşağıda varsa harici bağlantılar veya not yer alır.';
                    }
                    if (card && res) {
                        return 'Ücretli bilet için kredi kartı ile ödeme (PayTR) veya aşağıdaki rezervasyon formu ile ön talep oluşturabilirsiniz.';
                    }
                    if (card) {
                        return 'Ücretli bilet için aşağıdan kredi kartı ile güvenli ödeme (PayTR) yapabilirsiniz.';
                    }
                    if (res) {
                        return 'Sahnebul üzerinden rezervasyon / bilet talebi için aşağıdaki formu kullanın. Harici bağlantılar varsa listelenir.';
                    }
                    return 'Bilet ve rezervasyon kanalları aşağıdadır.';
                })()
              : 'Bu etkinlikte çevrimiçi bilet satışı yoktur. Rezervasyon için soldaki notu ve yan sütundaki mekân kutusundaki telefon veya WhatsApp satırlarını kullanın.';
    const reservationHref = `${route('reservations.create', event.venue.slug)}?event=${event.id}`;
    const paytrCardHref = useMemo(() => {
        if (!paytrCheckoutAvailable || entryFree || eventHasFinished) {
            return null;
        }
        const params = new URLSearchParams();
        params.set('quantity', '1');
        if (hasTiers && checkoutTierId > 0) {
            params.set('tier', String(checkoutTierId));
        }
        return `${route('paytr.event-checkout.show', { segment: eventShowParam(event) })}?${params.toString()}`;
    }, [
        paytrCheckoutAvailable,
        entryFree,
        eventHasFinished,
        hasTiers,
        checkoutTierId,
        event,
    ]);
    const venueMapInput = {
        google_maps_url: event.venue.google_maps_url,
        latitude: event.venue.latitude,
        longitude: event.venue.longitude,
        address: event.venue.address,
    };
    const mapUrl = googleMapsOpenUrl(venueMapInput);
    const directionsUrl = googleMapsDirectionsUrl({
        ...venueMapInput,
        venueName: event.venue.name,
        cityName: event.venue.city?.name ?? null,
    });
    const venueAddressMapLabel = venueMapAddressDisplay({
        address: event.venue.address,
        venueName: event.venue.name,
        cityName: event.venue.city?.name ?? null,
    });
    const sharePageUrl = canonicalUrl ?? (typeof window !== 'undefined' ? window.location.href : '');
    const waVenueDigits = event.venue.whatsapp ? event.venue.whatsapp.replaceAll(/[^\d]/g, '') : '';
    const waVenuePrefill =
        waVenueDigits.length >= 10
            ? `https://wa.me/${waVenueDigits}?text=${encodeURIComponent(
                  `Merhaba, “${event.title}” etkinliği için sahnebul.com üzerinden ulaşıyorum; rezervasyon yapmak istiyorum.${sharePageUrl ? `\n${sharePageUrl}` : ''}`,
              )}`
            : null;
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

    useLayoutEffect(() => {
        if (typeof window === 'undefined') return;
        if (window.location.hash.replace(/^#/, '').length > 0) return;
        window.scrollTo(0, 0);
    }, [event.id]);

    const submitEventReview = (e: React.FormEvent) => {
        e.preventDefault();
        if (!authed || hasEventReviewed || !canSubmitEventReview) return;
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
        ? `Tarih: ${formatTurkishEventTimeRange(event.start_date, event.end_date)}.`
        : 'Tarih yakında açıklanacak.';
    const eventOngoing =
        event.is_ongoing === true || isEventOngoingNow(event.start_date, event.end_date ?? null);
    const followUiVisible = eventCustomerActions.followUiVisible === true;
    const eventDesc = metaDescriptionFromContent(
        event.description,
        `${eventTypeLabel ? `${eventTypeLabel} — ` : ''}${event.title} — ${event.venue.name}${
            event.venue.city?.name ? `, ${event.venue.city.name}` : ''
        }. ${dateSummary} Bilet ve detaylar Sahnebul’da.`,
    );

    const shareUrlForSocial = canonicalUrl ?? '';

    return (
        <AppLayout>
            <SeoHead
                title={`${event.title} - Etkinlik`}
                description={eventDesc}
                image={ogImage}
                type="article"
                canonicalUrl={canonicalUrl}
                jsonLd={documentStructuredData ?? undefined}
            />
            <section
                className={`hero-full-bleed relative min-h-[min(52vh,28rem)] overflow-hidden ${heroBackdrop ? 'bg-zinc-950' : 'bg-zinc-200 dark:bg-zinc-950'}`}
            >
                {heroBackdrop ? (
                    <img src={heroBackdrop} alt={event.title} className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                    <EventHeroFallbackBackdrop />
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
                        {eventHasFinished ? (
                            <p className="mt-3 max-w-2xl rounded-lg border border-zinc-400/40 bg-zinc-900/50 px-3 py-2 text-sm font-semibold text-zinc-100">
                                Bu etkinlik tamamlandı. Bilet satışı, harici bağlantılar ve Sahnebul rezervasyonu bu sayfa için kapatılmıştır.
                            </p>
                        ) : null}
                        {eventOngoing ? (
                            <p className="mt-3 max-w-2xl rounded-lg border border-amber-400/50 bg-amber-500/15 px-3 py-2 text-sm font-semibold text-amber-100">
                                Bu etkinlik şu anda devam ediyor
                                {event.end_date ? (
                                    <span className="mt-0.5 block text-xs font-normal text-amber-100/85">
                                        Tahmini bitiş: {formatTurkishDateTime(event.end_date)}
                                    </span>
                                ) : null}
                            </p>
                        ) : null}
                        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                            {eventTypeLabel ? (
                                <span className="rounded-full border border-white/25 bg-white/15 px-3 py-1 font-semibold text-white">
                                    {eventTypeLabel}
                                </span>
                            ) : null}
                            <span className="rounded-full bg-amber-500 px-3 py-1 font-semibold text-zinc-900">{event.venue.category?.name ?? 'Etkinlik'}</span>
                            {event.start_date && eventRelativeDayKind(event.start_date, event.end_date) ? (
                                <EventRelativeDayPill startDate={event.start_date} endDate={event.end_date} placement="overlay" />
                            ) : null}
                            {event.start_date ? (
                                <span className="rounded-full bg-white/10 px-3 py-1 text-zinc-100">
                                    {formatTurkishEventTimeRange(event.start_date, event.end_date)}
                                </span>
                            ) : (
                                <span className="rounded-full bg-white/10 px-3 py-1 text-zinc-200">Tarih duyurulacak</span>
                            )}
                            {entryFree && (
                                <span className="rounded-full bg-emerald-500 px-3 py-1 font-semibold text-white">Ücretsiz giriş</span>
                            )}
                            {!entryFree && !hasTiers && event.ticket_price != null && (
                                <span className="rounded-full bg-emerald-500 px-3 py-1 font-semibold text-white">{formatTry(Number(event.ticket_price))}</span>
                            )}
                            {!entryFree && hasTiers && (
                                <span className="rounded-full bg-emerald-500 px-3 py-1 font-semibold text-white">
                                    {formatTry(Math.min(...tiers.map((t) => parseFloat(t.price))))}
                                    {Math.max(...tiers.map((t) => parseFloat(t.price))) !== Math.min(...tiers.map((t) => parseFloat(t.price))) &&
                                        ` – ${formatTry(Math.max(...tiers.map((t) => parseFloat(t.price))))}`}
                                </span>
                            )}
                        </div>
                        <div className="mt-6 flex flex-col gap-2">
                            <div className="flex flex-wrap items-center gap-3">
                                {followUiVisible && eventCustomerActions.canToggle ? (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                router.post(route('user.event-reminders.toggle', event.id), {}, { preserveScroll: true })
                                            }
                                            className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20"
                                        >
                                            {eventCustomerActions.hasReminder ? 'Takip listesinden çıkar' : 'Takip listesine ekle'}
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
                                ) : followUiVisible && !authed ? (
                                    <Link
                                        href={route('login', { redirect: `/etkinlikler/${eventShowParam(event)}` })}
                                        className="rounded-full border border-amber-400/40 px-4 py-2 text-sm font-medium text-amber-200 hover:bg-amber-500/10"
                                    >
                                        Takip listesine eklemek için giriş yapın
                                    </Link>
                                ) : followUiVisible && eventCustomerActions.needsEmailVerificationForFollow ? (
                                    <Link
                                        href={route('verification.notice')}
                                        className="rounded-full border border-amber-400/40 px-4 py-2 text-sm font-medium text-amber-200 hover:bg-amber-500/10"
                                    >
                                        E-postanızı doğrulayın — takip ve hatırlatma
                                    </Link>
                                ) : null}
                            </div>
                            {followUiVisible && eventCustomerActions.canToggle && !eventCustomerActions.hasReminder ? (
                                <p className="max-w-xl text-xs leading-relaxed text-zinc-300">
                                    Listeye eklediğinizde etkinlikten <strong className="text-zinc-200">bir gün önce</strong> panelde seçtiğiniz saatte (İstanbul)
                                    e-posta ve/veya SMS hatırlatması alırsınız. Bildirimler sayfanızda da
                                    görünür. Rezervasyon yaptığınız etkinliklerde takip aynı kurala göre otomatik açılabilir.
                                </p>
                            ) : null}
                            {followUiVisible && eventCustomerActions.needsEmailVerificationForFollow ? (
                                <p className="max-w-xl text-xs leading-relaxed text-zinc-400">
                                    Takip listesi ve e-posta hatırlatması için hesabınızdaki adresi doğrulamanız gerekir.
                                </p>
                            ) : null}
                        </div>
                        {shareUrlForSocial ? (
                            <div className="mt-6 border-t border-white/10 pt-5">
                                <EditorialShareStrip
                                    shareUrl={shareUrlForSocial}
                                    shareTitle={event.title}
                                    variant="heroDark"
                                />
                            </div>
                        ) : null}
                    </div>
                </div>
            </section>

            <div className="mx-auto w-full max-w-6xl -mx-2.5 px-3 py-8 sm:mx-auto sm:px-5 sm:py-10 lg:px-8">
                <div className="lg:grid lg:grid-cols-3 lg:items-start lg:gap-10">
                    <div className="space-y-8 lg:col-span-2">
                        <PublicPromoGallerySection
                            items={promoGalleryItemsFromEntity(event)}
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

                        {hasTiers && !entryFree && !eventHasFinished && (
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
                            {eventHasFinished ? (
                                <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
                                    Etkinlik süresi sona erdiği için satın alma ve rezervasyon yönlendirmeleri gösterilmez. Geçmiş etkinlik bilgisi olarak açıklama ve mekân
                                    iletişimini inceleyebilirsiniz.
                                </p>
                            ) : (
                                <>
                            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{ticketSectionIntro}</p>
                            {hasTicketChannels ? (
                                <div className="mt-5 space-y-4">
                                    {paytrCardHref ? (
                                        <Link
                                            href={paytrCardHref}
                                            className="flex items-center gap-3 rounded-xl border-2 border-emerald-500/60 bg-emerald-500/10 p-4 transition hover:border-emerald-400 hover:bg-emerald-500/15 dark:border-emerald-500/40 dark:bg-emerald-500/10"
                                        >
                                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                                                <Ticket className="h-5 w-5" aria-hidden />
                                            </span>
                                            <span className="min-w-0 text-left">
                                                <span className="block font-semibold text-zinc-900 dark:text-white">Kredi kartı ile satın al</span>
                                                <span className="mt-0.5 block text-xs text-zinc-600 dark:text-zinc-400">
                                                    Güvenli ödeme PayTR üzerinden; işlem onayından sonra bilet rezervasyonunuz onaylanır. Yan sütunda kategori seçtiyseniz aynı fiyat kullanılır.
                                                </span>
                                            </span>
                                        </Link>
                                    ) : null}
                                    {reservationEnabled && (
                                        <Link
                                            href={reservationHref}
                                            className="flex items-center gap-3 rounded-xl border-2 border-amber-400/60 bg-amber-500/10 p-4 transition hover:border-amber-400 hover:bg-amber-500/15 dark:border-amber-500/40 dark:bg-amber-500/10"
                                        >
                                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-500 text-zinc-950">
                                                <Ticket className="h-5 w-5" aria-hidden />
                                            </span>
                                            <span className="min-w-0 text-left">
                                                <span className="block font-semibold text-zinc-900 dark:text-white">Sahnebul üzerinden rezervasyon formu</span>
                                                <span className="mt-0.5 block text-xs text-zinc-600 dark:text-zinc-400">
                                                    Giriş yaparak bilet / masa talebi oluşturabilirsiniz (kart ile anında ödeme değil; onay süreci).
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
                                            Rezervasyon ve bilgi için yan sütundaki <strong>Mekan</strong> kutusundaki telefon veya WhatsApp satırlarını kullanın.
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
                                    Bu etkinlik için henüz bilet veya rezervasyon kanalı tanımlanmamış. Bilgi için yan sütundaki mekân kutusunu kullanabilirsiniz.
                                </p>
                            )}
                                </>
                            )}
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
                    {authed && !hasEventReviewed && canSubmitEventReview && (
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
                            Değerlendirme yalnızca bu etkinlik için Sahnebul üzerinden <strong className="font-medium text-zinc-600 dark:text-zinc-300">onaylanmış veya tamamlanmış</strong> rezervasyonu olan
                            kullanıcılar içindir. Önce{' '}
                            <Link
                                href={route('login', { redirect: `/etkinlikler/${eventShowParam(event)}` })}
                                className="text-amber-600 hover:underline dark:text-amber-400"
                            >
                                giriş yapın
                            </Link>
                            , ardından etkinlik için rezervasyon oluşturup mekân onayından sonra puan verebilirsiniz.
                        </p>
                    )}
                    {authed && !hasEventReviewed && !canSubmitEventReview && (
                        <p className="mt-4 text-sm text-zinc-500">
                            Bu etkinliği değerlendirmek için bu etkinliğe bağlı{' '}
                            <strong className="font-medium text-zinc-600 dark:text-zinc-300">onaylanmış veya tamamlanmış</strong> bir rezervasyonunuz olmalıdır. Rezervasyon oluşturmak veya durumunuzu görmek
                            için{' '}
                            <Link href={reservationHref} className="text-amber-600 hover:underline dark:text-amber-400">
                                rezervasyon sayfasına gidin
                            </Link>{' '}
                            veya{' '}
                            <Link href={route('reservations.index')} className="text-amber-600 hover:underline dark:text-amber-400">
                                rezervasyonlarım
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
                        <div className="grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {event.artists.map((artist) => (
                                <Link
                                    key={artist.id}
                                    href={route('artists.show', artist.slug)}
                                    className="flex h-full min-h-[5.25rem] rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-amber-400 hover:shadow-md dark:border-white/10 dark:bg-zinc-900/60 dark:shadow-none dark:hover:shadow-none"
                                >
                                    <div className="flex w-full min-w-0 items-start gap-3">
                                        {artistVisual(artist) ? (
                                            <img src={artistVisual(artist) ?? ''} alt={artist.name} className="h-14 w-14 shrink-0 rounded-full object-cover" />
                                        ) : (
                                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-700">🎤</div>
                                        )}
                                        <div className="min-w-0 flex-1">
                                            <p className="font-semibold text-zinc-900 dark:text-white">{artist.name}</p>
                                            <p className="mt-0.5 text-sm leading-snug text-zinc-600 line-clamp-3 dark:text-zinc-400">{artist.genre ?? 'Sanatçı'}</p>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
                    </div>

                    <aside className="mt-10 space-y-6 lg:mt-0">
                        <AdSlot slotKey="event_detail_sidebar" variant="sidebar" />
                        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-zinc-900/80">
                            <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">Etkinlik tarihi</p>
                            {event.start_date ? (
                                <div className="mt-2 flex flex-col items-start gap-2">
                                    {eventRelativeDayKind(event.start_date, event.end_date) ? (
                                        <EventRelativeDayPill startDate={event.start_date} endDate={event.end_date} placement="panel" />
                                    ) : null}
                                    <p className="text-base font-semibold text-zinc-900 dark:text-white">
                                        {formatTurkishEventTimeRange(event.start_date, event.end_date)}
                                    </p>
                                </div>
                            ) : (
                                <p className="mt-2 font-semibold text-zinc-600 dark:text-zinc-400">Henüz açıklanmadı</p>
                            )}
                        </div>
                        {followUiVisible &&
                        (eventCustomerActions.canToggle ||
                            !authed ||
                            eventCustomerActions.needsEmailVerificationForFollow) ? (
                            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-zinc-900/80">
                                <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">Takip listesi</p>
                                <p className="mt-2 text-sm leading-snug text-zinc-600 dark:text-zinc-400">
                                    Etkinlikten bir gün önce — panelde seçtiğiniz saatte (İstanbul) e-posta veya SMS.
                                </p>
                                <div className="mt-4 space-y-2">
                                    {eventCustomerActions.canToggle ? (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    router.post(route('user.event-reminders.toggle', event.id), {}, { preserveScroll: true })
                                                }
                                                className="block w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-center text-sm font-semibold text-zinc-900 hover:border-amber-400/50 dark:border-white/10 dark:bg-zinc-800/80 dark:text-white"
                                            >
                                                {eventCustomerActions.hasReminder ? 'Takip listesinden çıkar' : 'Takip listesine ekle'}
                                            </button>
                                            {eventCustomerActions.hasReminder ? (
                                                <a
                                                    href={route('user.events.ics', event.id)}
                                                    className="block w-full text-center text-xs font-medium text-amber-600 hover:text-amber-500 dark:text-amber-400"
                                                >
                                                    Takvim (.ics) indir
                                                </a>
                                            ) : null}
                                        </>
                                    ) : !authed ? (
                                        <Link
                                            href={route('login', { redirect: `/etkinlikler/${eventShowParam(event)}` })}
                                            className="block w-full rounded-xl bg-amber-500 px-4 py-2.5 text-center text-sm font-semibold text-zinc-950 hover:bg-amber-400"
                                        >
                                            Giriş yap
                                        </Link>
                                    ) : (
                                        <Link
                                            href={route('verification.notice')}
                                            className="block w-full rounded-xl border border-amber-400/50 bg-amber-500/10 px-4 py-2.5 text-center text-sm font-medium text-amber-800 dark:text-amber-200"
                                        >
                                            E-postayı doğrula
                                        </Link>
                                    )}
                                </div>
                            </div>
                        ) : null}
                        <div
                            id="mekan-iletisimi"
                            className="scroll-mt-24 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-zinc-900/80"
                        >
                            <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">Mekan</p>
                            {imageSrc(event.venue.cover_image ?? null) ? (
                                <Link
                                    href={route('venues.show', event.venue.slug)}
                                    className="mt-3 block overflow-hidden rounded-lg border border-zinc-100 dark:border-white/10"
                                >
                                    <img
                                        src={imageSrc(event.venue.cover_image ?? null) ?? ''}
                                        alt=""
                                        className="aspect-video w-full object-cover"
                                    />
                                </Link>
                            ) : null}
                            <p className="mt-3 font-semibold text-zinc-900 dark:text-white">
                                <Link
                                    href={route('venues.show', event.venue.slug)}
                                    className="hover:text-amber-600 hover:underline dark:hover:text-amber-400"
                                >
                                    {event.venue.name}
                                </Link>
                            </p>
                            <p className="mt-1 text-sm text-amber-600 dark:text-amber-400">{event.venue.category?.name ?? '-'}</p>
                            <div className="mt-3">
                                <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Konum</p>
                                <a
                                    href={mapUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-1 flex items-start gap-2 text-sm text-amber-600 hover:text-amber-500 dark:text-amber-400"
                                >
                                    <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 opacity-80" aria-hidden />
                                    <span className="leading-snug">{venueAddressMapLabel}</span>
                                </a>
                            </div>
                            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
                                <a
                                    href={mapUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-600 hover:text-amber-500 dark:text-amber-400"
                                >
                                    Haritada aç →
                                </a>
                                <a
                                    href={directionsUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-600 hover:text-amber-500 dark:text-amber-400"
                                >
                                    <Navigation className="h-4 w-4" aria-hidden />
                                    Yol tarifi al
                                </a>
                                <Link
                                    href={route('venues.show', event.venue.slug)}
                                    className="inline-flex items-center gap-1 text-sm font-medium text-zinc-600 hover:text-amber-600 dark:text-zinc-400 dark:hover:text-amber-400"
                                >
                                    Mekan sayfası →
                                </Link>
                            </div>
                            {(event.venue.phone ||
                                event.venue.whatsapp ||
                                event.venue.website ||
                                socialEntries.length > 0) && (
                                <div className="mt-4 space-y-4 border-t border-zinc-100 pt-4 text-sm dark:border-white/10">
                                    <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">İletişim</p>
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
                                                href={waVenuePrefill ?? `https://wa.me/${event.venue.whatsapp.replaceAll(/[^\d]/g, '')}`}
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
                            )}
                        </div>
                        {ticketUiActive && (
                            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-zinc-900/80">
                                <h3 className="font-display text-sm font-bold uppercase tracking-wide text-zinc-500">Hızlı erişim</h3>
                                <div className="mt-3 space-y-2">
                                    {acquisitionMode === 'phone_only' ? (
                                        <a
                                            href="#mekan-iletisimi"
                                            className="block w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-center text-sm font-medium text-zinc-800 hover:border-amber-400/50 dark:border-white/10 dark:text-zinc-200"
                                        >
                                            Mekan ↓
                                        </a>
                                    ) : (
                                        <>
                                            {paytrCardHref ? (
                                                <Link
                                                    href={paytrCardHref}
                                                    className="block w-full rounded-xl bg-emerald-600 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-emerald-500"
                                                >
                                                    Kart ile satın al
                                                </Link>
                                            ) : null}
                                            {reservationEnabled && (
                                                <Link
                                                    href={reservationHref}
                                                    className="block w-full rounded-xl bg-amber-500 px-4 py-3 text-center text-sm font-semibold text-zinc-950 hover:bg-amber-400"
                                                >
                                                    Rezervasyon formu
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
                        {entryFree ? (
                            <div className="sticky top-24 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-zinc-900/80 sm:p-6">
                                <h3 className="font-display text-lg font-bold text-zinc-900 dark:text-white">Giriş</h3>
                                <p className="mt-2 text-xl font-bold text-emerald-600 dark:text-emerald-400">Ücretsiz giriş</p>
                                {ticketUiActive ? (
                                    <a
                                        href="#bilet-kanallari"
                                        className="mt-4 inline-block text-sm font-medium text-amber-600 hover:text-amber-500 dark:text-amber-400"
                                    >
                                        Katılım / rezervasyon →
                                    </a>
                                ) : null}
                            </div>
                        ) : hasTiers && !eventHasFinished ? (
                            <div className="sticky top-24 rounded-2xl border-2 border-zinc-200 bg-white p-4 shadow-lg dark:border-white/10 dark:bg-zinc-900/80 sm:p-6">
                                <h3 className="font-display text-lg font-bold text-zinc-900 dark:text-white">Bilet kategorileri</h3>
                                <p className="mt-1 text-xs text-zinc-500">Salon bölümüne göre fiyatlar</p>
                                <label htmlFor="tier-select" className="mt-4 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                    Kategori
                                </label>
                                <select
                                    id="tier-select"
                                    className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-3 py-3 text-sm font-medium text-zinc-900 dark:border-white/10 dark:bg-zinc-800 dark:text-white"
                                    value={checkoutTierId || tiers[0]?.id || 0}
                                    onChange={(e) => setCheckoutTierId(Number(e.target.value))}
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
                                    {ticketUiActive
                                        ? 'Satın alma seçenekleri yukarıda ve “Biletleri nereden alabilirsiniz?” bölümünde.'
                                        : 'Bilet bilgisi için yan sütundaki mekân kutusunu kullanın.'}
                                </p>
                            </div>
                        ) : (
                            event.ticket_price != null && !eventHasFinished && (
                                <div className="sticky top-24 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-zinc-900/80 sm:p-6">
                                    <h3 className="font-display text-lg font-bold">Bilet fiyatı</h3>
                                    <p className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">{formatTry(Number(event.ticket_price))}</p>
                                    {ticketUiActive && (
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
                        {artistUpcomingEvents.length > 0 ? (
                            <ArtistOtherUpcomingOnEventShow
                                description="Bu etkinlikte sahne alan sanatçıların, başka mekânlarda planlanan yakın tarihli yayınları."
                                items={artistUpcomingEvents}
                                artistNamesLine={
                                    event.artists.length > 0
                                        ? event.artists.map((a) => a.name).join(', ')
                                        : 'İlgili sanatçılar'
                                }
                                imageSrc={imageSrc}
                            />
                        ) : null}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}

