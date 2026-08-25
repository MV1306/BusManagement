import { useEffect, useState } from 'react';
import { faresApi, BUS_TYPES, type BusType, type Fare } from '../api';
import { useToast, useConfirm } from '../toast';

export default function Fares() {
  const [activeTab, setActiveTab] = useState<BusType>('Ordinary');
  const [fares, setFares] = useState<Fare[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [newStages, setNewStages] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [error, setError] = useState('');
  const { toast } = useToast();
  const { confirm, Dialog } = useConfirm();

  const load = (bt: BusType) =>
    faresApi.getByBusType(bt).then(setFares).catch(() => toast('Failed to load fares', 'error'));

  useEffect(() => { load(activeTab); setEditingId(null); setError(''); }, [activeTab]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    const stages = Number(newStages);
    if (fares.some(f => f.stages === stages)) {
      setError(`Stage ${stages} already exists for ${activeTab}.`); return;
    }
    try {
      await faresApi.create({ busType: activeTab, stages, fareAmount: Number(newAmount) });
      setNewStages(''); setNewAmount('');
      load(activeTab); toast('Fare entry added', 'success');
    } catch { toast('Save failed.', 'error'); }
  };

  const handleEdit = async (id: number) => {
    try {
      await faresApi.update(id, { fareAmount: Number(editAmount) });
      setEditingId(null); load(activeTab); toast('Fare updated', 'success');
    } catch { toast('Update failed.', 'error'); }
  };

  const handleDelete = async (id: number) => {
    if (!await confirm('Delete this fare entry?')) return;
    try { await faresApi.delete(id); load(activeTab); toast('Fare deleted', 'success'); }
    catch { toast('Delete failed.', 'error'); }
  };

  return (
    <>
      {Dialog}
      <div className="tab-bar">
        {BUS_TYPES.map(bt => (
          <button key={bt} className={`btn${activeTab === bt ? ' active' : ''}`} onClick={() => setActiveTab(bt)}>
            {bt}
          </button>
        ))}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Fare Table — {activeTab}</div>
            <div className="text-muted" style={{ marginTop: 2 }}>{fares.length} stage entries</div>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Stages</th><th>Fare Amount</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {fares.map(f => (
                <tr key={f.fareId}>
                  <td style={{ fontWeight: 600 }}>{f.stages} {f.stages === 1 ? 'stage' : 'stages'}</td>
                  <td style={{ fontWeight: 600, color: 'var(--success)' }}>
                    {editingId === f.fareId
                      ? <input type="number" step="0.01" min={0} value={editAmount} onChange={e => setEditAmount(e.target.value)} style={{ width: 100 }} autoFocus />
                      : `₹${f.fareAmount.toFixed(2)}`}
                  </td>
                  <td><span className={`badge ${f.isActive ? 'badge-green' : 'badge-red'}`}>{f.isActive ? 'Active' : 'Inactive'}</span></td>
                  <td>
                    <div className="flex-gap">
                      {editingId === f.fareId ? (
                        <>
                          <button className="btn btn-primary btn-sm" onClick={() => handleEdit(f.fareId)}>Save</button>
                          <button className="btn btn-subtle btn-sm" onClick={() => setEditingId(null)}>Cancel</button>
                        </>
                      ) : (
                        <>
                          <button className="btn btn-subtle btn-sm" onClick={() => { setEditingId(f.fareId); setEditAmount(String(f.fareAmount)); }}>Edit</button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(f.fareId)}>Delete</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {/* Inline add row */}
              <tr>
                <td>
                  <form id="add-fare-form" onSubmit={handleAdd} style={{ display: 'contents' }} />
                  <input form="add-fare-form" type="number" min={1} placeholder="Stages" value={newStages} onChange={e => setNewStages(e.target.value)} style={{ width: 80 }} required />
                </td>
                <td>
                  <input form="add-fare-form" type="number" step="0.01" min={0} placeholder="₹ Amount" value={newAmount} onChange={e => setNewAmount(e.target.value)} style={{ width: 100 }} required />
                </td>
                <td />
                <td>
                  <button form="add-fare-form" type="submit" className="btn btn-primary btn-sm">+ Add</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
