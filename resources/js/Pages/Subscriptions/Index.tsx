import { RichOrPlainContent } from '@/Components/SafeRichContent';
import SeoHead from '@/Components/SeoHead';
import AppLayout from '@/Layouts/AppLayout';
import ArtistLayout from '@/Layouts/ArtistLayout';
import { Link, router } from '@inertiajs/react';

interface Plan {
    id: number;
    name: string;
    membership_type: 'artist' | 'venue';
    interval: 'monthly' | 'yearly';
    trial_days?: number;
    price: string;
    features?: string | null;
}

interface Props {
    plans: Plan[];
    activeSubscription?: {
        id: number;
        ends_at: string;
        plan?: { name: string };
    } | null;
    selectedType?: 'artist' | 'venue';
    /** Sanatçı veya bağlı mekanı olan kullanıcı: sol menülü sahne paneli */
    useArtistPanel?: boolean;
    /** Sanatçı veya mekan sahibi: paket satın alma */
    canPurchase?: boolean;
}

function SubscriptionContent({
    plans,
    activeSubscription,
    selectedType = 'venue',
    canPurchase = false,
}: Readonly<Omit<Props, 'useArtistPanel'>>) {
    return (
        <>
            <SeoHead
                title="Gold Üyelik Paketleri"
                description="Sanatçı ve mekan Gold üyelik paketleri; özellikler ve fiyatlar. Yalnızca giriş yapmış kullanıcılar için."
                noindex
            />
            <h1 className="font-display text-3xl font-bold text-white">Üyelik Paketleri</h1>
            <p className="mt-2 text-zinc-400">Sanatçı ve mekan üyelik paketlerini buradan seçebilirsiniz.</p>
            <div className="mt-4 inline-flex rounded-xl border border-white/10 bg-zinc-900/50 p-1">
                <Link href={route('subscriptions.index', { type: 'venue' })} className={`rounded-lg px-3 py-1.5 text-sm ${selectedType === 'venue' ? 'bg-amber-500 text-zinc-950' : 'text-zinc-400 hover:text-white'}`}>Mekan Üyeliği</Link>
                <Link href={route('subscriptions.index', { type: 'artist' })} className={`rounded-lg px-3 py-1.5 text-sm ${selectedType === 'artist' ? 'bg-amber-500 text-zinc-950' : 'text-zinc-400 hover:text-white'}`}>Sanatçı Üyeliği</Link>
            </div>

            {activeSubscription && (
                <div className="mt-6 rounded-xl border border-green-500/40 bg-green-500/10 p-4 text-green-300">
                    Aktif paket: <b>{activeSubscription.plan?.name ?? 'Gold'}</b> — bitiş: {new Date(activeSubscription.ends_at).toLocaleDateString('tr-TR')}
                </div>
            )}

            {!canPurchase && (
                <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
                    Paket satın almak için hesabınızın <strong>sanatçı</strong> olması veya size bağlı en az bir <strong>mekan</strong> bulunması gerekir.
                </div>
            )}

            <div className="mt-8 grid gap-6 md:grid-cols-2">
                {plans.map((plan) => (
                    <div key={plan.id} className="rounded-2xl border border-white/10 bg-zinc-900/50 p-6">
                        <p className="text-xs uppercase tracking-wider text-amber-500">{plan.interval === 'yearly' ? 'Yıllık' : 'Aylık'}</p>
                        <h2 className="mt-2 text-2xl font-bold text-white">{plan.name}</h2>
                        <p className="mt-2 text-3xl font-extrabold text-amber-400">₺{Number(plan.price).toLocaleString('tr-TR')}</p>
                        {(plan.trial_days ?? 0) > 0 && (
                            <p className="mt-1 text-sm font-medium text-emerald-400">{plan.trial_days} gün ücretsiz deneme</p>
                        )}
                        {plan.features?.trim() && (
                            <div className="mt-3 text-sm text-zinc-400">
                                <RichOrPlainContent
                                    content={plan.features}
                                    richClassName="prose prose-sm prose-invert max-w-none text-zinc-400 prose-p:my-2 prose-ul:my-2 prose-headings:text-zinc-200 prose-a:text-amber-400"
                                    plainParagraphClassName="mb-2 whitespace-pre-line text-zinc-400 last:mb-0"
                                />
                            </div>
                        )}
                        <button
                            type="button"
                            disabled={!canPurchase}
                            onClick={() => canPurchase && router.post(route('subscriptions.store'), { plan_id: plan.id })}
                            className="mt-6 rounded-xl bg-amber-500 px-4 py-2 font-semibold text-zinc-950 hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            Paketi Satın Al
                        </button>
                    </div>
                ))}
            </div>
        </>
    );
}

export default function SubscriptionIndex({
    plans,
    activeSubscription,
    selectedType = 'venue',
    useArtistPanel = false,
    canPurchase = false,
}: Readonly<Props>) {
    if (useArtistPanel) {
        return (
            <ArtistLayout>
                <SubscriptionContent
                    plans={plans}
                    activeSubscription={activeSubscription}
                    selectedType={selectedType}
                    canPurchase={canPurchase}
                />
            </ArtistLayout>
        );
    }

    return (
        <AppLayout>
            <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
                <SeoHead
                    title="Gold Üyelik Paketleri"
                    description="Sanatçı ve mekan Gold üyelik paketleri; özellikler ve fiyatlar. Yalnızca giriş yapmış kullanıcılar için."
                    noindex
                />
                <h1 className="text-3xl font-bold dark:text-white">Üyelik Paketleri</h1>
                <p className="mt-2 text-zinc-500">Sanatçı Üyeliği ve Mekan Üyeliği paketlerini buradan yönetebilirsiniz.</p>
                <div className="mt-4 inline-flex rounded-xl border border-zinc-200 bg-white p-1 dark:border-white/10 dark:bg-zinc-900/40">
                    <Link href={route('subscriptions.index', { type: 'venue' })} className={`rounded-lg px-3 py-1.5 text-sm ${selectedType === 'venue' ? 'bg-amber-500 text-zinc-950' : 'text-zinc-600 dark:text-zinc-300'}`}>Mekan Üyeliği</Link>
                    <Link href={route('subscriptions.index', { type: 'artist' })} className={`rounded-lg px-3 py-1.5 text-sm ${selectedType === 'artist' ? 'bg-amber-500 text-zinc-950' : 'text-zinc-600 dark:text-zinc-300'}`}>Sanatçı Üyeliği</Link>
                </div>

                {activeSubscription && (
                    <div className="mt-6 rounded-xl border border-green-500/40 bg-green-500/10 p-4 text-green-700 dark:text-green-300">
                        Aktif paket: <b>{activeSubscription.plan?.name ?? 'Gold'}</b> - bitiş: {new Date(activeSubscription.ends_at).toLocaleDateString('tr-TR')}
                    </div>
                )}

                {!canPurchase && (
                    <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-900 dark:text-amber-200">
                        Paket satın almak için hesabınızın <strong>sanatçı</strong> olması veya size bağlı en az bir <strong>mekan</strong> bulunması gerekir.
                    </div>
                )}

                <div className="mt-8 grid gap-6 md:grid-cols-2">
                    {plans.map((plan) => (
                        <div key={plan.id} className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-white/10 dark:bg-zinc-900/40">
                            <p className="text-xs uppercase tracking-wider text-amber-500">{plan.interval === 'yearly' ? 'Yıllık' : 'Aylık'}</p>
                            <h2 className="mt-2 text-2xl font-bold dark:text-white">{plan.name}</h2>
                            <p className="mt-2 text-3xl font-extrabold">₺{Number(plan.price).toLocaleString('tr-TR')}</p>
                            {(plan.trial_days ?? 0) > 0 && (
                                <p className="mt-1 text-sm font-medium text-emerald-600 dark:text-emerald-400">{plan.trial_days} gün ücretsiz deneme</p>
                            )}
                            {plan.features?.trim() && (
                                <div className="mt-3 text-sm text-zinc-600 dark:text-zinc-500">
                                    <RichOrPlainContent
                                        content={plan.features}
                                        richClassName="prose prose-sm max-w-none dark:prose-invert prose-p:my-2 prose-ul:my-2 prose-headings:text-zinc-800 dark:prose-headings:text-zinc-200 prose-a:text-amber-600 dark:prose-a:text-amber-400"
                                        plainParagraphClassName="mb-2 whitespace-pre-line text-zinc-600 last:mb-0 dark:text-zinc-500"
                                    />
                                </div>
                            )}
                            <button
                                type="button"
                                disabled={!canPurchase}
                                onClick={() => canPurchase && router.post(route('subscriptions.store'), { plan_id: plan.id })}
                                className="mt-6 rounded-xl bg-amber-500 px-4 py-2 font-semibold text-zinc-950 hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                Paketi Satın Al
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </AppLayout>
    );
}
