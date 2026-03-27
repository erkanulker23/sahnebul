import { router } from '@inertiajs/react';
import { formatTurkishDateTime } from '@/lib/formatTurkishDateTime';
import { FormEvent, useMemo, useState } from 'react';

export interface AdminSubscriptionPlanOption {
    id: number;
    name: string;
    slug: string;
    interval: string;
    price: string | number;
}

export interface AdminOwnerSubscription {
    starts_at: string;
    ends_at: string;
    plan: { id: number; name: string; slug: string; membership_type: string } | null;
}

interface Props {
    title: string;
    description?: string;
    postRouteName: 'admin.venues.subscription.update' | 'admin.artists.subscription.update';
    routeParam: { venue: number } | { artist: number };
    owner: { id: number; name: string; email: string } | null;
    plans: AdminSubscriptionPlanOption[];
    ownerSubscription: AdminOwnerSubscription | null;
}

const COMPLIMENTARY_SLUGS = new Set(['admin-complimentary-unlimited-venue', 'admin-complimentary-unlimited-artist']);

function defaultEndsAtLocal(): string {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AdminEntitySubscriptionPanel({
    title,
    description,
    postRouteName,
    routeParam,
    owner,
    plans,
    ownerSubscription,
}: Readonly<Props>) {
    const initialMode = useMemo(() => {
        const slug = ownerSubscription?.plan?.slug;
        if (!ownerSubscription || !slug) {
            return 'remove' as const;
        }
        if (COMPLIMENTARY_SLUGS.has(slug)) {
            return 'complimentary' as const;
        }

        return 'plan' as const;
    }, [ownerSubscription]);

    const [subscriptionMode, setSubscriptionMode] = useState<'remove' | 'plan' | 'complimentary'>(initialMode);
    const [planId, setPlanId] = useState<string>(
        ownerSubscription?.plan && !COMPLIMENTARY_SLUGS.has(ownerSubscription.plan.slug)
            ? String(ownerSubscription.plan.id)
            : plans[0]?.id != null
              ? String(plans[0].id)
              : '',
    );
    const [endsAt, setEndsAt] = useState(defaultEndsAtLocal);
    const [submitting, setSubmitting] = useState(false);

    const submit = (e: FormEvent) => {
        e.preventDefault();
        if (!owner) {
            return;
        }
        setSubmitting(true);
        router.post(
            route(postRouteName, routeParam),
            {
                subscription_mode: subscriptionMode,
                subscription_plan_id: subscriptionMode === 'plan' ? planId : '',
                subscription_ends_at: subscriptionMode === 'plan' ? endsAt : '',
            },
            {
                preserveScroll: true,
                onFinish: () => setSubmitting(false),
            },
        );
    };

    if (!owner) {
        return (
            <div className="max-w-3xl rounded-xl border border-zinc-700 bg-zinc-900/40 p-6">
                <h2 className="text-lg font-semibold text-white">{title}</h2>
                <p className="mt-2 text-sm text-zinc-500">
                    Bu kayda bağlı kullanıcı yok. Üyelik paketi atamak için önce mekân/sanatçıyı bir kullanıcıya bağlayın.
                </p>
            </div>
        );
    }

    return (
        <div className="max-w-3xl rounded-xl border border-amber-500/25 bg-amber-500/5 p-6">
            <h2 className="text-lg font-semibold text-white">{title}</h2>
            {description ? <p className="mt-1 text-sm text-zinc-400">{description}</p> : null}
            <p className="mt-3 text-sm text-zinc-300">
                Kullanıcı:{' '}
                <span className="font-medium text-white">
                    {owner.name} ({owner.email})
                </span>
            </p>
            {ownerSubscription?.plan ? (
                <div className="mt-3 rounded-lg border border-zinc-700 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-300">
                    <p>
                        <span className="text-zinc-500">Güncel paket: </span>
                        <span className="font-medium text-amber-200">{ownerSubscription.plan.name}</span>
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                        {formatTurkishDateTime(ownerSubscription.starts_at, { withTime: false })} —{' '}
                        {formatTurkishDateTime(ownerSubscription.ends_at)}
                    </p>
                </div>
            ) : (
                <p className="mt-3 text-sm text-zinc-500">Aktif atanmış paket yok.</p>
            )}

            <form onSubmit={submit} className="mt-5 space-y-4">
                <fieldset className="space-y-2">
                    <legend className="text-sm font-medium text-zinc-400">Atama</legend>
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
                        <input
                            type="radio"
                            name="subscription_mode"
                            checked={subscriptionMode === 'remove'}
                            onChange={() => setSubscriptionMode('remove')}
                            className="border-zinc-600 text-amber-500"
                        />
                        Paketi kaldır (aktif üyelikleri iptal et)
                    </label>
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
                        <input
                            type="radio"
                            name="subscription_mode"
                            checked={subscriptionMode === 'complimentary'}
                            onChange={() => setSubscriptionMode('complimentary')}
                            className="border-zinc-600 text-amber-500"
                        />
                        Sınırsız ücretsiz üyelik (yönetici, satış sayfasında görünmez)
                    </label>
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
                        <input
                            type="radio"
                            name="subscription_mode"
                            checked={subscriptionMode === 'plan'}
                            onChange={() => setSubscriptionMode('plan')}
                            className="border-zinc-600 text-amber-500"
                        />
                        Mevcut paketlerden seç
                    </label>
                </fieldset>

                {subscriptionMode === 'plan' ? (
                    <div className="space-y-3 rounded-lg border border-zinc-700 bg-zinc-900/40 p-4">
                        <div>
                            <label htmlFor="admin-sub-plan" className="block text-sm text-zinc-400">
                                Paket *
                            </label>
                            <select
                                id="admin-sub-plan"
                                value={planId}
                                onChange={(e) => setPlanId(e.target.value)}
                                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                                required={subscriptionMode === 'plan'}
                            >
                                {plans.length === 0 ? <option value="">— Tanımlı paket yok —</option> : null}
                                {plans.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.name} ({p.interval === 'yearly' ? 'yıllık' : 'aylık'}) — ₺{Number(p.price).toLocaleString('tr-TR')}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="admin-sub-ends" className="block text-sm text-zinc-400">
                                Bitiş tarihi *
                            </label>
                            <input
                                id="admin-sub-ends"
                                type="datetime-local"
                                value={endsAt}
                                onChange={(e) => setEndsAt(e.target.value)}
                                required={subscriptionMode === 'plan'}
                                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                            />
                        </div>
                    </div>
                ) : null}

                <button
                    type="submit"
                    disabled={submitting || (subscriptionMode === 'plan' && (planId === '' || plans.length === 0))}
                    className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-amber-400 disabled:opacity-50"
                >
                    {submitting ? 'Kaydediliyor…' : 'Üyelik atamasını kaydet'}
                </button>
            </form>
        </div>
    );
}
