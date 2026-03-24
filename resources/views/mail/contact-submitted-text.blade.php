Sahnebul iletişim formu
=======================

Gönderen: {{ $contactMessage->name }}
E-posta: {{ $contactMessage->email }}
@if($contactMessage->phone)
Telefon: {{ $contactMessage->phone }}
@endif
@if($contactMessage->subject)
Konu: {{ $contactMessage->subject }}
@endif

Mesaj:
-----
{{ $contactMessage->message }}

-----
Kayıt #{{ $contactMessage->id }} · {{ $contactMessage->created_at?->timezone(config('app.timezone'))->format('d.m.Y H:i') }}
