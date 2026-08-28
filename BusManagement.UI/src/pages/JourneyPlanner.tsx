import { useEffect, useState } from 'react';
import { journeyApi, stopsApi, type BusType, type JourneyPlanResult, type Stop, BUS_TYPES } from '../api';
import { useToast } from '../toast';
import StopAutocomplete from '../components/StopAutocomplete';

type Criteria = 'ShortestDistance' | 'FewestStops' | 'FewestTransfers';

const CRITERIA: { value: Criteria; label: string; desc: string }[] = [
  { value: 'ShortestDistance', label: 'Shortest Distance', desc: 'Minimise total km' },
  { value: 'FewestStops',      label: 'Fewest Stops',      desc: 'Minimise stop count' },
  { value: 'FewestTransfers',  label: 'Fewest Transfers',  desc: 'Minimise bus changes' },
];

export default function JourneyPlanner() {
  const [stops, setStops]       = useState<Stop[]>([]);
  const [fromId, setFromId]     = useState('');
  const [toId, setToId]         = useState('');
  const [busType, setBusType]   = useState<BusType>('Ordinary');
  const [criteria, setCriteria] = useState<Criteria>('ShortestDistance');
  const [result, setResult]     = useState<JourneyPlanResult | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const { toast } = useToast();

  useEffect(() => {
    stopsApi.getAllUnpaged().then(r => setStops(r.items.filter(s => s.isActive)));
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setResult(null); setLoading(true);
    try {
      setResult(await journeyApi.plan(Number(fromId), Number(toId), busType, criteria));
    } catch (err: unknown) {
      const msg = err instanceof Error && err.message?.startsWith('404')
        ? 'No route found between these stops.'
        : 'Journey planning failed.';
      setError(msg); toast(msg, 'error');
    } finally { setLoading(false); }
  };

  const handleSwap = () => { const t = fromId; setFromId(toId); setToId(t); setResult(null); setError(''); };
  const handleClear = () => { setFromId(''); setToId(''); setResult(null); setError(''); };

  return (
    <>
      {/* ── Search Card ── */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Journey Planner</div>
          <span className="badge badge-blue">Route + Fare</span>
        </div>

        <form onSubmit={handleSearch}>
          {/* Stop inputs */}
          <div className="rs-inputs">
            <div className="rs-stop-row">
              <div className="rs-stop-field">
                <div className="rs-stop-label"><span className="rs-dot origin" />From</div>
                <StopAutocomplete stops={stops} value={fromId} onChange={setFromId} placeholder="Search boarding stop…" required />
              </div>
              <button type="button" className="rs-swap-btn" title="Swap stops" onClick={handleSwap}>⇅</button>
              <div className="rs-stop-field">
                <div className="rs-stop-label"><span className="rs-dot dest" />To</div>
                <StopAutocomplete stops={stops} value={toId} onChange={setToId} placeholder="Search destination stop…" required />
              </div>
            </div>

            {/* Bus type */}
            <div className="rs-criteria-row">
              {BUS_TYPES.map(bt => (
                <button key={bt} type="button"
                  className={`rs-criteria-btn${busType === bt ? ' active' : ''}`}
                  onClick={() => setBusType(bt)}>
                  <span className="rs-criteria-label">{bt}</span>
                </button>
              ))}
            </div>

            {/* Routing criteria */}
            <div className="rs-criteria-row">
              {CRITERIA.map(c => (
                <button key={c.value} type="button"
                  className={`rs-criteria-btn${criteria === c.value ? ' active' : ''}`}
                  onClick={() => setCriteria(c.value)}>
                  <span className="rs-criteria-label">{c.label}</span>
                  <span className="rs-criteria-desc">{c.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="rs-search-footer">
            <button type="submit" className="btn btn-primary" disabled={loading || !fromId || !toId}>
              {loading ? <><SpinIcon /> Planning…</> : <><PlanIcon /> Plan Journey</>}
            </button>
            {result && (
              <button type="button" className="btn btn-subtle btn-sm" onClick={handleClear}>Clear</button>
            )}
          </div>
        </form>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* ── Result ── */}
      {result && (
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">
                {result.transfers === 0 ? 'Direct Journey' : `Journey with ${result.transfers} Transfer${result.transfers > 1 ? 's' : ''}`}
              </div>
              <div className="text-muted" style={{ marginTop: 2 }}>{result.from} → {result.to} · {result.busType}</div>
            </div>
            <span className={`badge ${result.transfers === 0 ? 'badge-green' : 'badge-amber'}`}>
              {result.transfers === 0 ? 'Direct' : `${result.transfers} transfer${result.transfers > 1 ? 's' : ''}`}
            </span>
          </div>

          {/* Summary */}
          <div className="summary-row">
            <div className="summary-item">
              <div className="label">Total Fare</div>
              <div className="value">₹{result.totalFare.toFixed(2)}</div>
            </div>
            <div className="summary-item">
              <div className="label">Total Distance</div>
              <div className="value">{result.totalDistanceKm} <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--text-2)' }}>km</span></div>
            </div>
            <div className="summary-item">
              <div className="label">Total Stops</div>
              <div className="value">{result.totalStops}</div>
            </div>
            <div className="summary-item">
              <div className="label">Transfers</div>
              <div className="value">{result.transfers}</div>
            </div>
          </div>

          {/* Legs */}
          <div className="rs-route-list">
            {result.legs.map((leg, i) => (
              <div key={i} className="rs-route-item">
                <div className="rs-route-left">
                  <span className="route-badge">{leg.routeCode}</span>
                  <div className="rs-route-path">
                    <span className="rs-route-stop">{leg.boardAt}</span>
                    <span className="rs-route-arrow">→</span>
                    <span className="rs-route-stop">{leg.alightAt}</span>
                  </div>
                  <div className="text-muted" style={{ fontSize: '0.78rem', marginTop: 2 }}>{leg.routeName}</div>
                </div>
                <div className="rs-route-right">
                  <div className="rs-route-stat"><span>{leg.stops}</span><span>stops</span></div>
                  <div className="rs-route-stat"><span>{leg.distanceKm}</span><span>km</span></div>
                  <div className="rs-route-stat"><span>{leg.stages}</span><span>stages</span></div>
                  <span className="badge badge-green">₹{leg.fare.toFixed(2)}</span>
                  {i < result.legs.length - 1 && <span className="badge badge-amber">Transfer here</span>}
                </div>
              </div>
            ))}
          </div>

          {/* Total fare footer */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 0 4px', borderTop: '1px solid var(--border)', marginTop: 8 }}>
            <span style={{ fontWeight: 600, fontSize: '1rem' }}>Total Fare: <span style={{ color: 'var(--primary)' }}>₹{result.totalFare.toFixed(2)}</span></span>
          </div>
        </div>
      )}
    </>
  );
}

function PlanIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.663 17h4.673M12 3v1m6.364 1.636-.707.707M21 12h-1M4 12H3m3.343-5.657-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 0 14 18.469V19a2 2 0 1 1-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>; }
function SpinIcon()  { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>; }
