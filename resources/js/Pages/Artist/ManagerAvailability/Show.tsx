import SeoHead from '@/Components/SeoHead';
import ArtistLayout from '@/Layouts/ArtistLayout';
import { formatTurkishDateTime } from '@/lib/formatTurkishDateTime';
import { Link, useForm } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import { FormEvent } from 'react';

interface AvailabilityDay {
    id: number;
    date: string;
    note: string | null;
}

interface AvailabilityDayRef {
    id: number;
    date: string;
    note: string | null;
}

interface MyRequest {
    id: number;
    message: string;
    status: string;
    requested_date: string;
    created_at?: string;
    availability_day: AvailabilityDayRef | null;
}

interface Props {
    artist: { id: number; name: string; slug: string };
    days: AvailabilityDay[];
    myRequests: MyRequest[];
}

function statusTr(status: string): string {
    if (status === 'pending') return 'Bekliyor';
    if (status === 'accepted') return 'Onaylandı';
    if (status === 'declined') return 'Reddedildi';
    return status;
}

export default function ManagerAvailabilityShow({ artist, days, myRequests }: Props) {
    const requestForm = useForm({
        artist_availability_day_id: 0,
        message: '',
    });

    const openRequestForDay = (dayId: number) => {
        requestForm.setData('artist_availability_day_id', dayId);
    };

    const submitRequest = (e: FormEvent) => {
        e.preventDefault();
        if (!requestForm.data.artist_availability_day_id) return;
        requestForm.post(route('artist.manager-availability.requests.store', artist.slug), {
            preserveScroll: true,
            onSuccess: () => requestForm.reset('message'),
        });
    };

    return (
        <ArtistLayout>
            <SeoHead title={`${artist.name} — müsaitlik - Sahnebul`} description="Müsait günlere talep gönderin." noindex />

            <Link
                href={route('artist.manager-availability.index')}
                className="mb-6 inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-amber-600 dark:text-zinc-400"
            >
                <ArrowLeft className="h-4 w-4" aria-hidden />
                Listeye dön
            </Link>

            <h1 className="font-display text-2xl font-bold text-zinc-900 dark:text-white">{artist.name}</h1>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                Gönderdiğiniz müsaitlik taleplerini aşağıda görebilirsiniz; yeni talep için müsait gün seçip mesaj gönderin.
            </p>

            <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/50">
                <h2 className="font-semibold text-zinc-900 dark:text-white">Gönderdiğim talepler</h2>
                {myRequests.length === 0 ? (
                    <p className="mt-4 text-sm text-zinc-500">Henüz bu sanatçı için talep göndermediniz.</p>
                ) : (
                    <ul className="mt-4 space-y-4">
                        {myRequests.map((r) => (
                            <li key={r.id} className="rounded-lg border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div>
                                        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                                            {formatTurkishDateTime(r.requested_date, { withTime: false })}
                                        </p>
                                        {r.availability_day?.note ? (
                                            <p className="mt-0.5 text-xs text-zinc-500">Müsaitlik notu: {r.availability_day.note}</p>
                                        ) : null}
                                        {r.created_at ? (
                                            <p className="mt-0.5 text-xs text-zinc-500">
                                                Gönderim: {formatTurkishDateTime(r.created_at, { withTime: true })}
                                            </p>
                                        ) : null}
                                    </div>
                                    <span
                                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                            r.status === 'pending'
                                                ? 'bg-amber-500/20 text-amber-800 dark:text-amber-300'
                                                : r.status === 'accepted'
                                                  ? 'bg-green-500/20 text-green-800 dark:text-green-300'
                                                  : 'bg-zinc-500/20 text-zinc-700 dark:text-zinc-300'
                                        }`}
                                    >
                                        {statusTr(r.status)}
                                    </span>
                                </div>
                                <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-600 dark:text-zinc-400">{r.message}</p>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div className="mt-8 grid gap-8 lg:grid-cols-2">
                <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/50">
                    <h2 className="font-semibold text-zinc-900 dark:text-white">Müsait günler</h2>
                    {days.length === 0 ? (
                        <p className="mt-4 text-sm text-zinc-500">Yakında müsait gün yok.</p>
                    ) : (
                        <ul className="mt-4 space-y-3">
                            {days.map((d) => {
                                const selected = requestForm.data.artist_availability_day_id === d.id;
                                return (
                                    <li key={d.id}>
                                        <button
                                            type="button"
                                            onClick={() => openRequestForDay(d.id)}
                                            className={`w-full rounded-lg border px-4 py-3 text-left text-sm transition ${
                                                selected
                                                    ? 'border-amber-500 bg-amber-500/10'
                                                    : 'border-zinc-200 hover:border-zinc-300 dark:border-zinc-700 dark:hover:border-zinc-600'
                                            }`}
                                        >
                                            <span className="font-medium text-zinc-900 dark:text-white">{formatTurkishDateTime(d.date, { withTime: false })}</span>
                                            {d.note && <span className="mt-1 block text-zinc-600 dark:text-zinc-400">{d.note}</span>}
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>

                <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/50">
                    <h2 className="font-semibold text-zinc-900 dark:text-white">Talep gönder</h2>
                    <form onSubmit={submitRequest} className="mt-4 space-y-4">
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                            {requestForm.data.artist_availability_day_id
                                ? 'Seçili güne mesajınızı yazın.'
                                : 'Önce soldan bir müsait gün seçin (üstte gönderilen talepler listelenir).'}
                        </p>
                        <div>
                            <label htmlFor="req-msg" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                Mesajınız
                            </label>
                            <textarea
                                id="req-msg"
                                required
                                rows={6}
                                maxLength={2000}
                                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
                                value={requestForm.data.message}
                                onChange={(e) => requestForm.setData('message', e.target.value)}
                                placeholder="Etkinlik türü, tarih/saat beklentisi, bütçe veya iletişim tercihiniz…"
                                disabled={!requestForm.data.artist_availability_day_id}
                            />
                            {requestForm.errors.message && <p className="mt-1 text-sm text-red-600">{requestForm.errors.message}</p>}
                            {requestForm.errors.artist_availability_day_id && (
                                <p className="mt-1 text-sm text-red-600">{requestForm.errors.artist_availability_day_id}</p>
                            )}
                        </div>
                        <button
                            type="submit"
                            disabled={requestForm.processing || !requestForm.data.artist_availability_day_id}
                            className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-zinc-900 transition hover:bg-amber-400 disabled:opacity-50"
                        >
                            Talebi gönder
                        </button>
                    </form>
                </div>
            </div>
        </ArtistLayout>
    );
}
