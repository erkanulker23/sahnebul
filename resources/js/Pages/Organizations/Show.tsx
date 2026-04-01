import DetailEventList, { groupDetailEventsByMonthForDisplay, type DetailEventListItem } from '@/Components/DetailEventList';
import SeoHead from '@/Components/SeoHead';
import { RichOrPlainContent } from '@/Components/SafeRichContent';
import { SocialPlatformIcon } from '@/Components/SocialPlatformIcon';
import { EditorialShareStrip } from '@/Components/EditorialShareStrip';
import { sortVenueSocialEntries, venueSocialLinkTitle } from '@/utils/venueSocial';
import { toAbsoluteUrl } from '@/utils/seo';
import AppLayout from '@/Layouts/AppLayout';
import { Link, usePage } from '@inertiajs/react';
import { Briefcase, Calendar, Eye, Globe, Mic2, Users } from 'lucide-react';
import { useMemo } from 'react';

interface OrganizationPageSeo {
    headTitleSegment: string;
    metaDescription: string;
    structuredData: Record<string, unknown>;
}

interface OrganizationPayload {
    display_name: string;
    slug: string;
    about: string | null;
    cover_image: string | null;
    website: string | null;
    social_links: Record<string, string>;
    avatar: string | null;
    view_count: number;
}

interface RosterArtist {
    id: number;
    name: string;
    slug: string;
    avatar: string | null;
    genre: string | null;
}

interface Props {
    organization: OrganizationPayload;
    organizationPageSeo: OrganizationPageSeo;
    roster: RosterArtist[];
    upcomingEvents: DetailEventListItem[];
    pastEvents: DetailEventListItem[];
    stats: { roster_count: number; upcoming_events_count: number };
}

function storageUrl(path: string | null | undefined): string | null {
    if (!path?.trim()) return null;
    const p = path.trim();
    if (p.startsWith('http://') || p.startsWith('https://')) return p;
    return `/storage/${p.replace(/^\//, '')}`;
}

function resolveWebsiteHref(raw: string): string {
    const v = raw.trim();
    if (!v) return '#';
    if (/^https?:\/\//i.test(v)) return v;
    return `https://${v.replace(/^\/+/, '')}`;
}

function resolveSocialHref(key: string, value: string): string {
    const v = value.trim();
    if (!v) return '#';
    if (/^https?:\/\//i.test(v)) return v;
    const k = key.toLowerCase();
    const h = v.replace(/^@/, '');
    if (/^[\w.-]+$/.test(h) && !v.includes('.')) {
        if (k === 'instagram') return `https://instagram.com/${h}/`;
        if (k === 'twitter' || k === 'x') return `https://x.com/${h}`;
    }
    return `https://${v.replace(/^\/+/, '')}`;
}

export default function OrganizationShow({
    organization,
    organizationPageSeo,
    roster,
    upcomingEvents,
    pastEvents,
    stats,
}: Readonly<Props>) {
    const page = usePage();
    const seo = (page.props as { seo?: { appUrl?: string; defaultImage?: string | null } }).seo;
    const appUrl = (seo?.appUrl ?? '').replace(/\/$/, '') || (typeof window !== 'undefined' ? window.location.origin : '');

    const coverAbs = useMemo(() => {
        const c = storageUrl(organization.cover_image);
        return c ? toAbsoluteUrl(c, appUrl) : null;
    }, [organization.cover_image, appUrl]);

    const canonicalUrl = `${appUrl}/organizasyonlar/${organization.slug}`;

    const imageSrc = (path: string | null | undefined) => storageUrl(path);

    const socialEntries = useMemo(() => sortVenueSocialEntries(organization.social_links ?? {}), [organization.social_links]);

    const upcomingGrouped = useMemo(
        () => groupDetailEventsByMonthForDisplay(upcomingEvents, 'asc'),
        [upcomingEvents],
    );
    const pastGrouped = useMemo(() => groupDetailEventsByMonthForDisplay(pastEvents, 'desc'), [pastEvents]);

    const heroSrc = storageUrl(organization.cover_image) ?? storageUrl(organization.avatar);

    return (
        <AppLayout>
            <SeoHead
                title={organizationPageSeo.headTitleSegment}
                description={organizationPageSeo.metaDescription}
                image={coverAbs}
                canonicalUrl={canonicalUrl}
                jsonLd={organizationPageSeo.structuredData}
            />

            <div className="relative">
                <div className="relative h-[min(22rem,55vw)] w-full overflow-hidden bg-zinc-900">
                    {heroSrc ? (
                        <img src={heroSrc} alt="" className="h-full w-full object-cover opacity-95" />
                    ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-violet-900/80 to-amber-900/60">
                            <Briefcase className="h-24 w-24 text-white/40" aria-hidden />
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/55 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 mx-auto max-w-5xl px-4 pb-8 pt-16">
                        <h1 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
                            {organization.display_name}
                        </h1>
                        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-zinc-200">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1">
                                <Users className="h-4 w-4" aria-hidden />
                                {stats.roster_count} kadro sanatçısı
                            </span>
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1">
                                <Calendar className="h-4 w-4" aria-hidden />
                                {stats.upcoming_events_count} yakın etkinlik
                            </span>
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1">
                                <Eye className="h-4 w-4" aria-hidden />
                                {organization.view_count.toLocaleString('tr-TR')} görüntülenme
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mx-auto max-w-5xl px-4 py-10">
                <EditorialShareStrip shareUrl={canonicalUrl} shareTitle={organization.display_name} />

                <div className="mt-8 flex flex-wrap gap-3">
                    {organization.website?.trim() ? (
                        <a
                            href={resolveWebsiteHref(organization.website)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-800 shadow-sm hover:border-amber-400/50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                        >
                            <Globe className="h-4 w-4 text-amber-600 dark:text-amber-400" aria-hidden />
                            Web sitesi
                        </a>
                    ) : null}
                    {socialEntries.map(([key, val]) => (
                        <a
                            key={key}
                            href={resolveSocialHref(key, val)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-800 shadow-sm hover:border-amber-400/50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                        >
                            <SocialPlatformIcon platform={key} className="h-4 w-4" />
                            {venueSocialLinkTitle(key)}
                        </a>
                    ))}
                </div>

                {organization.about?.trim() ? (
                    <section className="mt-10 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
                        <h2 className="font-display text-lg font-semibold text-zinc-900 dark:text-white">Hakkında</h2>
                        <div className="mt-4 text-zinc-700 dark:text-zinc-300">
                            <RichOrPlainContent content={organization.about} />
                        </div>
                    </section>
                ) : null}

                {roster.length > 0 ? (
                    <section className="mt-10">
                        <h2 className="font-display text-lg font-semibold text-zinc-900 dark:text-white">Kadro</h2>
                        <ul className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                            {roster.map((a) => {
                                const av = storageUrl(a.avatar);
                                return (
                                    <li key={a.id}>
                                        <Link
                                            href={route('artists.show', a.slug)}
                                            className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-3 transition hover:border-amber-400/50 dark:border-zinc-800 dark:bg-zinc-900/50"
                                        >
                                            {av ? (
                                                <img src={av} alt="" className="h-12 w-12 rounded-full object-cover ring-1 ring-zinc-200 dark:ring-zinc-700" />
                                            ) : (
                                                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-700">
                                                    <Mic2 className="h-6 w-6 text-zinc-500" aria-hidden />
                                                </span>
                                            )}
                                            <span className="min-w-0">
                                                <span className="block truncate font-medium text-zinc-900 dark:text-white">{a.name}</span>
                                                {a.genre ? (
                                                    <span className="block truncate text-xs text-zinc-500">{a.genre}</span>
                                                ) : null}
                                            </span>
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    </section>
                ) : null}

                {upcomingEvents.length > 0 ? (
                    <section className="mt-12">
                        <h2 className="font-display text-lg font-semibold text-zinc-900 dark:text-white">Yaklaşan etkinlikler</h2>
                        <div className="mt-4 space-y-10">
                            {upcomingGrouped.map((g) => (
                                <div key={g.key}>
                                    <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">{g.heading}</h3>
                                    <DetailEventList events={g.events} imageSrc={imageSrc} context="venue" showHeading={false} />
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null}

                {pastEvents.length > 0 ? (
                    <section className="mt-12">
                        <h2 className="font-display text-lg font-semibold text-zinc-900 dark:text-white">Geçmişten seçmeler</h2>
                        <div className="mt-4 space-y-10">
                            {pastGrouped.map((g) => (
                                <div key={g.key}>
                                    <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">{g.heading}</h3>
                                    <DetailEventList events={g.events} imageSrc={imageSrc} context="venue" showHeading={false} />
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null}

                <p className="mt-12 text-center text-sm text-zinc-500">
                    <Link href={route('organizations.index')} className="text-amber-700 hover:underline dark:text-amber-400">
                        ← Tüm organizasyonlar
                    </Link>
                </p>
            </div>
        </AppLayout>
    );
}
