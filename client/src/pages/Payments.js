import React, { useState, useEffect, useCallback } from 'react';
import { paymentsAPI, facilitiesAPI, aiAPI } from '../services/api';
import Modal from '../components/Modal';
import Toast from '../components/Toast';
import AIResponse from '../components/AIResponse';

function Payments() {
  const [items, setItems] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(false);
  const [toast, setToast] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [form, setForm] = useState({ facility_id: '', plate_number: '', amount: 0, payment_method: 'mobile', payment_status: 'completed', duration_hours: 1, phone_number: '', transaction_ref: '', notes: '' });

  const load = useCallback(async () => {
    try {
      const [pay, fac] = await Promise.all([paymentsAPI.getAll(), facilitiesAPI.getAll()]);
      setItems(pay.data);
      setFacilities(fac.data);
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRowClick = (item) => setSelected(selected?.id === item.id ? null : item);

  const handleNew = () => {
    setForm({ facility_id: facilities[0]?.id || '', plate_number: '', amount: 0, payment_method: 'mobile', payment_status: 'completed', duration_hours: 1, phone_number: '', transaction_ref: `TXN-${Date.now()}`, notes: '' });
    setEditing(false); setShowModal(true);
  };

  const handleEdit = () => {
    setForm({ facility_id: selected.facility_id, plate_number: selected.plate_number, amount: selected.amount, payment_method: selected.payment_method, payment_status: selected.payment_status, duration_hours: selected.duration_hours, phone_number: selected.phone_number || '', transaction_ref: selected.transaction_ref || '', notes: selected.notes || '' });
    setEditing(true); setShowModal(true);
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this payment?')) return;
    try { await paymentsAPI.delete(selected.id); setToast({ msg: 'Payment deleted', type: 'success' }); setSelected(null); load(); }
    catch (err) { setToast({ msg: 'Delete failed', type: 'error' }); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) { await paymentsAPI.update(selected.id, form); setToast({ msg: 'Payment updated', type: 'success' }); }
      else { await paymentsAPI.create(form); setToast({ msg: 'Payment created', type: 'success' }); }
      setShowModal(false); setSelected(null); load();
    } catch (err) { setToast({ msg: 'Save failed', type: 'error' }); }
  };

  const runAI = async (facilityId) => {
    setAiLoading(true); setAiResult(null);
    try { const res = await aiAPI.analyzePayments({ facility_id: facilityId || selected?.facility_id || facilities[0]?.id }); setAiResult(res.data); }
    catch (err) { setAiResult({ error: err.message }); }
    finally { setAiLoading(false); }
  };

  const getStatusBadge = (status) => {
    const map = { completed: 'badge-completed', pending: 'badge-pending', failed: 'badge-failed', refunded: 'badge-disputed' };
    return map[status] || 'badge-pending';
  };

  const getMethodIcon = (method) => {
    const map = { mobile: '📱', credit_card: '💳', cash: '💵', debit_card: '💳', digital_wallet: '📲' };
    return map[method] || '💳';
  };

  return (
    <div>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      <div className="page-header">
        <div><h1>📱 Mobile Payments</h1><p>Payment processing, tracking, and analytics</p></div>
        <div className="header-actions">
          <button className="btn btn-ai" onClick={() => runAI()}>🤖 AI Analyze</button>
          <button className="btn btn-primary" onClick={handleNew}>+ New Payment</button>
        </div>
      </div>

      <AIResponse data={aiResult} loading={aiLoading} />

      {selected && (
        <div className="detail-panel" style={{ marginTop: 20 }}>
          <h2>{getMethodIcon(selected.payment_method)} Payment #{selected.id}</h2>
          <div className="detail-grid">
            <div className="detail-item"><label>Facility</label><div className="value">{selected.facility_name}</div></div>
            <div className="detail-item"><label>Plate</label><div className="value" style={{ fontFamily: 'monospace' }}>{selected.plate_number}</div></div>
            <div className="detail-item"><label>Amount</label><div className="value" style={{ color: '#10b981', fontSize: 22 }}>${Number(selected.amount).toFixed(2)}</div></div>
            <div className="detail-item"><label>Method</label><div className="value">{getMethodIcon(selected.payment_method)} {selected.payment_method.replace(/_/g, ' ')}</div></div>
            <div className="detail-item"><label>Status</label><div className="value"><span className={`badge ${getStatusBadge(selected.payment_status)}`}>{selected.payment_status}</span></div></div>
            <div className="detail-item"><label>Duration</label><div className="value">{selected.duration_hours}h</div></div>
            <div className="detail-item"><label>Phone</label><div className="value">{selected.phone_number || '-'}</div></div>
            <div className="detail-item"><label>Transaction Ref</label><div className="value" style={{ fontFamily: 'monospace', fontSize: 12 }}>{selected.transaction_ref}</div></div>
            <div className="detail-item"><label>Notes</label><div className="value">{selected.notes || '-'}</div></div>
            <div className="detail-item"><label>Time</label><div className="value">{new Date(selected.payment_time).toLocaleString()}</div></div>
          </div>
          <div className="detail-actions">
            <button className="btn btn-primary btn-sm" onClick={handleEdit}>Edit</button>
            <button className="btn btn-danger btn-sm" onClick={handleDelete}>Delete</button>
            <button className="btn btn-ai btn-sm" onClick={() => runAI(selected.facility_id)}>🤖 AI Analyze</button>
            <button className="btn btn-secondary btn-sm" onClick={() => setSelected(null)}>Close</button>
          </div>
        </div>
      )}

      <div className="data-table-container" style={{ marginTop: 20 }}>
        <table className="data-table">
          <thead><tr><th>ID</th><th>Facility</th><th>Plate</th><th>Amount</th><th>Method</th><th>Status</th><th>Duration</th><th>Ref</th><th>Time</th></tr></thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} onClick={() => handleRowClick(item)} style={{ background: selected?.id === item.id ? 'rgba(59,130,246,0.1)' : '' }}>
                <td>#{item.id}</td>
                <td>{item.facility_name}</td>
                <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{item.plate_number}</td>
                <td style={{ color: '#10b981', fontWeight: 700 }}>${Number(item.amount).toFixed(2)}</td>
                <td>{getMethodIcon(item.payment_method)} {item.payment_method.replace(/_/g, ' ')}</td>
                <td><span className={`badge ${getStatusBadge(item.payment_status)}`}>{item.payment_status}</span></td>
                <td>{item.duration_hours}h</td>
                <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{item.transaction_ref}</td>
                <td>{new Date(item.payment_time).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <Modal title={editing ? 'Edit Payment' : 'New Payment'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit}>
            <div className="form-group"><label>Facility</label>
              <select value={form.facility_id} onChange={(e) => setForm({ ...form, facility_id: parseInt(e.target.value) })} required>
                <option value="">Select...</option>
                {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Plate Number</label><input value={form.plate_number} onChange={(e) => setForm({ ...form, plate_number: e.target.value.toUpperCase() })} required /></div>
            <div className="form-group"><label>Amount ($)</label><input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) })} required /></div>
            <div className="form-group"><label>Payment Method</label>
              <select value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })}>
                <option value="mobile">Mobile</option><option value="credit_card">Credit Card</option><option value="cash">Cash</option><option value="debit_card">Debit Card</option><option value="digital_wallet">Digital Wallet</option>
              </select>
            </div>
            <div className="form-group"><label>Status</label>
              <select value={form.payment_status} onChange={(e) => setForm({ ...form, payment_status: e.target.value })}>
                <option value="completed">Completed</option><option value="pending">Pending</option><option value="failed">Failed</option><option value="refunded">Refunded</option>
              </select>
            </div>
            <div className="form-group"><label>Duration (hours)</label><input type="number" step="0.5" value={form.duration_hours} onChange={(e) => setForm({ ...form, duration_hours: parseFloat(e.target.value) })} /></div>
            <div className="form-group"><label>Phone Number</label><input value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} placeholder="555-0000" /></div>
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

export default Payments;
