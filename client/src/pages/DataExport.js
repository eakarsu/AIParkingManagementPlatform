import React, { useState, useEffect, useCallback } from 'react';
import { exportAPI } from '../services/api';
import Toast from '../components/Toast';

function DataExport() {
  const [tables, setTables] = useState([]);
  const [toast, setToast] = useState(null);
  const [exporting, setExporting] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await exportAPI.getTables();
      setTables(res.data);
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleExport = async (tableKey) => {
    setExporting(tableKey);
    try {
      const res = await exportAPI.download(tableKey);
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${tableKey}_export.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      setToast({ msg: `${tableKey} exported successfully`, type: 'success' });
    } catch (err) {
      setToast({ msg: err.response?.data?.error || 'Export failed', type: 'error' });
    }
    setExporting(null);
  };

  const getTableIcon = (key) => {
    const icons = {
      facilities: '🏢', occupancy: '📈', pricing: '💰', plates: '🚗',
      violations: '🚨', revenue: '💵', payments: '📱', sensors: '🔌',
      ev_stations: '⚡', reservations: '📅', permits: '🎫', analytics: '📊',
      security: '📹', maintenance: '🔧', feedback: '💬', zones: '🅿️',
      users: '👥', activity_log: '📋',
    };
    return icons[key] || '📄';
  };

  return (
    <div>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      <div className="page-header">
        <div>
          <h1>📥 Data Export</h1>
          <p>Export your data as CSV files</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
        {tables.map((t) => (
          <div
            key={t.key}
            style={{
              background: 'rgba(30,41,59,0.8)',
              border: '1px solid #334155',
              borderRadius: '12px',
              padding: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontSize: '1.2rem' }}>{getTableIcon(t.key)}</span>
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, textTransform: 'capitalize' }}>
                  {t.key.replace(/_/g, ' ')}
                </h3>
              </div>
              <p style={{ color: '#94a3b8', fontSize: '0.8rem', margin: 0 }}>
                {t.count} record{t.count !== 1 ? 's' : ''}
              </p>
            </div>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => handleExport(t.key)}
              disabled={exporting === t.key || t.count === 0}
              style={{ whiteSpace: 'nowrap' }}
            >
              {exporting === t.key ? 'Exporting...' : 'Export CSV'}
            </button>
          </div>
        ))}
      </div>

      {tables.length === 0 && (
        <div style={{ textAlign: 'center', color: '#64748b', padding: '48px' }}>
          Loading available tables...
        </div>
      )}
    </div>
  );
}

export default DataExport;
