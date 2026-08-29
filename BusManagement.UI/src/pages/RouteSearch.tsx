import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { routesApi, stopsApi, type SearchResult, type SmartSearchResult, type Stop, type BusType, type StopCoord } from '../api';
import { useToast } from '../toast';
import StopAutocomplete from '../components/StopAutocomplete';

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const BUS_TYPE_COLORS: Record<BusType, { color: string; dim: string }> = {
  Ordinary: { color: '#888888', dim: 'rgba(136,136,136,.15)' },
  Express:  { color: '#4caf50', dim: 'rgba(76,175,80,.15)'   },
  Deluxe:   { color: '#2196f3', dim: 'rgba(33,150,243,.15)'  },
  AC:       { color: '#f44336', dim: 'rgba(244,67,54,.15)'   },
};

function BusTypePills({ types }: { types: BusType[] }) {
  if (!types?.length) return <span className="text-muted" style={{ fontSize: '0.72rem' }}>—</span>;
  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
      {types.map(t => {
        const c = BUS_TYPE_COLORS[t];
        return (
          <span key={t} style={{
            fontSize: '0.65rem', fontWeight: 700, padding: '2px 7px',
            borderRadius: 4, border: `1px solid ${c.color}`,
            background: c.dim, color: c.color, whiteSpace: 'nowrap',
          }}>{t.toUpperCase()}</span>
        );
      })}
    </div>
  );
}

type Criteria = 'ShortestDistance' | 'FewestStops' | 'FewestTransfers';
type Mode = 'direct' | 'smart';

const CRITERIA_OPTIONS: { value: Criteria; label: string; desc: string }[] = [
  { value: 'ShortestDistance', label: 'Shortest Distance', desc: 'Minimise total km' },
  { value: 'FewestStops',      label: 'Fewest Stops',      desc: 'Minimise stop count' },
  { value: 'FewestTransfers',  label: 'Fewest Transfers',  desc: 'Minimise bus changes' },
];

export default function RouteSearch() {
  const [stops, setStops]               = useState<Stop[]>([]);
  const [mode, setMode]                 = useState<Mode>('direct');
  const [fromId, setFromId]             = useState('');
  const [toId, setToId]                 = useState('');
  const [criteria, setCriteria]         = useState<Criteria>('ShortestDistance');
  const [directResult, setDirectResult] = useState<SearchResult | null>(null);
  const [smartResult, setSmartResult]   = useState<SmartSearchResult | null>(null);
  const [error, setError]               = useState('');
  const [loading, setLoading]           = useState(false);
  const { toast } = useToast();

  const mapRef         = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => { stopsApi.getAllUnpaged().then(r => setStops(r.items.filter(x => x.isActive))); }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; }
    if (!directResult && !smartResult) return;

    type SegmentLayer = { coords: StopCoord[]; color: string; routeCode: string };
    const layers: SegmentLayer[] = [];

    const SEGMENT_COLORS = ['#2563eb', '#16a34a', '#d97706', '#9333ea', '#e11d48'];

    if (directResult?.routes.length) {
      directResult.routes.forEach((r, i) => {
        if (r.stopCoords?.length) {
          layers.push({ coords: r.stopCoords, color: SEGMENT_COLORS[i % SEGMENT_COLORS.length], routeCode: r.routeCode });
        }
      });
    }

    if (smartResult?.segments.length) {
      smartResult.segments.forEach((seg, i) => {
        if (seg.stopCoords?.length) {
          layers.push({ coords: seg.stopCoords, color: SEGMENT_COLORS[i % SEGMENT_COLORS.length], routeCode: seg.routeCode });
        }
      });
    }

    const validCoords = layers.flatMap(l => l.coords.filter(c => c.lat != null && c.lng != null));
    if (!validCoords.length) return;

    const map = L.map(mapRef.current);
    mapInstanceRef.current = map;
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap contributors' }).addTo(map);

    layers.forEach(({ coords, color, routeCode }, layerIdx) => {
      const pts = coords.filter(c => c.lat != null && c.lng != null) as (StopCoord & { lat: number; lng: number })[];
      if (!pts.length) return;

      // Draw polyline through all stops
      L.polyline(pts.map(p => [p.lat, p.lng] as L.LatLngTuple), {
        color, weight: 4, opacity: 0.85,
        dashArray: layerIdx > 0 ? '10,6' : undefined,
      }).addTo(map);

      pts.forEach((p, i) => {
        const isFirst = layerIdx === 0 && i === 0;
        const isLast = layerIdx === layers.length - 1 && i === pts.length - 1;
        const isTransfer = !isFirst && !isLast && i === 0;
        const isStageStart = p.isStageStart && !isFirst && !isLast;

        if (isFirst || isLast || isTransfer) {
          const markerColor = isFirst ? '#16a34a' : isLast ? '#2563eb' : '#d97706';
          L.circleMarker([p.lat, p.lng], {
            radius: 9, fillColor: markerColor, color: '#fff', weight: 2, fillOpacity: 1,
          }).bindPopup(`<b>${p.name}</b>${isTransfer ? '<br/><i>Transfer point</i>' : ''}`).addTo(map);
          L.tooltip({ permanent: true, direction: 'top', offset: [0, -12], className: 'stop-label' })
            .setContent(p.name).setLatLng([p.lat, p.lng]).addTo(map);
        } else if (isStageStart) {
          // Stage boundary: diamond marker
          L.circleMarker([p.lat, p.lng], {
            radius: 6, fillColor: color, color: '#fff', weight: 2, fillOpacity: 0.9,
          }).bindPopup(`<b>${p.name}</b><br/><i>Stage start</i>`).addTo(map);
          L.tooltip({ permanent: true, direction: 'top', offset: [0, -10], className: 'stop-label stop-label-stage' })
            .setContent(p.name).setLatLng([p.lat, p.lng]).addTo(map);
        } else {
          // Intermediate stop: small dot
          L.circleMarker([p.lat, p.lng], {
            radius: 4, fillColor: color, color: '#fff', weight: 1.5, fillOpacity: 0.75,
          }).bindPopup(`<b>${p.name}</b><br/><small>${routeCode}</small>`).addTo(map);
        }
      });
    });

    const allPts = validCoords.map(c => [c.lat!, c.lng!] as L.LatLngTuple);
    map.fitBounds(L.latLngBounds(allPts), { padding: [50, 50] });
  }, [directResult, smartResult]);

  const switchMode = (m: Mode) => {
    setMode(m); setFromId(''); setToId('');
    setDirectResult(null); setSmartResult(null); setError('');
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setDirectResult(null); setSmartResult(null); setLoading(true);
    try {
      if (mode === 'direct') setDirectResult(await routesApi.search(Number(fromId), Number(toId)));
      else                   setSmartResult(await routesApi.smartSearch(Number(fromId), Number(toId), criteria));
    } catch (err: unknown) {
      const msg = err instanceof Error && err.message?.startsWith('404') ? 'No route found between these stops.' : 'Search failed.';
      setError(msg); toast(msg, 'error');
    } finally { setLoading(false); }
  };

  const handleTrySmart = async () => {
    setMode('smart'); setDirectResult(null); setError(''); setLoading(true);
    try { setSmartResult(await routesApi.smartSearch(Number(fromId), Number(toId), criteria)); }
    catch { setError('No route found between these stops.'); toast('No route found.', 'error'); }
    finally { setLoading(false); }
  };

  const hasResult = !!(directResult || smartResult);

  return (
    <>
      {/* ── Search Card ── */}
      <div className="rs-search-card card">
        {/* Mode toggle */}
        <div className="rs-mode-toggle">
          <button className={`rs-mode-btn${mode === 'direct' ? ' active' : ''}`} onClick={() => switchMode('direct')}>
            <DirectIcon /> Direct Search
          </button>
          <button className={`rs-mode-btn${mode === 'smart' ? ' active' : ''}`} onClick={() => switchMode('smart')}>
            <SmartIcon /> Smart Journey
          </button>
        </div>

        <form onSubmit={handleSearch}>
          <div className="rs-inputs">
            <div className="rs-stop-row">
              <div className="rs-stop-field">
                <div className="rs-stop-label"><span className="rs-dot origin" />From</div>
                <StopAutocomplete stops={stops} value={fromId} onChange={setFromId} placeholder="Search boarding stop…" required />
              </div>
              <button type="button" className="rs-swap-btn" title="Swap stops"
                onClick={() => { const t = fromId; setFromId(toId); setToId(t); setDirectResult(null); setSmartResult(null); }}>
                ⇅
              </button>
              <div className="rs-stop-field">
                <div className="rs-stop-label"><span className="rs-dot dest" />To</div>
                <StopAutocomplete stops={stops} value={toId} onChange={setToId} placeholder="Search destination stop…" required />
              </div>
            </div>

            {mode === 'smart' && (
              <div className="rs-criteria-row">
                {CRITERIA_OPTIONS.map(c => (
                  <button key={c.value} type="button"
                    className={`rs-criteria-btn${criteria === c.value ? ' active' : ''}`}
                    onClick={() => setCriteria(c.value)}>
                    <span className="rs-criteria-label">{c.label}</span>
                    <span className="rs-criteria-desc">{c.desc}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="rs-search-footer">
            <button type="submit" className="btn btn-primary" disabled={loading || !fromId || !toId}>
              {loading ? <><SpinIcon /> Searching…</> : <><SearchIcon /> Search Routes</>}
            </button>
            {hasResult && (
              <button type="button" className="btn btn-subtle btn-sm"
                onClick={() => { setDirectResult(null); setSmartResult(null); setError(''); setFromId(''); setToId(''); }}>
                Clear
              </button>
            )}
          </div>
        </form>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* ── Direct Result ── */}
      {directResult && (
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Direct Routes</div>
              <div className="text-muted" style={{ marginTop: 2 }}>
                {directResult.fromStop} → {directResult.toStop} · {directResult.routes.length} route{directResult.routes.length !== 1 ? 's' : ''} found
              </div>
            </div>
            <span className="badge badge-green">Direct</span>
          </div>

          {directResult.routes.length === 0 ? (
            <div className="rs-no-result">
              <div className="rs-no-result-text">No direct routes found between these stops.</div>
              <button className="btn btn-primary btn-sm" onClick={handleTrySmart} disabled={loading}>
                <SmartIcon /> Try Smart Journey
              </button>
            </div>
          ) : (
            <div className="rs-route-list">
              {directResult.routes.map(r => (
                <div key={r.routeId} className="rs-route-item">
                  <div className="rs-route-left">
                    <span className="route-badge">{r.routeCode}</span>
                    <div className="rs-stage-chain">
                      {r.stopCoords?.filter((s, i) => i === 0 || i === r.stopCoords.length - 1 || s.isStageStart)
                        .map((s, i, arr) => (
                          <span key={i} className="rs-stage-item">
                            {i > 0 && <span className="rs-stage-arrow">›</span>}
                            <span className={i === 0 || i === arr.length - 1 ? 'rs-stage-stop rs-stage-terminal' : 'rs-stage-stop'}>{s.name}</span>
                          </span>
                        ))}
                    </div>
                    <BusTypePills types={r.busTypes} />
                  </div>
                  <div className="rs-route-right">
                    <div className="rs-route-stat"><span>{r.stops}</span><span>stops</span></div>
                    {r.distanceKm != null && <div className="rs-route-stat"><span>{r.distanceKm}</span><span>km</span></div>}
                    <span className="badge badge-green">0 transfers</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Smart Result ── */}
      {smartResult && (
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">
                {smartResult.transfers === 0 ? 'Direct Route Found' : `Journey with ${smartResult.transfers} Transfer${smartResult.transfers > 1 ? 's' : ''}`}
              </div>
              <div className="text-muted" style={{ marginTop: 2 }}>{smartResult.from} → {smartResult.to}</div>
            </div>
            <span className={`badge ${smartResult.transfers === 0 ? 'badge-green' : 'badge-amber'}`}>
              {smartResult.transfers === 0 ? 'Direct' : `${smartResult.transfers} transfer${smartResult.transfers > 1 ? 's' : ''}`}
            </span>
          </div>

          <div className="summary-row">
            <div className="summary-item"><div className="label">Total Distance</div><div className="value">{smartResult.totalDistanceKm} <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--text-2)' }}>km</span></div></div>
            <div className="summary-item"><div className="label">Total Stops</div><div className="value">{smartResult.totalStops}</div></div>
            <div className="summary-item"><div className="label">Transfers</div><div className="value">{smartResult.transfers}</div></div>
          </div>

          <div className="rs-route-list">
            {smartResult.segments.map((seg, i) => (
              <div key={i} className="rs-route-item">
                <div className="rs-route-left">
                  <span className="route-badge">{seg.routeCode}</span>
                  <div className="rs-route-path">
                    <span className="rs-route-stop">{seg.fromStop}</span>
                    <span className="rs-route-arrow">→</span>
                    <span className="rs-route-stop">{seg.toStop}</span>
                  </div>
                </div>
                <div className="rs-route-right">
                  <div className="rs-route-stat"><span>{seg.stops}</span><span>stops</span></div>
                  <div className="rs-route-stat"><span>{seg.distanceKm}</span><span>km</span></div>
                  {i < smartResult.segments.length - 1 && <span className="badge badge-amber">Transfer here</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Map ── */}
      {hasResult && (
        <div className="card">
          <div className="card-header"><div className="card-title">Route Map</div></div>
          <div ref={mapRef} style={{ height: 380, borderRadius: 6, overflow: 'hidden' }} />
        </div>
      )}
    </>
  );
}

function DirectIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>; }
function SmartIcon()  { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.663 17h4.673M12 3v1m6.364 1.636-.707.707M21 12h-1M4 12H3m3.343-5.657-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 0 14 18.469V19a2 2 0 1 1-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>; }
function SearchIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>; }
function SpinIcon()   { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>; }
