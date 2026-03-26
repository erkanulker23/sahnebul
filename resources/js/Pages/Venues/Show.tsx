import { AdSlot } from '@/Components/AdSlot';
import DetailEventList from '@/Components/DetailEventList';
import { RichOrPlainContent } from '@/Components/SafeRichContent';
import VenuePhotoGallery from '@/Components/VenuePhotoGallery';
import SeoHead, { metaDescriptionFromContent, type SharedSeo } from '@/Components/SeoHead';
import { toAbsoluteUrl, truncateMetaDescription } from '@/utils/seo';
import { formatTurkishDateTime } from '@/lib/formatTurkishDateTime';
import { safeRoute } from '@/lib/safeRoute';
import { claimRequestStatusTr } from '@/lib/statusLabels';
import AppLayout from '@/Layouts/AppLayout';
import { sortVenueSocialEntries, venueSocialLinkTitle } from '@/utils/venueSocial';
import { Link, router, usePage } from '@inertiajs/react';
import axios from 'axios';
import { Building2, Eye } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Review {
    id: number;
    rating: number;
    comment: string | null;
    created_at: string;
    is_liked?: boolean;
    likes_count?: number;
    user: { id: number; name: string; avatar?: string | null };
}

interface Venue {
    id: number;
    user_id?: number | null;
    name: string;
    slug: string;
    description: string | null;
    address: string;
    latitude?: number | null;
    longitude?: number | null;
    capacity: number | null;
    phone: string | null;
    whatsapp?: string | null;
    website: string | null;
    social_links?: Record<string, string> | null;
    cover_image: string | null;
    rating_avg: number;
    review_count: number;
    reviews_count: number;
    view_count?: number;
    category: { name: string };
    city: { name: string };
    media: { id: number; type: string; path: string }[];
    events: {
        id: number;
        slug: string;
        title: string;
        description?: string | null;
        start_date: string;
        cover_image?: string | null;
        status?: string;
        is_full?: boolean;
        ticket_acquisition_mode?: string;
        sahnebul_reservation_enabled?: boolean;
        artists?: { id: number; name: string; slug: string; avatar?: string | null }[];
    }[];
    reviews?: Review[];
}

interface VenuePageSeo {
    headTitleSegment: string;
    metaDescription: string;
    structuredData: Record<string, unknown>;
}

interface Props {
    venue: Venue;
    venuePageSeo?: VenuePageSeo | null;
    claimStatus?: string | null;
}

function buildVenueJsonLd(params: {
    venue: Venue;
    canonicalUrl: string;
    appUrl: string;
    descriptionPlain: string;
    imageAbsolute: string | null;
}): Record<string, unknown> {
    const { venue, canonicalUrl, appUrl, descriptionPlain, imageAbsolute } = params;
    const reviewCount = venue.reviews_count || venue.review_count || 0;
    const ratingAvg = Number(venue.rating_avg) || 0;
    const reviews = venue.reviews ?? [];
    const venueId = `${canonicalUrl}#venue`;

    const sameAs: string[] = [];
    if (venue.website?.trim()) sameAs.push(venue.website.trim());
    if (venue.social_links) {
        for (const url of Object.values(venue.social_links)) {
            if (typeof url === 'string' && url.trim().startsWith('http')) sameAs.push(url.trim());
        }
    }

    const localBusiness: Record<string, unknown> = {
        '@type': ['LocalBusiness', 'EventVenue'],
        '@id': venueId,
        name: venue.name,
        description: truncateMetaDescription(descriptionPlain, 5000),
        url: canonicalUrl,
        address: {
            '@type': 'PostalAddress',
            streetAddress: venue.address,
            addressLocality: venue.city.name,
            addressCountry: 'TR',
        },
    };

    if (imageAbsolute) {
        localBusiness.image = [imageAbsolute];
    }

    if (venue.latitude != null && venue.longitude != null) {
        localBusiness.geo = {
            '@type': 'GeoCoordinates',
            latitude: Number(venue.latitude),
            longitude: Number(venue.longitude),
        };
    }

    if (venue.phone?.trim()) {
        localBusiness.telephone = venue.phone.replaceAll(/\s/g, '');
    }

    if (sameAs.length > 0) {
        localBusiness.sameAs = [...new Set(sameAs)];
    }

    if (reviewCount > 0 && ratingAvg > 0) {
        localBusiness.aggregateRating = {
            '@type': 'AggregateRating',
            ratingValue: String(ratingAvg),
            bestRating: '5',
            worstRating: '1',
            reviewCount: String(reviewCount),
        };
    }

    if (reviews.length > 0) {
        localBusiness.review = reviews.map((r) => {
            const row: Record<string, unknown> = {
                '@type': 'Review',
                author: { '@type': 'Person', name: r.user.name },
                datePublished: r.created_at.includes('T') ? r.created_at.split('T')[0] : r.created_at.slice(0, 10),
                reviewRating: {
                    '@type': 'Rating',
                    ratingValue: String(r.rating),
                    bestRating: '5',
                    worstRating: '1',
                },
            };
            if (r.comment?.trim()) {
                row.reviewBody = r.comment.trim();
            }
            return row;
        });
    }

    return {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'BreadcrumbList',
                '@id': `${canonicalUrl}#breadcrumb`,
                itemListElement: [
                    {
                        '@type': 'ListItem',
                        position: 1,
                        name: 'Ana sayfa',
                        item: `${appUrl.replace(/\/$/, '')}/`,
                    },
                    {
                        '@type': 'ListItem',
                        position: 2,
                        name: 'Mekanlar',
                        item: `${appUrl.replace(/\/$/, '')}/mekanlar`,
                    },
                    {
                        '@type': 'ListItem',
                        position: 3,
                        name: venue.name,
                        item: canonicalUrl,
                    },
                ],
            },
            localBusiness,
        ],
    };
}

export default function VenueShow({ venue, venuePageSeo = null, claimStatus }: Readonly<Props>) {
    const page = usePage();
    const auth = page.props.auth as { user: { id: number; role?: string } | null; is_platform_admin?: boolean };
    const seo = (page.props as { seo?: SharedSeo }).seo;
    const user = auth?.user;
    const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
    const [reviewSubmitting, setReviewSubmitting] = useState(false);
    const [claimMessage, setClaimMessage] = useState('');
    const [claimFirstName, setClaimFirstName] = useState('');
    const [claimLastName, setClaimLastName] = useState('');
    const [claimPhone, setClaimPhone] = useState('');
    const [claimEmail, setClaimEmail] = useState('');
    const [claimLoading, setClaimLoading] = useState(false);
    const mapUrl = venue.latitude && venue.longitude
        ? `https://www.google.com/maps?q=${venue.latitude},${venue.longitude}`
        : `https://www.google.com/maps/search/${encodeURIComponent(venue.address)}`;
    const reviewCount = venue.reviews_count || venue.review_count || 0;
    const reviews = venue.reviews || [];
    const hasReviewed = user && reviews.some((r) => r.user?.id === user.id);
    const canClaimVenue = venue.user_id == null;
    const imageSrc = (path: string | null | undefined) => {
        if (!path) return null;
        return path.startsWith('http://') || path.startsWith('https://') ? path : `/storage/${path}`;
    };

    const submitReview = (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || reviewSubmitting) return;
        setReviewSubmitting(true);
        router.post(route('reviews.store', venue.slug), { rating: reviewForm.rating, comment: reviewForm.comment }, {
            preserveScroll: true,
            onFinish: () => setReviewSubmitting(false),
        });
    };

    const likeReview = async (reviewId: number) => {
        if (!user) return;
        await axios.post(route('reviews.like', reviewId));
        router.reload();
    };

    const submitClaim = (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || claimLoading) return;
        setClaimLoading(true);
        router.post(route('venues.claim', venue.id), {
            first_name: claimFirstName,
            last_name: claimLastName,
            phone: claimPhone,
            email: claimEmail,
            message: claimMessage,
        }, {
            preserveScroll: true,
            onFinish: () => setClaimLoading(false),
        });
    };

    useEffect(() => {
        const hash = window.location.hash.replace(/^#/, '');
        const goTakvim = ['takvim', 'haftalik-etkinlikler', 'yaklasan-etkinlikler'].includes(hash);
        if (!goTakvim) return;
        const t = window.setTimeout(() => {
            document.getElementById('takvim')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 150);
        return () => window.clearTimeout(t);
    }, [venue.slug]);

    const cover = imageSrc(venue.cover_image);
    const galleryPhotos = (venue.media ?? [])
        .filter((m) => m.type === 'photo')
        .map((m) => {
            const src = imageSrc(m.path);
            return src ? { id: m.id, src } : null;
        })
        .filter((x): x is { id: number; src: string } => x !== null);
    const heroBackdrop = cover ?? galleryPhotos[0]?.src ?? null;
    const venueDesc = metaDescriptionFromContent(
        venue.description,
        `${venue.name} — ${venue.city.name}. ${venue.category?.name ?? 'Etkinlik mekanı'}. Yorumlar, takvim ve rezervasyon Sahnebul’da.`,
    );

    const appUrl = (seo?.appUrl ?? '').replace(/\/$/, '');
    const pathRaw = page.url.startsWith('http') ? new URL(page.url).pathname + new URL(page.url).search : page.url;
    const pathNorm = pathRaw.startsWith('/') ? pathRaw : `/${pathRaw}`;
    const canonicalUrl = appUrl ? `${appUrl}${pathNorm}`.replace(/([^:]\/)\/+/g, '$1') : '';
    const imageAbsolute = toAbsoluteUrl(cover, appUrl ? `${appUrl}/` : '');
    const venueJsonLdFallback =
        !venuePageSeo && canonicalUrl && appUrl
            ? buildVenueJsonLd({
                  venue,
                  canonicalUrl,
                  appUrl,
                  descriptionPlain: venueDesc,
                  imageAbsolute,
              })
            : null;

    const seoTitle =
        venuePageSeo?.headTitleSegment?.trim() ||
        `${venue.name} — ${venue.city?.name ? `${venue.city.name} ` : ''}konser ve etkinlik mekanı`;
    const seoDescription = venuePageSeo?.metaDescription?.trim() || venueDesc;

    return (
        <AppLayout>
            <SeoHead
                title={seoTitle}
                description={seoDescription}
                image={cover}
                canonicalUrl={canonicalUrl || undefined}
                jsonLd={venuePageSeo?.structuredData ?? venueJsonLdFallback}
            />

            <div className="min-h-screen">
                <section
                    className={`hero-full-bleed relative min-h-[min(52vh,28rem)] overflow-hidden ${heroBackdrop ? 'bg-zinc-950' : 'bg-zinc-200 dark:bg-zinc-950'}`}
                >
                    {heroBackdrop ? (
                        <img src={heroBackdrop} alt={venue.name} className="absolute inset-0 h-full w-full object-cover" />
                    ) : (
                        <div className="absolute inset-0" aria-hidden>
                            <div className="absolute inset-0 bg-gradient-to-br from-zinc-100 via-zinc-200 to-zinc-300 dark:from-zinc-800 dark:via-zinc-950 dark:to-black" />
                            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_20%_25%,rgba(217,119,6,0.2),transparent_55%)] dark:bg-[radial-gradient(ellipse_80%_60%_at_20%_25%,rgba(245,158,11,0.22),transparent_55%)]" />
                            <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_85%_70%,rgba(180,83,9,0.1),transparent_50%)] dark:bg-[radial-gradient(ellipse_70%_50%_at_85%_70%,rgba(180,83,9,0.12),transparent_50%)]" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Building2
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
                    <div className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
                        <Link
                            href={route('venues.index')}
                            className="inline-flex items-center gap-2 text-sm text-amber-300 hover:text-amber-200"
                        >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            Mekanlar
                        </Link>
                        <div className="mt-6 max-w-4xl">
                            <p className="text-sm text-zinc-200">{venue.city.name}</p>
                            <h1 className="mt-2 font-display text-4xl font-bold text-white sm:text-5xl lg:text-6xl">{venue.name}</h1>
                            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                                <span className="rounded-full bg-amber-500 px-3 py-1 font-semibold text-zinc-900">{venue.category.name}</span>
                                {venue.capacity != null && venue.capacity > 0 && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-zinc-100">
                                        <svg className="h-4 w-4 shrink-0 opacity-90" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                        </svg>
                                        {venue.capacity} kişi
                                    </span>
                                )}
                            </div>
                            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
                                <div className="flex items-center gap-2 text-zinc-300">
                                    <div className="flex text-amber-400">
                                        {'★'.repeat(Math.min(5, venue.rating_avg || 0))}
                                        <span className="text-zinc-600">{'★'.repeat(5 - Math.min(5, venue.rating_avg || 0))}</span>
                                    </div>
                                    <span className="font-semibold text-white">{venue.rating_avg || '-'}</span>
                                    <span className="text-zinc-400">({reviewCount} değerlendirme)</span>
                                </div>
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-zinc-200">
                                    <Eye className="h-3.5 w-3.5 shrink-0 text-zinc-400" aria-hidden strokeWidth={2} />
                                    {(venue.view_count ?? 0).toLocaleString('tr-TR')} görüntülenme
                                </span>
                            </div>
                            {(venue.phone || venue.whatsapp || venue.website || (venue.social_links && Object.keys(venue.social_links).length > 0)) && (
                                <div className="mt-6 flex flex-col gap-2 border-t border-white/10 pt-6">
                                    <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">İletişim</span>
                                    <div className="flex flex-wrap gap-2">
                                        {venue.phone && (
                                            <a
                                                href={`tel:${venue.phone.replaceAll(/\s/g, '')}`}
                                                className="rounded-full bg-white/10 px-3 py-1.5 text-sm text-amber-300 transition hover:bg-white/15"
                                            >
                                                {venue.phone}
                                            </a>
                                        )}
                                        {venue.whatsapp && (
                                            <a
                                                href={`https://wa.me/${venue.whatsapp.replaceAll(/[^\d]/g, '')}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="rounded-full bg-emerald-500/20 px-3 py-1.5 text-sm text-emerald-300 transition hover:bg-emerald-500/30"
                                            >
                                                WhatsApp
                                            </a>
                                        )}
                                        {venue.website && (
                                            <a
                                                href={venue.website}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="rounded-full bg-white/10 px-3 py-1.5 text-sm text-amber-300 transition hover:bg-white/15"
                                            >
                                                Web
                                            </a>
                                        )}
                                        {venue.social_links &&
                                            sortVenueSocialEntries(venue.social_links)
                                                .slice(0, 3)
                                                .map(([key, url]) => (
                                                    <a
                                                        key={key}
                                                        href={url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:bg-white/15"
                                                    >
                                                        {venueSocialLinkTitle(key)}
                                                    </a>
                                                ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                {/* Content */}
                <div className="mx-auto max-w-7xl px-0 py-10 sm:px-4 sm:py-12 lg:px-8">
                    <div className="grid gap-12 lg:grid-cols-3">
                        {/* Main — mobilde ikinci sırada; masaüstünde solda */}
                        <div className="order-2 min-w-0 lg:order-1 lg:col-span-2">
                            {venue.description && (
                                <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-white/5 dark:bg-zinc-900/30">
                                    <h2 className="font-display mb-4 text-xl font-bold text-zinc-900 dark:text-white">Hakkında</h2>
                                    <RichOrPlainContent
                                        content={venue.description}
                                        richClassName="prose prose-zinc max-w-none dark:prose-invert prose-headings:font-semibold prose-p:leading-relaxed prose-p:my-3 first:prose-p:mt-0 last:prose-p:mb-0 prose-a:text-amber-600 prose-img:rounded-xl dark:prose-a:text-amber-400"
                                        plainParagraphClassName="leading-relaxed text-zinc-700 dark:text-zinc-400"
                                    />
                                </div>
                            )}

                            {galleryPhotos.length > 0 && (
                                <VenuePhotoGallery key={venue.slug} photos={galleryPhotos} venueName={venue.name} />
                            )}

                            <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-white/5 dark:bg-zinc-900/30">
                                <h2 className="font-display mb-2 text-xl font-bold text-zinc-900 dark:text-white">Değerlendirmeler</h2>
                                <p className="mb-6 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                                    Bu yeri biliyorsanız değerlendirebilirsiniz.
                                    {!user && (
                                        <>
                                            {' '}
                                            Yorum ve puan vermek için{' '}
                                            <Link
                                                href={route('login', { redirect: `/mekanlar/${venue.slug}` })}
                                                className="font-medium text-amber-700 underline underline-offset-2 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300"
                                            >
                                                giriş yapın
                                            </Link>
                                            {' veya '}
                                            <Link
                                                href={safeRoute('register.kullanici')}
                                                className="font-medium text-amber-700 underline underline-offset-2 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300"
                                            >
                                                üye olun
                                            </Link>
                                            .
                                        </>
                                    )}
                                </p>
                                {user && !hasReviewed && (
                                    <form onSubmit={submitReview} className="mb-8 rounded-xl border border-zinc-200 bg-zinc-50 p-6 dark:border-white/5 dark:bg-zinc-800/30">
                                        <div className="mb-4">
                                            <p className="block text-sm font-medium text-zinc-800 dark:text-zinc-400">Puan</p>
                                            <div className="mt-2 flex gap-1">
                                                {[1,2,3,4,5].map((n) => (
                                                    <button key={n} type="button" onClick={() => setReviewForm((f) => ({ ...f, rating: n }))} className="text-2xl text-amber-500 dark:text-amber-400">
                                                        {n <= reviewForm.rating ? '★' : '☆'}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="mb-4">
                                            <label htmlFor="review-comment" className="block text-sm font-medium text-zinc-800 dark:text-zinc-400">Yorum</label>
                                            <textarea
                                                id="review-comment"
                                                value={reviewForm.comment}
                                                onChange={(e) => setReviewForm((f) => ({ ...f, comment: e.target.value }))}
                                                rows={3}
                                                className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-white/10 dark:bg-zinc-800 dark:text-white dark:placeholder:text-zinc-500"
                                                placeholder="Deneyiminizi paylaşın (isteğe bağlı)"
                                            />
                                        </div>
                                        <button type="submit" disabled={reviewSubmitting} className="rounded-xl bg-amber-500 px-6 py-2 font-medium text-zinc-950 hover:bg-amber-400 disabled:opacity-50">Gönder</button>
                                    </form>
                                )}
                                <div className="space-y-6">
                                    {reviews.length === 0 ? (
                                        <p className="text-zinc-600 dark:text-zinc-500">Henüz değerlendirme yok.</p>
                                    ) : (
                                        reviews.map((r) => (
                                            <div key={r.id} className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-white/5 dark:bg-zinc-800/30">
                                                <div className="flex items-start justify-between gap-4">
                                                    <div>
                                                        <p className="font-medium text-zinc-900 dark:text-white">{r.user.name}</p>
                                                        <div className="mt-1 flex items-center gap-2 text-amber-600 dark:text-amber-400">
                                                            {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
                                                            <span className="text-sm text-zinc-500">{formatTurkishDateTime(r.created_at)}</span>
                                                        </div>
                                                        {r.comment && <p className="mt-2 text-zinc-700 dark:text-zinc-400">{r.comment}</p>}
                                                    </div>
                                                    {user && (
                                                        <button onClick={() => likeReview(r.id)} className={`flex items-center gap-1 rounded-lg px-2 py-1 text-sm transition ${r.is_liked ? 'text-amber-400' : 'text-zinc-500 hover:text-amber-400'}`}>
                                                            <svg className="h-4 w-4" fill={r.is_liked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                                                            {r.likes_count ?? 0}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Sidebar — mobilde önce (iletişim hemen görünsün); masaüstünde sağda */}
                        <div className="order-1 space-y-6 lg:order-2 lg:col-span-1">
                            <AdSlot slotKey="venue_sidebar" variant="sidebar" />
                            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-white/5 dark:bg-zinc-900/30">
                                <h3 className="font-display mb-4 text-lg font-bold text-zinc-900 dark:text-white">İletişim</h3>
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-xs font-medium uppercase tracking-wider text-zinc-600 dark:text-zinc-500">Adres</p>
                                        <a
                                            href={mapUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="mt-1 flex items-start gap-2 text-amber-700 transition hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-300"
                                        >
                                            <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                            </svg>
                                            {venue.address}
                                        </a>
                                    </div>
                                    {venue.phone && (
                                        <div>
                                            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Telefon</p>
                                            <a
                                                href={`tel:${venue.phone.replaceAll(/\s/g, '')}`}
                                                className="mt-1 block text-amber-400 hover:text-amber-300"
                                            >
                                                {venue.phone}
                                            </a>
                                        </div>
                                    )}
                                    {venue.whatsapp && (
                                        <div>
                                            <p className="text-xs font-medium uppercase tracking-wider text-zinc-600 dark:text-zinc-500">WhatsApp</p>
                                            <a
                                                href={`https://wa.me/${venue.whatsapp.replaceAll(/[^\d]/g, '')}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="mt-1 block text-emerald-700 hover:text-emerald-600 dark:text-emerald-400 dark:hover:text-emerald-300"
                                            >
                                                {venue.whatsapp}
                                            </a>
                                        </div>
                                    )}
                                    {venue.website && (
                                        <div>
                                            <p className="text-xs font-medium uppercase tracking-wider text-zinc-600 dark:text-zinc-500">Web Sitesi</p>
                                            <a
                                                href={venue.website}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="mt-1 block text-amber-700 hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-300"
                                            >
                                                {venue.website.replace(/^https?:\/\//, '')}
                                            </a>
                                        </div>
                                    )}
                                    {venue.social_links && Object.keys(venue.social_links).length > 0 && (
                                        <div>
                                            <p className="text-xs font-medium uppercase tracking-wider text-zinc-600 dark:text-zinc-500">
                                                Sosyal medya
                                            </p>
                                            <div className="mt-2 flex flex-wrap gap-2">
                                                {sortVenueSocialEntries(venue.social_links).map(([key, url]) => (
                                                    <a
                                                        key={key}
                                                        href={url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-800 transition hover:border-amber-400 hover:text-amber-800 dark:border-white/10 dark:bg-zinc-800/80 dark:text-zinc-300 dark:hover:border-amber-500/30 dark:hover:text-amber-400"
                                                    >
                                                        {venueSocialLinkTitle(key)}
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <a
                                    href={mapUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-amber-500/40 bg-amber-50 py-3 font-medium text-amber-900 transition hover:bg-amber-100 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400 dark:hover:bg-amber-500/20"
                                >
                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    </svg>
                                    Haritada Görüntüle
                                </a>
                                {user && auth?.is_platform_admin !== true && (
                                    <Link
                                        href={route('reservations.create', venue.slug)}
                                        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-3 font-semibold text-zinc-950 transition hover:bg-amber-400"
                                    >
                                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        Rezervasyon Yap
                                    </Link>
                                )}
                            </div>

                            {canClaimVenue && (
                                <div className="rounded-2xl border border-amber-300 bg-amber-50 p-6 dark:border-amber-500/40 dark:bg-amber-500/10">
                                    <h3 className="font-display text-lg font-bold text-amber-900 dark:text-amber-300">Bu işletme sizin mi?</h3>
                                    <p className="mt-2 text-sm text-amber-950/80 dark:text-amber-100/90">
                                        Google Maps işletme sahiplenme akışı gibi, bu mekanı hesabınıza bağlamak için talep oluşturabilirsiniz.
                                    </p>
                                    {user ? (
                                        <form onSubmit={submitClaim} className="mt-4 space-y-3">
                                            {claimStatus && (
                                                <p className="text-xs text-amber-800 dark:text-amber-200">
                                                    Mevcut talep durumu: {claimRequestStatusTr(claimStatus)}
                                                </p>
                                            )}
                                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                                <input value={claimFirstName} onChange={(e) => setClaimFirstName(e.target.value)} className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-500 dark:border-amber-500/30 dark:bg-zinc-900/70 dark:text-white dark:placeholder:text-zinc-500" placeholder="Ad" required />
                                                <input value={claimLastName} onChange={(e) => setClaimLastName(e.target.value)} className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-500 dark:border-amber-500/30 dark:bg-zinc-900/70 dark:text-white dark:placeholder:text-zinc-500" placeholder="Soyad" required />
                                            </div>
                                            <input value={claimPhone} onChange={(e) => setClaimPhone(e.target.value)} className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-500 dark:border-amber-500/30 dark:bg-zinc-900/70 dark:text-white dark:placeholder:text-zinc-500" placeholder="Telefon" required />
                                            <input type="email" value={claimEmail} onChange={(e) => setClaimEmail(e.target.value)} className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-500 dark:border-amber-500/30 dark:bg-zinc-900/70 dark:text-white dark:placeholder:text-zinc-500" placeholder="E-posta" required />
                                            <textarea
                                                value={claimMessage}
                                                onChange={(e) => setClaimMessage(e.target.value)}
                                                rows={3}
                                                className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-500 dark:border-amber-500/30 dark:bg-zinc-900/70 dark:text-white dark:placeholder:text-zinc-500"
                                                placeholder="İşletme sahibi olduğunuzu doğrulayan kısa not (opsiyonel)"
                                            />
                                            <button type="submit" disabled={claimLoading} className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-zinc-950 disabled:opacity-60">
                                                Sahiplenme Talebi Gönder
                                            </button>
                                        </form>
                                    ) : (
                                        <div className="mt-4 flex gap-3">
                                            <Link
                                                href={route('register', { claim_venue: venue.slug })}
                                                className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-zinc-950"
                                            >
                                                Üye Ol
                                            </Link>
                                            <Link
                                                href={route('login', {
                                                    redirect: `/mekanlar/${venue.slug}`,
                                                    claim_venue: venue.slug,
                                                })}
                                                className="rounded-lg border border-amber-600/30 px-4 py-2 text-sm font-medium text-amber-900 dark:border-amber-500/40 dark:text-amber-300"
                                            >
                                                Giriş Yap
                                            </Link>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {(venue.events?.length ?? 0) > 0 && (
                    <div className="mx-auto max-w-7xl px-0 pb-14 pt-8 sm:px-4 sm:pb-16 sm:pt-10 lg:px-8">
                        <DetailEventList events={venue.events ?? []} imageSrc={imageSrc} context="venue" />
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
