import { useEffect, useState } from 'react';
import { dashboardApi, type DashboardSummary } from '../api';

function StatCard({ label, value, sub, accent }: { label: string; value: number | string; sub?: string; accent?: 'red' | 'green' | 'amber' }) {
  const colors = { red: 'var(--red)', green: 'var(--green)', amber: 'var(--amber)' };
  return (
    <div className="dash-stat">
      <div className="dash-stat-label">{label}</div>
      <div className="dash-stat-value" style={{ color: accent ? colors[accent] : undefined }}>{value}</div>
      {sub && <div className="dash-stat-sub">{sub}</div>}
    </div>
  );
}

function HealthBar({ label, active, total }: { label: string; active: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((active / total) * 100);
  const color = pct >= 90 ? 'var(--green)' : pct >= 60 ? 'var(--amber)' : 'var(--red)';
  return (
    <div className="health-bar-row">
      <div className="health-bar-label">
        <span>{label}</span>
        <span style={{ color }}>{active} / {total} active</span>
      </div>
      <div className="health-bar-track">
        <div className="health-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className="health-bar-pct" style={{ color }}>{pct}%</div>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    dashboardApi.getSummary()
      .then(setData)
      .catch(() => setError('Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-muted">Loading dashboard…</div>;
  if (error) return <div className="alert alert-error">{error}</div>;
  if (!data) return null;

  const lastImport = data.lastImportedAt
    ? new Date(data.lastImportedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
    : 'Never';

  return (
    <>
      {/* ── Top stat row ── */}
      <div className="dash-stats-grid">
        <StatCard label="Total Stops"  value={data.totalStops}  sub={`${data.inactiveStops} inactive`} />
        <StatCard label="Total Routes" value={data.totalRoutes} sub={`${data.inactiveRoutes} inactive`} />
        <StatCard label="Fare Entries" value={data.totalFareEntries} />
        <StatCard label="Last Import"  value={lastImport} />
      </div>

      {/* ── Health ── */}
      <div className="card">
        <div className="card-header"><div className="card-title">System Health</div></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <HealthBar label="Stops"  active={data.activeStops}  total={data.totalStops} />
          <HealthBar label="Routes" active={data.activeRoutes} total={data.totalRoutes} />
        </div>
      </div>

      {/* ── Warnings ── */}
      {(data.routesWithNoStops > 0 || data.stopsWithNoCoordinates > 0) && (
        <div className="card">
          <div className="card-header"><div className="card-title">Attention Required</div></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {data.routesWithNoStops > 0 && (
              <div className="alert alert-error" style={{ marginBottom: 0 }}>
                ⚠️ <strong>{data.routesWithNoStops}</strong> route{data.routesWithNoStops > 1 ? 's have' : ' has'} no stops mapped
              </div>
            )}
            {data.stopsWithNoCoordinates > 0 && (
              <div className="alert alert-info" style={{ marginBottom: 0 }}>
                📍 <strong>{data.stopsWithNoCoordinates}</strong> stop{data.stopsWithNoCoordinates > 1 ? 's are' : ' is'} missing GPS coordinates
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Quick numbers ── */}
      <div className="card">
        <div className="card-header"><div className="card-title">Quick Numbers</div></div>
        <div className="summary-row" style={{ marginBottom: 0 }}>
          <div className="summary-item">
            <div className="label">Active Stops</div>
            <div className="value" style={{ color: 'var(--green)' }}>{data.activeStops}</div>
          </div>
          <div className="summary-item">
            <div className="label">Inactive Stops</div>
            <div className="value" style={{ color: data.inactiveStops > 0 ? 'var(--amber)' : 'var(--text-3)' }}>{data.inactiveStops}</div>
          </div>
          <div className="summary-item">
            <div className="label">Active Routes</div>
            <div className="value" style={{ color: 'var(--green)' }}>{data.activeRoutes}</div>
          </div>
          <div className="summary-item">
            <div className="label">Inactive Routes</div>
            <div className="value" style={{ color: data.inactiveRoutes > 0 ? 'var(--amber)' : 'var(--text-3)' }}>{data.inactiveRoutes}</div>
          </div>
          <div className="summary-item">
            <div className="label">Routes w/o Stops</div>
            <div className="value" style={{ color: data.routesWithNoStops > 0 ? 'var(--red)' : 'var(--green)' }}>{data.routesWithNoStops}</div>
          </div>
          <div className="summary-item">
            <div className="label">Stops w/o Coords</div>
            <div className="value" style={{ color: data.stopsWithNoCoordinates > 0 ? 'var(--amber)' : 'var(--green)' }}>{data.stopsWithNoCoordinates}</div>
          </div>
        </div>
      </div>
    </>
  );
}
