{{-- İlk tam sayfa yanıtında sosyal önizleme ve arama motorları için sunucu tarafı meta (JS gerekmez) --}}
<title inertia>{{ $doc['title'] }}</title>
@foreach ($doc['tags'] as $tag)
    @if (($tag['t'] ?? '') === 'meta')
        <meta inertia @foreach ($tag['attrs'] ?? [] as $k => $v) {{ $k }}="{{ e($v) }}" @endforeach>
    @elseif (($tag['t'] ?? '') === 'link')
        <link inertia @foreach ($tag['attrs'] ?? [] as $k => $v) {{ $k }}="{{ e($v) }}" @endforeach>
    @endif
@endforeach
@if (! empty($doc['jsonLd']))
    <script inertia type="application/ld+json">{!! json_encode($doc['jsonLd'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) !!}</script>
@endif
