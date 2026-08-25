import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { coverageApi, type CoverageRoute, type NearbyStop } from '../api';
import '../theme-coverage.css';

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

export default function CoverageMap() {
  const mapRef         = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const nearbyLayerRef = useRef<L.LayerGroup | null>(null);

  const [routes, setRoutes]               = useState<CoverageRoute[]>([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState('');
  const [selectedRoutes, setSelectedRoutes] = useState<Set<number>>(new Set());
  const [nearbyStops, setNearbyStops]     = useState<NearbyStop[]>([]);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [radius, setRadius]               = useState(2);
  const [searchQuery, setSearchQuery]     = useState('');
  const [drawerOpen, setDrawerOpen]       = useState(true);
  const [nearbyOpen, setNearbyOpen]       = useState(false);
  const [clickCoords, setClickCoords]     = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    coverageApi.getAll()
      .then(data => { setRoutes(data); setSelectedRoutes(new Set(data.map(r => r.routeId))); })
      .catch(() => setError('Failed to load coverage data'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!mapRef.current || routes.length === 0) return;
    if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; }

    const map = L.map(mapRef.current, { zoomControl: false });
    mapInstanceRef.current = map;

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    nearbyLayerRef.current = L.layerGroup().addTo(map);

    const allLatLngs: L.LatLngTuple[] = [];

    routes.forEach((route, idx) => {
      if (!selectedRoutes.has(route.routeId)) return;
      const color = ROUTE_COLORS[idx % ROUTE_COLORS.length];
      const latlngs: L.LatLngTuple[] = route.stops
        .filter(s => s.latitude && s.longitude)
        .map(s => [s.latitude, s.longitude]);

      if (latlngs.length === 0) return;
      allLatLngs.push(...latlngs);

      if (latlngs.length > 1)
        L.polyline(latlngs, { color, weight: 3.5, opacity: 0.85 })
          .bindPopup(`<b style="color:${color}">${route.routeCode}</b><br/><span style="color:#8b92a5">${route.routeName}</span>`)
          .addTo(map);

      route.stops.filter(s => s.isFirstStop || s.isLastStop).forEach(s => {
        if (!s.latitude || !s.longitude) return;
        L.circleMarker([s.latitude, s.longitude], {
          radius: 7, fillColor: color, color: '#0a0c10', weight: 2.5, fillOpacity: 1,
        }).bindPopup(`<b>${s.stopName}</b><br/><span style="color:${color}">${route.routeCode}</span> · ${s.isFirstStop ? 'Origin' : 'Terminus'}`)
          .addTo(map);
      });
    });

    if (allLatLngs.length > 0)
      map.fitBounds(L.latLngBounds(allLatLngs), { padding: [40, 40] });

    map.on('click', async (e) => {
      setNearbyLoading(true);
      setNearbyStops([]);
      setNearbyOpen(true);
      setClickCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
      nearbyLayerRef.current?.clearLayers();
      try {
        const stops = await coverageApi.getNearby(e.latlng.lat, e.latlng.lng, radius);
        setNearbyStops(stops);
        L.circleMarker(e.latlng, {
          radius: 14, fillColor: '#f59e0b', color: '#0a0c10', weight: 2, fillOpacity: 0.25,
        }).addTo(nearbyLayerRef.current!);
        L.circleMarker(e.latlng, {
          radius: 5, fillColor: '#f59e0b', color: '#0a0c10', weight: 2, fillOpacity: 1,
        }).bindPopup(`<b>Search point</b><br/>${e.latlng.lat.toFixed(5)}, ${e.latlng.lng.toFixed(5)}`)
          .addTo(nearbyLayerRef.current!);
        stops.forEach(s => {
          L.circleMarker([s.latitude!, s.longitude!], {
            radius: 8, fillColor: '#f59e0b', color: '#0a0c10', weight: 2, fillOpacity: 1,
          }).bindPopup(`<b>${s.stopName}</b><br/>${s.stopCode} · <b>${s.distanceKm} km</b> away`)
            .addTo(nearbyLayerRef.current!);
        });
      } catch { /* ignore */ }
      finally { setNearbyLoading(false); }
    });
  }, [routes, selectedRoutes, radius]);

  const toggleRoute = (id: number) =>
    setSelectedRoutes(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const toggleAll = () =>
    setSelectedRoutes(prev => prev.size === routes.length ? new Set() : new Set(routes.map(r => r.routeId)));

  const filteredRoutes = routes.filter(r =>
    !searchQuery || r.routeCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.routeName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalStops = routes.reduce((s, r) => s + r.stops.length, 0);
  const activeRoutes = selectedRoutes.size;

  if (loading) return (
    <div className="cov-loading">
      <div className="cov-loading-spinner" />
      <span>Loading coverage data…</span>
    </div>
  );
  if (error) return <div className="alert alert-error">{error}</div>;

  return (
    <div className="cov-root">
      {/* ── Full-bleed map ── */}
      <div ref={mapRef} className="cov-map" />

      {/* ── Top stats bar ── */}
      <div className="cov-stats-bar">
        <div className="cov-stat">
          <span className="cov-stat-value">{routes.length}</span>
          <span className="cov-stat-label">Routes</span>
        </div>
        <div className="cov-stat-divider" />
        <div className="cov-stat">
          <span className="cov-stat-value" style={{ color: 'var(--cyan)' }}>{activeRoutes}</span>
          <span className="cov-stat-label">Visible</span>
        </div>
        <div className="cov-stat-divider" />
        <div className="cov-stat">
          <span className="cov-stat-value" style={{ color: 'var(--green)' }}>{totalStops}</span>
          <span className="cov-stat-label">Stops</span>
        </div>
        <div className="cov-stat-divider" />
        <div className="cov-stat">
          <span className="cov-stat-value" style={{ color: 'var(--amber)' }}>{nearbyStops.length}</span>
          <span className="cov-stat-label">Nearby</span>
        </div>
      </div>

      {/* ── Routes drawer toggle ── */}
      <button className="cov-drawer-toggle" onClick={() => setDrawerOpen(v => !v)} title="Toggle routes panel">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {drawerOpen
            ? <><polyline points="15 18 9 12 15 6"/></>
            : <><polyline points="9 18 15 12 9 6"/></>}
        </svg>
        {!drawerOpen && <span style={{ fontSize: '0.72rem', fontWeight: 700 }}>{activeRoutes}</span>}
      </button>

      {/* ── Routes side drawer ── */}
      <div className={`cov-drawer${drawerOpen ? ' open' : ''}`}>
        <div className="cov-drawer-header">
          <div>
            <div className="cov-drawer-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
              Routes
            </div>
            <div className="cov-drawer-sub">{activeRoutes} of {routes.length} visible</div>
          </div>
          <button className="cov-toggle-all" onClick={toggleAll}>
            {selectedRoutes.size === routes.length ? 'Hide all' : 'Show all'}
          </button>
        </div>

        <div className="cov-search-wrap">
          <svg className="cov-search-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input
            className="cov-search"
            placeholder="Search routes…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            autoComplete="off"
          />
        </div>

        <div className="cov-route-list">
          {filteredRoutes.map((r) => {
            const color = ROUTE_COLORS[routes.indexOf(r) % ROUTE_COLORS.length];
            const active = selectedRoutes.has(r.routeId);
            return (
              <button
                key={r.routeId}
                className={`cov-route-item${active ? ' active' : ''}`}
                onClick={() => toggleRoute(r.routeId)}
                style={{ '--route-color': color } as React.CSSProperties}
              >
                <span className="cov-route-dot" style={{ background: active ? color : 'var(--border-strong)' }} />
                <span className="cov-route-code">{r.routeCode}</span>
                <span className="cov-route-stops">{r.stops.length}</span>
              </button>
            );
          })}
        </div>

        {/* Nearby radius control */}
        <div className="cov-radius-section">
          <div className="cov-radius-header">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>
            Nearby radius
          </div>
          <div className="cov-radius-row">
            <input
              type="range" min={0.5} max={10} step={0.5} value={radius}
              onChange={e => setRadius(Number(e.target.value))}
              className="cov-radius-slider"
            />
            <span className="cov-radius-val">{radius} km</span>
          </div>
          <div className="cov-radius-hint">Click map to find nearby stops</div>
        </div>
      </div>

      {/* ── Nearby stops panel ── */}
      {nearbyOpen && (
        <div className="cov-nearby-panel">
          <div className="cov-nearby-header">
            <div>
              <div className="cov-nearby-title">
                <span className="cov-nearby-dot" />
                Nearby Stops
              </div>
              {clickCoords && (
                <div className="cov-nearby-coords">
                  {clickCoords.lat.toFixed(4)}, {clickCoords.lng.toFixed(4)} · {radius} km radius
                </div>
              )}
            </div>
            <button className="cov-nearby-close" onClick={() => { setNearbyOpen(false); nearbyLayerRef.current?.clearLayers(); setNearbyStops([]); }}>✕</button>
          </div>

          {nearbyLoading ? (
            <div className="cov-nearby-loading">
              <div className="cov-loading-spinner sm" />
              <span>Searching…</span>
            </div>
          ) : nearbyStops.length === 0 ? (
            <div className="cov-nearby-empty">No stops within {radius} km</div>
          ) : (
            <div className="cov-nearby-list">
              {nearbyStops.map((s, i) => (
                <div key={s.stopId} className="cov-nearby-item" style={{ animationDelay: `${i * 40}ms` }}>
                  <div className="cov-nearby-rank">{i + 1}</div>
                  <div className="cov-nearby-info">
                    <div className="cov-nearby-name">{s.stopName}</div>
                    <div className="cov-nearby-code">{s.stopCode}</div>
                  </div>
                  <div className="cov-nearby-dist">
                    <span>{s.distanceKm}</span>
                    <span>km</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
