import { useState } from 'react';
import { mtcApi, type MtcRouteInfo } from '../api';

export default function MtcScraper() {
  const [input, setInput]     = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState<MtcRouteInfo | null>(null);
  const [error, setError]     = useState<string | null>(null);

  async function handleFetch(e: React.FormEvent) {
    e.preventDefault();
    const route = input.trim().toUpperCase();
    if (!route) return;
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      setResult(await mtcApi.getStages(route));
    } catch {
      setError(`No stages found for route "${route}". It may not exist on the MTC website.`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-content">
      <div style={{ marginBottom: 16, padding: '8px 12px', background: 'var(--warning-bg, #fff3cd)', border: '1px solid var(--warning-border, #ffc107)', borderRadius: 8, fontSize: 13, color: 'var(--warning-text, #856404)' }}>
        ⚠ Experimental — data is fetched live from the MTC website and is not saved to the database.
      </div>

      <form onSubmit={handleFetch} style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value.toUpperCase())}
          placeholder="Enter route code e.g. 104, 51B, M70"
          style={{ flex: 1, padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 14 }}
        />
        <button type="submit" disabled={loading || !input.trim()} style={{
          padding: '9px 20px', borderRadius: 8, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
          background: 'var(--primary)', color: '#fff', fontWeight: 600, opacity: loading ? 0.7 : 1,
        }}>
          {loading ? 'Fetching…' : 'Fetch Stages'}
        </button>
      </form>

      {error && (
        <div style={{ padding: '10px 14px', background: 'var(--error-bg, #fde8e8)', border: '1px solid var(--error-border, #f5c6cb)', borderRadius: 8, color: 'var(--error-text, #721c24)', fontSize: 13 }}>
          {error}
        </div>
      )}

      {result && (
        <div>
          <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
            {[
              { label: 'Route', value: result.routeCode },
              { label: 'Origin', value: result.origin },
              { label: 'Destination', value: result.destination },
              { label: 'Total Stages', value: String(result.totalStages) },
            ].map(({ label, value }) => (
              <div key={label} style={{ padding: '10px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, minWidth: 120 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{value}</div>
              </div>
            ))}
          </div>

          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: 'var(--surface-alt, var(--surface))' }}>
                  <th style={{ padding: '10px 16px', textAlign: 'left', borderBottom: '1px solid var(--border)', width: 60, color: 'var(--text-muted)', fontWeight: 500 }}>#</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontWeight: 500 }}>Stage Name</th>
                </tr>
              </thead>
              <tbody>
                {result.stages.map((s, i) => (
                  <tr key={s.order} style={{ background: i % 2 === 0 ? 'transparent' : 'var(--surface-alt, rgba(0,0,0,0.02))' }}>
                    <td style={{ padding: '8px 16px', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>{s.order}</td>
                    <td style={{ padding: '8px 16px', borderBottom: '1px solid var(--border)' }}>{s.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
