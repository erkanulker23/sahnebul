<?php

namespace App\Support;

use App\Models\Event;
use Illuminate\Database\Eloquent\Builder;

/**
 * “Bu akşam ne yapsam?” tarz kartları — sunucu tarafı tanımlar ve sorguya uygulanır.
 */
final class TonightVibePresets
{
    /**
     * @return list<array{id: string, title: string, subtitle: string, hint: string}>
     */
    public static function forFrontend(): array
    {
        $out = [];
        foreach (self::definitions() as $def) {
            $out[] = [
                'id' => $def['id'],
                'title' => $def['title'],
                'subtitle' => $def['subtitle'],
                'hint' => $def['hint'],
            ];
        }

        return $out;
    }

    /**
     * @return array<string, array{id: string, title: string, subtitle: string, hint: string, or: list<array<string, mixed>}>|null
     */
    public static function definitionById(string $id): ?array
    {
        foreach (self::definitions() as $def) {
            if ($def['id'] === $id) {
                return $def;
            }
        }

        return null;
    }

    /**
     * @param  Builder<Event>  $query
     */
    public static function applyToQuery(Builder $query, ?string $vibeId): void
    {
        if ($vibeId === null || trim($vibeId) === '') {
            return;
        }
        $def = self::definitionById($vibeId);
        if ($def === null) {
            return;
        }
        $clauses = $def['or'] ?? [];
        if ($clauses === []) {
            return;
        }

        $query->where(function (Builder $outer) use ($clauses) {
            foreach ($clauses as $i => $clause) {
                $method = $i === 0 ? 'where' : 'orWhere';
                $outer->{$method}(function (Builder $q) use ($clause) {
                    $has = false;
                    if (! empty($clause['event_types']) && is_array($clause['event_types'])) {
                        $q->whereIn('events.event_type', $clause['event_types']);
                        $has = true;
                    }
                    if (! empty($clause['category_slugs']) && is_array($clause['category_slugs'])) {
                        $q->whereHas(
                            'venue.category',
                            fn ($c) => $c->whereIn('slug', $clause['category_slugs'])
                        );
                        $has = true;
                    }
                    if (! empty($clause['genres']) && is_array($clause['genres'])) {
                        $q->whereHas('artists', function (Builder $aq) use ($clause) {
                            $aq->where(function (Builder $gq) use ($clause) {
                                foreach ($clause['genres'] as $gi => $g) {
                                    if (! is_string($g) || trim($g) === '') {
                                        continue;
                                    }
                                    $gm = $gi === 0 ? 'where' : 'orWhere';
                                    $gq->{$gm}(fn (Builder $qq) => $qq->whereGenreLabelMatches($g));
                                }
                            });
                        });
                        $has = true;
                    }
                    if (! $has) {
                        $q->whereRaw('1 = 0');
                    }
                });
            }
        });
    }

    /**
     * @return list<array{id: string, title: string, subtitle: string, hint: string, or: list<array<string, mixed>>}>
     */
    private static function definitions(): array
    {
        return [
            [
                'id' => 'sahne_konser',
                'title' => 'Sahne patlasın',
                'subtitle' => 'Konser & festival',
                'hint' => 'Yüksek enerji, canlı müzik',
                'or' => [
                    ['event_types' => ['konser', 'festival']],
                    ['category_slugs' => ['konser-alani', 'acik-hava']],
                ],
            ],
            [
                'id' => 'gece_kulubu',
                'title' => 'Gece modu',
                'subtitle' => 'Kulüp & bar',
                'hint' => 'DJ, dans, gece hayatı',
                'or' => [
                    ['category_slugs' => ['klup', 'bar']],
                ],
            ],
            [
                'id' => 'rahat_sosyal',
                'title' => 'Rahat bir akşam',
                'subtitle' => 'Kafe & restoran',
                'hint' => 'Sohbet, yemek, düşük tempo',
                'or' => [
                    ['category_slugs' => ['kafe', 'restoran']],
                ],
            ],
            [
                'id' => 'kultur',
                'title' => 'Kültür & sahne',
                'subtitle' => 'Tiyatro & workshop',
                'hint' => 'Oyun, drama, öğren',
                'or' => [
                    ['event_types' => ['tiyatro', 'workshop']],
                    ['category_slugs' => ['tiyatro-salonu']],
                ],
            ],
            [
                'id' => 'komedi',
                'title' => 'Gülmek istiyorum',
                'subtitle' => 'Stand-up & komedi',
                'hint' => 'Tek perde, bol kahkaha',
                'or' => [
                    ['event_types' => ['stand-up']],
                    ['category_slugs' => ['stand-up-mekani']],
                ],
            ],
            [
                'id' => 'aile',
                'title' => 'Aile dostu',
                'subtitle' => 'Çocuk aktiviteleri',
                'hint' => 'Güvenli, eğlenceli içerik',
                'or' => [
                    ['event_types' => ['cocuk-aktiviteleri']],
                ],
            ],
        ];
    }
}
