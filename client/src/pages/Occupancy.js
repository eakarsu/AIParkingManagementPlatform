import React, { useState, useEffect, useCallback } from 'react';
import { occupancyAPI, facilitiesAPI, aiAPI } from '../services/api';
import Modal from '../components/Modal';
import Toast from '../components/Toast';
import AIResponse from '../components/AIResponse';

function Occupancy() {
  const [items, setItems] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(false);
  const [toast, setToast] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [form, setForm] = useState({ facility_id: '', occupied_spaces: 0, total_spaces: 500, prediction_confidence: 0, predicted_occupancy: 0, notes: '' });

  const load = useCallback(async () => {
    try {
      const [occ, fac] = await Promise.all([occupancyAPI.getAll(), facilitiesAPI.getAll()]);
      setItems(occ.data);
      setFacilities(fac.data);
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRowClick = (item) => setSelected(selected?.id === item.id ? null : item);

  const handleNew = () => {
    setForm({ facility_id: facilities[0]?.id || '', occupied_spaces: 0, total_spaces: 500, prediction_confidence: 0, predicted_occupancy: 0, notes: '' });
    setEditing(false); setShowModal(true);
  };

  const handleEdit = () => {
    setForm({ facility_id: selected.facility_id, occupied_spaces: selected.occupied_spaces, total_spaces: selected.total_spaces, prediction_confidence: selected.prediction_confidence, predicted_occupancy: selected.predicted_occupancy, notes: selected.notes || '' });
    setEditing(true); setShowModal(true);
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this record?')) return;
    try { await occupancyAPI.delete(selected.id); setToast({ msg: 'Record deleted', type: 'success' }); setSelected(null); load(); }
    catch (err) { setToast({ msg: 'Delete failed', type: 'error' }); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) { await occupancyAPI.update(selected.id, form); setToast({ msg: 'Record updated', type: 'success' }); }
      else { await occupancyAPI.create(form); setToast({ msg: 'Record created', type: 'success' }); }
      setShowModal(false); setSelected(null); load();
    } catch (err) { setToast({ msg: 'Save failed', type: 'error' }); }
  };

  const runAI = async (facilityId) => {
    setAiLoading(true); setAiResult(null);
    try {
      const res = await aiAPI.predictOccupancy({ facility_id: facilityId || facilities[0]?.id });
      setAiResult(res.data);
    } catch (err) { setAiResult({ error: err.message }); }
    finally { setAiLoading(false); }
  };

  const getOccupancyClass = (rate) => {
    if (rate >= 85) return 'occupancy-high';
    if (rate >= 60) return 'occupancy-medium';
    return 'occupancy-low';
  };

  return (
    <div>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      <div className="page-header">
        <div><h1>📈 Occupancy Prediction</h1><p>AI-powered occupancy monitoring and forecasting</p></div>
        <div className="header-actions">
          <button className="btn btn-ai" onClick={() => runAI(selected?.facility_id)}>🤖 AI Predict</button>
          <button className="btn btn-primary" onClick={handleNew}>+ New Record</button>
        </div>
      </div>

      <AIResponse data={aiResult} loading={aiLoading} />

      {selected && (
        <div className="detail-panel" style={{ marginTop: 20 }}>
          <h2>Occupancy Record #{selected.id}</h2>
          <div className="detail-grid">
            <div className="detail-item"><label>Facility</label><div className="value">{selected.facility_name}</div></div>
            <div className="detail-item"><label>Occupied</label><div className="value">{selected.occupied_spaces} / {selected.total_spaces}</div></div>
            <div className="detail-item"><label>Occupancy Rate</label>
              <div className="value">{selected.occupancy_rate}%</div>
              <div className="occupancy-bar"><div className={`fill ${getOccupancyClass(selected.occupancy_rate)}`} style={{ width: `${selected.occupancy_rate}%` }}></div></div>
            </div>
            <div className="detail-item"><label>AI Confidence</label><div className="value">{selected.prediction_confidence}%</div></div>
            <div className="detail-item"><label>Predicted</label><div className="value">{selected.predicted_occupancy}%</div></div>
            <div className="detail-item"><label>Notes</label><div className="value">{selected.notes || '-'}</div></div>
            <div className="detail-item"><label>Recorded</label><div className="value">{new Date(selected.recorded_at).toLocaleString()}</div></div>
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
          <thead><tr><th>Facility</th><th>Occupied</th><th>Rate</th><th>Confidence</th><th>Predicted</th><th>Notes</th><th>Time</th></tr></thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} onClick={() => handleRowClick(item)} style={{ background: selected?.id === item.id ? 'rgba(59,130,246,0.1)' : '' }}>
                <td style={{ fontWeight: 600 }}>{item.facility_name}</td>
                <td>{item.occupied_spaces}/{item.total_spaces}</td>
                <td>
                  <span style={{ color: item.occupancy_rate >= 85 ? '#ef4444' : item.occupancy_rate >= 60 ? '#f59e0b' : '#10b981', fontWeight: 600 }}>
                    {item.occupancy_rate}%
                  </span>
                </td>
                <td>{item.prediction_confidence}%</td>
                <td>{item.predicted_occupancy}%</td>
                <td style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.notes || '-'}</td>
                <td>{new Date(item.recorded_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <Modal title={editing ? 'Edit Occupancy Record' : 'New Occupancy Record'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Facility</label>
              <select value={form.facility_id} onChange={(e) => setForm({ ...form, facility_id: parseInt(e.target.value) })} required>
                <option value="">Select...</option>
                {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Occupied Spaces</label><input type="number" value={form.occupied_spaces} onChange={(e) => setForm({ ...form, occupied_spaces: parseInt(e.target.value) })} required /></div>
            <div className="form-group"><label>Total Spaces</label><input type="number" value={form.total_spaces} onChange={(e) => setForm({ ...form, total_spaces: parseInt(e.target.value) })} required /></div>
            <div className="form-group"><label>AI Confidence (%)</label><input type="number" step="0.1" value={form.prediction_confidence} onChange={(e) => setForm({ ...form, prediction_confidence: parseFloat(e.target.value) })} /></div>
            <div className="form-group"><label>Predicted Occupancy (%)</label><input type="number" step="0.1" value={form.predicted_occupancy} onChange={(e) => setForm({ ...form, predicted_occupancy: parseFloat(e.target.value) })} /></div>
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

export default Occupancy;
