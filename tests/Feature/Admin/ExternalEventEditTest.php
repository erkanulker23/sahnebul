<?php

namespace Tests\Feature\Admin;

use App\Models\ExternalEvent;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExternalEventEditTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_open_edit_form(): void
    {
        $admin = User::factory()->admin()->create();
        $row = ExternalEvent::query()->create([
            'source' => 'biletinial',
            'fingerprint' => str_repeat('c', 40),
            'title' => 'Deneme konser',
            'external_url' => 'https://biletinial.com/tr-tr/muzik/foo',
            'image_url' => null,
            'venue_name' => 'JJ Arena',
            'city_name' => 'İstanbul',
            'category_name' => 'Müzik',
            'start_date' => now()->addDays(2),
            'description' => null,
            'meta' => null,
            'synced_event_id' => null,
        ]);

        $this->actingAs($admin)
            ->get(route('admin.external-events.edit', ['externalEvent' => $row->id], absolute: false))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('Admin/ExternalEvents/Edit'));
    }

    public function test_admin_can_update_external_event_candidate(): void
    {
        $admin = User::factory()->admin()->create();
        $row = ExternalEvent::query()->create([
            'source' => 'biletinial',
            'fingerprint' => str_repeat('d', 40),
            'title' => 'Eski başlık',
            'external_url' => 'https://biletinial.com/tr-tr/muzik/original',
            'image_url' => null,
            'venue_name' => 'Mekan A',
            'city_name' => 'İzmir',
            'category_name' => 'Müzik',
            'start_date' => now()->addDays(3),
            'description' => 'Açıklama',
            'meta' => null,
            'synced_event_id' => null,
        ]);

        $this->actingAs($admin)
            ->put(route('admin.external-events.update', ['externalEvent' => $row->id], absolute: false), [
                'title' => 'Yeni başlık',
                'venue_name' => 'Mekan B',
                'city_name' => 'Ankara',
                'category_name' => 'Tiyatro',
                'start_date' => '',
                'description' => 'Yeni not',
                'external_url' => 'https://biletinial.com/tr-tr/muzik/updated-path',
                'image_url' => '',
            ])
            ->assertRedirect(route('admin.external-events.index', absolute: false));

        $row->refresh();
        $this->assertSame('Yeni başlık', $row->title);
        $this->assertSame('Mekan B', $row->venue_name);
        $this->assertSame('Ankara', $row->city_name);
        $this->assertSame('Tiyatro', $row->category_name);
        $this->assertNull($row->start_date);
        $this->assertSame('Yeni not', $row->description);
        $this->assertSame('https://biletinial.com/tr-tr/muzik/updated-path', $row->external_url);
    }
}
