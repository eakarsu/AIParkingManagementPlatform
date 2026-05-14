import React, { useState, useEffect, useCallback, useRef } from 'react';
import { zonesAPI, facilitiesAPI, aiAPI } from '../services/api';
import Modal from '../components/Modal';
import Toast from '../components/Toast';
import AIResponse from '../components/AIResponse';
import Pagination from '../components/Pagination';

function Zones() {
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
  const [wsOccupancy, setWsOccupancy] = useState(null);
  const [wsStatus, setWsStatus] = useState('disconnected');
  const wsRef = useRef(null);
  const [form, setForm] = useState({ facility_id: '', zone_name: '', zone_code: '', zone_type: 'regular', total_spots: 0, occupied_spots: 0, hourly_rate: 0, is_covered: false, floor_level: '', status: 'active', max_height_ft: 0, notes: '' });

  const load = useCallback(async (p = 1) => {
    try {
      const [zones, fac] = await Promise.all([zonesAPI.getAll({ page: p, limit: 20 }), facilitiesAPI.getAll({ page: 1, limit: 100 })]);
      const zd = zones.data;
      setItems(zd.data || zd);
      if (zd.totalPages) { setTotalPages(zd.totalPages); setTotal(zd.total); setPage(zd.page); }
      const fd = fac.data;
      setFacilities(fd.data || fd);
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => { load(1); }, [load]);

  // WebSocket connection for real-time occupancy
  useEffect(() => {
    const wsUrl = `ws://localhost:3001`;
    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      ws.onopen = () => setWsStatus('connected');
      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data);
          if (msg.type === 'occupancy_update') setWsOccupancy(msg.data);
        } catch {}
      };
      ws.onerror = () => setWsStatus('error');
      ws.onclose = () => setWsStatus('disconnected');
    } catch {}
    return () => { if (wsRef.current) wsRef.current.close(); };
  }, []);

  const handleRowClick = (item) => setSelected(selected?.id === item.id ? null : item);

  const handleNew = () => {
    setForm({ facility_id: facilities[0]?.id || '', zone_name: '', zone_code: '', zone_type: 'regular', total_spots: 0, occupied_spots: 0, hourly_rate: 0, is_covered: false, floor_level: '', status: 'active', max_height_ft: 0, notes: '' });
    setEditing(false); setShowModal(true);
  };

  const handleEdit = () => {
    setForm({ facility_id: selected.facility_id, zone_name: selected.zone_name, zone_code: selected.zone_code, zone_type: selected.zone_type, total_spots: selected.total_spots, occupied_spots: selected.occupied_spots, hourly_rate: selected.hourly_rate, is_covered: selected.is_covered, floor_level: selected.floor_level || '', status: selected.status, max_height_ft: selected.max_height_ft || 0, notes: selected.notes || '' });
    setEditing(true); setShowModal(true);
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this zone?')) return;
    try { await zonesAPI.delete(selected.id); setToast({ msg: 'Zone deleted', type: 'success' }); setSelected(null); load(page); }
    catch (err) { setToast({ msg: 'Delete failed', type: 'error' }); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) { await zonesAPI.update(selected.id, form); setToast({ msg: 'Zone updated', type: 'success' }); }
      else { await zonesAPI.create(form); setToast({ msg: 'Zone created', type: 'success' }); }
      setShowModal(false); setSelected(null); load(page);
    } catch (err) { setToast({ msg: 'Save failed', type: 'error' }); }
  };

  const runAI = async (facilityId) => {
    setAiLoading(true); setAiResult(null);
    try {
      const res = await aiAPI.optimizeZones({ facility_id: facilityId || facilities[0]?.id });
      setAiResult(res.data);
    } catch (err) { setAiResult({ error: err.message }); }
    finally { setAiLoading(false); }
  };

  const getOccupancyRate = (item) => item.total_spots > 0 ? Math.round((item.occupied_spots / item.total_spots) * 100) : 0;

  const getOccupancyClass = (rate) => {
    if (rate >= 85) return 'occupancy-high';
    if (rate >= 60) return 'occupancy-medium';
    return 'occupancy-low';
  };

  const getStatusBadge = (status) => {
    const map = { active: 'badge-active', inactive: 'badge-issued', full: 'badge-pending' };
    return map[status] || 'badge-active';
  };

  const getFacilityName = (id) => facilities.find(f => f.id === id)?.name || '-';

  const getWsOccupancyForFacility = (facilityId) => {
    return wsOccupancy?.find(f => f.id === facilityId);
  };

  return (
    <div>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      <div className="page-header">
        <div>
          <h1>Parking Zones</h1>
          <p>Manage and optimize parking zones across facilities</p>
        </div>
        <div className="header-actions">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
            <span style={{
              width: '8px', height: '8px', borderRadius: '50%',
              background: wsStatus === 'connected' ? '#22c55e' : wsStatus === 'error' ? '#ef4444' : '#888',
              display: 'inline-block'
            }} />
            <span style={{ color: '#888' }}>
              {wsStatus === 'connected' ? 'Live' : wsStatus === 'error' ? 'WS Error' : 'Offline'}
            </span>
          </div>
          <button className="btn btn-ai" onClick={() => runAI(selected?.facility_id)}>AI Optimize</button>
          <button className="btn btn-primary" onClick={handleNew}>+ New Zone</button>
        </div>
      </div>

      {/* Real-time occupancy from WebSocket */}
      {wsOccupancy && (
        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
          {wsOccupancy.map(f => {
            const occ = f.zone_total > 0 ? Math.round((f.occupied_spots / f.zone_total) * 100) : 0;
            return (
              <div key={f.id} style={{ background: 'var(--bg-card, #1a1a2e)', border: '1px solid var(--border, #333)', borderRadius: '8px', padding: '10px 16px', minWidth: '160px' }}>
                <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>{f.name}</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: occ >= 85 ? '#ef4444' : occ >= 60 ? '#f59e0b' : '#22c55e' }}>{occ}%</div>
                <div style={{ fontSize: '11px', color: '#888' }}>{f.occupied_spots}/{f.zone_total} spots</div>
                <div style={{ marginTop: '4px', background: '#333', borderRadius: '2px', height: '4px' }}>
                  <div style={{ width: `${occ}%`, height: '100%', borderRadius: '2px', background: occ >= 85 ? '#ef4444' : occ >= 60 ? '#f59e0b' : '#22c55e' }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AIResponse data={aiResult} loading={aiLoading} />

      {selected && (
        <div className="detail-panel" style={{ marginTop: 20 }}>
          <h2>Zone: {selected.zone_name}</h2>
          {selected.ai_analysis && (
            <div style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '6px', padding: '10px 14px', marginBottom: '12px', fontSize: '13px', color: '#a5b4fc' }}>
              <strong>AI Analysis:</strong> {selected.ai_analysis.substring(0, 200)}...
            </div>
          )}
          <div className="detail-grid">
            <div className="detail-item"><label>Zone Name</label><div className="value">{selected.zone_name}</div></div>
            <div className="detail-item"><label>Zone Code</label><div className="value">{selected.zone_code}</div></div>
            <div className="detail-item"><label>Facility</label><div className="value">{selected.facility_name || getFacilityName(selected.facility_id)}</div></div>
            <div className="detail-item"><label>Type</label><div className="value">{selected.zone_type}</div></div>
            <div className="detail-item"><label>Spots</label><div className="value">{selected.occupied_spots} / {selected.total_spots}</div></div>
            <div className="detail-item"><label>Occupancy</label>
              <div className="value">{getOccupancyRate(selected)}%</div>
              <div className="occupancy-bar"><div className={`fill ${getOccupancyClass(getOccupancyRate(selected))}`} style={{ width: `${getOccupancyRate(selected)}%` }}></div></div>
            </div>
            <div className="detail-item"><label>Rate/hr</label><div className="value">${selected.hourly_rate}</div></div>
            <div className="detail-item"><label>Floor</label><div className="value">{selected.floor_level || '-'}</div></div>
            <div className="detail-item"><label>Covered</label><div className="value">{selected.is_covered ? 'Yes' : 'No'}</div></div>
            <div className="detail-item"><label>Status</label><div className="value"><span className={`badge ${getStatusBadge(selected.status)}`}>{selected.status}</span></div></div>
          </div>
          <div className="detail-actions">
            <button className="btn btn-primary btn-sm" onClick={handleEdit}>Edit</button>
            <button className="btn btn-danger btn-sm" onClick={handleDelete}>Delete</button>
            <button className="btn btn-ai btn-sm" onClick={() => runAI(selected.facility_id)}>AI Optimize</button>
            <button className="btn btn-secondary btn-sm" onClick={() => setSelected(null)}>Close</button>
          </div>
        </div>
      )}

      <div className="data-table-container" style={{ marginTop: 20 }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Zone</th><th>Code</th><th>Facility</th><th>Type</th><th>Occupancy</th><th>Rate/hr</th><th>Floor</th><th>Covered</th><th>Status</th><th>AI</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const rate = getOccupancyRate(item);
              const wsData = getWsOccupancyForFacility(item.facility_id);
              return (
                <tr key={item.id} onClick={() => handleRowClick(item)} style={{ background: selected?.id === item.id ? 'rgba(59,130,246,0.1)' : '' }}>
                  <td style={{ fontWeight: 600 }}>{item.zone_name}</td>
                  <td>{item.zone_code}</td>
                  <td>{item.facility_name || getFacilityName(item.facility_id)}</td>
                  <td>{item.zone_type}</td>
                  <td>
                    <span style={{ fontWeight: 600 }}>{item.occupied_spots}/{item.total_spots}</span>
                    {' '}
                    <span style={{ fontSize: '11px', color: rate >= 85 ? '#ef4444' : rate >= 60 ? '#f59e0b' : '#22c55e' }}>({rate}%)</span>
                    {wsData && <span style={{ marginLeft: '4px', fontSize: '10px', color: '#6366f1' }}>LIVE</span>}
                  </td>
                  <td>${item.hourly_rate}</td>
                  <td>{item.floor_level || '-'}</td>
                  <td>{item.is_covered ? 'Yes' : 'No'}</td>
                  <td><span className={`badge ${getStatusBadge(item.status)}`}>{item.status}</span></td>
                  <td>
                    {item.ai_analysis ? (
                      <span style={{ fontSize: '10px', background: 'rgba(99,102,241,0.2)', color: '#a5b4fc', padding: '2px 6px', borderRadius: '4px' }}>AI</span>
                    ) : '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} total={total} onPageChange={(p) => load(p)} />

      {showModal && (
        <Modal title={editing ? 'Edit Zone' : 'New Zone'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Facility</label>
              <select value={form.facility_id} onChange={(e) => setForm({ ...form, facility_id: parseInt(e.target.value) })} required>
                <option value="">Select...</option>
                {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Zone Name</label><input type="text" value={form.zone_name} onChange={(e) => setForm({ ...form, zone_name: e.target.value })} required /></div>
            <div className="form-group"><label>Zone Code</label><input type="text" value={form.zone_code} onChange={(e) => setForm({ ...form, zone_code: e.target.value })} required /></div>
            <div className="form-group">
              <label>Zone Type</label>
              <select value={form.zone_type} onChange={(e) => setForm({ ...form, zone_type: e.target.value })} required>
                <option value="regular">Regular</option>
                <option value="vip">VIP</option>
                <option value="handicap">Handicap</option>
                <option value="ev_charging">EV Charging</option>
                <option value="compact">Compact</option>
                <option value="motorcycle">Motorcycle</option>
                <option value="loading">Loading</option>
              </select>
            </div>
            <div className="form-group"><label>Total Spots</label><input type="number" value={form.total_spots} onChange={(e) => setForm({ ...form, total_spots: parseInt(e.target.value) })} required /></div>
            <div className="form-group"><label>Occupied Spots</label><input type="number" value={form.occupied_spots} onChange={(e) => setForm({ ...form, occupied_spots: parseInt(e.target.value) })} required /></div>
            <div className="form-group"><label>Hourly Rate ($)</label><input type="number" step="0.01" value={form.hourly_rate} onChange={(e) => setForm({ ...form, hourly_rate: parseFloat(e.target.value) })} required /></div>
            <div className="form-group">
              <label>Covered</label>
              <select value={form.is_covered.toString()} onChange={(e) => setForm({ ...form, is_covered: e.target.value === 'true' })} required>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>
            <div className="form-group"><label>Floor Level</label><input type="text" value={form.floor_level} onChange={(e) => setForm({ ...form, floor_level: e.target.value })} /></div>
            <div className="form-group">
              <label>Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} required>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="full">Full</option>
              </select>
            </div>
            <div className="form-group"><label>Max Height (ft)</label><input type="number" step="0.1" value={form.max_height_ft} onChange={(e) => setForm({ ...form, max_height_ft: parseFloat(e.target.value) })} /></div>
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

export default Zones;
