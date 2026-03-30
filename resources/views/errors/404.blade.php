<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex">
    <title>Sayfa bulunamadı (404) — {{ config('app.name', 'Sahnebul') }}</title>
    @php
        $e404fav = public_path('favicon.svg');
        $e404favV = is_file($e404fav) ? filemtime($e404fav) : time();
    @endphp
    <link rel="icon" href="{{ url('/favicon.svg') }}?v={{ $e404favV }}" type="image/svg+xml">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,600&display=swap" rel="stylesheet">
    <script>
        (function () {
            try {
                var k = 'sahnebul-theme';
                var t = localStorage.getItem(k);
                if (t === 'dark') {
                    document.documentElement.classList.add('dark');
                } else if (t === 'light') {
                    document.documentElement.classList.remove('dark');
                } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                    document.documentElement.classList.add('dark');
                }
            } catch (e) {}
        })();
    </script>
    <style>
        :root {
            --err-bg: #fafafa;
            --err-surface: #ffffff;
            --err-text: #18181b;
            --err-muted: #71717a;
            --err-border: #e4e4e7;
            --err-spot: rgba(245, 158, 11, 0.12);
        }
        html.dark {
            --err-bg: #09090b;
            --err-surface: #18181b;
            --err-text: #fafafa;
            --err-muted: #a1a1aa;
            --err-border: #3f3f46;
            --err-spot: rgba(245, 158, 11, 0.08);
        }
        *, *::before, *::after { box-sizing: border-box; }
        body {
            margin: 0;
            min-height: 100dvh;
            font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
            background: var(--err-bg);
            color: var(--err-text);
            -webkit-font-smoothing: antialiased;
        }
        .err-wrap {
            position: relative;
            min-height: 100dvh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 1.5rem 1rem 3rem;
            overflow: hidden;
        }
        .err-spotlight {
            pointer-events: none;
            position: absolute;
            inset: -40% -20% auto;
            height: 70vmin;
            background: radial-gradient(ellipse 60% 50% at 50% 0%, var(--err-spot), transparent 70%);
        }
        .err-grid {
            pointer-events: none;
            position: absolute;
            inset: 0;
            background-image:
                linear-gradient(var(--err-border) 1px, transparent 1px),
                linear-gradient(90deg, var(--err-border) 1px, transparent 1px);
            background-size: 48px 48px;
            opacity: 0.35;
            mask-image: radial-gradient(ellipse 80% 60% at 50% 40%, black, transparent);
        }
        html.dark .err-grid { opacity: 0.2; }
        .err-card {
            position: relative;
            width: 100%;
            max-width: 28rem;
            text-align: center;
            padding: 2.5rem 1.75rem 2rem;
            border-radius: 1.25rem;
            border: 1px solid var(--err-border);
            background: var(--err-surface);
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.12);
        }
        html.dark .err-card {
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }
        .err-code {
            font-size: clamp(4rem, 14vw, 6.5rem);
            font-weight: 800;
            line-height: 1;
            letter-spacing: -0.06em;
            background: linear-gradient(135deg, #f59e0b 0%, #d97706 45%, #fbbf24 100%);
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
            margin: 0 0 0.75rem;
        }
        .err-title {
            font-size: 1.25rem;
            font-weight: 700;
            margin: 0 0 0.5rem;
        }
        .err-desc {
            margin: 0 0 1.75rem;
            font-size: 0.9375rem;
            line-height: 1.6;
            color: var(--err-muted);
        }
        .err-actions {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
        }
        @media (min-width: 380px) {
            .err-actions { flex-direction: row; flex-wrap: wrap; justify-content: center; }
        }
        .err-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            padding: 0.65rem 1.25rem;
            font-size: 0.875rem;
            font-weight: 600;
            border-radius: 9999px;
            text-decoration: none;
            cursor: pointer;
            border: none;
            font-family: inherit;
            transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
        }
        .err-btn:active { transform: scale(0.98); }
        .err-btn--primary {
            background: #f59e0b;
            color: #18181b;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
        }
        .err-btn--primary:hover { background: #fbbf24; }
        .err-btn--ghost {
            background: transparent;
            color: var(--err-text);
            border: 1px solid var(--err-border);
        }
        .err-btn--ghost:hover { background: var(--err-bg); }
        .err-links {
            margin-top: 1.5rem;
            padding-top: 1.5rem;
            border-top: 1px solid var(--err-border);
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem 1rem;
            justify-content: center;
            font-size: 0.8125rem;
        }
        .err-links a {
            color: var(--err-muted);
            text-decoration: none;
            font-weight: 500;
        }
        .err-links a:hover { color: #f59e0b; }
        .err-brand {
            margin-bottom: 2rem;
            font-size: 1.125rem;
            font-weight: 800;
            letter-spacing: -0.02em;
            background: linear-gradient(90deg, #f59e0b, #ea580c);
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
        }
        .err-top {
            position: absolute;
            top: 1rem;
            right: 1rem;
            display: flex;
            gap: 0.5rem;
        }
        .err-theme {
            width: 2.5rem;
            height: 2.5rem;
            border-radius: 9999px;
            border: 1px solid var(--err-border);
            background: var(--err-surface);
            color: var(--err-text);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .err-theme:hover { border-color: #f59e0b; }
        .err-icon-sun, .err-icon-moon { width: 1.15rem; height: 1.15rem; }
        html.dark .err-icon-sun { display: block; }
        html:not(.dark) .err-icon-sun { display: none; }
        html.dark .err-icon-moon { display: none; }
        html:not(.dark) .err-icon-moon { display: block; }
    </style>
</head>
<body>
    <div class="err-wrap">
        <div class="err-spotlight" aria-hidden="true"></div>
        <div class="err-grid" aria-hidden="true"></div>
        <div class="err-top">
            <button type="button" class="err-theme" id="err-theme-toggle" aria-label="Tema">
                <svg class="err-icon-moon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.75" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" /></svg>
                <svg class="err-icon-sun" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.75" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" /></svg>
            </button>
        </div>
        <p class="err-brand">SAHNEBUL</p>
        <div class="err-card">
            <p class="err-code" aria-hidden="true">404</p>
            <h1 class="err-title">Sayfa bulunamadı</h1>
            <p class="err-desc">
                Aradığınız adres taşınmış, silinmiş veya hiç var olmamış olabilir. Ana sayfadan devam edebilir veya menüden keşfe dönebilirsiniz.
            </p>
            <div class="err-actions">
                <a href="{{ url('/') }}" class="err-btn err-btn--primary">Ana sayfa</a>
                <button type="button" class="err-btn err-btn--ghost" onclick="history.length > 1 ? history.back() : (location.href='{{ url('/') }}')">Geri dön</button>
            </div>
            <nav class="err-links" aria-label="Hızlı bağlantılar">
                <a href="{{ route('venues.index') }}">Mekanlar</a>
                <a href="{{ route('events.index') }}">Etkinlikler</a>
                <a href="{{ route('artists.index') }}">Sanatçılar</a>
                <a href="{{ route('blog.index') }}">Blog</a>
            </nav>
        </div>
    </div>
    <script>
        (function () {
            var k = 'sahnebul-theme';
            var btn = document.getElementById('err-theme-toggle');
            if (!btn) return;
            btn.addEventListener('click', function () {
                var d = document.documentElement.classList.toggle('dark');
                try {
                    localStorage.setItem(k, d ? 'dark' : 'light');
                } catch (e) {}
            });
        })();
    </script>
</body>
</html>
