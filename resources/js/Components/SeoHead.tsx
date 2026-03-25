import { Head, usePage } from '@inertiajs/react';
import { ReactNode } from 'react';
import { buildDocumentTitle, stripHtmlToText, toAbsoluteUrl, truncateMetaDescription } from '@/utils/seo';

export type SharedSeo = {
    siteName: string;
    appUrl: string;
    defaultDescription: string;
    defaultImage: string | null;
    locale: string;
    logoUrl?: string | null;
    faviconUrl?: string | null;
    keywords?: string | null;
    twitterHandle?: string | null;
    googleSiteVerification?: string | null;
};

type Props = {
    title: string;
    description?: string | null;
    image?: string | null;
    type?: 'website' | 'article';
    /** Tam mutlak URL; verilmezse mevcut sayfa (appUrl + usePage().url) */
    canonicalUrl?: string;
    noindex?: boolean;
    /** article:published_time (ISO 8601) — blog vb. */
    articlePublishedTime?: string | null;
    /** Ana sayfa / liste için schema.org JSON-LD */
    jsonLd?: Record<string, unknown> | Record<string, unknown>[] | null;
    children?: ReactNode;
};

const FALLBACK_SEO: SharedSeo = {
    siteName: 'Sahnebul',
    appUrl: typeof window !== 'undefined' ? window.location.origin : '',
    defaultDescription:
        'Sahnebul ile Türkiye’deki konser mekanlarını, etkinlikleri ve sanatçıları keşfedin; rezervasyon ve Gold üyelik seçeneklerine göz atın.',
    defaultImage: typeof window !== 'undefined' ? `${window.location.origin}/images/sahnebul-og.svg` : null,
    locale: 'tr_TR',
};

export default function SeoHead({
    title,
    description,
    image,
    type = 'website',
    canonicalUrl,
    noindex = false,
    articlePublishedTime,
    jsonLd,
    children,
}: Readonly<Props>) {
    const page = usePage();
    const seo = (page.props as { seo?: SharedSeo }).seo ?? FALLBACK_SEO;
    const siteName = seo.siteName;
    const appUrl = seo.appUrl || FALLBACK_SEO.appUrl;

    const fullTitle = buildDocumentTitle(title, siteName);
    const rawDesc = (description ?? seo.defaultDescription).trim() || seo.defaultDescription;
    const desc = truncateMetaDescription(rawDesc);

    const path = page.url.startsWith('http') ? new URL(page.url).pathname + new URL(page.url).search : page.url;
    const pathNormalized = path.startsWith('/') ? path : `/${path}`;
    const canonical = (canonicalUrl ?? `${appUrl.replace(/\/$/, '')}${pathNormalized}`).replace(/([^:]\/)\/+/g, '$1');

    const absImage = toAbsoluteUrl(image ?? seo.defaultImage, appUrl);
    const faviconHref = seo.faviconUrl?.trim() || null;
    const keywords = seo.keywords?.trim() || null;
    const twSite = seo.twitterHandle?.trim() || null;
    const gVerify = seo.googleSiteVerification?.trim() || null;
    const robots = noindex
        ? 'noindex, nofollow'
        : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';

    const published = articlePublishedTime?.trim() ?? '';

    return (
        <Head title={title}>
            {faviconHref ? (
                <link
                    head-key="favicon"
                    rel="icon"
                    href={faviconHref}
                    type={faviconHref.split('?')[0].toLowerCase().endsWith('.svg') ? 'image/svg+xml' : undefined}
                />
            ) : null}
            <meta head-key="description" name="description" content={desc} />
            {keywords ? <meta head-key="keywords" name="keywords" content={keywords} /> : null}
            {gVerify ? <meta head-key="google-verify" name="google-site-verification" content={gVerify} /> : null}
            <meta head-key="robots" name="robots" content={robots} />
            <link head-key="canonical" rel="canonical" href={canonical} />
            <link head-key="hreflang-tr" rel="alternate" hrefLang="tr" href={canonical} />
            <link head-key="hreflang-x-default" rel="alternate" hrefLang="x-default" href={canonical} />

            <meta head-key="og-type" property="og:type" content={type} />
            <meta head-key="og-site" property="og:site_name" content={siteName} />
            <meta head-key="og-locale" property="og:locale" content={seo.locale} />
            <meta head-key="og-title" property="og:title" content={fullTitle} />
            <meta head-key="og-desc" property="og:description" content={desc} />
            <meta head-key="og-url" property="og:url" content={canonical} />
            {absImage ? <meta head-key="og-image" property="og:image" content={absImage} /> : null}
            {absImage && absImage.startsWith('https://') ? (
                <meta head-key="og-image-secure" property="og:image:secure_url" content={absImage} />
            ) : null}
            {absImage ? <meta head-key="og-image-alt" property="og:image:alt" content={fullTitle} /> : null}
            {published !== '' && type === 'article' ? (
                <meta head-key="article-published" property="article:published_time" content={published} />
            ) : null}

            <meta head-key="tw-card" name="twitter:card" content={absImage ? 'summary_large_image' : 'summary'} />
            <meta head-key="tw-title" name="twitter:title" content={fullTitle} />
            <meta head-key="tw-desc" name="twitter:description" content={desc} />
            {absImage ? <meta head-key="tw-image" name="twitter:image" content={absImage} /> : null}
            {twSite ? <meta head-key="tw-site" name="twitter:site" content={twSite} /> : null}

            {jsonLd != null ? (
                <script head-key="jsonld" type="application/ld+json">
                    {JSON.stringify(jsonLd)}
                </script>
            ) : null}

            {children}
        </Head>
    );
}

export function metaDescriptionFromContent(htmlOrText: string | null | undefined, fallback: string): string {
    if (!htmlOrText?.trim()) return fallback;
    const plain = stripHtmlToText(htmlOrText);
    return plain || fallback;
}
