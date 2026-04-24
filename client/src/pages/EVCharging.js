import React, { useState, useEffect, useCallback } from 'react';
import { evChargingAPI, facilitiesAPI, aiAPI } from '../services/api';
import Modal from '../components/Modal';
import Toast from '../components/Toast';
import AIResponse from '../components/AIResponse';

function EVCharging() {
  const [items, setItems] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(false);
  const [toast, setToast] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [form, setForm] = useState({ facility_id: '', station_name: '', connector_type: 'Type2', power_kw: 50, status: 'available', current_vehicle_plate: '', energy_delivered_kwh: 0, rate_per_kwh: 0.25, notes: '' });

  const load = useCallback(async () => {
    try {
      const [ev, fac] = await Promise.all([evChargingAPI.getAll(), facilitiesAPI.getAll()]);
      setItems(ev.data);
      setFacilities(fac.data);
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRowClick = (item) => setSelected(selected?.id === item.id ? null : item);

  const handleNew = () => {
    setForm({ facility_id: facilities[0]?.id || '', station_name: '', connector_type: 'Type2', power_kw: 50, status: 'available', current_vehicle_plate: '', energy_delivered_kwh: 0, rate_per_kwh: 0.25, notes: '' });
    setEditing(false); setShowModal(true);
  };

  const handleEdit = () => {
    setForm({ facility_id: selected.facility_id, station_name: selected.station_name, connector_type: selected.connector_type, power_kw: selected.power_kw, status: selected.status, current_vehicle_plate: selected.current_vehicle_plate || '', energy_delivered_kwh: selected.energy_delivered_kwh || 0, rate_per_kwh: selected.rate_per_kwh || 0, notes: selected.notes || '' });
    setEditing(true); setShowModal(true);
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this charging station?')) return;
    try { await evChargingAPI.delete(selected.id); setToast({ msg: 'Station deleted', type: 'success' }); setSelected(null); load(); }
    catch (err) { setToast({ msg: 'Delete failed', type: 'error' }); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) { await evChargingAPI.update(selected.id, form); setToast({ msg: 'Station updated', type: 'success' }); }
      else { await evChargingAPI.create(form); setToast({ msg: 'Station created', type: 'success' }); }
      setShowModal(false); setSelected(null); load();
    } catch (err) { setToast({ msg: 'Save failed', type: 'error' }); }
  };

  const runAI = async (facilityId) => {
    setAiLoading(true); setAiResult(null);
    try { const res = await aiAPI.optimizeEV({ facility_id: facilityId || selected?.facility_id || facilities[0]?.id }); setAiResult(res.data); }
    catch (err) { setAiResult({ error: err.message }); }
    finally { setAiLoading(false); }
  };

  const getStatusBadge = (status) => {
    const map = { available: 'badge-active', in_use: 'badge-pending', out_of_service: 'badge-issued', reserved: 'badge-disputed' };
    return map[status] || 'badge-pending';
  };

  return (
    <div>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      <div className="page-header">
        <div><h1>⚡ EV Charging</h1><p>Electric vehicle charging station management and optimization</p></div>
        <div className="header-actions">
          <button className="btn btn-ai" onClick={() => runAI()}>🤖 AI Optimize</button>
          <button className="btn btn-primary" onClick={handleNew}>+ New Station</button>
        </div>
      </div>

      <AIResponse data={aiResult} loading={aiLoading} />

      {selected && (
        <div className="detail-panel" style={{ marginTop: 20 }}>
          <h2>⚡ {selected.station_name}</h2>
          <div className="detail-grid">
            <div className="detail-item"><label>Facility</label><div className="value">{selected.facility_name}</div></div>
            <div className="detail-item"><label>Station Name</label><div className="value">{selected.station_name}</div></div>
            <div className="detail-item"><label>Connector Type</label><div className="value">{selected.connector_type}</div></div>
            <div className="detail-item"><label>Power (kW)</label><div className="value" style={{ fontSize: 22, fontWeight: 700 }}>{selected.power_kw} kW</div></div>
            <div className="detail-item"><label>Status</label><div className="value"><span className={`badge ${getStatusBadge(selected.status)}`}>{selected.status?.replace(/_/g, ' ')}</span></div></div>
            <div className="detail-item"><label>Vehicle</label><div className="value" style={{ fontFamily: 'monospace', fontWeight: 600 }}>{selected.current_vehicle_plate || '-'}</div></div>
            <div className="detail-item"><label>Energy Delivered</label><div className="value" style={{ color: '#10b981', fontSize: 22 }}>{Number(selected.energy_delivered_kwh || 0).toFixed(2)} kWh</div></div>
            <div className="detail-item"><label>Rate / kWh</label><div className="value">${Number(selected.rate_per_kwh || 0).toFixed(2)}</div></div>
            <div className="detail-item"><label>Notes</label><div className="value">{selected.notes || '-'}</div></div>
          </div>
          <div className="detail-actions">
            <button className="btn btn-primary btn-sm" onClick={handleEdit}>Edit</button>
            <button className="btn btn-danger btn-sm" onClick={handleDelete}>Delete</button>
            <button className="btn btn-ai btn-sm" onClick={() => runAI(selected.facility_id)}>🤖 AI Optimize</button>
            <button className="btn btn-secondary btn-sm" onClick={() => setSelected(null)}>Close</button>
          </div>
        </div>
      )}

      <div className="data-table-container" style={{ marginTop: 20 }}>
        <table className="data-table">
          <thead><tr><th>Station</th><th>Facility</th><th>Connector</th><th>Power (kW)</th><th>Status</th><th>Vehicle</th><th>Energy (kWh)</th><th>Rate/kWh</th></tr></thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} onClick={() => handleRowClick(item)} style={{ background: selected?.id === item.id ? 'rgba(59,130,246,0.1)' : '' }}>
                <td style={{ fontWeight: 600 }}>{item.station_name}</td>
                <td>{item.facility_name}</td>
                <td>{item.connector_type}</td>
                <td style={{ fontWeight: 700 }}>{item.power_kw}</td>
                <td><span className={`badge ${getStatusBadge(item.status)}`}>{item.status?.replace(/_/g, ' ')}</span></td>
                <td style={{ fontFamily: 'monospace' }}>{item.current_vehicle_plate || '-'}</td>
                <td style={{ color: '#10b981' }}>{Number(item.energy_delivered_kwh || 0).toFixed(2)}</td>
                <td>${Number(item.rate_per_kwh || 0).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <Modal title={editing ? 'Edit Station' : 'New Station'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit}>
            <div className="form-group"><label>Facility</label>
              <select value={form.facility_id} onChange={(e) => setForm({ ...form, facility_id: parseInt(e.target.value) })} required>
                <option value="">Select...</option>
                {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Station Name</label><input value={form.station_name} onChange={(e) => setForm({ ...form, station_name: e.target.value })} required /></div>
            <div className="form-group"><label>Connector Type</label>
              <select value={form.connector_type} onChange={(e) => setForm({ ...form, connector_type: e.target.value })}>
                <option value="Type1">Type1</option><option value="Type2">Type2</option><option value="CCS">CCS</option><option value="CHAdeMO">CHAdeMO</option><option value="Tesla">Tesla</option>
              </select>
            </div>
            <div className="form-group"><label>Power (kW)</label><input type="number" step="0.1" value={form.power_kw} onChange={(e) => setForm({ ...form, power_kw: parseFloat(e.target.value) })} required /></div>
            <div className="form-group"><label>Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="available">Available</option><option value="in_use">In Use</option><option value="out_of_service">Out of Service</option><option value="reserved">Reserved</option>
              </select>
            </div>
            <div className="form-group"><label>Current Vehicle Plate</label><input value={form.current_vehicle_plate} onChange={(e) => setForm({ ...form, current_vehicle_plate: e.target.value.toUpperCase() })} placeholder="ABC-1234" /></div>
            <div className="form-group"><label>Energy Delivered (kWh)</label><input type="number" step="0.01" value={form.energy_delivered_kwh} onChange={(e) => setForm({ ...form, energy_delivered_kwh: parseFloat(e.target.value) })} /></div>
            <div className="form-group"><label>Rate per kWh ($)</label><input type="number" step="0.01" value={form.rate_per_kwh} onChange={(e) => setForm({ ...form, rate_per_kwh: parseFloat(e.target.value) })} required /></div>
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

export default EVCharging;
