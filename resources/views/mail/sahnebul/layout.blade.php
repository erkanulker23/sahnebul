<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $title ?? config('app.name') }}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f4f5;padding:24px 12px;">
    <tr>
        <td align="center">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
                <tr>
                    <td style="background:linear-gradient(135deg,#18181b 0%,#27272a 100%);padding:20px 24px;text-align:center;">
                        <span style="font-size:20px;font-weight:800;letter-spacing:0.06em;color:#fbbf24;">SAHNEBUL</span>
                    </td>
                </tr>
                <tr>
                    <td style="padding:28px 24px 32px;color:#3f3f46;font-size:15px;line-height:1.6;">
                        @yield('content')
                    </td>
                </tr>
                <tr>
                    <td style="padding:16px 24px;background-color:#fafafa;border-top:1px solid #e4e4e7;font-size:12px;color:#71717a;text-align:center;">
                        {{ config('app.name') }} · Bu e-posta otomatik gönderilmiştir.
                        @if(!empty($appUrl))
                            <br><a href="{{ $appUrl }}" style="color:#d97706;text-decoration:none;">{{ $appUrl }}</a>
                        @endif
                    </td>
                </tr>
            </table>
        </td>
    </tr>
</table>
</body>
</html>
