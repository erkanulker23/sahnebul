<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('promo:check-import-deps {--warn-only : Eksik araç olsa da çıkış kodu 0}', function () {
    $opts = $this->option('warn-only') ? ['--warn-only' => true] : [];

    return $this->call('sahnebul:promo-import-deps', $opts);
})->purpose('Alias: sahnebul:promo-import-deps (yt-dlp, ffmpeg, Instagram çerez dosyası)');

/*
|--------------------------------------------------------------------------
| Zamanlanmış görevler — Forge / sunucuda: * * * * * php artisan schedule:run
|--------------------------------------------------------------------------
*/
Schedule::command('marketplaces:crawl --source=bubilet_sehir_sec --limit=400')
    ->dailyAt('03:15')
    ->timezone('Europe/Istanbul')
    ->withoutOverlapping(120)
    ->runInBackground();

Schedule::command('marketplaces:crawl --source=bubilet --limit=400')
    ->dailyAt('04:00')
    ->timezone('Europe/Istanbul')
    ->withoutOverlapping(120)
    ->runInBackground();

Schedule::command('queue:prune-failed --hours=168')->weekly();

Schedule::command('sahnebul:send-event-reminders')
    ->hourlyAt(7)
    ->timezone('Europe/Istanbul')
    ->withoutOverlapping(25);

Schedule::command('events:purge-ended-promo-media')
    ->dailyAt('04:30')
    ->timezone('Europe/Istanbul')
    ->withoutOverlapping(60);
