<?php

namespace App\Services;

use App\Models\Artist;
use App\Models\Event;

class EventArtistLinkResolver
{
    /**
     * Etkinlik başlığından onaylı sanatçı bulur (örn. "Teoman - Akustik", "Duman Konseri").
     */
    public function findArtistForTitle(string $title): ?Artist
    {
        $title = trim($title);
        if ($title === '') {
            return null;
        }

        $head = $this->headBeforeDash($title);
        if ($head !== '') {
            $byHead = Artist::query()
                ->approved()
                ->whereRaw('lower(name) = lower(?)', [$head])
                ->first();
            if ($byHead) {
                return $byHead;
            }
        }

        $candidates = Artist::query()
            ->approved()
            ->get()
            ->sortByDesc(fn (Artist $a) => mb_strlen($a->name));

        foreach ($candidates as $artist) {
            $name = $artist->name;
            $len = mb_strlen($name);
            if (mb_strlen($title) < $len) {
                continue;
            }
            if (mb_strtolower(mb_substr($title, 0, $len)) !== mb_strtolower($name)) {
                continue;
            }
            $after = mb_substr($title, $len);
            if ($after === '') {
                return $artist;
            }
            if (preg_match('/^(\s|[-–—])/u', $after)) {
                return $artist;
            }
            if (preg_match('/^\s+\S/u', $after)) {
                return $artist;
            }
        }

        return null;
    }

    private function headBeforeDash(string $title): string
    {
        $parts = preg_split('/\s*[-–—]\s*/u', $title, 2);

        return trim($parts[0] ?? '');
    }

    /**
     * Pivot boşsa tek sanatçı bağlar; zaten bağlıysa false döner.
     */
    public function attachIfEventHasNoArtists(Event $event): bool
    {
        if ($event->artists()->exists()) {
            return false;
        }

        $artist = $this->findArtistForTitle($event->title);
        if (! $artist) {
            return false;
        }

        $event->artists()->attach($artist->id, [
            'is_headliner' => true,
            'order' => 0,
        ]);

        return true;
    }

    /**
     * @return array{attached: int, unmatched: int}
     */
    public function repairAllPublishedWithoutArtists(bool $dryRun = false): array
    {
        $attached = 0;
        $unmatched = 0;

        $query = Event::query()
            ->published()
            ->whereDoesntHave('artists')
            ->orderBy('id');

        foreach ($query->cursor() as $event) {
            $artist = $this->findArtistForTitle($event->title);
            if (! $artist) {
                $unmatched++;

                continue;
            }
            if ($dryRun) {
                $attached++;

                continue;
            }
            $event->artists()->attach($artist->id, [
                'is_headliner' => true,
                'order' => 0,
            ]);
            $attached++;
        }

        return ['attached' => $attached, 'unmatched' => $unmatched];
    }
}
