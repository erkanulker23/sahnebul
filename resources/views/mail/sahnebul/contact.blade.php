@extends('mail.sahnebul.layout', ['title' => 'İletişim formu', 'appUrl' => rtrim((string) config('app.url'), '/')])

@section('content')
    <h1 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#18181b;">İletişim formu mesajı</h1>
    <p style="margin:0 0 8px;"><strong>Gönderen:</strong> {{ $contactMessage->name }}</p>
    <p style="margin:0 0 8px;"><strong>E-posta:</strong> <a href="mailto:{{ $contactMessage->email }}">{{ $contactMessage->email }}</a></p>
    @if($contactMessage->subject)
        <p style="margin:0 0 8px;"><strong>Konu:</strong> {{ $contactMessage->subject }}</p>
    @endif
    <p style="margin:16px 0 0;padding-top:16px;border-top:1px solid #e4e4e7;"><strong>Mesaj</strong></p>
    <p style="margin:8px 0 0;white-space:pre-wrap;">{{ $contactMessage->message }}</p>
@endsection
