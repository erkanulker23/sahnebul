<?php

namespace App\Services;

use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

class CrawlRowFilterApplier
{
    /**
     * @param  list<array<string, mixed>>  $rows
     * @param  list<string>  $cityNames
     * @param  list<string>  $categoryNames
     * @return list<array<string, mixed>>
     */
    public function filter(
        array $rows,
        ?string $dateFrom,
        ?string $dateTo,
        array $cityNames,
        array $categoryNames,
    ): array {
        $from = ($dateFrom !== null && $dateFrom !== '')
            ? Carbon::parse($dateFrom)->startOfDay()
            : null;
        $to = ($dateTo !== null && $dateTo !== '')
            ? Carbon::parse($dateTo)->endOfDay()
            : null;

        $citySet = $this->normalizedSet($cityNames);
        $catSet = $this->normalizedSet($categoryNames);

        return array_values(array_filter($rows, function (array $row) use ($from, $to, $citySet, $catSet): bool {
            if ($from !== null || $to !== null) {
                $sd = $row['start_date'] ?? null;
                if ($sd === null || $sd === '') {
                    return false;
                }
                try {
                    $d = Carbon::parse($sd);
                } catch (\Throwable) {
                    return false;
                }
                if ($from !== null && $d->lt($from)) {
                    return false;
                }
                if ($to !== null && $d->gt($to)) {
                    return false;
                }
            }

            if ($citySet !== []) {
                $c = $this->norm((string) ($row['city_name'] ?? ''));
                if ($c === '' || ! in_array($c, $citySet, true)) {
                    return false;
                }
            }

            if ($catSet !== []) {
                $cat = $this->norm((string) ($row['category_name'] ?? ''));
                if ($cat === '') {
                    return false;
                }
                $ok = false;
                foreach ($catSet as $want) {
                    if ($cat === $want || str_contains($cat, $want) || str_contains($want, $cat)) {
                        $ok = true;
                        break;
                    }
                }
                if (! $ok) {
                    return false;
                }
            }

            return true;
        }));
    }

    /**
     * @param  list<string>  $names
     * @return list<string>
     */
    private function normalizedSet(array $names): array
    {
        $out = [];
        foreach ($names as $n) {
            $v = $this->norm((string) $n);
            if ($v !== '') {
                $out[] = $v;
            }
        }

        return array_values(array_unique($out));
    }

    private function norm(string $s): string
    {
        return Str::lower(trim(preg_replace('/\s+/u', ' ', $s) ?? ''));
    }
}
