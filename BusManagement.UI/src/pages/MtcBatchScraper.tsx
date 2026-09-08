import { useRef, useState } from 'react';
import { mtcApi, type MtcBatchItem, type MtcRouteInfo } from '../api';

export default function MtcBatchScraper() {
  const [input, setInput]       = useState('');
  const [tags, setTags]         = useState<string[]>([]);
  const [results, setResults]   = useState<MtcBatchItem[]>([]);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Tag input helpers ──────────────────────────────────────────────────

  function addTag(raw: string) {
    const parts = raw.split(/[\s,;]+/).map(s => s.trim().toUpperCase()).filter(Boolean);
    setTags(prev => {
      const next = [...prev];
      for (const p of parts) if (!next.includes(p)) next.push(p);
      return next;
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
      e.preventDefault();
      if (input.trim()) { addTag(input); setInput(''); }
    } else if (e.key === 'Backspace' && !input) {
      setTags(prev => prev.slice(0, -1));
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    addTag(e.clipboardData.getData('text'));
    setInput('');
  }

  function removeTag(tag: string) {
    setTags(prev => prev.filter(t => t !== tag));
  }

  // ── Fetch ──────────────────────────────────────────────────────────────

  async function handleFetch(e: React.FormEvent) {
    e.preventDefault();
    const pending = input.trim() ? [...tags, ...input.trim().toUpperCase().split(/[\s,;]+/).filter(Boolean)] : tags;
    const unique  = [...new Set(pending)];
    if (unique.length === 0) return;
    if (input.trim()) { setTags(unique); setInput(''); }

    setResults([]);
    setExpanded(new Set());
    setProgress({ done: 0, total: unique.length });

    // Fire all requests in parallel but update progress as each resolves
    const settled = await Promise.allSettled(
      unique.map(route =>
        mtcApi.getStages(route)
          .then(data => {
            const item: MtcBatchItem = { status: 'ok', routeCode: route, data };
            setProgress(p => p ? { ...p, done: p.done + 1 } : p);
            setResults(prev => [...prev, item]);
            return item;
          })
          .catch(() => {
            const item: MtcBatchItem = { status: 'error', routeCode: route, error: `No stages found for route "${route}". It may not exist on the MTC website.` };
            setProgress(p => p ? { ...p, done: p.done + 1 } : p);
            setResults(prev => [...prev, item]);
            return item;
          })
      )
    );

    // Re-sort to match original input order
    const ordered = unique.map(r => settled.find(s => s.status === 'fulfilled' && s.value.routeCode === r)?.status === 'fulfilled'
      ? (settled.find(s => s.status === 'fulfilled' && s.value.routeCode === r) as PromiseFulfilledResult<MtcBatchItem>).value
      : { status: 'error' as const, routeCode: r, error: 'Unknown error' }
    );
    setResults(ordered);
    setProgress(p => p ? { ...p, done: p.total } : p);
  }

  function toggleExpand(code: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(code) ? next.delete(code) : next.add(code);
      return next;
    });
  }

  function expandAll()   { setExpanded(new Set(results.filter(r => r.status === 'ok').map(r => r.routeCode))); }
  function collapseAll() { setExpanded(new Set()); }

  const isLoading = progress !== null && progress.done < progress.total;
  const okCount   = results.filter(r => r.status === 'ok').length;
  const errCount  = results.filter(r => r.status === 'error').length;

  return (
    <div className="page-content">
      <div style={{ marginBottom: 16, padding: '8px 12px', background: 'var(--warning-bg, #fff3cd)', border: '1px solid var(--warning-border, #ffc107)', borderRadius: 8, fontSize: 13, color: 'var(--warning-text, #856404)' }}>
        ⚠ Experimental — data is fetched live from the MTC website and is not saved to the database.
      </div>

      {/* Tag input */}
      <form onSubmit={handleFetch} style={{ marginBottom: 24 }}>
        <div
          onClick={() => inputRef.current?.focus()}
          style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', cursor: 'text', minHeight: 44, alignItems: 'center' }}
        >
          {tags.map(tag => (
            <span key={tag} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 6, background: 'var(--primary)', color: '#fff', fontSize: 13, fontWeight: 600 }}>
              {tag}
              <button type="button" onClick={() => removeTag(tag)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 0, lineHeight: 1, fontSize: 14, opacity: 0.8 }}>×</button>
            </span>
          ))}
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value.toUpperCase())}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={tags.length === 0 ? 'Type route codes e.g. 104, 51B, M70 — press Enter or comma to add' : ''}
            style={{ flex: 1, minWidth: 180, border: 'none', outline: 'none', background: 'transparent', color: 'var(--text)', fontSize: 14, padding: '2px 4px' }}
          />
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 10, alignItems: 'center' }}>
          <button type="submit" disabled={isLoading || (tags.length === 0 && !input.trim())} style={{
            padding: '9px 20px', borderRadius: 8, border: 'none', cursor: isLoading ? 'not-allowed' : 'pointer',
            background: 'var(--primary)', color: '#fff', fontWeight: 600, opacity: isLoading ? 0.7 : 1,
          }}>
            {isLoading ? `Fetching… ${progress!.done} / ${progress!.total}` : `Fetch ${tags.length + (input.trim() ? 1 : 0) || ''} Route${tags.length !== 1 ? 's' : ''}`}
          </button>
          {tags.length > 0 && !isLoading && (
            <button type="button" onClick={() => { setTags([]); setResults([]); setProgress(null); }} style={{ padding: '9px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13 }}>
              Clear all
            </button>
          )}
          <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 4 }}>
            Tip: paste a comma/space-separated list to add multiple at once
          </span>
        </div>
      </form>

      {/* Progress bar */}
      {progress && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
            <span>{isLoading ? 'Fetching in parallel…' : 'Done'} — {progress.done} / {progress.total}</span>
            {!isLoading && <span style={{ color: okCount > 0 ? 'var(--success, #198754)' : undefined }}>{okCount} ok{errCount > 0 ? `, ${errCount} failed` : ''}</span>}
          </div>
          <div style={{ height: 6, borderRadius: 4, background: 'var(--border)', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 4, background: 'var(--primary)', width: `${(progress.done / progress.total) * 100}%`, transition: 'width 0.2s' }} />
          </div>
        </div>
      )}

      {/* Results toolbar */}
      {results.length > 0 && !isLoading && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: 'var(--text-muted)', flex: 1 }}>
            {okCount} route{okCount !== 1 ? 's' : ''} fetched{errCount > 0 ? `, ${errCount} failed` : ''}
          </span>
          <button type="button" onClick={expandAll} style={toolbarBtn}>Expand all</button>
          <button type="button" onClick={collapseAll} style={toolbarBtn}>Collapse all</button>
        </div>
      )}

      {/* Result cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {results.map(item => (
          <ResultCard
            key={item.routeCode}
            item={item}
            expanded={expanded.has(item.routeCode)}
            onToggle={() => toggleExpand(item.routeCode)}
          />
        ))}
      </div>
    </div>
  );
}

// ── Result card ────────────────────────────────────────────────────────────

function ResultCard({ item, expanded, onToggle }: { item: MtcBatchItem; expanded: boolean; onToggle: () => void }) {
  if (item.status === 'error') {
    return (
      <div style={{ padding: '10px 14px', background: 'var(--error-bg, #fde8e8)', border: '1px solid var(--error-border, #f5c6cb)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--error-text, #721c24)', minWidth: 60 }}>{item.routeCode}</span>
        <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 4, background: 'var(--error-text, #721c24)', color: '#fff', fontWeight: 600 }}>ERROR</span>
        <span style={{ fontSize: 13, color: 'var(--error-text, #721c24)' }}>{item.error}</span>
      </div>
    );
  }

  const d: MtcRouteInfo = item.data;
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', background: 'var(--surface)' }}>
      {/* Header row — always visible */}
      <button
        type="button"
        onClick={onToggle}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', color: 'var(--text)' }}
      >
        <span style={{ fontWeight: 700, fontSize: 14, minWidth: 60 }}>{d.routeCode}</span>
        <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 4, background: 'var(--primary)', color: '#fff', fontWeight: 600 }}>OK</span>
        <span style={{ fontSize: 13, color: 'var(--text-muted)', flex: 1 }}>{d.origin} → {d.destination}</span>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{d.totalStages} stages</span>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 6 }}>{expanded ? '▲' : '▼'}</span>
      </button>

      {/* Expanded: summary chips + stage table */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '12px 14px' }}>
          <div style={{ display: 'flex', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
            {[
              { label: 'Origin',       value: d.origin },
              { label: 'Destination',  value: d.destination },
              { label: 'Total Stages', value: String(d.totalStages) },
            ].map(({ label, value }) => (
              <div key={label} style={{ padding: '8px 14px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>{label}</div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{value}</div>
              </div>
            ))}
          </div>

          <div style={{ borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--surface-alt, var(--surface))' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid var(--border)', width: 50, color: 'var(--text-muted)', fontWeight: 500 }}>#</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontWeight: 500 }}>Stage Name</th>
                </tr>
              </thead>
              <tbody>
                {d.stages.map((s, i) => (
                  <tr key={s.order} style={{ background: i % 2 === 0 ? 'transparent' : 'var(--surface-alt, rgba(0,0,0,0.02))' }}>
                    <td style={{ padding: '6px 12px', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>{s.order}</td>
                    <td style={{ padding: '6px 12px', borderBottom: '1px solid var(--border)' }}>{s.name}</td>
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

const toolbarBtn: React.CSSProperties = {
  padding: '5px 12px', borderRadius: 6, border: '1px solid var(--border)',
  background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12,
};
