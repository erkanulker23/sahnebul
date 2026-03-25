import { AdminPageHeader } from '@/Components/Admin';
import AdminLayout from '@/Layouts/AdminLayout';
import SeoHead from '@/Components/SeoHead';
import { formatTurkishDateTime } from '@/lib/formatTurkishDateTime';
import { router } from '@inertiajs/react';
import { FormEvent } from 'react';

interface Review {
    id: number;
    rating: number;
    comment: string | null;
    is_approved: boolean;
    created_at: string;
    user: { name: string };
    venue: { name: string; slug: string };
}

interface Props {
    reviews: { data: Review[]; links: unknown[] };
    filters: { approved?: string; search?: string };
}

const fieldClass =
    'w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white sm:w-auto';

export default function AdminReviewsIndex({ reviews, filters }: Readonly<Props>) {
    const submitFilters = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const search = (fd.get('search') as string) || undefined;
        const approved = (fd.get('approved') as string) || undefined;
        router.get(
            route('admin.reviews.index'),
            {
                ...(search ? { search } : {}),
                ...(approved ? { approved } : {}),
            },
            { preserveState: true },
        );
    };

    return (
        <AdminLayout>
            <SeoHead title="Yorumlar - Admin | Sahnebul" description="Mekan yorumlarını onaylayın." noindex />

            <div className="space-y-6">
                <AdminPageHeader title="İçerik denetimi — yorumlar" description="Yorumları filtreleyin, onaylayın veya silin." />

                <form
                    onSubmit={submitFilters}
                    className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/40 sm:flex-row sm:flex-wrap sm:items-end"
                >
                    <div className="min-w-0 flex-1 sm:max-w-md">
                        <label htmlFor="rev-search" className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                            Ara
                        </label>
                        <input
                            id="rev-search"
                            type="text"
                            name="search"
                            placeholder="Yorum içinde ara…"
                            defaultValue={filters.search}
                            className={fieldClass}
                        />
                    </div>
                    <div className="w-full sm:w-48">
                        <label htmlFor="rev-approved" className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                            Durum
                        </label>
                        <select id="rev-approved" name="approved" defaultValue={filters.approved ?? ''} className={fieldClass}>
                            <option value="">Tümü</option>
                            <option value="pending">Onay bekleyen</option>
                            <option value="yes">Onaylı</option>
                        </select>
                    </div>
                    <button
                        type="submit"
                        className="w-full rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-amber-400 sm:w-auto"
                    >
                        Filtrele
                    </button>
                </form>

                <div className="space-y-4">
                    {reviews.data.map((review) => (
                        <div
                            key={review.id}
                            className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50"
                        >
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div className="min-w-0 flex-1">
                                    <p className="font-medium text-zinc-900 dark:text-white">
                                        {review.user.name} → {review.venue.name}
                                    </p>
                                    <p className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                                        <span className="text-amber-600 dark:text-amber-400">{'★'.repeat(review.rating)}</span>
                                        <span className="text-zinc-500 dark:text-zinc-400">
                                            {formatTurkishDateTime(review.created_at)}
                                        </span>
                                        {!review.is_approved && (
                                            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-400">
                                                Onay bekliyor
                                            </span>
                                        )}
                                    </p>
                                    {review.comment && <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">{review.comment}</p>}
                                </div>
                                <div className="flex shrink-0 flex-wrap gap-2 border-t border-zinc-100 pt-3 sm:border-0 sm:pt-0 dark:border-zinc-800">
                                    {!review.is_approved && (
                                        <button
                                            type="button"
                                            onClick={() => router.post(route('admin.reviews.approve', review.id))}
                                            className="rounded-lg bg-emerald-600/15 px-3 py-1.5 text-sm font-medium text-emerald-800 hover:bg-emerald-600/25 dark:text-emerald-400"
                                        >
                                            Onayla
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (confirm('Silmek istediğinize emin misiniz?')) {
                                                router.delete(route('admin.reviews.destroy', review.id));
                                            }
                                        }}
                                        className="rounded-lg bg-red-600/15 px-3 py-1.5 text-sm font-medium text-red-800 hover:bg-red-600/25 dark:text-red-400"
                                    >
                                        Sil
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </AdminLayout>
    );
}
