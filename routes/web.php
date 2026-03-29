<?php

use App\Http\Controllers\Admin\AdPlacementController as AdminAdPlacementController;
use App\Http\Controllers\Admin\ArtistClaimController as AdminArtistClaimController;
use App\Http\Controllers\Admin\ArtistController as AdminArtistController;
use App\Http\Controllers\Admin\ArtistEventProposalController as AdminArtistEventProposalController;
use App\Http\Controllers\Admin\ArtistGalleryModerationController as AdminArtistGalleryModerationController;
use App\Http\Controllers\Admin\BlogPostController as AdminBlogPostController;
use App\Http\Controllers\Admin\CatalogExcelController as AdminCatalogExcelController;
use App\Http\Controllers\Admin\CategoryController as AdminCategoryController;
use App\Http\Controllers\Admin\CityController as AdminCityController;
use App\Http\Controllers\Admin\ContactMessageController as AdminContactMessageController;
use App\Http\Controllers\Admin\ContentSliderController as AdminContentSliderController;
use App\Http\Controllers\Admin\DashboardController as AdminDashboardController;
use App\Http\Controllers\Admin\EventArtistReportController as AdminEventArtistReportController;
use App\Http\Controllers\Admin\EventController as AdminEventController;
use App\Http\Controllers\Admin\ExternalEventController as AdminExternalEventController;
use App\Http\Controllers\Admin\ManagedSubscriptionController as AdminManagedSubscriptionController;
use App\Http\Controllers\Admin\MusicGenreController as AdminMusicGenreController;
use App\Http\Controllers\Admin\PageSeoController as AdminPageSeoController;
use App\Http\Controllers\Admin\PaytrSettingsController as AdminPaytrSettingsController;
use App\Http\Controllers\Admin\ProfileController as AdminProfileController;
use App\Http\Controllers\Admin\PublicEditSuggestionController as AdminPublicEditSuggestionController;
use App\Http\Controllers\Admin\ReservationController as AdminReservationController;
use App\Http\Controllers\Admin\ReviewController as AdminReviewController;
use App\Http\Controllers\Admin\SeoToolsController as AdminSeoToolsController;
use App\Http\Controllers\Admin\SettingsController as AdminSettingsController;
use App\Http\Controllers\Admin\SmtpSettingsController as AdminSmtpSettingsController;
use App\Http\Controllers\Admin\SubscriptionPlanController as AdminSubscriptionPlanController;
use App\Http\Controllers\Admin\UserController as AdminUserController;
use App\Http\Controllers\Admin\VenueClaimController as AdminVenueClaimController;
use App\Http\Controllers\Admin\VenueController as AdminVenueController;
use App\Http\Controllers\Artist\ArtistAvailabilityController;
use App\Http\Controllers\Artist\DashboardController as ArtistDashboardController;
use App\Http\Controllers\Artist\EventArtistReportController as ArtistEventArtistReportController;
use App\Http\Controllers\Artist\EventController as ArtistEventController;
use App\Http\Controllers\Artist\ManagerArtistAvailabilityController;
use App\Http\Controllers\Artist\OrganizationArtistController;
use App\Http\Controllers\Artist\ProfileController as ArtistProfileController;
use App\Http\Controllers\Artist\PublicArtistProfileController;
use App\Http\Controllers\Artist\ReservationController as ArtistReservationController;
use App\Http\Controllers\Artist\VenueController as ArtistVenueController;
use App\Http\Controllers\ArtistClaimController;
use App\Http\Controllers\ArtistController;
use App\Http\Controllers\BlogController;
use App\Http\Controllers\ContactController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\EventController;
use App\Http\Controllers\EventPublicController;
use App\Http\Controllers\EventReviewController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\PageController;
use App\Http\Controllers\PaytrCallbackController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\PromoGalleryUrlImportStatusController;
use App\Http\Controllers\PublicEditSuggestionController;
use App\Http\Controllers\ReservationController;
use App\Http\Controllers\ReverseGeocodeController;
use App\Http\Controllers\ReviewController;
use App\Http\Controllers\SearchController;
use App\Http\Controllers\SehirSecCityController;
use App\Http\Controllers\SehirSecController;
use App\Http\Controllers\SitemapController;
use App\Http\Controllers\SubscriptionController;
use App\Http\Controllers\User\BrowserNotificationController;
use App\Http\Controllers\User\EventIcsController;
use App\Http\Controllers\User\EventReminderController;
use App\Http\Controllers\User\EventReminderPreferenceController;
use App\Http\Controllers\User\FavoriteArtistController;
use App\Http\Controllers\VenueClaimController;
use App\Http\Controllers\VenueController;
use App\Models\ExternalEvent;
use App\Models\Venue;
use Illuminate\Support\Facades\Route;

Route::get('/sitemap.xml', [SitemapController::class, 'index'])->name('sitemap');

Route::get('/robots.txt', function () {
    $base = rtrim((string) config('app.url'), '/');
    $body = "User-agent: *\nDisallow:\n\nSitemap: {$base}/sitemap.xml\n";

    return response($body, 200)->header('Content-Type', 'text/plain; charset=UTF-8');
})->name('robots');

Route::middleware(['throttle:search-quick', 'json.same-site'])->group(function () {
    Route::get('/search/quick', [SearchController::class, 'quick'])->name('search.quick');
    Route::get('/search/trending', [SearchController::class, 'trending'])->name('search.trending');
});

Route::middleware(['throttle:reverse-geocode', 'json.same-site'])->group(function () {
    Route::get('/api/reverse-geocode', [ReverseGeocodeController::class, 'show'])->name('api.reverse-geocode');
});

Route::get('/', [VenueController::class, 'index'])->name('home');
Route::get('/mekanlar', [VenueController::class, 'index'])->name('venues.index');
Route::middleware(['throttle:venues-nearby', 'json.same-site'])->group(function () {
    Route::get('/mekanlar/yakinindakiler', [VenueController::class, 'nearby'])->name('venues.nearby');
});
Route::get('/mekanlar/{venue:slug}', [VenueController::class, 'show'])->name('venues.show');
Route::post('/mekanlar/{venue:slug}/duzenme-oneri', [PublicEditSuggestionController::class, 'storeVenue'])
    ->middleware('throttle:10,1')
    ->name('venues.edit-suggestion.store');
Route::redirect('/sahneler', '/mekanlar', 301);
Route::get('/sahneler/{venue:slug}', function (Venue $venue) {
    return redirect()->route('venues.show', $venue->slug, 301);
});
Route::get('/etkinlikler', [EventController::class, 'index'])->name('events.index');
Route::middleware(['throttle:events-nearby', 'json.same-site'])->group(function () {
    Route::get('/etkinlikler/yakinindakiler', [EventController::class, 'nearby'])->name('events.nearby');
});
Route::get('/etkinlikler/{event}', [EventPublicController::class, 'show'])
    ->where('event', '^([0-9]+|[a-z0-9-]+-\\d+|dis\\d+)$')
    ->name('events.show');
Route::get('/sanatcilar', [ArtistController::class, 'index'])->name('artists.index');
Route::get('/sanatcilar/{artist:slug}', [ArtistController::class, 'show'])->name('artists.show');
Route::post('/sanatcilar/{artist:slug}/duzenme-oneri', [PublicEditSuggestionController::class, 'storeArtist'])
    ->middleware('throttle:10,1')
    ->name('artists.edit-suggestion.store');
Route::get('/blog', [BlogController::class, 'index'])->name('blog.index');
Route::get('/blog/{post:slug}', [BlogController::class, 'show'])->name('blog.show');
Route::get('/iletisim', [ContactController::class, 'create'])->name('contact');
Route::post('/iletisim', [ContactController::class, 'store'])
    ->middleware('throttle:8,1')
    ->name('contact.store');

Route::post('/odeme/paytr/bildirim', PaytrCallbackController::class)->name('paytr.callback');

require __DIR__.'/auth.php';

Route::get('/sayfalar/{slug}', [PageController::class, 'show'])->name('pages.show');
Route::get('/sehir-sec', SehirSecController::class)->name('sehir-sec');
Route::get('/sehir-sec/etkinlik/{externalEvent}', function (ExternalEvent $externalEvent) {
    abort_unless($externalEvent->source === 'bubilet_sehir_sec', 404);

    return redirect()->route('events.show', ['event' => 'dis'.$externalEvent->id], 301);
})->name('sehir-sec.event');
Route::get('/sehir-sec/{city}', SehirSecCityController::class)
    ->where('city', 'istanbul|ankara|izmir|antalya|bursa|eskisehir')
    ->name('sehir-sec.city');

Route::get('/dashboard', DashboardController::class)->middleware(['auth'])->name('dashboard');

Route::middleware('auth')->group(function () {
    Route::get('/promo-url-import-durum/{token}', [PromoGalleryUrlImportStatusController::class, 'show'])
        ->middleware('throttle:120,1')
        ->whereUuid('token')
        ->name('promo-import.status');

    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    Route::get('/rezervasyonlarim', [ReservationController::class, 'index'])->name('reservations.index');
    Route::get('/mekanlar/{venue:slug}/rezervasyon', [ReservationController::class, 'create'])->name('reservations.create');
    Route::get('/sahneler/{venue:slug}/rezervasyon', function (Venue $venue) {
        return redirect()->route('reservations.create', $venue->slug, 301);
    });
    Route::post('/rezervasyon', [ReservationController::class, 'store'])->name('reservations.store');

    Route::post('/mekanlar/{venue:slug}/yorum', [ReviewController::class, 'store'])->name('reviews.store');
    Route::post('/sahneler/{venue:slug}/yorum', [ReviewController::class, 'store']);
    Route::post('/etkinlikler/{event}/yorum', [EventReviewController::class, 'store'])
        ->whereNumber('event')
        ->name('event-reviews.store');
    Route::post('/yorumlar/{review}/begeni', [ReviewController::class, 'like'])->name('reviews.like');

    Route::get('/bildirimler', [NotificationController::class, 'index'])->name('notifications.index');
    Route::get('/uyelik/paketler', [SubscriptionController::class, 'index'])->name('subscriptions.index');
    Route::post('/uyelik/paketler', [SubscriptionController::class, 'store'])->name('subscriptions.store');
    Route::post('/mekanlar/{venue}/sahiplen', [VenueClaimController::class, 'store'])->name('venues.claim');
    Route::post('/sahneler/{venue}/sahiplen', [VenueClaimController::class, 'store']);
    Route::post('/sanatcilar/{artist}/sahiplen', [ArtistClaimController::class, 'store'])->name('artists.claim');

    Route::post('/hesabim/favori-sanatci/{artist}', [FavoriteArtistController::class, 'toggle'])
        ->whereNumber('artist')
        ->name('user.favorites.artists.toggle');
    Route::post('/hesabim/etkinlik-hatirlat/{event}', [EventReminderController::class, 'toggle'])
        ->whereNumber('event')
        ->name('user.event-reminders.toggle');
    Route::patch('/hesabim/etkinlik-hatirlat-tercihleri', [EventReminderPreferenceController::class, 'update'])
        ->name('user.event-reminders.preferences');
    Route::get('/hesabim/etkinlikler/{event}/takvim.ics', [EventIcsController::class, 'show'])
        ->whereNumber('event')
        ->name('user.events.ics');

    Route::middleware(['throttle:notifications-summary', 'json.same-site'])->group(function () {
        Route::get('/api/bildirim-ozeti', [BrowserNotificationController::class, 'summary'])->name('api.notifications.summary');
    });
    Route::patch('/hesabim/tarayici-bildirimleri', [BrowserNotificationController::class, 'update'])->name('user.browser-notifications');
});

Route::middleware(['auth', 'artist'])->prefix('sahne')->name('artist.')->group(function () {
    Route::redirect('sahnelerim', '/sahne/mekanlarim', 301);
    Route::redirect('sahnelerim/ekle', '/sahne/mekanlarim/ekle', 301);
    Route::get('sahnelerim/{venue}/duzenle', function (Venue $venue) {
        return redirect()->route('artist.venues.edit', $venue, 301);
    });
    Route::post('sahnelerim', [ArtistVenueController::class, 'store']);
    Route::put('sahnelerim/{venue}', [ArtistVenueController::class, 'update']);
    Route::post('sahnelerim/{venue}/galeri', [ArtistVenueController::class, 'storeMedia']);
    Route::delete('sahnelerim/{venue}/galeri/{media}', [ArtistVenueController::class, 'destroyMedia']);

    Route::get('/', [ArtistDashboardController::class, 'index'])->name('dashboard');
    Route::get('/profil', [ArtistProfileController::class, 'edit'])->name('profile');
    Route::get('/sanatci-sayfam', [PublicArtistProfileController::class, 'edit'])->name('public-profile');
    Route::put('/sanatci-sayfam', [PublicArtistProfileController::class, 'update'])->name('public-profile.update');
    Route::post('/sanatci-sayfam/galeri', [PublicArtistProfileController::class, 'storeGallery'])
        ->name('public-profile.gallery.store');
    Route::post('/sanatci-sayfam/galeri-instagram', [PublicArtistProfileController::class, 'storeGalleryInstagramEmbed'])
        ->name('public-profile.gallery.instagram.store');
    Route::delete('/sanatci-sayfam/galeri/{media}', [PublicArtistProfileController::class, 'destroyGallery'])
        ->name('public-profile.gallery.destroy');
    Route::post('/sanatci-sayfam/adresten-tanitim-medya', [PublicArtistProfileController::class, 'importPromoMediaFromUrl'])
        ->middleware('throttle:20,1')
        ->name('public-profile.promo.import-media');
    Route::post('/sanatci-sayfam/tanitim-dosya-yukle', [PublicArtistProfileController::class, 'appendPromoFiles'])
        ->middleware('throttle:15,1')
        ->name('public-profile.promo.append-files');
    Route::post('/sanatci-sayfam/tanitim-medya-temizle', [PublicArtistProfileController::class, 'clearPromoMedia'])
        ->name('public-profile.promo.clear-media');
    Route::post('/sanatci-sayfam/tanitim-galeri-oge-sil', [PublicArtistProfileController::class, 'removePromoGalleryItem'])
        ->middleware('throttle:30,1')
        ->name('public-profile.promo.remove-item');
    Route::get('/mekanlarim', [ArtistVenueController::class, 'index'])->name('venues.index');
    Route::get('/mekanlarim/ekle', [ArtistVenueController::class, 'create'])->name('venues.create');
    Route::post('/mekanlarim', [ArtistVenueController::class, 'store'])->name('venues.store');
    Route::get('/mekanlarim/{venue}/duzenle', [ArtistVenueController::class, 'edit'])->name('venues.edit');
    Route::put('/mekanlarim/{venue}', [ArtistVenueController::class, 'update'])->name('venues.update');
    Route::post('/mekanlarim/{venue}/google-galeri-url', [ArtistVenueController::class, 'importRemoteGoogleGallery'])->name('venues.google-gallery-import');
    Route::post('/mekanlarim/{venue}/galeri', [ArtistVenueController::class, 'storeMedia'])->name('venues.media.store');
    Route::delete('/mekanlarim/{venue}/galeri/{media}', [ArtistVenueController::class, 'destroyMedia'])->name('venues.media.destroy');
    Route::post('/mekanlarim/{venue}/adresten-tanitim-medya', [ArtistVenueController::class, 'importPromoMediaFromUrl'])
        ->middleware('throttle:20,1')
        ->name('venues.import-promo-media');
    Route::post('/mekanlarim/{venue}/tanitim-dosya-yukle', [ArtistVenueController::class, 'appendPromoFiles'])
        ->middleware('throttle:15,1')
        ->name('venues.append-promo-files');
    Route::post('/mekanlarim/{venue}/tanitim-medya-temizle', [ArtistVenueController::class, 'clearPromoMedia'])
        ->name('venues.clear-promo-media');
    Route::post('/mekanlarim/{venue}/tanitim-galeri-oge-sil', [ArtistVenueController::class, 'removePromoGalleryItem'])
        ->middleware('throttle:30,1')
        ->name('venues.remove-promo-item');
    Route::get('/etkinlikler', [ArtistEventController::class, 'index'])->name('events.index');
    Route::get('/etkinlikler/ekle', [ArtistEventController::class, 'create'])->name('events.create');
    Route::post('/etkinlikler', [ArtistEventController::class, 'store'])->name('events.store');
    Route::post('/etkinlikler/yeni-mekan-onerisi', [ArtistEventController::class, 'proposeWithNewVenue'])
        ->middleware('throttle:8,1')
        ->name('events.propose');
    Route::get('/etkinlikler/{event}/duzenle', [ArtistEventController::class, 'edit'])->name('events.edit');
    Route::put('/etkinlikler/{event}', [ArtistEventController::class, 'update'])->name('events.update');
    Route::post('/etkinlikler/{event}/rapor', [ArtistEventArtistReportController::class, 'store'])
        ->middleware('throttle:12,1')
        ->name('events.report');
    Route::get('/rezervasyonlar', [ArtistReservationController::class, 'index'])->name('reservations.index');
    Route::patch('/rezervasyonlar/{reservation}/durum', [ArtistReservationController::class, 'updateStatus'])->name('reservations.updateStatus');

    Route::get('/musaitlik', [ArtistAvailabilityController::class, 'index'])->name('availability.index');
    Route::post('/musaitlik/gun', [ArtistAvailabilityController::class, 'storeDay'])->name('availability.days.store');
    Route::post('/musaitlik/gunler-araligi', [ArtistAvailabilityController::class, 'storeDaysRange'])->name('availability.days.range');
    Route::delete('/musaitlik/gun/{day}', [ArtistAvailabilityController::class, 'destroyDay'])->name('availability.days.destroy');
    Route::patch('/musaitlik/gorunurluk', [ArtistAvailabilityController::class, 'updateVisibility'])->name('availability.visibility');
    Route::patch('/musaitlik/istekler/{availabilityRequest}', [ArtistAvailabilityController::class, 'updateIncomingRequest'])
        ->name('availability.incoming-requests.update');

    Route::get('/organizasyon/sanatcilar', [OrganizationArtistController::class, 'index'])->name('organization.artists.index');
    Route::post('/organizasyon/sanatcilar', [OrganizationArtistController::class, 'store'])
        ->middleware('throttle:20,1')
        ->name('organization.artists.store');
    Route::post('/organizasyon/sanatcilar/{artist:slug}/kat', [OrganizationArtistController::class, 'attach'])
        ->middleware('throttle:40,1')
        ->name('organization.artists.attach');
    Route::post('/organizasyon/sanatcilar/{artist:slug}/birak', [OrganizationArtistController::class, 'detach'])
        ->middleware('throttle:40,1')
        ->name('organization.artists.detach');
    Route::post('/organizasyon/sanatcilar/{artist:slug}/duzenme-oneri', [OrganizationArtistController::class, 'proposeUpdate'])
        ->middleware('throttle:20,1')
        ->name('organization.artists.propose-update');

    Route::get('/organizasyon/musaitlik', [ManagerArtistAvailabilityController::class, 'index'])->name('manager-availability.index');
    Route::get('/organizasyon/musaitlik/{artist:slug}', [ManagerArtistAvailabilityController::class, 'show'])->name('manager-availability.show');
    Route::post('/organizasyon/musaitlik/{artist:slug}/istek', [ManagerArtistAvailabilityController::class, 'storeRequest'])
        ->middleware('throttle:30,1')
        ->name('manager-availability.requests.store');
});

Route::middleware(['auth', 'admin'])->prefix('admin')->name('admin.')->group(function () {
    Route::get('/', [AdminDashboardController::class, 'index'])->name('dashboard');
    Route::get('/profil', [AdminProfileController::class, 'edit'])->name('profile');

    Route::get('/kullanicilar', [AdminUserController::class, 'index'])->name('users.index');
    Route::post('/kullanicilar', [AdminUserController::class, 'store'])->name('users.store');
    Route::get('/kullanicilar/{user}/duzenle', [AdminUserController::class, 'edit'])->name('users.edit');
    Route::put('/kullanicilar/{user}', [AdminUserController::class, 'update'])->name('users.update');
    Route::post('/kullanicilar/{user}/sifre-sifirlama', [AdminUserController::class, 'sendPasswordReset'])
        ->middleware('throttle:12,1')
        ->name('users.sendPasswordReset');
    Route::post('/kullanicilar/{user}/aktif', [AdminUserController::class, 'toggleActive'])->name('users.toggleActive');
    Route::delete('/kullanicilar/{user}', [AdminUserController::class, 'destroy'])->name('users.destroy');

    Route::get('/mekanlar', [AdminVenueController::class, 'index'])->name('venues.index');
    Route::get('/mekanlar/excel', [AdminCatalogExcelController::class, 'exportVenues'])->name('venues.excel-export');
    Route::post('/mekanlar/excel-ice-aktar', [AdminCatalogExcelController::class, 'importVenues'])->name('venues.excel-import');
    Route::get('/mekanlar/ekle', [AdminVenueController::class, 'create'])->name('venues.create');
    Route::permanentRedirect('sahneler', 'mekanlar');
    Route::post('/mekanlar/etkinlik-secici', [AdminVenueController::class, 'storeForEventPicker'])->name('venues.store-for-event');
    Route::post('/mekanlar', [AdminVenueController::class, 'store'])->name('venues.store');
    Route::post('/mekanlar/toplu-sil', [AdminVenueController::class, 'bulkDestroy'])->name('venues.bulk-destroy');
    Route::post('/mekanlar/birlestir', [AdminVenueController::class, 'merge'])->name('venues.merge');
    Route::get('/mekanlar/{venue}/duzenle', [AdminVenueController::class, 'edit'])->name('venues.edit');
    Route::post('/mekanlar/{venue}/kapak-url', [AdminVenueController::class, 'importRemoteCover'])->name('venues.cover-import');
    Route::post('/mekanlar/{venue}/google-galeri-url', [AdminVenueController::class, 'importRemoteGoogleGallery'])->name('venues.google-gallery-import');
    Route::post('/mekanlar/{venue}/galeri', [AdminVenueController::class, 'storeMedia'])->name('venues.media.store');
    Route::delete('/mekanlar/{venue}/galeri/{media}', [AdminVenueController::class, 'destroyMedia'])->name('venues.media.destroy');
    Route::put('/mekanlar/{venue}', [AdminVenueController::class, 'update'])->name('venues.update');
    Route::post('/mekanlar/{venue}/adresten-tanitim-medya', [AdminVenueController::class, 'importPromoMediaFromUrl'])
        ->middleware('throttle:20,1')
        ->name('venues.import-promo-media');
    Route::post('/mekanlar/{venue}/tanitim-dosya-yukle', [AdminVenueController::class, 'appendPromoFiles'])
        ->middleware('throttle:15,1')
        ->name('venues.append-promo-files');
    Route::post('/mekanlar/{venue}/tanitim-medya-temizle', [AdminVenueController::class, 'clearPromoMedia'])
        ->name('venues.clear-promo-media');
    Route::post('/mekanlar/{venue}/tanitim-galeri-oge-sil', [AdminVenueController::class, 'removePromoGalleryItem'])
        ->middleware('throttle:30,1')
        ->name('venues.remove-promo-item');
    Route::post('/mekanlar/{venue}/uyelik-paketi', [AdminManagedSubscriptionController::class, 'updateForVenue'])->name('venues.subscription.update');
    Route::post('/mekanlar/{venue}/onayla', [AdminVenueController::class, 'approve'])->name('venues.approve');
    Route::post('/mekanlar/{venue}/reddet', [AdminVenueController::class, 'reject'])->name('venues.reject');
    Route::delete('/mekanlar/{venue}', [AdminVenueController::class, 'destroy'])->name('venues.destroy');

    Route::get('/etkinlikler', [AdminEventController::class, 'index'])->name('events.index');
    Route::get('/etkinlikler/excel', [AdminCatalogExcelController::class, 'exportEvents'])->name('events.excel-export');
    Route::post('/etkinlikler/excel-ice-aktar', [AdminCatalogExcelController::class, 'importEvents'])->name('events.excel-import');
    Route::get('/etkinlikler/ekle', [AdminEventController::class, 'create'])->name('events.create');
    Route::post('/etkinlikler', [AdminEventController::class, 'store'])->name('events.store');
    Route::post('/etkinlikler/toplu-sil', [AdminEventController::class, 'bulkDestroy'])->name('events.bulk-destroy');
    Route::post('/etkinlikler/toplu-yayinla', [AdminEventController::class, 'bulkPublish'])->name('events.bulk-publish');
    Route::get('/etkinlikler/{event}/duzenle', [AdminEventController::class, 'edit'])->name('events.edit');
    Route::put('/etkinlikler/{event}', [AdminEventController::class, 'update'])->name('events.update');
    Route::post('/etkinlikler/{event}/adresten-medya', [AdminEventController::class, 'importMediaFromUrl'])
        ->middleware('throttle:20,1')
        ->name('events.import-media');
    Route::post('/etkinlikler/{event}/tanitim-dosya-yukle', [AdminEventController::class, 'appendPromoFiles'])
        ->middleware('throttle:15,1')
        ->name('events.append-promo-files');
    Route::post('/etkinlikler/{event}/tanitim-medya-temizle', [AdminEventController::class, 'clearPromoMedia'])
        ->name('events.clear-promo-media');
    Route::post('/etkinlikler/{event}/tanitim-galeri-oge-sil', [AdminEventController::class, 'removePromoGalleryItem'])
        ->middleware('throttle:30,1')
        ->name('events.remove-promo-item');
    Route::post('/etkinlikler/{event}/onayla', [AdminEventController::class, 'approve'])->name('events.approve');
    Route::post('/etkinlikler/{event}/mekan-profil-tanitim-onayla', [AdminEventController::class, 'approvePromoVenueProfile'])
        ->name('events.approve-promo-venue-profile');
    Route::delete('/etkinlikler/{event}', [AdminEventController::class, 'destroy'])->name('events.destroy');
    Route::get('/dis-kaynak-etkinlikler', [AdminExternalEventController::class, 'index'])->name('external-events.index');
    Route::post('/dis-kaynak-etkinlikler/veri-cek', [AdminExternalEventController::class, 'crawl'])
        ->middleware('throttle:6,1')
        ->name('external-events.crawl');
    Route::post('/dis-kaynak-etkinlikler/onizle', [AdminExternalEventController::class, 'crawlPreview'])
        ->middleware('throttle:10,1')
        ->name('external-events.crawl-preview');
    Route::post('/dis-kaynak-etkinlikler/toplu-islem', [AdminExternalEventController::class, 'bulk'])->name('external-events.bulk');
    Route::post('/dis-kaynak-etkinlikler/{externalEvent}/aktar', [AdminExternalEventController::class, 'sync'])->name('external-events.sync');
    Route::post('/dis-kaynak-etkinlikler/{externalEvent}/reddet', [AdminExternalEventController::class, 'reject'])->name('external-events.reject');

    Route::get('/sanatcilar', [AdminArtistController::class, 'index'])->name('artists.index');
    Route::get('/sanatcilar/kullanici-adi-kontrol', [AdminArtistController::class, 'checkUsernameAvailability'])
        ->middleware('throttle:60,1')
        ->name('artists.username-check');
    Route::get('/sanatcilar/kullanici-adi-oner', [AdminArtistController::class, 'suggestUsername'])
        ->middleware('throttle:30,1')
        ->name('artists.username-suggest');
    Route::get('/sanatcilar/excel', [AdminCatalogExcelController::class, 'exportArtists'])->name('artists.excel-export');
    Route::post('/sanatcilar/excel-ice-aktar', [AdminCatalogExcelController::class, 'importArtists'])->name('artists.excel-import');
    Route::get('/sanatcilar/ekle', [AdminArtistController::class, 'create'])->name('artists.create');
    Route::post('/sanatcilar', [AdminArtistController::class, 'store'])->name('artists.store');
    Route::post('/sanatcilar/toplu-sil', [AdminArtistController::class, 'bulkDestroy'])->name('artists.bulk-destroy');
    Route::get('/sanatcilar/{artist:id}/duzenle', [AdminArtistController::class, 'edit'])->name('artists.edit');
    Route::post('/sanatcilar/{artist:id}/galeri', [AdminArtistController::class, 'storeMedia'])->name('artists.media.store');
    Route::delete('/sanatcilar/{artist:id}/galeri/{media}', [AdminArtistController::class, 'destroyMedia'])->name('artists.media.destroy');
    Route::put('/sanatcilar/{artist:id}', [AdminArtistController::class, 'update'])->name('artists.update');
    Route::post('/sanatcilar/{artist:id}/adresten-tanitim-medya', [AdminArtistController::class, 'importPromoMediaFromUrl'])
        ->middleware('throttle:20,1')
        ->name('artists.import-promo-media');
    Route::post('/sanatcilar/{artist:id}/tanitim-dosya-yukle', [AdminArtistController::class, 'appendPromoFiles'])
        ->middleware('throttle:15,1')
        ->name('artists.append-promo-files');
    Route::post('/sanatcilar/{artist:id}/tanitim-medya-temizle', [AdminArtistController::class, 'clearPromoMedia'])
        ->name('artists.clear-promo-media');
    Route::post('/sanatcilar/{artist:id}/tanitim-galeri-oge-sil', [AdminArtistController::class, 'removePromoGalleryItem'])
        ->middleware('throttle:30,1')
        ->name('artists.remove-promo-item');
    Route::post('/sanatcilar/{artist:id}/uyelik-paketi', [AdminManagedSubscriptionController::class, 'updateForArtist'])->name('artists.subscription.update');
    Route::post('/sanatcilar/{artist:id}/onayla', [AdminArtistController::class, 'approve'])->name('artists.approve');
    Route::post('/sanatcilar/{artist:id}/reddet', [AdminArtistController::class, 'reject'])->name('artists.reject');
    Route::delete('/sanatcilar/{artist:id}', [AdminArtistController::class, 'destroy'])->name('artists.destroy');

    Route::get('/rezervasyonlar', [AdminReservationController::class, 'index'])->name('reservations.index');
    Route::get('/rezervasyonlar/{reservation}', [AdminReservationController::class, 'show'])->name('reservations.show');
    Route::patch('/rezervasyonlar/{reservation}/durum', [AdminReservationController::class, 'updateStatus'])->name('reservations.updateStatus');

    Route::get('/slider', [AdminContentSliderController::class, 'index'])->name('content-sliders.index');
    Route::get('/slider/ekle', [AdminContentSliderController::class, 'create'])->name('content-sliders.create');
    Route::post('/slider', [AdminContentSliderController::class, 'store'])->name('content-sliders.store');
    Route::get('/slider/{content_slider}/duzenle', [AdminContentSliderController::class, 'edit'])->name('content-sliders.edit');
    Route::post('/slider/{content_slider}/guncelle', [AdminContentSliderController::class, 'update'])->name('content-sliders.update');
    Route::delete('/slider/{content_slider}', [AdminContentSliderController::class, 'destroy'])->name('content-sliders.destroy');

    Route::get('/iletisim-mesajlari', [AdminContactMessageController::class, 'index'])->name('contact-messages.index');
    Route::get('/iletisim-mesajlari/{contactMessage}', [AdminContactMessageController::class, 'show'])->name('contact-messages.show');
    Route::get('/iletisim-mesajlari/{contactMessage}/duzenle', [AdminContactMessageController::class, 'edit'])->name('contact-messages.edit');
    Route::put('/iletisim-mesajlari/{contactMessage}', [AdminContactMessageController::class, 'update'])->name('contact-messages.update');
    Route::delete('/iletisim-mesajlari/{contactMessage}', [AdminContactMessageController::class, 'destroy'])->name('contact-messages.destroy');
    Route::post('/iletisim-mesajlari/{contactMessage}/spam', [AdminContactMessageController::class, 'toggleSpam'])->name('contact-messages.toggle-spam');

    Route::get('/yorumlar', [AdminReviewController::class, 'index'])->name('reviews.index');
    Route::get('/duzenme-onerileri', [AdminPublicEditSuggestionController::class, 'index'])->name('edit-suggestions.index');
    Route::post('/duzenme-onerileri/{suggestion}/incelendi', [AdminPublicEditSuggestionController::class, 'markReviewed'])->name('edit-suggestions.mark-reviewed');
    Route::post('/yorumlar/{review}/onayla', [AdminReviewController::class, 'approve'])->name('reviews.approve');
    Route::delete('/yorumlar/{review}', [AdminReviewController::class, 'destroy'])->name('reviews.destroy');

    Route::get('/sanatci-etkinlik-raporlari', [AdminEventArtistReportController::class, 'index'])->name('event-artist-reports.index');
    Route::patch('/sanatci-etkinlik-raporlari/{report}', [AdminEventArtistReportController::class, 'update'])->name('event-artist-reports.update');

    Route::get('/sanatci-etkinlik-onerileri', [AdminArtistEventProposalController::class, 'index'])->name('artist-event-proposals.index');
    Route::get('/sanatci-etkinlik-onerileri/{proposal}', [AdminArtistEventProposalController::class, 'show'])->name('artist-event-proposals.show');
    Route::post('/sanatci-etkinlik-onerileri/{proposal}/onayla', [AdminArtistEventProposalController::class, 'approve'])->name('artist-event-proposals.approve');
    Route::post('/sanatci-etkinlik-onerileri/{proposal}/reddet', [AdminArtistEventProposalController::class, 'reject'])->name('artist-event-proposals.reject');

    Route::get('/sanatci-galeri-onaylari', [AdminArtistGalleryModerationController::class, 'index'])->name('artist-gallery-moderation.index');
    Route::post('/sanatci-galeri-onaylari/{media}/onayla', [AdminArtistGalleryModerationController::class, 'approve'])->name('artist-gallery-moderation.approve');
    Route::post('/sanatci-galeri-onaylari/{media}/reddet', [AdminArtistGalleryModerationController::class, 'reject'])->name('artist-gallery-moderation.reject');

    Route::get('/kategoriler', [AdminCategoryController::class, 'index'])->name('categories.index');
    Route::get('/kategoriler/excel', [AdminCatalogExcelController::class, 'exportCategories'])->name('categories.excel-export');
    Route::post('/kategoriler/excel-ice-aktar', [AdminCatalogExcelController::class, 'importCategories'])->name('categories.excel-import');
    Route::post('/kategoriler', [AdminCategoryController::class, 'store'])->name('categories.store');
    Route::put('/kategoriler/{category}', [AdminCategoryController::class, 'update'])->name('categories.update');
    Route::delete('/kategoriler/{category}', [AdminCategoryController::class, 'destroy'])->name('categories.destroy');

    Route::permanentRedirect('sanatci-turleri', 'muzik-turleri');

    Route::get('/muzik-turleri', [AdminMusicGenreController::class, 'index'])->name('music-genres.index');
    Route::get('/muzik-turleri/excel', [AdminCatalogExcelController::class, 'exportMusicGenres'])->name('music-genres.excel-export');
    Route::post('/muzik-turleri/excel-ice-aktar', [AdminCatalogExcelController::class, 'importMusicGenres'])->name('music-genres.excel-import');
    Route::post('/muzik-turleri', [AdminMusicGenreController::class, 'store'])->name('music-genres.store');
    Route::put('/muzik-turleri/{musicGenre}', [AdminMusicGenreController::class, 'update'])->name('music-genres.update');
    Route::delete('/muzik-turleri/{musicGenre}', [AdminMusicGenreController::class, 'destroy'])->name('music-genres.destroy');

    Route::get('/sehirler', [AdminCityController::class, 'index'])->name('cities.index');
    Route::post('/sehirler/senkronize', [AdminCityController::class, 'syncFromApi'])->name('cities.sync');

    Route::get('/reklam-alanlari', [AdminAdPlacementController::class, 'index'])->name('ad-slots.index');
    Route::post('/reklam-alanlari', [AdminAdPlacementController::class, 'update'])->name('ad-slots.update');

    Route::middleware('super_admin')->group(function () {
        Route::get('/smtp', [AdminSmtpSettingsController::class, 'index'])->name('smtp.index');
        Route::post('/smtp', [AdminSmtpSettingsController::class, 'update'])->name('smtp.update');
        Route::post('/smtp/test-mail', [AdminSmtpSettingsController::class, 'sendTestMail'])->name('smtp.test-mail');

        Route::post('/ayarlar/site', [AdminSettingsController::class, 'updateSite'])->name('settings.site');

        Route::get('/seo-sayfalar', [AdminPageSeoController::class, 'index'])->name('page-seo.index');
        Route::post('/seo-sayfalar', [AdminPageSeoController::class, 'update'])->name('page-seo.update');

        Route::get('/paytr', [AdminPaytrSettingsController::class, 'index'])->name('paytr.index');
        Route::post('/paytr', [AdminPaytrSettingsController::class, 'update'])->name('paytr.update');
        Route::post('/paytr/dogrula', [AdminPaytrSettingsController::class, 'validateLocal'])->name('paytr.validate-local');
    });

    Route::get('/ayarlar', [AdminSettingsController::class, 'index'])->name('settings.index');
    Route::post('/ayarlar', [AdminSettingsController::class, 'update'])->name('settings.update');
    Route::get('/seo-site-haritasi', [AdminSeoToolsController::class, 'index'])->name('seo-tools.index');
    Route::get('/blog', [AdminBlogPostController::class, 'index'])->name('blog.index');
    Route::get('/blog/ekle', [AdminBlogPostController::class, 'create'])->name('blog.create');
    Route::get('/blog/{post}/duzenle', [AdminBlogPostController::class, 'edit'])->name('blog.edit');
    Route::post('/blog', [AdminBlogPostController::class, 'store'])->name('blog.store');
    Route::put('/blog/{post}', [AdminBlogPostController::class, 'update'])->name('blog.update');
    Route::delete('/blog/{post}', [AdminBlogPostController::class, 'destroy'])->name('blog.destroy');

    Route::get('/uyelik-paketleri', [AdminSubscriptionPlanController::class, 'index'])->name('subscriptions.index');
    Route::get('/uyelik-paketleri/ekle', [AdminSubscriptionPlanController::class, 'create'])->name('subscriptions.create');
    Route::post('/uyelik-paketleri', [AdminSubscriptionPlanController::class, 'store'])->name('subscriptions.store');
    Route::put('/uyelik-paketleri/{plan}', [AdminSubscriptionPlanController::class, 'update'])->name('subscriptions.update');

    Route::get('/mekan-sahiplenme', [AdminVenueClaimController::class, 'index'])->name('venue-claims.index');
    Route::post('/mekan-sahiplenme/{claim}/onayla', [AdminVenueClaimController::class, 'approve'])->name('venue-claims.approve');
    Route::post('/mekan-sahiplenme/{claim}/reddet', [AdminVenueClaimController::class, 'reject'])->name('venue-claims.reject');
    Route::get('/sanatci-sahiplenme', [AdminArtistClaimController::class, 'index'])->name('artist-claims.index');
    Route::post('/sanatci-sahiplenme/{claim}/onayla', [AdminArtistClaimController::class, 'approve'])->name('artist-claims.approve');
    Route::post('/sanatci-sahiplenme/{claim}/reddet', [AdminArtistClaimController::class, 'reject'])->name('artist-claims.reject');
});
