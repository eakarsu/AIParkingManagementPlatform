import React from 'react';

function Pagination({ page, totalPages, total, onPageChange }) {
  if (totalPages <= 1) return null;
  return (
    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center', marginTop: '16px', padding: '8px' }}>
      <button
        className="btn btn-sm btn-outline"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        style={{ minWidth: '70px' }}
      >
        Prev
      </button>
      <span style={{ padding: '0 16px', color: 'var(--text-secondary, #888)', fontSize: '13px' }}>
        Page {page} of {totalPages} {total !== undefined && `(${total} total)`}
      </span>
      <button
        className="btn btn-sm btn-outline"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        style={{ minWidth: '70px' }}
      >
        Next
      </button>
    </div>
  );
}

export default Pagination;
