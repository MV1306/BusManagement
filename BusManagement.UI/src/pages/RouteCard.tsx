import { useEffect, useRef, useState } from 'react';
import { routesApi, type Route, type RouteCard, type BusType, BUS_TYPES } from '../api';

export default function RouteCardPage() {
  const [routes, setRoutes]   = useState<Route[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [busType, setBusType] = useState<BusType>('Ordinary');
  const [card, setCard]       = useState<RouteCard | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [query, setQuery]     = useState('');
  const [dropOpen, setDropOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const acRef   = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => { routesApi.getAllUnpaged().then(r => setRoutes(r.items.filter(x => x.isActive))); }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (acRef.current && !acRef.current.contains(e.target as Node)) setDropOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selected = routes.find(r => String(r.routeId) === selectedId);

  const filtered = query.length < 1
    ? routes.slice(0, 60)
    : routes.filter(r =>
        r.routeCode.toLowerCase().includes(query.toLowerCase()) ||
        r.routeName.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 40);

  const selectRoute = (r: Route) => {
    setSelectedId(String(r.routeId));
    setCard(null);
    setQuery('');
    setDropOpen(false);
    setActiveIdx(-1);
  };

  const clearRoute = () => { setSelectedId(''); setCard(null); setQuery(''); setDropOpen(false); };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!dropOpen) { if (e.key === 'ArrowDown') { setDropOpen(true); setActiveIdx(0); } return; }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx(i => { const n = Math.min(i + 1, filtered.length - 1); listRef.current?.children[n]?.scrollIntoView({ block: 'nearest' }); return n; });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx(i => { const n = Math.max(i - 1, 0); listRef.current?.children[n]?.scrollIntoView({ block: 'nearest' }); return n; });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIdx >= 0 && activeIdx < filtered.length) selectRoute(filtered[activeIdx]);
    } else if (e.key === 'Escape') {
      setDropOpen(false); setActiveIdx(-1);
    }
  };

  const generate = async () => {
    if (!selectedId) return;
    setCard(null); setError(''); setLoading(true);
    try { setCard(await routesApi.getCard(Number(selectedId))); }
    catch { setError('Failed to load route card.'); }
    finally { setLoading(false); }
  };

  const getFare = (stages: number): string => {
    if (!card) return '—';
    const f = card.fares.find(f => f.busType === busType && f.stages === stages);
    return f ? `₹${f.fareAmount}` : '—';
  };

  return (
    <>
      {/* ── Controls ── */}
      <div className="card no-print" style={{ marginBottom: 20 }}>
        <div className="card-header" style={{ marginBottom: 12 }}>
          <div className="card-title">Route Card Generator</div>
          {card && (
            <button className="btn btn-primary btn-sm" onClick={() => window.print()}>
              <PrintIcon /> Print
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ maxWidth: 300 }}>
            <label>Route</label>
            <div ref={acRef} className="autocomplete">
              <div className="autocomplete-input-wrap">
                <input
                  className="autocomplete-input"
                  value={dropOpen ? query : (selected ? `${selected.routeCode} — ${selected.routeName}` : '')}
                  placeholder="Search route…"
                  onFocus={() => { setDropOpen(true); setQuery(''); }}
                  onChange={e => { setQuery(e.target.value); setDropOpen(true); setActiveIdx(-1); }}
                  onKeyDown={handleKeyDown}
                  autoComplete="off"
                />
                {selectedId && !dropOpen && (
                  <button type="button" className="autocomplete-clear" onClick={clearRoute} tabIndex={-1}>✕</button>
                )}
                <span className="autocomplete-chevron" style={{ pointerEvents: 'none' }}>▾</span>
              </div>
              {dropOpen && (
                <div className="autocomplete-dropdown" ref={listRef}>
                  {filtered.length === 0
                    ? <div className="autocomplete-empty">No routes found</div>
                    : filtered.map((r, i) => (
                      <div
                        key={r.routeId}
                        className={`autocomplete-option${String(r.routeId) === selectedId ? ' selected' : ''}${i === activeIdx ? ' active' : ''}`}
                        onMouseDown={() => selectRoute(r)}
                        onMouseEnter={() => setActiveIdx(i)}
                      >
                        <span className="autocomplete-option-name">{r.routeName}</span>
                        <span className="autocomplete-option-code">{r.routeCode}</span>
                      </div>
                    ))
                  }
                </div>
              )}
            </div>
          </div>
          <button className="btn btn-primary" onClick={generate} disabled={!selectedId || loading}
            style={{ marginBottom: 1 }}>
            {loading ? 'Generating…' : 'Generate Card'}
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {!card && !loading && (
        <div className="rc-empty">
          <div className="rc-empty-icon"><BusIllustration /></div>
          <div className="rc-empty-title">No Route Card Generated</div>
          <div className="rc-empty-sub">Select a route above, then click Generate Card.</div>
        </div>
      )}

      {card && (() => {
        const stops = card.stops;
        const origin   = stops.find(s => s.isFirstStop);
        const terminus = stops.find(s => s.isLastStop);

        return (
          <div className="rc-document">

            {/* ══ HERO HEADER ══ */}
            <div className="rc-hero">
              <div className="rc-hero-stripe" />
              <div className="rc-hero-inner">
                <div className="rc-hero-left">
                  <div className="rc-hero-badge">MTC</div>
                  <div>
                    <div className="rc-hero-code">{card.routeCode}</div>
                    <div className="rc-hero-name">{card.routeName}</div>
                    <div className="rc-hero-endpoints">
                      <span className="rc-endpoint origin">{origin?.stopName ?? '—'}</span>
                      <span className="rc-endpoint-arrow">→</span>
                      <span className="rc-endpoint terminus">{terminus?.stopName ?? '—'}</span>
                    </div>
                  </div>
                </div>
                <div className="rc-hero-stats">
                  <div className="rc-stat">
                    <div className="rc-stat-val">{card.totalStops}</div>
                    <div className="rc-stat-label">Stops</div>
                  </div>
                  <div className="rc-stat-divider" />
                  <div className="rc-stat">
                    <div className="rc-stat-val">{card.totalDistanceKm}</div>
                    <div className="rc-stat-label">km</div>
                  </div>
                  <div className="rc-stat-divider" />
                  <div className="rc-stat">
                    <div className="rc-stat-val rc-stat-bustype">{busType}</div>
                    <div className="rc-stat-label">Bus Type</div>
                  </div>
                </div>
              </div>
            </div>

            {/* ══ BODY ══ */}
            <div className="rc-doc-body">

              {/* ── Bus type tabs (no-print) ── */}
              <div className="rc-bustabs no-print">
                {BUS_TYPES.map(t => (
                  <button key={t}
                    className={`rc-bustab${busType === t ? ' active' : ''}`}
                    onClick={() => setBusType(t)}>{t}</button>
                ))}
              </div>

              <div className="rc-two-col">

                {/* ── Stop Sequence ── */}
                <div className="rc-panel">
                  <div className="rc-panel-header">
                    <StopsIcon />
                    <span>Stop Sequence</span>
                  </div>
                  <div className="rc-stop-list">
                    {stops.map((s, idx) => {
                      const isFirst = s.isFirstStop;
                      const isLast  = s.isLastStop;
                      return (
                        <div key={s.stopOrder} className="rc-stop-row">
                          <div className="rc-stop-spine">
                            <div className={`rc-stop-dot ${isFirst ? 'first' : isLast ? 'last' : 'mid'}`} />
                            {idx < stops.length - 1 && <div className="rc-stop-line" />}
                          </div>
                          <div className="rc-stop-info">
                            <div className="rc-stop-name">
                              {s.stopName}
                              {isFirst && <span className="rc-tag green">Origin</span>}
                              {isLast  && <span className="rc-tag red">Terminus</span>}
                            </div>
                            <div className="rc-stop-meta">
                              <span className="rc-tag slate">{s.stopCode}</span>
                              {s.distanceFromPreviousKm > 0 && (
                                <span className="rc-stop-dist">+{s.distanceFromPreviousKm} km</span>
                              )}
                              {s.cumulativeDistanceKm > 0 && (
                                <span className="rc-stop-cum">{s.cumulativeDistanceKm} km total</span>
                              )}
                            </div>
                          </div>
                          <div className="rc-stop-order">#{s.stopOrder}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ── Fare Matrix ── */}
                <div className="rc-panel">
                  <div className="rc-panel-header">
                    <MatrixIcon />
                    <span>Fare Matrix — {busType}</span>
                  </div>
                  <div className="rc-matrix-wrap">
                    <table className="rc-matrix-table">
                      <thead>
                        <tr>
                          <th className="rc-matrix-corner">From ↓ / To →</th>
                          {stops.map(s => (
                            <th key={s.stopOrder} title={s.stopName}>
                              <div className="rc-matrix-col-label">{s.stopName}</div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {stops.map(from => (
                          <tr key={from.stopOrder}>
                            <td className="rc-matrix-row-label">{from.stopOrder}. {from.stopName}</td>
                            {stops.map(to => {
                              if (to.stopOrder === from.stopOrder)
                                return <td key={to.stopOrder} className="rc-matrix-self">—</td>;
                              const stages = Math.abs(to.stopOrder - from.stopOrder);
                              const fare = getFare(stages);
                              return (
                                <td key={to.stopOrder} className={`rc-matrix-cell${fare === '—' ? ' rc-matrix-na' : ''}`}>
                                  {fare}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            </div>

          </div>
        );
      })()}
    </>
  );
}

function PrintIcon()  { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>; }
function StopsIcon()  { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="19" r="2"/><line x1="12" y1="7" x2="12" y2="17"/></svg>; }
function MatrixIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>; }
function BusIllustration() { return <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity=".3"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><path d="M2 13h20"/><circle cx="7" cy="17" r="1"/><circle cx="17" cy="17" r="1"/></svg>; }
