import React, { useState, useEffect, useCallback } from 'react';
import { securityAPI, facilitiesAPI, aiAPI } from '../services/api';
import Modal from '../components/Modal';
import Toast from '../components/Toast';
import AIResponse from '../components/AIResponse';

function Security() {
  const [items, setItems] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(false);
  const [toast, setToast] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [form, setForm] = useState({ facility_id: '', camera_name: '', camera_type: 'fixed', location_zone: '', stream_url: '', status: 'active', resolution: '1080p', recording_enabled: true, motion_detected: false, notes: '' });

  const load = useCallback(async () => {
    try {
      const [sec, fac] = await Promise.all([securityAPI.getAll(), facilitiesAPI.getAll()]);
      setItems(sec.data);
      setFacilities(fac.data);
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRowClick = (item) => setSelected(selected?.id === item.id ? null : item);

  const handleNew = () => {
    setForm({ facility_id: facilities[0]?.id || '', camera_name: '', camera_type: 'fixed', location_zone: '', stream_url: '', status: 'active', resolution: '1080p', recording_enabled: true, motion_detected: false, notes: '' });
    setEditing(false); setShowModal(true);
  };

  const handleEdit = () => {
    setForm({ facility_id: selected.facility_id, camera_name: selected.camera_name, camera_type: selected.camera_type, location_zone: selected.location_zone, stream_url: selected.stream_url, status: selected.status, resolution: selected.resolution, recording_enabled: selected.recording_enabled, motion_detected: selected.motion_detected, notes: selected.notes || '' });
    setEditing(true); setShowModal(true);
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this camera?')) return;
    try { await securityAPI.delete(selected.id); setToast({ msg: 'Camera deleted', type: 'success' }); setSelected(null); load(); }
    catch (err) { setToast({ msg: 'Delete failed', type: 'error' }); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) { await securityAPI.update(selected.id, form); setToast({ msg: 'Camera updated', type: 'success' }); }
      else { await securityAPI.create(form); setToast({ msg: 'Camera created', type: 'success' }); }
      setShowModal(false); setSelected(null); load();
    } catch (err) { setToast({ msg: 'Save failed', type: 'error' }); }
  };

  const runAI = async () => {
    setAiLoading(true); setAiResult(null);
    try { const res = await aiAPI.analyzeSecurity({ facility_id: selected?.facility_id || items[0]?.facility_id }); setAiResult(res.data); }
    catch (err) { setAiResult({ error: err.message }); }
    finally { setAiLoading(false); }
  };

  const statusBadge = (status) => {
    const map = { active: 'badge-active', inactive: 'badge-issued', maintenance: 'badge-pending' };
    return <span className={`badge ${map[status] || ''}`}>{status}</span>;
  };

  const boolIcon = (val) => val ? <span style={{ color: '#22c55e', fontWeight: 700 }}>&#10003;</span> : <span style={{ color: '#ef4444', fontWeight: 700 }}>&#10007;</span>;

  return (
    <div>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      <div className="page-header">
        <div><h1>{'\uD83D\uDCF9'} Security Cameras</h1><p>Monitor and manage security camera infrastructure</p></div>
        <div className="header-actions">
          <button className="btn btn-ai" onClick={runAI} disabled={!selected && items.length === 0}>{'\uD83E\uDD16'} AI Analyze</button>
          <button className="btn btn-primary" onClick={handleNew}>+ New Camera</button>
        </div>
      </div>

      <AIResponse data={aiResult} loading={aiLoading} />

      {selected && (
        <div className="detail-panel" style={{ marginTop: 20 }}>
          <h2>Camera: {selected.camera_name}</h2>
          <div className="detail-grid">
            <div className="detail-item"><label>Facility</label><div className="value">{selected.facility_name}</div></div>
            <div className="detail-item"><label>Camera Name</label><div className="value">{selected.camera_name}</div></div>
            <div className="detail-item"><label>Camera Type</label><div className="value">{selected.camera_type}</div></div>
            <div className="detail-item"><label>Zone</label><div className="value">{selected.location_zone}</div></div>
            <div className="detail-item"><label>Stream URL</label><div className="value" style={{ fontFamily: 'monospace', fontSize: 13 }}>{selected.stream_url || '-'}</div></div>
            <div className="detail-item"><label>Status</label><div className="value">{statusBadge(selected.status)}</div></div>
            <div className="detail-item"><label>Resolution</label><div className="value">{selected.resolution}</div></div>
            <div className="detail-item"><label>Recording</label><div className="value">{boolIcon(selected.recording_enabled)}</div></div>
            <div className="detail-item"><label>Motion Detected</label><div className="value">{boolIcon(selected.motion_detected)}</div></div>
            <div className="detail-item"><label>Notes</label><div className="value">{selected.notes || '-'}</div></div>
          </div>
          <div className="detail-actions">
            <button className="btn btn-primary btn-sm" onClick={handleEdit}>Edit</button>
            <button className="btn btn-danger btn-sm" onClick={handleDelete}>Delete</button>
            <button className="btn btn-ai btn-sm" onClick={runAI}>{'\uD83E\uDD16'} AI Analyze</button>
            <button className="btn btn-secondary btn-sm" onClick={() => setSelected(null)}>Close</button>
          </div>
        </div>
      )}

      <div className="data-table-container" style={{ marginTop: 20 }}>
        <table className="data-table">
          <thead><tr><th>Camera</th><th>Facility</th><th>Type</th><th>Zone</th><th>Status</th><th>Resolution</th><th>Recording</th><th>Motion</th></tr></thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} onClick={() => handleRowClick(item)} style={{ background: selected?.id === item.id ? 'rgba(59,130,246,0.1)' : '' }}>
                <td style={{ fontWeight: 700 }}>{item.camera_name}</td>
                <td>{item.facility_name}</td>
                <td>{item.camera_type}</td>
                <td>{item.location_zone}</td>
                <td>{statusBadge(item.status)}</td>
                <td>{item.resolution}</td>
                <td>{boolIcon(item.recording_enabled)}</td>
                <td>{boolIcon(item.motion_detected)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <Modal title={editing ? 'Edit Camera' : 'New Camera'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit}>
            <div className="form-group"><label>Facility</label>
              <select value={form.facility_id} onChange={(e) => setForm({ ...form, facility_id: parseInt(e.target.value) })} required>
                <option value="">Select...</option>
                {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Camera Name</label><input value={form.camera_name} onChange={(e) => setForm({ ...form, camera_name: e.target.value })} placeholder="Camera name" required /></div>
            <div className="form-group"><label>Camera Type</label>
              <select value={form.camera_type} onChange={(e) => setForm({ ...form, camera_type: e.target.value })}>
                <option value="fixed">Fixed</option><option value="ptz">PTZ</option><option value="lpr">LPR</option><option value="thermal">Thermal</option>
              </select>
            </div>
            <div className="form-group"><label>Location Zone</label><input value={form.location_zone} onChange={(e) => setForm({ ...form, location_zone: e.target.value })} placeholder="e.g. Entrance A" /></div>
            <div className="form-group"><label>Stream URL</label><input value={form.stream_url} onChange={(e) => setForm({ ...form, stream_url: e.target.value })} placeholder="rtsp://..." /></div>
            <div className="form-group"><label>Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="active">Active</option><option value="inactive">Inactive</option><option value="maintenance">Maintenance</option>
              </select>
            </div>
            <div className="form-group"><label>Resolution</label>
              <select value={form.resolution} onChange={(e) => setForm({ ...form, resolution: e.target.value })}>
                <option value="720p">720p</option><option value="1080p">1080p</option><option value="4K">4K</option>
              </select>
            </div>
            <div className="form-group"><label>Recording Enabled</label>
              <select value={form.recording_enabled.toString()} onChange={(e) => setForm({ ...form, recording_enabled: e.target.value === 'true' })}>
                <option value="true">Yes</option><option value="false">No</option>
              </select>
            </div>
            <div className="form-group"><label>Motion Detected</label>
              <select value={form.motion_detected.toString()} onChange={(e) => setForm({ ...form, motion_detected: e.target.value === 'true' })}>
                <option value="true">Yes</option><option value="false">No</option>
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

export default Security;
