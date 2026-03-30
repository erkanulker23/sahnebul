<?php

namespace App\Services;

/**
 * Ortak özet: admin senkron crawl ve arka plan job’u aynı rapor şeklini kullanır.
 */
final class ExternalMarketplaceCrawlReportBuilder
{
    /**
     * @param  list<array{source: string, processed: int, error: string|null}>  $rows
     * @return array{finished_at: string, status: string, total_processed: int, rows: list<array{source: string, processed: int, error: string|null}>, summary: string}
     */
    public static function minimalReport(string $status, string $summary, int $totalProcessed, array $rows): array
    {
        return [
            'finished_at' => now()->timezone(config('app.timezone'))->format('d.m.Y H:i:s'),
            'status' => $status,
            'total_processed' => $totalProcessed,
            'rows' => $rows,
            'summary' => $summary,
        ];
    }

    /**
     * @param  list<array{source: string, processed: int, synced: int, error?: string}>  $results
     * @return array{message: string, report: array{finished_at: string, status: string, total_processed: int, rows: list<array{source: string, processed: int, error: string|null}>, summary: string}}
     */
    public static function outcomeFromImportResults(array $results): array
    {
        $totalProcessed = 0;
        $perSourceOk = [];
        /** @var array<string, list<string>> $errorGroups compact message => source keys */
        $errorGroups = [];
        $rows = [];

        foreach ($results as $row) {
            $source = (string) ($row['source'] ?? '?');
            $err = ! empty($row['error']) ? (string) $row['error'] : null;
            $n = (int) ($row['processed'] ?? 0);
            $rows[] = [
                'source' => $source,
                'processed' => $n,
                'error' => $err,
            ];
            if ($err !== null) {
                $errorGroups[$err][] = $source;

                continue;
            }
            $totalProcessed += $n;
            if ($n > 0) {
                $perSourceOk[] = $source.' → '.$n;
            }
        }

        $errorParts = [];
        foreach ($errorGroups as $errMsg => $sources) {
            $sources = array_values(array_unique($sources));
            sort($sources, SORT_STRING);
            $errorParts[] = implode(', ', $sources).': '.$errMsg;
        }

        if ($errorParts !== [] && $totalProcessed === 0) {
            $message = 'Crawl tamamlandı ancak kayıt işlenemedi. '.implode(' | ', $errorParts);
            $report = self::minimalReport('error', $message, 0, $rows);

            return ['message' => $message, 'report' => $report];
        }

        if ($totalProcessed === 0 && $errorParts === []) {
            $message = 'Crawl tamamlandı. Filtreye veya limite uyan yeni kayıt yok (0 işlendi). Tarih, şehir veya önizlemeyi kontrol edin.';
            $report = self::minimalReport('info', $message, 0, $rows);

            return ['message' => $message, 'report' => $report];
        }

        $headline = 'Crawl tamamlandı. Toplam '.$totalProcessed.' aday kayıt yazıldı veya güncellendi.';
        $rest = [];
        if ($perSourceOk !== []) {
            $rest[] = 'Kaynaklar: '.implode(' · ', $perSourceOk).'.';
        }
        if ($errorParts !== []) {
            $rest[] = 'Uyarı: '.implode(' | ', $errorParts);
        }
        $message = $rest === [] ? $headline : $headline.' '.implode(' ', $rest);

        $status = $errorParts !== [] ? 'warning' : 'success';
        $report = self::minimalReport($status, $message, $totalProcessed, $rows);

        return ['message' => $message, 'report' => $report];
    }
}
