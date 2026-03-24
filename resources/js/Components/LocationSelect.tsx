import axios from 'axios';
import { useEffect, useRef, useState } from 'react';

interface Option {
    id: number;
    name: string;
}

interface LocationSelectProps {
    cityId: string | number;
    districtId: string | number;
    neighborhoodId: string | number;
    onCityChange: (v: string) => void;
    onDistrictChange: (v: string) => void;
    onNeighborhoodChange: (v: string) => void;
    /** Admin (açık tema) kartlarında okunaklı select stilleri */
    variant?: 'artist' | 'admin';
    cityError?: string;
    districtError?: string;
    neighborhoodError?: string;
    districtRequired?: boolean;
    neighborhoodRequired?: boolean;
}

export default function LocationSelect({
    cityId,
    districtId,
    neighborhoodId,
    onCityChange,
    onDistrictChange,
    onNeighborhoodChange,
    variant = 'artist',
    cityError,
    districtError,
    neighborhoodError,
    districtRequired = false,
    neighborhoodRequired = false,
}: LocationSelectProps) {
    const [provinces, setProvinces] = useState<Option[]>([]);
    const [districts, setDistricts] = useState<Option[]>([]);
    const [neighborhoods, setNeighborhoods] = useState<Option[]>([]);
    const [loadingProvinces, setLoadingProvinces] = useState(true);
    const [loadingDistricts, setLoadingDistricts] = useState(false);
    const [loadingNeighborhoods, setLoadingNeighborhoods] = useState(false);
    const [districtsLoadError, setDistrictsLoadError] = useState(false);

    const cityIdRef = useRef<string | number>(cityId);
    cityIdRef.current = cityId;
    const districtIdRef = useRef<string | number>(districtId);
    districtIdRef.current = districtId;

    useEffect(() => {
        const ac = new AbortController();
        axios
            .get('/api/locations/provinces', { signal: ac.signal })
            .then(({ data }) => {
                setProvinces(Array.isArray(data) ? data : []);
            })
            .catch(() => {
                setProvinces([]);
            })
            .finally(() => {
                setLoadingProvinces(false);
            });
        return () => ac.abort();
    }, []);

    useEffect(() => {
        if (!cityId) {
            setDistricts([]);
            setNeighborhoods([]);
            setDistrictsLoadError(false);
            onDistrictChange('');
            onNeighborhoodChange('');
            return;
        }
        const cid = String(cityId);
        const ac = new AbortController();
        setLoadingDistricts(true);
        setDistrictsLoadError(false);
        axios
            .get(`/api/locations/districts/${encodeURIComponent(cid)}`, { signal: ac.signal })
            .then(({ data }) => {
                if (String(cityIdRef.current) !== cid) {
                    return;
                }
                setDistricts(Array.isArray(data) ? data : []);
                setNeighborhoods([]);
            })
            .catch((err) => {
                if (axios.isCancel(err)) {
                    return;
                }
                if (String(cityIdRef.current) === cid) {
                    setDistricts([]);
                    setDistrictsLoadError(true);
                }
            })
            .finally(() => {
                if (String(cityIdRef.current) === cid) {
                    setLoadingDistricts(false);
                }
            });
        return () => ac.abort();
        // onDistrictChange / onNeighborhoodChange: parent’ta her render’da yeni fn → deps’e eklenmez
    }, [cityId]);

    useEffect(() => {
        if (!districtId) {
            setNeighborhoods([]);
            onNeighborhoodChange('');
            return;
        }
        const did = String(districtId);
        const ac = new AbortController();
        setLoadingNeighborhoods(true);
        axios
            .get(`/api/locations/neighborhoods/${encodeURIComponent(did)}`, { signal: ac.signal })
            .then(({ data }) => {
                if (String(districtIdRef.current) !== did) {
                    return;
                }
                setNeighborhoods(Array.isArray(data) ? data : []);
            })
            .catch((err) => {
                if (!axios.isCancel(err) && String(districtIdRef.current) === did) {
                    setNeighborhoods([]);
                }
            })
            .finally(() => {
                if (String(districtIdRef.current) === did) {
                    setLoadingNeighborhoods(false);
                }
            });
        return () => ac.abort();
    }, [districtId]);

    const selectClass =
        variant === 'admin'
            ? 'mt-2 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white'
            : 'mt-2 w-full rounded-xl border border-white/10 bg-zinc-800 px-4 py-3 text-white';

    const labelClass =
        variant === 'admin'
            ? 'block text-sm font-medium text-zinc-700 dark:text-zinc-400'
            : 'block text-sm font-medium text-zinc-400';

    return (
        <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="min-w-0">
                <label className={labelClass}>İl *</label>
                <select
                    value={cityId || ''}
                    onChange={(e) => onCityChange(e.target.value)}
                    required
                    className={selectClass}
                    disabled={loadingProvinces}
                >
                    <option value="">{loadingProvinces ? 'Yükleniyor...' : 'Seçin'}</option>
                    {provinces.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </select>
                {cityError && <p className="mt-1 text-sm text-red-400">{cityError}</p>}
            </div>
            <div className="min-w-0">
                <label className={labelClass}>
                    İlçe{districtRequired ? ' *' : ''}
                </label>
                <select
                    value={districtId || ''}
                    onChange={(e) => onDistrictChange(e.target.value)}
                    required={districtRequired}
                    className={selectClass}
                    disabled={loadingDistricts || !cityId}
                >
                    <option value="">{loadingDistricts ? 'Yükleniyor...' : 'Seçin'}</option>
                    {districts.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                </select>
                {districtError && <p className="mt-1 text-sm text-red-400">{districtError}</p>}
                {districtsLoadError && cityId ? (
                    <p className="mt-1 text-xs text-amber-700 dark:text-amber-200/90">
                        İlçe listesi yüklenemedi. Ağı kontrol edip sayfayı yenileyin veya il seçimini tekrarlayın.
                    </p>
                ) : null}
                {!districtsLoadError && !loadingDistricts && cityId && districts.length === 0 ? (
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
                        Bu il için ilçe kaydı bulunamadı. Birkaç saniye sonra tekrar deneyin; sorun sürerse şehir verisinde{' '}
                        <code className="rounded bg-zinc-200 px-1 text-[10px] dark:bg-zinc-700">external_id</code> eksik olabilir.
                    </p>
                ) : null}
            </div>
            <div className="min-w-0">
                <label className={labelClass}>
                    Mahalle{neighborhoodRequired ? ' *' : ''}
                </label>
                <select
                    value={neighborhoodId || ''}
                    onChange={(e) => onNeighborhoodChange(e.target.value)}
                    required={neighborhoodRequired}
                    className={selectClass}
                    disabled={loadingNeighborhoods || !districtId}
                >
                    <option value="">{loadingNeighborhoods ? 'Yükleniyor...' : 'Seçin'}</option>
                    {neighborhoods.map((n) => (
                        <option key={n.id} value={n.id}>{n.name}</option>
                    ))}
                </select>
                {neighborhoodError && <p className="mt-1 text-sm text-red-400">{neighborhoodError}</p>}
            </div>
        </div>
    );
}
