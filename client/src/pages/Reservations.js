import React, { useState, useEffect, useCallback } from 'react';
import { reservationsAPI, facilitiesAPI, aiAPI } from '../services/api';
import Modal from '../components/Modal';
import Toast from '../components/Toast';
import AIResponse from '../components/AIResponse';

function Reservations() {
  const [items, setItems] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(false);
  const [toast, setToast] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [form, setForm] = useState({ facility_id: '', customer_name: '', customer_email: '', customer_phone: '', plate_number: '', spot_number: '', start_time: '', end_time: '', status: 'confirmed', total_amount: 0, payment_method: 'credit_card', notes: '' });

  const load = useCallback(async () => {
    try {
      const [res, fac] = await Promise.all([reservationsAPI.getAll(), facilitiesAPI.getAll()]);
      setItems(res.data);
      setFacilities(fac.data);
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRowClick = (item) => setSelected(selected?.id === item.id ? null : item);

  const handleNew = () => {
    setForm({ facility_id: facilities[0]?.id || '', customer_name: '', customer_email: '', customer_phone: '', plate_number: '', spot_number: '', start_time: '', end_time: '', status: 'confirmed', total_amount: 0, payment_method: 'credit_card', notes: '' });
    setEditing(false); setShowModal(true);
  };

  const handleEdit = () => {
    setForm({ facility_id: selected.facility_id, customer_name: selected.customer_name || '', customer_email: selected.customer_email || '', customer_phone: selected.customer_phone || '', plate_number: selected.plate_number, spot_number: selected.spot_number || '', start_time: selected.start_time ? selected.start_time.slice(0, 16) : '', end_time: selected.end_time ? selected.end_time.slice(0, 16) : '', status: selected.status, total_amount: selected.total_amount || 0, payment_method: selected.payment_method || 'credit_card', notes: selected.notes || '' });
    setEditing(true); setShowModal(true);
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this reservation?')) return;
    try { await reservationsAPI.delete(selected.id); setToast({ msg: 'Reservation deleted', type: 'success' }); setSelected(null); load(); }
    catch (err) { setToast({ msg: 'Delete failed', type: 'error' }); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) { await reservationsAPI.update(selected.id, form); setToast({ msg: 'Reservation updated', type: 'success' }); }
      else { await reservationsAPI.create(form); setToast({ msg: 'Reservation created', type: 'success' }); }
      setShowModal(false); setSelected(null); load();
    } catch (err) { setToast({ msg: 'Save failed', type: 'error' }); }
  };

  const runAI = async (facilityId) => {
    setAiLoading(true); setAiResult(null);
    try { const res = await aiAPI.forecastReservations({ facility_id: facilityId || selected?.facility_id || facilities[0]?.id }); setAiResult(res.data); }
    catch (err) { setAiResult({ error: err.message }); }
    finally { setAiLoading(false); }
  };

  const getStatusBadge = (status) => {
    const map = { confirmed: 'badge-active', active: 'badge-pending', completed: 'badge-completed', cancelled: 'badge-issued', no_show: 'badge-failed' };
    return map[status] || 'badge-pending';
  };

  return (
    <div>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      <div className="page-header">
        <div><h1>{'\ud83d\udcc5'} Reservations</h1><p>Parking reservation management and forecasting</p></div>
        <div className="header-actions">
          <button className="btn btn-ai" onClick={() => runAI()}>{'\ud83e\udd16'} AI Forecast</button>
          <button className="btn btn-primary" onClick={handleNew}>+ New Reservation</button>
        </div>
      </div>

      <AIResponse data={aiResult} loading={aiLoading} />

      {selected && (
        <div className="detail-panel" style={{ marginTop: 20 }}>
          <h2>Reservation #{selected.id}</h2>
          <div className="detail-grid">
            <div className="detail-item"><label>Customer</label><div className="value">{selected.customer_name}</div></div>
            <div className="detail-item"><label>Email</label><div className="value">{selected.customer_email || '-'}</div></div>
            <div className="detail-item"><label>Phone</label><div className="value">{selected.customer_phone || '-'}</div></div>
            <div className="detail-item"><label>Facility</label><div className="value">{selected.facility_name}</div></div>
            <div className="detail-item"><label>Plate</label><div className="value" style={{ fontFamily: 'monospace' }}>{selected.plate_number}</div></div>
            <div className="detail-item"><label>Spot</label><div className="value">{selected.spot_number || '-'}</div></div>
            <div className="detail-item"><label>Start</label><div className="value">{selected.start_time ? new Date(selected.start_time).toLocaleString() : '-'}</div></div>
            <div className="detail-item"><label>End</label><div className="value">{selected.end_time ? new Date(selected.end_time).toLocaleString() : '-'}</div></div>
            <div className="detail-item"><label>Status</label><div className="value"><span className={`badge ${getStatusBadge(selected.status)}`}>{selected.status}</span></div></div>
            <div className="detail-item"><label>Amount</label><div className="value" style={{ color: '#10b981', fontSize: 22 }}>${Number(selected.total_amount).toFixed(2)}</div></div>
            <div className="detail-item"><label>Payment Method</label><div className="value">{(selected.payment_method || '').replace(/_/g, ' ')}</div></div>
            <div className="detail-item"><label>Notes</label><div className="value">{selected.notes || '-'}</div></div>
          </div>
          <div className="detail-actions">
            <button className="btn btn-primary btn-sm" onClick={handleEdit}>Edit</button>
            <button className="btn btn-danger btn-sm" onClick={handleDelete}>Delete</button>
            <button className="btn btn-ai btn-sm" onClick={() => runAI(selected.facility_id)}>{'\ud83e\udd16'} AI Forecast</button>
            <button className="btn btn-secondary btn-sm" onClick={() => setSelected(null)}>Close</button>
          </div>
        </div>
      )}

      <div className="data-table-container" style={{ marginTop: 20 }}>
        <table className="data-table">
          <thead><tr><th>Customer</th><th>Facility</th><th>Plate</th><th>Spot</th><th>Start</th><th>End</th><th>Status</th><th>Amount</th></tr></thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} onClick={() => handleRowClick(item)} style={{ background: selected?.id === item.id ? 'rgba(59,130,246,0.1)' : '' }}>
                <td>{item.customer_name}</td>
                <td>{item.facility_name}</td>
                <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{item.plate_number}</td>
                <td>{item.spot_number || '-'}</td>
                <td>{item.start_time ? new Date(item.start_time).toLocaleString() : '-'}</td>
                <td>{item.end_time ? new Date(item.end_time).toLocaleString() : '-'}</td>
                <td><span className={`badge ${getStatusBadge(item.status)}`}>{item.status}</span></td>
                <td style={{ color: '#10b981', fontWeight: 700 }}>${Number(item.total_amount).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <Modal title={editing ? 'Edit Reservation' : 'New Reservation'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit}>
            <div className="form-group"><label>Facility</label>
              <select value={form.facility_id} onChange={(e) => setForm({ ...form, facility_id: parseInt(e.target.value) })} required>
                <option value="">Select...</option>
                {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Customer Name</label><input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} required /></div>
            <div className="form-group"><label>Customer Email</label><input type="email" value={form.customer_email} onChange={(e) => setForm({ ...form, customer_email: e.target.value })} /></div>
            <div className="form-group"><label>Customer Phone</label><input value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} placeholder="555-0000" /></div>
            <div className="form-group"><label>Plate Number</label><input value={form.plate_number} onChange={(e) => setForm({ ...form, plate_number: e.target.value.toUpperCase() })} required /></div>
            <div className="form-group"><label>Spot Number</label><input value={form.spot_number} onChange={(e) => setForm({ ...form, spot_number: e.target.value })} /></div>
            <div className="form-group"><label>Start Time</label><input type="datetime-local" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} required /></div>
            <div className="form-group"><label>End Time</label><input type="datetime-local" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} required /></div>
            <div className="form-group"><label>Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="confirmed">Confirmed</option><option value="active">Active</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option><option value="no_show">No Show</option>
              </select>
            </div>
            <div className="form-group"><label>Total Amount ($)</label><input type="number" step="0.01" value={form.total_amount} onChange={(e) => setForm({ ...form, total_amount: parseFloat(e.target.value) })} required /></div>
            <div className="form-group"><label>Payment Method</label>
              <select value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })}>
                <option value="credit_card">Credit Card</option><option value="mobile">Mobile</option><option value="cash">Cash</option>
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

export default Reservations;
