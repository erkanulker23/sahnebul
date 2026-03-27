import SeoHead from '@/Components/SeoHead';
import ArtistLayout from '@/Layouts/ArtistLayout';
import { formatTurkishDateTime } from '@/lib/formatTurkishDateTime';
import { router, useForm } from '@inertiajs/react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';

interface AvailabilityDay {
    id: number;
    date: string;
    note: string | null;
}

interface ManagerUser {
    id: number;
    name: string;
    email: string;
    organization_display_name?: string | null;
}

interface IncomingRequest {
    id: number;
    requested_date: string;
    message: string;
    status: string;
    manager_user: ManagerUser;
}

interface Props {
    artist: {
        id: number;
        name: string;
        availability_visible_to_managers: boolean;
    };
    days: AvailabilityDay[];
    incomingRequests: IncomingRequest[];
}

function statusTr(status: string): string {
    if (status === 'pending') return 'Bekliyor';
    if (status === 'accepted') return 'Onaylandı';
    if (status === 'declined') return 'Reddedildi';
    return status;
}

function toIsoLocal(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

/** Pazartesi = 0 … Pazar = 6 */
function weekdayMonFirst(d: Date): number {
    return (d.getDay() + 6) % 7;
}

export default function ArtistAvailabilityIndex({ artist, days, incomingRequests }: Props) {
    const dayForm = useForm({ date: '', note: '' });
    const rangeForm = useForm({ start_date: '', end_date: '', note: '' });
    const [visibilityPending, setVisibilityPending] = useState(false);
    const [visibleToManagers, setVisibleToManagers] = useState(artist.availability_visible_to_managers);
    const [cursor, setCursor] = useState(() => {
        const t = new Date();
        return new Date(t.getFullYear(), t.getMonth(), 1);
    });

    useEffect(() => {
        setVisibleToManagers(artist.availability_visible_to_managers);
    }, [artist.availability_visible_to_managers]);

    const byDate = useMemo(() => {
        const m: Record<string, AvailabilityDay> = {};
        for (const d of days) {
            const key = d.date.slice(0, 10);
            m[key] = d;
        }
        return m;
    }, [days]);

    const calendarWeeks = useMemo(() => {
        const y = cursor.getFullYear();
        const mo = cursor.getMonth();
        const first = new Date(y, mo, 1);
        const last = new Date(y, mo + 1, 0);
        const startPad = weekdayMonFirst(first);
        const totalCells = startPad + last.getDate();
        const rows = Math.ceil(totalCells / 7);
        const weeks: (Date | null)[][] = [];
        let dayNum = 1;
        for (let r = 0; r < rows; r++) {
            const row: (Date | null)[] = [];
            for (let c = 0; c < 7; c++) {
                const idx = r * 7 + c;
                if (idx < startPad || dayNum > last.getDate()) {
                    row.push(null);
                } else {
                    row.push(new Date(y, mo, dayNum));
                    dayNum++;
                }
            }
            weeks.push(row);
        }
        return weeks;
    }, [cursor]);

    const submitDay = (e: FormEvent) => {
        e.preventDefault();
        dayForm.post(route('artist.availability.days.store'), {
            preserveScroll: true,
            onSuccess: () => dayForm.reset('date', 'note'),
        });
    };

    const submitRange = (e: FormEvent) => {
        e.preventDefault();
        rangeForm.post(route('artist.availability.days.range'), {
            preserveScroll: true,
            onSuccess: () => rangeForm.reset('start_date', 'end_date', 'note'),
        });
    };

    const toggleVisibility = (checked: boolean) => {
        const prev = visibleToManagers;
        setVisibleToManagers(checked);
        setVisibilityPending(true);
        router.patch(
            route('artist.availability.visibility'),
            { availability_visible_to_managers: checked },
            {
                preserveScroll: true,
                onFinish: () => setVisibilityPending(false),
                onError: () => setVisibleToManagers(prev),
            },
        );
    };

    const destroyDay = (id: number) => {
        if (!confirm('Bu müsait gününü kaldırmak istiyor musunuz?')) return;
        router.delete(route('artist.availability.days.destroy', id), { preserveScroll: true });
    };

    const respondRequest = (id: number, status: 'accepted' | 'declined') => {
        router.patch(route('artist.availability.incoming-requests.update', id), { status }, { preserveScroll: true });
    };

    const monthTitle = cursor.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });

    return (
        <ArtistLayout>
            <SeoHead title="Müsaitlik takvimi - Sahnebul" description="Organizasyon firmalarına göstereceğiniz boş günlerinizi yönetin." noindex />

            <div className="mb-8">
                <h1 className="font-display text-2xl font-bold text-zinc-900 dark:text-white">Müsaitlik takvimi</h1>
                <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
                    Onaylı profilinizle bağlı hesabınızda gelecekteki boş günlerinizi işaretleyin. Yalnızca organizasyon yöneticisi hesapları, görünürlüğü açıkken bu günleri kendi sahne
                    panelinde görür ve size talep gönderebilir.
                </p>
            </div>

            <div className="mb-8 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/50">
                <label className="flex cursor-pointer items-start gap-3">
                    <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 rounded border-zinc-300 text-amber-600 focus:ring-amber-500 dark:border-zinc-600"
                        checked={visibleToManagers}
                        onChange={(e) => toggleVisibility(e.target.checked)}
                        disabled={visibilityPending}
                    />
                    <span>
                        <span className="font-medium text-zinc-900 dark:text-white">Organizasyon yöneticilerine göster</span>
                        <span className="mt-1 block text-sm text-zinc-600 dark:text-zinc-400">
                            Kapalıyken müsait günleriniz yönetici panellerinde listelenmez; mevcut talepler etkilenmez.
                        </span>
                    </span>
                </label>
            </div>

            <div className="mb-10 grid gap-8 xl:grid-cols-2">
                <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/50">
                    <div className="mb-4 flex items-center justify-between gap-2">
                        <h2 className="font-semibold capitalize text-zinc-900 dark:text-white">{monthTitle}</h2>
                        <div className="flex gap-1">
                            <button
                                type="button"
                                onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
                                className="rounded-lg border border-zinc-300 p-2 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
                                aria-label="Önceki ay"
                            >
                                <ChevronLeft className="h-5 w-5 stroke-[1.75]" />
                            </button>
                            <button
                                type="button"
                                onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
                                className="rounded-lg border border-zinc-300 p-2 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
                                aria-label="Sonraki ay"
                            >
                                <ChevronRight className="h-5 w-5 stroke-[1.75]" />
                            </button>
                        </div>
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        {['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz'].map((d) => (
                            <div key={d} className="py-2">
                                {d}
                            </div>
                        ))}
                    </div>
                    <div className="mt-1 grid grid-cols-7 gap-1">
                        {calendarWeeks.flatMap((week, wi) =>
                            week.map((cell, ci) => {
                                const key = `${wi}-${ci}`;
                                if (!cell) {
                                    return <div key={key} className="aspect-square rounded-lg bg-zinc-50/50 dark:bg-zinc-950/30" />;
                                }
                                const iso = toIsoLocal(cell);
                                const rec = byDate[iso];
                                const isPast = cell < new Date(new Date().toDateString());
                                return (
                                    <div
                                        key={key}
                                        className={`flex aspect-square flex-col items-center justify-center rounded-lg border text-xs transition ${
                                            rec
                                                ? 'border-amber-400/80 bg-amber-500/20 font-medium text-amber-950 dark:border-amber-500/50 dark:bg-amber-500/15 dark:text-amber-100'
                                                : isPast
                                                  ? 'border-transparent text-zinc-300 dark:text-zinc-600'
                                                  : 'border-zinc-200 bg-white text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200'
                                        }`}
                                        title={rec?.note ?? undefined}
                                    >
                                        <span>{cell.getDate()}</span>
                                    </div>
                                );
                            }),
                        )}
                    </div>
                    <p className="mt-3 text-xs text-zinc-500">
                        Amber renkli günler kayıtlı müsait günlerinizdir. Geçmiş günlere toplu ekleme yapılamaz; tek tek veya aralık formu yalnızca bugünden itibaren çalışır.
                    </p>
                </div>

                <div className="space-y-6">
                    <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/50">
                        <h2 className="font-semibold text-zinc-900 dark:text-white">Toplu müsait gün (aralık)</h2>
                        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                            Başlangıç ve bitiş dahil tüm günler aynı notla kaydedilir (en fazla 366 gün).
                        </p>
                        <form onSubmit={submitRange} className="mt-4 space-y-4">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <label htmlFor="range-start" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                        Başlangıç *
                                    </label>
                                    <input
                                        id="range-start"
                                        type="date"
                                        required
                                        className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
                                        value={rangeForm.data.start_date}
                                        onChange={(e) => rangeForm.setData('start_date', e.target.value)}
                                    />
                                    {rangeForm.errors.start_date && (
                                        <p className="mt-1 text-sm text-red-600">{rangeForm.errors.start_date}</p>
                                    )}
                                </div>
                                <div>
                                    <label htmlFor="range-end" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                        Bitiş *
                                    </label>
                                    <input
                                        id="range-end"
                                        type="date"
                                        required
                                        className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
                                        value={rangeForm.data.end_date}
                                        onChange={(e) => rangeForm.setData('end_date', e.target.value)}
                                    />
                                    {rangeForm.errors.end_date && <p className="mt-1 text-sm text-red-600">{rangeForm.errors.end_date}</p>}
                                </div>
                            </div>
                            <div>
                                <label htmlFor="range-note" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                    Not (isteğe bağlı, tüm günlere uygulanır)
                                </label>
                                <textarea
                                    id="range-note"
                                    rows={2}
                                    maxLength={500}
                                    className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
                                    value={rangeForm.data.note}
                                    onChange={(e) => rangeForm.setData('note', e.target.value)}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={rangeForm.processing}
                                className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-zinc-900 transition hover:bg-amber-400 disabled:opacity-50"
                            >
                                Aralığı kaydet
                            </button>
                        </form>
                    </div>

                    <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/50">
                        <h2 className="font-semibold text-zinc-900 dark:text-white">Tek gün ekle</h2>
                        <form onSubmit={submitDay} className="mt-4 space-y-4">
                            <div>
                                <label htmlFor="avail-date" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                    Tarih
                                </label>
                                <input
                                    id="avail-date"
                                    type="date"
                                    required
                                    className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
                                    value={dayForm.data.date}
                                    onChange={(e) => dayForm.setData('date', e.target.value)}
                                />
                                {dayForm.errors.date && <p className="mt-1 text-sm text-red-600">{dayForm.errors.date}</p>}
                            </div>
                            <div>
                                <label htmlFor="avail-note" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                    Not (isteğe bağlı)
                                </label>
                                <textarea
                                    id="avail-note"
                                    rows={3}
                                    maxLength={500}
                                    className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
                                    value={dayForm.data.note}
                                    onChange={(e) => dayForm.setData('note', e.target.value)}
                                    placeholder="Örn. İstanbul ve çevresi"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={dayForm.processing}
                                className="rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-700 dark:hover:bg-zinc-600"
                            >
                                Günü kaydet
                            </button>
                        </form>
                    </div>
                </div>
            </div>

            <div className="mb-10 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/50">
                <h2 className="font-semibold text-zinc-900 dark:text-white">Kayıtlı müsait günler</h2>
                {days.length === 0 ? (
                    <p className="mt-4 text-sm text-zinc-500">Henüz eklenmiş gün yok.</p>
                ) : (
                    <ul className="mt-4 divide-y divide-zinc-200 dark:divide-zinc-800">
                        {days.map((d) => (
                            <li key={d.id} className="flex items-start justify-between gap-3 py-3 first:pt-0">
                                <div>
                                    <p className="font-medium text-zinc-900 dark:text-white">
                                        {formatTurkishDateTime(d.date, { withTime: false })}
                                    </p>
                                    {d.note && <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{d.note}</p>}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => destroyDay(d.id)}
                                    className="shrink-0 rounded-lg p-2 text-zinc-500 hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400"
                                    aria-label="Günü sil"
                                >
                                    <Trash2 className="h-4 w-4 stroke-[1.75]" />
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/50">
                <h2 className="font-semibold text-zinc-900 dark:text-white">Gelen talepler</h2>
                {incomingRequests.length === 0 ? (
                    <p className="mt-4 text-sm text-zinc-500">Henüz talep yok.</p>
                ) : (
                    <ul className="mt-4 space-y-4">
                        {incomingRequests.map((r) => (
                            <li key={r.id} className="rounded-lg border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="font-medium text-zinc-900 dark:text-white">
                                        {r.manager_user.organization_display_name?.trim() || r.manager_user.name}
                                    </p>
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
                                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                                    Tarih: {formatTurkishDateTime(r.requested_date, { withTime: false })}
                                </p>
                                <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">{r.message}</p>
                                {r.status === 'pending' && (
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            onClick={() => respondRequest(r.id, 'accepted')}
                                            className="rounded-lg bg-green-500/20 px-3 py-1.5 text-sm text-green-800 hover:bg-green-500/30 dark:text-green-300"
                                        >
                                            Onayla
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => respondRequest(r.id, 'declined')}
                                            className="rounded-lg bg-red-500/15 px-3 py-1.5 text-sm text-red-700 hover:bg-red-500/25 dark:text-red-400"
                                        >
                                            Reddet
                                        </button>
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </ArtistLayout>
    );
}
