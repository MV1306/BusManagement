import { useEffect, useState } from 'react';
import { faresApi, type AuditLog } from '../api';
import { useToast } from '../toast';

const ACTION_BADGE: Record<AuditLog['action'], string> = {
  Created: 'badge-green',
  Updated: 'badge-amber',
  Deleted: 'badge-red',
};

export default function FareAudit() {
  const [logs, setLogs]     = useState<AuditLog[]>([]);
  const [page, setPage]     = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const { toast } = useToast();
  const PAGE_SIZE = 50;

  const load = async (p: number) => {
    setLoading(true);
    try {
      const data = await faresApi.getAudit(p, PAGE_SIZE);
      setLogs(prev => p === 1 ? data : [...prev, ...data]);
      setHasMore(data.length === PAGE_SIZE);
    } catch { toast('Failed to load audit log', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(1); }, []);

  const loadMore = () => { const next = page + 1; setPage(next); load(next); };

  const fmt = (iso: string) => new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">Fare Audit Log</div>
          <div className="text-muted" style={{ marginTop: 2 }}>{logs.length} entries loaded</div>
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Action</th><th>Bus Type</th><th>Stages</th>
              <th>Old Amount</th><th>New Amount</th><th>Changed By</th><th>Changed At</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(l => (
              <tr key={l.auditId}>
                <td><span className={`badge ${ACTION_BADGE[l.action]}`}>{l.action}</span></td>
                <td><span className="badge badge-slate">{l.busType}</span></td>
                <td>{l.stages}</td>
                <td className="text-muted">{l.oldAmount != null ? `₹${l.oldAmount}` : '—'}</td>
                <td>{l.newAmount != null ? `₹${l.newAmount}` : '—'}</td>
                <td className="text-muted">{l.changedBy}</td>
                <td className="text-muted">{fmt(l.changedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {hasMore && (
        <div style={{ padding: '12px 16px' }}>
          <button className="btn btn-subtle btn-sm" onClick={loadMore} disabled={loading}>
            {loading ? 'Loading…' : 'Load More'}
          </button>
        </div>
      )}
    </div>
  );
}
