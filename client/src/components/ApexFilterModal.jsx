import React, { useState } from 'react';
import { IconClose, IconFilter, IconColumns, IconTable } from './Icons';

/**
 * ApexFilterModal
 * Recreated precisely to match Oracle APEX Interactive Report Filter Screen (User Reference Screenshot 3):
 * - Clean white card header with circular close button
 * - Filter Mode Tabs: [Columns] Column (active with purple underline) and [Rows] Row
 * - Horizontal aligned fields: Column, Operator, Expression
 * - Styled Cancel and solid Purple Apply button
 */
export default function ApexFilterModal({
  isOpen,
  onClose,
  columns = [],
  onApplyFilter,
  initialFilter = null,
}) {
  const [filterTab, setFilterTab] = useState('column'); // 'column' | 'row'
  const [selectedColumn, setSelectedColumn] = useState(
    initialFilter?.column || initialFilter?.key || (columns[0]?.id || columns[0]?.key || '')
  );
  const [operator, setOperator] = useState(initialFilter?.operator || '=');
  const [filterValue, setFilterValue] = useState(initialFilter?.value || '');
  const [rowExpression, setRowExpression] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onApplyFilter) {
      if (filterTab === 'column') {
        onApplyFilter({
          column: selectedColumn,
          key: selectedColumn,
          operator,
          value: filterValue,
        });
      } else {
        onApplyFilter({
          type: 'row',
          expression: rowExpression,
          value: rowExpression,
        });
      }
    }
    onClose();
  };

  const handleClear = () => {
    if (onApplyFilter) {
      onApplyFilter(null);
    }
    onClose();
  };

  return (
    <div className="apex-modal-overlay" style={{ zIndex: 1200 }}>
      <div className="apex-modal-container apex-filter-modal-dialog" style={{ maxWidth: '620px', width: '92%' }}>
        {/* Header matching APEX Reference Screenshot 3 */}
        <div className="apex-modal-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#1e293b' }}>
              Filter
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

        {/* Filter Type Navigation Tabs (Column / Row) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            borderBottom: '1px solid #e2e8f0',
            backgroundColor: '#ffffff',
            padding: '0 20px',
            gap: '1.5rem',
          }}
          className="apex-filter-tabs"
        >
          <button
            type="button"
            onClick={() => setFilterTab('column')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 4px',
              border: 'none',
              background: 'transparent',
              fontSize: '0.825rem',
              fontWeight: 600,
              color: filterTab === 'column' ? '#7048e8' : '#64748b',
              borderBottom: filterTab === 'column' ? '2px solid #7048e8' : '2px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <IconColumns size={15} style={{ color: filterTab === 'column' ? '#7048e8' : '#94a3b8' }} />
            <span>Column</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterTab('row')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 4px',
              border: 'none',
              background: 'transparent',
              fontSize: '0.825rem',
              fontWeight: 600,
              color: filterTab === 'row' ? '#7048e8' : '#64748b',
              borderBottom: filterTab === 'row' ? '2px solid #7048e8' : '2px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <IconTable size={15} style={{ color: filterTab === 'row' ? '#7048e8' : '#94a3b8' }} />
            <span>Row</span>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="apex-modal-body" style={{ padding: '18px 20px' }}>
            {filterTab === 'column' ? (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: operator === 'isNull' || operator === 'isNotNull' ? '1fr 1fr' : '1fr 140px 1.2fr',
                  gap: '12px',
                  alignItems: 'flex-start',
                }}
              >
                {/* Column Selection */}
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: '#475569',
                      marginBottom: '6px',
                    }}
                  >
                    Column
                  </label>
                  <select
                    value={selectedColumn}
                    onChange={(e) => setSelectedColumn(e.target.value)}
                    className="apex-form-input apex-modal-select"
                    style={{
                      width: '100%',
                      height: '36px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      padding: '0 10px',
                      fontSize: '0.825rem',
                      color: '#0f172a',
                      backgroundColor: '#ffffff',
                    }}
                  >
                    {columns.map((col) => (
                      <option key={col.id || col.key} value={col.id || col.key}>
                        {col.label || col.title || col.id || col.key}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Operator Selection */}
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: '#475569',
                      marginBottom: '6px',
                    }}
                  >
                    Operator
                  </label>
                  <select
                    value={operator}
                    onChange={(e) => setOperator(e.target.value)}
                    className="apex-form-input apex-modal-select"
                    style={{
                      width: '100%',
                      height: '36px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      padding: '0 10px',
                      fontSize: '0.825rem',
                      color: '#0f172a',
                      backgroundColor: '#ffffff',
                    }}
                  >
                    <option value="=">=</option>
                    <option value="!=">!=</option>
                    <option value="contains">contains</option>
                    <option value="starts with">starts with</option>
                    <option value="ends with">ends with</option>
                    <option value="is null">is null</option>
                    <option value="is not null">is not null</option>
                    <option value=">">&gt;</option>
                    <option value=">=">&gt;=</option>
                    <option value="<">&lt;</option>
                    <option value="<=">&lt;=</option>
                  </select>
                </div>

                {/* Expression / Value */}
                {operator !== 'is null' && operator !== 'is not null' && (
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: '#475569',
                        marginBottom: '6px',
                      }}
                    >
                      Expression
                    </label>
                    <input
                      type="text"
                      value={filterValue}
                      onChange={(e) => setFilterValue(e.target.value)}
                      placeholder=""
                      className="apex-form-input apex-modal-input"
                      style={{
                        width: '100%',
                        height: '36px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        padding: '0 12px',
                        fontSize: '0.825rem',
                        color: '#0f172a',
                        backgroundColor: '#ffffff',
                      }}
                      autoFocus
                    />
                  </div>
                )}
              </div>
            ) : (
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: '#475569',
                    marginBottom: '6px',
                  }}
                >
                  Row Filter Expression (SQL / Condition)
                </label>
                <input
                  type="text"
                  value={rowExpression}
                  onChange={(e) => setRowExpression(e.target.value)}
                  placeholder="e.g. status = 'Active' and country = 'United States'"
                  className="apex-form-input apex-modal-input"
                  style={{
                    width: '100%',
                    height: '36px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    padding: '0 12px',
                    fontSize: '0.825rem',
                    color: '#0f172a',
                    backgroundColor: '#ffffff',
                  }}
                  autoFocus
                />
              </div>
            )}
          </div>

          {/* Footer matching APEX Reference Screenshot 3 */}
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
            {(initialFilter || filterValue) && (
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
                Clear Filter
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
