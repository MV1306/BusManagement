import { useEffect, useState } from 'react';
import { stopsApi, routesApi, translationApi, type Stop, type Route, type RouteStage } from '../api';
import { useToast } from '../toast';

type Tab = 'stops' | 'stages';

export default function Translations() {
  const [tab, setTab] = useState<Tab>('stops');
  return (
    <>
      <div className="card">
        <div className="tab-bar">
          <button className={`btn${tab === 'stops'  ? ' active' : ''}`} onClick={() => setTab('stops')}>🚏 Stops</button>
          <button className={`btn${tab === 'stages' ? ' active' : ''}`} onClick={() => setTab('stages')}>📍 Stages</button>
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
  const [selectedId, setSelectedId] = useState<number | ''>('');
  const [translatedName, setTranslatedName] = useState('');
  const [translatedShortName, setTranslatedShortName] = useState('');
  const [originalName, setOriginalName] = useState('');
  const [originalShortName, setOriginalShortName] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    stopsApi.getAllUnpaged().then(r => setStops(r.items));
  }, []);

  const handleSelect = async (id: number) => {
    setSelectedId(id);
    setLoading(true);
    try {
      const t = await translationApi.getStop(id);
      setOriginalName(t.originalName);
      setOriginalShortName(t.originalShortName ?? null);
      setTranslatedName(t.translatedName ?? '');
      setTranslatedShortName(t.translatedShortName ?? '');
    } finally { setLoading(false); }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId || !translatedName.trim()) return;
    setSaving(true);
    try {
      await translationApi.saveStop(selectedId, translatedName.trim(), translatedShortName.trim() || undefined);
      toast('Translation saved.', 'success');
    } catch { toast('Failed to save.', 'error'); }
    finally { setSaving(false); }
  };

  return (
    <div className="card">
      <div className="card-header"><div className="card-title">Stop Translation</div></div>
      <form onSubmit={handleSave}>
        <div className="form-row">
          <div className="form-group" style={{ flex: 2 }}>
            <label>Stop *</label>
            <select value={selectedId} onChange={e => handleSelect(Number(e.target.value))} required>
              <option value="">— select a stop —</option>
              {stops.map(s => (
                <option key={s.stopId} value={s.stopId}>{s.stopCode} — {s.stopName}</option>
              ))}
            </select>
          </div>
        </div>

        {selectedId !== '' && !loading && (
          <>
            <div className="form-row">
              <div className="form-group" style={{ flex: 1 }}>
                <label>Original Name</label>
                <input value={originalName} readOnly style={{ opacity: 0.6 }} />
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
            {originalShortName !== null && (
              <div className="form-row">
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Original Short Name</label>
                  <input value={originalShortName} readOnly style={{ opacity: 0.6 }} />
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
        {loading && <div style={{ color: 'var(--text-3)', padding: '8px 0' }}>Loading…</div>}
      </form>
    </div>
  );
}

function StageTranslationPanel() {
  const { toast } = useToast();
  const [routes, setRoutes] = useState<Route[]>([]);
  const [routeId, setRouteId] = useState<number | ''>('');
  const [stages, setStages] = useState<RouteStage[]>([]);
  const [selectedId, setSelectedId] = useState<number | ''>('');
  const [originalName, setOriginalName] = useState('');
  const [translatedName, setTranslatedName] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    routesApi.getAllUnpaged().then(r => setRoutes(r.items));
  }, []);

  const handleRouteChange = async (id: number) => {
    setRouteId(id);
    setSelectedId('');
    setOriginalName('');
    setTranslatedName('');
    const s = await routesApi.getStages(id);
    setStages(s);
  };

  const handleSelect = async (id: number) => {
    setSelectedId(id);
    setLoading(true);
    try {
      const t = await translationApi.getStage(id);
      setOriginalName(t.originalName);
      setTranslatedName(t.translatedName ?? '');
    } finally { setLoading(false); }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId || !translatedName.trim()) return;
    setSaving(true);
    try {
      await translationApi.saveStage(selectedId, translatedName.trim());
      toast('Translation saved.', 'success');
    } catch { toast('Failed to save.', 'error'); }
    finally { setSaving(false); }
  };

  return (
    <div className="card">
      <div className="card-header"><div className="card-title">Stage Translation</div></div>
      <form onSubmit={handleSave}>
        <div className="form-row">
          <div className="form-group" style={{ flex: 1 }}>
            <label>Route *</label>
            <select value={routeId} onChange={e => handleRouteChange(Number(e.target.value))} required>
              <option value="">— select a route —</option>
              {routes.map(r => (
                <option key={r.routeId} value={r.routeId}>{r.routeCode} — {r.routeName}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Stage *</label>
            <select value={selectedId} onChange={e => handleSelect(Number(e.target.value))} disabled={!routeId} required>
              <option value="">— select a stage —</option>
              {stages.map(s => (
                <option key={s.routeStageId} value={s.routeStageId}>{s.stageOrder}. {s.stageName}</option>
              ))}
            </select>
          </div>
        </div>

        {selectedId !== '' && !loading && (
          <>
            <div className="form-row">
              <div className="form-group" style={{ flex: 1 }}>
                <label>Original Name</label>
                <input value={originalName} readOnly style={{ opacity: 0.6 }} />
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
        {loading && <div style={{ color: 'var(--text-3)', padding: '8px 0' }}>Loading…</div>}
      </form>
    </div>
  );
}
