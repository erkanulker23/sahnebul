{{ $title }}

@foreach($introLines as $line)
{{ strip_tags($line) }}

@endforeach
@if(!empty($detailLines))
@foreach($detailLines as $line)
- {{ strip_tags($line) }}
@endforeach

@endif
@if(!empty($actionUrl) && !empty($actionLabel))
{{ $actionLabel }}: {{ $actionUrl }}

@endif
@if(!empty($footnote))
{{ strip_tags($footnote) }}
@endif

— {{ config('app.name') }}
{{ rtrim((string) config('app.url'), '/') }}
