<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        $superEmail = trim((string) env('SUPER_ADMIN_EMAIL', 'erkanulker0@gmail.com'));
        $plainPassword = env('SUPER_ADMIN_PASSWORD');

        if ($plainPassword === null || $plainPassword === '') {
            if (app()->environment(['local', 'testing'])) {
                $plainPassword = 'password';
            } else {
                $this->command?->warn(
                    'SUPER_ADMIN_PASSWORD .env içinde yok; süper admin kullanıcısı oluşturulmadı. '.
                    'Forge .env içinde şifreyi tanımlayıp php artisan db:seed --class=AdminUserSeeder --force çalıştırın.'
                );

                $plainPassword = null;
            }
        }

        if ($superEmail !== '' && $plainPassword !== null) {
            User::updateOrCreate(
                ['email' => $superEmail],
                [
                    'name' => env('SUPER_ADMIN_NAME', 'Sahnebul Yönetici'),
                    'password' => Hash::make($plainPassword),
                    'role' => 'super_admin',
                    'email_verified_at' => now(),
                ]
            );
        }

        if (app()->environment(['local', 'testing'])) {
            User::updateOrCreate(
                ['email' => 'admin@sahnebul.test'],
                [
                    'name' => 'Admin (yerel)',
                    'password' => Hash::make('password'),
                    'role' => 'admin',
                    'email_verified_at' => now(),
                ]
            );
        }
    }
}
