import React, { useState, useEffect, useCallback } from 'react';
import { analyticsAPI, facilitiesAPI, aiAPI } from '../services/api';
import Modal from '../components/Modal';
import Toast from '../components/Toast';
import AIResponse from '../components/AIResponse';

function Analytics() {
  const [items, setItems] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(false);
  const [toast, setToast] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [form, setForm] = useState({ facility_id: '', report_name: '', report_type: 'daily', period_start: '', period_end: '', total_revenue: 0, total_transactions: 0, avg_occupancy: 0, peak_occupancy: 0, avg_duration_hours: 0, unique_vehicles: 0, new_customers: 0, returning_customers: 0, status: 'pending', notes: '' });

  const load = useCallback(async () => {
    try {
      const [ana, fac] = await Promise.all([analyticsAPI.getAll(), facilitiesAPI.getAll()]);
      setItems(ana.data);
      setFacilities(fac.data);
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRowClick = (item) => setSelected(selected?.id === item.id ? null : item);

  const handleNew = () => {
    setForm({ facility_id: facilities[0]?.id || '', report_name: '', report_type: 'daily', period_start: new Date().toISOString().split('T')[0], period_end: new Date().toISOString().split('T')[0], total_revenue: 0, total_transactions: 0, avg_occupancy: 0, peak_occupancy: 0, avg_duration_hours: 0, unique_vehicles: 0, new_customers: 0, returning_customers: 0, status: 'pending', notes: '' });
    setEditing(false); setShowModal(true);
  };

  const handleEdit = () => {
    setForm({ facility_id: selected.facility_id, report_name: selected.report_name || '', report_type: selected.report_type || 'daily', period_start: selected.period_start?.split('T')[0] || '', period_end: selected.period_end?.split('T')[0] || '', total_revenue: selected.total_revenue, total_transactions: selected.total_transactions, avg_occupancy: selected.avg_occupancy, peak_occupancy: selected.peak_occupancy, avg_duration_hours: selected.avg_duration_hours, unique_vehicles: selected.unique_vehicles, new_customers: selected.new_customers, returning_customers: selected.returning_customers, status: selected.status || 'pending', notes: selected.notes || '' });
    setEditing(true); setShowModal(true);
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this analytics report?')) return;
    try { await analyticsAPI.delete(selected.id); setToast({ msg: 'Report deleted', type: 'success' }); setSelected(null); load(); }
    catch (err) { setToast({ msg: 'Delete failed', type: 'error' }); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) { await analyticsAPI.update(selected.id, form); setToast({ msg: 'Report updated', type: 'success' }); }
      else { await analyticsAPI.create(form); setToast({ msg: 'Report created', type: 'success' }); }
      setShowModal(false); setSelected(null); load();
    } catch (err) { setToast({ msg: 'Save failed', type: 'error' }); }
  };

  const runAI = async (facilityId) => {
    setAiLoading(true); setAiResult(null);
    try { const res = await aiAPI.generateReport({ facility_id: facilityId || selected?.facility_id || facilities[0]?.id }); setAiResult(res.data); }
    catch (err) { setAiResult({ error: err.message }); }
    finally { setAiLoading(false); }
  };

  const statusBadge = (status) => {
    const map = { generated: 'badge-active', pending: 'badge-pending', failed: 'badge-failed' };
    return <span className={`badge ${map[status] || 'badge-pending'}`}>{status}</span>;
  };

  return (
    <div>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      <div className="page-header">
        <div><h1>📊 Analytics Reports</h1><p>Comprehensive parking analytics and reporting</p></div>
        <div className="header-actions">
          <button className="btn btn-ai" onClick={() => runAI()}>🤖 AI Generate</button>
          <button className="btn btn-primary" onClick={handleNew}>+ New Report</button>
        </div>
      </div>

      <AIResponse data={aiResult} loading={aiLoading} />

      {selected && (
        <div className="detail-panel" style={{ marginTop: 20 }}>
          <h2>Report: {selected.report_name}</h2>
          <div className="detail-grid">
            <div className="detail-item"><label>Report Name</label><div className="value">{selected.report_name}</div></div>
            <div className="detail-item"><label>Facility</label><div className="value">{selected.facility_name}</div></div>
            <div className="detail-item"><label>Report Type</label><div className="value" style={{ textTransform: 'capitalize' }}>{selected.report_type}</div></div>
            <div className="detail-item"><label>Period Start</label><div className="value">{selected.period_start?.split('T')[0]}</div></div>
            <div className="detail-item"><label>Period End</label><div className="value">{selected.period_end?.split('T')[0]}</div></div>
            <div className="detail-item"><label>Total Revenue</label><div className="value" style={{ color: '#10b981', fontSize: 22 }}>${Number(selected.total_revenue).toLocaleString()}</div></div>
            <div className="detail-item"><label>Total Transactions</label><div className="value">{selected.total_transactions}</div></div>
            <div className="detail-item"><label>Avg Occupancy</label><div className="value">{selected.avg_occupancy}%</div></div>
            <div className="detail-item"><label>Peak Occupancy</label><div className="value">{selected.peak_occupancy}%</div></div>
            <div className="detail-item"><label>Avg Duration</label><div className="value">{selected.avg_duration_hours}h</div></div>
            <div className="detail-item"><label>Unique Vehicles</label><div className="value">{selected.unique_vehicles}</div></div>
            <div className="detail-item"><label>New Customers</label><div className="value">{selected.new_customers}</div></div>
            <div className="detail-item"><label>Returning Customers</label><div className="value">{selected.returning_customers}</div></div>
            <div className="detail-item"><label>Status</label><div className="value">{statusBadge(selected.status)}</div></div>
            <div className="detail-item"><label>Notes</label><div className="value">{selected.notes || '—'}</div></div>
          </div>
          <div className="detail-actions">
            <button className="btn btn-primary btn-sm" onClick={handleEdit}>Edit</button>
            <button className="btn btn-danger btn-sm" onClick={handleDelete}>Delete</button>
            <button className="btn btn-ai btn-sm" onClick={() => runAI(selected.facility_id)}>🤖 AI Generate</button>
            <button className="btn btn-secondary btn-sm" onClick={() => setSelected(null)}>Close</button>
          </div>
        </div>
      )}

      <div className="data-table-container" style={{ marginTop: 20 }}>
        <table className="data-table">
          <thead><tr><th>Report</th><th>Facility</th><th>Type</th><th>Period</th><th>Revenue</th><th>Transactions</th><th>Avg Occ%</th><th>Status</th></tr></thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} onClick={() => handleRowClick(item)} style={{ background: selected?.id === item.id ? 'rgba(59,130,246,0.1)' : '' }}>
                <td style={{ fontWeight: 600 }}>{item.report_name}</td>
                <td>{item.facility_name}</td>
                <td style={{ textTransform: 'capitalize' }}>{item.report_type}</td>
                <td>{item.period_start?.split('T')[0]} — {item.period_end?.split('T')[0]}</td>
                <td style={{ color: '#10b981', fontWeight: 700 }}>${Number(item.total_revenue).toLocaleString()}</td>
                <td>{item.total_transactions}</td>
                <td>{item.avg_occupancy}%</td>
                <td>{statusBadge(item.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <Modal title={editing ? 'Edit Analytics Report' : 'New Analytics Report'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit}>
            <div className="form-group"><label>Facility</label>
              <select value={form.facility_id} onChange={(e) => setForm({ ...form, facility_id: parseInt(e.target.value) })} required>
                <option value="">Select...</option>
                {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Report Name</label><input type="text" value={form.report_name} onChange={(e) => setForm({ ...form, report_name: e.target.value })} required /></div>
            <div className="form-group"><label>Report Type</label>
              <select value={form.report_type} onChange={(e) => setForm({ ...form, report_type: e.target.value })} required>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="annual">Annual</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div className="form-group"><label>Period Start</label><input type="date" value={form.period_start} onChange={(e) => setForm({ ...form, period_start: e.target.value })} required /></div>
            <div className="form-group"><label>Period End</label><input type="date" value={form.period_end} onChange={(e) => setForm({ ...form, period_end: e.target.value })} required /></div>
            <div className="form-group"><label>Total Revenue ($)</label><input type="number" step="0.01" value={form.total_revenue} onChange={(e) => setForm({ ...form, total_revenue: parseFloat(e.target.value) })} required /></div>
            <div className="form-group"><label>Total Transactions</label><input type="number" value={form.total_transactions} onChange={(e) => setForm({ ...form, total_transactions: parseInt(e.target.value) })} /></div>
            <div className="form-group"><label>Avg Occupancy (%)</label><input type="number" step="0.1" max="100" value={form.avg_occupancy} onChange={(e) => setForm({ ...form, avg_occupancy: parseFloat(e.target.value) })} /></div>
            <div className="form-group"><label>Peak Occupancy (%)</label><input type="number" step="0.1" max="100" value={form.peak_occupancy} onChange={(e) => setForm({ ...form, peak_occupancy: parseFloat(e.target.value) })} /></div>
            <div className="form-group"><label>Avg Duration (hours)</label><input type="number" step="0.1" value={form.avg_duration_hours} onChange={(e) => setForm({ ...form, avg_duration_hours: parseFloat(e.target.value) })} /></div>
            <div className="form-group"><label>Unique Vehicles</label><input type="number" value={form.unique_vehicles} onChange={(e) => setForm({ ...form, unique_vehicles: parseInt(e.target.value) })} /></div>
            <div className="form-group"><label>New Customers</label><input type="number" value={form.new_customers} onChange={(e) => setForm({ ...form, new_customers: parseInt(e.target.value) })} /></div>
            <div className="form-group"><label>Returning Customers</label><input type="number" value={form.returning_customers} onChange={(e) => setForm({ ...form, returning_customers: parseInt(e.target.value) })} /></div>
            <div className="form-group"><label>Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} required>
                <option value="generated">Generated</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
            </div>
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

export default Analytics;
