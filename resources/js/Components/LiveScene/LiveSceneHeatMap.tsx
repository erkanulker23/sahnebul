import 'leaflet/dist/leaflet.css';

import { cn } from '@/lib/cn';
import { useTheme } from '@/contexts/ThemeContext';
import { Link } from '@inertiajs/react';
import L from 'leaflet';
import { useCallback, useEffect, useMemo } from 'react';
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet';

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

function heatStroke(intensity: number): string {
    if (intensity >= 0.75) {
        return '#b91c1c';
    }
    if (intensity >= 0.5) {
        return '#c2410c';
    }
    if (intensity >= 0.25) {
        return '#a16207';
    }
    return '#15803d';
}

function heatFill(intensity: number): string {
    if (intensity >= 0.75) {
        return '#ef4444';
    }
    if (intensity >= 0.5) {
        return '#f97316';
    }
    if (intensity >= 0.25) {
        return '#eab308';
    }
    return '#22c55e';
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
        map.fitBounds(bounds, { padding: [48, 48], maxZoom: 12, animate: true });
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
            className={cn('z-0 h-full min-h-[320px] w-full rounded-2xl [&_.leaflet-control-zoom]:rounded-lg', className)}
            scrollWheelZoom
        >
            <TileLayer key={tile.url} attribution={tile.attribution} url={tile.url} />
            <FitBounds spots={spots} />
            <FlyToHighlight venueId={highlightVenueId} spots={spots} />
            {spots.map((s) => {
                const r = 12 + s.intensity * 34;
                const isHi = highlightVenueId === s.venue_id;
                return (
                    <CircleMarker
                        key={s.venue_id}
                        center={[s.lat, s.lng]}
                        radius={r}
                        pathOptions={{
                            color: heatStroke(s.intensity),
                            fillColor: heatFill(s.intensity),
                            fillOpacity: isHi ? 0.72 : 0.58,
                            weight: isHi ? 4 : 2,
                            opacity: isHi ? 1 : 0.92,
                        }}
                    >
                        <Popup className="min-w-[220px] max-w-[min(90vw,320px)]" autoPan>
                            <div className="space-y-2 text-zinc-900">
                                <div>
                                    <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">Yoğunluk</p>
                                    <p className="font-display text-base font-bold leading-tight">
                                        {s.name}
                                        <span className="ml-2 inline-block rounded-full bg-zinc-900 px-2 py-0.5 text-xs font-bold text-white">
                                            {s.event_count} etkinlik
                                        </span>
                                    </p>
                                    {(s.category_name || s.city_name) && (
                                        <p className="mt-0.5 text-xs text-zinc-600">
                                            {[s.category_name, s.city_name].filter(Boolean).join(' · ')}
                                        </p>
                                    )}
                                    {s.address ? <p className="mt-1 text-xs text-zinc-500">{s.address}</p> : null}
                                </div>
                                <ul className="max-h-40 space-y-2 overflow-y-auto border-t border-zinc-200 pt-2">
                                    {s.events.map((ev) => (
                                        <li key={ev.id}>
                                            <Link
                                                href={route('events.show', ev.segment)}
                                                className="block text-sm font-semibold text-amber-700 underline underline-offset-2 hover:text-amber-600"
                                            >
                                                {ev.title}
                                            </Link>
                                            <p className="text-[11px] text-zinc-500">{formatStartLabel(ev.start_date)}</p>
                                        </li>
                                    ))}
                                </ul>
                                <div className="flex flex-wrap gap-2 border-t border-zinc-200 pt-2">
                                    <a
                                        href={route('venues.show', s.slug)}
                                        className="inline-flex items-center justify-center rounded-lg bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-900 hover:bg-zinc-200"
                                    >
                                        Mekân
                                    </a>
                                    <a
                                        href={directionsUrl(s.lat, s.lng)}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center justify-center rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-zinc-950 hover:bg-amber-400"
                                    >
                                        Yol tarifi
                                    </a>
                                </div>
                            </div>
                        </Popup>
                    </CircleMarker>
                );
            })}
        </MapContainer>
    );
}
