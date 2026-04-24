import React, { useState, useEffect, useCallback } from 'react';
import { facilitiesAPI } from '../services/api';
import Modal from '../components/Modal';
import Toast from '../components/Toast';

const emptyForm = { name: '', address: '', total_spaces: 500, hourly_rate: 5.0, facility_type: 'garage', status: 'active' };

function Facilities() {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(false);
  const [toast, setToast] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await facilitiesAPI.getAll();
      setItems(res.data);
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRowClick = (item) => setSelected(selected?.id === item.id ? null : item);

  const handleNew = () => { setForm(emptyForm); setEditing(false); setShowModal(true); };

  const handleEdit = () => {
    setForm({ name: selected.name, address: selected.address, total_spaces: selected.total_spaces, hourly_rate: selected.hourly_rate, facility_type: selected.facility_type, status: selected.status });
    setEditing(true);
    setShowModal(true);
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this facility?')) return;
    try {
      await facilitiesAPI.delete(selected.id);
      setToast({ msg: 'Facility deleted', type: 'success' });
      setSelected(null);
      load();
    } catch (err) { setToast({ msg: 'Delete failed', type: 'error' }); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await facilitiesAPI.update(selected.id, form);
        setToast({ msg: 'Facility updated', type: 'success' });
      } else {
        await facilitiesAPI.create(form);
        setToast({ msg: 'Facility created', type: 'success' });
      }
      setShowModal(false);
      setSelected(null);
      load();
    } catch (err) { setToast({ msg: 'Save failed', type: 'error' }); }
  };

  return (
    <div>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      <div className="page-header">
        <div>
          <h1>🏢 Facilities</h1>
          <p>Manage parking facilities and locations</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={handleNew}>+ New Facility</button>
        </div>
      </div>

      {selected && (
        <div className="detail-panel">
          <h2>{selected.name}</h2>
          <div className="detail-grid">
            <div className="detail-item"><label>Address</label><div className="value">{selected.address}</div></div>
            <div className="detail-item"><label>Total Spaces</label><div className="value">{selected.total_spaces}</div></div>
            <div className="detail-item"><label>Hourly Rate</label><div className="value">${selected.hourly_rate}</div></div>
            <div className="detail-item"><label>Type</label><div className="value">{selected.facility_type}</div></div>
            <div className="detail-item"><label>Status</label><div className="value"><span className={`badge badge-${selected.status}`}>{selected.status}</span></div></div>
            <div className="detail-item"><label>Created</label><div className="value">{new Date(selected.created_at).toLocaleDateString()}</div></div>
          </div>
          <div className="detail-actions">
            <button className="btn btn-primary btn-sm" onClick={handleEdit}>Edit</button>
            <button className="btn btn-danger btn-sm" onClick={handleDelete}>Delete</button>
            <button className="btn btn-secondary btn-sm" onClick={() => setSelected(null)}>Close</button>
          </div>
        </div>
      )}

      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Address</th>
              <th>Spaces</th>
              <th>Rate/hr</th>
              <th>Type</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} onClick={() => handleRowClick(item)} style={{ background: selected?.id === item.id ? 'rgba(59,130,246,0.1)' : '' }}>
                <td style={{ fontWeight: 600 }}>{item.name}</td>
                <td>{item.address}</td>
                <td>{item.total_spaces}</td>
                <td>${item.hourly_rate}</td>
                <td>{item.facility_type}</td>
                <td><span className={`badge badge-${item.status}`}>{item.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <Modal title={editing ? 'Edit Facility' : 'New Facility'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Address</label>
              <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Total Spaces</label>
              <input type="number" value={form.total_spaces} onChange={(e) => setForm({ ...form, total_spaces: parseInt(e.target.value) })} required />
            </div>
            <div className="form-group">
              <label>Hourly Rate ($)</label>
              <input type="number" step="0.5" value={form.hourly_rate} onChange={(e) => setForm({ ...form, hourly_rate: parseFloat(e.target.value) })} required />
            </div>
            <div className="form-group">
              <label>Type</label>
              <select value={form.facility_type} onChange={(e) => setForm({ ...form, facility_type: e.target.value })}>
                <option value="garage">Garage</option>
                <option value="lot">Lot</option>
                <option value="deck">Deck</option>
              </select>
            </div>
            <div className="form-group">
              <label>Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>
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

export default Facilities;
