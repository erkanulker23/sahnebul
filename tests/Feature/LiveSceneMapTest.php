<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LiveSceneMapTest extends TestCase
{
    use RefreshDatabase;

    public function test_live_scene_json_returns_shape(): void
    {
        $res = $this->getJson('/api/live-scene');

        $res->assertOk();
        $res->assertJsonStructure([
            'generated_at',
            'vibe',
            'spots',
            'popular',
            'stats' => ['venue_count', 'event_count'],
        ]);
        $data = $res->json();
        $this->assertIsArray($data['spots']);
        $this->assertIsArray($data['popular']);
    }

    public function test_live_scene_page_loads(): void
    {
        $res = $this->get('/kesfet/bu-aksam');
        $res->assertOk();
    }

    public function test_invalid_vibe_param_is_ignored_in_json(): void
    {
        $res = $this->getJson('/api/live-scene?vibe=not-a-real-vibe-id');
        $res->assertOk();
        $this->assertNull($res->json('vibe'));
    }
}
