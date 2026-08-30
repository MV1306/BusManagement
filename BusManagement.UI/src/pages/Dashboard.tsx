import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardApi, type DashboardSummary } from '../api';

// ── Sparkline ────────────────────────────────────────────────────────────────
function Sparkline({ data }: { data: { date: string; count: number }[] }) {
  const max = Math.max(...data.map(d => d.count), 1);
  const w = 120, h = 36, pad = 2;
  const pts = data.map((d, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2);
    const y = h - pad - ((d.count / max) * (h - pad * 2));
    return `${x},${y}`;
  }).join(' ');
  const area = `${pad},${h - pad} ${pts} ${w - pad},${h - pad}`;
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      <defs>
        <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#spark-fill)" />
      <polyline points={pts} fill="none" stroke="var(--primary)" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// ── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, accent, spark }: {
  label: string; value: number | string; sub?: string;
  accent?: 'red' | 'green' | 'amber' | 'teal';
  spark?: { date: string; count: number }[];
}) {
  const colors = { red: 'var(--red)', green: 'var(--green)', amber: 'var(--amber)', teal: 'var(--teal)' };
  return (
    <div className="dash-stat">
      <div className="dash-stat-label">{label}</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 }}>
        <div className="dash-stat-value" style={{ color: accent ? colors[accent] : undefined }}>{value}</div>
        {spark && <Sparkline data={spark} />}
      </div>
      {sub && <div className="dash-stat-sub">{sub}</div>}
    </div>
  );
}

// ── Health Bar ───────────────────────────────────────────────────────────────
function HealthBar({ label, active, total }: { label: string; active: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((active / total) * 100);
  const color = pct >= 90 ? 'var(--green)' : pct >= 60 ? 'var(--amber)' : 'var(--red)';
  return (
    <div className="health-bar-row">
      <div className="health-bar-label">
        <span>{label}</span>
        <span style={{ color }}>{active} / {total}</span>
      </div>
      <div className="health-bar-track">
        <div className="health-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className="health-bar-pct" style={{ color }}>{pct}%</div>
    </div>
  );
}

// ── Bus Type Badge ───────────────────────────────────────────────────────────
const BUS_TYPE_COLORS: Record<string, string> = {
  Ordinary: 'var(--text-3)',
  Express:  'var(--teal)',
  Deluxe:   'var(--amber)',
  AC:       'var(--primary)',
};

function BusTypeBadge({ type }: { type: string }) {
  return (
    <span style={{
      fontSize: '0.62rem', fontWeight: 700, padding: '2px 7px',
      borderRadius: 99, border: `1px solid ${BUS_TYPE_COLORS[type] ?? 'var(--border-strong)'}`,
      color: BUS_TYPE_COLORS[type] ?? 'var(--text-3)', letterSpacing: '0.05em',
      whiteSpace: 'nowrap',
    }}>{type}</span>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    dashboardApi.getSummary()
      .then(setData)
      .catch(() => setError('Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-muted">Loading dashboard…</div>;
  if (error)   return <div className="alert alert-error">{error}</div>;
  if (!data)   return null;

  const lastImport = data.lastImportedAt
    ? new Date(data.lastImportedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
    : 'Never';

  const totalActivity = data.stopsLast7Days.reduce((s, d) => s + d.count, 0);

  return (
    <>
      {/* ── Stat row ── */}
      <div className="dash-stats-grid">
        <StatCard label="Total Stops"  value={data.totalStops}
          sub={`${data.activeStops} active · ${data.inactiveStops} inactive`}
          spark={data.stopsLast7Days} />
        <StatCard label="Total Routes" value={data.totalRoutes}
          sub={`${data.activeRoutes} active · ${data.inactiveRoutes} inactive`} />
        <StatCard label="Fare Entries" value={data.totalFareEntries} accent="teal" />
        <StatCard label="Last Import"  value={lastImport} />
      </div>

      {/* ── Warnings ── */}
      {(data.routesWithNoStops > 0 || data.stopsWithNoCoordinates > 0) && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header"><div className="card-title">⚠ Attention Required</div></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {data.routesWithNoStops > 0 && (
              <div className="alert alert-error" style={{ marginBottom: 0 }}>
                <strong>{data.routesWithNoStops}</strong> route{data.routesWithNoStops > 1 ? 's have' : ' has'} no stops mapped
              </div>
            )}
            {data.stopsWithNoCoordinates > 0 && (
              <div className="alert alert-info" style={{ marginBottom: 0 }}>
                <strong>{data.stopsWithNoCoordinates}</strong> stop{data.stopsWithNoCoordinates > 1 ? 's are' : ' is'} missing GPS coordinates
              </div>
            )}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* ── Health ── */}
        <div className="card">
          <div className="card-header"><div className="card-title">System Health</div></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <HealthBar label="Stops"  active={data.activeStops}  total={data.totalStops} />
            <HealthBar label="Routes" active={data.activeRoutes} total={data.totalRoutes} />
            <HealthBar label="Routes with Stops"
              active={data.totalRoutes - data.routesWithNoStops}
              total={data.totalRoutes} />
          </div>
        </div>

        {/* ── Activity ── */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Stop Activity — Last 7 Days</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{totalActivity} added</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 80 }}>
            {data.stopsLast7Days.map(d => {
              const max = Math.max(...data.stopsLast7Days.map(x => x.count), 1);
              const pct = (d.count / max) * 100;
              return (
                <div key={d.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{ fontSize: '0.6rem', color: 'var(--text-3)', fontWeight: 600 }}>
                    {d.count > 0 ? d.count : ''}
                  </div>
                  <div style={{
                    width: '100%', borderRadius: 4,
                    height: `${Math.max(pct, d.count > 0 ? 8 : 2)}%`,
                    background: d.count > 0 ? 'var(--primary)' : 'var(--surface-3)',
                    transition: 'height 0.4s ease',
                    minHeight: 2,
                  }} />
                  <div style={{ fontSize: '0.58rem', color: 'var(--text-3)', whiteSpace: 'nowrap' }}>{d.date}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        {/* ── Recent Routes ── */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Recently Added Routes</div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/routes')}>View all →</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {data.recentRoutes.length === 0 && (
              <div style={{ color: 'var(--text-3)', fontSize: '0.85rem', padding: '12px 0' }}>No routes yet</div>
            )}
            {data.recentRoutes.map(r => (
              <div key={r.routeId} className="dash-route-row" onClick={() => navigate('/routes')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                  <span className="route-badge" style={{ fontSize: '0.72rem', minWidth: 52, textAlign: 'center' }}>
                    {r.routeCode}
                  </span>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.routeName}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                  {r.busTypes.map(bt => <BusTypeBadge key={bt} type={bt} />)}
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-3)', minWidth: 52, textAlign: 'right' }}>
                    {r.stopCount} stops
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-3)', minWidth: 56, textAlign: 'right' }}>
                    {r.totalDistanceKm.toFixed(1)} km
                  </span>
                  <span style={{
                    width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                    background: r.isActive ? 'var(--green)' : 'var(--red)',
                    boxShadow: r.isActive ? '0 0 5px var(--green)' : undefined,
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Top Routes ── */}
        <div className="card">
          <div className="card-header"><div className="card-title">Top Routes by Stops</div></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {data.topRoutesByStops.length === 0 && (
              <div style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>No data yet</div>
            )}
            {data.topRoutesByStops.map((r, i) => {
              const max = data.topRoutesByStops[0]?.stopCount ?? 1;
              const pct = (r.stopCount / max) * 100;
              return (
                <div key={r.routeId} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-3)', fontWeight: 700, width: 14 }}>#{i + 1}</span>
                      <span className="route-badge" style={{ fontSize: '0.68rem' }}>{r.routeCode}</span>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-2)', fontWeight: 600 }}>{r.stopCount}</span>
                  </div>
                  <div style={{ height: 4, background: 'var(--surface-3)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: 'var(--primary)', borderRadius: 99, transition: 'width 0.5s ease' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
