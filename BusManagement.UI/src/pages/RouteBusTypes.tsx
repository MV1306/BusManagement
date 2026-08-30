import { useEffect, useState } from 'react';
import { routesApi, routeBusTypesApi, BUS_TYPES, type Route, type BusType } from '../api';
import { useToast } from '../toast';

const BUS_TYPE_META: Record<BusType, { label: string; short: string; color: string; dim: string }> = {
  Ordinary: { label: 'Ordinary', short: 'ORD', color: '#888888', dim: 'rgba(136,136,136,.15)' },
  Express:  { label: 'Express',  short: 'EXP', color: '#4caf50', dim: 'rgba(76,175,80,.15)'   },
  Deluxe:   { label: 'Deluxe',   short: 'DLX', color: '#2196f3', dim: 'rgba(33,150,243,.15)'  },
  AC:       { label: 'AC',       short: 'AC',  color: '#f44336', dim: 'rgba(244,67,54,.15)'   },
};

interface RouteWithTypes extends Route {
  busTypes: BusType[];
  saving: boolean;
}

// Extract leading numeric series from a route code: "101CT" → "101", "21G" → "21", "2" → "2"
function getSeries(code: string): string {
  return code.match(/^\d+/)?.[0] ?? code[0] ?? '?';
}

export default function RouteBusTypes() {
  const [allRoutes, setAllRoutes] = useState<RouteWithTypes[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSeries, setSelectedSeries] = useState<string | null>(null);
  const [seriesSearch, setSeriesSearch] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    setLoading(true);
    routesApi.getAllUnpaged().then(async r => {
      const withTypes = await Promise.all(r.items.map(async route => {
        const types = await routeBusTypesApi.getByRoute(route.routeId).catch(() => []);
        return { ...route, busTypes: types.map(t => t.busType), saving: false };
      }));
      setAllRoutes(withTypes);
    }).catch(() => toast('Failed to load routes', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const toggleType = async (routeId: number, busType: BusType) => {
    setAllRoutes(prev => prev.map(r => r.routeId === routeId ? { ...r, saving: true } : r));
    const route = allRoutes.find(r => r.routeId === routeId)!;
    const next = route.busTypes.includes(busType)
      ? route.busTypes.filter(t => t !== busType)
      : [...route.busTypes, busType];
    try {
      const saved = await routeBusTypesApi.set(routeId, next);
      setAllRoutes(prev => prev.map(r =>
        r.routeId === routeId ? { ...r, busTypes: saved.map(t => t.busType), saving: false } : r
      ));
    } catch {
      toast('Failed to save', 'error');
      setAllRoutes(prev => prev.map(r => r.routeId === routeId ? { ...r, saving: false } : r));
    }
  };

  // Build sorted unique series list
  const seriesMap = new Map<string, number>();
  for (const r of allRoutes) {
    const s = getSeries(r.routeCode);
    seriesMap.set(s, (seriesMap.get(s) ?? 0) + 1);
  }
  const allSeries = [...seriesMap.entries()]
    .sort((a, b) => {
      const na = parseInt(a[0]), nb = parseInt(b[0]);
      if (!isNaN(na) && !isNaN(nb)) return na - nb;
      return a[0].localeCompare(b[0]);
    });

  const filteredSeries = seriesSearch.trim()
    ? allSeries.filter(([s]) => s.startsWith(seriesSearch.trim()))
    : allSeries;

  const seriesRoutes = selectedSeries
    ? allRoutes.filter(r => getSeries(r.routeCode) === selectedSeries)
        .sort((a, b) => a.routeCode.localeCompare(b.routeCode, undefined, { numeric: true }))
    : [];

  if (loading) return <div className="card"><div className="text-muted" style={{ padding: 24 }}>Loading routes…</div></div>;

  // ── Series picker ──
  if (!selectedSeries) return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">Route Bus Type Mapping</div>
          <div className="text-muted" style={{ marginTop: 2 }}>Select a series to configure bus types</div>
        </div>
        <input
          className="search-input"
          placeholder="Jump to series…"
          value={seriesSearch}
          onChange={e => setSeriesSearch(e.target.value.replace(/\D/g, ''))}
          style={{ width: 160 }}
          autoComplete="off"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 1fr))', gap: 8 }}>
        {filteredSeries.map(([series, count]) => (
          <button
            key={series}
            onClick={() => setSelectedSeries(series)}
            style={{
              padding: '12px 8px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-strong)',
              background: 'var(--surface-2)',
              cursor: 'pointer',
              textAlign: 'center',
              transition: 'all 0.15s',
              fontFamily: 'inherit',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--primary)'; (e.currentTarget as HTMLButtonElement).style.background = 'var(--primary-dim)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-strong)'; (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-2)'; }}
          >
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)' }}>{series}</div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-3)', marginTop: 3 }}>{count} route{count > 1 ? 's' : ''}</div>
          </button>
        ))}
      </div>
    </div>
  );

  // ── Bus type grid for selected series ──
  return (
    <div className="card">
      <div className="card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            className="btn btn-subtle btn-sm"
            onClick={() => setSelectedSeries(null)}
          >← Series</button>
          <div>
            <div className="card-title">Series {selectedSeries}</div>
            <div className="text-muted" style={{ marginTop: 2 }}>{seriesRoutes.length} route{seriesRoutes.length !== 1 ? 's' : ''}</div>
          </div>
        </div>
        {/* Legend */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {BUS_TYPES.map(bt => {
            const m = BUS_TYPE_META[bt];
            return (
              <div key={bt} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', color: 'var(--text-2)' }}>
                <span style={{ width: 9, height: 9, borderRadius: 2, background: m.color, display: 'inline-block' }} />
                {m.label}
              </div>
            );
          })}
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Route Name</th>
              <th>From → To</th>
              <th>Status</th>
              {BUS_TYPES.map(bt => (
                <th key={bt} style={{ textAlign: 'center', minWidth: 64 }}>
                  <span style={{ color: BUS_TYPE_META[bt].color }}>{BUS_TYPE_META[bt].short}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {seriesRoutes.map(r => (
              <tr key={r.routeId} style={{ opacity: r.saving ? 0.6 : 1 }}>
                <td><span className="badge badge-slate">{r.routeCode}</span></td>
                <td style={{ fontWeight: 500 }}>{r.routeName}</td>
                <td className="text-muted">{r.startingStop ?? '—'} → {r.endingStop ?? '—'}</td>
                <td>
                  <span className={`badge ${r.isActive ? 'badge-green' : 'badge-red'}`}>
                    {r.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                {BUS_TYPES.map(bt => {
                  const active = r.busTypes.includes(bt);
                  const m = BUS_TYPE_META[bt];
                  return (
                    <td key={bt} style={{ textAlign: 'center' }}>
                      <button
                        onClick={() => toggleType(r.routeId, bt)}
                        disabled={r.saving}
                        title={`${active ? 'Remove' : 'Add'} ${m.label}`}
                        style={{
                          width: 32, height: 32,
                          borderRadius: 6,
                          border: `1.5px solid ${active ? m.color : 'var(--border-strong)'}`,
                          background: active ? m.dim : 'transparent',
                          color: active ? m.color : 'var(--text-3)',
                          cursor: r.saving ? 'not-allowed' : 'pointer',
                          fontWeight: 700,
                          fontSize: '0.65rem',
                          transition: 'all 0.15s',
                          fontFamily: 'inherit',
                        }}
                      >
                        {active ? '✓' : ''}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
