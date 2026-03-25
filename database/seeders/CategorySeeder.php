<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class CategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            ['name' => 'Bar', 'order' => 1],
            ['name' => 'Konser Alanı', 'order' => 2],
            ['name' => 'Açık Hava', 'order' => 3],
            ['name' => 'Kafe', 'order' => 4],
            ['name' => 'Klüp', 'order' => 5],
            ['name' => 'Restoran', 'order' => 6],
            ['name' => 'Tiyatro Salonu', 'order' => 7],
            ['name' => 'Stand-up Mekanı', 'order' => 8],
        ];

        foreach ($categories as $cat) {
            $slug = Str::slug($cat['name']);
            Category::query()->updateOrCreate(
                ['slug' => $slug],
                [
                    'name' => $cat['name'],
                    'order' => $cat['order'],
                ],
            );
        }
    }
}
