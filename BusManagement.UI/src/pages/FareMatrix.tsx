import { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { faresApi, BUS_TYPES, type BusType, type Fare } from '../api';

function heatColor(value: number, min: number, max: number): string {
  if (max === min) return 'rgba(192,57,43,0.3)';
  const t = (value - min) / (max - min);
  // cream (low) → red (high)
  const r = Math.round(192 * t + 245 * (1 - t));
  const g = Math.round(57  * t + 237 * (1 - t));
  const b = Math.round(43  * t + 224 * (1 - t));
  return `rgba(${r},${g},${b},${0.15 + t * 0.55})`;
}

export default function FareMatrix() {
  const [allFares, setAllFares] = useState<Record<BusType, Fare[]>>({ Ordinary: [], Express: [], Deluxe: [], AC: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [heatmap, setHeatmap] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all(BUS_TYPES.map(bt => faresApi.getByBusType(bt).then(f => [bt, f] as [BusType, Fare[]])))
      .then(results => setAllFares(Object.fromEntries(results) as Record<BusType, Fare[]>))
      .catch(() => setError('Failed to load fares.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-muted">Loading…</div>;
  if (error)   return <div className="alert alert-error">{error}</div>;

  const maxStages = Math.max(0, ...BUS_TYPES.flatMap(bt => allFares[bt].map(f => f.stages)));
  const stages    = Array.from({ length: maxStages }, (_, i) => i + 1);
  if (maxStages === 0) return <div className="alert alert-info">No fare records found.</div>;

  const allAmounts = BUS_TYPES.flatMap(bt => allFares[bt].map(f => f.fareAmount));
  const minFare = Math.min(...allAmounts);
  const maxFare = Math.max(...allAmounts);

  const exportExcel = () => {
    const header = ['Stages', ...BUS_TYPES];
    const rows = stages.map(s => [
      s,
      ...BUS_TYPES.map(bt => allFares[bt].find(f => f.stages === s)?.fareAmount ?? ''),
    ]);
    const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Fare Matrix');
    XLSX.writeFile(wb, 'fare_matrix.xlsx');
  };

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">Fare Matrix — All Bus Types</div>
          <div className="text-muted" style={{ marginTop: 2 }}>Rows = Stages · Columns = Bus type</div>
        </div>
        <div className="flex-gap">
          <button className={`btn btn-subtle btn-sm${heatmap ? ' active' : ''}`} onClick={() => setHeatmap(h => !h)}>
            🌡 Heatmap
          </button>
          <button className="btn btn-ghost btn-sm" onClick={exportExcel}>⬇ Export</button>
        </div>
      </div>
      <div className="matrix-wrap">
        <table>
          <thead>
            <tr>
              <th>Stages</th>
              {BUS_TYPES.map(bt => <th key={bt}>{bt}</th>)}
            </tr>
          </thead>
          <tbody>
            {stages.map(s => (
              <tr key={s}>
                <td><strong>{s}</strong></td>
                {BUS_TYPES.map(bt => {
                  const fare = allFares[bt].find(f => f.stages === s);
                  const bg = heatmap && fare ? heatColor(fare.fareAmount, minFare, maxFare) : undefined;
                  return (
                    <td key={bt} className="fare-cell" style={{ background: bg, transition: 'background 0.2s' }}>
                      {fare ? `₹${fare.fareAmount.toFixed(2)}` : <span className="text-muted">—</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {heatmap && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, fontSize: '0.72rem', color: 'var(--text-3)' }}>
          <span>Low ₹{minFare.toFixed(2)}</span>
          <div style={{ flex: 1, height: 6, borderRadius: 99, background: 'linear-gradient(90deg, rgba(245,237,224,0.3), rgba(192,57,43,0.7))' }} />
          <span>High ₹{maxFare.toFixed(2)}</span>
        </div>
      )}
    </div>
  );
}
