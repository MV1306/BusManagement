const PAGE_SIZE_OPTIONS = [10, 25, 50, 100, 200];

interface PaginationProps {
  page: number;
  totalPages: number;
  pageSize: number;
  totalCount: number;
  onPage: (p: number) => void;
  onPageSize: (size: number) => void;
}

export default function Pagination({ page, totalPages, pageSize, totalCount, onPage, onPageSize }: PaginationProps) {
  const from = Math.min((page - 1) * pageSize + 1, totalCount);
  const to = Math.min(page * pageSize, totalCount);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', flexWrap: 'wrap' }}>
      <span className="text-muted" style={{ fontSize: '0.85rem' }}>{from}–{to} of {totalCount}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
        <span className="text-muted" style={{ fontSize: '0.85rem' }}>Rows per page:</span>
        <select value={pageSize} onChange={e => onPageSize(Number(e.target.value))}
          style={{ fontSize: '0.85rem', padding: '2px 6px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}>
          {PAGE_SIZE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button className="btn btn-subtle btn-sm" onClick={() => onPage(page - 1)} disabled={page === 1}>‹ Prev</button>
        <span className="text-muted" style={{ fontSize: '0.85rem' }}>Page {page} of {totalPages}</span>
        <button className="btn btn-subtle btn-sm" onClick={() => onPage(page + 1)} disabled={page === totalPages}>Next ›</button>
      </div>
    </div>
  );
}
