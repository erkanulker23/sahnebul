import SeoHead from '@/Components/SeoHead';
import AppLayout from '@/Layouts/AppLayout';
import { Link, usePage } from '@inertiajs/react';
import { Calendar, ExternalLink, MapPin, Ticket, Trophy } from 'lucide-react';

interface ExternalEventPayload {
    id: number;
    /** Kamu URL: /etkinlikler/dis{id} */
    public_segment: string;
    title: string;
    image_url: string | null;
    venue_name: string | null;
    city_name: string | null;
    category_name: string | null;
    dates_line: string | null;
    price_label: string | null;
    rank: number | null;
    city_slug: string | null;
    external_url: string | null;
    description: string | null;
}

interface Props {
    event: ExternalEventPayload;
}

type SharedSeo = { appUrl: string };

export default function ExternalEventShow({ event }: Readonly<Props>) {
    const page = usePage();
    const seo = (page.props as { seo?: SharedSeo }).seo;
    const appUrl = (seo?.appUrl ?? '').replace(/\/$/, '');
    const canonicalUrl = appUrl ? `${appUrl}/etkinlikler/${event.public_segment}` : undefined;

    const desc =
        event.description?.trim() ||
        `${event.title}${event.venue_name ? ` — ${event.venue_name}` : ''}${event.city_name ? `, ${event.city_name}` : ''}. Tarih ve fiyat bilgisi bilgilendirme amaçlıdır.`;

    return (
        <AppLayout>
            <SeoHead
                title={`${event.title} - Etkinlik özeti`}
                description={desc.slice(0, 320)}
                image={event.image_url ?? undefined}
                canonicalUrl={canonicalUrl}
            />

            <section className="hero-full-bleed relative min-h-[min(48vh,26rem)] overflow-hidden">
                    {event.image_url ? (
                        <img src={event.image_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
                    ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-950" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/75 to-zinc-950/35" />
                    <div className="relative z-10 mx-auto max-w-4xl px-4 pb-12 pt-10 sm:px-6 lg:px-8 lg:pt-14">
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                            <Link
                                href={route('sehir-sec', event.city_slug ? { sehir: event.city_slug } : {})}
                                className="inline-flex text-sm font-medium text-emerald-400/95 hover:text-emerald-300"
                            >
                                ← Şehir seç
                            </Link>
                            {event.city_slug && (
                                <Link
                                    href={route('sehir-sec.city', { city: event.city_slug })}
                                    className="inline-flex text-sm font-medium text-white/80 hover:text-white"
                                >
                                    Tüm etkinlikler →
                                </Link>
                            )}
                        </div>
                        {event.rank != null && (
                            <p className="mt-6 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/60">
                                <Trophy className="h-4 w-4 text-emerald-400/90" aria-hidden />
                                Popüler sıralaması: {event.rank}
                            </p>
                        )}
                        <h1 className="mt-3 font-display text-3xl font-bold leading-tight text-white sm:text-4xl md:text-5xl">{event.title}</h1>
                        {event.category_name && (
                            <p className="mt-3">
                                <span className="inline-block rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-200">
                                    {event.category_name}
                                </span>
                            </p>
                        )}
                        {(event.city_name || event.venue_name) && (
                            <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-lg text-zinc-300">
                                {event.city_name && <span>{event.city_name}</span>}
                                {event.city_name && event.venue_name && <span className="text-zinc-500">·</span>}
                                {event.venue_name && <span>{event.venue_name}</span>}
                            </p>
                        )}
                    </div>
            </section>

            <div className="relative -mt-8 rounded-t-3xl bg-white px-4 pb-16 pt-10 dark:bg-zinc-900 sm:px-6 lg:px-8">
                    <div className="mx-auto max-w-4xl space-y-8">
                        <div className="grid gap-4 sm:grid-cols-2">
                            {event.dates_line && (
                                <div className="flex gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
                                    <Calendar className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Tarih</p>
                                        <p className="mt-1 text-sm font-medium text-zinc-900 dark:text-white">{event.dates_line}</p>
                                    </div>
                                </div>
                            )}
                            {event.venue_name && (
                                <div className="flex gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
                                    <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Mekan</p>
                                        <p className="mt-1 text-sm font-medium text-zinc-900 dark:text-white">{event.venue_name}</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {event.price_label && (
                            <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/90 p-5 dark:border-emerald-500/25 dark:bg-emerald-500/10">
                                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-300/90">Başlangıç / bilgi</p>
                                <p className="mt-2 text-2xl font-bold text-emerald-700 dark:text-emerald-400">{event.price_label}</p>
                                <p className="mt-2 text-xs text-emerald-900/70 dark:text-emerald-200/70">
                                    Fiyat bilgisi kaynak siteye göre özetlenmiştir; güncel bilet koşulları için aşağıdaki resmi bağlantıyı kullanın.
                                </p>
                            </div>
                        )}

                        {event.description && (
                            <div className="prose prose-zinc dark:prose-invert max-w-none">
                                <p className="whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">{event.description}</p>
                            </div>
                        )}

                        <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/80 p-5 text-sm text-zinc-600 dark:border-zinc-600 dark:bg-zinc-800/40 dark:text-zinc-400">
                            <p>
                                Bu özet, üçüncü taraf biletleme verisine dayanır; Sahnebul üzerinden bilet satışı yapılmaz. Satın alma ve iptal kuralları
                                organizatöre aittir.
                            </p>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                            {event.external_url && (
                                <a
                                    href={event.external_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3.5 text-center text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-500"
                                >
                                    <Ticket className="h-4 w-4" aria-hidden />
                                    Resmi bilet sayfası (Bubilet)
                                    <ExternalLink className="h-4 w-4 opacity-90" aria-hidden />
                                </a>
                            )}
                            <Link
                                href={
                                    event.city_slug
                                        ? route('sehir-sec.city', { city: event.city_slug })
                                        : route('sehir-sec')
                                }
                                className="inline-flex items-center justify-center rounded-xl border border-zinc-300 bg-white px-6 py-3.5 text-center text-sm font-semibold text-zinc-800 transition hover:border-emerald-400 hover:text-emerald-800 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-emerald-500/50"
                            >
                                Şehirdeki tüm etkinlikler
                            </Link>
                        </div>
                    </div>
                </div>
        </AppLayout>
    );
}
