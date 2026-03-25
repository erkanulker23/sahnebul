<x-mail::message>
# Yarın etkinliğiniz var

Merhaba {{ $user->name }},

Hatırlatma listesine eklediğiniz etkinlik **yarın** gerçekleşecek:

**{{ $event->title }}**  
@if($event->venue)
{{ $event->venue->name }}
@endif  
@if($event->start_date)
{{ $event->start_date->timezone(config('app.timezone'))->locale('tr')->isoFormat('D MMMM YYYY, HH:mm') }}
@endif

<x-mail::button :url="route('events.show', ['event' => $event->publicUrlSegment()], absolute: true)">
Etkinlik sayfasına git
</x-mail::button>

İyi eğlenceler,<br>
{{ config('app.name') }}
</x-mail::message>
