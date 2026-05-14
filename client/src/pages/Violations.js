import React, { useState, useEffect, useCallback } from 'react';
import { violationsAPI, facilitiesAPI, aiAPI } from '../services/api';
import Modal from '../components/Modal';
import Toast from '../components/Toast';
import AIResponse from '../components/AIResponse';
import Pagination from '../components/Pagination';

function Violations() {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [facilities, setFacilities] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(false);
  const [toast, setToast] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [form, setForm] = useState({ facility_id: '', plate_number: '', violation_type: 'expired_meter', fine_amount: 75, description: '', status: 'pending', zone: 'A1', evidence_url: '' });

  const load = useCallback(async (p = 1) => {
    try {
      const [vio, fac] = await Promise.all([violationsAPI.getAll({ page: p, limit: 20 }), facilitiesAPI.getAll({ page: 1, limit: 100 })]);
      const vd = vio.data; setItems(vd.data || vd);
      if (vd.totalPages) { setTotalPages(vd.totalPages); setTotal(vd.total); setPage(vd.page); }
      const fd = fac.data; setFacilities(fd.data || fd);
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => { load(1); }, [load]);

  const handleRowClick = (item) => setSelected(selected?.id === item.id ? null : item);

  const handleNew = () => {
    setForm({ facility_id: facilities[0]?.id || '', plate_number: '', violation_type: 'expired_meter', fine_amount: 75, description: '', status: 'pending', zone: 'A1', evidence_url: '' });
    setEditing(false); setShowModal(true);
  };

  const handleEdit = () => {
    setForm({ facility_id: selected.facility_id, plate_number: selected.plate_number, violation_type: selected.violation_type, fine_amount: selected.fine_amount, description: selected.description || '', status: selected.status, zone: selected.zone, evidence_url: selected.evidence_url || '' });
    setEditing(true); setShowModal(true);
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this violation?')) return;
    try { await violationsAPI.delete(selected.id); setToast({ msg: 'Violation deleted', type: 'success' }); setSelected(null); load(page); }
    catch (err) { setToast({ msg: 'Delete failed', type: 'error' }); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) { await violationsAPI.update(selected.id, form); setToast({ msg: 'Violation updated', type: 'success' }); }
      else { await violationsAPI.create(form); setToast({ msg: 'Violation created', type: 'success' }); }
      setShowModal(false); setSelected(null); load(page);
    } catch (err) { setToast({ msg: 'Save failed', type: 'error' }); }
  };

  const runAI = async (violationId) => {
    setAiLoading(true); setAiResult(null);
    try { const res = await aiAPI.analyzeViolation({ violation_id: violationId || selected?.id || items[0]?.id }); setAiResult(res.data); }
    catch (err) { setAiResult({ error: err.message }); }
    finally { setAiLoading(false); }
  };

  const getStatusBadge = (status) => {
    const map = { pending: 'badge-pending', issued: 'badge-issued', paid: 'badge-paid', disputed: 'badge-disputed', dismissed: 'badge-dismissed' };
    return map[status] || 'badge-pending';
  };

  return (
    <div>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      <div className="page-header">
        <div><h1>🚨 Violation Management</h1><p>Track, analyze, and manage parking violations</p></div>
        <div className="header-actions">
          <button className="btn btn-ai" onClick={() => runAI()} disabled={!selected && items.length === 0}>🤖 AI Analyze</button>
          <button className="btn btn-primary" onClick={handleNew}>+ New Violation</button>
        </div>
      </div>

      <AIResponse data={aiResult} loading={aiLoading} />

      {selected && (
        <div className="detail-panel" style={{ marginTop: 20 }}>
          <h2>Violation #{selected.id}: {selected.violation_type.replace(/_/g, ' ')}</h2>
          <div className="detail-grid">
            <div className="detail-item"><label>Facility</label><div className="value">{selected.facility_name}</div></div>
            <div className="detail-item"><label>Plate</label><div className="value" style={{ fontFamily: 'monospace' }}>{selected.plate_number}</div></div>
            <div className="detail-item"><label>Type</label><div className="value">{selected.violation_type.replace(/_/g, ' ')}</div></div>
            <div className="detail-item"><label>Fine</label><div className="value" style={{ color: '#ef4444', fontSize: 20 }}>${selected.fine_amount}</div></div>
            <div className="detail-item"><label>Status</label><div className="value"><span className={`badge ${getStatusBadge(selected.status)}`}>{selected.status}</span></div></div>
            <div className="detail-item"><label>Zone</label><div className="value">{selected.zone}</div></div>
            <div className="detail-item"><label>Description</label><div className="value">{selected.description || '-'}</div></div>
            <div className="detail-item"><label>Issued</label><div className="value">{new Date(selected.issued_at).toLocaleString()}</div></div>
          </div>
          <div className="detail-actions">
            <button className="btn btn-primary btn-sm" onClick={handleEdit}>Edit</button>
            <button className="btn btn-danger btn-sm" onClick={handleDelete}>Delete</button>
            <button className="btn btn-ai btn-sm" onClick={() => runAI(selected.id)}>🤖 AI Analyze</button>
            <button className="btn btn-secondary btn-sm" onClick={() => setSelected(null)}>Close</button>
          </div>
        </div>
      )}

      <div className="data-table-container" style={{ marginTop: 20 }}>
        <table className="data-table">
          <thead><tr><th>ID</th><th>Facility</th><th>Plate</th><th>Type</th><th>Fine</th><th>Zone</th><th>Status</th><th>Issued</th></tr></thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} onClick={() => handleRowClick(item)} style={{ background: selected?.id === item.id ? 'rgba(59,130,246,0.1)' : '' }}>
                <td>#{item.id}</td>
                <td>{item.facility_name}</td>
                <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{item.plate_number}</td>
                <td>{item.violation_type.replace(/_/g, ' ')}</td>
                <td style={{ color: '#ef4444', fontWeight: 600 }}>${item.fine_amount}</td>
                <td>{item.zone}</td>
                <td><span className={`badge ${getStatusBadge(item.status)}`}>{item.status}</span></td>
                <td>{new Date(item.issued_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} total={total} onPageChange={(p) => load(p)} />

      {showModal && (
        <Modal title={editing ? 'Edit Violation' : 'New Violation'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit}>
            <div className="form-group"><label>Facility</label>
              <select value={form.facility_id} onChange={(e) => setForm({ ...form, facility_id: parseInt(e.target.value) })} required>
                <option value="">Select...</option>
                {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Plate Number</label><input value={form.plate_number} onChange={(e) => setForm({ ...form, plate_number: e.target.value.toUpperCase() })} required /></div>
            <div className="form-group"><label>Violation Type</label>
              <select value={form.violation_type} onChange={(e) => setForm({ ...form, violation_type: e.target.value })}>
                <option value="expired_meter">Expired Meter</option><option value="no_permit">No Permit</option><option value="double_parking">Double Parking</option>
                <option value="handicap_violation">Handicap Violation</option><option value="fire_lane">Fire Lane</option><option value="overtime_parking">Overtime Parking</option>
                <option value="unauthorized_area">Unauthorized Area</option><option value="tailgating">Tailgating</option><option value="ev_charging_abuse">EV Charging Abuse</option>
                <option value="noise_violation">Noise Violation</option><option value="wrong_direction">Wrong Direction</option><option value="no_payment">No Payment</option>
              </select>
            </div>
            <div className="form-group"><label>Fine Amount ($)</label><input type="number" step="5" value={form.fine_amount} onChange={(e) => setForm({ ...form, fine_amount: parseFloat(e.target.value) })} required /></div>
            <div className="form-group"><label>Zone</label><input value={form.zone} onChange={(e) => setForm({ ...form, zone: e.target.value })} /></div>
            <div className="form-group"><label>Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="pending">Pending</option><option value="issued">Issued</option><option value="paid">Paid</option><option value="disputed">Disputed</option><option value="dismissed">Dismissed</option>
              </select>
            </div>
            <div className="form-group"><label>Description</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows="3"></textarea></div>
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

export default Violations;
