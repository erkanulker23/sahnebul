<?php

namespace App\Services;

use App\Mail\SahnebulTemplateMail;
use App\Models\Artist;
use App\Models\ArtistClaimRequest;
use App\Models\ArtistManagerAvailabilityRequest;
use App\Models\ContactMessage;
use App\Models\Event;
use App\Models\EventReview;
use App\Models\PublicEditSuggestion;
use App\Models\Reservation;
use App\Models\Review;
use App\Models\User;
use App\Models\Venue;
use App\Models\VenueClaimRequest;
use App\Support\ArtistEditSuggestionPayload;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

final class SahnebulMail
{
    public static function safeSend(SahnebulTemplateMail $mail, array $toAddresses): bool
    {
        $to = array_values(array_unique(array_filter(
            $toAddresses,
            static fn ($e) => is_string($e) && filter_var($e, FILTER_VALIDATE_EMAIL),
        )));
        if ($to === []) {
            return false;
        }
        try {
            app(AppSettingsService::class)->applySmtpMailConfig();
            Mail::to($to)->send($mail);

            return true;
        } catch (\Throwable $e) {
            Log::warning('SahnebulMail: gönderim başarısız', [
                'to' => $to,
                'subject' => $mail->emailSubject,
                'error' => $e->getMessage(),
            ]);

            return false;
        }
    }

    /**
     * @return list<string>
     */
    public static function adminNotificationEmails(): array
    {
        return User::query()
            ->where('is_active', true)
            ->whereIn('role', ['admin', 'super_admin'])
            ->pluck('email')
            ->filter(static fn ($e) => is_string($e) && filter_var($e, FILTER_VALIDATE_EMAIL))
            ->unique()
            ->values()
            ->all();
    }

    public static function reservationSubmitted(Reservation $reservation): void
    {
        $reservation->loadMissing(['user', 'venue', 'event']);
        $customer = $reservation->user;
        $venue = $reservation->venue;
        $event = $reservation->event;
        $app = rtrim((string) config('app.url'), '/');

        $dateStr = $reservation->reservation_date instanceof Carbon
            ? $reservation->reservation_date->locale('tr')->isoFormat('D MMMM YYYY')
            : (string) $reservation->reservation_date;
        $guestLabel = trim((string) ($reservation->guest_name ?? ''));
        $guestPhone = trim((string) ($reservation->guest_phone ?? ''));
        $detail = [
            'Formdaki ad soyad: <strong>'.e($guestLabel !== '' ? $guestLabel : ($customer?->name ?? '—')).'</strong>',
            'Formdaki telefon: '.e($guestPhone !== '' ? $guestPhone : '—'),
            'Mekân: <strong>'.e($venue->name).'</strong>',
            'Tarih: '.$dateStr.' — Saat: '.e((string) $reservation->reservation_time),
            'Kaç kişi: '.$reservation->guest_count.' — Bilet adedi: '.$reservation->quantity,
            'Durum: <strong>Beklemede</strong>',
        ];
        if ($event) {
            $detail[] = 'Etkinlik: '.e($event->title);
        }
        if (is_string($reservation->notes) && trim($reservation->notes) !== '') {
            $detail[] = 'Mesaj: '.e(Str::limit(trim($reservation->notes), 400));
        }

        if ($customer?->email) {
            self::safeSend(new SahnebulTemplateMail(
                emailSubject: 'Rezervasyon talebiniz alındı — '.config('app.name'),
                title: 'Rezervasyonunuz oluşturuldu',
                introLines: [
                    'Merhaba <strong>'.e($customer->name).'</strong>,',
                    'Rezervasyon talebiniz mekân sahibine ve '.e(config('app.name')).' yönetimine iletildi. Onay veya güncelleme durumunda bu adrese bilgilendirme göndereceğiz.',
                ],
                detailLines: $detail,
                actionUrl: $app.'/rezervasyonlar',
                actionLabel: 'Rezervasyonlarım',
                footnote: 'Sorularınız için mekân iletişim bilgilerini etkinlik veya mekân sayfasından kullanabilirsiniz.',
            ), [$customer->email]);
        }

        $owner = $venue->user;
        if ($owner?->email) {
            self::safeSend(new SahnebulTemplateMail(
                emailSubject: 'Yeni rezervasyon talebi — '.e($venue->name),
                title: 'Yeni rezervasyon talebi',
                introLines: [
                    'Mekânınıza yeni bir rezervasyon talebi düştü.',
                ],
                detailLines: array_merge([
                    'Hesap: '.e($customer?->name ?? '—').' ('.e($customer?->email ?? '—').')',
                ], $detail),
                actionUrl: $app.'/sahne/rezervasyonlar',
                actionLabel: 'Sahne paneli — Rezervasyonlar',
            ), [$owner->email]);
        }

        $admins = self::adminNotificationEmails();
        if ($admins !== []) {
            self::safeSend(new SahnebulTemplateMail(
                emailSubject: 'Yeni Sahnebul rezervasyon talebi — '.e($venue->name),
                title: 'Sahnebul rezervasyon talebi',
                introLines: [
                    'Kullanıcı Sahnebul rezervasyon formu ile talep oluşturdu.',
                ],
                detailLines: array_merge([
                    'Hesap: '.e($customer?->name ?? '—').' ('.e($customer?->email ?? '—').')',
                ], $detail),
                actionUrl: route('admin.reservations.show', $reservation, absolute: true),
                actionLabel: 'Admin panelinde aç',
            ), $admins);
        }
    }

    public static function contactFormSubmittedNotifyAdmins(ContactMessage $message): void
    {
        $admins = self::adminNotificationEmails();
        if ($admins === []) {
            $site = app(AppSettingsService::class)->getSitePublicSettings();
            foreach (['contact_email', 'support_email'] as $key) {
                $e = isset($site[$key]) ? trim((string) $site[$key]) : '';
                if ($e !== '' && filter_var($e, FILTER_VALIDATE_EMAIL)) {
                    $admins[] = $e;
                }
            }
            $fallback = config('sahnebul.super_admin.email');
            if (is_string($fallback) && filter_var($fallback, FILTER_VALIDATE_EMAIL)) {
                $admins[] = $fallback;
            }
            $admins = array_values(array_unique(array_filter($admins)));
        }
        if ($admins === []) {
            return;
        }

        $lines = array_values(array_filter([
            'Gönderen: <strong>'.e($message->name).'</strong>',
            'E-posta: '.e($message->email),
            is_string($message->phone) && trim($message->phone) !== '' ? 'Telefon: '.e(trim($message->phone)) : null,
            is_string($message->subject) && trim($message->subject) !== '' ? 'Konu: '.e(trim($message->subject)) : null,
            'Mesaj: '.e(Str::limit(trim(strip_tags($message->message)), 600)),
        ]));

        self::safeSend(new SahnebulTemplateMail(
            emailSubject: 'İletişim formu — '.config('app.name'),
            title: 'Yeni iletişim formu mesajı',
            introLines: [
                'Siteden iletişim formu ile yeni bir mesaj alındı.',
            ],
            detailLines: $lines,
            actionUrl: route('admin.contact-messages.index', absolute: true),
            actionLabel: 'İletişim mesajları (admin)',
        ), $admins);
    }

    public static function reservationStatusChanged(Reservation $reservation, string $previousStatus): void
    {
        $reservation->loadMissing(['user', 'venue', 'event']);
        $customer = $reservation->user;
        if (! $customer?->email) {
            return;
        }

        $statusTr = match ($reservation->status) {
            'confirmed' => 'onaylandı',
            'cancelled' => 'iptal edildi',
            'completed' => 'tamamlandı',
            default => $reservation->status,
        };

        $venue = $reservation->venue;
        $event = $reservation->event;
        $lines = [
            'Mekân: <strong>'.e($venue->name).'</strong>',
            'Yeni durum: <strong>'.e($statusTr).'</strong>',
        ];
        if ($event) {
            $lines[] = 'Etkinlik: '.e($event->title);
        }

        self::safeSend(new SahnebulTemplateMail(
            emailSubject: 'Rezervasyon güncellendi — '.e($venue->name),
            title: 'Rezervasyon durumunuz güncellendi',
            introLines: [
                'Merhaba <strong>'.e($customer->name).'</strong>,',
                'Rezervasyonunuzun durumu güncellendi (önceki: <em>'.e($previousStatus).'</em>).',
            ],
            detailLines: $lines,
            actionUrl: rtrim((string) config('app.url'), '/').'/rezervasyonlar',
            actionLabel: 'Rezervasyonlarımı aç',
        ), [$customer->email]);
    }

    public static function venueClaimSubmitted(Venue $venue, User $claimant, VenueClaimRequest $claim): void
    {
        $admins = self::adminNotificationEmails();
        if ($admins === []) {
            return;
        }

        self::safeSend(new SahnebulTemplateMail(
            emailSubject: 'Yeni mekân sahiplenme talebi — '.config('app.name'),
            title: 'Mekân sahiplenme talebi',
            introLines: [
                '<strong>'.e($venue->name).'</strong> için yeni bir sahiplenme talebi var.',
            ],
            detailLines: [
                'Talep eden: '.e($claimant->name).' ('.e($claimant->email).')',
                'İletişim (form): '.e($claim->email).' — '.e($claim->phone),
            ],
            actionUrl: route('admin.venue-claims.index', absolute: true),
            actionLabel: 'Talepleri yönet',
        ), $admins);
    }

    public static function artistClaimSubmitted(Artist $artist, User $claimant, ArtistClaimRequest $claim): void
    {
        $admins = self::adminNotificationEmails();
        if ($admins === []) {
            return;
        }

        self::safeSend(new SahnebulTemplateMail(
            emailSubject: 'Yeni sanatçı sahiplenme talebi — '.config('app.name'),
            title: 'Sanatçı profili sahiplenme talebi',
            introLines: [
                '<strong>'.e($artist->name).'</strong> profili için yeni bir sahiplenme talebi var.',
            ],
            detailLines: [
                'Talep eden: '.e($claimant->name).' ('.e($claimant->email).')',
                'İletişim (form): '.e($claim->email).' — '.e($claim->phone),
            ],
            actionUrl: route('admin.artist-claims.index', absolute: true),
            actionLabel: 'Talepleri yönet',
        ), $admins);
    }

    public static function venueClaimResolved(VenueClaimRequest $claim, bool $approved): void
    {
        $claim->loadMissing(['venue', 'user']);
        $email = $claim->email;
        if (! is_string($email) || ! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return;
        }

        $venue = $claim->venue;
        self::safeSend(new SahnebulTemplateMail(
            emailSubject: $approved
                ? 'Mekân sahiplenme talebiniz onaylandı'
                : 'Mekân sahiplenme talebiniz hakkında',
            title: $approved ? 'Talebiniz onaylandı' : 'Talebiniz reddedildi',
            introLines: $approved
                ? [
                    'Merhaba,',
                    '<strong>'.e($venue->name).'</strong> mekânı için sahiplenme talebiniz <strong>onaylandı</strong>. Mekân artık hesabınıza bağlı; Sahne panelinden yönetebilirsiniz.',
                ]
                : [
                    'Merhaba,',
                    '<strong>'.e($venue->name).'</strong> için sahiplenme talebiniz <strong>reddedildi</strong>. Detay için destek ile iletişime geçebilirsiniz.',
                ],
            detailLines: [],
            actionUrl: rtrim((string) config('app.url'), '/').'/sahne',
            actionLabel: 'Sahne paneline git',
        ), [$email]);
    }

    public static function artistClaimResolved(ArtistClaimRequest $claim, bool $approved): void
    {
        $claim->loadMissing(['artist', 'user']);
        $email = $claim->email;
        if (! is_string($email) || ! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return;
        }

        $artist = $claim->artist;
        self::safeSend(new SahnebulTemplateMail(
            emailSubject: $approved
                ? 'Sanatçı profili talebiniz onaylandı'
                : 'Sanatçı profili talebiniz hakkında',
            title: $approved ? 'Talebiniz onaylandı' : 'Talebiniz reddedildi',
            introLines: $approved
                ? [
                    'Merhaba,',
                    '<strong>'.e($artist->name).'</strong> profili için sahiplenme talebiniz <strong>onaylandı</strong>. Profil hesabınıza bağlandı.',
                ]
                : [
                    'Merhaba,',
                    '<strong>'.e($artist->name).'</strong> için sahiplenme talebiniz <strong>reddedildi</strong>.',
                ],
            detailLines: [],
            actionUrl: rtrim((string) config('app.url'), '/').'/sahne',
            actionLabel: 'Sahne paneline git',
        ), [$email]);
    }

    public static function venueDeletedNotifyOwner(?User $owner, string $venueName): void
    {
        if (! $owner?->email) {
            return;
        }

        self::safeSend(new SahnebulTemplateMail(
            emailSubject: 'Mekân kaydınız silindi — '.config('app.name'),
            title: 'Mekân kaydı kaldırıldı',
            introLines: [
                'Merhaba <strong>'.e($owner->name).'</strong>,',
                'Yönetim tarafından <strong>'.e($venueName).'</strong> mekân kaydı sistemden kaldırıldı. Bu mekâna bağlı yayınlar ve içerikler de silinmiş olabilir.',
            ],
            detailLines: [],
            actionUrl: rtrim((string) config('app.url'), '/').'/iletisim',
            actionLabel: 'İletişim',
            footnote: 'Bir hata olduğunu düşünüyorsanız destek ekibimizle iletişime geçin.',
        ), [$owner->email]);
    }

    public static function eventDeletedNotify(string $email, string $recipientName, string $eventTitle, string $venueName, ?string $extraLine = null): bool
    {
        if (! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return false;
        }

        $lines = [
            'Etkinlik: <strong>'.e($eventTitle).'</strong>',
            'Mekân: '.e($venueName),
        ];
        if ($extraLine) {
            $lines[] = $extraLine;
        }

        return self::safeSend(new SahnebulTemplateMail(
            emailSubject: 'Etkinlik iptal / silindi — '.e($eventTitle),
            title: 'Etkinlik artık yayında değil',
            introLines: [
                'Merhaba <strong>'.e($recipientName).'</strong>,',
                'Aşağıdaki etkinlik yönetim tarafından silindi veya yayından kaldırıldı. Rezervasyonunuz varsa mekân ile iletişime geçmenizi öneririz.',
            ],
            detailLines: $lines,
            actionUrl: rtrim((string) config('app.url'), '/').'/etkinlikler',
            actionLabel: 'Etkinliklere göz at',
        ), [$email]);
    }

    /**
     * Rezervasyon yapan kullanıcılar, mekân sahibi ve etkinliğe bağlı sanatçı hesaplarına tekilleştirilmiş bildirim.
     */
    public static function eventDeletedNotifyStakeholders(Event $event): void
    {
        $event->loadMissing(['venue.user', 'reservations.user', 'artists.user']);

        $title = $event->title;
        $venueName = $event->venue?->name ?? '—';

        /** @var array<string, array{email: string, name: string, reservation: bool, venue_owner: bool, artist: bool}> $byEmail */
        $byEmail = [];

        foreach ($event->reservations as $reservation) {
            $u = $reservation->user;
            if (! $u?->email || ! filter_var($u->email, FILTER_VALIDATE_EMAIL)) {
                continue;
            }
            $raw = (string) $u->email;
            $key = strtolower($raw);
            $byEmail[$key] ??= ['email' => $raw, 'name' => $u->name, 'reservation' => false, 'venue_owner' => false, 'artist' => false];
            $byEmail[$key]['reservation'] = true;
        }

        $owner = $event->venue?->user;
        if ($owner?->email && filter_var($owner->email, FILTER_VALIDATE_EMAIL)) {
            $raw = (string) $owner->email;
            $key = strtolower($raw);
            $byEmail[$key] ??= ['email' => $raw, 'name' => $owner->name, 'reservation' => false, 'venue_owner' => false, 'artist' => false];
            $byEmail[$key]['venue_owner'] = true;
        }

        foreach ($event->artists as $artist) {
            $u = $artist->user;
            if (! $u?->email || ! filter_var($u->email, FILTER_VALIDATE_EMAIL)) {
                continue;
            }
            $raw = (string) $u->email;
            $key = strtolower($raw);
            $byEmail[$key] ??= ['email' => $raw, 'name' => $u->name, 'reservation' => false, 'venue_owner' => false, 'artist' => false];
            $byEmail[$key]['artist'] = true;
        }

        foreach ($byEmail as $row) {
            $parts = [];
            if ($row['reservation']) {
                $parts[] = 'Bu etkinlik için rezervasyon kaydınız bulunuyordu.';
            }
            if ($row['venue_owner']) {
                $parts[] = 'Mekânınıza bağlı bu etkinlik yönetim tarafından kaldırıldı.';
            }
            if ($row['artist']) {
                $parts[] = 'Etkinlikte sanatçı olarak yer alıyordunuz.';
            }
            $extra = $parts !== [] ? implode(' ', $parts) : null;
            self::eventDeletedNotify($row['email'], $row['name'], $title, $venueName, $extra);
        }
    }

    public static function eventTomorrowReminder(User $user, Event $event): bool
    {
        if (! $user->email || ! filter_var($user->email, FILTER_VALIDATE_EMAIL)) {
            return false;
        }

        $event->loadMissing('venue');
        $url = route('events.show', ['event' => $event->publicUrlSegment()], absolute: true);
        $startStr = '';
        if ($event->start_date instanceof Carbon) {
            $startStr = $event->start_date->locale('tr')->isoFormat('D MMMM YYYY, HH:mm');
        }

        $detail = [
            'Etkinlik: <strong>'.e($event->title).'</strong>',
            'Mekân: '.e($event->venue?->name ?? '—'),
        ];
        if ($startStr !== '') {
            $detail[] = 'Başlangıç: '.$startStr;
        }

        return self::safeSend(new SahnebulTemplateMail(
            emailSubject: 'Yarın: '.$event->title.' — '.config('app.name').' hatırlatması',
            title: 'Etkinlik yarın',
            introLines: [
                'Merhaba <strong>'.e($user->name).'</strong>,',
                'Takip listesine eklediğiniz etkinlik <strong>yarın</strong> gerçekleşecek; bu mesaj etkinlik gününden bir gün önce gönderilir.',
            ],
            detailLines: $detail,
            actionUrl: $url,
            actionLabel: 'Etkinlik detayı',
        ), [(string) $user->email]);
    }

    public static function eventPublishedForFavoriteArtists(Event $event): void
    {
        $event->loadMissing(['venue', 'artists']);
        if ($event->status !== 'published' || ! $event->venue || $event->venue->status !== 'approved') {
            return;
        }

        $artistIds = $event->artists->pluck('id')->all();
        if ($artistIds === []) {
            return;
        }

        $userIds = DB::table('user_favorite_artists')
            ->whereIn('artist_id', $artistIds)
            ->distinct()
            ->pluck('user_id');

        $names = $event->artists->pluck('name')->implode(', ');
        $url = route('events.show', ['event' => $event->publicUrlSegment()], absolute: true);

        User::query()
            ->whereIn('id', $userIds)
            ->whereNotNull('email')
            ->where('is_active', true)
            ->chunkById(80, function ($users) use ($event, $names, $url): void {
                foreach ($users as $user) {
                    self::safeSend(new SahnebulTemplateMail(
                        emailSubject: 'Favori sanatçınızın etkinliği — '.config('app.name'),
                        title: 'Yeni / güncel etkinlik',
                        introLines: [
                            'Merhaba <strong>'.e($user->name).'</strong>,',
                            'Takip ettiğiniz sanatçı(lar) (<strong>'.e($names).'</strong>) için <strong>'.e($event->title).'</strong> etkinliği yayına alındı.',
                        ],
                        detailLines: [
                            'Mekân: '.e($event->venue->name),
                        ],
                        actionUrl: $url,
                        actionLabel: 'Etkinlik detayı',
                    ), [(string) $user->email]);
                }
            });
    }

    public static function artistAvailabilityRequestToArtist(ArtistManagerAvailabilityRequest $requestRow): void
    {
        $requestRow->loadMissing(['artist.user', 'managerUser', 'availabilityDay']);
        $artist = $requestRow->artist;
        $owner = $artist->user;
        if (! $owner?->email) {
            return;
        }

        $day = $requestRow->availabilityDay;
        $dateStr = $day && $day->date
            ? $day->date->locale('tr')->isoFormat('D MMMM YYYY')
            : (string) $requestRow->requested_date;

        $org = $requestRow->managerUser->organization_display_name
            ?: $requestRow->managerUser->name;

        self::safeSend(new SahnebulTemplateMail(
            emailSubject: 'Organizasyon talebi — '.config('app.name'),
            title: 'Müsait gününüz için talep',
            introLines: [
                'Merhaba <strong>'.e($owner->name).'</strong>,',
                '<strong>'.e($org).'</strong> organizasyonu, seçtiğiniz müsait gün (<strong>'.e($dateStr).'</strong>) için bir talep bıraktı.',
            ],
            detailLines: [
                'Mesaj özeti: '.e(Str::limit(strip_tags($requestRow->message), 400)),
            ],
            actionUrl: rtrim((string) config('app.url'), '/').'/sahne/musaitlik',
            actionLabel: 'Talepleri yanıtla',
        ), [$owner->email]);
    }

    public static function artistAvailabilityResponseToManager(ArtistManagerAvailabilityRequest $requestRow, string $newStatus): void
    {
        $requestRow->loadMissing(['artist', 'managerUser', 'availabilityDay']);
        $mgr = $requestRow->managerUser;
        if (! $mgr?->email) {
            return;
        }

        $accepted = $newStatus === 'accepted';
        $day = $requestRow->availabilityDay;
        $dateStr = $day && $day->date
            ? $day->date->locale('tr')->isoFormat('D MMMM YYYY')
            : (string) $requestRow->requested_date;

        self::safeSend(new SahnebulTemplateMail(
            emailSubject: ($accepted ? 'Talebiniz onaylandı' : 'Talep güncellendi').' — '.e($requestRow->artist->name),
            title: $accepted ? 'Sanatçı talebinizi onayladı' : 'Sanatçı talebinizi yanıtladı',
            introLines: [
                'Merhaba <strong>'.e($mgr->name).'</strong>,',
                '<strong>'.e($requestRow->artist->name).'</strong> için <strong>'.e($dateStr).'</strong> tarihli müsaitlik talebiniz <strong>'.e($accepted ? 'onaylandı' : 'reddedildi').'</strong>.',
            ],
            detailLines: [],
            actionUrl: rtrim((string) config('app.url'), '/').'/sahne/organizasyon/musaitlik/'.$requestRow->artist->slug,
            actionLabel: 'Talepleri görüntüle',
        ), [$mgr->email]);
    }

    public static function newVenueReviewForOwner(User $owner, Review $review, Venue $venue): void
    {
        if (! $owner->email) {
            return;
        }

        self::safeSend(new SahnebulTemplateMail(
            emailSubject: 'Mekânınıza yeni değerlendirme — '.e($venue->name),
            title: 'Yeni müşteri yorumu',
            introLines: [
                'Merhaba <strong>'.e($owner->name).'</strong>,',
                '<strong>'.e($venue->name).'</strong> için <strong>'.$review->rating.'/5</strong> yıldızlı yeni bir değerlendirme yapıldı.',
            ],
            detailLines: $review->comment
                ? [e(Str::limit((string) $review->comment, 500))]
                : [],
            actionUrl: route('venues.show', $venue->slug, absolute: true),
            actionLabel: 'Mekân sayfası',
        ), [$owner->email]);
    }

    public static function newEventReviewForVenueOwner(User $owner, EventReview $review, Event $event, Venue $venue): void
    {
        if (! $owner->email) {
            return;
        }

        $detail = [
            'Mekân: '.e($venue->name),
        ];
        if ($review->comment) {
            $detail[] = e(Str::limit((string) $review->comment, 500));
        }

        self::safeSend(new SahnebulTemplateMail(
            emailSubject: 'Etkinliğinize yeni değerlendirme — '.e($event->title),
            title: 'Etkinlik yorumu',
            introLines: [
                'Merhaba <strong>'.e($owner->name).'</strong>,',
                '<strong>'.e($event->title).'</strong> etkinliği için <strong>'.$review->rating.'/5</strong> yıldızlı yeni bir değerlendirme yapıldı.',
            ],
            detailLines: $detail,
            actionUrl: route('events.show', ['event' => $event->publicUrlSegment()], absolute: true),
            actionLabel: 'Etkinlik sayfası',
        ), [$owner->email]);
    }

    public static function publicEditSuggestionSubmitted(PublicEditSuggestion $row): void
    {
        $row->loadMissing(['suggestable', 'user']);
        $entity = $row->suggestable;
        $isArtist = $entity instanceof Artist;
        $name = $entity?->name ?? '—';
        $kind = $isArtist ? 'Sanatçı' : 'Mekân';

        $admins = self::adminNotificationEmails();
        if ($admins === []) {
            return;
        }

        $textSummary = trim(strip_tags((string) $row->message));
        if ($textSummary === '' && is_array($row->proposed_changes) && $row->proposed_changes !== []) {
            $textSummary = ArtistEditSuggestionPayload::summarizeForMail($row->proposed_changes);
        }
        if ($textSummary === '') {
            $textSummary = '(Kısa özet yok)';
        }

        self::safeSend(new SahnebulTemplateMail(
            emailSubject: 'Düzenleme önerisi: '.$kind.' — '.$name,
            title: 'Kullanıcı düzenleme önerisi',
            introLines: [
                'Bir ziyaretçi aşağıdaki kayıt için bilgi düzeltmesi veya güncelleme önerisi bıraktı (Google Haritalar’daki “düzenleme öner” benzeri).',
            ],
            detailLines: [
                'Kayıt: <strong>'.e($kind).'</strong> — '.e($name),
                'Gönderen: '.e($row->submitterLabel()),
                'Özet: '.e(Str::limit($textSummary, 600)),
            ],
            actionUrl: route('admin.edit-suggestions.index', absolute: true),
            actionLabel: 'Önerileri yönet',
            footnote: 'Tam metin yönetim panelinde listelenir.',
        ), $admins);
    }

    /**
     * Onaylı bir sanatçı katalogdan organizasyon kadrosuna alındığında adminlere bilgi (bekleyen kayıt oluşmaz, e-posta ile izlenebilir).
     */
    public static function organizationArtistRosterAttached(Artist $artist, User $organization): void
    {
        $admins = self::adminNotificationEmails();
        if ($admins === []) {
            return;
        }

        $orgDisplay = trim((string) ($organization->organization_display_name ?? ''));
        $orgLabel = $orgDisplay !== '' ? $orgDisplay : $organization->name;

        self::safeSend(new SahnebulTemplateMail(
            emailSubject: 'Organizasyon kadrosuna sanatçı eklendi — '.e($artist->name),
            title: 'Organizasyon sanatçı kadrosu',
            introLines: [
                'Bir organizasyon firması hesabı, onaylı katalogdan kendi kadrosuna sanatçı ekledi.',
            ],
            detailLines: [
                'Sanatçı: <strong>'.e($artist->name).'</strong> (slug: '.e($artist->slug).')',
                'Organizasyon hesabı: <strong>'.e($orgLabel).'</strong> — '.e($organization->email),
            ],
            actionUrl: route('admin.artists.edit', $artist, absolute: true),
            actionLabel: 'Sanatçı kaydını admin panelinde aç',
            footnote: 'Profilde organizasyon bilgisi bu bağlantıyla güncellenmiş olabilir; gerekirse kaydı kontrol edin.',
        ), $admins);
    }
}
