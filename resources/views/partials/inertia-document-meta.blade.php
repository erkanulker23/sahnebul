{{-- İlk tam sayfa yanıtında sosyal önizleme ve arama motorları için sunucu tarafı meta (JS gerekmez) --}}
<title>{{ $doc['title'] }}</title>
@foreach ($doc['tags'] as $tag)
    @if (($tag['t'] ?? '') === 'meta')
        <meta @foreach ($tag['attrs'] ?? [] as $k => $v) {{ $k }}="{{ e($v) }}" @endforeach>
    @elseif (($tag['t'] ?? '') === 'link')
        <link @foreach ($tag['attrs'] ?? [] as $k => $v) {{ $k }}="{{ e($v) }}" @endforeach>
    @endif
@endforeach
@if (! empty($doc['jsonLd']))
    <script type="application/ld+json">{!! json_encode($doc['jsonLd'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) !!}</script>
@endif
