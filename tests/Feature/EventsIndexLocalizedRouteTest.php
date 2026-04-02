<?php

namespace Tests\Feature;

use App\Models\City;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EventsIndexLocalizedRouteTest extends TestCase
{
    use RefreshDatabase;

    public function test_unknown_city_slug_returns_404(): void
    {
        $this->get('/etkinlik/bilinmeyen-il-slug/konser')->assertNotFound();
    }

    public function test_unknown_event_type_slug_returns_404(): void
    {
        City::query()->create([
            'name' => 'Ankara',
            'slug' => 'ankara',
            'external_id' => 6,
        ]);

        $this->get('/etkinlik/ankara/dans-etu')->assertNotFound();
    }

    public function test_valid_city_and_type_returns_ok(): void
    {
        City::query()->create([
            'name' => 'Ankara',
            'slug' => 'ankara',
            'external_id' => 6,
        ]);

        $this->get('/etkinlik/ankara/konser')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('Events/Index'));
    }

    public function test_type_only_path_returns_ok(): void
    {
        $this->get('/etkinlik/konser')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Events/Index')
                ->where('listingSeo.kind', 'type')
                ->where('listingSeo.eventTypeSlug', 'konser'));
    }

    public function test_unknown_type_slug_in_type_only_path_returns_404(): void
    {
        $this->get('/etkinlik/dans-etu')->assertNotFound();
    }

    public function test_bare_event_type_query_redirects_to_path(): void
    {
        $this->get('/etkinlikler?event_type=konser')
            ->assertRedirect('/etkinlik/konser');
    }
}
