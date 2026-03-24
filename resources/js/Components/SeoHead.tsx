import { Head, usePage } from '@inertiajs/react';
import { ReactNode } from 'react';
import { buildDocumentTitle, stripHtmlToText, toAbsoluteUrl, truncateMetaDescription } from '@/utils/seo';

export type SharedSeo = {
    siteName: string;
    appUrl: string;
    defaultDescription: string;
    defaultImage: string | null;
    locale: string;
};

type Props = {
    title: string;
    description?: string | null;
    image?: string | null;
    type?: 'website' | 'article';
    /** Tam mutlak URL; verilmezse mevcut sayfa (appUrl + usePage().url) */
    canonicalUrl?: string;
    noindex?: boolean;
    /** Ana sayfa / liste için schema.org JSON-LD */
    jsonLd?: Record<string, unknown> | Record<string, unknown>[] | null;
    children?: ReactNode;
};

const FALLBACK_SEO: SharedSeo = {
    siteName: 'Sahnebul',
    appUrl: typeof window !== 'undefined' ? window.location.origin : '',
    defaultDescription:
        'Sahnebul ile Türkiye’deki konser mekanlarını, etkinlikleri ve sanatçıları keşfedin; rezervasyon ve Gold üyelik seçeneklerine göz atın.',
    defaultImage: null,
    locale: 'tr_TR',
};

export default function SeoHead({
    title,
    description,
    image,
    type = 'website',
    canonicalUrl,
    noindex = false,
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
    const robots = noindex
        ? 'noindex, nofollow'
        : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';

    return (
        <Head title={title}>
            <meta name="description" content={desc} />
            <meta name="robots" content={robots} />
            <link rel="canonical" href={canonical} />

            <meta property="og:type" content={type} />
            <meta property="og:site_name" content={siteName} />
            <meta property="og:locale" content={seo.locale} />
            <meta property="og:title" content={fullTitle} />
            <meta property="og:description" content={desc} />
            <meta property="og:url" content={canonical} />
            {absImage ? <meta property="og:image" content={absImage} /> : null}
            {absImage ? <meta property="og:image:alt" content={fullTitle} /> : null}

            <meta name="twitter:card" content={absImage ? 'summary_large_image' : 'summary'} />
            <meta name="twitter:title" content={fullTitle} />
            <meta name="twitter:description" content={desc} />
            {absImage ? <meta name="twitter:image" content={absImage} /> : null}

            {jsonLd != null ? <script type="application/ld+json">{JSON.stringify(jsonLd)}</script> : null}

            {children}
        </Head>
    );
}

export function metaDescriptionFromContent(htmlOrText: string | null | undefined, fallback: string): string {
    if (!htmlOrText?.trim()) return fallback;
    const plain = stripHtmlToText(htmlOrText);
    return plain || fallback;
}
