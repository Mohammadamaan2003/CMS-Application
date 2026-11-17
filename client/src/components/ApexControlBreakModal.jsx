import React, { useState, useEffect } from 'react';
import { IconClose } from './Icons';

/**
 * ApexControlBreakModal - Format -> Control Break
 * Groups rows by selected column values matching APEX Reference Standard.
 */
export default function ApexControlBreakModal({
  isOpen,
  onClose,
  columns = [],
  currentBreakColumn = null,
  onApplyControlBreak,
}) {
  const [selectedCol, setSelectedCol] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSelectedCol(currentBreakColumn || '');
    }
  }, [isOpen, currentBreakColumn]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (onApplyControlBreak) {
      onApplyControlBreak(selectedCol || null);
    }
    onClose();
  };

  const handleClear = () => {
    if (onApplyControlBreak) {
      onApplyControlBreak(null);
    }
    onClose();
  };

  return (
    <div className="apex-modal-overlay" style={{ zIndex: 1200 }}>
      <div
        className="apex-modal-container"
        style={{
          maxWidth: '460px',
          width: '92%',
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          boxShadow: '0 20px 45px rgba(0,0,0,0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          className="apex-modal-header"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 20px',
            borderBottom: '1px solid #f1f5f9',
            backgroundColor: '#ffffff',
          }}
        >
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#1e293b' }}>
            Control Break
          </h3>
          <button
            type="button"
            className="apex-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            <IconClose size={14} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="apex-modal-body" style={{ padding: '20px', backgroundColor: '#ffffff' }}>
            <p style={{ margin: '0 0 14px', fontSize: '0.825rem', color: '#64748b' }}>
              Select a column to break the report into distinct visual groups.
            </p>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                Break Column
              </label>
              <select
                value={selectedCol}
                onChange={(e) => setSelectedCol(e.target.value)}
                className="apex-modal-select"
                style={{
                  width: '100%',
                  height: '36px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  padding: '0 10px',
                  fontSize: '0.825rem',
                  backgroundColor: '#ffffff',
                  color: '#0f172a',
                }}
              >
                <option value="">- None (Clear Break) -</option>
                {columns.map((col) => (
                  <option key={col.key || col.id} value={col.key || col.id}>
                    {col.label || col.title || col.key || col.id}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div
            className="apex-modal-footer"
            style={{
              padding: '12px 20px',
              borderTop: '1px solid #f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '10px',
              backgroundColor: '#ffffff',
            }}
          >
            {currentBreakColumn && (
              <button
                type="button"
                className="apex-modal-cancel-btn"
                style={{
                  marginRight: 'auto',
                  background: 'transparent',
                  border: 'none',
                  color: '#dc2626',
                  fontSize: '0.785rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '4px 8px',
                }}
                onClick={handleClear}
              >
                Remove Break
              </button>
            )}

            <button
              type="button"
              className="apex-modal-cancel-btn"
              onClick={onClose}
              style={{
                height: '34px',
                padding: '0 16px',
                borderRadius: '6px',
                border: '1px solid #e2e8f0',
                background: '#ffffff',
                color: '#475569',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="apex-modal-apply-btn"
              style={{
                height: '34px',
                padding: '0 20px',
                borderRadius: '6px',
                border: 'none',
                background: '#7048e8',
                color: '#ffffff',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(112, 72, 232, 0.35)',
              }}
            >
              Apply
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
