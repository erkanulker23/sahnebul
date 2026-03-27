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

        SubscriptionPlan::updateOrCreate(
            ['slug' => 'org-monthly'],
            [
                'name' => 'Organizasyon firması — Aylık',
                'membership_type' => 'manager',
                'interval' => 'monthly',
                'trial_days' => 0,
                'price' => 1199,
                'is_active' => true,
                'features' => "Mekan ekleme ve düzenleme\nEtkinlik yönetimi\nSanatçıları organizasyon bünyesinde gösterme (site yönetimi ataması)",
            ]
        );

        SubscriptionPlan::updateOrCreate(
            ['slug' => 'org-yearly'],
            [
                'name' => 'Organizasyon firması — Yıllık',
                'membership_type' => 'manager',
                'interval' => 'yearly',
                'trial_days' => 0,
                'price' => 11990,
                'is_active' => true,
                'features' => "Mekan ekleme ve düzenleme\nEtkinlik yönetimi\nSanatçıları organizasyon bünyesinde gösterme (site yönetimi ataması)\nYıllık avantaj",
            ]
        );

        SubscriptionPlan::updateOrCreate(
            ['slug' => 'admin-complimentary-unlimited-venue'],
            [
                'name' => 'Site yönetimi — Sınırsız ücretsiz (mekân)',
                'membership_type' => 'venue',
                'interval' => 'yearly',
                'trial_days' => 0,
                'price' => 0,
                'is_active' => true,
                'show_in_public_catalog' => false,
                'features' => "Site yönetimi tarafından atanan sınırsız ücretsiz mekân üyeliği.\nÜyelik satın alma sayfasında gösterilmez.",
            ]
        );

        SubscriptionPlan::updateOrCreate(
            ['slug' => 'admin-complimentary-unlimited-artist'],
            [
                'name' => 'Site yönetimi — Sınırsız ücretsiz (sanatçı)',
                'membership_type' => 'artist',
                'interval' => 'yearly',
                'trial_days' => 0,
                'price' => 0,
                'is_active' => true,
                'show_in_public_catalog' => false,
                'features' => "Site yönetimi tarafından atanan sınırsız ücretsiz sanatçı üyeliği.\nÜyelik satın alma sayfasında gösterilmez.",
            ]
        );
    }
}
