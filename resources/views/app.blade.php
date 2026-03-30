@php
    /**
     * Yerelde `npm run dev` → public/hot; üretimde `npm run build` → public/build/manifest.json.
     * Üretimde yanlışlıkla kalan `public/hot` dosyası `viteReady` true yapıp @vite'i manifest'e zorlar → 500.
     */
    $hasManifest = is_file(public_path('build/manifest.json'));
    $hasHot = is_file(public_path('hot'));
    $viteReady = $hasManifest || ($hasHot && ! app()->environment('production'));
@endphp
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
        @php
            $faviconPathOnly = is_string($inertiaFavicon) ? strtolower((string) (parse_url($inertiaFavicon, PHP_URL_PATH) ?: '')) : '';
        @endphp
        @if ($faviconPathOnly === '/favicon.svg')
            @php
                $defaultIco = public_path('favicon.ico');
                $defaultIcoVer = is_file($defaultIco) ? filemtime($defaultIco) : time();
            @endphp
            {{-- Bazı istemciler yalnızca /favicon.ico ister; varsayılan SVG ile aynı görsel --}}
            <link rel="icon" type="image/x-icon" href="{{ url('/favicon.ico') }}?v={{ $defaultIcoVer }}">
        @endif
        <link rel="manifest" href="{{ url('/manifest.webmanifest') }}">
        <meta name="theme-color" content="#ea580c" media="(prefers-color-scheme: light)">
        <meta name="theme-color" content="#18181b" media="(prefers-color-scheme: dark)">
        <meta name="mobile-web-app-capable" content="yes">
        <meta name="apple-mobile-web-app-capable" content="yes">
        <meta name="apple-mobile-web-app-title" content="Sahnebul">
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
        <link rel="apple-touch-icon" href="{{ url('/icons/apple-touch-icon.png') }}">
        @if ($viteReady && $inertiaDocumentMeta !== null)
            @include('partials.inertia-document-meta', ['doc' => $inertiaDocumentMeta])
        @elseif ($viteReady)
            <title inertia>{{ config('app.name', 'Sahnebul') }}</title>
        @else
            <title>Ön yüz derlemesi eksik — {{ config('app.name', 'Sahnebul') }}</title>
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

        @if ($viteReady)
            <!-- Scripts -->
            @routes
            @viteReactRefresh
            @vite(['resources/js/app.tsx'])
            @inertiaHead
            @php
                $customHeadHtml = null;
                if (isset($page) && is_array($page) && isset($page['props']['seo']['customHeadHtml']) && is_string($page['props']['seo']['customHeadHtml'])) {
                    $t = trim($page['props']['seo']['customHeadHtml']);
                    $customHeadHtml = $t !== '' ? $t : null;
                }
            @endphp
            @if (is_string($customHeadHtml) && $customHeadHtml !== '')
                {!! $customHeadHtml !!}
            @endif
        @endif
    </head>
    <body class="font-sans antialiased bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
        @if ($viteReady)
            @inertia
            @php
                $customBodyHtml = null;
                if (isset($page) && is_array($page) && isset($page['props']['seo']['customBodyHtml']) && is_string($page['props']['seo']['customBodyHtml'])) {
                    $tb = trim($page['props']['seo']['customBodyHtml']);
                    $customBodyHtml = $tb !== '' ? $tb : null;
                }
            @endphp
            @if (is_string($customBodyHtml) && $customBodyHtml !== '')
                {!! $customBodyHtml !!}
            @endif
        @else
            <div class="mx-auto max-w-lg px-6 py-16 text-center">
                <p class="text-sm font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">Dağıtım</p>
                <h1 class="mt-3 text-2xl font-bold text-zinc-900 dark:text-white">Ön yüz paketleri bulunamadı</h1>
                <p class="mt-4 text-left text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                    Sunucuda <code class="rounded bg-zinc-200 px-1 py-0.5 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">public/build/manifest.json</code>
                    yok (ve geliştirme modu <code class="rounded bg-zinc-200 px-1 py-0.5 dark:bg-zinc-800">public/hot</code> de yok).
                    Laravel Vite bu yüzden sayfayı oluşturamıyor.
                </p>
                <p class="mt-4 text-left text-sm text-zinc-600 dark:text-zinc-400">
                    <strong class="text-zinc-800 dark:text-zinc-200">Forge:</strong> Deploy betiğinde proje kökünde
                    <code class="rounded bg-zinc-200 px-1 py-0.5 dark:bg-zinc-800">npm ci</code> ve
                    <code class="rounded bg-zinc-200 px-1 py-0.5 dark:bg-zinc-800">npm run build:deploy</code>
                    çalıştığından emin olun. Repodaki <code class="rounded bg-zinc-200 px-1 py-0.5 dark:bg-zinc-800">scripts/forge-deploy.sh</code>
                    örneğini kullanabilirsiniz; betik derleme sonrası manifest dosyasını doğrular.
                </p>
                <p class="mt-4 text-left text-xs text-zinc-500">
                    SSH: <code class="break-all rounded bg-zinc-100 px-1 py-0.5 dark:bg-zinc-900">cd {{ base_path() }} &amp;&amp; npm ci &amp;&amp; npm run build:deploy</code>
                </p>
            </div>
        @endif
    </body>
</html>
