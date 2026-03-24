import SeoHead, { metaDescriptionFromContent } from '@/Components/SeoHead';
import { RichOrPlainContent } from '@/Components/SafeRichContent';
import AppLayout from '@/Layouts/AppLayout';

interface Props {
    title: string;
    content: string;
    slug: string;
}

export default function PageShow({ title, content }: Readonly<Props>) {
    const desc = metaDescriptionFromContent(content, `${title} — Sahnebul.`);

    return (
        <AppLayout>
            <SeoHead title={`${title} - Sahnebul`} description={desc} />
            <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
                <h1 className="font-display text-3xl font-bold">{title}</h1>
                <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-white/10 dark:bg-zinc-900/50">
                    <RichOrPlainContent
                        content={content}
                        richClassName="prose prose-zinc max-w-none dark:prose-invert prose-headings:font-semibold prose-a:text-amber-600 prose-p:leading-relaxed dark:prose-a:text-amber-400"
                        plainParagraphClassName="mb-4 leading-relaxed text-zinc-700 last:mb-0 dark:text-zinc-300"
                    />
                </div>
            </div>
        </AppLayout>
    );
}
