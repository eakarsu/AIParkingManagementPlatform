import React, { useState, useEffect, useCallback } from 'react';
import { permitsAPI, facilitiesAPI, aiAPI } from '../services/api';
import Modal from '../components/Modal';
import Toast from '../components/Toast';
import AIResponse from '../components/AIResponse';

function Permits() {
  const [items, setItems] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(false);
  const [toast, setToast] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [form, setForm] = useState({ facility_id: '', permit_number: '', holder_name: '', holder_email: '', plate_number: '', permit_type: 'monthly', start_date: '', end_date: '', monthly_rate: 150, status: 'active', zone_access: '', notes: '' });

  const load = useCallback(async () => {
    try {
      const [per, fac] = await Promise.all([permitsAPI.getAll(), facilitiesAPI.getAll()]);
      setItems(per.data);
      setFacilities(fac.data);
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRowClick = (item) => setSelected(selected?.id === item.id ? null : item);

  const handleNew = () => {
    setForm({ facility_id: facilities[0]?.id || '', permit_number: '', holder_name: '', holder_email: '', plate_number: '', permit_type: 'monthly', start_date: '', end_date: '', monthly_rate: 150, status: 'active', zone_access: '', notes: '' });
    setEditing(false); setShowModal(true);
  };

  const handleEdit = () => {
    setForm({ facility_id: selected.facility_id, permit_number: selected.permit_number || '', holder_name: selected.holder_name || '', holder_email: selected.holder_email || '', plate_number: selected.plate_number || '', permit_type: selected.permit_type || 'monthly', start_date: selected.start_date ? selected.start_date.slice(0, 10) : '', end_date: selected.end_date ? selected.end_date.slice(0, 10) : '', monthly_rate: selected.monthly_rate || 0, status: selected.status, zone_access: selected.zone_access || '', notes: selected.notes || '' });
    setEditing(true); setShowModal(true);
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this permit?')) return;
    try { await permitsAPI.delete(selected.id); setToast({ msg: 'Permit deleted', type: 'success' }); setSelected(null); load(); }
    catch (err) { setToast({ msg: 'Delete failed', type: 'error' }); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) { await permitsAPI.update(selected.id, form); setToast({ msg: 'Permit updated', type: 'success' }); }
      else { await permitsAPI.create(form); setToast({ msg: 'Permit created', type: 'success' }); }
      setShowModal(false); setSelected(null); load();
    } catch (err) { setToast({ msg: 'Save failed', type: 'error' }); }
  };

  const runAI = async () => {
    setAiLoading(true); setAiResult(null);
    try { const res = await aiAPI.analyzePermits({ facility_id: selected?.facility_id || items[0]?.facility_id }); setAiResult(res.data); }
    catch (err) { setAiResult({ error: err.message }); }
    finally { setAiLoading(false); }
  };

  const getStatusBadge = (status) => {
    const map = { active: 'badge-active', expired: 'badge-issued', suspended: 'badge-pending', cancelled: 'badge-dismissed' };
    return map[status] || 'badge-pending';
  };

  const getFacilityName = (facilityId) => {
    const fac = facilities.find(f => f.id === facilityId);
    return fac ? fac.name : facilityId;
  };

  return (
    <div>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      <div className="page-header">
        <div><h1>🎫 Permits</h1><p>Manage parking permits, holders, and access</p></div>
        <div className="header-actions">
          <button className="btn btn-ai" onClick={runAI} disabled={items.length === 0}>🤖 AI Analyze</button>
          <button className="btn btn-primary" onClick={handleNew}>+ New Permit</button>
        </div>
      </div>

      <AIResponse data={aiResult} loading={aiLoading} />

      {selected && (
        <div className="detail-panel" style={{ marginTop: 20 }}>
          <h2>Permit #{selected.permit_number || selected.id}: {selected.holder_name}</h2>
          <div className="detail-grid">
            <div className="detail-item"><label>Permit Number</label><div className="value" style={{ fontFamily: 'monospace' }}>{selected.permit_number || '-'}</div></div>
            <div className="detail-item"><label>Holder Name</label><div className="value">{selected.holder_name || '-'}</div></div>
            <div className="detail-item"><label>Holder Email</label><div className="value">{selected.holder_email || '-'}</div></div>
            <div className="detail-item"><label>Facility</label><div className="value">{selected.facility_name || getFacilityName(selected.facility_id)}</div></div>
            <div className="detail-item"><label>Plate</label><div className="value" style={{ fontFamily: 'monospace' }}>{selected.plate_number || '-'}</div></div>
            <div className="detail-item"><label>Type</label><div className="value">{selected.permit_type}</div></div>
            <div className="detail-item"><label>Rate/mo</label><div className="value" style={{ color: '#10b981', fontSize: 20 }}>${selected.monthly_rate}</div></div>
            <div className="detail-item"><label>Status</label><div className="value"><span className={`badge ${getStatusBadge(selected.status)}`}>{selected.status}</span></div></div>
            <div className="detail-item"><label>Start Date</label><div className="value">{selected.start_date ? new Date(selected.start_date).toLocaleDateString() : '-'}</div></div>
            <div className="detail-item"><label>Expires</label><div className="value">{selected.end_date ? new Date(selected.end_date).toLocaleDateString() : '-'}</div></div>
            <div className="detail-item"><label>Zone Access</label><div className="value">{selected.zone_access || '-'}</div></div>
            <div className="detail-item"><label>Notes</label><div className="value">{selected.notes || '-'}</div></div>
          </div>
          <div className="detail-actions">
            <button className="btn btn-primary btn-sm" onClick={handleEdit}>Edit</button>
            <button className="btn btn-danger btn-sm" onClick={handleDelete}>Delete</button>
            <button className="btn btn-ai btn-sm" onClick={runAI}>🤖 AI Analyze</button>
            <button className="btn btn-secondary btn-sm" onClick={() => setSelected(null)}>Close</button>
          </div>
        </div>
      )}

      <div className="data-table-container" style={{ marginTop: 20 }}>
        <table className="data-table">
          <thead><tr><th>Permit #</th><th>Holder</th><th>Facility</th><th>Plate</th><th>Type</th><th>Rate/mo</th><th>Status</th><th>Expires</th></tr></thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} onClick={() => handleRowClick(item)} style={{ background: selected?.id === item.id ? 'rgba(59,130,246,0.1)' : '' }}>
                <td style={{ fontFamily: 'monospace' }}>{item.permit_number || `#${item.id}`}</td>
                <td>{item.holder_name || '-'}</td>
                <td>{item.facility_name || getFacilityName(item.facility_id)}</td>
                <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{item.plate_number || '-'}</td>
                <td>{item.permit_type}</td>
                <td style={{ color: '#10b981', fontWeight: 600 }}>${item.monthly_rate}</td>
                <td><span className={`badge ${getStatusBadge(item.status)}`}>{item.status}</span></td>
                <td>{item.end_date ? new Date(item.end_date).toLocaleDateString() : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <Modal title={editing ? 'Edit Permit' : 'New Permit'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit}>
            <div className="form-group"><label>Facility</label>
              <select value={form.facility_id} onChange={(e) => setForm({ ...form, facility_id: parseInt(e.target.value) })} required>
                <option value="">Select...</option>
                {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Permit Number</label><input value={form.permit_number} onChange={(e) => setForm({ ...form, permit_number: e.target.value })} required /></div>
            <div className="form-group"><label>Holder Name</label><input value={form.holder_name} onChange={(e) => setForm({ ...form, holder_name: e.target.value })} required /></div>
            <div className="form-group"><label>Holder Email</label><input type="email" value={form.holder_email} onChange={(e) => setForm({ ...form, holder_email: e.target.value })} /></div>
            <div className="form-group"><label>Plate Number</label><input value={form.plate_number} onChange={(e) => setForm({ ...form, plate_number: e.target.value.toUpperCase() })} required /></div>
            <div className="form-group"><label>Permit Type</label>
              <select value={form.permit_type} onChange={(e) => setForm({ ...form, permit_type: e.target.value })}>
                <option value="monthly">Monthly</option><option value="annual">Annual</option><option value="employee">Employee</option>
                <option value="visitor">Visitor</option><option value="student">Student</option><option value="vip">VIP</option>
              </select>
            </div>
            <div className="form-group"><label>Start Date</label><input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} required /></div>
            <div className="form-group"><label>End Date</label><input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} required /></div>
            <div className="form-group"><label>Monthly Rate ($)</label><input type="number" step="5" value={form.monthly_rate} onChange={(e) => setForm({ ...form, monthly_rate: parseFloat(e.target.value) })} required /></div>
            <div className="form-group"><label>Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="active">Active</option><option value="expired">Expired</option><option value="suspended">Suspended</option><option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div className="form-group"><label>Zone Access</label><input value={form.zone_access} onChange={(e) => setForm({ ...form, zone_access: e.target.value })} /></div>
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

export default Permits;
