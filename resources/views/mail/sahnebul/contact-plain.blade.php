İletişim formu — {{ config('app.name') }}

Gönderen: {{ $contactMessage->name }}
E-posta: {{ $contactMessage->email }}
@if($contactMessage->subject)
Konu: {{ $contactMessage->subject }}
@endif

Mesaj:
{{ $contactMessage->message }}
