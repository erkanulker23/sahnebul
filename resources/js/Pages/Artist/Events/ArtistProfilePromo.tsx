import ArtistLayout from '@/Layouts/ArtistLayout';
import SeoHead from '@/Components/SeoHead';
import { Link, useForm } from '@inertiajs/react';

interface EventPayload {
    id: number;
    title: string;
    slug_segment: string;
    promo_show_on_artist_profile_posts: boolean;
    promo_show_on_artist_profile_videos: boolean;
    promo_artist_profile_moderation?: string | null;
}

interface Props {
    event: EventPayload;
}

export default function ArtistProfilePromo({ event }: Readonly<Props>) {
    const { data, setData, put, processing } = useForm({
        promo_show_on_artist_profile_posts: event.promo_show_on_artist_profile_posts,
        promo_show_on_artist_profile_videos: event.promo_show_on_artist_profile_videos,
    });

    return (
        <ArtistLayout>
            <SeoHead title={`${event.title} — sanatçı sayfası tanıtımı`} description="Profilinizde etkinlik tanıtımını gösterin." noindex />

            <div className="mx-auto max-w-xl space-y-6">
                <Link href={route('artist.events.edit', event.id)} className="text-sm font-medium text-amber-400 hover:text-amber-300">
                    ← Etkinlik düzenlemeye dön
                </Link>
                <h1 className="font-display text-2xl font-bold text-white">Sanatçı sayfasında tanıtım</h1>
                <p className="text-sm text-zinc-400">
                    <strong className="text-zinc-200">{event.title}</strong> — bu etkinliğin tanıtım videoları ve gönderi görselleri, seçtiğiniz
                    taktirde sizin (kadrodaki) sanatçı profil sayfanızda da listelenir. Etkinlik günü sonuna kadar görünür; ardından medya sistemden
                    kaldırılır. Değişiklikler yönetici onayına düşebilir.
                </p>
                {event.promo_artist_profile_moderation === 'pending_review' ? (
                    <p className="rounded-lg border border-amber-500/40 bg-amber-950/30 px-4 py-3 text-sm text-amber-100">
                        Bu tercihler <strong>onay bekliyor</strong>; onaylanana kadar ziyaretçi sayfasında görünmez.
                    </p>
                ) : null}
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        put(route('artist.events.artist-profile-promo.update', event.id));
                    }}
                    className="space-y-5 rounded-xl border border-white/10 bg-zinc-900/50 p-6"
                >
                    <label className="flex cursor-pointer items-start gap-3 text-sm text-zinc-300">
                        <input
                            type="checkbox"
                            checked={data.promo_show_on_artist_profile_videos}
                            onChange={(e) => setData('promo_show_on_artist_profile_videos', e.target.checked)}
                            className="mt-1 rounded border-zinc-600 bg-zinc-800 text-amber-500"
                        />
                        <span>
                            Tanıtım <strong className="text-white">videolarını</strong> sanatçı profilimde göster
                        </span>
                    </label>
                    <label className="flex cursor-pointer items-start gap-3 text-sm text-zinc-300">
                        <input
                            type="checkbox"
                            checked={data.promo_show_on_artist_profile_posts}
                            onChange={(e) => setData('promo_show_on_artist_profile_posts', e.target.checked)}
                            className="mt-1 rounded border-zinc-600 bg-zinc-800 text-fuchsia-500"
                        />
                        <span>
                            Tanıtım <strong className="text-white">gönderi görsellerini</strong> sanatçı profilimde göster
                        </span>
                    </label>
                    <button
                        type="submit"
                        disabled={processing}
                        className="rounded-xl bg-amber-500 px-6 py-2.5 font-semibold text-zinc-950 hover:bg-amber-400 disabled:opacity-50"
                    >
                        Kaydet
                    </button>
                </form>
                <p className="text-xs text-zinc-500">
                    Videoları ve görselleri yüklemek veya düzenlemek için mekân sahibi olarak{' '}
                    <Link href={route('artist.events.edit', event.id)} className="text-amber-400 underline">
                        etkinlik düzenleme
                    </Link>{' '}
                    sayfasındaki tanıtım bölümünü kullanın.
                </p>
            </div>
        </ArtistLayout>
    );
}
