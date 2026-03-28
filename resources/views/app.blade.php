<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="csrf-token" content="{{ csrf_token() }}">

        @php
            $inertiaDocumentMeta = isset($page) && is_array($page)
                ? \App\Support\InertiaDocumentMeta::fromInertiaPage($page)
                : null;
            $inertiaFavicon = null;
            if (isset($page) && is_array($page) && isset($page['props']) && is_array($page['props'])) {
                $seo = $page['props']['seo'] ?? null;
                if (is_array($seo) && ! empty($seo['faviconUrl']) && is_string($seo['faviconUrl'])) {
                    $inertiaFavicon = $seo['faviconUrl'];
                }
            }
        @endphp
        @if (is_string($inertiaFavicon) && $inertiaFavicon !== '')
            <link rel="icon" href="{{ $inertiaFavicon }}" @if (str_ends_with(strtolower(parse_url($inertiaFavicon, PHP_URL_PATH) ?: ''), '.svg')) type="image/svg+xml" @endif>
        @endif
        <link rel="manifest" href="{{ url('/manifest.webmanifest') }}">
        <meta name="theme-color" content="#ea580c" media="(prefers-color-scheme: light)">
        <meta name="theme-color" content="#18181b" media="(prefers-color-scheme: dark)">
        <meta name="mobile-web-app-capable" content="yes">
        <meta name="apple-mobile-web-app-capable" content="yes">
        <meta name="apple-mobile-web-app-title" content="Sahnebul">
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
        <link rel="apple-touch-icon" href="{{ url('/icons/apple-touch-icon.png') }}">
        @if ($inertiaDocumentMeta !== null)
            @include('partials.inertia-document-meta', ['doc' => $inertiaDocumentMeta])
        @else
            <title inertia>{{ config('app.name', 'Sahnebul') }}</title>
        @endif

        {{-- Plus Jakarta Sans: Vite / @fontsource (app.css) — Google Fonts kritik zinciri kaldırıldı --}}

        {{-- FOUC önleme: React yüklenmeden önce .dark sınıfı --}}
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

        <!-- Scripts -->
        @routes
        @viteReactRefresh
        @vite(['resources/js/app.tsx'])
        @inertiaHead
    </head>
    <body class="font-sans antialiased bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
        @inertia
    </body>
</html>
