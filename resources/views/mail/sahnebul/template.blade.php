@extends('mail.sahnebul.layout', ['title' => $emailSubject, 'appUrl' => rtrim((string) config('app.url'), '/')])

@section('content')
    <h1 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#18181b;">{{ $title }}</h1>
    @foreach($introLines as $line)
        <p style="margin:0 0 12px;">{!! $line !!}</p>
    @endforeach
    @if(!empty($detailLines))
        <ul style="margin:16px 0;padding-left:20px;color:#52525b;">
            @foreach($detailLines as $line)
                <li style="margin-bottom:6px;">{!! $line !!}</li>
            @endforeach
        </ul>
    @endif
    @if(!empty($actionUrl) && !empty($actionLabel))
        <p style="margin:24px 0 0;">
            <a href="{{ $actionUrl }}" style="display:inline-block;background-color:#f59e0b;color:#18181b;font-weight:600;text-decoration:none;padding:12px 22px;border-radius:10px;">{{ $actionLabel }}</a>
        </p>
    @endif
    @if(!empty($footnote))
        <p style="margin:20px 0 0;font-size:13px;color:#71717a;">{!! $footnote !!}</p>
    @endif
@endsection
