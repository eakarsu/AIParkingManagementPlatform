import FormattedAIReport from "../components/FormattedAIReport";
import React, { useState, useEffect, useCallback } from 'react';
import { aiAPI } from '../services/api';

function AIHistory() {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const res = await aiAPI.getHistory({ page: p, limit: 20 });
      const d = res.data;
      setItems(d.data || []);
      setPage(d.page || 1);
      setTotalPages(d.totalPages || 1);
      setTotal(d.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(1); }, [load]);

  const handlePage = (p) => {
    if (p < 1 || p > totalPages) return;
    load(p);
  };

  const formatEndpoint = (ep) => ep?.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || '-';

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>🤖 AI History</h1>
          <p>Past AI predictions and analysis results — {total} total records</p>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>Loading...</div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
          No AI history yet. Run AI analyses to see results here.
        </div>
      ) : (
        <>
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Endpoint</th>
                  <th>Entity Table</th>
                  <th>Entity ID</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={item.id}>
                    <td style={{ color: '#888' }}>{(page - 1) * 20 + idx + 1}</td>
                    <td><span className="badge badge-active">{formatEndpoint(item.endpoint)}</span></td>
                    <td>{item.entity_table || '-'}</td>
                    <td>{item.entity_id || '-'}</td>
                    <td style={{ fontSize: '12px', color: '#888' }}>
                      {new Date(item.created_at).toLocaleString()}
                    </td>
                    <td>
                      <button
                        className="btn btn-sm btn-outline"
                        onClick={() => setSelected(selected?.id === item.id ? null : item)}
                        style={{ fontSize: '11px', padding: '2px 10px' }}
                      >
                        {selected?.id === item.id ? 'Hide' : 'View'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {selected && (
            <div style={{
              marginTop: '16px',
              background: 'var(--bg-card, #1a1a2e)',
              border: '1px solid var(--border, #333)',
              borderRadius: '8px',
              padding: '20px',
            }}>
              <h3 style={{ marginBottom: '12px' }}>
                Result: {formatEndpoint(selected.endpoint)}
                <span style={{ fontSize: '12px', color: '#888', marginLeft: '12px' }}>
                  {new Date(selected.created_at).toLocaleString()}
                </span>
              </h3>
              <FormattedAIReport response={selected.result} title={formatEndpoint(selected.endpoint) + " report"} />
            </div>
          )}

          {totalPages > 1 && (
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '20px', alignItems: 'center' }}>
              <button className="btn btn-sm btn-outline" onClick={() => handlePage(page - 1)} disabled={page <= 1}>
                Prev
              </button>
              <span style={{ padding: '0 12px', color: '#888' }}>Page {page} of {totalPages}</span>
              <button className="btn btn-sm btn-outline" onClick={() => handlePage(page + 1)} disabled={page >= totalPages}>
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default AIHistory;
