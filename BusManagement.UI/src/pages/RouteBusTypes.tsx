import { useEffect, useState } from 'react';
import { routesApi, routeBusTypesApi, BUS_TYPES, type Route, type BusType } from '../api';
import { useToast } from '../toast';
import Pagination from '../components/Pagination';

const BUS_TYPE_META: Record<BusType, { label: string; short: string; color: string; dim: string }> = {
  Ordinary: { label: 'Ordinary', short: 'ORD', color: '#e8e8e8', dim: 'rgba(232,232,232,.15)' },
  Express:  { label: 'Express',  short: 'EXP', color: '#4caf50', dim: 'rgba(76,175,80,.15)'   },
  Deluxe:   { label: 'Deluxe',   short: 'DLX', color: '#2196f3', dim: 'rgba(33,150,243,.15)'  },
  AC:       { label: 'AC',       short: 'AC',  color: '#f44336', dim: 'rgba(244,67,54,.15)'   },
};

interface RouteWithTypes extends Route {
  busTypes: BusType[];
  saving: boolean;
}

export default function RouteBusTypes() {
  const [routes, setRoutes] = useState<RouteWithTypes[]>([]);
  const [totalRoutes, setTotalRoutes] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setLoading(true);
    routesApi.getAll(page, pageSize, debouncedSearch).then(async r => {
      const withTypes = await Promise.all(r.items.map(async route => {
        const types = await routeBusTypesApi.getByRoute(route.routeId).catch(() => []);
        return { ...route, busTypes: types.map(t => t.busType), saving: false };
      }));
      setRoutes(withTypes);
      setTotalRoutes(r.totalCount);
      setTotalPages(r.totalPages);
    }).catch(() => toast('Failed to load routes', 'error'))
      .finally(() => setLoading(false));
  }, [page, pageSize, debouncedSearch]);

  const toggleType = async (routeId: number, busType: BusType) => {
    setRoutes(prev => prev.map(r => r.routeId === routeId ? { ...r, saving: true } : r));
    const route = routes.find(r => r.routeId === routeId)!;
    const current = route.busTypes;
    const next = current.includes(busType)
      ? current.filter(t => t !== busType)
      : [...current, busType];
    try {
      const saved = await routeBusTypesApi.set(routeId, next);
      setRoutes(prev => prev.map(r =>
        r.routeId === routeId ? { ...r, busTypes: saved.map(t => t.busType), saving: false } : r
      ));
    } catch {
      toast('Failed to save', 'error');
      setRoutes(prev => prev.map(r => r.routeId === routeId ? { ...r, saving: false } : r));
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">Route Bus Type Mapping</div>
          <div className="text-muted" style={{ marginTop: 2 }}>
            Toggle which bus types operate on each route
          </div>
        </div>
        <input
          className="search-input"
          placeholder="Search routes…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: 200 }}
          autoComplete="off"
        />
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        {BUS_TYPES.map(bt => {
          const m = BUS_TYPE_META[bt];
          return (
            <div key={bt} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--text-2)' }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: m.color, display: 'inline-block' }} />
              {m.label}
            </div>
          );
        })}
      </div>

      {loading ? (
        <div className="text-muted">Loading…</div>
      ) : (
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
              {routes.map(r => (
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
      )}

      <Pagination
        page={page} totalPages={totalPages} pageSize={pageSize} totalCount={totalRoutes}
        onPage={setPage}
        onPageSize={ps => { setPageSize(ps); setPage(1); }}
      />
    </div>
  );
}
