import { AdminPageHeader } from '@/Components/Admin';
import AdminLayout from '@/Layouts/AdminLayout';
import SeoHead from '@/Components/SeoHead';
import { venueArtistStatusTr } from '@/lib/statusLabels';
import { router } from '@inertiajs/react';

interface Claim {
    id: number;
    status: 'pending' | 'approved' | 'rejected';
    message?: string | null;
    venue: { name: string; slug: string; user_id?: number | null };
    user: { name: string; email: string };
}

interface Props {
    claims: { data: Claim[] };
}

function statusBadge(status: Claim['status']): string {
    if (status === 'approved') return 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-400';
    if (status === 'pending') return 'bg-amber-500/15 text-amber-800 dark:text-amber-400';
    return 'bg-red-500/15 text-red-800 dark:text-red-400';
}

export default function VenueClaimsIndex({ claims }: Readonly<Props>) {
    return (
        <AdminLayout>
            <SeoHead title="Mekan Sahiplenme Talepleri" description="Mekan sahiplenme başvuruları." noindex />
            <div className="space-y-6">
                <AdminPageHeader title="Mekan sahiplenme talepleri" description="Başvuruları inceleyip onaylayın veya reddedin." />

                <ul className="space-y-3" role="list">
                    {claims.data.map((claim) => (
                        <li
                            key={claim.id}
                            className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50"
                        >
                            <p className="font-semibold text-zinc-900 dark:text-white">{claim.venue.name}</p>
                            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                                {claim.user.name} — {claim.user.email}
                            </p>
                            {claim.message && <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">{claim.message}</p>}
                            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge(claim.status)}`}>
                                    {venueArtistStatusTr(claim.status)}
                                </span>
                                {claim.status === 'pending' && (
                                    <>
                                        <button
                                            type="button"
                                            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500"
                                            onClick={() => router.post(route('admin.venue-claims.approve', claim.id))}
                                        >
                                            Onayla
                                        </button>
                                        <button
                                            type="button"
                                            className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-500"
                                            onClick={() => router.post(route('admin.venue-claims.reject', claim.id))}
                                        >
                                            Reddet
                                        </button>
                                    </>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </AdminLayout>
    );
}
