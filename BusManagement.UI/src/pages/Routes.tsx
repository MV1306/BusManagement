import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import * as XLSX from 'xlsx';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { routesApi, stopsApi, type Route, type RouteStage, type RouteStop, type Stop } from '../api';
import { useToast, useConfirm, usePrompt } from '../toast';
import StopAutocomplete from '../components/StopAutocomplete';
import Pagination from '../components/Pagination';

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const emptyRoute = { routeCode: '', routeName: '' };
const emptyNewStop = { stopCode: '', stopName: '', shortName: '', latLng: '' };
const emptyStage = { stageName: '', distanceFromPreviousKm: '', stageNo: '' };

function generateStopCode(name: string): string {
  const words = name.trim().toUpperCase().split(/\s+/).filter(Boolean);
  let prefix = '';
  let wi = 0, ci = 0;
  while (prefix.length < 3) {
    if (wi >= words.length) { wi = 0; ci++; }
    if (ci >= Math.max(...words.map(w => w.length))) { prefix = prefix.padEnd(3, 'X'); break; }
    prefix += words[wi][ci] ?? '';
    wi++;
  }
  const hex = Date.now().toString(16).toUpperCase().slice(-6);
  return `${prefix.slice(0, 3)}-${hex}`;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371, toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── New Stop Modal ───────────────────────────────────────────────────────

interface NewStopModalProps {
  newStop: typeof emptyNewStop;
  setNewStop: React.Dispatch<React.SetStateAction<typeof emptyNewStop>>;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

function NewStopModal({ newStop, setNewStop, onSubmit, onClose }: NewStopModalProps) {
  return createPortal(
    <div className="confirm-backdrop" onClick={onClose}>
      <div className="confirm-dialog" style={{ minWidth: 480, maxWidth: 560 }} onClick={e => e.stopPropagation()}>
        <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 20, color: 'var(--text)' }}>Create New Stop</div>
        <form onSubmit={onSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Stop Name *</label>
              <input value={newStop.stopName} onChange={e => {
                const name = e.target.value.toUpperCase();
                setNewStop(s => ({
                  ...s,
                  stopName: name,
                  shortName: name,
                  stopCode: name.length >= 3 ? generateStopCode(name) : s.stopCode,
                }));
              }} required maxLength={100} style={{ textTransform: 'uppercase' }} autoFocus />
            </div>
            <div className="form-group">
              <label>Stop Code</label>
              <input value={newStop.stopCode} readOnly style={{ cursor: 'default' }} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Short Name</label>
              <input value={newStop.shortName} onChange={e => setNewStop(s => ({ ...s, shortName: e.target.value.toUpperCase() }))} maxLength={50} style={{ textTransform: 'uppercase' }} />
            </div>
            <div className="form-group">
              <label>Lat, Lng</label>
              <input value={newStop.latLng} onChange={e => setNewStop(s => ({ ...s, latLng: e.target.value }))} placeholder="13.0827, 80.2707" />
            </div>
          </div>
          <div className="confirm-actions">
            <button type="button" className="btn btn-subtle" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">Create &amp; Select</button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

// ── Timeline component ────────────────────────────────────────────────────

function RouteTimeline({ stops, stages }: { stops: RouteStop[]; stages: RouteStage[] }) {
  const totalDist = stops.reduce((s, rs) => s + (rs.distanceFromPreviousKm ?? 0), 0);
  return (
    <div className="timeline">
      {stops.map((rs, i) => {
        const isFirst = rs.isFirstStop, isLast = rs.isLastStop;
        const dotClass = isFirst ? 'timeline-dot first' : isLast ? 'timeline-dot last' : 'timeline-dot mid';
        return (
          <div key={rs.routeStopId} className="timeline-row">
            <div className="timeline-left">
              <div className={dotClass} />
              {i < stops.length - 1 && <div className="timeline-line" />}
            </div>
            <div className="timeline-content">
              <div className="timeline-stop-name">{rs.stopName}</div>
              <div className="timeline-meta">
                <span className="badge badge-slate" style={{ fontSize: '0.65rem' }}>{rs.stopCode}</span>
                <span className="text-muted" style={{ fontSize: '0.72rem' }}>{rs.stageName}</span>
                {isFirst && <span className="badge badge-green">Origin</span>}
                {isLast && <span className="badge badge-blue">Terminus</span>}
              </div>
            </div>
            <div className="timeline-order">#{rs.stopOrder}</div>
          </div>
        );
      })}
      {totalDist > 0 && (
        <div className="timeline-total">
          Total distance: <strong>{totalDist.toFixed(1)} km</strong> · <strong>{stops.length}</strong> stops · <strong>{stages.length}</strong> stages
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────

export default function Routes() {
  const [view, setView] = useState<'list' | 'form' | 'detail'>('list');
  const [detailTab, setDetailTab] = useState<'timeline' | 'table' | 'map'>('timeline');
  const [mappingTab, setMappingTab] = useState<'stages' | 'stops'>('stages');
  const [viewRoute, setViewRoute] = useState<Route | null>(null);
  const [viewStops, setViewStops] = useState<RouteStop[]>([]);
  const [viewStages, setViewStages] = useState<RouteStage[]>([]);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [totalRoutes, setTotalRoutes] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [form, setForm] = useState(emptyRoute);
  const [editing, setEditing] = useState<Route | null>(null);
  const [savedRouteId, setSavedRouteId] = useState<number | null>(null);
  const [routeStops, setRouteStops] = useState<RouteStop[]>([]);
  const [routeStages, setRouteStages] = useState<RouteStage[]>([]);
  const [allStops, setAllStops] = useState<Stop[]>([]);
  const [addStopId, setAddStopId] = useState('');
  const [addStageId, setAddStageId] = useState('');
  const [addStopOrder, setAddStopOrder] = useState('');
  const [addDist, setAddDist] = useState('');
  const [showNewStop, setShowNewStop] = useState(false);
  const [newStop, setNewStop] = useState(emptyNewStop);
  const [stageForm, setStageForm] = useState(emptyStage);
  const [editingStage, setEditingStage] = useState<RouteStage | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedRoutes, setSelectedRoutes] = useState<Set<number>>(new Set());
  const { toast } = useToast();
  const { confirm, Dialog } = useConfirm();
  const { prompt, PromptDialog } = usePrompt();

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const dragIndexRef = useRef<number | null>(null);
  const stageDragIndexRef = useRef<number | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [stageDragIndex, setStageDragIndex] = useState<number | null>(null);
  const tableWrapRef = useRef<HTMLDivElement>(null);
  const stageTableWrapRef = useRef<HTMLDivElement>(null);
  const scrollTimerRef = useRef<number | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    const wrap = tableWrapRef.current;
    if (!wrap) return;
    const { top, bottom } = wrap.getBoundingClientRect();
    const zone = 60;
    if (scrollTimerRef.current) clearInterval(scrollTimerRef.current);
    if (e.clientY < top + zone)
      scrollTimerRef.current = window.setInterval(() => { wrap.scrollTop -= 8; }, 16);
    else if (e.clientY > bottom - zone)
      scrollTimerRef.current = window.setInterval(() => { wrap.scrollTop += 8; }, 16);
  };

  const stopScroll = () => {
    if (scrollTimerRef.current) { clearInterval(scrollTimerRef.current); scrollTimerRef.current = null; }
  };

  const handleStageDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    const wrap = stageTableWrapRef.current;
    if (!wrap) return;
    const { top, bottom } = wrap.getBoundingClientRect();
    const zone = 60;
    if (scrollTimerRef.current) clearInterval(scrollTimerRef.current);
    if (e.clientY < top + zone)
      scrollTimerRef.current = window.setInterval(() => { wrap.scrollTop -= 8; }, 16);
    else if (e.clientY > bottom - zone)
      scrollTimerRef.current = window.setInterval(() => { wrap.scrollTop += 8; }, 16);
  };

  const handleStageDrop = async (dropIndex: number) => {
    const from = stageDragIndexRef.current;
    stageDragIndexRef.current = null;
    setStageDragIndex(null);
    if (from === null || from === dropIndex) return;
    const reordered = [...routeStages];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(dropIndex, 0, moved);
    const withOrder = reordered.map((st, i) => ({ ...st, stageOrder: i + 1 }));
    setRouteStages(withOrder);
    try {
      await routesApi.reorderStages(savedRouteId!, withOrder.map(st => ({ routeStageId: st.routeStageId, stageOrder: st.stageOrder })));
      routesApi.getStages(savedRouteId!).then(setRouteStages);
      toast('Stage order updated', 'success');
    } catch { toast('Reorder failed.', 'error'); routesApi.getStages(savedRouteId!).then(setRouteStages); }
  };

  const loadAllStops = () => stopsApi.getAllUnpaged().then(r => setAllStops(r.items.filter(x => x.isActive)));
  const load = (p: number, ps: number, s: string) => routesApi.getAll(p, ps, s).then(r => {
    setRoutes(r.items); setTotalRoutes(r.totalCount); setTotalPages(r.totalPages);
  }).catch(() => toast('Failed to load routes', 'error'));
  const loadRouteData = (id: number) => Promise.all([
    routesApi.getStages(id).then(setRouteStages),
    routesApi.getStops(id).then(setRouteStops),
  ]);

  useEffect(() => { load(page, pageSize, debouncedSearch); loadAllStops(); }, [page, pageSize, debouncedSearch]);

  const goBack = () => {
    setView('list'); setEditing(null); setSavedRouteId(null); setRouteStops([]); setRouteStages([]);
    setMappingTab('stages'); setStageForm(emptyStage); setEditingStage(null);
    if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; }
  };

  const openView = (r: Route) => {
    setViewRoute(r); setViewStops([]); setViewStages([]); setDetailTab('timeline');
    Promise.all([
      routesApi.getStops(r.routeId),
      routesApi.getStages(r.routeId),
    ]).then(([stops, stages]) => {
      setViewStops(stops); setViewStages(stages);
    });
    setView('detail');
  };

  useEffect(() => {
    if (view !== 'detail' || detailTab !== 'map' || !mapRef.current || viewStops.length === 0) return;
    if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; }

    const stopsWithCoords = viewStops.filter(rs => rs.latitude && rs.longitude);
    if (stopsWithCoords.length === 0) return;

    const map = L.map(mapRef.current);
    mapInstanceRef.current = map;
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap contributors' }).addTo(map);

    const latlngs: L.LatLngTuple[] = [];
    stopsWithCoords.forEach((rs, i) => {
      const ll: L.LatLngTuple = [rs.latitude!, rs.longitude!];
      latlngs.push(ll);
      const color = rs.isFirstStop ? '#2e7d52' : rs.isLastStop ? '#c0392b' : '#e8a020';
      L.circleMarker(ll, { radius: 8, fillColor: color, color: '#fff', weight: 2, fillOpacity: 1 })
        .bindPopup(`<b>${rs.stopOrder}. ${rs.stopName}</b><br/>${rs.stopCode}<br/>${rs.stageName}`)
        .addTo(map);
      if (i === 0 || rs.isFirstStop || rs.isLastStop)
        L.tooltip({ permanent: true, direction: 'top', offset: [0, -10], className: 'stop-label' })
          .setContent(rs.stopName).setLatLng(ll).addTo(map);
    });

    if (latlngs.length > 1) L.polyline(latlngs, { color: '#c0392b', weight: 3, opacity: 0.8 }).addTo(map);
    map.fitBounds(L.latLngBounds(latlngs), { padding: [40, 40] });
  }, [view, detailTab, viewStops]);

  const openCreate = () => {
    setEditing(null); setForm(emptyRoute); setSavedRouteId(null);
    setRouteStops([]); setRouteStages([]); setAddStopId(''); setAddStageId(''); setAddStopOrder(''); setAddDist('');
    setShowNewStop(false); setStageForm(emptyStage); setEditingStage(null); setMappingTab('stages');
    setView('form');
  };

  const openEdit = (r: Route) => {
    setEditing(r); setForm({ routeCode: r.routeCode, routeName: r.routeName });
    setSavedRouteId(r.routeId); setAddStopId(''); setAddStageId(''); setAddStopOrder(''); setAddDist(''); setShowNewStop(false);
    setStageForm(emptyStage); setEditingStage(null); setMappingTab('stages');
    loadRouteData(r.routeId);
    setView('form');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        await routesApi.update(editing.routeId, { ...form, isActive: editing.isActive });
        toast('Route updated', 'success'); load(page, pageSize, debouncedSearch); goBack();
      } else {
        const created = await routesApi.create(form);
        setSavedRouteId(created.routeId); setEditing(created);
        toast('Route created — now add stages, then stops', 'success'); load(page, pageSize, debouncedSearch);
      }
    } catch { toast('Save failed.', 'error'); }
  };

  const handleDelete = async (r: Route) => {
    if (!await confirm(`Delete route "${r.routeCode} — ${r.routeName}"?`)) return;
    try { await routesApi.delete(r.routeId); load(page, pageSize, debouncedSearch); toast('Route deleted', 'success'); }
    catch { toast('Delete failed.', 'error'); }
  };

  const handleDuplicate = async (r: Route) => {
    const values = await prompt([
      { label: 'New Route Code', placeholder: `e.g. ${r.routeCode}-2` },
      { label: 'New Route Name', placeholder: 'Route name', defaultValue: `${r.routeName} (Copy)` },
    ]);
    if (!values) return;
    const [newCode, newName] = values;
    try {
      await routesApi.duplicate(r.routeId, { newRouteCode: newCode.trim(), newRouteName: newName.trim() });
      load(page, pageSize, debouncedSearch); toast(`Route duplicated as ${newCode}`, 'success');
    } catch { toast('Duplicate failed. Code may already exist.', 'error'); }
  };

  const toggleActive = async (r: Route) => {
    try {
      await routesApi.setStatus(r.routeId, !r.isActive);
      load(page, pageSize, debouncedSearch); toast(`Route marked ${!r.isActive ? 'active' : 'inactive'}`, 'success');
    } catch { toast('Update failed.', 'error'); }
  };

  // ── Stage handlers ────────────────────────────────────────────────────

  const nextStageOrder = routeStages.length === 0 ? 1 : Math.max(...routeStages.map(s => s.stageOrder)) + 1;

  const handleSaveStage = async (e: React.FormEvent) => {
    e.preventDefault();
    const desiredOrder = stageForm.stageNo ? Number(stageForm.stageNo) : null;
    const body = {
      stageName: stageForm.stageName,
      stageOrder: editingStage ? editingStage.stageOrder : nextStageOrder,
      distanceFromPreviousKm: stageForm.distanceFromPreviousKm ? Number(stageForm.distanceFromPreviousKm) : undefined,
    };
    try {
      let savedId: number;
      if (editingStage) {
        await routesApi.updateStage(savedRouteId!, editingStage.routeStageId, body);
        savedId = editingStage.routeStageId;
      } else {
        const created = await routesApi.addStage(savedRouteId!, body);
        savedId = created.routeStageId;
      }
      // If user specified a position, reorder: move the saved stage to desiredOrder
      if (desiredOrder !== null) {
        const fresh = await routesApi.getStages(savedRouteId!);
        const without = fresh.filter(s => s.routeStageId !== savedId).sort((a, b) => a.stageOrder - b.stageOrder);
        const target = fresh.find(s => s.routeStageId === savedId)!;
        // Insert target at desiredOrder position (1-based)
        const insertAt = Math.min(Math.max(desiredOrder - 1, 0), without.length);
        without.splice(insertAt, 0, target);
        const reordered = without.map((s, i) => ({ routeStageId: s.routeStageId, stageOrder: i + 1 }));
        await routesApi.reorderStages(savedRouteId!, reordered);
      }
      routesApi.getStages(savedRouteId!).then(setRouteStages);
      setStageForm(emptyStage); setEditingStage(null);
      toast(editingStage ? 'Stage updated' : 'Stage added', 'success');
    } catch { toast('Failed to save stage.', 'error'); }
  };

  const handleDeleteStage = async (st: RouteStage) => {
    if (!await confirm(`Delete stage "${st.stageName}"? All stops in this stage will also be removed.`)) return;
    try {
      await routesApi.deleteStage(savedRouteId!, st.routeStageId);
      const remaining = await routesApi.getStages(savedRouteId!);
      if (remaining.length > 0) {
        const renumbered = remaining.map((s, i) => ({ ...s, stageOrder: i + 1 }));
        await routesApi.reorderStages(savedRouteId!, renumbered.map(s => ({ routeStageId: s.routeStageId, stageOrder: s.stageOrder })));
        routesApi.getStages(savedRouteId!).then(setRouteStages);
      } else {
        setRouteStages([]);
      }
      routesApi.getStops(savedRouteId!).then(setRouteStops);
      toast('Stage deleted', 'success');
    } catch { toast('Delete failed.', 'error'); }
  };

  // ── Stop handlers ────────────────────────────────────────────────────

  const nextStopOrder = routeStops.length === 0 ? 1 : Math.max(...routeStops.map(s => s.stopOrder)) + 1;

  const handleAddStop = async (e: React.FormEvent) => {
    e.preventDefault();
    const desiredOrder = addStopOrder ? Number(addStopOrder) : null;
    const safeOrder = nextStopOrder;
    try {
      const created = await routesApi.addStop(savedRouteId!, {
        stopId: Number(addStopId),
        routeStageId: Number(addStageId),
        stopOrder: safeOrder,
        distanceFromPreviousKm: Number(addDist),
      });
      setAddStopId(''); setAddStageId(''); setAddStopOrder(''); setAddDist('');
      if (desiredOrder !== null && desiredOrder !== safeOrder) {
        const fresh = await routesApi.getStops(savedRouteId!);
        const without = fresh.filter(s => s.routeStopId !== created.routeStopId).sort((a, b) => a.stopOrder - b.stopOrder);
        const insertAt = Math.min(Math.max(desiredOrder - 1, 0), without.length);
        without.splice(insertAt, 0, created);
        const reordered = without.map((s, i) => ({ routeStopId: s.routeStopId, stopOrder: i + 1, distanceKm: s.distanceFromPreviousKm }));
        await routesApi.reorderStops(savedRouteId!, reordered);
      }
      routesApi.getStops(savedRouteId!).then(setRouteStops);
      toast('Stop added to route', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add stop.';
      toast(msg, 'error');
    }
  };

  const handleRemoveStop = async (rs: RouteStop) => {
    if (!await confirm(`Remove "${rs.stopName}" from this route?`)) return;
    try {
      await routesApi.removeStop(savedRouteId!, rs.routeStopId);
      const remaining = await routesApi.getStops(savedRouteId!);
      if (remaining.length > 0) {
        const renumbered = remaining.map((s, i) => ({ ...s, stopOrder: i + 1 }));
        await routesApi.reorderStops(savedRouteId!, renumbered.map(s => ({ routeStopId: s.routeStopId, stopOrder: s.stopOrder, distanceKm: s.distanceFromPreviousKm })));
        routesApi.getStops(savedRouteId!).then(setRouteStops);
      } else {
        setRouteStops([]);
      }
      toast('Stop removed', 'success');
    } catch { toast('Remove failed.', 'error'); }
  };

  const handleFixDistances = async () => {
    const fixed = routeStops.map((rs, i) => {
      const prev = routeStops[i - 1];
      const dist = i === 0 ? 0
        : (prev.latitude && prev.longitude && rs.latitude && rs.longitude)
          ? Math.round(haversineKm(prev.latitude, prev.longitude, rs.latitude, rs.longitude) * 100) / 100
          : Math.round(rs.distanceFromPreviousKm * 100) / 100;
      return { ...rs, distanceFromPreviousKm: dist };
    });
    setRouteStops(fixed);
    try {
      await routesApi.reorderStops(savedRouteId!, fixed.map(rs => ({ routeStopId: rs.routeStopId, stopOrder: rs.stopOrder, distanceKm: rs.distanceFromPreviousKm })));
      routesApi.getStops(savedRouteId!).then(setRouteStops);
      toast('Distances updated', 'success');
    } catch { toast('Failed to update distances.', 'error'); routesApi.getStops(savedRouteId!).then(setRouteStops); }
  };

  const handleDrop = async (dropIndex: number) => {
    const from = dragIndexRef.current;
    dragIndexRef.current = null;
    setDragIndex(null);
    if (from === null || from === dropIndex) return;
    const reordered = [...routeStops];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(dropIndex, 0, moved);
    const withOrder = reordered.map((rs, i) => {
      const prev = reordered[i - 1];
      const dist = i === 0 ? 0
        : (prev.latitude && prev.longitude && rs.latitude && rs.longitude)
          ? Math.round(haversineKm(prev.latitude, prev.longitude, rs.latitude, rs.longitude) * 100) / 100
          : rs.distanceFromPreviousKm;
      return { ...rs, stopOrder: i + 1, distanceFromPreviousKm: dist };
    });
    setRouteStops(withOrder);
    try {
      await routesApi.reorderStops(savedRouteId!, withOrder.map(rs => ({ routeStopId: rs.routeStopId, stopOrder: rs.stopOrder, distanceKm: rs.distanceFromPreviousKm })));
      routesApi.getStops(savedRouteId!).then(setRouteStops);
      toast('Stop order updated', 'success');
    } catch { toast('Reorder failed.', 'error'); routesApi.getStops(savedRouteId!).then(setRouteStops); }
  };

  const handleCreateStop = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const [lat, lng] = newStop.latLng.split(',').map(s => parseFloat(s.trim()));
      const created = await stopsApi.create({
        stopCode: newStop.stopCode, stopName: newStop.stopName,
        shortName: newStop.shortName || undefined,
        latitude: isNaN(lat) ? undefined : lat,
        longitude: isNaN(lng) ? undefined : lng,
      });
      await loadAllStops();
      setAddStopId(String(created.stopId));
      if (routeStops.length > 0) {
        const prev = routeStops[routeStops.length - 1];
        const [lat, lng] = newStop.latLng.split(',').map(s => parseFloat(s.trim()));
        if (prev.latitude && prev.longitude && !isNaN(lat) && !isNaN(lng))
          setAddDist(haversineKm(prev.latitude, prev.longitude, lat, lng).toFixed(2));
        else setAddDist('');
      } else {
        setAddDist('0');
      }
      setNewStop(emptyNewStop); setShowNewStop(false);
      setAddStopOrder('');
      toast('Stop created and selected', 'success');
    } catch { toast('Failed to create stop. Code may already exist.', 'error'); }
  };

  const onAddStopSelect = (stopId: string) => {
    setAddStopId(stopId);
    if (!stopId || routeStops.length === 0) { setAddDist('0'); return; }
    const orderNum = addStopOrder ? Number(addStopOrder) : nextStopOrder;
    const prevStop = orderNum > 1
      ? [...routeStops].sort((a, b) => a.stopOrder - b.stopOrder).find(s => s.stopOrder === orderNum - 1)
      : undefined;
    const prev = prevStop ?? routeStops[routeStops.length - 1];
    const curr = allStops.find(s => s.stopId === Number(stopId));
    if (prev.latitude && prev.longitude && curr?.latitude && curr?.longitude)
      setAddDist(haversineKm(prev.latitude, prev.longitude, curr.latitude, curr.longitude).toFixed(2));
    else setAddDist('');
  };

  const availableStops = allStops.filter(s => !routeStops.some(rs => rs.stopId === s.stopId));

  const toggleSelectRoute = (id: number) =>
    setSelectedRoutes(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const bulkSetActive = async (active: boolean) => {
    if (!await confirm(`Mark ${selectedRoutes.size} route(s) as ${active ? 'active' : 'inactive'}?`)) return;
    try {
      await Promise.all([...selectedRoutes].map(id => routesApi.setStatus(id, active)));
      setSelectedRoutes(new Set()); load(page, pageSize, debouncedSearch);
      toast(`${selectedRoutes.size} route(s) marked ${active ? 'active' : 'inactive'}`, 'success');
    } catch { toast('Bulk update failed.', 'error'); }
  };

  const exportExcel = () => {
    const rows = filteredRoutes.map(r => ({
      RouteCode: r.routeCode, RouteName: r.routeName,
      From: r.startingStop ?? '', To: r.endingStop ?? '',
      Status: r.isActive ? 'Active' : 'Inactive',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Routes');
    XLSX.writeFile(wb, 'routes_export.xlsx');
  };

  const filteredRoutes = routes;

  // ── Detail view ───────────────────────────────────────────────────────────

  if (view === 'detail') return (
    <>
      {Dialog}
      {PromptDialog}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Route Details</div>
            <div style={{ fontWeight: 600, marginTop: 4 }}>
              <span className="badge badge-red" style={{ marginRight: 8 }}>{viewRoute?.routeCode}</span>
              {viewRoute?.routeName}
            </div>
          </div>
          <button type="button" className="btn btn-subtle btn-sm" onClick={goBack}>← Back</button>
        </div>
        <div className="summary-row">
          <div className="summary-item"><div className="label">Stops</div><div className="value">{viewStops.length}</div></div>
          <div className="summary-item"><div className="label">Stages</div><div className="value">{viewStages.length}</div></div>
          <div className="summary-item"><div className="label">From</div><div className="value" style={{ fontSize: '0.9rem' }}>{viewRoute?.startingStop ?? '—'}</div></div>
          <div className="summary-item"><div className="label">To</div><div className="value" style={{ fontSize: '0.9rem' }}>{viewRoute?.endingStop ?? '—'}</div></div>
          <div className="summary-item">
            <div className="label">Distance</div>
            <div className="value">{viewStops.reduce((s, rs) => s + (rs.distanceFromPreviousKm ?? 0), 0).toFixed(1)} <span style={{ fontSize: '0.8rem', fontWeight: 400 }}>km</span></div>
          </div>
          <div className="summary-item">
            <div className="label">Status</div>
            <div className="value" style={{ fontSize: '0.9rem' }}>
              <span className={`badge ${viewRoute?.isActive ? 'badge-green' : 'badge-red'}`}>{viewRoute?.isActive ? 'Active' : 'Inactive'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="tab-bar">
        <button className={`btn${detailTab === 'timeline' ? ' active' : ''}`} onClick={() => setDetailTab('timeline')}>Timeline</button>
        <button className={`btn${detailTab === 'table' ? ' active' : ''}`} onClick={() => setDetailTab('table')}>Stop List</button>
        <button className={`btn${detailTab === 'map' ? ' active' : ''}`} onClick={() => setDetailTab('map')}>Map</button>
      </div>

      {detailTab === 'timeline' && (
        <div className="card">
          <div className="card-header"><div className="card-title">Route Timeline</div></div>
          {viewStops.length === 0
            ? <div className="text-muted">Loading…</div>
            : <RouteTimeline stops={viewStops} stages={viewStages} />}
        </div>
      )}

      {detailTab === 'table' && (
        <div className="card">
          <div className="card-header"><div className="card-title">Stop List</div></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>#</th><th>Stop</th><th>Stage</th><th>Dist from prev</th><th>Flag</th></tr></thead>
              <tbody>
                {viewStops.map(rs => (
                  <tr key={rs.routeStopId}>
                    <td style={{ fontWeight: 600 }}>{rs.stopOrder}</td>
                    <td><div style={{ fontWeight: 500 }}>{rs.stopName}</div><div className="text-muted">{rs.stopCode}</div></td>
                    <td className="text-muted">{rs.stageName}</td>
                    <td className="text-muted">{rs.isFirstStop ? '—' : `${rs.distanceFromPreviousKm} km`}</td>
                    <td>
                      {rs.isFirstStop && <span className="badge badge-green">First</span>}
                      {rs.isLastStop && <span className="badge badge-blue">Last</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {detailTab === 'map' && (
        <div className="card">
          <div className="card-header"><div className="card-title">Route Map</div></div>
          {viewStops.length === 0
            ? <div className="text-muted">Loading…</div>
            : <div ref={mapRef} style={{ height: 460, borderRadius: 6, overflow: 'hidden' }} />}
        </div>
      )}
    </>
  );

  // ── Form view ─────────────────────────────────────────────────────────────

  if (view === 'form') return (
    <>
      {Dialog}
      {PromptDialog}
      <div className="card">
        <div className="card-header">
          <div className="card-title">{editing ? 'Edit Route' : 'New Route'}</div>
          <button type="button" className="btn btn-subtle btn-sm" onClick={goBack}>← Back</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Route Code *</label>
              <input value={form.routeCode} onChange={e => setForm(f => ({ ...f, routeCode: e.target.value }))} required maxLength={20} placeholder="e.g. 21G" />
            </div>
            <div className="form-group">
              <label>Route Name *</label>
              <input value={form.routeName} onChange={e => setForm(f => ({ ...f, routeName: e.target.value }))} required maxLength={100} placeholder="e.g. Central - Tambaram" />
            </div>
            <div className="form-group" style={{ justifyContent: 'flex-end' }}>
              <div className="flex-gap" style={{ marginTop: 'auto' }}>
                <button type="submit" className="btn btn-primary">Save Route</button>
                <button type="button" className="btn btn-subtle" onClick={goBack}>Cancel</button>
              </div>
            </div>
          </div>
        </form>
      </div>

      {savedRouteId && (
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Route Mapping</div>
              <div className="text-muted" style={{ marginTop: 2 }}>{routeStages.length} stages · {routeStops.length} stops</div>
            </div>
            <div className="tab-bar" style={{ marginBottom: 0 }}>
              <button type="button" className={`btn${mappingTab === 'stages' ? ' active' : ''}`} onClick={() => setMappingTab('stages')}>Stages</button>
              <button type="button" className={`btn${mappingTab === 'stops' ? ' active' : ''}`} onClick={() => setMappingTab('stops')}>Stops</button>
            </div>
          </div>

          {mappingTab === 'stages' && (
            <>
              <form onSubmit={handleSaveStage}>
                <div className="form-row">
                  <div className="form-group" style={{ maxWidth: 80 }}>
                    <label>Stage No.</label>
                    <input type="number" min={1} value={stageForm.stageNo}
                      onChange={e => setStageForm(f => ({ ...f, stageNo: e.target.value }))}
                      placeholder={String(editingStage ? editingStage.stageOrder : nextStageOrder)} />
                  </div>
                  <div className="form-group">
                    <label>Stage Name *</label>
                    <input value={stageForm.stageName} onChange={e => setStageForm(f => ({ ...f, stageName: e.target.value.toUpperCase() }))} required maxLength={100} placeholder="e.g. CENTRAL BUS STAND" style={{ textTransform: 'uppercase' }} />
                  </div>
                  <div className="form-group" style={{ maxWidth: 160 }}>
                    <label>Dist from prev (km)</label>
                    <input type="number" step="any" min={0} value={stageForm.distanceFromPreviousKm} onChange={e => setStageForm(f => ({ ...f, distanceFromPreviousKm: e.target.value }))} placeholder="e.g. 4.5" />
                  </div>
                  <div className="form-group" style={{ justifyContent: 'flex-end' }}>
                    <div className="flex-gap" style={{ marginTop: 'auto' }}>
                      <button type="submit" className="btn btn-primary btn-sm">{editingStage ? 'Update Stage' : '+ Add Stage'}</button>
                      {editingStage && <button type="button" className="btn btn-subtle btn-sm" onClick={() => { setEditingStage(null); setStageForm(emptyStage); }}>Cancel</button>}
                    </div>
                  </div>
                </div>
              </form>
              <div className="table-wrap mt-16" ref={stageTableWrapRef} style={{ maxHeight: 400, overflowY: 'auto' }}>
                <table>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}><tr><th style={{ width: 24 }}></th><th>#</th><th>Stage Name</th><th>Dist from prev</th><th></th></tr></thead>
                  <tbody>
                    {routeStages.map((st, i) => (
                      <tr key={st.routeStageId}
                        draggable
                        onDragStart={() => { stageDragIndexRef.current = i; setStageDragIndex(i); }}
                        onDragOver={e => handleStageDragOver(e)}
                        onDragLeave={stopScroll}
                        onDrop={() => { stopScroll(); handleStageDrop(i); }}
                        onDragEnd={stopScroll}
                        style={{ opacity: stageDragIndex === i ? 0.4 : 1, cursor: 'grab' }}
                      >
                        <td style={{ color: 'var(--text-muted)', fontSize: 16, userSelect: 'none' }}>⠿</td>
                        <td style={{ fontWeight: 600 }}>{st.stageOrder}</td>
                        <td style={{ fontWeight: 500 }}>{st.stageName}</td>
                        <td className="text-muted">{st.distanceFromPreviousKm != null && !st.isFirstStage ? `${st.distanceFromPreviousKm} km` : '—'}</td>
                        <td>
                          <div className="flex-gap">
                            <button className="btn btn-subtle btn-sm" onClick={() => { setEditingStage(st); setStageForm({ stageName: st.stageName, distanceFromPreviousKm: st.distanceFromPreviousKm != null ? String(st.distanceFromPreviousKm) : '', stageNo: String(st.stageOrder) }); }}>Edit</button>
                            <button className="btn btn-danger btn-sm" onClick={() => handleDeleteStage(st)}>✕</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {mappingTab === 'stops' && (
            <>
              {routeStages.length === 0
                ? <div className="text-muted" style={{ padding: '12px 0' }}>Add stages first before mapping stops.</div>
                : (
                  <>
                    <form onSubmit={handleAddStop}>
                      <div className="form-row">
                        <div className="form-group">
                          <label>Stop</label>
                          <div className="flex-gap">
                            <div style={{ flex: 1 }}>
                              <StopAutocomplete stops={availableStops} value={addStopId} onChange={onAddStopSelect} placeholder="Search and select stop…" required />
                            </div>
                            <button type="button" className="btn btn-subtle btn-sm" onClick={() => { setShowNewStop(true); setNewStop(emptyNewStop); }}>
                              + New Stop
                            </button>
                          </div>
                        </div>
                        <div className="form-group" style={{ maxWidth: 180 }}>
                          <label>Stage *</label>
                          <select value={addStageId} onChange={e => setAddStageId(e.target.value)} required style={{ width: '100%' }}>
                            <option value="">Select stage…</option>
                            {routeStages.map(st => (
                              <option key={st.routeStageId} value={st.routeStageId}>{st.stageName}</option>
                            ))}
                          </select>
                        </div>
                        <div className="form-group" style={{ maxWidth: 80 }}>
                          <label>Stop No.</label>
                          <input type="number" min={1} value={addStopOrder || nextStopOrder}
                            onChange={e => setAddStopOrder(e.target.value)}
                            placeholder={String(nextStopOrder)} />
                        </div>
                        <div className="form-group" style={{ maxWidth: 140 }}>
                          <label>Dist from prev (km) *</label>
                          <input type="number" step="any" min={0} value={addDist} onChange={e => setAddDist(e.target.value)} placeholder="e.g. 1.2" required />
                        </div>
                      </div>
                      <button type="submit" className="btn btn-primary btn-sm" disabled={!addStopId || !addStageId}>+ Map Stop</button>
                    </form>

                    {showNewStop && (
                      <NewStopModal
                        newStop={newStop}
                        setNewStop={setNewStop}
                        onSubmit={handleCreateStop}
                        onClose={() => { setShowNewStop(false); setNewStop(emptyNewStop); }}
                      />
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
                        <button type="button" className="btn btn-subtle btn-sm" onClick={handleFixDistances}>⟳ Fix Distances</button>
                      </div>
                    <div className="table-wrap mt-16" ref={tableWrapRef} style={{ maxHeight: 400, overflowY: 'auto' }}>
                      <table>
                        <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}><tr><th style={{ width: 24 }}></th><th>Order</th><th>Stop</th><th>Stage</th><th>Dist from prev</th><th>Flag</th><th></th></tr></thead>
                        <tbody>
                          {routeStops.map((rs, i) => (
                            <tr key={rs.routeStopId}
                              draggable
                              onDragStart={() => { dragIndexRef.current = i; setDragIndex(i); }}
                              onDragOver={e => handleDragOver(e)}
                              onDragLeave={stopScroll}
                              onDrop={() => { stopScroll(); handleDrop(i); }}
                              onDragEnd={stopScroll}
                              style={{ opacity: dragIndex === i ? 0.4 : 1, cursor: 'grab' }}
                            >
                              <td style={{ color: 'var(--text-muted)', fontSize: 16, userSelect: 'none' }}>⠿</td>
                              <td style={{ fontWeight: 600 }}>{rs.stopOrder}</td>
                              <td><div style={{ fontWeight: 500 }}>{rs.stopName}</div><div className="text-muted">{rs.stopCode}</div></td>
                              <td className="text-muted">{rs.stageName}</td>
                              <td className="text-muted">{rs.isFirstStop ? '—' : `${rs.distanceFromPreviousKm} km`}</td>
                              <td>
                                {rs.isFirstStop && <span className="badge badge-green">First</span>}
                                {rs.isLastStop && <span className="badge badge-blue">Last</span>}
                              </td>
                              <td><button className="btn btn-danger btn-sm" onClick={() => handleRemoveStop(rs)}>✕</button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )
              }
            </>
          )}
        </div>
      )}
    </>
  );

  // ── List view ─────────────────────────────────────────────────────────────

  return (
    <>
      {Dialog}
      {PromptDialog}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">All Routes</div>
            <div className="text-muted" style={{ marginTop: 2 }}>{totalRoutes} routes</div>
          </div>
          <div className="flex-gap">
            <input className="search-input" placeholder="Search routes…" value={search} onChange={e => { setSearch(e.target.value); setSelectedRoutes(new Set()); }} style={{ width: 200 }} autoComplete="off" />
            <button className="btn btn-ghost btn-sm" onClick={exportExcel}>⬇ Export</button>
            <button className="btn btn-primary" onClick={openCreate}>+ Add Route</button>
          </div>
        </div>

        {selectedRoutes.size > 0 && (
          <div className="bulk-bar">
            <span className="text-muted">{selectedRoutes.size} selected</span>
            <button className="btn btn-subtle btn-sm" onClick={() => bulkSetActive(true)}>✓ Set Active</button>
            <button className="btn btn-subtle btn-sm" onClick={() => bulkSetActive(false)}>✕ Set Inactive</button>
            <button className="btn btn-subtle btn-sm" onClick={() => setSelectedRoutes(new Set())}>Clear</button>
          </div>
        )}

        <div className="table-wrap">
          <table>
            <thead><tr>
              <th style={{ width: 36 }}>
                <input type="checkbox"
                  checked={filteredRoutes.length > 0 && selectedRoutes.size === filteredRoutes.length}
                  onChange={() => setSelectedRoutes(prev => prev.size === filteredRoutes.length ? new Set() : new Set(filteredRoutes.map(r => r.routeId)))}
                  style={{ width: 14, height: 14, accentColor: 'var(--red)', cursor: 'pointer' }} />
              </th>
              <th>Code</th><th>Name</th><th>From → To</th><th>Status</th><th>Actions</th>
            </tr></thead>
            <tbody>
              {filteredRoutes.map(r => (
                <tr key={r.routeId} className={selectedRoutes.has(r.routeId) ? 'row-selected' : ''}>
                  <td>
                    <input type="checkbox" checked={selectedRoutes.has(r.routeId)} onChange={() => toggleSelectRoute(r.routeId)}
                      style={{ width: 14, height: 14, accentColor: 'var(--red)', cursor: 'pointer' }} />
                  </td>
                  <td><span className="badge badge-red">{r.routeCode}</span></td>
                  <td>{r.routeName}</td>
                  <td className="text-muted">{r.startingStop ?? '—'} → {r.endingStop ?? '—'}</td>
                  <td>
                    <span className={`badge ${r.isActive ? 'badge-green' : 'badge-red'}`} style={{ cursor: 'pointer' }} onClick={() => toggleActive(r)}>
                      {r.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div className="flex-gap">
                      <button className="btn btn-ghost btn-sm" onClick={() => openView(r)}>View</button>
                      <button className="btn btn-subtle btn-sm" onClick={() => openEdit(r)}>Edit</button>
                      <button className="btn btn-subtle btn-sm" onClick={() => handleDuplicate(r)} title="Duplicate route">⧉</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(r)}>Del</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={totalPages} pageSize={pageSize} totalCount={totalRoutes}
          onPage={p => { setPage(p); setSelectedRoutes(new Set()); }}
          onPageSize={ps => { setPageSize(ps); setPage(1); setSelectedRoutes(new Set()); }} />
      </div>
    </>
  );
}
