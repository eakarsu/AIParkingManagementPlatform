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
              {selected.result && typeof selected.result === 'object' ? (
                <div>
                  {/* Structured result display */}
                  {selected.result.predicted_occupancy_pct !== undefined && (
                    <div style={{ display: 'flex', gap: '20px', marginBottom: '16px', flexWrap: 'wrap' }}>
                      <div style={{ background: 'rgba(99,102,241,0.1)', padding: '12px 20px', borderRadius: '8px', textAlign: 'center' }}>
                        <div style={{ fontSize: '28px', fontWeight: 700, color: '#6366f1' }}>{selected.result.predicted_occupancy_pct}%</div>
                        <div style={{ fontSize: '11px', color: '#888' }}>Predicted Occupancy</div>
                      </div>
                      <div style={{ background: 'rgba(34,197,94,0.1)', padding: '12px 20px', borderRadius: '8px', textAlign: 'center' }}>
                        <div style={{ fontSize: '28px', fontWeight: 700, color: '#22c55e' }}>{selected.result.confidence}%</div>
                        <div style={{ fontSize: '11px', color: '#888' }}>Confidence</div>
                      </div>
                      {selected.result.peak_hours?.length > 0 && (
                        <div style={{ background: 'rgba(251,146,60,0.1)', padding: '12px 20px', borderRadius: '8px', textAlign: 'center' }}>
                          <div style={{ fontSize: '18px', fontWeight: 700, color: '#fb923c' }}>{selected.result.peak_hours.join(', ')}h</div>
                          <div style={{ fontSize: '11px', color: '#888' }}>Peak Hours</div>
                        </div>
                      )}
                    </div>
                  )}
                  {selected.result.recommended_price !== undefined && (
                    <div style={{ display: 'flex', gap: '20px', marginBottom: '16px', flexWrap: 'wrap' }}>
                      <div style={{ background: 'rgba(34,197,94,0.1)', padding: '12px 20px', borderRadius: '8px', textAlign: 'center' }}>
                        <div style={{ fontSize: '28px', fontWeight: 700, color: '#22c55e' }}>${selected.result.recommended_price}</div>
                        <div style={{ fontSize: '11px', color: '#888' }}>Recommended Price</div>
                      </div>
                    </div>
                  )}
                  {selected.result.recommendations?.length > 0 && (
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ fontWeight: 600, marginBottom: '8px' }}>Recommendations:</div>
                      <ul style={{ paddingLeft: '20px', color: '#ccc' }}>
                        {selected.result.recommendations.map((r, i) => <li key={i} style={{ marginBottom: '4px' }}>{r}</li>)}
                      </ul>
                    </div>
                  )}
                  {selected.result.dynamic_adjustments?.length > 0 && (
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: '8px' }}>Dynamic Adjustments:</div>
                      <table className="data-table" style={{ fontSize: '12px' }}>
                        <thead><tr><th>Time</th><th>Price</th><th>Reason</th></tr></thead>
                        <tbody>
                          {selected.result.dynamic_adjustments.map((a, i) => (
                            <tr key={i}><td>{a.time}</td><td>${a.price}</td><td>{a.reason}</td></tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {selected.result.raw && (
                    <pre style={{ fontSize: '12px', color: '#ccc', overflow: 'auto', maxHeight: '300px', background: '#111', padding: '12px', borderRadius: '4px' }}>
                      {selected.result.raw}
                    </pre>
                  )}
                  {!selected.result.raw && !selected.result.predicted_occupancy_pct && !selected.result.recommended_price && (
                    <pre style={{ fontSize: '12px', color: '#ccc', overflow: 'auto', maxHeight: '300px', background: '#111', padding: '12px', borderRadius: '4px' }}>
                      {JSON.stringify(selected.result, null, 2)}
                    </pre>
                  )}
                </div>
              ) : (
                <pre style={{ fontSize: '12px', color: '#ccc', overflow: 'auto', maxHeight: '300px', background: '#111', padding: '12px', borderRadius: '4px' }}>
                  {String(selected.result)}
                </pre>
              )}
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
