import React, { useState, useEffect, useCallback } from 'react';
import { usersAPI } from '../services/api';
import Modal from '../components/Modal';
import Toast from '../components/Toast';

const emptyForm = { name: '', email: '', password: '', role: 'operator' };

function UserManagement() {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(false);
  const [toast, setToast] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await usersAPI.getAll();
      setItems(res.data);
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRowClick = (item) => setSelected(selected?.id === item.id ? null : item);
  const handleNew = () => { setForm(emptyForm); setEditing(false); setShowModal(true); };

  const handleEdit = () => {
    setForm({ name: selected.name, email: selected.email, password: '', role: selected.role });
    setEditing(true);
    setShowModal(true);
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this user?')) return;
    try {
      await usersAPI.delete(selected.id);
      setToast({ msg: 'User deleted', type: 'success' });
      setSelected(null);
      load();
    } catch (err) {
      setToast({ msg: err.response?.data?.error || 'Delete failed', type: 'error' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = { ...form };
      if (editing && !data.password) delete data.password;
      if (editing) {
        await usersAPI.update(selected.id, data);
        setToast({ msg: 'User updated', type: 'success' });
      } else {
        if (!data.password) { setToast({ msg: 'Password is required', type: 'error' }); return; }
        await usersAPI.create(data);
        setToast({ msg: 'User created', type: 'success' });
      }
      setShowModal(false);
      setSelected(null);
      load();
    } catch (err) {
      setToast({ msg: err.response?.data?.error || 'Save failed', type: 'error' });
    }
  };

  return (
    <div>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      <div className="page-header">
        <div>
          <h1>👥 User Management</h1>
          <p>Manage system users and roles</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={handleNew}>+ New User</button>
        </div>
      </div>

      {selected && (
        <div className="detail-panel">
          <h2>{selected.name}</h2>
          <div className="detail-grid">
            <div className="detail-item"><label>Email</label><div className="value">{selected.email}</div></div>
            <div className="detail-item"><label>Role</label><div className="value"><span className={`badge badge-${selected.role}`}>{selected.role}</span></div></div>
            <div className="detail-item"><label>Created</label><div className="value">{new Date(selected.created_at).toLocaleDateString()}</div></div>
            <div className="detail-item"><label>Updated</label><div className="value">{new Date(selected.updated_at).toLocaleDateString()}</div></div>
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
              <th>Email</th>
              <th>Role</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} onClick={() => handleRowClick(item)} style={{ background: selected?.id === item.id ? 'rgba(59,130,246,0.1)' : '' }}>
                <td style={{ fontWeight: 600 }}>{item.name}</td>
                <td>{item.email}</td>
                <td><span className={`badge badge-${item.role}`}>{item.role}</span></td>
                <td>{new Date(item.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <Modal title={editing ? 'Edit User' : 'New User'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>{editing ? 'New Password (leave blank to keep)' : 'Password'}</label>
              <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} {...(!editing && { required: true })} />
            </div>
            <div className="form-group">
              <label>Role</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="operator">Operator</option>
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="viewer">Viewer</option>
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

export default UserManagement;
