import { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { importApi, type ImportResult } from '../api';
import { useToast } from '../toast';

type Tab = 'stops' | 'routes' | 'fares';

function downloadStopsTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([
    ['StopCode', 'StopName', 'LatLong', 'ShortName'],
    ['CHN-CTL', 'CHENNAI CENTRAL', '13.0827, 80.2707', 'CENTRAL'],
    ['PARK', 'PARK TOWN', '13.0799, 80.2752', 'PARK'],
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Stops');
  XLSX.writeFile(wb, 'stops_template.xlsx');
}

function downloadRoutesTemplate() {
  const wsRoutes = XLSX.utils.aoa_to_sheet([
    ['RouteCode', 'RouteName'],
    ['101', 'THIRUVOTRIYUR - POONAMALLEE'],
    ['102', 'CENTRAL - TAMBARAM'],
  ]);
  const wsStops = XLSX.utils.aoa_to_sheet([
    ['RouteCode', 'StopCode', 'StopOrder', 'DistanceFromPreviousKm'],
    ['101', 'THV',     1, ''],
    ['101', 'CLV',     2, 2.3],
    ['101', 'PARK',    3, 4.1],
    ['102', 'CHN-CTL', 1, ''],
    ['102', 'PARK',    2, 1.8],
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsRoutes, 'Routes');
  XLSX.utils.book_append_sheet(wb, wsStops, 'RouteStops');
  XLSX.writeFile(wb, 'routes_template.xlsx');
}

function downloadFaresTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([
    ['BusType', 'Stages', 'FareAmount'],
    ['Ordinary', 1, 5.00],
    ['Ordinary', 2, 7.00],
    ['Express',  1, 6.00],
    ['Express',  2, 8.50],
    ['Deluxe',   1, 8.00],
    ['AC',       1, 15.00],
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Fares');
  XLSX.writeFile(wb, 'fares_template.xlsx');
}

const colStyle = { padding: '3px 12px 3px 0' } as const;
const thStyle  = { padding: '4px 12px 4px 0', color: 'var(--text-3)', fontWeight: 600 } as const;

function ColTable({ rows }: { rows: string[][] }) {
  return (
    <table style={{ fontSize: '0.8rem', borderCollapse: 'collapse', width: '100%' }}>
      <thead>
        <tr>
          <th style={thStyle}>Column</th>
          <th style={thStyle}>Field</th>
          <th style={thStyle}>Required</th>
          <th style={{ ...thStyle, paddingRight: 0 }}>Notes</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([col, field, req, note]) => (
          <tr key={col}>
            <td style={colStyle}><span className="badge badge-blue">{col}</span></td>
            <td style={{ ...colStyle, fontWeight: 600 }}>{field}</td>
            <td style={colStyle}>{req}</td>
            <td style={{ color: 'var(--text-2)', padding: '3px 0' }}>{note}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function Import() {
  const [tab, setTab] = useState<Tab>('stops');
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const switchTab = (t: Tab) => {
    setTab(t); setFile(null); setResult(null); setError('');
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setLoading(true); setResult(null); setError('');
    try {
      const r = tab === 'stops' ? await importApi.stops(file)
              : tab === 'routes' ? await importApi.routes(file)
              : await importApi.fares(file);
      setResult(r);
      toast(`Import complete — ${r.imported} imported, ${r.failed} failed`, r.failed === 0 ? 'success' : 'error');
    } catch { setError('Import failed. Check the file format and try again.'); toast('Import failed.', 'error'); }
    finally { setLoading(false); }
  };

  const downloadTemplate = tab === 'stops' ? downloadStopsTemplate
    : tab === 'routes' ? downloadRoutesTemplate
    : downloadFaresTemplate;

  return (
    <>
      <div className="card">
        <div className="tab-bar">
          <button className={`btn${tab === 'stops'  ? ' active' : ''}`} onClick={() => switchTab('stops')}>🚏 Import Stops</button>
          <button className={`btn${tab === 'routes' ? ' active' : ''}`} onClick={() => switchTab('routes')}>🗺️ Import Routes</button>
          <button className={`btn${tab === 'fares'  ? ' active' : ''}`} onClick={() => switchTab('fares')}>💰 Import Fares</button>
        </div>

        {tab === 'stops' && (
          <div className="alert alert-info" style={{ marginBottom: 16, display: 'block' }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Expected Excel format (.xlsx)</div>
            <ColTable rows={[
              ['A', 'StopCode',  '✓', 'Must be unique. e.g. CHN-CTL'],
              ['B', 'StopName',  '✓', 'Full name. e.g. CHENNAI CENTRAL'],
              ['C', 'LatLong',   '—', 'Comma separated. e.g. 13.0827, 80.2707'],
              ['D', 'ShortName', '—', 'Abbreviated name. e.g. CENTRAL'],
            ]} />
            <div style={{ marginTop: 8, color: 'var(--text-2)', fontSize: '0.8rem' }}>⚠️ Row 1 is treated as a header and will be skipped automatically.</div>
          </div>
        )}

        {tab === 'routes' && (
          <div className="alert alert-info" style={{ marginBottom: 16, display: 'block' }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Expected Excel format (.xlsx) — 2 sheets in the same file</div>
            <div style={{ fontWeight: 600, fontSize: '0.8rem', marginBottom: 4, color: 'var(--text-2)' }}>Sheet 1 — Routes</div>
            <ColTable rows={[
              ['A', 'RouteCode', '✓', 'Must be unique. e.g. 101'],
              ['B', 'RouteName', '✓', 'e.g. THIRUVOTRIYUR - POONAMALLEE'],
            ]} />
            <div style={{ fontWeight: 600, fontSize: '0.8rem', margin: '10px 0 4px', color: 'var(--text-2)' }}>Sheet 2 — RouteStops</div>
            <ColTable rows={[
              ['A', 'RouteCode',              '✓', 'Must match a route in Sheet 1 or already in the database'],
              ['B', 'StopCode',               '✓', 'Stop must already exist — import stops first'],
              ['C', 'StopOrder',              '✓', 'Numeric, unique per route. e.g. 1, 2, 3…'],
              ['D', 'DistanceFromPreviousKm', '—', 'Leave blank for the first stop. e.g. 2.3'],
            ]} />
            <div style={{ marginTop: 8, color: 'var(--text-2)', fontSize: '0.8rem' }}>⚠️ Row 1 in both sheets is treated as a header and will be skipped. Always import Stops before importing Routes.</div>
          </div>
        )}

        {tab === 'fares' && (
          <div className="alert alert-info" style={{ marginBottom: 16, display: 'block' }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Expected Excel format (.xlsx)</div>
            <ColTable rows={[
              ['A', 'BusType',    '✓', 'Ordinary, Express, Deluxe, or AC'],
              ['B', 'Stages',     '✓', 'Numeric. e.g. 1, 2, 3…'],
              ['C', 'FareAmount', '✓', 'Decimal. e.g. 5.00'],
            ]} />
            <div style={{ marginTop: 8, color: 'var(--text-2)', fontSize: '0.8rem' }}>⚠️ Row 1 is treated as a header and will be skipped. Existing stage entries for the same bus type will be skipped.</div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-row" style={{ alignItems: 'flex-end' }}>
            <div className="form-group">
              <label>Select .xlsx file *</label>
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx"
                required
                onChange={e => { setFile(e.target.files?.[0] ?? null); setResult(null); setError(''); }}
                style={{ padding: '6px 10px' }}
              />
            </div>
            <div className="flex-gap" style={{ paddingBottom: 1 }}>
              <button type="submit" className="btn btn-primary" disabled={loading || !file}>
                {loading ? 'Importing…' : '⬆️ Import'}
              </button>
              <button type="button" className="btn btn-subtle" onClick={downloadTemplate}>
                ⬇️ Download Template
              </button>
            </div>
          </div>
        </form>
      </div>

      {error && <div className="alert alert-error">⚠️ {error}</div>}

      {result && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">Import Result</div>
            <span className={`badge ${result.failed === 0 ? 'badge-green' : 'badge-amber'}`}>
              {result.failed === 0 ? '✓ Complete' : `${result.failed} failed`}
            </span>
          </div>
          <div className="summary-row">
            <div className="summary-item">
              <div className="label">Imported</div>
              <div className="value" style={{ color: 'var(--green)' }}>{result.imported}</div>
            </div>
            <div className="summary-item">
              <div className="label">Skipped</div>
              <div className="value">{result.skipped}</div>
            </div>
            <div className="summary-item" style={{ borderColor: result.failed > 0 ? 'rgba(192,57,43,.3)' : undefined, background: result.failed > 0 ? 'var(--red-dim)' : undefined }}>
              <div className="label">Failed</div>
              <div className="value" style={{ color: result.failed > 0 ? 'var(--red)' : undefined }}>{result.failed}</div>
            </div>
          </div>
          {result.errors.length > 0 && (
            <>
              <div className="card-title" style={{ marginBottom: 10 }}>Errors</div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th style={{ width: 80 }}>Row</th><th>Reason</th></tr></thead>
                  <tbody>
                    {result.errors.map((err, i) => (
                      <tr key={i}>
                        <td><span className="badge badge-red">Row {err.row}</span></td>
                        <td style={{ color: 'var(--red)' }}>{err.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
