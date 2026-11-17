import React, { useState, useEffect } from 'react';
import { IconClose } from './Icons';

/**
 * ApexSortModal
 * Recreated precisely to match Oracle APEX Sort Modal (User Reference Screenshot 5):
 * - Clean header: "Sort" with circular close button
 * - Table header: Column, Direction, Null Sorting
 * - 6 numbered rows with dropdowns
 * - Focused input has purple border (#7048e8)
 * - Footer: Cancel and purple Apply button
 */
export default function ApexSortModal({
  isOpen,
  onClose,
  columns = [],
  currentSort = [],
  onApplySort,
}) {
  const [sortRows, setSortRows] = useState(() => {
    const rows = [
      { key: '', dir: 'asc', nulls: 'default' },
      { key: '', dir: 'asc', nulls: 'default' },
      { key: '', dir: 'asc', nulls: 'default' },
      { key: '', dir: 'asc', nulls: 'default' },
      { key: '', dir: 'asc', nulls: 'default' },
      { key: '', dir: 'asc', nulls: 'default' },
    ];
    if (Array.isArray(currentSort) && currentSort.length > 0) {
      currentSort.forEach((s, i) => {
        if (i < 6) rows[i] = { key: s.key || '', dir: s.dir || 'asc', nulls: s.nulls || 'default' };
      });
    } else if (currentSort?.key) {
      rows[0] = { key: currentSort.key, dir: currentSort.dir || 'asc', nulls: currentSort.nulls || 'default' };
    }
    return rows;
  });

  useEffect(() => {
    if (isOpen) {
      const rows = [
        { key: '', dir: 'asc', nulls: 'default' },
        { key: '', dir: 'asc', nulls: 'default' },
        { key: '', dir: 'asc', nulls: 'default' },
        { key: '', dir: 'asc', nulls: 'default' },
        { key: '', dir: 'asc', nulls: 'default' },
        { key: '', dir: 'asc', nulls: 'default' },
      ];
      if (Array.isArray(currentSort) && currentSort.length > 0) {
        currentSort.forEach((s, i) => {
          if (i < 6) rows[i] = { key: s.key || '', dir: s.dir || 'asc', nulls: s.nulls || 'default' };
        });
      } else if (currentSort?.key) {
        rows[0] = { key: currentSort.key, dir: currentSort.dir || 'asc', nulls: currentSort.nulls || 'default' };
      }
      setSortRows(rows);
    }
  }, [isOpen, currentSort]);

  if (!isOpen) return null;

  const handleChange = (index, field, value) => {
    setSortRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    const active = sortRows.filter((r) => r.key && r.key.trim() !== '');
    if (onApplySort) {
      onApplySort(active);
    }
    onClose();
  };

  const handleClear = () => {
    if (onApplySort) {
      onApplySort([]);
    }
    onClose();
  };

  return (
    <div className="apex-modal-overlay" style={{ zIndex: 1200 }}>
      <div
        className="apex-modal-container"
        style={{
          maxWidth: '580px',
          width: '92%',
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          boxShadow: '0 20px 45px rgba(0,0,0,0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header matching APEX Reference Screenshot 5 */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#1e293b' }}>
              Sort
            </h3>
          </div>
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
          <div className="apex-modal-body" style={{ padding: '18px 20px', backgroundColor: '#ffffff' }}>
            {/* Table Header: Column, Direction, Null Sorting */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '24px 1fr 140px 130px',
                gap: '12px',
                fontSize: '0.8rem',
                fontWeight: 700,
                color: '#0f172a',
                marginBottom: '10px',
                paddingLeft: '4px',
              }}
            >
              <span></span>
              <span>Column</span>
              <span>Direction</span>
              <span>Null Sorting</span>
            </div>

            {/* 6 Numbered Rows matching Screenshot 5 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {sortRows.map((row, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '24px 1fr 140px 130px',
                    gap: '12px',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b', textAlign: 'center' }}>
                    {idx + 1}
                  </span>

                  {/* Column Select */}
                  <select
                    value={row.key}
                    onChange={(e) => handleChange(idx, 'key', e.target.value)}
                    className="apex-modal-select"
                    style={{
                      height: '36px',
                      borderRadius: '8px',
                      border: idx === 0 && row.key ? '1.5px solid #7048e8' : '1px solid #cbd5e1',
                      padding: '0 10px',
                      fontSize: '0.825rem',
                      color: '#0f172a',
                      backgroundColor: '#ffffff',
                    }}
                  >
                    <option value="">- Select Column -</option>
                    {columns.map((c) => (
                      <option key={c.key || c.id} value={c.key || c.id}>
                        {c.label || c.title || c.key || c.id}
                      </option>
                    ))}
                  </select>

                  {/* Direction Select */}
                  <select
                    value={row.dir}
                    onChange={(e) => handleChange(idx, 'dir', e.target.value)}
                    className="apex-modal-select"
                    style={{
                      height: '36px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      padding: '0 10px',
                      fontSize: '0.825rem',
                      color: '#0f172a',
                      backgroundColor: '#ffffff',
                    }}
                    disabled={!row.key}
                  >
                    <option value="asc">Ascending</option>
                    <option value="desc">Descending</option>
                  </select>

                  {/* Null Sorting Select */}
                  <select
                    value={row.nulls}
                    onChange={(e) => handleChange(idx, 'nulls', e.target.value)}
                    className="apex-modal-select"
                    style={{
                      height: '36px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      padding: '0 10px',
                      fontSize: '0.825rem',
                      color: '#0f172a',
                      backgroundColor: '#ffffff',
                    }}
                    disabled={!row.key}
                  >
                    <option value="default">Default</option>
                    <option value="first">Nulls First</option>
                    <option value="last">Nulls Last</option>
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Footer matching Screenshot 5 */}
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
            {sortRows.some((r) => r.key) && (
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
                Clear Sort
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
