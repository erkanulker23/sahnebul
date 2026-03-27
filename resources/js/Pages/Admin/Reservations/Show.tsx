import { formatTurkishDateTimeFromParts } from '@/lib/formatTurkishDateTime';
import AdminLayout from '@/Layouts/AdminLayout';
import SeoHead from '@/Components/SeoHead';
import { Link, router } from '@inertiajs/react';

interface Reservation {
    id: number;
    reservation_date: string;
    reservation_time: string;
    status: string;
    total_amount: number;
    reservation_type: string;
    guest_name: string | null;
    guest_phone: string | null;
    guest_count: number;
    quantity: number;
    notes: string | null;
    user: { name: string; email: string };
    venue: { name: string };
    event: { title: string } | null;
}

interface Props {
    reservation: Reservation;
}

export default function AdminReservationShow({ reservation }: Props) {
    const updateStatus = (status: string) => {
        router.patch(route('admin.reservations.updateStatus', reservation.id), { status });
    };

    return (
        <AdminLayout>
            <SeoHead title={`Rezervasyon #${reservation.id} - Admin | Sahnebul`} description="Rezervasyon detayı." noindex />

            <div className="space-y-6">
                <Link
                    href={route('admin.reservations.index')}
                    className="mb-6 inline-block text-amber-700 hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-300"
                >
                    ← Rezervasyonlara Dön
                </Link>
                <h1 className="mb-8 text-2xl font-bold text-zinc-900 dark:text-white">Rezervasyon Detayı #{reservation.id}</h1>

                <div className="grid gap-6 lg:grid-cols-2">
                    <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
                        <h2 className="mb-4 font-semibold text-zinc-900 dark:text-white">Bilgiler</h2>
                        <dl className="space-y-3">
                            <div>
                                <dt className="text-sm text-zinc-500">Hesap</dt>
                                <dd className="text-zinc-900 dark:text-white">
                                    {reservation.user.name} ({reservation.user.email})
                                </dd>
                            </div>
                            {(reservation.guest_name || reservation.guest_phone) && (
                                <div>
                                    <dt className="text-sm text-zinc-500">Form (ad / telefon)</dt>
                                    <dd className="text-zinc-900 dark:text-white">
                                        {[reservation.guest_name, reservation.guest_phone].filter(Boolean).join(' · ')}
                                    </dd>
                                </div>
                            )}
                            <div>
                                <dt className="text-sm text-zinc-500">Sahne</dt>
                                <dd className="text-zinc-900 dark:text-white">{reservation.venue.name}</dd>
                            </div>
                            {reservation.event && (
                                <div>
                                    <dt className="text-sm text-zinc-500">Etkinlik</dt>
                                    <dd className="text-zinc-900 dark:text-white">{reservation.event.title}</dd>
                                </div>
                            )}
                            <div>
                                <dt className="text-sm text-zinc-500">Tarih / Saat</dt>
                                <dd className="text-zinc-900 dark:text-white">
                                    {formatTurkishDateTimeFromParts(reservation.reservation_date, reservation.reservation_time)}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-sm text-zinc-500">Tip</dt>
                                <dd className="text-zinc-900 dark:text-white">{reservation.reservation_type}</dd>
                            </div>
                            <div>
                                <dt className="text-sm text-zinc-500">Misafir / Adet</dt>
                                <dd className="text-zinc-900 dark:text-white">
                                    {reservation.guest_count} / {reservation.quantity}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-sm text-zinc-500">Tutar</dt>
                                <dd className="font-medium text-amber-700 dark:text-amber-400">
                                    ₺{Number(reservation.total_amount).toLocaleString('tr-TR')}
                                </dd>
                            </div>
                            {reservation.notes && (
                                <div>
                                    <dt className="text-sm text-zinc-500">Not</dt>
                                    <dd className="text-zinc-600 dark:text-zinc-400">{reservation.notes}</dd>
                                </div>
                            )}
                        </dl>
                    </div>

                    <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
                        <h2 className="mb-4 font-semibold text-zinc-900 dark:text-white">Durum Güncelle</h2>
                        <p className="mb-4 text-sm text-zinc-500">
                            Mevcut durum:{' '}
                            <span className="text-amber-700 dark:text-amber-400">{reservation.status}</span>
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {['pending', 'confirmed', 'cancelled', 'completed'].map((s) => (
                                <button
                                    key={s}
                                    onClick={() => updateStatus(s)}
                                    disabled={reservation.status === s}
                                    className={`rounded-lg px-4 py-2 text-sm ${
                                        reservation.status === s
                                            ? 'cursor-not-allowed bg-zinc-200 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400'
                                            : 'bg-amber-500/20 text-amber-800 hover:bg-amber-500/30 dark:text-amber-400'
                                    }`}
                                >
                                    {s === 'pending' ? 'Bekleyen' : s === 'confirmed' ? 'Onayla' : s === 'cancelled' ? 'İptal' : 'Tamamlandı'}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
