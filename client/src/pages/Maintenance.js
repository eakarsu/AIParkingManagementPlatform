import React, { useState, useEffect, useCallback } from 'react';
import { maintenanceAPI, facilitiesAPI, aiAPI } from '../services/api';
import Modal from '../components/Modal';
import Toast from '../components/Toast';
import AIResponse from '../components/AIResponse';

function Maintenance() {
  const [items, setItems] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(false);
  const [toast, setToast] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [form, setForm] = useState({ facility_id: '', task_name: '', task_type: 'repair', priority: 'medium', assigned_to: '', description: '', status: 'pending', estimated_cost: 0, actual_cost: 0, scheduled_date: '', completed_date: '', notes: '' });

  const load = useCallback(async () => {
    try {
      const [maint, fac] = await Promise.all([maintenanceAPI.getAll(), facilitiesAPI.getAll()]);
      setItems(maint.data);
      setFacilities(fac.data);
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRowClick = (item) => setSelected(selected?.id === item.id ? null : item);

  const handleNew = () => {
    setForm({ facility_id: facilities[0]?.id || '', task_name: '', task_type: 'repair', priority: 'medium', assigned_to: '', description: '', status: 'pending', estimated_cost: 0, actual_cost: 0, scheduled_date: '', completed_date: '', notes: '' });
    setEditing(false); setShowModal(true);
  };

  const handleEdit = () => {
    setForm({ facility_id: selected.facility_id, task_name: selected.task_name, task_type: selected.task_type, priority: selected.priority, assigned_to: selected.assigned_to || '', description: selected.description || '', status: selected.status, estimated_cost: selected.estimated_cost || 0, actual_cost: selected.actual_cost || 0, scheduled_date: selected.scheduled_date ? selected.scheduled_date.slice(0, 10) : '', completed_date: selected.completed_date ? selected.completed_date.slice(0, 10) : '', notes: selected.notes || '' });
    setEditing(true); setShowModal(true);
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this maintenance task?')) return;
    try { await maintenanceAPI.delete(selected.id); setToast({ msg: 'Task deleted', type: 'success' }); setSelected(null); load(); }
    catch (err) { setToast({ msg: 'Delete failed', type: 'error' }); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) { await maintenanceAPI.update(selected.id, form); setToast({ msg: 'Task updated', type: 'success' }); }
      else { await maintenanceAPI.create(form); setToast({ msg: 'Task created', type: 'success' }); }
      setShowModal(false); setSelected(null); load();
    } catch (err) { setToast({ msg: 'Save failed', type: 'error' }); }
  };

  const runAI = async (facilityId) => {
    setAiLoading(true); setAiResult(null);
    try { const res = await aiAPI.predictMaintenance({ facility_id: facilityId || selected?.facility_id || facilities[0]?.id }); setAiResult(res.data); }
    catch (err) { setAiResult({ error: err.message }); }
    finally { setAiLoading(false); }
  };

  const getPriorityColor = (priority) => {
    const map = { urgent: '#ef4444', high: '#f97316', medium: '#eab308', low: '#22c55e' };
    return map[priority] || '#6b7280';
  };

  const getStatusBadge = (status) => {
    const map = { pending: 'badge-pending', in_progress: 'badge-disputed', completed: 'badge-active', cancelled: 'badge-dismissed' };
    return map[status] || 'badge-pending';
  };

  return (
    <div>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      <div className="page-header">
        <div><h1>🔧 Maintenance</h1><p>Track, schedule, and manage maintenance tasks</p></div>
        <div className="header-actions">
          <button className="btn btn-ai" onClick={() => runAI()} disabled={facilities.length === 0}>🤖 AI Predict</button>
          <button className="btn btn-primary" onClick={handleNew}>+ New Task</button>
        </div>
      </div>

      <AIResponse data={aiResult} loading={aiLoading} />

      {selected && (
        <div className="detail-panel" style={{ marginTop: 20 }}>
          <h2>Task #{selected.id}: {selected.task_name}</h2>
          <div className="detail-grid">
            <div className="detail-item"><label>Task Name</label><div className="value">{selected.task_name}</div></div>
            <div className="detail-item"><label>Facility</label><div className="value">{selected.facility_name}</div></div>
            <div className="detail-item"><label>Type</label><div className="value">{selected.task_type.replace(/_/g, ' ')}</div></div>
            <div className="detail-item"><label>Priority</label><div className="value" style={{ color: getPriorityColor(selected.priority), fontWeight: 600 }}>{selected.priority}</div></div>
            <div className="detail-item"><label>Assigned To</label><div className="value">{selected.assigned_to || '-'}</div></div>
            <div className="detail-item"><label>Description</label><div className="value">{selected.description || '-'}</div></div>
            <div className="detail-item"><label>Status</label><div className="value"><span className={`badge ${getStatusBadge(selected.status)}`}>{selected.status.replace(/_/g, ' ')}</span></div></div>
            <div className="detail-item"><label>Estimated Cost</label><div className="value">${selected.estimated_cost || 0}</div></div>
            <div className="detail-item"><label>Actual Cost</label><div className="value">${selected.actual_cost || 0}</div></div>
            <div className="detail-item"><label>Scheduled Date</label><div className="value">{selected.scheduled_date ? new Date(selected.scheduled_date).toLocaleDateString() : '-'}</div></div>
            <div className="detail-item"><label>Completed Date</label><div className="value">{selected.completed_date ? new Date(selected.completed_date).toLocaleDateString() : '-'}</div></div>
            <div className="detail-item"><label>Notes</label><div className="value">{selected.notes || '-'}</div></div>
          </div>
          <div className="detail-actions">
            <button className="btn btn-primary btn-sm" onClick={handleEdit}>Edit</button>
            <button className="btn btn-danger btn-sm" onClick={handleDelete}>Delete</button>
            <button className="btn btn-ai btn-sm" onClick={() => runAI(selected.facility_id)}>🤖 AI Predict</button>
            <button className="btn btn-secondary btn-sm" onClick={() => setSelected(null)}>Close</button>
          </div>
        </div>
      )}

      <div className="data-table-container" style={{ marginTop: 20 }}>
        <table className="data-table">
          <thead><tr><th>Task</th><th>Facility</th><th>Type</th><th>Priority</th><th>Assigned</th><th>Status</th><th>Est Cost</th><th>Scheduled</th></tr></thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} onClick={() => handleRowClick(item)} style={{ background: selected?.id === item.id ? 'rgba(59,130,246,0.1)' : '' }}>
                <td>{item.task_name}</td>
                <td>{item.facility_name}</td>
                <td>{item.task_type.replace(/_/g, ' ')}</td>
                <td style={{ color: getPriorityColor(item.priority), fontWeight: 600 }}>{item.priority}</td>
                <td>{item.assigned_to || '-'}</td>
                <td><span className={`badge ${getStatusBadge(item.status)}`}>{item.status.replace(/_/g, ' ')}</span></td>
                <td>${item.estimated_cost || 0}</td>
                <td>{item.scheduled_date ? new Date(item.scheduled_date).toLocaleDateString() : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <Modal title={editing ? 'Edit Task' : 'New Task'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit}>
            <div className="form-group"><label>Facility</label>
              <select value={form.facility_id} onChange={(e) => setForm({ ...form, facility_id: parseInt(e.target.value) })} required>
                <option value="">Select...</option>
                {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Task Name</label><input value={form.task_name} onChange={(e) => setForm({ ...form, task_name: e.target.value })} required /></div>
            <div className="form-group"><label>Task Type</label>
              <select value={form.task_type} onChange={(e) => setForm({ ...form, task_type: e.target.value })}>
                <option value="repair">Repair</option><option value="inspection">Inspection</option><option value="cleaning">Cleaning</option><option value="equipment">Equipment</option>
                <option value="electrical">Electrical</option><option value="plumbing">Plumbing</option><option value="painting">Painting</option><option value="other">Other</option>
              </select>
            </div>
            <div className="form-group"><label>Priority</label>
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option>
              </select>
            </div>
            <div className="form-group"><label>Assigned To</label><input value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })} /></div>
            <div className="form-group"><label>Description</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows="3"></textarea></div>
            <div className="form-group"><label>Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="pending">Pending</option><option value="in_progress">In Progress</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div className="form-group"><label>Estimated Cost ($)</label><input type="number" step="0.01" value={form.estimated_cost} onChange={(e) => setForm({ ...form, estimated_cost: parseFloat(e.target.value) })} /></div>
            <div className="form-group"><label>Actual Cost ($)</label><input type="number" step="0.01" value={form.actual_cost} onChange={(e) => setForm({ ...form, actual_cost: parseFloat(e.target.value) })} /></div>
            <div className="form-group"><label>Scheduled Date</label><input type="date" value={form.scheduled_date} onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })} /></div>
            <div className="form-group"><label>Completed Date</label><input type="date" value={form.completed_date} onChange={(e) => setForm({ ...form, completed_date: e.target.value })} /></div>
            <div className="form-group"><label>Notes</label><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows="3"></textarea></div>
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

export default Maintenance;
