<?php

namespace Database\Seeders;

use App\Models\Venue;
use App\Models\VenueMedia;
use Illuminate\Database\Seeder;

class VenueMediaSeeder extends Seeder
{
    public function run(): void
    {
        $map = [
            'zorlu-psm' => [
                'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?q=80&w=1600&auto=format&fit=crop',
                'https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?q=80&w=1600&auto=format&fit=crop',
                'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?q=80&w=1600&auto=format&fit=crop',
            ],
            'kucukciftlik-park' => [
                'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=1600&auto=format&fit=crop',
                'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?q=80&w=1600&auto=format&fit=crop',
                'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?q=80&w=1600&auto=format&fit=crop',
            ],
            'babylon' => [
                'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?q=80&w=1600&auto=format&fit=crop',
                'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?q=80&w=1600&auto=format&fit=crop',
            ],
        ];

        foreach ($map as $slug => $photos) {
            $venue = Venue::where('slug', $slug)->first();
            if (!$venue) {
                continue;
            }

            foreach ($photos as $idx => $url) {
                VenueMedia::updateOrCreate(
                    ['venue_id' => $venue->id, 'path' => $url],
                    ['type' => 'photo', 'order' => $idx + 1, 'title' => $venue->name . ' Fotoğraf ' . ($idx + 1)]
                );
            }
        }
    }
}

