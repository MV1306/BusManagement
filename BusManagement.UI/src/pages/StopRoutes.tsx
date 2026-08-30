import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { stopsApi, type Stop, type StopRouteResult, type StopRoutesResponse } from '../api';
import StopAutocomplete from '../components/StopAutocomplete';
import '../theme-coverage.css';
import '../theme-stoproutes.css';

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const ROUTE_COLORS = [
  '#6366f1','#06b6d4','#10b981','#f59e0b','#ef4444',
  '#8b5cf6','#ec4899','#14b8a6','#f97316','#3b82f6',
  '#a855f7','#22d3ee','#84cc16','#fb923c',
];

export default function StopRoutes() {
  const [stops, setStops]           = useState<Stop[]>([]);
  const [stopId, setStopId]         = useState('');
  const [result, setResult]         = useState<StopRoutesResponse | null>(null);
  const [loading, setLoading]       = useState(false);
  const [stopsLoading, setStopsLoading] = useState(true);
  const [error, setError]           = useState('');
  const [selectedRoutes, setSelectedRoutes] = useState<Set<number>>(new Set());
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const mapRef         = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const routeLayersRef = useRef<Map<number, L.Layer[]>>(new Map());
  const stopMarkerRef  = useRef<L.CircleMarker | null>(null);

  useEffect(() => {
    stopsApi.getAllUnpaged()
      .then(r => setStops(r.items))
      .finally(() => setStopsLoading(false));
  }, []);

  async function handleSearch() {
    if (!stopId) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const data = await stopsApi.getRoutes(Number(stopId));
      setResult(data);
      setSelectedRoutes(new Set(data.routes.map(r => r.routeId)));
    } catch {
      setError('Failed to load routes for this stop.');
    } finally {
      setLoading(false);
    }
  }

  // Build / rebuild map whenever result or selectedRoutes changes
  useEffect(() => {
    if (!mapRef.current || !result) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }
    routeLayersRef.current.clear();
    stopMarkerRef.current = null;

    const map = L.map(mapRef.current, { zoomControl: false });
    mapInstanceRef.current = map;
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    const allLatLngs: L.LatLngTuple[] = [];

    result.routes.forEach((route, idx) => {
      const color = ROUTE_COLORS[idx % ROUTE_COLORS.length];
      const visible = selectedRoutes.has(route.routeId);
      const latlngs: L.LatLngTuple[] = route.stops
        .filter(s => s.latitude && s.longitude)
        .map(s => [s.latitude!, s.longitude!]);

      if (latlngs.length === 0) return;
      if (visible) allLatLngs.push(...latlngs);

      const layers: L.Layer[] = [];

      if (latlngs.length > 1) {
        const line = L.polyline(latlngs, {
          color, weight: 4, opacity: visible ? 0.85 : 0,
        }).bindPopup(`<b style="color:${color}">${route.routeCode}</b><br/><span style="color:#8b92a5">${route.routeName}</span>`);
        line.addTo(map);
        layers.push(line);
      }

      // Terminal markers
      route.stops.filter(s => s.isFirstStop || s.isLastStop).forEach(s => {
        if (!s.latitude || !s.longitude) return;
        const m = L.circleMarker([s.latitude, s.longitude], {
          radius: 6, fillColor: color, color: '#0a0c10', weight: 2, fillOpacity: visible ? 1 : 0, opacity: visible ? 1 : 0,
        }).bindPopup(`<b>${s.stopName}</b><br/><span style="color:${color}">${route.routeCode}</span> · ${s.isFirstStop ? 'Origin' : 'Terminus'}`);
        m.addTo(map);
        layers.push(m);
      });

      routeLayersRef.current.set(route.routeId, layers);
    });

    // Selected stop marker — on top
    if (result.stop.latitude && result.stop.longitude) {
      const lat = result.stop.latitude;
      const lng = result.stop.longitude;
      allLatLngs.push([lat, lng]);

      L.circleMarker([lat, lng], {
        radius: 16, fillColor: '#f59e0b', color: '#0a0c10', weight: 2, fillOpacity: 0.18,
      }).addTo(map);

      stopMarkerRef.current = L.circleMarker([lat, lng], {
        radius: 8, fillColor: '#f59e0b', color: '#0a0c10', weight: 2.5, fillOpacity: 1,
      }).bindPopup(`<b>${result.stop.stopName}</b><br/>${result.stop.stopCode} · ${result.routes.length} routes`)
        .addTo(map);
    }

    if (allLatLngs.length > 0)
      map.fitBounds(L.latLngBounds(allLatLngs), { padding: [48, 48] });

  }, [result, selectedRoutes]);

  function toggleRoute(id: number) {
    setSelectedRoutes(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  function toggleAll() {
    if (!result) return;
    setSelectedRoutes(prev =>
      prev.size === result.routes.length ? new Set() : new Set(result.routes.map(r => r.routeId))
    );
  }

  function isolateRoute(id: number) {
    setSelectedRoutes(new Set([id]));
  }

  const filteredRoutes = (result?.routes ?? []).filter(r =>
    !searchQuery ||
    r.routeCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.routeName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const showMap = !!result;

  return (
    <div className={`sr-root${showMap ? ' sr-has-map' : ''}`}>
      {/* ── Search bar (always visible at top) ── */}
      <div className="sr-searchbar">
        <div className="sr-searchbar-inner">
          <div className="sr-stop-wrap">
            {stopsLoading
              ? <div className="sr-stop-placeholder">Loading stops…</div>
              : <StopAutocomplete stops={stops} value={stopId} onChange={setStopId} placeholder="Select a stop…" />
            }
          </div>
          <button className="btn btn-primary sr-search-btn" onClick={handleSearch} disabled={!stopId || loading}>
            {loading
              ? <><div className="cov-loading-spinner sm" style={{ borderTopColor: '#fff' }} /> Searching…</>
              : <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                  Find Routes
                </>
            }
          </button>
        </div>
        {error && <div className="alert alert-error" style={{ marginTop: 8 }}>{error}</div>}
      </div>

      {/* ── Empty state ── */}
      {!showMap && !loading && (
        <div className="sr-empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-3)', opacity: 0.5 }}><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
          <p>Select a stop to see which routes pass through it</p>
        </div>
      )}

      {/* ── Map + drawer layout ── */}
      {showMap && (
        <div className="sr-map-area">
          {/* Map */}
          <div ref={mapRef} className="sr-map" />

          {/* Stats bar */}
          <div className="cov-stats-bar">
            <div className="cov-stat">
              <span className="cov-stat-value">{result.routes.length}</span>
              <span className="cov-stat-label">Routes</span>
            </div>
            <div className="cov-stat-divider" />
            <div className="cov-stat">
              <span className="cov-stat-value" style={{ color: 'var(--cyan)' }}>{selectedRoutes.size}</span>
              <span className="cov-stat-label">Visible</span>
            </div>
            <div className="cov-stat-divider" />
            <div className="cov-stat">
              <span className="cov-stat-value" style={{ color: 'var(--amber)' }}>{result.stop.stopName}</span>
              <span className="cov-stat-label">Stop</span>
            </div>
          </div>

          {/* Drawer toggle */}
          <button className="cov-drawer-toggle" onClick={() => setDrawerOpen(v => !v)} title="Toggle routes panel">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {drawerOpen ? <polyline points="15 18 9 12 15 6"/> : <polyline points="9 18 15 12 9 6"/>}
            </svg>
            {!drawerOpen && <span style={{ fontSize: '0.72rem', fontWeight: 700 }}>{selectedRoutes.size}</span>}
          </button>

          {/* Routes drawer */}
          <div className={`cov-drawer${drawerOpen ? ' open' : ''}`}>
            <div className="cov-drawer-header">
              <div>
                <div className="cov-drawer-title">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="5" cy="6" r="2"/><circle cx="19" cy="18" r="2"/><line x1="5" y1="8" x2="5" y2="16"/><path d="M5 16c0 1.1.9 2 2 2h10"/></svg>
                  Routes
                </div>
                <div className="cov-drawer-sub">{selectedRoutes.size} of {result.routes.length} visible</div>
              </div>
              <button className="cov-toggle-all" onClick={toggleAll}>
                {selectedRoutes.size === result.routes.length ? 'Hide all' : 'Show all'}
              </button>
            </div>

            <div className="cov-search-wrap">
              <svg className="cov-search-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input
                className="cov-search"
                placeholder="Filter routes…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                autoComplete="off"
              />
            </div>

            <div className="cov-route-list">
              {filteredRoutes.map((r, idx) => {
                const color = ROUTE_COLORS[result.routes.indexOf(r) % ROUTE_COLORS.length];
                const active = selectedRoutes.has(r.routeId);
                return (
                  <button
                    key={r.routeId}
                    className={`cov-route-item sr-route-item${active ? ' active' : ''}`}
                    onClick={() => toggleRoute(r.routeId)}
                    onDoubleClick={() => isolateRoute(r.routeId)}
                    style={{ '--route-color': color } as React.CSSProperties}
                    title="Click to toggle · Double-click to isolate"
                  >
                    <span className="cov-route-dot" style={{ background: active ? color : 'var(--border-strong)' }} />
                    <div className="sr-route-info">
                      <span className="cov-route-code">{r.routeCode}</span>
                      <span className="sr-route-meta">
                        Stop {r.stopOrderOnRoute}/{r.totalStops} · {r.totalDistanceKm} km
                      </span>
                    </div>
                    <span className="cov-route-stops">{r.totalStops}</span>
                  </button>
                );
              })}
            </div>

            <div className="sr-stop-info-section">
              <div className="sr-stop-info-label">Selected Stop</div>
              <div className="sr-stop-info-name">{result.stop.stopName}</div>
              <div className="sr-stop-info-code">{result.stop.stopCode}</div>
              {result.stop.latitude && (
                <div className="sr-stop-info-coords">
                  {result.stop.latitude.toFixed(5)}, {result.stop.longitude?.toFixed(5)}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
