import React, { useState, useEffect, useCallback } from 'react';
import { notificationsAPI } from '../services/api';
import Toast from '../components/Toast';

function Notifications() {
  const [items, setItems] = useState([]);
  const [toast, setToast] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await notificationsAPI.getAll();
      setItems(res.data);
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleMarkRead = async (id) => {
    try {
      await notificationsAPI.markRead(id);
      load();
    } catch (err) { console.error(err); }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsAPI.markAllRead();
      setToast({ msg: 'All marked as read', type: 'success' });
      load();
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id) => {
    try {
      await notificationsAPI.delete(id);
      setToast({ msg: 'Notification deleted', type: 'success' });
      load();
    } catch (err) { console.error(err); }
  };

  const handleCreateSample = async () => {
    try {
      await notificationsAPI.create({
        title: 'Occupancy Alert',
        message: 'Facility "Downtown Garage" has reached 90% capacity.',
        type: 'warning',
      });
      await notificationsAPI.create({
        title: 'New Reservation',
        message: 'A new reservation has been booked for tomorrow 9:00 AM.',
        type: 'info',
      });
      await notificationsAPI.create({
        title: 'Maintenance Due',
        message: 'Sensor S-003 battery is below 20%. Replacement needed.',
        type: 'error',
      });
      await notificationsAPI.create({
        title: 'Revenue Milestone',
        message: 'Monthly revenue has exceeded $50,000. Great performance!',
        type: 'success',
      });
      setToast({ msg: 'Sample notifications created', type: 'success' });
      load();
    } catch (err) { console.error(err); }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'success': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '🔴';
      default: return 'ℹ️';
    }
  };

  const getTypeBorder = (type) => {
    switch (type) {
      case 'success': return '#22c55e';
      case 'warning': return '#f59e0b';
      case 'error': return '#ef4444';
      default: return '#3b82f6';
    }
  };

  const unreadCount = items.filter(i => !i.is_read).length;

  return (
    <div>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      <div className="page-header">
        <div>
          <h1>🔔 Notifications</h1>
          <p>{unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={handleCreateSample}>+ Sample Alerts</button>
          {unreadCount > 0 && (
            <button className="btn btn-primary" onClick={handleMarkAllRead}>Mark All Read</button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {items.map((item) => (
          <div
            key={item.id}
            style={{
              background: item.is_read ? 'rgba(30,41,59,0.5)' : 'rgba(30,41,59,0.9)',
              border: `1px solid ${item.is_read ? '#334155' : getTypeBorder(item.type)}`,
              borderLeft: `4px solid ${getTypeBorder(item.type)}`,
              borderRadius: '12px',
              padding: '16px 20px',
              opacity: item.is_read ? 0.7 : 1,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span>{getTypeIcon(item.type)}</span>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>{item.title}</h3>
                  {!item.is_read && (
                    <span style={{ background: '#3b82f6', color: '#fff', fontSize: '0.65rem', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>NEW</span>
                  )}
                </div>
                <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9rem' }}>{item.message}</p>
                <span style={{ color: '#64748b', fontSize: '0.75rem' }}>{new Date(item.created_at).toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {!item.is_read && (
                  <button className="btn btn-secondary btn-sm" onClick={() => handleMarkRead(item.id)}>Read</button>
                )}
                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(item.id)}>Delete</button>
              </div>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div style={{ textAlign: 'center', color: '#64748b', padding: '48px', background: 'rgba(30,41,59,0.5)', borderRadius: '12px' }}>
            <p style={{ fontSize: '2rem', marginBottom: '8px' }}>🔔</p>
            <p>No notifications yet. Click "Sample Alerts" to generate some.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Notifications;
