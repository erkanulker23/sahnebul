<?php

namespace App\Services\Admin;

use Illuminate\Http\UploadedFile;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

final class AdminSpreadsheetIo
{
    /**
     * @param  list<string>  $headers
     * @param  iterable<list<string|int|float|null>>  $rows
     */
    public static function downloadXlsx(string $filename, array $headers, iterable $rows): StreamedResponse
    {
        $spreadsheet = new Spreadsheet;
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->fromArray($headers, null, 'A1');
        $i = 2;
        foreach ($rows as $row) {
            $sheet->fromArray($row, null, 'A'.$i);
            $i++;
        }

        return response()->streamDownload(function () use ($spreadsheet): void {
            (new Xlsx($spreadsheet))->save('php://output');
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    /**
     * @return list<array<string, string|null>>
     */
    public static function readAssocRows(UploadedFile $file): array
    {
        $path = $file->getRealPath();
        if ($path === false) {
            return [];
        }

        $spreadsheet = IOFactory::load($path);
        $sheet = $spreadsheet->getActiveSheet();
        $highestRow = (int) $sheet->getHighestDataRow();
        $highestColumn = $sheet->getHighestDataColumn();
        if ($highestRow < 1) {
            return [];
        }

        $raw = $sheet->rangeToArray('A1:'.$highestColumn.$highestRow, null, true, false);
        if ($raw === []) {
            return [];
        }

        $headerRow = array_shift($raw);
        $headers = [];
        foreach ($headerRow as $idx => $h) {
            $key = is_string($h) ? trim($h) : '';
            if ($key === '') {
                $key = '__col_'.$idx;
            }
            $headers[$idx] = $key;
        }

        $out = [];
        foreach ($raw as $r) {
            $assoc = [];
            foreach ($headers as $i => $key) {
                if (str_starts_with($key, '__col_')) {
                    continue;
                }
                $val = $r[$i] ?? null;
                $assoc[$key] = self::cellToNullableString($val);
            }

            $nonEmpty = false;
            foreach ($assoc as $v) {
                if ($v !== null && $v !== '') {
                    $nonEmpty = true;
                    break;
                }
            }
            if (! $nonEmpty) {
                continue;
            }

            $out[] = $assoc;
        }

        return $out;
    }

    private static function cellToNullableString(mixed $v): ?string
    {
        if ($v === null) {
            return null;
        }
        if ($v instanceof \DateTimeInterface) {
            return $v->format('Y-m-d H:i:s');
        }
        if (is_bool($v)) {
            return $v ? '1' : '0';
        }
        $s = trim((string) $v);

        return $s === '' ? null : $s;
    }
}
