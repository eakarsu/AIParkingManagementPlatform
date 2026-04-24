import React, { useState, useEffect, useCallback } from 'react';
import { feedbackAPI, facilitiesAPI, aiAPI } from '../services/api';
import Modal from '../components/Modal';
import Toast from '../components/Toast';
import AIResponse from '../components/AIResponse';

function Feedback() {
  const [items, setItems] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(false);
  const [toast, setToast] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [form, setForm] = useState({ facility_id: '', customer_name: '', customer_email: '', rating: 5, category: 'general', subject: '', message: '', response: '', status: 'new', sentiment: 'neutral' });

  const load = useCallback(async () => {
    try {
      const [fb, fac] = await Promise.all([feedbackAPI.getAll(), facilitiesAPI.getAll()]);
      setItems(fb.data);
      setFacilities(fac.data);
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRowClick = (item) => setSelected(selected?.id === item.id ? null : item);

  const handleNew = () => {
    setForm({ facility_id: facilities[0]?.id || '', customer_name: '', customer_email: '', rating: 5, category: 'general', subject: '', message: '', response: '', status: 'new', sentiment: 'neutral' });
    setEditing(false); setShowModal(true);
  };

  const handleEdit = () => {
    setForm({ facility_id: selected.facility_id, customer_name: selected.customer_name, customer_email: selected.customer_email, rating: selected.rating, category: selected.category, subject: selected.subject, message: selected.message || '', response: selected.response || '', status: selected.status, sentiment: selected.sentiment });
    setEditing(true); setShowModal(true);
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this feedback?')) return;
    try { await feedbackAPI.delete(selected.id); setToast({ msg: 'Feedback deleted', type: 'success' }); setSelected(null); load(); }
    catch (err) { setToast({ msg: 'Delete failed', type: 'error' }); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) { await feedbackAPI.update(selected.id, form); setToast({ msg: 'Feedback updated', type: 'success' }); }
      else { await feedbackAPI.create(form); setToast({ msg: 'Feedback created', type: 'success' }); }
      setShowModal(false); setSelected(null); load();
    } catch (err) { setToast({ msg: 'Save failed', type: 'error' }); }
  };

  const runAI = async () => {
    setAiLoading(true); setAiResult(null);
    try { const res = await aiAPI.analyzeFeedback({ facility_id: selected?.facility_id || items[0]?.facility_id }); setAiResult(res.data); }
    catch (err) { setAiResult({ error: err.message }); }
    finally { setAiLoading(false); }
  };

  const renderStars = (rating) => '⭐'.repeat(rating);

  const getSentimentBadge = (sentiment) => {
    const map = { positive: 'badge-active', neutral: 'badge-pending', negative: 'badge-issued' };
    return map[sentiment] || 'badge-pending';
  };

  const getStatusBadge = (status) => {
    const map = { new: 'badge-pending', reviewed: 'badge-disputed', responded: 'badge-active', resolved: 'badge-completed' };
    return map[status] || 'badge-pending';
  };

  return (
    <div>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      <div className="page-header">
        <div><h1>💬 Customer Feedback</h1><p>Collect, review, and respond to customer feedback</p></div>
        <div className="header-actions">
          <button className="btn btn-ai" onClick={runAI} disabled={!selected && items.length === 0}>🤖 AI Analyze</button>
          <button className="btn btn-primary" onClick={handleNew}>+ New Feedback</button>
        </div>
      </div>

      <AIResponse data={aiResult} loading={aiLoading} />

      {selected && (
        <div className="detail-panel" style={{ marginTop: 20 }}>
          <h2>Feedback #{selected.id}: {selected.subject}</h2>
          <div className="detail-grid">
            <div className="detail-item"><label>Customer</label><div className="value">{selected.customer_name}</div></div>
            <div className="detail-item"><label>Email</label><div className="value">{selected.customer_email}</div></div>
            <div className="detail-item"><label>Facility</label><div className="value">{selected.facility_name}</div></div>
            <div className="detail-item"><label>Rating</label><div className="value" style={{ fontSize: 20 }}>{renderStars(selected.rating)}</div></div>
            <div className="detail-item"><label>Category</label><div className="value">{selected.category}</div></div>
            <div className="detail-item"><label>Subject</label><div className="value">{selected.subject}</div></div>
            <div className="detail-item"><label>Message</label><div className="value">{selected.message || '-'}</div></div>
            <div className="detail-item"><label>Response</label><div className="value">{selected.response || '-'}</div></div>
            <div className="detail-item"><label>Status</label><div className="value"><span className={`badge ${getStatusBadge(selected.status)}`}>{selected.status}</span></div></div>
            <div className="detail-item"><label>Sentiment</label><div className="value"><span className={`badge ${getSentimentBadge(selected.sentiment)}`}>{selected.sentiment}</span></div></div>
          </div>
          <div className="detail-actions">
            <button className="btn btn-primary btn-sm" onClick={handleEdit}>Edit</button>
            <button className="btn btn-danger btn-sm" onClick={handleDelete}>Delete</button>
            <button className="btn btn-ai btn-sm" onClick={runAI}>🤖 AI Analyze</button>
            <button className="btn btn-secondary btn-sm" onClick={() => setSelected(null)}>Close</button>
          </div>
        </div>
      )}

      <div className="data-table-container" style={{ marginTop: 20 }}>
        <table className="data-table">
          <thead><tr><th>Customer</th><th>Facility</th><th>Rating</th><th>Category</th><th>Subject</th><th>Sentiment</th><th>Status</th></tr></thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} onClick={() => handleRowClick(item)} style={{ background: selected?.id === item.id ? 'rgba(59,130,246,0.1)' : '' }}>
                <td>{item.customer_name}</td>
                <td>{item.facility_name}</td>
                <td>{renderStars(item.rating)}</td>
                <td>{item.category}</td>
                <td>{item.subject}</td>
                <td><span className={`badge ${getSentimentBadge(item.sentiment)}`}>{item.sentiment}</span></td>
                <td><span className={`badge ${getStatusBadge(item.status)}`}>{item.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <Modal title={editing ? 'Edit Feedback' : 'New Feedback'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit}>
            <div className="form-group"><label>Facility</label>
              <select value={form.facility_id} onChange={(e) => setForm({ ...form, facility_id: parseInt(e.target.value) })} required>
                <option value="">Select...</option>
                {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Customer Name</label><input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} required /></div>
            <div className="form-group"><label>Customer Email</label><input type="email" value={form.customer_email} onChange={(e) => setForm({ ...form, customer_email: e.target.value })} required /></div>
            <div className="form-group"><label>Rating</label>
              <select value={form.rating} onChange={(e) => setForm({ ...form, rating: parseInt(e.target.value) })}>
                <option value={1}>1 - Poor</option><option value={2}>2 - Fair</option><option value={3}>3 - Good</option><option value={4}>4 - Very Good</option><option value={5}>5 - Excellent</option>
              </select>
            </div>
            <div className="form-group"><label>Category</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                <option value="cleanliness">Cleanliness</option><option value="pricing">Pricing</option><option value="safety">Safety</option><option value="accessibility">Accessibility</option>
                <option value="staff">Staff</option><option value="technology">Technology</option><option value="general">General</option>
              </select>
            </div>
            <div className="form-group"><label>Subject</label><input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required /></div>
            <div className="form-group"><label>Message</label><textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows="3"></textarea></div>
            <div className="form-group"><label>Response</label><textarea value={form.response} onChange={(e) => setForm({ ...form, response: e.target.value })} rows="3"></textarea></div>
            <div className="form-group"><label>Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="new">New</option><option value="reviewed">Reviewed</option><option value="responded">Responded</option><option value="resolved">Resolved</option>
              </select>
            </div>
            <div className="form-group"><label>Sentiment</label>
              <select value={form.sentiment} onChange={(e) => setForm({ ...form, sentiment: e.target.value })}>
                <option value="positive">Positive</option><option value="neutral">Neutral</option><option value="negative">Negative</option>
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

export default Feedback;
