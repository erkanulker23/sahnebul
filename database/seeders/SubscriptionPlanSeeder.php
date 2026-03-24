<?php

namespace Database\Seeders;

use App\Models\SubscriptionPlan;
use Illuminate\Database\Seeder;

class SubscriptionPlanSeeder extends Seeder
{
    public function run(): void
    {
        SubscriptionPlan::updateOrCreate(
            ['slug' => 'gold-monthly'],
            [
                'name' => 'Mekan Üyeliği Aylık',
                'membership_type' => 'venue',
                'interval' => 'monthly',
                'trial_days' => 0,
                'price' => 999,
                'is_active' => true,
                'features' => "Mekan ekleme ve düzenleme\nEtkinlik ekleme ve düzenleme\nÖncelikli destek",
            ]
        );

        SubscriptionPlan::updateOrCreate(
            ['slug' => 'gold-yearly'],
            [
                'name' => 'Mekan Üyeliği Yıllık',
                'membership_type' => 'venue',
                'interval' => 'yearly',
                'trial_days' => 0,
                'price' => 9990,
                'is_active' => true,
                'features' => "Mekan ekleme ve düzenleme\nEtkinlik ekleme ve düzenleme\nÖncelikli destek\nYıllık %17 avantaj",
            ]
        );

        SubscriptionPlan::updateOrCreate(
            ['slug' => 'artist-monthly'],
            [
                'name' => 'Sanatçı Üyeliği Aylık',
                'membership_type' => 'artist',
                'interval' => 'monthly',
                'trial_days' => 0,
                'price' => 799,
                'is_active' => true,
                'features' => "Sanatçı profili sahiplenme\nProfil düzenleme\nÖncelikli sanatçı görünürlüğü",
            ]
        );

        SubscriptionPlan::updateOrCreate(
            ['slug' => 'artist-yearly'],
            [
                'name' => 'Sanatçı Üyeliği Yıllık',
                'membership_type' => 'artist',
                'interval' => 'yearly',
                'trial_days' => 0,
                'price' => 7990,
                'is_active' => true,
                'features' => "Sanatçı profili sahiplenme\nProfil düzenleme\nYıllık %17 avantaj",
            ]
        );
    }
}
