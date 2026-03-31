<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Services\PaytrDirectApiService;
use App\Support\TicketAcquisition;
use App\Support\TurkishPhone;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class PaytrEventCheckoutController extends Controller
{
    public function show(Request $request, string $segment, PaytrDirectApiService $paytr): RedirectResponse|Response
    {
        $user = $request->user();
        if ($user === null) {
            abort(403);
        }

        if ($user->isAdmin()) {
            return redirect()->route('admin.dashboard')
                ->with('error', 'Yönetici hesabıyla kart ödemesi başlatılamaz.');
        }

        if ($user->venues()->exists()) {
            return redirect()->route('artist.dashboard')
                ->with('error', 'Mekân hesabıyla müşteri ödemesi yapılamaz.');
        }

        if (! $paytr->isOperational()) {
            $event = Event::fromPublicUrlSegmentOrFail($segment);

            return redirect()->route('events.show', ['event' => $event->publicUrlSegment()])
                ->with('error', 'Online kart ödemesi şu anda kapalı. Lütfen rezervasyon formunu veya diğer kanalları kullanın.');
        }

        $event = Event::fromPublicUrlSegmentOrFail($segment);
        if ($event->publicUrlSegment() !== $segment && ! ctype_digit($segment)) {
            return redirect()->route('paytr.event-checkout.show', array_merge(
                ['segment' => $event->publicUrlSegment()],
                $request->only(['quantity', 'tier']),
            ));
        }

        if ($event->venue === null || $event->venue->status !== 'approved' || ! $event->venue->is_active) {
            abort(404);
        }

        if ($event->hasFinishedAt() || $event->is_full) {
            return redirect()->route('events.show', ['event' => $event->publicUrlSegment()])
                ->with('error', 'Bu etkinlik için satın alma kapalı veya kontenjan dolu.');
        }

        if (! TicketAcquisition::allowsPaytrCheckout($event) || ! TicketAcquisition::hasPaidTicketing($event)) {
            return redirect()->route('events.show', ['event' => $event->publicUrlSegment()])
                ->with('error', 'Bu etkinlik online kart ile satışa açık değil.');
        }

        if (Schema::hasColumn('events', 'paytr_checkout_enabled') && ! ($event->paytr_checkout_enabled ?? true)) {
            return redirect()->route('events.show', ['event' => $event->publicUrlSegment()])
                ->with('error', 'Bu etkinlik için organizatör online kart satışını kapattı; rezervasyon formu veya diğer kanalları kullanın.');
        }

        $phoneNormalized = TurkishPhone::normalize((string) ($user->phone ?? ''));
        if ($phoneNormalized === null) {
            return redirect()->route('profile.edit')
                ->with(
                    'error',
                    'Kart ile ödeme için hesabınıza geçerli bir Türkiye telefon numarası ekleyin. «Hesabım» → «Etkinlik hatırlatmaları» bölümündeki telefon alanına 05XX XXX XX XX biçiminde yazıp kaydedin (SMS açmanız gerekmez).',
                );
        }

        $quantity = max(1, min(20, (int) $request->query('quantity', 1)));
        $tierIdRequested = $request->filled('tier') ? (int) $request->query('tier') : null;

        $event->loadMissing('ticketTiers');
        $tier = null;
        $unit = 0.0;

        if ($event->ticketTiers->isNotEmpty()) {
            $tier = $tierIdRequested
                ? $event->ticketTiers->firstWhere('id', $tierIdRequested)
                : null;
            if ($tier === null) {
                $tier = $event->ticketTiers->sortBy('sort_order')->first();
            }
            if ($tier === null) {
                return redirect()->route('events.show', ['event' => $event->publicUrlSegment()])
                    ->with('error', 'Bilet kategorisi bulunamadı.');
            }
            $unit = (float) $tier->price;
        } else {
            $unit = (float) ($event->ticket_price ?? 0);
            if ($unit <= 0) {
                return redirect()->route('events.show', ['event' => $event->publicUrlSegment()])
                    ->with('error', 'Bu etkinlik için geçerli bir bilet fiyatı yok.');
            }
        }

        $total = round($unit * $quantity, 2);
        $paymentStr = PaytrDirectApiService::formatPaymentAmountTl($total);

        $ipRaw = $request->ip() ?? '';
        $ipConfigured = config('paytr.probe_user_ip');
        $ip = filter_var(is_string($ipConfigured) && trim($ipConfigured) !== '' ? trim($ipConfigured) : $ipRaw, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4);
        if ($ip === false) {
            return redirect()->route('events.show', ['event' => $event->publicUrlSegment()])
                ->with('error', 'Ödemeyi başlatmak için sunucunun IPv4 adresi gerekir. .env dosyasında PAYTR_PROBE_USER_IP ile dış IPv4 tanımlayabilirsiniz.');
        }

        $merchantOidRaw = 'SBEV'.strtoupper(Str::random(18));
        $merchantOid = substr(preg_replace('/[^A-Za-z0-9]/', '', $merchantOidRaw) ?? $merchantOidRaw, 0, 64);

        $start = $event->start_date ?? now()->timezone('Europe/Istanbul');
        $resDate = $start->copy()->timezone('Europe/Istanbul')->format('Y-m-d');
        $resTime = $start->copy()->timezone('Europe/Istanbul')->format('H:i');

        $basketLabel = $event->title.($tier ? ' — '.$tier->name : '');
        $basketRows = [[$basketLabel, $paymentStr, 1]];

        $ctx = [
            'type' => 'event_ticket',
            'event_id' => $event->id,
            'venue_id' => $event->venue_id,
            'event_ticket_tier_id' => $tier?->id,
            'quantity' => $quantity,
            'user_id' => $user->id,
            'guest_name' => $user->name,
            'guest_phone' => $phoneNormalized,
            'reservation_date' => $resDate,
            'reservation_time' => $resTime,
        ];

        $paytr->createPendingOrder($merchantOid, $user->id, $paymentStr, 'TL', $ctx);

        $hidden = $paytr->buildHostedPaymentHiddenFields(
            $ip,
            $merchantOid,
            (string) $user->email,
            $paymentStr,
            0,
            'TL',
            '0',
            route('paytr.checkout.ok'),
            route('paytr.checkout.fail'),
            $user->name,
            trim((string) ($event->venue->address ?? '')) !== '' ? (string) $event->venue->address : 'Türkiye',
            $phoneNormalized,
            $basketRows,
        );

        if ($hidden === null) {
            return redirect()->route('events.show', ['event' => $event->publicUrlSegment()])
                ->with('error', 'Ödeme oturumu oluşturulamadı. PayTR ayarlarını kontrol edin.');
        }

        return Inertia::render('Paytr/EventCheckout', [
            'paytrPostUrl' => $paytr->getPaymentPostUrl(),
            'hiddenFields' => $hidden,
            'summary' => [
                'eventTitle' => $event->title,
                'venueName' => $event->venue->name,
                'quantity' => $quantity,
                'tierLabel' => $tier?->name,
                'amountFormatted' => $paymentStr.' TL',
            ],
        ]);
    }
}
