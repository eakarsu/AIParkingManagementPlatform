import React, { useState, useEffect, useCallback } from 'react';
import { sensorsAPI, facilitiesAPI, aiAPI } from '../services/api';
import Modal from '../components/Modal';
import Toast from '../components/Toast';
import AIResponse from '../components/AIResponse';

function Sensors() {
  const [items, setItems] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(false);
  const [toast, setToast] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [form, setForm] = useState({ facility_id: '', sensor_name: '', sensor_type: 'occupancy', location_zone: '', status: 'online', battery_level: 100 });

  const load = useCallback(async () => {
    try {
      const [sen, fac] = await Promise.all([sensorsAPI.getAll(), facilitiesAPI.getAll()]);
      setItems(sen.data);
      setFacilities(fac.data);
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRowClick = (item) => setSelected(selected?.id === item.id ? null : item);

  const handleNew = () => {
    setForm({ facility_id: facilities[0]?.id || '', sensor_name: '', sensor_type: 'occupancy', location_zone: '', status: 'online', battery_level: 100 });
    setEditing(false); setShowModal(true);
  };

  const handleEdit = () => {
    setForm({ facility_id: selected.facility_id, sensor_name: selected.sensor_name, sensor_type: selected.sensor_type, location_zone: selected.location_zone || '', status: selected.status, battery_level: selected.battery_level });
    setEditing(true); setShowModal(true);
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this sensor?')) return;
    try { await sensorsAPI.delete(selected.id); setToast({ msg: 'Sensor deleted', type: 'success' }); setSelected(null); load(); }
    catch (err) { setToast({ msg: 'Delete failed', type: 'error' }); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) { await sensorsAPI.update(selected.id, form); setToast({ msg: 'Sensor updated', type: 'success' }); }
      else { await sensorsAPI.create(form); setToast({ msg: 'Sensor created', type: 'success' }); }
      setShowModal(false); setSelected(null); load();
    } catch (err) { setToast({ msg: 'Save failed', type: 'error' }); }
  };

  const runAI = async (facilityId) => {
    setAiLoading(true); setAiResult(null);
    try {
      const res = await aiAPI.diagnoseSensors({ facility_id: facilityId || facilities[0]?.id });
      setAiResult(res.data);
    } catch (err) { setAiResult({ error: err.message }); }
    finally { setAiLoading(false); }
  };

  const getBatteryColor = (level) => {
    if (level > 70) return '#10b981';
    if (level > 30) return '#f59e0b';
    return '#ef4444';
  };

  const getStatusBadge = (status) => {
    if (status === 'online') return 'badge-active';
    if (status === 'offline') return 'badge-issued';
    return 'badge-pending';
  };

  return (
    <div>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      <div className="page-header">
        <div><h1>{'\uD83D\uDD0C'} IoT Sensors</h1><p>IoT sensor management and diagnostics</p></div>
        <div className="header-actions">
          <button className="btn btn-ai" onClick={() => runAI(selected?.facility_id)}>{'\uD83E\uDD16'} AI Diagnose</button>
          <button className="btn btn-primary" onClick={handleNew}>+ New Sensor</button>
        </div>
      </div>

      <AIResponse data={aiResult} loading={aiLoading} />

      {selected && (
        <div className="detail-panel" style={{ marginTop: 20 }}>
          <h2>Sensor #{selected.id}</h2>
          <div className="detail-grid">
            <div className="detail-item"><label>Name</label><div className="value">{selected.sensor_name}</div></div>
            <div className="detail-item"><label>Facility</label><div className="value">{selected.facility_name}</div></div>
            <div className="detail-item"><label>Type</label><div className="value">{selected.sensor_type}</div></div>
            <div className="detail-item"><label>Zone</label><div className="value">{selected.location_zone || '-'}</div></div>
            <div className="detail-item"><label>Status</label><div className="value"><span className={`badge ${getStatusBadge(selected.status)}`}>{selected.status}</span></div></div>
            <div className="detail-item"><label>Battery</label><div className="value" style={{ color: getBatteryColor(selected.battery_level), fontWeight: 600 }}>{selected.battery_level}%</div></div>
            <div className="detail-item"><label>Last Ping</label><div className="value">{selected.last_ping ? new Date(selected.last_ping).toLocaleString() : '-'}</div></div>
          </div>
          <div className="detail-actions">
            <button className="btn btn-primary btn-sm" onClick={handleEdit}>Edit</button>
            <button className="btn btn-danger btn-sm" onClick={handleDelete}>Delete</button>
            <button className="btn btn-ai btn-sm" onClick={() => runAI(selected.facility_id)}>{'\uD83E\uDD16'} AI Diagnose</button>
            <button className="btn btn-secondary btn-sm" onClick={() => setSelected(null)}>Close</button>
          </div>
        </div>
      )}

      <div className="data-table-container" style={{ marginTop: 20 }}>
        <table className="data-table">
          <thead><tr><th>Name</th><th>Facility</th><th>Type</th><th>Zone</th><th>Status</th><th>Battery</th><th>Last Ping</th></tr></thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} onClick={() => handleRowClick(item)} style={{ background: selected?.id === item.id ? 'rgba(59,130,246,0.1)' : '' }}>
                <td style={{ fontWeight: 600 }}>{item.sensor_name}</td>
                <td>{item.facility_name}</td>
                <td>{item.sensor_type}</td>
                <td>{item.location_zone || '-'}</td>
                <td><span className={`badge ${getStatusBadge(item.status)}`}>{item.status}</span></td>
                <td>
                  <span style={{ color: getBatteryColor(item.battery_level), fontWeight: 600 }}>
                    {item.battery_level}%
                  </span>
                </td>
                <td>{item.last_ping ? new Date(item.last_ping).toLocaleString() : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <Modal title={editing ? 'Edit Sensor' : 'New Sensor'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Facility</label>
              <select value={form.facility_id} onChange={(e) => setForm({ ...form, facility_id: parseInt(e.target.value) })} required>
                <option value="">Select...</option>
                {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Sensor Name</label><input type="text" value={form.sensor_name} onChange={(e) => setForm({ ...form, sensor_name: e.target.value })} required /></div>
            <div className="form-group">
              <label>Sensor Type</label>
              <select value={form.sensor_type} onChange={(e) => setForm({ ...form, sensor_type: e.target.value })} required>
                <option value="occupancy">Occupancy</option>
                <option value="entry_exit">Entry/Exit</option>
                <option value="environmental">Environmental</option>
                <option value="traffic">Traffic</option>
              </select>
            </div>
            <div className="form-group"><label>Location Zone</label><input type="text" value={form.location_zone} onChange={(e) => setForm({ ...form, location_zone: e.target.value })} /></div>
            <div className="form-group">
              <label>Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} required>
                <option value="online">Online</option>
                <option value="offline">Offline</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>
            <div className="form-group"><label>Battery Level (%)</label><input type="number" min="0" max="100" value={form.battery_level} onChange={(e) => setForm({ ...form, battery_level: parseInt(e.target.value) })} required /></div>
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

export default Sensors;
