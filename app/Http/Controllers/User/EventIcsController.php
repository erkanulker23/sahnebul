<?php

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use App\Models\Event;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class EventIcsController extends Controller
{
    public function show(Request $request, int $event): Response
    {
        $model = Event::query()->with('venue:id,name,slug,status')->findOrFail($event);
        abort_unless($model->status === 'published' && $model->venue?->status === 'approved', 404);

        $user = $request->user();
        $hasReminder = $user->remindedEvents()->whereKey($model->id)->exists();
        abort_unless($hasReminder, 403);

        $start = $model->start_date;
        $end = $model->end_date ?? $start?->copy()->addHours(2);
        if ($start === null) {
            abort(404);
        }

        $uid = 'event-'.$model->id.'@sahnebul';
        $stamp = gmdate('Ymd\THis\Z');
        $dtStart = $start->copy()->utc()->format('Ymd\THis\Z');
        $dtEnd = $end !== null ? $end->copy()->utc()->format('Ymd\THis\Z') : $start->copy()->addHours(2)->utc()->format('Ymd\THis\Z');
        $summary = str_replace(["\r", "\n", ',', ';'], ['', '', ' ', ' '], $model->title);
        $location = $model->venue?->name !== null
            ? str_replace(["\r", "\n", ',', ';'], ['', '', ' ', ' '], $model->venue->name)
            : '';

        $ics = "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Sahnebul//TR\r\nCALSCALE:GREGORIAN\r\nBEGIN:VEVENT\r\nUID:{$uid}\r\nDTSTAMP:{$stamp}\r\nDTSTART:{$dtStart}\r\nDTEND:{$dtEnd}\r\nSUMMARY:{$summary}\r\nLOCATION:{$location}\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n";

        return response($ics, 200, [
            'Content-Type' => 'text/calendar; charset=utf-8',
            'Content-Disposition' => 'attachment; filename="etkinlik-'.$model->id.'.ics"',
        ]);
    }
}
