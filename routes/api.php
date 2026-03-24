<?php

use App\Http\Controllers\LocationController;
use Illuminate\Support\Facades\Route;

Route::middleware(['throttle:api-locations'])->group(function (): void {
    Route::get('/locations/provinces', [LocationController::class, 'provinces']);
    Route::get('/locations/districts/{cityId}', [LocationController::class, 'districts']);
    Route::get('/locations/neighborhoods/{districtId}', [LocationController::class, 'neighborhoods']);
});
