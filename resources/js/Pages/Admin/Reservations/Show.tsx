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
                <Link href={route('admin.reservations.index')} className="mb-6 inline-block text-amber-400 hover:text-amber-300">← Rezervasyonlara Dön</Link>
                <h1 className="mb-8 text-2xl font-bold text-white">Rezervasyon Detayı #{reservation.id}</h1>

                <div className="grid gap-6 lg:grid-cols-2">
                    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
                        <h2 className="mb-4 font-semibold text-white">Bilgiler</h2>
                        <dl className="space-y-3">
                            <div>
                                <dt className="text-sm text-zinc-500">Müşteri</dt>
                                <dd className="text-white">{reservation.user.name} ({reservation.user.email})</dd>
                            </div>
                            <div>
                                <dt className="text-sm text-zinc-500">Sahne</dt>
                                <dd className="text-white">{reservation.venue.name}</dd>
                            </div>
                            {reservation.event && (
                                <div>
                                    <dt className="text-sm text-zinc-500">Etkinlik</dt>
                                    <dd className="text-white">{reservation.event.title}</dd>
                                </div>
                            )}
                            <div>
                                <dt className="text-sm text-zinc-500">Tarih / Saat</dt>
                                <dd className="text-white">{formatTurkishDateTimeFromParts(reservation.reservation_date, reservation.reservation_time)}</dd>
                            </div>
                            <div>
                                <dt className="text-sm text-zinc-500">Tip</dt>
                                <dd className="text-white">{reservation.reservation_type}</dd>
                            </div>
                            <div>
                                <dt className="text-sm text-zinc-500">Misafir / Adet</dt>
                                <dd className="text-white">{reservation.guest_count} / {reservation.quantity}</dd>
                            </div>
                            <div>
                                <dt className="text-sm text-zinc-500">Tutar</dt>
                                <dd className="text-amber-400 font-medium">₺{Number(reservation.total_amount).toLocaleString('tr-TR')}</dd>
                            </div>
                            {reservation.notes && (
                                <div>
                                    <dt className="text-sm text-zinc-500">Not</dt>
                                    <dd className="text-zinc-400">{reservation.notes}</dd>
                                </div>
                            )}
                        </dl>
                    </div>

                    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
                        <h2 className="mb-4 font-semibold text-white">Durum Güncelle</h2>
                        <p className="mb-4 text-sm text-zinc-500">Mevcut durum: <span className="text-amber-400">{reservation.status}</span></p>
                        <div className="flex flex-wrap gap-2">
                            {['pending', 'confirmed', 'cancelled', 'completed'].map((s) => (
                                <button
                                    key={s}
                                    onClick={() => updateStatus(s)}
                                    disabled={reservation.status === s}
                                    className={`rounded-lg px-4 py-2 text-sm ${
                                        reservation.status === s
                                            ? 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
                                            : 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
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
