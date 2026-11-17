import React, { useState } from 'react';
import { IconClose, IconPivot } from './Icons';

/**
 * ApexPivotModal
 * Recreated precisely to match Oracle APEX Pivot Modal (User Reference Screenshot 7):
 * - Header: "Pivot" with circular close button
 * - Section 1: "Pivot Columns" (numbered rows + Add Pivot Column button)
 * - Section 2: "Row Columns" (numbered rows + Add Row Column button)
 * - Section 3: "Functions" (Function, Column, Label, Format Mask, Sum toggle + Add Function button)
 * - Footer: Cancel and purple Apply button
 */
export default function ApexPivotModal({
  isOpen,
  onClose,
  columns = [],
  data = [],
  initialPivot = null,
  onApplyPivot,
}) {
  // Pivot Columns (Columns that become cross-tab header columns)
  const [pivotColumns, setPivotColumns] = useState(() => {
    if (initialPivot?.pivotColumns?.length > 0) return initialPivot.pivotColumns;
    return [columns[1]?.key || columns[1]?.id || ''];
  });

  // Row Columns (Columns that define the rows of the pivot table)
  const [rowColumns, setRowColumns] = useState(() => {
    if (initialPivot?.rowColumns?.length > 0) return initialPivot.rowColumns;
    return [columns[0]?.key || columns[0]?.id || ''];
  });

  // Function / Aggregation rule
  const [funcRule, setFuncRule] = useState(() => {
    if (initialPivot?.functions) return initialPivot.functions;
    return {
      func: 'Count',
      column: columns[0]?.key || columns[0]?.id || '',
      label: '',
      formatMask: 'Default',
      sum: true,
    };
  });

  const [activeTab, setActiveTab] = useState('settings'); // 'settings' | 'preview'

  if (!isOpen) return null;

  const handleApply = (e) => {
    if (e) e.preventDefault();
    const cleanPivot = {
      pivotColumn: pivotColumns[0] || columns[1]?.key || columns[1]?.id || '',
      pivotColumns: pivotColumns.filter(Boolean),
      rowColumn: rowColumns[0] || columns[0]?.key || columns[0]?.id || '',
      rowColumns: rowColumns.filter(Boolean),
      func: funcRule.func || 'Count',
      measureColumn: funcRule.column || columns[0]?.key || columns[0]?.id || '',
      label: funcRule.label || `${funcRule.func} of ${funcRule.column}`,
      formatMask: funcRule.formatMask || 'Default',
      sum: !!funcRule.sum,
    };

    if (onApplyPivot) {
      onApplyPivot(cleanPivot);
    }
    onClose();
  };

  const handleClear = () => {
    if (onApplyPivot) {
      onApplyPivot(null);
    }
    onClose();
  };

  // Safe client-side calculation for the preview tab
  const previewData = () => {
    const rowCol = rowColumns[0] || columns[0]?.key || columns[0]?.id;
    const pivCol = pivotColumns[0] || columns[1]?.key || columns[1]?.id;
    if (!data || data.length === 0 || !rowCol || !pivCol) return { rows: [], colHeaders: [] };

    const colHeaderSet = new Set();
    const matrix = {};

    data.forEach((r) => {
      const rVal = r[rowCol] !== undefined && r[rowCol] !== null && r[rowCol] !== '' ? String(r[rowCol]) : '(Blank)';
      const cVal = r[pivCol] !== undefined && r[pivCol] !== null && r[pivCol] !== '' ? String(r[pivCol]) : '(Blank)';
      colHeaderSet.add(cVal);

      if (!matrix[rVal]) matrix[rVal] = {};
      if (!matrix[rVal][cVal]) matrix[rVal][cVal] = { count: 0, sum: 0 };

      matrix[rVal][cVal].count += 1;
      if (funcRule.column) {
        const num = parseFloat(String(r[funcRule.column]).replace(/[^0-9.-]/g, ''));
        if (!isNaN(num)) matrix[rVal][cVal].sum += num;
      }
    });

    const colHeaders = Array.from(colHeaderSet).sort().slice(0, 10);
    const rows = Object.entries(matrix).map(([rVal, cellMap]) => {
      let rowTotal = 0;
      const cells = {};
      colHeaders.forEach((cH) => {
        const item = cellMap[cH];
        const val = item ? (funcRule.func === 'Count' ? item.count : Math.round(item.sum * 100) / 100) : 0;
        cells[cH] = val;
        rowTotal += val;
      });
      return { rVal, cells, rowTotal };
    }).sort((a, b) => b.rowTotal - a.rowTotal).slice(0, 30);

    return { rows, colHeaders };
  };

  const preview = activeTab === 'preview' ? previewData() : null;

  return (
    <div className="apex-modal-overlay" style={{ zIndex: 1200 }}>
      <div
        className="apex-modal-container"
        style={{
          maxWidth: '720px',
          width: '94%',
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          boxShadow: '0 20px 45px rgba(0,0,0,0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header matching APEX Reference Screenshot 7 */}
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
              Pivot
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

        {/* View Tabs: Settings / Live Preview */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            borderBottom: '1px solid #e2e8f0',
            backgroundColor: '#ffffff',
            padding: '0 20px',
            gap: '1.5rem',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            style={{
              padding: '10px 4px',
              border: 'none',
              background: 'transparent',
              fontSize: '0.825rem',
              fontWeight: 600,
              color: activeTab === 'settings' ? '#7048e8' : '#64748b',
              borderBottom: activeTab === 'settings' ? '2px solid #7048e8' : '2px solid transparent',
              cursor: 'pointer',
            }}
          >
            Pivot Settings
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            style={{
              padding: '10px 4px',
              border: 'none',
              background: 'transparent',
              fontSize: '0.825rem',
              fontWeight: 600,
              color: activeTab === 'preview' ? '#7048e8' : '#64748b',
              borderBottom: activeTab === 'preview' ? '2px solid #7048e8' : '2px solid transparent',
              cursor: 'pointer',
            }}
          >
            Live Preview
          </button>
        </div>

        {/* Modal Body */}
        <div className="apex-modal-body" style={{ padding: '20px', backgroundColor: '#ffffff', maxHeight: '72vh', overflowY: 'auto' }}>
          {activeTab === 'settings' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Section 1: Pivot Columns */}
              <div>
                <div style={{ fontSize: '0.825rem', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
                  Pivot Columns
                </div>
                {pivotColumns.map((val, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b', width: '16px' }}>
                      {idx + 1}
                    </span>
                    <select
                      value={val}
                      onChange={(e) => {
                        const next = [...pivotColumns];
                        next[idx] = e.target.value;
                        setPivotColumns(next);
                      }}
                      className="apex-modal-select"
                      style={{
                        flex: 1,
                        height: '36px',
                        borderRadius: '8px',
                        border: '1px solid #7048e8',
                        padding: '0 10px',
                        fontSize: '0.825rem',
                        color: '#0f172a',
                        backgroundColor: '#ffffff',
                      }}
                    >
                      <option value="">- Select Pivot Column -</option>
                      {columns.map((c) => (
                        <option key={c.key || c.id} value={c.key || c.id}>
                          {c.label || c.title || c.key || c.id}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setPivotColumns([...pivotColumns, ''])}
                  style={{
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    backgroundColor: '#ffffff',
                    color: '#475569',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    padding: '4px 10px',
                    cursor: 'pointer',
                    marginTop: '4px',
                  }}
                >
                  Add Pivot Column
                </button>
              </div>

              {/* Section 2: Row Columns */}
              <div>
                <div style={{ fontSize: '0.825rem', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
                  Row Columns
                </div>
                {rowColumns.map((val, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b', width: '16px' }}>
                      {idx + 1}
                    </span>
                    <select
                      value={val}
                      onChange={(e) => {
                        const next = [...rowColumns];
                        next[idx] = e.target.value;
                        setRowColumns(next);
                      }}
                      className="apex-modal-select"
                      style={{
                        flex: 1,
                        height: '36px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        padding: '0 10px',
                        fontSize: '0.825rem',
                        color: '#0f172a',
                        backgroundColor: '#ffffff',
                      }}
                    >
                      <option value="">- Select Row Column -</option>
                      {columns.map((c) => (
                        <option key={c.key || c.id} value={c.key || c.id}>
                          {c.label || c.title || c.key || c.id}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setRowColumns([...rowColumns, ''])}
                  style={{
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    backgroundColor: '#ffffff',
                    color: '#475569',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    padding: '4px 10px',
                    cursor: 'pointer',
                    marginTop: '4px',
                  }}
                >
                  Add Row Column
                </button>
              </div>

              {/* Section 3: Functions (Matching Screenshot 7) */}
              <div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '24px 130px 140px 1fr 110px 50px',
                    gap: '8px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: '#0f172a',
                    marginBottom: '6px',
                  }}
                >
                  <span></span>
                  <span>Functions</span>
                  <span>Column</span>
                  <span>Label</span>
                  <span>Format Mask</span>
                  <span style={{ textAlign: 'center' }}>Sum</span>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '24px 130px 140px 1fr 110px 50px',
                    gap: '8px',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>
                    1
                  </span>

                  {/* Function Dropdown */}
                  <select
                    value={funcRule.func}
                    onChange={(e) => setFuncRule({ ...funcRule, func: e.target.value })}
                    className="apex-modal-select"
                    style={{
                      height: '36px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      padding: '0 8px',
                      fontSize: '0.8rem',
                      backgroundColor: '#ffffff',
                      color: '#0f172a',
                    }}
                  >
                    <option value="Count">Count</option>
                    <option value="Sum">Sum</option>
                    <option value="Average">Average</option>
                    <option value="Minimum">Minimum</option>
                    <option value="Maximum">Maximum</option>
                  </select>

                  {/* Column Dropdown */}
                  <select
                    value={funcRule.column}
                    onChange={(e) => setFuncRule({ ...funcRule, column: e.target.value })}
                    className="apex-modal-select"
                    style={{
                      height: '36px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      padding: '0 8px',
                      fontSize: '0.8rem',
                      backgroundColor: '#ffffff',
                      color: '#0f172a',
                    }}
                  >
                    <option value="">- Select Column -</option>
                    {columns.map((c) => (
                      <option key={c.key || c.id} value={c.key || c.id}>
                        {c.label || c.title || c.key || c.id}
                      </option>
                    ))}
                  </select>

                  {/* Label Input */}
                  <input
                    type="text"
                    value={funcRule.label}
                    onChange={(e) => setFuncRule({ ...funcRule, label: e.target.value })}
                    placeholder="Metric Label"
                    className="apex-modal-input"
                    style={{
                      height: '36px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      padding: '0 10px',
                      fontSize: '0.8rem',
                      backgroundColor: '#ffffff',
                      color: '#0f172a',
                    }}
                  />

                  {/* Format Mask */}
                  <select
                    value={funcRule.formatMask}
                    onChange={(e) => setFuncRule({ ...funcRule, formatMask: e.target.value })}
                    className="apex-modal-select"
                    style={{
                      height: '36px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      padding: '0 8px',
                      fontSize: '0.8rem',
                      backgroundColor: '#ffffff',
                      color: '#0f172a',
                    }}
                  >
                    <option value="Default">Default</option>
                    <option value="Currency">Currency ($)</option>
                    <option value="Percent">Percent (%)</option>
                    <option value="Integer">Integer</option>
                  </select>

                  {/* Sum Toggle Switch */}
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <input
                      type="checkbox"
                      checked={funcRule.sum}
                      onChange={(e) => setFuncRule({ ...funcRule, sum: e.target.checked })}
                      style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#7048e8' }}
                      title="Include Totals"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  style={{
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    backgroundColor: '#ffffff',
                    color: '#475569',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    padding: '4px 10px',
                    cursor: 'pointer',
                    marginTop: '8px',
                  }}
                >
                  Add Function
                </button>
              </div>
            </div>
          ) : (
            /* Live Preview Table with 100% Opaque Solid Surfaces */
            <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', overflowX: 'auto', padding: '4px' }}>
              <div style={{ padding: '8px 12px', fontSize: '0.8rem', fontWeight: 600, color: '#0f172a', borderBottom: '1px solid #e2e8f0' }}>
                Preview Matrix: <span style={{ color: '#7048e8' }}>{rowColumns[0] || 'Rows'}</span> &times; <span style={{ color: '#0284c7' }}>{pivotColumns[0] || 'Columns'}</span> ({funcRule.func})
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.775rem', textAlign: 'left', backgroundColor: '#ffffff' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #cbd5e1' }}>
                    <th style={{ padding: '8px 12px', fontWeight: 700, color: '#1e293b' }}>
                      {rowColumns[0] || 'Row Dimension'}
                    </th>
                    {preview?.colHeaders?.map((cH) => (
                      <th key={cH} style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap' }}>
                        {cH}
                      </th>
                    ))}
                    <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 800, color: '#7048e8', backgroundColor: '#f3e8ff' }}>
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {!preview || preview.rows.length === 0 ? (
                    <tr>
                      <td colSpan={10} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                        Select valid Row and Pivot columns to view preview.
                      </td>
                    </tr>
                  ) : (
                    preview.rows.map((r, rIdx) => (
                      <tr key={rIdx} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: rIdx % 2 === 1 ? '#f8fafc' : '#ffffff' }}>
                        <td style={{ padding: '6px 12px', fontWeight: 600, color: '#1e293b' }}>
                          {r.rVal}
                        </td>
                        {preview.colHeaders.map((cH) => (
                          <td key={cH} style={{ padding: '6px 10px', textAlign: 'right', color: r.cells[cH] ? '#0f172a' : '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>
                            {r.cells[cH] ? r.cells[cH].toLocaleString() : '-'}
                          </td>
                        ))}
                        <td style={{ padding: '6px 12px', textAlign: 'right', fontWeight: 700, color: '#7048e8', backgroundColor: '#faf5ff' }}>
                          {r.rowTotal.toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer matching APEX Reference Screenshot 7 */}
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
          {initialPivot && (
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
              Remove Pivot
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
            type="button"
            onClick={handleApply}
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
      </div>
    </div>
  );
}
