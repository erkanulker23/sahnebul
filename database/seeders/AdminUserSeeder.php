<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        $cfg = config('sahnebul.super_admin', []);
        $email = (string) ($cfg['email'] ?? 'erkanulker0@gmail.com');
        $plain = (string) ($cfg['password'] ?? 'password');
        $name = (string) ($cfg['name'] ?? 'Sahnebul Yönetici');

        if ($email === '') {
            return;
        }

        User::updateOrCreate(
            ['email' => $email],
            [
                'name' => $name,
                'password' => Hash::make($plain),
                'role' => 'super_admin',
                'email_verified_at' => now(),
            ]
        );
    }
}
