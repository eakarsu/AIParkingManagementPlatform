import React, { useState, useEffect, useCallback } from 'react';
import { pricingAPI, facilitiesAPI, aiAPI } from '../services/api';
import Modal from '../components/Modal';
import Toast from '../components/Toast';
import AIResponse from '../components/AIResponse';

function Pricing() {
  const [items, setItems] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(false);
  const [toast, setToast] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [form, setForm] = useState({ facility_id: '', rule_name: '', base_rate: 5, peak_multiplier: 1.5, off_peak_multiplier: 0.8, surge_threshold: 85, time_start: '08:00', time_end: '18:00', day_type: 'weekday', status: 'active' });

  const load = useCallback(async () => {
    try {
      const [pr, fac] = await Promise.all([pricingAPI.getAll(), facilitiesAPI.getAll()]);
      setItems(pr.data);
      setFacilities(fac.data);
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRowClick = (item) => setSelected(selected?.id === item.id ? null : item);

  const handleNew = () => {
    setForm({ facility_id: facilities[0]?.id || '', rule_name: '', base_rate: 5, peak_multiplier: 1.5, off_peak_multiplier: 0.8, surge_threshold: 85, time_start: '08:00', time_end: '18:00', day_type: 'weekday', status: 'active' });
    setEditing(false); setShowModal(true);
  };

  const handleEdit = () => {
    setForm({ facility_id: selected.facility_id, rule_name: selected.rule_name, base_rate: selected.base_rate, peak_multiplier: selected.peak_multiplier, off_peak_multiplier: selected.off_peak_multiplier, surge_threshold: selected.surge_threshold, time_start: selected.time_start, time_end: selected.time_end, day_type: selected.day_type, status: selected.status });
    setEditing(true); setShowModal(true);
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this pricing rule?')) return;
    try { await pricingAPI.delete(selected.id); setToast({ msg: 'Rule deleted', type: 'success' }); setSelected(null); load(); }
    catch (err) { setToast({ msg: 'Delete failed', type: 'error' }); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) { await pricingAPI.update(selected.id, form); setToast({ msg: 'Rule updated', type: 'success' }); }
      else { await pricingAPI.create(form); setToast({ msg: 'Rule created', type: 'success' }); }
      setShowModal(false); setSelected(null); load();
    } catch (err) { setToast({ msg: 'Save failed', type: 'error' }); }
  };

  const runAI = async (facilityId) => {
    setAiLoading(true); setAiResult(null);
    try { const res = await aiAPI.optimizePricing({ facility_id: facilityId || facilities[0]?.id }); setAiResult(res.data); }
    catch (err) { setAiResult({ error: err.message }); }
    finally { setAiLoading(false); }
  };

  return (
    <div>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      <div className="page-header">
        <div><h1>💰 Dynamic Pricing</h1><p>AI-optimized pricing rules and surge management</p></div>
        <div className="header-actions">
          <button className="btn btn-ai" onClick={() => runAI(selected?.facility_id)}>🤖 AI Optimize</button>
          <button className="btn btn-primary" onClick={handleNew}>+ New Rule</button>
        </div>
      </div>

      <AIResponse data={aiResult} loading={aiLoading} />

      {selected && (
        <div className="detail-panel" style={{ marginTop: 20 }}>
          <h2>{selected.rule_name}</h2>
          <div className="detail-grid">
            <div className="detail-item"><label>Facility</label><div className="value">{selected.facility_name}</div></div>
            <div className="detail-item"><label>Base Rate</label><div className="value">${selected.base_rate}/hr</div></div>
            <div className="detail-item"><label>Peak Multiplier</label><div className="value">{selected.peak_multiplier}x</div></div>
            <div className="detail-item"><label>Off-Peak</label><div className="value">{selected.off_peak_multiplier}x</div></div>
            <div className="detail-item"><label>Surge Threshold</label><div className="value">{selected.surge_threshold}%</div></div>
            <div className="detail-item"><label>Time Window</label><div className="value">{selected.time_start} - {selected.time_end}</div></div>
            <div className="detail-item"><label>Day Type</label><div className="value">{selected.day_type}</div></div>
            <div className="detail-item"><label>Status</label><div className="value"><span className={`badge badge-${selected.status}`}>{selected.status}</span></div></div>
          </div>
          <div className="detail-actions">
            <button className="btn btn-primary btn-sm" onClick={handleEdit}>Edit</button>
            <button className="btn btn-danger btn-sm" onClick={handleDelete}>Delete</button>
            <button className="btn btn-ai btn-sm" onClick={() => runAI(selected.facility_id)}>🤖 AI Optimize</button>
            <button className="btn btn-secondary btn-sm" onClick={() => setSelected(null)}>Close</button>
          </div>
        </div>
      )}

      <div className="data-table-container" style={{ marginTop: 20 }}>
        <table className="data-table">
          <thead><tr><th>Facility</th><th>Rule</th><th>Base Rate</th><th>Peak</th><th>Off-Peak</th><th>Surge</th><th>Time</th><th>Day</th><th>Status</th></tr></thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} onClick={() => handleRowClick(item)} style={{ background: selected?.id === item.id ? 'rgba(59,130,246,0.1)' : '' }}>
                <td>{item.facility_name}</td>
                <td style={{ fontWeight: 600 }}>{item.rule_name}</td>
                <td>${item.base_rate}</td>
                <td>{item.peak_multiplier}x</td>
                <td>{item.off_peak_multiplier}x</td>
                <td>{item.surge_threshold}%</td>
                <td>{item.time_start}-{item.time_end}</td>
                <td>{item.day_type}</td>
                <td><span className={`badge badge-${item.status}`}>{item.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <Modal title={editing ? 'Edit Pricing Rule' : 'New Pricing Rule'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit}>
            <div className="form-group"><label>Facility</label>
              <select value={form.facility_id} onChange={(e) => setForm({ ...form, facility_id: parseInt(e.target.value) })} required>
                <option value="">Select...</option>
                {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Rule Name</label><input value={form.rule_name} onChange={(e) => setForm({ ...form, rule_name: e.target.value })} required /></div>
            <div className="form-group"><label>Base Rate ($)</label><input type="number" step="0.5" value={form.base_rate} onChange={(e) => setForm({ ...form, base_rate: parseFloat(e.target.value) })} required /></div>
            <div className="form-group"><label>Peak Multiplier</label><input type="number" step="0.1" value={form.peak_multiplier} onChange={(e) => setForm({ ...form, peak_multiplier: parseFloat(e.target.value) })} /></div>
            <div className="form-group"><label>Off-Peak Multiplier</label><input type="number" step="0.1" value={form.off_peak_multiplier} onChange={(e) => setForm({ ...form, off_peak_multiplier: parseFloat(e.target.value) })} /></div>
            <div className="form-group"><label>Surge Threshold (%)</label><input type="number" value={form.surge_threshold} onChange={(e) => setForm({ ...form, surge_threshold: parseInt(e.target.value) })} /></div>
            <div className="form-group"><label>Start Time</label><input type="time" value={form.time_start} onChange={(e) => setForm({ ...form, time_start: e.target.value })} /></div>
            <div className="form-group"><label>End Time</label><input type="time" value={form.time_end} onChange={(e) => setForm({ ...form, time_end: e.target.value })} /></div>
            <div className="form-group"><label>Day Type</label>
              <select value={form.day_type} onChange={(e) => setForm({ ...form, day_type: e.target.value })}>
                <option value="weekday">Weekday</option><option value="weekend">Weekend</option><option value="holiday">Holiday</option><option value="event">Event</option><option value="all">All</option>
              </select>
            </div>
            <div className="form-group"><label>Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="active">Active</option><option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">{editing ? 'Update' : 'Create'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export default Pricing;
