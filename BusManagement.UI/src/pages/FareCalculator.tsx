import { useEffect, useRef, useState } from 'react';
import { faresApi, routesApi, stopsApi, BUS_TYPES, type BusType, type FareCalcAllTypesResult, type Route, type RouteStop, type SmartFareResult, type Stop } from '../api';
import { useToast } from '../toast';
import StopAutocomplete from '../components/StopAutocomplete';

type Mode = 'route' | 'smart' | 'concession';

const CONCESSIONS = [
  { label: 'Full Fare',                   key: 'full',    pct: 0   },
  { label: 'Student',                     key: 'student', pct: 50  },
  { label: 'Senior Citizen',              key: 'senior',  pct: 30  },
  { label: 'Differently Abled',           key: 'pwd',     pct: 75  },
  { label: 'Freedom Fighter',             key: 'ff',      pct: 100 },
];

// ── Inline route autocomplete hook ──────────────────────────────────────────
function useRouteAC(routes: Route[], onSelect?: () => void) {
  const [selectedId, setSelectedId] = useState('');
  const [query, setQuery]           = useState('');
  const [open, setOpen]             = useState(false);
  const [activeIdx, setActiveIdx]   = useState(-1);
  const ref     = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const selected  = routes.find(r => String(r.routeId) === selectedId);
  const filtered  = (query.length < 1 ? routes.slice(0, 60) : routes.filter(r =>
    r.routeCode.toLowerCase().includes(query.toLowerCase()) ||
    r.routeName.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 40));

  const pick = (r: Route) => {
    setSelectedId(String(r.routeId)); setQuery(''); setOpen(false); setActiveIdx(-1);
    onSelect?.();
  };
  const clear = () => { setSelectedId(''); setQuery(''); setOpen(false); };
  const reset = () => { setSelectedId(''); setQuery(''); setOpen(false); setActiveIdx(-1); };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) { if (e.key === 'ArrowDown') { setOpen(true); setActiveIdx(0); } return; }
    if (e.key === 'ArrowDown')  { e.preventDefault(); setActiveIdx(i => { const n = Math.min(i+1, filtered.length-1); listRef.current?.children[n]?.scrollIntoView({ block: 'nearest' }); return n; }); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => { const n = Math.max(i-1, 0); listRef.current?.children[n]?.scrollIntoView({ block: 'nearest' }); return n; }); }
    else if (e.key === 'Enter') { e.preventDefault(); if (activeIdx >= 0 && activeIdx < filtered.length) pick(filtered[activeIdx]); }
    else if (e.key === 'Escape') { setOpen(false); setActiveIdx(-1); }
  };

  const Input = (
    <div ref={ref} className="autocomplete">
      <div className="autocomplete-input-wrap">
        <input className="autocomplete-input"
          value={open ? query : (selected ? `${selected.routeCode} — ${selected.routeName}` : '')}
          placeholder="Search route…"
          onFocus={() => { setOpen(true); setQuery(''); }}
          onChange={e => { setQuery(e.target.value); setOpen(true); setActiveIdx(-1); }}
          onKeyDown={onKeyDown}
          autoComplete="off"
        />
        {selectedId && !open && <button type="button" className="autocomplete-clear" onClick={clear} tabIndex={-1}>✕</button>}
        <span className="autocomplete-chevron" style={{ pointerEvents: 'none' }}>▾</span>
      </div>
      {open && (
        <div className="autocomplete-dropdown" ref={listRef}>
          {filtered.length === 0
            ? <div className="autocomplete-empty">No routes found</div>
            : filtered.map((r, i) => (
              <div key={r.routeId}
                className={`autocomplete-option${String(r.routeId) === selectedId ? ' selected' : ''}${i === activeIdx ? ' active' : ''}`}
                onMouseDown={() => pick(r)} onMouseEnter={() => setActiveIdx(i)}>
                <span className="autocomplete-option-name">{r.routeName}</span>
                <span className="autocomplete-option-code">{r.routeCode}</span>
              </div>
            ))
          }
        </div>
      )}
    </div>
  );

  return { selectedId, Input, reset };
}

// ── Bus type pill selector ───────────────────────────────────────────────────
function BusTypePills({ value, onChange }: { value: BusType; onChange: (v: BusType) => void }) {
  return (
    <div className="fc-pills">
      {BUS_TYPES.map(t => (
        <button key={t} type="button"
          className={`fc-pill${value === t ? ' active' : ''}`}
          onClick={() => onChange(t)}>{t}</button>
      ))}
    </div>
  );
}

export default function FareCalculator() {
  const [stops, setStops]   = useState<Stop[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);

  const [mode, setMode] = useState<Mode>('route');

  // route mode
  const [routeStops, setRouteStops]   = useState<RouteStop[]>([]);
  const [fromId, setFromId]           = useState('');
  const [toId, setToId]               = useState('');
  const [allTypesResult, setAllTypesResult] = useState<FareCalcAllTypesResult | null>(null);

  // smart mode
  const [smartBusType, setSmartBusType] = useState<BusType>('Ordinary');
  const [smartFromId, setSmartFromId]   = useState('');
  const [smartToId, setSmartToId]       = useState('');
  const [smartResult, setSmartResult]   = useState<SmartFareResult | null>(null);
  const [smartCriteria, setSmartCriteria] = useState<'ShortestDistance' | 'FewestStops' | 'FewestTransfers'>('ShortestDistance');

  // concession mode
  const [concRouteStops, setConcRouteStops] = useState<RouteStop[]>([]);
  const [concFromId, setConcFromId]         = useState('');
  const [concToId, setConcToId]             = useState('');
  const [concBusType, setConcBusType]       = useState<BusType>('Ordinary');
  const [concResult, setConcResult]         = useState<FareCalcAllTypesResult | null>(null);

  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const routeAC     = useRouteAC(routes, () => { setFromId(''); setToId(''); setRouteStops([]); });
  const concRouteAC = useRouteAC(routes, () => { setConcFromId(''); setConcToId(''); setConcRouteStops([]); });

  useEffect(() => {
    stopsApi.getAllUnpaged().then(r => setStops(r.items.filter(x => x.isActive)));
    routesApi.getAllUnpaged().then(r => setRoutes(r.items.filter(x => x.isActive)));
  }, []);

  // load route stops when route selected
  useEffect(() => {
    if (routeAC.selectedId) routesApi.getStops(Number(routeAC.selectedId)).then(setRouteStops);
    else setRouteStops([]);
    setFromId(''); setToId('');
  }, [routeAC.selectedId]);

  useEffect(() => {
    if (concRouteAC.selectedId) routesApi.getStops(Number(concRouteAC.selectedId)).then(setConcRouteStops);
    else setConcRouteStops([]);
    setConcFromId(''); setConcToId('');
  }, [concRouteAC.selectedId]);

  const switchMode = (m: Mode) => {
    setMode(m);
    setError('');
    setAllTypesResult(null); setSmartResult(null); setConcResult(null);
    // clear all fields on mode switch
    setFromId(''); setToId(''); routeAC.reset();
    setSmartFromId(''); setSmartToId(''); setSmartCriteria('ShortestDistance');
    setConcFromId(''); setConcToId(''); concRouteAC.reset();
  };

  const stopOptions = (routeStops.length ? routeStops : stops).map(rs =>
    'stopId' in rs ? rs as Stop : { stopId: (rs as RouteStop).stopId, stopName: (rs as RouteStop).stopName, stopCode: (rs as RouteStop).stopCode, shortName: undefined, latitude: undefined, longitude: undefined, isActive: true }
  );
  const concStopOptions = (concRouteStops.length ? concRouteStops : stops).map(rs =>
    'stopId' in rs ? rs as Stop : { stopId: (rs as RouteStop).stopId, stopName: (rs as RouteStop).stopName, stopCode: (rs as RouteStop).stopCode, shortName: undefined, latitude: undefined, longitude: undefined, isActive: true }
  );

  const handleRouteCalc = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setAllTypesResult(null); setLoading(true);
    try { setAllTypesResult(await faresApi.calculateAllTypes(Number(routeAC.selectedId), Number(fromId), Number(toId))); }
    catch { setError('Calculation failed. Route or stops not found.'); toast('Calculation failed.', 'error'); }
    finally { setLoading(false); }
  };

  const handleSmartCalc = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setSmartResult(null); setLoading(true);
    try { setSmartResult(await faresApi.calculateSmart(Number(smartFromId), Number(smartToId), smartBusType, smartCriteria)); }
    catch { setError('Calculation failed.'); toast('Calculation failed.', 'error'); }
    finally { setLoading(false); }
  };

  const handleConcCalc = async (e: React.FormEvent) => {
    e.preventDefault(); setConcResult(null); setLoading(true);
    try { setConcResult(await faresApi.calculateAllTypes(Number(concRouteAC.selectedId), Number(concFromId), Number(concToId))); }
    catch { toast('Calculation failed.', 'error'); }
    finally { setLoading(false); }
  };

  return (
    <>
      {/* ── Mode tabs ── */}
      <div className="fc-tabs">
        <button className={`fc-tab${mode === 'route' ? ' active' : ''}`} onClick={() => switchMode('route')}>
          <RouteIcon /> By Route
        </button>
        <button className={`fc-tab${mode === 'smart' ? ' active' : ''}`} onClick={() => switchMode('smart')}>
          <SmartIcon /> Smart Journey
        </button>
        <button className={`fc-tab${mode === 'concession' ? ' active' : ''}`} onClick={() => switchMode('concession')}>
          <ConcIcon /> Concession
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* ══ BY ROUTE ══ */}
      {mode === 'route' && (
        <div className="card">
          <div className="card-header" style={{ marginBottom: 16 }}>
            <div className="card-title">Fare by Route</div>
          </div>
          <form onSubmit={handleRouteCalc}>
            <div className="fc-form">
              <div className="form-group">
                <label>Route</label>
                {routeAC.Input}
              </div>
              <div className="form-group">
                <label>From Stop</label>
                <StopAutocomplete stops={stopOptions} value={fromId} onChange={setFromId} placeholder="Boarding stop…" required />
              </div>
              <div className="form-group">
                <label>To Stop</label>
                <StopAutocomplete stops={stopOptions} value={toId} onChange={setToId} placeholder="Alighting stop…" required />
              </div>
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading || !routeAC.selectedId || !fromId || !toId}>
              {loading ? 'Calculating…' : 'Calculate Fare'}
            </button>
          </form>

          {allTypesResult && (
            <div className="fc-result">
              <RouteTicket result={allTypesResult} />
            </div>
          )}
        </div>
      )}

      {/* ══ SMART JOURNEY ══ */}
      {mode === 'smart' && (
        <div className="card">
          <div className="card-header" style={{ marginBottom: 16 }}>
            <div className="card-title">Smart Journey Fare</div>
          </div>
          <form onSubmit={handleSmartCalc}>
            <div className="fc-form">
              <div className="form-group">
                <label>From Stop</label>
                <StopAutocomplete stops={stops} value={smartFromId} onChange={setSmartFromId} placeholder="Boarding stop…" required />
              </div>
              <div className="form-group">
                <label>To Stop</label>
                <StopAutocomplete stops={stops} value={smartToId} onChange={setSmartToId} placeholder="Alighting stop…" required />
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label>Bus Type</label>
              <BusTypePills value={smartBusType} onChange={setSmartBusType} />
            </div>
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label>Route Criteria</label>
              <div className="rs-criteria-row">
                {([['ShortestDistance','Shortest Distance','Minimise total km'],['FewestStops','Fewest Stops','Minimise stop count'],['FewestTransfers','Fewest Transfers','Minimise bus changes']] as const).map(([val, label, desc]) => (
                  <button key={val} type="button"
                    className={`rs-criteria-btn${smartCriteria === val ? ' active' : ''}`}
                    onClick={() => setSmartCriteria(val)}>
                    <span className="rs-criteria-label">{label}</span>
                    <span className="rs-criteria-desc">{desc}</span>
                  </button>
                ))}
              </div>
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading || !smartFromId || !smartToId}>
              {loading ? 'Calculating…' : 'Calculate Fare'}
            </button>
          </form>

          {smartResult && (
            <div className="fc-result">
              <SmartTicket result={smartResult} busType={smartBusType} />
            </div>
          )}
        </div>
      )}

      {/* ══ CONCESSION ══ */}
      {mode === 'concession' && (
        <div className="card">
          <div className="card-header" style={{ marginBottom: 16 }}>
            <div className="card-title">Concession Fares</div>
          </div>
          <form onSubmit={handleConcCalc}>
            <div className="fc-form">
              <div className="form-group">
                <label>Route</label>
                {concRouteAC.Input}
              </div>
              <div className="form-group">
                <label>From Stop</label>
                <StopAutocomplete stops={concStopOptions} value={concFromId} onChange={setConcFromId} placeholder="Boarding stop…" required />
              </div>
              <div className="form-group">
                <label>To Stop</label>
                <StopAutocomplete stops={concStopOptions} value={concToId} onChange={setConcToId} placeholder="Alighting stop…" required />
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label>Bus Type</label>
              <BusTypePills value={concBusType} onChange={setConcBusType} />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading || !concRouteAC.selectedId || !concFromId || !concToId}>
              {loading ? 'Calculating…' : 'Calculate Fares'}
            </button>
          </form>

          {concResult && (
            <div className="fc-result">
              <ConcessionTicket result={concResult} busType={concBusType} />
            </div>
          )}
        </div>
      )}
    </>
  );
}

// ── Ticket: By Route ────────────────────────────────────────────────────────
function RouteTicket({ result }: { result: FareCalcAllTypesResult }) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  return (
    <div className="ticket">
      <div className="ticket-head">
        <div className="ticket-head-left">
          <div className="ticket-org">Metropolitan Transport Corporation</div>
          <div className="ticket-title">BUS TICKET</div>
        </div>
        <div className="ticket-head-right">
          <div className="ticket-route-badge">{result.routeCode}</div>
          <div className="ticket-datetime">{dateStr} · {timeStr}</div>
        </div>
      </div>

      <div className="ticket-body">
        <div className="ticket-journey">
          <div className="ticket-stop-block">
            <div className="ticket-stop-label">FROM</div>
            <div className="ticket-stop-name">{result.fromStop}</div>
          </div>
          <div className="ticket-journey-line">
            <div className="ticket-journey-dot origin" />
            <div className="ticket-journey-track"><div className="ticket-journey-fill" /></div>
            <BusIcon />
            <div className="ticket-journey-track"><div className="ticket-journey-fill" /></div>
            <div className="ticket-journey-dot dest" />
          </div>
          <div className="ticket-stop-block right">
            <div className="ticket-stop-label">TO</div>
            <div className="ticket-stop-name">{result.toStop}</div>
          </div>
        </div>

        <div className="ticket-divider"><span /><span className="ticket-divider-text">FARE DETAILS</span><span /></div>

        <div className="ticket-meta-row">
          <div className="ticket-meta-item"><div className="ticket-meta-label">Stages</div><div className="ticket-meta-val">{result.stages}</div></div>
          <div className="ticket-meta-item"><div className="ticket-meta-label">Stops</div><div className="ticket-meta-val">{result.totalStops}</div></div>
          <div className="ticket-meta-item"><div className="ticket-meta-label">Distance</div><div className="ticket-meta-val">{result.distanceKm} km</div></div>
          <div className="ticket-meta-item"><div className="ticket-meta-label">Route</div><div className="ticket-meta-val">{result.routeCode}</div></div>
        </div>

        <div className="ticket-fare-row">
          {result.fares.map(f => (
            <div key={f.busType} className={`ticket-fare-item${f.fare === 0 ? ' na' : ''}`}>
              <div className="ticket-fare-type">{f.busType}</div>
              <div className="ticket-fare-amt">{f.fare === 0 ? '—' : `₹${f.fare.toFixed(2)}`}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="ticket-foot">
        <div className="ticket-foot-left">Valid for single journey only</div>
        <div className="ticket-foot-right">MTC · Chennai</div>
      </div>
      <div className="ticket-tear" />
    </div>
  );
}

// ── Ticket: Smart Journey ────────────────────────────────────────────────────
function SmartTicket({ result, busType }: { result: SmartFareResult; busType: BusType }) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  return (
    <div className="ticket ticket-smart">
      <div className="ticket-head">
        <div className="ticket-head-left">
          <div className="ticket-org">Metropolitan Transport Corporation</div>
          <div className="ticket-title">SMART JOURNEY TICKET</div>
        </div>
        <div className="ticket-head-right">
          <div className="ticket-route-badge" style={{ background: 'rgba(255,255,255,.15)' }}>{busType}</div>
          <div className="ticket-datetime">{dateStr} · {timeStr}</div>
        </div>
      </div>

      <div className="ticket-body">
        <div className="ticket-journey">
          <div className="ticket-stop-block">
            <div className="ticket-stop-label">FROM</div>
            <div className="ticket-stop-name">{result.from}</div>
          </div>
          <div className="ticket-journey-line">
            <div className="ticket-journey-dot origin" />
            <div className="ticket-journey-track"><div className="ticket-journey-fill" /></div>
            <BusIcon />
            <div className="ticket-journey-track"><div className="ticket-journey-fill" /></div>
            <div className="ticket-journey-dot dest" />
          </div>
          <div className="ticket-stop-block right">
            <div className="ticket-stop-label">TO</div>
            <div className="ticket-stop-name">{result.to}</div>
          </div>
        </div>

        <div className="ticket-total-fare">
          <div className="ticket-total-label">Total Fare</div>
          <div className="ticket-total-amt">₹{result.totalFare.toFixed(2)}</div>
        </div>

        <div className="ticket-divider"><span /><span className="ticket-divider-text">JOURNEY SEGMENTS</span><span /></div>

        <div className="ticket-segments">
          {result.segments.map((seg, i) => (
            <div key={i} className="ticket-segment">
              <div className="ticket-segment-num">{i + 1}</div>
              <div className="ticket-segment-body">
                <div className="ticket-segment-route">
                  <span className="route-badge" style={{ fontSize: '0.7rem', padding: '2px 8px' }}>{seg.routeCode}</span>
                  <span className="badge badge-blue" style={{ fontSize: '0.68rem' }}>{seg.busType}</span>
                </div>
                <div className="ticket-segment-path">{seg.fromStop} → {seg.toStop}</div>
                <div className="ticket-segment-meta">{seg.stages} stages</div>
              </div>
              <div className={`ticket-segment-fare${seg.fare === 0 ? ' na' : ''}`}>
                {seg.fare === 0 ? '—' : `₹${seg.fare.toFixed(2)}`}
              </div>
              {i < result.segments.length - 1 && (
                <div className="ticket-transfer-badge">Transfer ↓</div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="ticket-foot">
        <div className="ticket-foot-left">{result.segments.length} segment{result.segments.length > 1 ? 's' : ''} · {result.segments.length - 1} transfer{result.segments.length - 1 !== 1 ? 's' : ''}</div>
        <div className="ticket-foot-right">MTC · Chennai</div>
      </div>
      <div className="ticket-tear" />
    </div>
  );
}

// ── Ticket: Concession ───────────────────────────────────────────────────────
function ConcessionTicket({ result, busType }: { result: FareCalcAllTypesResult; busType: BusType }) {
  const base = result.fares.find(f => f.busType === busType)?.fare ?? 0;
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  return (
    <div className="ticket ticket-conc">
      <div className="ticket-head">
        <div className="ticket-head-left">
          <div className="ticket-org">Metropolitan Transport Corporation</div>
          <div className="ticket-title">CONCESSION FARE CHART</div>
        </div>
        <div className="ticket-head-right">
          <div className="ticket-route-badge" style={{ background: 'rgba(255,255,255,.15)' }}>{result.routeCode}</div>
          <div className="ticket-datetime">{dateStr} · {timeStr}</div>
        </div>
      </div>

      <div className="ticket-body">
        <div className="ticket-journey">
          <div className="ticket-stop-block">
            <div className="ticket-stop-label">FROM</div>
            <div className="ticket-stop-name">{result.fromStop}</div>
          </div>
          <div className="ticket-journey-line">
            <div className="ticket-journey-dot origin" />
            <div className="ticket-journey-track"><div className="ticket-journey-fill" /></div>
            <BusIcon />
            <div className="ticket-journey-track"><div className="ticket-journey-fill" /></div>
            <div className="ticket-journey-dot dest" />
          </div>
          <div className="ticket-stop-block right">
            <div className="ticket-stop-label">TO</div>
            <div className="ticket-stop-name">{result.toStop}</div>
          </div>
        </div>

        <div className="ticket-meta-row">
          <div className="ticket-meta-item"><div className="ticket-meta-label">Stages</div><div className="ticket-meta-val">{result.stages}</div></div>
          <div className="ticket-meta-item"><div className="ticket-meta-label">Stops</div><div className="ticket-meta-val">{result.totalStops}</div></div>
          <div className="ticket-meta-item"><div className="ticket-meta-label">Distance</div><div className="ticket-meta-val">{result.distanceKm} km</div></div>
          <div className="ticket-meta-item"><div className="ticket-meta-label">Bus Type</div><div className="ticket-meta-val">{busType}</div></div>
          <div className="ticket-meta-item"><div className="ticket-meta-label">Base Fare</div><div className="ticket-meta-val" style={{ color: 'var(--green)' }}>{base === 0 ? '—' : `₹${base.toFixed(2)}`}</div></div>
        </div>

        <div className="ticket-divider"><span /><span className="ticket-divider-text">PASSENGER CONCESSIONS</span><span /></div>

        <div className="ticket-conc-list">
          {CONCESSIONS.map(c => {
            const discounted = base === 0 ? 0 : Math.max(0, base * (1 - c.pct / 100));
            return (
              <div key={c.key} className="ticket-conc-row">
                <div className="ticket-conc-passenger">{c.label}</div>
                <div className="ticket-conc-discount">{c.pct > 0 ? `${c.pct}% off` : 'Full fare'}</div>
                <div className={`ticket-conc-fare${c.pct === 100 ? ' free' : base === 0 ? ' na' : ''}`}>
                  {base === 0 ? '—' : c.pct === 100 ? 'FREE' : `₹${discounted.toFixed(2)}`}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="ticket-foot">
        <div className="ticket-foot-left">Concession subject to valid ID proof</div>
        <div className="ticket-foot-right">MTC · Chennai</div>
      </div>
      <div className="ticket-tear" />
    </div>
  );
}

function BusIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" opacity=".9"><rect x="2" y="7" width="20" height="13" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5"/><path d="M16 20V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v15" fill="none" stroke="currentColor" strokeWidth="1.5"/><path d="M2 13h20" stroke="currentColor" strokeWidth="1.5"/><circle cx="7" cy="17" r="1.2" /><circle cx="17" cy="17" r="1.2" /></svg>; }
function RouteIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="5" cy="6" r="2"/><circle cx="19" cy="18" r="2"/><line x1="5" y1="8" x2="5" y2="16"/><path d="M5 16c0 1.1.9 2 2 2h10"/></svg>; }
function SmartIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>; }
function ConcIcon()  { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12V22H4V12"/><path d="M22 7H2v5h20V7z"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>; }
