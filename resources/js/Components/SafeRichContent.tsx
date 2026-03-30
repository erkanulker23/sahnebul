import DOMPurify from 'dompurify';
import { EXTERNAL_LINK_REL_RICH_TEXT } from '@/lib/externalLinkRel';

let externalAnchorHookInstalled = false;

function ensureRichTextExternalLinkHook(): void {
    if (externalAnchorHookInstalled) {
        return;
    }
    externalAnchorHookInstalled = true;
    DOMPurify.addHook('afterSanitizeAttributes', (node) => {
        if (!(node instanceof Element) || node.tagName !== 'A') {
            return;
        }
        const href = node.getAttribute('href')?.trim() ?? '';
        if (href === '' || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
            return;
        }
        if (href.startsWith('/') && !href.startsWith('//')) {
            return;
        }
        if (!/^https?:\/\//i.test(href)) {
            return;
        }
        const want = new Set(
            EXTERNAL_LINK_REL_RICH_TEXT.split(/\s+/).filter(Boolean),
        );
        const existing = (node.getAttribute('rel') ?? '').split(/\s+/).filter(Boolean);
        existing.forEach((t) => want.add(t));
        node.setAttribute('rel', [...want].join(' '));
    });
}

const sanitizeOpts = { USE_PROFILES: { html: true } as const };

/** Sayfalama ve framework HTML çıktıları için — dangerouslySetInnerHTML öncesi. */
export function sanitizeHtmlForInnerHtml(html: string): string {
    ensureRichTextExternalLinkHook();
    return DOMPurify.sanitize(html, sanitizeOpts);
}

/** İçerik HTML gibi görünüyorsa true (yasal/blog TipTap çıktısı). */
export function isLikelyRichHtml(content: string): boolean {
    return /<\/?[a-z][\s\S]*?>/i.test(content.trim());
}

type SafeRichProps = {
    html: string;
    className?: string;
};

/** DOMPurify ile temizlenmiş HTML — dangerouslySetInnerHTML için. */
export function SafeRichHtml({ html, className = '' }: Readonly<SafeRichProps>) {
    ensureRichTextExternalLinkHook();
    const clean = DOMPurify.sanitize(html, sanitizeOpts);
    return <div className={className} dangerouslySetInnerHTML={{ __html: clean }} />;
}

type RichOrPlainProps = {
    content: string;
    richClassName?: string;
    plainParagraphClassName?: string;
};

/**
 * HTML ise güvenli render; değilse satır sonlarına göre paragraflar (eski düz metin).
 */
export function RichOrPlainContent({
    content,
    richClassName =
        'prose prose-lg prose-zinc max-w-none dark:prose-invert prose-headings:font-semibold prose-headings:scroll-mt-24 prose-a:text-amber-500 prose-p:leading-relaxed prose-p:my-4 first:prose-p:mt-0 last:prose-p:mb-0 prose-li:my-1 prose-ul:my-4 prose-ol:my-4 prose-blockquote:my-6 prose-h2:mt-10 prose-h2:mb-4 prose-h3:mt-8 prose-h3:mb-3 prose-img:my-8 prose-img:rounded-xl prose-hr:my-10',
    plainParagraphClassName = 'mb-4 leading-relaxed text-zinc-700 last:mb-0 dark:text-zinc-300',
}: Readonly<RichOrPlainProps>) {
    if (isLikelyRichHtml(content)) {
        return <SafeRichHtml html={content} className={richClassName} />;
    }
    const paragraphs = content
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
    return (
        <div>
            {paragraphs.map((paragraph, i) => (
                <p key={`${i}-${paragraph.slice(0, 24)}`} className={plainParagraphClassName}>
                    {paragraph}
                </p>
            ))}
        </div>
    );
}
