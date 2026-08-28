import { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { stopsApi, geocodingApi, type Stop } from '../api';
import { useToast, useConfirm } from '../toast';
import StopAutocomplete from '../components/StopAutocomplete';
import Pagination from '../components/Pagination';

const empty = { stopCode: '', stopName: '', shortName: '', coordinates: '' };

function generateStopCode(name: string): string {
  const words = name.trim().toUpperCase().split(/\s+/).filter(Boolean);
  let prefix = '';
  let wi = 0, ci = 0;
  while (prefix.length < 3) {
    if (wi >= words.length) { prefix = prefix.padEnd(3, 'X'); break; }
    prefix += words[wi][ci] ?? '';
    wi++;
    if (wi >= words.length) { wi = 0; ci++; }
  }
  const hex = Date.now().toString(16).toUpperCase().slice(-6);
  return `${prefix.slice(0, 3)}-${hex}`;
}

export default function Stops() {
  const [stops, setStops]       = useState<Stop[]>([]);
  const [allStops, setAllStops] = useState<Stop[]>([]);
  const [totalStops, setTotalStops] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [form, setForm]         = useState(empty);
  const [editing, setEditing]   = useState<Stop | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch]     = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [mergeSource, setMergeSource] = useState('');
  const [mergeTarget, setMergeTarget] = useState('');
  const [geocoding, setGeocoding] = useState(false);
  const { toast } = useToast();
  const { confirm, Dialog } = useConfirm();

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = (p: number, ps: number, s: string) => stopsApi.getAll(p, ps, s).then(r => {
    setStops(r.items); setTotalStops(r.totalCount); setTotalPages(r.totalPages);
  }).catch(() => toast('Failed to load stops', 'error'));

  const loadAllForMerge = () => stopsApi.getAllUnpaged().then(r => setAllStops(r.items));

  useEffect(() => { load(page, pageSize, debouncedSearch); }, [page, pageSize, debouncedSearch]);
  useEffect(() => { loadAllForMerge(); }, []);

  const fetchCoordinates = async () => {
    if (!form.stopName) { toast('Enter a stop name first.', 'error'); return; }
    setGeocoding(true);
    try {
      const coords = await geocodingApi.geocode(form.stopName);
      setForm(f => ({ ...f, coordinates: `${coords.latitude}, ${coords.longitude}` }));
      toast('Coordinates fetched!', 'success');
    } catch { toast('Could not find coordinates for this stop name.', 'error'); }
    finally { setGeocoding(false); }
  };

  const openCreate = () => { setEditing(null); setForm(empty); setShowForm(true); };
  const openEdit   = (s: Stop) => {
    setEditing(s);
    setForm({ stopCode: s.stopCode, stopName: s.stopName, shortName: s.shortName ?? '',
      coordinates: s.latitude != null ? `${s.latitude}, ${s.longitude}` : '' });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const [lat, lng] = form.coordinates.split(',').map(v => v.trim());
    const payload = {
      stopCode: form.stopCode, stopName: form.stopName,
      shortName: form.shortName || undefined,
      latitude:  lat ? Number(lat) : undefined,
      longitude: lng ? Number(lng) : undefined,
    };
    try {
      if (editing) await stopsApi.update(editing.stopId, { ...payload, isActive: editing.isActive });
      else         await stopsApi.create(payload);
      setShowForm(false);
      load(page, pageSize, debouncedSearch);
      toast(editing ? 'Stop updated' : 'Stop created', 'success');
    } catch { toast('Save failed. Check required fields.', 'error'); }
  };

  const handleDelete = async (s: Stop) => {
    if (!await confirm(`Delete stop "${s.stopName}"?`)) return;
    try { await stopsApi.delete(s.stopId); load(page, pageSize, debouncedSearch); toast('Stop deleted', 'success'); }
    catch { toast('Delete failed.', 'error'); }
  };

  const toggleActive = async (s: Stop) => {
    try {
      await stopsApi.update(s.stopId, { isActive: !s.isActive });
      load(page, pageSize, debouncedSearch);
      toast(`Stop marked ${!s.isActive ? 'active' : 'inactive'}`, 'success');
    } catch { toast('Update failed.', 'error'); }
  };

  // ── Merge ─────────────────────────────────────────────────────────────────
  const handleMerge = async () => {
    if (!mergeSource || !mergeTarget) return;
    if (mergeSource === mergeTarget) { toast('Cannot merge a stop into itself.', 'error'); return; }
    const srcStop = allStops.find(s => String(s.stopId) === mergeSource);
    const tgtStop = allStops.find(s => String(s.stopId) === mergeTarget);
    if (!await confirm(`Merge "${srcStop?.stopName}" INTO "${tgtStop?.stopName}"? The first stop will be deleted.`)) return;
    try {
      const res = await stopsApi.merge(Number(mergeTarget), Number(mergeSource));
      toast(`Merged successfully. ${res.affectedRoutes} route(s) updated.`, 'success');
      setMergeSource(''); setMergeTarget('');
      load(page, pageSize, debouncedSearch); loadAllForMerge();
    } catch { toast('Merge failed.', 'error'); }
  };

  // ── Bulk ──────────────────────────────────────────────────────────────────
  const toggleSelect = (id: number) =>
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const toggleSelectAll = () =>
    setSelected(prev => prev.size === filtered.length ? new Set() : new Set(filtered.map(s => s.stopId)));

  const bulkSetActive = async (active: boolean) => {
    if (!await confirm(`Mark ${selected.size} stop(s) as ${active ? 'active' : 'inactive'}?`)) return;
    try {
      await Promise.all([...selected].map(id => stopsApi.update(id, { isActive: active })));
      setSelected(new Set()); load(page, pageSize, debouncedSearch);
      toast(`${selected.size} stop(s) marked ${active ? 'active' : 'inactive'}`, 'success');
    } catch { toast('Bulk update failed.', 'error'); }
  };

  // ── Export ────────────────────────────────────────────────────────────────
  const exportExcel = () => {
    const rows = filtered.map(s => ({
      StopCode: s.stopCode, StopName: s.stopName, ShortName: s.shortName ?? '',
      Latitude: s.latitude ?? '', Longitude: s.longitude ?? '',
      Status: s.isActive ? 'Active' : 'Inactive',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Stops');
    XLSX.writeFile(wb, 'stops_export.xlsx');
  };

  const filtered = stops;

  const allSelected = filtered.length > 0 && selected.size === filtered.length;

  return (
    <>
      {Dialog}

      {showForm && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">{editing ? 'Edit Stop' : 'New Stop'}</div>
            <button type="button" className="btn btn-subtle btn-sm" onClick={() => setShowForm(false)}>✕ Close</button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Stop Name *</label>
                <input value={form.stopName} onChange={e => {
                  const name = e.target.value.toUpperCase();
                  setForm(f => ({
                    ...f,
                    stopName: name,
                    stopCode: !editing && name.length >= 3 ? generateStopCode(name) : f.stopCode,
                    shortName: !editing ? name : f.shortName,
                  }));
                }} required maxLength={100} placeholder="e.g. Chennai Central" style={{ textTransform: 'uppercase' }} />
              </div>
              <div className="form-group">
                <label>Stop Code</label>
                <input value={form.stopCode} readOnly style={{ background: 'var(--bg-subtle, #f5f5f5)', cursor: 'default' }} />
              </div>
              <div className="form-group">
                <label>Short Name</label>
                <input value={form.shortName} onChange={e => setForm(f => ({ ...f, shortName: e.target.value.toUpperCase() }))} maxLength={50} placeholder="e.g. Central" style={{ textTransform: 'uppercase' }} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Coordinates (lat, lng)</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input value={form.coordinates} onChange={e => setForm(f => ({ ...f, coordinates: e.target.value }))} placeholder="13.0827, 80.2707" style={{ flex: 1 }} />
                  <button type="button" className="btn btn-subtle btn-sm" onClick={fetchCoordinates} disabled={geocoding} title="Fetch coordinates from stop name" style={{ whiteSpace: 'nowrap' }}>
                    {geocoding ? '…' : '📍 Fetch'}
                  </button>
                </div>
              </div>
              <div className="form-group" style={{ justifyContent: 'flex-end' }}>
                <div className="flex-gap" style={{ marginTop: 'auto' }}>
                  <button type="submit" className="btn btn-primary">Save Stop</button>
                  <button type="button" className="btn btn-subtle" onClick={() => setShowForm(false)}>Cancel</button>
                </div>
              </div>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Merge Duplicate Stops</div>
          </div>
        </div>
        <div className="form-row" style={{ alignItems: 'flex-end' }}>
          <div className="form-group">
            <label>Stop to Delete (duplicate)</label>
            <StopAutocomplete stops={allStops} value={mergeSource} onChange={id => setMergeSource(id)} placeholder="Select stop to remove…" />
          </div>
          <div className="form-group">
            <label>Keep this Stop</label>
            <StopAutocomplete stops={allStops} value={mergeTarget} onChange={id => setMergeTarget(id)} placeholder="Select stop to keep…" />
          </div>
          <div className="form-group">
            <button className="btn btn-primary" onClick={handleMerge} disabled={!mergeSource || !mergeTarget}
              style={{ marginTop: 'auto' }}>Merge Stops</button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">All Stops</div>
            <div className="text-muted" style={{ marginTop: 2 }}>{totalStops} stops</div>
          </div>
          <div className="flex-gap">
            <input className="search-input" placeholder="Search stops…" value={search}
              onChange={e => { setSearch(e.target.value); setSelected(new Set()); }} style={{ width: 200 }} autoComplete="off" />
            <button className="btn btn-ghost btn-sm" onClick={exportExcel}>⬇ Export</button>
            {!showForm && <button className="btn btn-primary" onClick={openCreate}>+ Add Stop</button>}
          </div>
        </div>

        {selected.size > 0 && (
          <div className="bulk-bar">
            <span className="text-muted">{selected.size} selected</span>
            <button className="btn btn-subtle btn-sm" onClick={() => bulkSetActive(true)}>✓ Set Active</button>
            <button className="btn btn-subtle btn-sm" onClick={() => bulkSetActive(false)}>✕ Set Inactive</button>
            <button className="btn btn-subtle btn-sm" onClick={() => setSelected(new Set())}>Clear</button>
          </div>
        )}

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ width: 36 }}>
                  <input type="checkbox" checked={allSelected} onChange={toggleSelectAll}
                    style={{ width: 14, height: 14, accentColor: 'var(--red)', cursor: 'pointer' }} />
                </th>
                <th>Code</th><th>Name</th><th>Short Name</th><th>Lat / Lng</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.stopId} className={selected.has(s.stopId) ? 'row-selected' : ''}>
                  <td>
                    <input type="checkbox" checked={selected.has(s.stopId)} onChange={() => toggleSelect(s.stopId)}
                      style={{ width: 14, height: 14, accentColor: 'var(--red)', cursor: 'pointer' }} />
                  </td>
                  <td><span className="badge badge-slate">{s.stopCode}</span></td>
                  <td style={{ fontWeight: 500 }}>{s.stopName}</td>
                  <td className="text-muted">{s.shortName ?? '—'}</td>
                  <td className="text-muted">{s.latitude != null ? `${s.latitude}, ${s.longitude}` : '—'}</td>
                  <td>
                    <span className={`badge ${s.isActive ? 'badge-green' : 'badge-red'}`}
                      style={{ cursor: 'pointer' }} onClick={() => toggleActive(s)}>
                      {s.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div className="flex-gap">
                      <button className="btn btn-subtle btn-sm" onClick={() => openEdit(s)}>Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(s)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={totalPages} pageSize={pageSize} totalCount={totalStops}
          onPage={p => { setPage(p); setSelected(new Set()); }}
          onPageSize={ps => { setPageSize(ps); setPage(1); setSelected(new Set()); }} />
      </div>
    </>
  );
}
