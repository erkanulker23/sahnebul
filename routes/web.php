<?php

use App\Http\Controllers\Admin\AdPlacementController as AdminAdPlacementController;
use App\Http\Controllers\Admin\ArtistClaimController as AdminArtistClaimController;
use App\Http\Controllers\Admin\ArtistController as AdminArtistController;
use App\Http\Controllers\Admin\MusicGenreController as AdminMusicGenreController;
use App\Http\Controllers\Admin\BlogPostController as AdminBlogPostController;
use App\Http\Controllers\Admin\CategoryController as AdminCategoryController;
use App\Http\Controllers\Admin\CityController as AdminCityController;
use App\Http\Controllers\Admin\DashboardController as AdminDashboardController;
use App\Http\Controllers\Admin\EventController as AdminEventController;
use App\Http\Controllers\Admin\ExternalEventController as AdminExternalEventController;
use App\Http\Controllers\Admin\ProfileController as AdminProfileController;
use App\Http\Controllers\Admin\ReservationController as AdminReservationController;
use App\Http\Controllers\Admin\ReviewController as AdminReviewController;
use App\Http\Controllers\Admin\SettingsController as AdminSettingsController;
use App\Http\Controllers\Admin\SmtpSettingsController as AdminSmtpSettingsController;
use App\Http\Controllers\Admin\SubscriptionPlanController as AdminSubscriptionPlanController;
use App\Http\Controllers\Admin\UserController as AdminUserController;
use App\Http\Controllers\Admin\VenueClaimController as AdminVenueClaimController;
use App\Http\Controllers\Admin\VenueController as AdminVenueController;
use App\Http\Controllers\Artist\DashboardController as ArtistDashboardController;
use App\Http\Controllers\Artist\EventController as ArtistEventController;
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
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\PageController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ReservationController;
use App\Http\Controllers\ReverseGeocodeController;
use App\Http\Controllers\ReviewController;
use App\Http\Controllers\SearchController;
use App\Http\Controllers\SehirSecCityController;
use App\Http\Controllers\SehirSecController;
use App\Http\Controllers\SubscriptionController;
use App\Http\Controllers\VenueClaimController;
use App\Http\Controllers\VenueController;
use App\Models\ExternalEvent;
use App\Models\Venue;
use Illuminate\Support\Facades\Route;

Route::middleware(['throttle:search-quick', 'json.same-site'])->group(function () {
    Route::get('/search/quick', [SearchController::class, 'quick'])->name('search.quick');
});

Route::middleware(['throttle:reverse-geocode', 'json.same-site'])->group(function () {
    Route::get('/api/reverse-geocode', [ReverseGeocodeController::class, 'show'])->name('api.reverse-geocode');
});

Route::get('/', [VenueController::class, 'index'])->name('home');
Route::get('/mekanlar', [VenueController::class, 'index'])->name('venues.index');
Route::get('/mekanlar/{venue:slug}', [VenueController::class, 'show'])->name('venues.show');
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
Route::get('/blog', [BlogController::class, 'index'])->name('blog.index');
Route::get('/blog/{post:slug}', [BlogController::class, 'show'])->name('blog.show');
Route::get('/iletisim', [ContactController::class, 'create'])->name('contact');
Route::post('/iletisim', [ContactController::class, 'store'])
    ->middleware('throttle:8,1')
    ->name('contact.store');
Route::get('/sayfalar/{slug}', [PageController::class, 'show'])->name('pages.show');
Route::get('/sehir-sec', SehirSecController::class)->name('sehir-sec');
Route::get('/sehir-sec/etkinlik/{externalEvent}', function (ExternalEvent $externalEvent) {
    abort_unless($externalEvent->source === 'bubilet_sehir_sec', 404);

    return redirect()->route('events.show', ['event' => 'dis'.$externalEvent->id], 301);
})->name('sehir-sec.event');
Route::get('/sehir-sec/{city}', SehirSecCityController::class)
    ->where('city', 'istanbul|ankara|izmir|antalya|bursa|eskisehir')
    ->name('sehir-sec.city');

Route::get('/dashboard', DashboardController::class)->middleware(['auth', 'verified'])->name('dashboard');

Route::middleware('auth')->group(function () {
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
    Route::post('/yorumlar/{review}/begeni', [ReviewController::class, 'like'])->name('reviews.like');

    Route::get('/bildirimler', [NotificationController::class, 'index'])->name('notifications.index');
    Route::get('/uyelik/paketler', [SubscriptionController::class, 'index'])->name('subscriptions.index');
    Route::post('/uyelik/paketler', [SubscriptionController::class, 'store'])->name('subscriptions.store');
    Route::post('/mekanlar/{venue}/sahiplen', [VenueClaimController::class, 'store'])->name('venues.claim');
    Route::post('/sahneler/{venue}/sahiplen', [VenueClaimController::class, 'store']);
    Route::post('/sanatcilar/{artist}/sahiplen', [ArtistClaimController::class, 'store'])->name('artists.claim');
});

Route::middleware(['auth', 'verified', 'artist', 'gold'])->prefix('sahne')->name('artist.')->group(function () {
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
    Route::get('/mekanlarim', [ArtistVenueController::class, 'index'])->name('venues.index');
    Route::get('/mekanlarim/ekle', [ArtistVenueController::class, 'create'])->name('venues.create');
    Route::post('/mekanlarim', [ArtistVenueController::class, 'store'])->name('venues.store');
    Route::get('/mekanlarim/{venue}/duzenle', [ArtistVenueController::class, 'edit'])->name('venues.edit');
    Route::put('/mekanlarim/{venue}', [ArtistVenueController::class, 'update'])->name('venues.update');
    Route::post('/mekanlarim/{venue}/galeri', [ArtistVenueController::class, 'storeMedia'])->name('venues.media.store');
    Route::delete('/mekanlarim/{venue}/galeri/{media}', [ArtistVenueController::class, 'destroyMedia'])->name('venues.media.destroy');
    Route::get('/etkinlikler', [ArtistEventController::class, 'index'])->name('events.index');
    Route::get('/etkinlikler/ekle', [ArtistEventController::class, 'create'])->name('events.create');
    Route::post('/etkinlikler', [ArtistEventController::class, 'store'])->name('events.store');
    Route::get('/etkinlikler/{event}/duzenle', [ArtistEventController::class, 'edit'])->name('events.edit');
    Route::put('/etkinlikler/{event}', [ArtistEventController::class, 'update'])->name('events.update');
    Route::get('/rezervasyonlar', [ArtistReservationController::class, 'index'])->name('reservations.index');
    Route::patch('/rezervasyonlar/{reservation}/durum', [ArtistReservationController::class, 'updateStatus'])->name('reservations.updateStatus');
});

Route::middleware(['auth', 'verified', 'admin'])->prefix('admin')->name('admin.')->group(function () {
    Route::get('/', [AdminDashboardController::class, 'index'])->name('dashboard');
    Route::get('/profil', [AdminProfileController::class, 'edit'])->name('profile');

    Route::get('/kullanicilar', [AdminUserController::class, 'index'])->name('users.index');
    Route::post('/kullanicilar', [AdminUserController::class, 'store'])->name('users.store');
    Route::put('/kullanicilar/{user}', [AdminUserController::class, 'update'])->name('users.update');
    Route::post('/kullanicilar/{user}/aktif', [AdminUserController::class, 'toggleActive'])->name('users.toggleActive');
    Route::delete('/kullanicilar/{user}', [AdminUserController::class, 'destroy'])->name('users.destroy');

    Route::get('/mekanlar', [AdminVenueController::class, 'index'])->name('venues.index');
    Route::get('/mekanlar/ekle', [AdminVenueController::class, 'create'])->name('venues.create');
    Route::permanentRedirect('sahneler', 'mekanlar');
    Route::post('/mekanlar', [AdminVenueController::class, 'store'])->name('venues.store');
    Route::post('/mekanlar/toplu-sil', [AdminVenueController::class, 'bulkDestroy'])->name('venues.bulk-destroy');
    Route::get('/mekanlar/{venue}/duzenle', [AdminVenueController::class, 'edit'])->name('venues.edit');
    Route::post('/mekanlar/{venue}/galeri', [AdminVenueController::class, 'storeMedia'])->name('venues.media.store');
    Route::delete('/mekanlar/{venue}/galeri/{media}', [AdminVenueController::class, 'destroyMedia'])->name('venues.media.destroy');
    Route::put('/mekanlar/{venue}', [AdminVenueController::class, 'update'])->name('venues.update');
    Route::post('/mekanlar/{venue}/onayla', [AdminVenueController::class, 'approve'])->name('venues.approve');
    Route::post('/mekanlar/{venue}/reddet', [AdminVenueController::class, 'reject'])->name('venues.reject');
    Route::delete('/mekanlar/{venue}', [AdminVenueController::class, 'destroy'])->name('venues.destroy');

    Route::get('/etkinlikler', [AdminEventController::class, 'index'])->name('events.index');
    Route::get('/etkinlikler/ekle', [AdminEventController::class, 'create'])->name('events.create');
    Route::post('/etkinlikler', [AdminEventController::class, 'store'])->name('events.store');
    Route::get('/etkinlikler/{event}/duzenle', [AdminEventController::class, 'edit'])->name('events.edit');
    Route::put('/etkinlikler/{event}', [AdminEventController::class, 'update'])->name('events.update');
    Route::post('/etkinlikler/{event}/onayla', [AdminEventController::class, 'approve'])->name('events.approve');
    Route::delete('/etkinlikler/{event}', [AdminEventController::class, 'destroy'])->name('events.destroy');
    Route::get('/dis-kaynak-etkinlikler', [AdminExternalEventController::class, 'index'])->name('external-events.index');
    Route::post('/dis-kaynak-etkinlikler/toplu-islem', [AdminExternalEventController::class, 'bulk'])->name('external-events.bulk');
    Route::post('/dis-kaynak-etkinlikler/{externalEvent}/aktar', [AdminExternalEventController::class, 'sync'])->name('external-events.sync');
    Route::post('/dis-kaynak-etkinlikler/{externalEvent}/reddet', [AdminExternalEventController::class, 'reject'])->name('external-events.reject');

    Route::get('/sanatcilar', [AdminArtistController::class, 'index'])->name('artists.index');
    Route::get('/sanatcilar/ekle', [AdminArtistController::class, 'create'])->name('artists.create');
    Route::post('/sanatcilar', [AdminArtistController::class, 'store'])->name('artists.store');
    Route::post('/sanatcilar/toplu-sil', [AdminArtistController::class, 'bulkDestroy'])->name('artists.bulk-destroy');
    Route::get('/sanatcilar/{artist:id}/duzenle', [AdminArtistController::class, 'edit'])->name('artists.edit');
    Route::post('/sanatcilar/{artist:id}/galeri', [AdminArtistController::class, 'storeMedia'])->name('artists.media.store');
    Route::delete('/sanatcilar/{artist:id}/galeri/{media}', [AdminArtistController::class, 'destroyMedia'])->name('artists.media.destroy');
    Route::put('/sanatcilar/{artist:id}', [AdminArtistController::class, 'update'])->name('artists.update');
    Route::post('/sanatcilar/{artist:id}/onayla', [AdminArtistController::class, 'approve'])->name('artists.approve');
    Route::post('/sanatcilar/{artist:id}/reddet', [AdminArtistController::class, 'reject'])->name('artists.reject');
    Route::delete('/sanatcilar/{artist:id}', [AdminArtistController::class, 'destroy'])->name('artists.destroy');

    Route::get('/rezervasyonlar', [AdminReservationController::class, 'index'])->name('reservations.index');
    Route::get('/rezervasyonlar/{reservation}', [AdminReservationController::class, 'show'])->name('reservations.show');
    Route::patch('/rezervasyonlar/{reservation}/durum', [AdminReservationController::class, 'updateStatus'])->name('reservations.updateStatus');

    Route::get('/yorumlar', [AdminReviewController::class, 'index'])->name('reviews.index');
    Route::post('/yorumlar/{review}/onayla', [AdminReviewController::class, 'approve'])->name('reviews.approve');
    Route::delete('/yorumlar/{review}', [AdminReviewController::class, 'destroy'])->name('reviews.destroy');

    Route::get('/kategoriler', [AdminCategoryController::class, 'index'])->name('categories.index');
    Route::post('/kategoriler', [AdminCategoryController::class, 'store'])->name('categories.store');
    Route::put('/kategoriler/{category}', [AdminCategoryController::class, 'update'])->name('categories.update');
    Route::delete('/kategoriler/{category}', [AdminCategoryController::class, 'destroy'])->name('categories.destroy');

    Route::permanentRedirect('sanatci-turleri', 'muzik-turleri');

    Route::get('/muzik-turleri', [AdminMusicGenreController::class, 'index'])->name('music-genres.index');
    Route::post('/muzik-turleri', [AdminMusicGenreController::class, 'store'])->name('music-genres.store');
    Route::put('/muzik-turleri/{musicGenre}', [AdminMusicGenreController::class, 'update'])->name('music-genres.update');
    Route::delete('/muzik-turleri/{musicGenre}', [AdminMusicGenreController::class, 'destroy'])->name('music-genres.destroy');

    Route::get('/sehirler', [AdminCityController::class, 'index'])->name('cities.index');
    Route::post('/sehirler/senkronize', [AdminCityController::class, 'syncFromApi'])->name('cities.sync');

    Route::get('/reklam-alanlari', [AdminAdPlacementController::class, 'index'])->name('ad-slots.index');
    Route::post('/reklam-alanlari', [AdminAdPlacementController::class, 'update'])->name('ad-slots.update');

    Route::get('/smtp', [AdminSmtpSettingsController::class, 'index'])->name('smtp.index');
    Route::post('/smtp', [AdminSmtpSettingsController::class, 'update'])->name('smtp.update');
    Route::post('/smtp/test-mail', [AdminSmtpSettingsController::class, 'sendTestMail'])->name('smtp.test-mail');

    Route::get('/ayarlar', [AdminSettingsController::class, 'index'])->name('settings.index');
    Route::post('/ayarlar', [AdminSettingsController::class, 'update'])->name('settings.update');
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

require __DIR__.'/auth.php';
