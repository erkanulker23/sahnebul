import 'leaflet/dist/leaflet.css';

import { cn } from '@/lib/cn';
import { useTheme } from '@/contexts/ThemeContext';
import { Link } from '@inertiajs/react';
import L from 'leaflet';
import { useCallback, useEffect, useMemo } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';

export type LiveSceneMapEvent = {
    id: number;
    title: string;
    slug: string;
    event_type: string | null;
    start_date: string | null;
    end_date: string | null;
    segment: string;
};

export type LiveSceneSpot = {
    venue_id: number;
    name: string;
    slug: string;
    lat: number;
    lng: number;
    address: string | null;
    city_name?: string | null;
    category_name?: string | null;
    event_count: number;
    intensity: number;
    events: LiveSceneMapEvent[];
};

/** Yoğunluk bandı — ana sayfadaki göstergeyle aynı dil */
function intensityBand(intensity: number): 0 | 1 | 2 | 3 {
    if (intensity >= 0.75) {
        return 3;
    }
    if (intensity >= 0.5) {
        return 2;
    }
    if (intensity >= 0.25) {
        return 1;
    }
    return 0;
}

function eventTypeShort(type: string | null): string | null {
    if (!type || type === '') {
        return null;
    }
    const map: Record<string, string> = {
        konser: 'Konser',
        tiyatro: 'Tiyatro',
        festival: 'Festival',
        'stand-up': 'Stand-up',
        'cocuk-aktiviteleri': 'Çocuk',
        workshop: 'Workshop',
    };

    return map[type] ?? type;
}

function venueDivIcon(spot: LiveSceneSpot, highlight: boolean, isDark: boolean): L.DivIcon {
    const tier = intensityBand(spot.intensity);
    const palette = [
        { core: '#16a34a', soft: 'rgba(34, 197, 94, 0.35)', label: 'Sakin' },
        { core: '#ca8a04', soft: 'rgba(234, 179, 8, 0.4)', label: 'Hareketli' },
        { core: '#d97706', soft: 'rgba(245, 158, 11, 0.45)', label: 'Kalabalık' },
        { core: '#dc2626', soft: 'rgba(239, 68, 68, 0.4)', label: 'Yoğun' },
    ];
    const p = palette[tier];
    const bg = isDark ? 'rgba(24,24,27,0.94)' : 'rgba(255,255,255,0.96)';
    const fg = isDark ? '#fafafa' : '#18181b';
    const accentRing = highlight ? '0 0 0 3px rgba(245, 158, 11, 0.75)' : `0 0 0 2px ${p.soft}`;
    const scale = highlight ? 1.06 : 1;
    const n = spot.event_count;

    const html = `
<div class="sls-pin-wrap" style="transform:scale(${scale});transform-origin:center bottom;">
  <div class="sls-pin ${highlight ? 'sls-pin--pulse' : ''}" style="
    width:50px;
    height:50px;
    border-radius:9999px;
    background:${bg};
    color:${fg};
    border:3px solid ${p.core};
    box-shadow:${accentRing}, 0 8px 28px rgba(0,0,0,0.28), 0 0 32px ${p.soft};
    display:flex;
    flex-direction:column;
    align-items:center;
    justify-content:center;
    font-family:Plus Jakarta Sans,ui-sans-serif,system-ui,sans-serif;
  ">
    <span style="font-size:17px;font-weight:800;line-height:1;letter-spacing:-0.02em;">${n}</span>
    <span style="font-size:6.5px;font-weight:700;color:${p.core};letter-spacing:0.14em;text-transform:uppercase;margin-top:3px;opacity:0.95;">${p.label}</span>
  </div>
  <div style="
    margin:-2px auto 0;
    width:0;height:0;
    border-left:9px solid transparent;
    border-right:9px solid transparent;
    border-top:10px solid ${p.core};
    filter:drop-shadow(0 2px 3px rgba(0,0,0,0.2));
  " aria-hidden="true"></div>
</div>`.trim();

    return L.divIcon({
        className: 'sls-divicon',
        html,
        iconSize: [50, 62],
        iconAnchor: [25, 62],
        popupAnchor: [0, -58],
    });
}

function formatStartLabel(iso: string | null): string {
    if (!iso) {
        return 'Saat —';
    }
    try {
        return new Intl.DateTimeFormat('tr-TR', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
        }).format(new Date(iso));
    } catch {
        return iso;
    }
}

function FitBounds({ spots }: Readonly<{ spots: LiveSceneSpot[] }>) {
    const map = useMap();
    useEffect(() => {
        if (spots.length === 0) {
            map.setView([39.1, 35.2], 6);
            return;
        }
        const bounds = L.latLngBounds(spots.map((s) => [s.lat, s.lng] as [number, number]));
        if (!bounds.isValid()) {
            return;
        }
        map.fitBounds(bounds, { padding: [56, 56], maxZoom: 12, animate: true });
    }, [map, spots]);
    return null;
}

function FlyToHighlight({
    venueId,
    spots,
}: Readonly<{
    venueId: number | null;
    spots: LiveSceneSpot[];
}>) {
    const map = useMap();
    useEffect(() => {
        if (venueId === null) {
            return;
        }
        const s = spots.find((x) => x.venue_id === venueId);
        if (!s) {
            return;
        }
        map.flyTo([s.lat, s.lng], Math.max(map.getZoom(), 13), { duration: 0.85 });
    }, [map, venueId, spots]);
    return null;
}

export default function LiveSceneHeatMap({
    spots,
    highlightVenueId,
    className,
}: Readonly<{
    spots: LiveSceneSpot[];
    highlightVenueId: number | null;
    className?: string;
}>) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const tile = useMemo(
        () =>
            isDark
                ? {
                      url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
                      attribution:
                          '&copy; OpenStreetMap &copy; <a href="https://carto.com/attributions" rel="noreferrer">CARTO</a>',
                  }
                : {
                      url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
                      attribution:
                          '&copy; OpenStreetMap &copy; <a href="https://carto.com/attributions" rel="noreferrer">CARTO</a>',
                  },
        [isDark]
    );

    const directionsUrl = useCallback((lat: number, lng: number) => {
        return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    }, []);

    return (
        <MapContainer
            center={[39.1, 35.2]}
            zoom={6}
            className={cn(
                'live-scene-map z-0 h-full min-h-[320px] w-full rounded-2xl font-sans [&_.leaflet-control-zoom]:overflow-hidden [&_.leaflet-control-zoom]:rounded-xl [&_.leaflet-control-zoom]:border [&_.leaflet-control-zoom]:border-zinc-200/90 [&_.leaflet-control-zoom]:shadow-md dark:[&_.leaflet-control-zoom]:border-zinc-600/60 dark:[&_.leaflet-control-zoom]:bg-zinc-900/90 [&_.leaflet-control-zoom_a]:text-zinc-800 [&_.leaflet-control-zoom_a]:dark:text-zinc-200',
                className
            )}
            scrollWheelZoom
        >
            <TileLayer key={tile.url} attribution={tile.attribution} url={tile.url} />
            <FitBounds spots={spots} />
            <FlyToHighlight venueId={highlightVenueId} spots={spots} />
            {spots.map((s) => {
                const isHi = highlightVenueId === s.venue_id;
                const icon = venueDivIcon(s, isHi, isDark);
                return (
                    <Marker key={s.venue_id} position={[s.lat, s.lng]} icon={icon}>
                        <Popup
                            className="sahnebul-live-popup"
                            maxWidth={340}
                            minWidth={280}
                            autoPan
                            autoPanPadding={[16, 16]}
                        >
                            <div className="live-scene-popup-card text-left text-zinc-900 dark:text-zinc-50">
                                <div className="relative overflow-hidden border-b border-zinc-200/90 bg-gradient-to-br from-amber-500/[0.18] via-amber-400/[0.08] to-transparent px-4 py-3.5 dark:border-zinc-600/80 dark:from-amber-500/15 dark:via-amber-600/10">
                                    <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-amber-400/20 blur-2xl dark:bg-amber-400/10" />
                                    <p className="relative text-[10px] font-bold uppercase tracking-[0.2em] text-amber-800 dark:text-amber-300/95">
                                        Anlık sahne
                                    </p>
                                    <h3 className="font-display relative mt-1.5 text-lg font-bold leading-snug tracking-tight">{s.name}</h3>
                                    <div className="relative mt-2 flex flex-wrap items-center gap-2">
                                        <span className="inline-flex items-center rounded-full bg-zinc-900 px-2.5 py-0.5 text-[11px] font-bold text-white shadow-sm dark:bg-amber-400 dark:text-zinc-950">
                                            {s.event_count} etkinlik
                                        </span>
                                        {intensityBand(s.intensity) === 3 ? (
                                            <span className="text-[11px] font-semibold text-red-700 dark:text-red-400">Yoğun nokta</span>
                                        ) : null}
                                    </div>
                                    {(s.category_name || s.city_name) && (
                                        <p className="relative mt-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                                            {[s.category_name, s.city_name].filter(Boolean).join(' · ')}
                                        </p>
                                    )}
                                    {s.address ? (
                                        <p className="relative mt-1 max-w-[18rem] text-xs leading-relaxed text-zinc-500 dark:text-zinc-500">{s.address}</p>
                                    ) : null}
                                </div>
                                <ul className="max-h-44 space-y-0 overflow-y-auto overscroll-contain">
                                    {s.events.map((ev, idx) => {
                                        const typeLab = eventTypeShort(ev.event_type);
                                        return (
                                            <li
                                                key={ev.id}
                                                className={cn(
                                                    'border-b border-zinc-100 px-4 py-2.5 transition last:border-b-0 dark:border-zinc-700/80',
                                                    idx % 2 === 1 && 'bg-zinc-50/80 dark:bg-zinc-800/40'
                                                )}
                                            >
                                                <div className="flex flex-wrap items-baseline gap-2">
                                                    <Link
                                                        href={route('events.show', ev.segment)}
                                                        className="min-w-0 flex-1 text-sm font-semibold text-amber-800 decoration-amber-500/50 underline-offset-4 transition hover:text-amber-600 hover:underline dark:text-amber-400 dark:hover:text-amber-300"
                                                    >
                                                        {ev.title}
                                                    </Link>
                                                    {typeLab ? (
                                                        <span className="shrink-0 rounded-md border border-zinc-200 bg-white px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
                                                            {typeLab}
                                                        </span>
                                                    ) : null}
                                                </div>
                                                <p className="mt-0.5 text-[11px] font-medium tabular-nums text-zinc-500 dark:text-zinc-500">
                                                    {formatStartLabel(ev.start_date)}
                                                </p>
                                            </li>
                                        );
                                    })}
                                </ul>
                                <div className="flex flex-wrap gap-2 border-t border-zinc-200 bg-zinc-50/90 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800/50">
                                    <a
                                        href={route('venues.show', s.slug)}
                                        className="inline-flex flex-1 items-center justify-center rounded-xl border border-zinc-200/90 bg-white px-3 py-2 text-center text-xs font-semibold text-zinc-800 shadow-sm transition hover:border-amber-400/60 hover:bg-amber-50/80 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-amber-500/50 dark:hover:bg-zinc-800 sm:flex-none"
                                    >
                                        Mekân sayfası
                                    </a>
                                    <a
                                        href={directionsUrl(s.lat, s.lng)}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex flex-1 items-center justify-center rounded-xl bg-gradient-to-b from-amber-400 to-amber-500 px-3 py-2 text-center text-xs font-bold text-zinc-950 shadow-md shadow-amber-500/20 transition hover:from-amber-300 hover:to-amber-400 sm:flex-none"
                                    >
                                        Yol tarifi
                                    </a>
                                </div>
                            </div>
                        </Popup>
                    </Marker>
                );
            })}
        </MapContainer>
    );
}
