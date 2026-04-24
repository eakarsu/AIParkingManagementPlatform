import React, { useState, useEffect, useCallback } from 'react';
import { revenueAPI, facilitiesAPI, aiAPI } from '../services/api';
import Modal from '../components/Modal';
import Toast from '../components/Toast';
import AIResponse from '../components/AIResponse';

function Revenue() {
  const [items, setItems] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(false);
  const [toast, setToast] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [form, setForm] = useState({ facility_id: '', record_date: '', total_revenue: 0, parking_revenue: 0, violation_revenue: 0, subscription_revenue: 0, transactions_count: 0, avg_duration_hours: 0, optimization_score: 0, notes: '' });

  const load = useCallback(async () => {
    try {
      const [rev, fac] = await Promise.all([revenueAPI.getAll(), facilitiesAPI.getAll()]);
      setItems(rev.data);
      setFacilities(fac.data);
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRowClick = (item) => setSelected(selected?.id === item.id ? null : item);

  const handleNew = () => {
    setForm({ facility_id: facilities[0]?.id || '', record_date: new Date().toISOString().split('T')[0], total_revenue: 0, parking_revenue: 0, violation_revenue: 0, subscription_revenue: 0, transactions_count: 0, avg_duration_hours: 0, optimization_score: 0, notes: '' });
    setEditing(false); setShowModal(true);
  };

  const handleEdit = () => {
    setForm({ facility_id: selected.facility_id, record_date: selected.record_date?.split('T')[0], total_revenue: selected.total_revenue, parking_revenue: selected.parking_revenue, violation_revenue: selected.violation_revenue, subscription_revenue: selected.subscription_revenue, transactions_count: selected.transactions_count, avg_duration_hours: selected.avg_duration_hours, optimization_score: selected.optimization_score, notes: selected.notes || '' });
    setEditing(true); setShowModal(true);
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this revenue record?')) return;
    try { await revenueAPI.delete(selected.id); setToast({ msg: 'Record deleted', type: 'success' }); setSelected(null); load(); }
    catch (err) { setToast({ msg: 'Delete failed', type: 'error' }); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) { await revenueAPI.update(selected.id, form); setToast({ msg: 'Record updated', type: 'success' }); }
      else { await revenueAPI.create(form); setToast({ msg: 'Record created', type: 'success' }); }
      setShowModal(false); setSelected(null); load();
    } catch (err) { setToast({ msg: 'Save failed', type: 'error' }); }
  };

  const runAI = async (facilityId) => {
    setAiLoading(true); setAiResult(null);
    try { const res = await aiAPI.optimizeRevenue({ facility_id: facilityId || selected?.facility_id || facilities[0]?.id }); setAiResult(res.data); }
    catch (err) { setAiResult({ error: err.message }); }
    finally { setAiLoading(false); }
  };

  const getScoreColor = (score) => {
    if (score >= 90) return '#10b981';
    if (score >= 75) return '#3b82f6';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      <div className="page-header">
        <div><h1>💵 Revenue Optimization</h1><p>AI-driven revenue analytics and growth strategies</p></div>
        <div className="header-actions">
          <button className="btn btn-ai" onClick={() => runAI()}>🤖 AI Optimize</button>
          <button className="btn btn-primary" onClick={handleNew}>+ New Record</button>
        </div>
      </div>

      <AIResponse data={aiResult} loading={aiLoading} />

      {selected && (
        <div className="detail-panel" style={{ marginTop: 20 }}>
          <h2>Revenue: {selected.facility_name} - {selected.record_date?.split('T')[0]}</h2>
          <div className="detail-grid">
            <div className="detail-item"><label>Facility</label><div className="value">{selected.facility_name}</div></div>
            <div className="detail-item"><label>Date</label><div className="value">{selected.record_date?.split('T')[0]}</div></div>
            <div className="detail-item"><label>Total Revenue</label><div className="value" style={{ color: '#10b981', fontSize: 22 }}>${Number(selected.total_revenue).toLocaleString()}</div></div>
            <div className="detail-item"><label>Parking Revenue</label><div className="value">${Number(selected.parking_revenue).toLocaleString()}</div></div>
            <div className="detail-item"><label>Violation Revenue</label><div className="value">${Number(selected.violation_revenue).toLocaleString()}</div></div>
            <div className="detail-item"><label>Subscription Revenue</label><div className="value">${Number(selected.subscription_revenue).toLocaleString()}</div></div>
            <div className="detail-item"><label>Transactions</label><div className="value">{selected.transactions_count}</div></div>
            <div className="detail-item"><label>Avg Duration</label><div className="value">{selected.avg_duration_hours}h</div></div>
            <div className="detail-item"><label>Optimization Score</label><div className="value" style={{ color: getScoreColor(selected.optimization_score) }}>{selected.optimization_score}/100</div></div>
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
          <thead><tr><th>Facility</th><th>Date</th><th>Total</th><th>Parking</th><th>Violations</th><th>Subs</th><th>Txns</th><th>Score</th></tr></thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} onClick={() => handleRowClick(item)} style={{ background: selected?.id === item.id ? 'rgba(59,130,246,0.1)' : '' }}>
                <td style={{ fontWeight: 600 }}>{item.facility_name}</td>
                <td>{item.record_date?.split('T')[0]}</td>
                <td style={{ color: '#10b981', fontWeight: 700 }}>${Number(item.total_revenue).toLocaleString()}</td>
                <td>${Number(item.parking_revenue).toLocaleString()}</td>
                <td>${Number(item.violation_revenue).toLocaleString()}</td>
                <td>${Number(item.subscription_revenue).toLocaleString()}</td>
                <td>{item.transactions_count}</td>
                <td style={{ color: getScoreColor(item.optimization_score), fontWeight: 600 }}>{item.optimization_score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <Modal title={editing ? 'Edit Revenue Record' : 'New Revenue Record'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit}>
            <div className="form-group"><label>Facility</label>
              <select value={form.facility_id} onChange={(e) => setForm({ ...form, facility_id: parseInt(e.target.value) })} required>
                <option value="">Select...</option>
                {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Date</label><input type="date" value={form.record_date} onChange={(e) => setForm({ ...form, record_date: e.target.value })} required /></div>
            <div className="form-group"><label>Total Revenue ($)</label><input type="number" step="0.01" value={form.total_revenue} onChange={(e) => setForm({ ...form, total_revenue: parseFloat(e.target.value) })} required /></div>
            <div className="form-group"><label>Parking Revenue ($)</label><input type="number" step="0.01" value={form.parking_revenue} onChange={(e) => setForm({ ...form, parking_revenue: parseFloat(e.target.value) })} /></div>
            <div className="form-group"><label>Violation Revenue ($)</label><input type="number" step="0.01" value={form.violation_revenue} onChange={(e) => setForm({ ...form, violation_revenue: parseFloat(e.target.value) })} /></div>
            <div className="form-group"><label>Subscription Revenue ($)</label><input type="number" step="0.01" value={form.subscription_revenue} onChange={(e) => setForm({ ...form, subscription_revenue: parseFloat(e.target.value) })} /></div>
            <div className="form-group"><label>Transactions Count</label><input type="number" value={form.transactions_count} onChange={(e) => setForm({ ...form, transactions_count: parseInt(e.target.value) })} /></div>
            <div className="form-group"><label>Avg Duration (hours)</label><input type="number" step="0.1" value={form.avg_duration_hours} onChange={(e) => setForm({ ...form, avg_duration_hours: parseFloat(e.target.value) })} /></div>
            <div className="form-group"><label>Optimization Score</label><input type="number" step="0.1" max="100" value={form.optimization_score} onChange={(e) => setForm({ ...form, optimization_score: parseFloat(e.target.value) })} /></div>
            <div className="form-group"><label>Notes</label><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows="2"></textarea></div>
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

export default Revenue;
