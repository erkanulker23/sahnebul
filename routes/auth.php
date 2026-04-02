<?php

use App\Http\Controllers\Auth\ConfirmablePasswordController;
use App\Http\Controllers\Auth\EmailVerificationNotificationController;
use App\Http\Controllers\Auth\EmailVerificationPromptController;
use App\Http\Controllers\Auth\GoogleCredentialAuthController;
use App\Http\Controllers\Auth\NewPasswordController;
use App\Http\Controllers\Auth\PasswordController;
use App\Http\Controllers\Auth\PasswordResetLinkController;
use App\Http\Controllers\Auth\PortalAuthenticatedSessionController;
use App\Http\Controllers\Auth\RegisteredUserController;
use App\Http\Controllers\Auth\VerifyEmailController;
use Illuminate\Support\Facades\Route;

Route::middleware('guest')->group(function () {
    Route::permanentRedirect('/login', '/giris/kullanici');

    Route::get('/giris/kullanici', [PortalAuthenticatedSessionController::class, 'create'])
        ->name('login');

    Route::get('/giris/sanatci', [PortalAuthenticatedSessionController::class, 'create'])
        ->name('login.sanatci');

    Route::get('/giris/mekan', [PortalAuthenticatedSessionController::class, 'create'])
        ->name('login.mekan');

    Route::permanentRedirect('/giris/organizasyon', '/giris/management');

    Route::get('/giris/management', [PortalAuthenticatedSessionController::class, 'create'])
        ->name('login.management');

    Route::get('/giris/sahne', [PortalAuthenticatedSessionController::class, 'createStageLoginChooser'])
        ->name('login.sahne');

    Route::get('/yonetim/giris', [PortalAuthenticatedSessionController::class, 'create'])
        ->name('login.admin');

    Route::post('/giris/{portal}', [PortalAuthenticatedSessionController::class, 'store'])
        ->whereIn('portal', ['kullanici', 'sanatci', 'mekan', 'management', 'organizasyon', 'yonetim'])
        ->middleware('throttle:auth-login')
        ->name('login.store');

    Route::get('/kayit/kullanici', [RegisteredUserController::class, 'createKullanici'])
        ->name('register.kullanici');

    Route::post('/kayit/kullanici', [RegisteredUserController::class, 'storeKullanici'])
        ->middleware('throttle:auth-register')
        ->name('register.kullanici.store');

    Route::get('register', [RegisteredUserController::class, 'create'])
        ->name('register');

    Route::post('register', [RegisteredUserController::class, 'store'])
        ->middleware('throttle:auth-register');

    Route::get('forgot-password', [PasswordResetLinkController::class, 'create'])
        ->name('password.request');

    Route::post('forgot-password', [PasswordResetLinkController::class, 'store'])
        ->middleware('throttle:password-reset')
        ->name('password.email');

    Route::get('reset-password/{token}', [NewPasswordController::class, 'create'])
        ->name('password.reset');

    Route::post('reset-password', [NewPasswordController::class, 'store'])
        ->middleware('throttle:password-reset')
        ->name('password.store');

    Route::post('/auth/google/kimlik', [GoogleCredentialAuthController::class, 'store'])
        ->middleware('throttle:30,1')
        ->name('auth.google.credential');
});

Route::middleware('auth')->group(function () {
    Route::get('verify-email', EmailVerificationPromptController::class)
        ->name('verification.notice');

    Route::get('verify-email/{id}/{hash}', VerifyEmailController::class)
        ->middleware(['signed', 'throttle:6,1'])
        ->name('verification.verify');

    Route::post('email/verification-notification', [EmailVerificationNotificationController::class, 'store'])
        ->middleware('throttle:6,1')
        ->name('verification.send');

    Route::get('confirm-password', [ConfirmablePasswordController::class, 'show'])
        ->name('password.confirm');

    Route::post('confirm-password', [ConfirmablePasswordController::class, 'store']);

    Route::put('password', [PasswordController::class, 'update'])->name('password.update');

    Route::post('logout', [PortalAuthenticatedSessionController::class, 'destroy'])
        ->name('logout');
});
