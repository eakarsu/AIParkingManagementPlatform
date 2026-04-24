import React, { useState, useEffect, useCallback } from 'react';
import { platesAPI, facilitiesAPI, aiAPI } from '../services/api';
import Modal from '../components/Modal';
import Toast from '../components/Toast';
import AIResponse from '../components/AIResponse';

function Plates() {
  const [items, setItems] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(false);
  const [toast, setToast] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [form, setForm] = useState({ facility_id: '', plate_number: '', state: 'CA', vehicle_type: 'sedan', entry_exit: 'entry', confidence: 95.0, camera_id: 'CAM-01', notes: '' });

  const load = useCallback(async () => {
    try {
      const [pl, fac] = await Promise.all([platesAPI.getAll(), facilitiesAPI.getAll()]);
      setItems(pl.data);
      setFacilities(fac.data);
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRowClick = (item) => setSelected(selected?.id === item.id ? null : item);

  const handleNew = () => {
    setForm({ facility_id: facilities[0]?.id || '', plate_number: '', state: 'CA', vehicle_type: 'sedan', entry_exit: 'entry', confidence: 95.0, camera_id: 'CAM-01', notes: '' });
    setEditing(false); setShowModal(true);
  };

  const handleEdit = () => {
    setForm({ facility_id: selected.facility_id, plate_number: selected.plate_number, state: selected.state, vehicle_type: selected.vehicle_type, entry_exit: selected.entry_exit, confidence: selected.confidence, camera_id: selected.camera_id, notes: selected.notes || '' });
    setEditing(true); setShowModal(true);
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this plate record?')) return;
    try { await platesAPI.delete(selected.id); setToast({ msg: 'Record deleted', type: 'success' }); setSelected(null); load(); }
    catch (err) { setToast({ msg: 'Delete failed', type: 'error' }); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) { await platesAPI.update(selected.id, form); setToast({ msg: 'Record updated', type: 'success' }); }
      else { await platesAPI.create(form); setToast({ msg: 'Record created', type: 'success' }); }
      setShowModal(false); setSelected(null); load();
    } catch (err) { setToast({ msg: 'Save failed', type: 'error' }); }
  };

  const runAI = async (plateNumber) => {
    setAiLoading(true); setAiResult(null);
    try { const res = await aiAPI.analyzePlate({ plate_number: plateNumber || selected?.plate_number || items[0]?.plate_number }); setAiResult(res.data); }
    catch (err) { setAiResult({ error: err.message }); }
    finally { setAiLoading(false); }
  };

  return (
    <div>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      <div className="page-header">
        <div><h1>🚗 License Plate Recognition</h1><p>AI-powered plate detection and vehicle intelligence</p></div>
        <div className="header-actions">
          <button className="btn btn-ai" onClick={() => runAI()} disabled={!selected && items.length === 0}>🤖 AI Analyze</button>
          <button className="btn btn-primary" onClick={handleNew}>+ New Record</button>
        </div>
      </div>

      <AIResponse data={aiResult} loading={aiLoading} />

      {selected && (
        <div className="detail-panel" style={{ marginTop: 20 }}>
          <h2>Plate: {selected.plate_number}</h2>
          <div className="detail-grid">
            <div className="detail-item"><label>Facility</label><div className="value">{selected.facility_name}</div></div>
            <div className="detail-item"><label>Plate Number</label><div className="value" style={{ fontFamily: 'monospace', fontSize: 20 }}>{selected.plate_number}</div></div>
            <div className="detail-item"><label>State</label><div className="value">{selected.state}</div></div>
            <div className="detail-item"><label>Vehicle Type</label><div className="value">{selected.vehicle_type}</div></div>
            <div className="detail-item"><label>Direction</label><div className="value"><span className={`badge badge-${selected.entry_exit}`}>{selected.entry_exit}</span></div></div>
            <div className="detail-item"><label>Confidence</label><div className="value">{selected.confidence}%</div></div>
            <div className="detail-item"><label>Camera</label><div className="value">{selected.camera_id}</div></div>
            <div className="detail-item"><label>Notes</label><div className="value">{selected.notes || '-'}</div></div>
            <div className="detail-item"><label>Captured</label><div className="value">{new Date(selected.captured_at).toLocaleString()}</div></div>
          </div>
          <div className="detail-actions">
            <button className="btn btn-primary btn-sm" onClick={handleEdit}>Edit</button>
            <button className="btn btn-danger btn-sm" onClick={handleDelete}>Delete</button>
            <button className="btn btn-ai btn-sm" onClick={() => runAI(selected.plate_number)}>🤖 AI Analyze</button>
            <button className="btn btn-secondary btn-sm" onClick={() => setSelected(null)}>Close</button>
          </div>
        </div>
      )}

      <div className="data-table-container" style={{ marginTop: 20 }}>
        <table className="data-table">
          <thead><tr><th>Plate</th><th>Facility</th><th>State</th><th>Vehicle</th><th>Direction</th><th>Confidence</th><th>Camera</th><th>Time</th></tr></thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} onClick={() => handleRowClick(item)} style={{ background: selected?.id === item.id ? 'rgba(59,130,246,0.1)' : '' }}>
                <td style={{ fontWeight: 700, fontFamily: 'monospace' }}>{item.plate_number}</td>
                <td>{item.facility_name}</td>
                <td>{item.state}</td>
                <td>{item.vehicle_type}</td>
                <td><span className={`badge badge-${item.entry_exit}`}>{item.entry_exit}</span></td>
                <td>{item.confidence}%</td>
                <td>{item.camera_id}</td>
                <td>{new Date(item.captured_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <Modal title={editing ? 'Edit Plate Record' : 'New Plate Record'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit}>
            <div className="form-group"><label>Facility</label>
              <select value={form.facility_id} onChange={(e) => setForm({ ...form, facility_id: parseInt(e.target.value) })} required>
                <option value="">Select...</option>
                {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Plate Number</label><input value={form.plate_number} onChange={(e) => setForm({ ...form, plate_number: e.target.value.toUpperCase() })} placeholder="ABC-1234" required /></div>
            <div className="form-group"><label>State</label><input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value.toUpperCase() })} maxLength="2" /></div>
            <div className="form-group"><label>Vehicle Type</label>
              <select value={form.vehicle_type} onChange={(e) => setForm({ ...form, vehicle_type: e.target.value })}>
                <option value="sedan">Sedan</option><option value="suv">SUV</option><option value="truck">Truck</option><option value="compact">Compact</option><option value="minivan">Minivan</option><option value="luxury">Luxury</option><option value="electric">Electric</option>
              </select>
            </div>
            <div className="form-group"><label>Entry/Exit</label>
              <select value={form.entry_exit} onChange={(e) => setForm({ ...form, entry_exit: e.target.value })}>
                <option value="entry">Entry</option><option value="exit">Exit</option>
              </select>
            </div>
            <div className="form-group"><label>Confidence (%)</label><input type="number" step="0.1" value={form.confidence} onChange={(e) => setForm({ ...form, confidence: parseFloat(e.target.value) })} /></div>
            <div className="form-group"><label>Camera ID</label><input value={form.camera_id} onChange={(e) => setForm({ ...form, camera_id: e.target.value })} /></div>
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

export default Plates;
