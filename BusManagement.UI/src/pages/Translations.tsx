import { useEffect, useState } from 'react';
import { stopsApi, routesApi, translationApi, type Stop, type Route, type RouteStage } from '../api';
import StopAutocomplete from '../components/StopAutocomplete';
import { useToast } from '../toast';

type Tab = 'stops' | 'stages';

export default function Translations() {
  const [tab, setTab] = useState<Tab>('stops');
  return (
    <>
      <div className="card">
        <div className="tab-bar">
          <button
            className={`btn${tab === 'stops' ? ' active' : ''}`}
            onClick={() => setTab('stops')}
            aria-label="Stops tab"
          >
            🚏 Stops
          </button>
          <button
            className={`btn${tab === 'stages' ? ' active' : ''}`}
            onClick={() => setTab('stages')}
            aria-label="Stages tab"
          >
            📍 Stages
          </button>
        </div>
      </div>
      {tab === 'stops'  && <StopTranslationPanel />}
      {tab === 'stages' && <StageTranslationPanel />}
    </>
  );
}

function StopTranslationPanel() {
  const { toast } = useToast();
  const [stops, setStops] = useState<Stop[]>([]);
  const [translatedIds, setTranslatedIds] = useState<Set<number>>(new Set());
  const [selectedId, setSelectedId] = useState('');
  const [translatedName, setTranslatedName] = useState('');
  const [translatedShortName, setTranslatedShortName] = useState('');
  const [originalName, setOriginalName] = useState('');
  const [originalShortName, setOriginalShortName] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [autoTranslating, setAutoTranslating] = useState(false);
  const [bulkRunning, setBulkRunning] = useState(false);

  useEffect(() => {
    stopsApi.getAllUnpaged().then(r => setStops(r.items));
    // Load which stops already have translations by fetching the bulk endpoint count
    // We approximate by checking the translated count from a dry-run-free approach:
    // instead we track saves locally and seed from the bulk result message.
  }, []);

  const handleSelect = async (id: string) => {
    setSelectedId(id);
    if (!id) return;
    setLoading(true);
    try {
      const t = await translationApi.getStop(Number(id));
      setOriginalName(t.originalName);
      setOriginalShortName(t.originalShortName ?? null);
      setTranslatedName(t.translatedName ?? '');
      setTranslatedShortName(t.translatedShortName ?? '');
      if (t.translatedName) setTranslatedIds(prev => new Set(prev).add(Number(id)));
    } finally {
      setLoading(false);
    }
  };

  const handleAutoTranslate = async () => {
    if (!selectedId) return;
    setAutoTranslating(true);
    try {
      const result = await translationApi.saveStop(Number(selectedId), '', '');
      setTranslatedName(result.translatedName ?? '');
      setTranslatedShortName(result.translatedShortName ?? '');
      setTranslatedIds(prev => new Set(prev).add(Number(selectedId)));
      toast('Auto-translated successfully.', 'success');
    } catch {
      toast('Auto-translation failed.', 'error');
    } finally {
      setAutoTranslating(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId || !translatedName.trim()) return;
    setSaving(true);
    try {
      await translationApi.saveStop(Number(selectedId), translatedName.trim(), translatedShortName.trim() || undefined);
      setTranslatedIds(prev => new Set(prev).add(Number(selectedId)));
      toast('Translation saved.', 'success');
    } catch {
      toast('Failed to save.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleBulkTranslate = async () => {
    setBulkRunning(true);
    try {
      const result = await translationApi.translateAllStops();
      toast(result.message, 'success');
      // Refresh stops list so progress counter updates
      const r = await stopsApi.getAllUnpaged();
      setStops(r.items);
    } catch {
      toast('Bulk translation failed.', 'error');
    } finally {
      setBulkRunning(false);
    }
  };

  const translatedCount = translatedIds.size;
  const totalCount = stops.length;

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">Stop Translation</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {totalCount > 0 && (
            <span className="badge badge-blue" title="Translated in this session">
              {translatedCount} / {totalCount} translated
            </span>
          )}
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={handleBulkTranslate}
            disabled={bulkRunning}
            title="Auto-translate all stops that don't yet have a Tamil translation"
          >
            {bulkRunning ? '⏳ Translating…' : '⚡ Auto-translate all'}
          </button>
        </div>
      </div>

      <form onSubmit={handleSave}>
        <div className="form-row">
          <div className="form-group" style={{ flex: 2 }}>
            <label>Stop *</label>
            <StopAutocomplete
              stops={stops}
              value={selectedId}
              onChange={handleSelect}
              placeholder="Search by name or code…"
              required
            />
          </div>
        </div>

        {loading && <div style={{ color: 'var(--text-3)', padding: '8px 0' }}>Loading…</div>}

        {selectedId !== '' && !loading && (
          <>
            <div className="form-row">
              <div className="form-group" style={{ flex: 1 }}>
                <label>Original Name</label>
                <input value={originalName} readOnly />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Tamil Translation *</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    value={translatedName}
                    onChange={e => setTranslatedName(e.target.value)}
                    placeholder="Tamil name"
                    required
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={handleAutoTranslate}
                    disabled={autoTranslating}
                    title="Auto-translate using IndicTrans2"
                  >
                    {autoTranslating ? '⏳' : '✨ Auto'}
                  </button>
                </div>
              </div>
            </div>
            {originalShortName !== null && (
              <div className="form-row">
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Original Short Name</label>
                  <input value={originalShortName} readOnly />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Tamil Short Name</label>
                  <input
                    value={translatedShortName}
                    onChange={e => setTranslatedShortName(e.target.value)}
                    placeholder="Tamil short name"
                  />
                </div>
              </div>
            )}
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : '💾 Save Translation'}
            </button>
          </>
        )}
      </form>
    </div>
  );
}

function StageTranslationPanel() {
  const { toast } = useToast();
  const [routes, setRoutes] = useState<Route[]>([]);
  const [routeId, setRouteId] = useState<number | ''>('');
  const [stages, setStages] = useState<RouteStage[]>([]);
  const [translatedStageIds, setTranslatedStageIds] = useState<Set<number>>(new Set());
  const [selectedId, setSelectedId] = useState<number | ''>('');
  const [originalName, setOriginalName] = useState('');
  const [translatedName, setTranslatedName] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stagesLoading, setStagesLoading] = useState(false);
  const [bulkRunning, setBulkRunning] = useState(false);

  useEffect(() => {
    routesApi.getAllUnpaged().then(r => setRoutes(r.items));
  }, []);

  const handleRouteChange = async (id: number) => {
    setRouteId(id);
    setSelectedId('');
    setOriginalName('');
    setTranslatedName('');
    setTranslatedStageIds(new Set());
    setStagesLoading(true);
    try {
      const s = await routesApi.getStages(id);
      setStages(s);
    } finally {
      setStagesLoading(false);
    }
  };

  const handleSelect = async (id: number) => {
    setSelectedId(id);
    setLoading(true);
    try {
      const t = await translationApi.getStage(id);
      setOriginalName(t.originalName);
      setTranslatedName(t.translatedName ?? '');
      if (t.translatedName) setTranslatedStageIds(prev => new Set(prev).add(id));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId || !translatedName.trim()) return;
    setSaving(true);
    try {
      await translationApi.saveStage(selectedId, translatedName.trim());
      setTranslatedStageIds(prev => new Set(prev).add(selectedId as number));
      toast('Translation saved.', 'success');
    } catch {
      toast('Failed to save.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleBulkTranslate = async () => {
    setBulkRunning(true);
    try {
      const result = await translationApi.translateAllStages();
      toast(result.message, 'success');
    } catch {
      toast('Bulk translation failed.', 'error');
    } finally {
      setBulkRunning(false);
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">Stage Translation</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {stages.length > 0 && (
            <span className="badge badge-blue" title="Translated in this session">
              {translatedStageIds.size} / {stages.length} translated
            </span>
          )}
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={handleBulkTranslate}
            disabled={bulkRunning}
            title="Auto-translate all stages that don't yet have a Tamil translation"
          >
            {bulkRunning ? '⏳ Translating…' : '⚡ Auto-translate all'}
          </button>
        </div>
      </div>

      <form onSubmit={handleSave}>
        <div className="form-row">
          <div className="form-group" style={{ flex: 1 }}>
            <label>Route *</label>
            <select
              value={routeId}
              onChange={e => handleRouteChange(Number(e.target.value))}
              required
            >
              <option value="">— select a route —</option>
              {routes.map(r => (
                <option key={r.routeId} value={r.routeId}>{r.routeCode} — {r.routeName}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Stage *</label>
            <select
              value={selectedId}
              onChange={e => handleSelect(Number(e.target.value))}
              disabled={!routeId || stagesLoading || loading}
              required
            >
              <option value="">
                {stagesLoading ? 'Loading…' : '— select a stage —'}
              </option>
              {stages.map(s => (
                <option key={s.routeStageId} value={s.routeStageId}>
                  {translatedStageIds.has(s.routeStageId) ? '✓ ' : ''}{s.stageOrder}. {s.stageName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading && <div style={{ color: 'var(--text-3)', padding: '8px 0' }}>Loading…</div>}

        {selectedId !== '' && !loading && (
          <>
            <div className="form-row">
              <div className="form-group" style={{ flex: 1 }}>
                <label>Original Name</label>
                <input value={originalName} readOnly />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Tamil Translation *</label>
                <input
                  value={translatedName}
                  onChange={e => setTranslatedName(e.target.value)}
                  placeholder="Tamil name"
                  required
                />
              </div>
            </div>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : '💾 Save Translation'}
            </button>
          </>
        )}
      </form>
    </div>
  );
}
