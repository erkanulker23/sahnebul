<?php

namespace Tests\Feature\Admin;

use App\Models\ExternalEvent;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExternalEventBulkTest extends TestCase
{
    use RefreshDatabase;

    private function createPending(string $title, string $fpSuffix = 'a'): ExternalEvent
    {
        return ExternalEvent::query()->create([
            'source' => 'biletinial',
            'fingerprint' => str_repeat('d', 32).$fpSuffix,
            'title' => $title,
            'external_url' => 'https://biletinial.com/tr-tr/muzik/'.$fpSuffix,
            'image_url' => null,
            'venue_name' => 'Arena',
            'city_name' => 'İstanbul',
            'category_name' => 'Müzik',
            'start_date' => now()->addDays(3),
            'description' => null,
            'meta' => null,
            'synced_event_id' => null,
        ]);
    }

    public function test_bulk_reject_with_apply_filters_affects_all_matching_rows(): void
    {
        $admin = User::factory()->admin()->create();
        $this->createPending('Bir', '1');
        $this->createPending('İki', '2');

        $this->assertSame(2, ExternalEvent::query()->count());

        $this->actingAs($admin)
            ->post(route('admin.external-events.bulk', absolute: false), [
                'action' => 'reject',
                'apply_filters' => true,
                'source' => '',
                // sqlite test DB lacks MySQL JSON_UNQUOTE; «all» avoids pending meta raw
                'status' => 'all',
                'search' => '',
                'artist' => '',
                'date_from' => '',
                'date_to' => '',
            ])
            ->assertRedirect();

        foreach (ExternalEvent::query()->get() as $row) {
            $this->assertTrue((bool) data_get($row->meta, 'rejected'));
        }
    }

    public function test_bulk_reject_with_explicit_ids_still_works(): void
    {
        $admin = User::factory()->admin()->create();
        $a = $this->createPending('A', 'x');
        $b = $this->createPending('B', 'y');

        $this->actingAs($admin)
            ->post(route('admin.external-events.bulk', absolute: false), [
                'action' => 'reject',
                'apply_filters' => false,
                'ids' => [$a->id],
            ])
            ->assertRedirect();

        $a->refresh();
        $b->refresh();
        $this->assertTrue((bool) data_get($a->meta, 'rejected'));
        $this->assertNull(data_get($b->meta, 'rejected'));
    }
}
