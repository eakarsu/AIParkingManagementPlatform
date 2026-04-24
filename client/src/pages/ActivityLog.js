import React, { useState, useEffect, useCallback } from 'react';
import { activityLogAPI } from '../services/api';

function ActivityLog() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterEntity, setFilterEntity] = useState('');
  const [filterAction, setFilterAction] = useState('');

  const load = useCallback(async () => {
    try {
      const params = { page, limit: 30 };
      if (filterEntity) params.entity_type = filterEntity;
      if (filterAction) params.action = filterAction;
      const res = await activityLogAPI.getAll(params);
      setLogs(res.data.logs);
      setTotalPages(res.data.pages);
    } catch (err) { console.error(err); }
  }, [page, filterEntity, filterAction]);

  const loadStats = useCallback(async () => {
    try {
      const res = await activityLogAPI.getStats();
      setStats(res.data);
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadStats(); }, [loadStats]);

  const getActionColor = (action) => {
    switch (action) {
      case 'create': return '#22c55e';
      case 'update': return '#3b82f6';
      case 'delete': return '#ef4444';
      case 'login': return '#8b5cf6';
      default: return '#94a3b8';
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>📋 Activity Log</h1>
          <p>Track all system actions and changes</p>
        </div>
      </div>

      {stats && (
        <div className="stats-grid" style={{ marginBottom: '24px' }}>
          <div className="stat-card">
            <div className="stat-value">{stats.today}</div>
            <div className="stat-label">Today's Actions</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.week}</div>
            <div className="stat-label">This Week</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.by_user?.length || 0}</div>
            <div className="stat-label">Active Users</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.by_entity?.length || 0}</div>
            <div className="stat-label">Entity Types</div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
        <select
          className="form-select"
          value={filterAction}
          onChange={(e) => { setFilterAction(e.target.value); setPage(1); }}
          style={{ background: '#1e293b', color: '#e2e8f0', border: '1px solid #334155', borderRadius: '8px', padding: '8px 12px' }}
        >
          <option value="">All Actions</option>
          <option value="create">Create</option>
          <option value="update">Update</option>
          <option value="delete">Delete</option>
          <option value="login">Login</option>
          <option value="export">Export</option>
        </select>
        <select
          className="form-select"
          value={filterEntity}
          onChange={(e) => { setFilterEntity(e.target.value); setPage(1); }}
          style={{ background: '#1e293b', color: '#e2e8f0', border: '1px solid #334155', borderRadius: '8px', padding: '8px 12px' }}
        >
          <option value="">All Entities</option>
          <option value="facility">Facility</option>
          <option value="user">User</option>
          <option value="violation">Violation</option>
          <option value="reservation">Reservation</option>
          <option value="permit">Permit</option>
          <option value="payment">Payment</option>
          <option value="sensor">Sensor</option>
          <option value="zone">Zone</option>
        </select>
      </div>

      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>User</th>
              <th>Action</th>
              <th>Entity</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td>{new Date(log.created_at).toLocaleString()}</td>
                <td style={{ fontWeight: 600 }}>{log.user_name || 'System'}</td>
                <td>
                  <span style={{
                    color: getActionColor(log.action),
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    fontSize: '0.75rem',
                    letterSpacing: '0.5px',
                  }}>
                    {log.action}
                  </span>
                </td>
                <td>{log.entity_type}</td>
                <td style={{ color: '#94a3b8' }}>{log.description}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr><td colSpan="5" style={{ textAlign: 'center', color: '#64748b', padding: '32px' }}>No activity logs found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '16px' }}>
          <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
          <span style={{ padding: '6px 12px', color: '#94a3b8' }}>Page {page} of {totalPages}</span>
          <button className="btn btn-secondary btn-sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      )}
    </div>
  );
}

export default ActivityLog;
