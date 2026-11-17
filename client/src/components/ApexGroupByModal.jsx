import React, { useState, useEffect } from 'react';
import { IconClose } from './Icons';

/**
 * ApexGroupByModal
 * Recreated precisely to match Oracle APEX Group By Modal (User Reference Screenshot 9):
 * - Header: "Group By" with circular close button
 * - Section 1: "Select Group By Column" (numbered row + Add Group By Column button)
 * - Section 2: "Functions" (Function, Column, Label, Format Mask, Sum toggle + Add Function button)
 * - Footer: Cancel and purple Apply button
 */
export default function ApexGroupByModal({
  isOpen,
  onClose,
  columns = [],
  data = [],
  initialGroupBy = null,
  onApplyGroupBy,
}) {
  const [groupByCols, setGroupByCols] = useState(() => {
    if (initialGroupBy?.groupByCols?.length > 0) return initialGroupBy.groupByCols;
    if (initialGroupBy?.groupColumn) return [initialGroupBy.groupColumn];
    return [columns[0]?.key || columns[0]?.id || ''];
  });

  const [funcRule, setFuncRule] = useState(() => {
    if (initialGroupBy?.func) {
      return {
        func: initialGroupBy.func || 'Count',
        column: initialGroupBy.measureColumn || columns[0]?.key || columns[0]?.id || '',
        label: initialGroupBy.label || '',
        formatMask: initialGroupBy.formatMask || 'Default',
        sum: initialGroupBy.sum !== false,
      };
    }
    return {
      func: 'Count',
      column: columns[0]?.key || columns[0]?.id || '',
      label: '',
      formatMask: 'Default',
      sum: true,
    };
  });

  useEffect(() => {
    if (isOpen) {
      if (initialGroupBy?.groupByCols?.length > 0) {
        setGroupByCols(initialGroupBy.groupByCols);
      } else if (initialGroupBy?.groupColumn) {
        setGroupByCols([initialGroupBy.groupColumn]);
      } else {
        setGroupByCols([columns[0]?.key || columns[0]?.id || '']);
      }

      if (initialGroupBy?.func) {
        setFuncRule({
          func: initialGroupBy.func || 'Count',
          column: initialGroupBy.measureColumn || columns[0]?.key || columns[0]?.id || '',
          label: initialGroupBy.label || '',
          formatMask: initialGroupBy.formatMask || 'Default',
          sum: initialGroupBy.sum !== false,
        });
      } else {
        setFuncRule({
          func: 'Count',
          column: columns[0]?.key || columns[0]?.id || '',
          label: '',
          formatMask: 'Default',
          sum: true,
        });
      }
    }
  }, [isOpen, initialGroupBy, columns]);

  if (!isOpen) return null;

  const handleApply = (e) => {
    if (e) e.preventDefault();
    const effectiveCols = groupByCols.filter(Boolean);
    const chosenGroupCol = effectiveCols[0] || columns[0]?.key || columns[0]?.id || '';
    const chosenMeasureCol = funcRule.column || columns[0]?.key || columns[0]?.id || '';
    
    if (onApplyGroupBy) {
      onApplyGroupBy({
        groupColumn: chosenGroupCol,
        groupByCols: effectiveCols.length > 0 ? effectiveCols : [chosenGroupCol],
        func: funcRule.func || 'Count',
        measureColumn: chosenMeasureCol,
        label: funcRule.label || `${funcRule.func} of ${chosenMeasureCol}`,
        formatMask: funcRule.formatMask || 'Default',
        sum: funcRule.sum !== false,
      });
    }
    onClose();
  };

  const handleClear = () => {
    if (onApplyGroupBy) {
      onApplyGroupBy(null);
    }
    onClose();
  };

  return (
    <div className="apex-modal-overlay" style={{ zIndex: 1200 }}>
      <div
        className="apex-modal-container"
        style={{
          maxWidth: '680px',
          width: '92%',
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          boxShadow: '0 20px 45px rgba(0,0,0,0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header matching APEX Reference Screenshot 9 */}
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
              Group By
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

        <form onSubmit={handleApply}>
          <div className="apex-modal-body" style={{ padding: '20px', backgroundColor: '#ffffff', maxHeight: '72vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Section 1: Select Group By Column */}
              <div>
                <div style={{ fontSize: '0.825rem', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
                  Select Group By Column
                </div>
                {groupByCols.map((val, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b', width: '16px' }}>
                      {idx + 1}
                    </span>
                    <select
                      value={val}
                      onChange={(e) => {
                        const next = [...groupByCols];
                        next[idx] = e.target.value;
                        setGroupByCols(next);
                      }}
                      className="apex-modal-select"
                      style={{
                        flex: 1,
                        height: '36px',
                        borderRadius: '8px',
                        border: '1.5px solid #7048e8',
                        padding: '0 10px',
                        fontSize: '0.825rem',
                        color: '#0f172a',
                        backgroundColor: '#ffffff',
                      }}
                    >
                      <option value="">- Select Group By Column -</option>
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
                  onClick={() => setGroupByCols([...groupByCols, ''])}
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
                  Add Group By Column
                </button>
              </div>

              {/* Section 2: Functions (Matching Screenshot 9) */}
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
          </div>

          {/* Footer matching APEX Reference Screenshot 9 */}
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
            {initialGroupBy && (
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
                Clear Group By
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
