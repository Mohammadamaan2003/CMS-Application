import React, { useState } from 'react';
import { IconClose, IconFilter } from './Icons';

export default function ApexFilterModal({
  isOpen,
  onClose,
  columns = [],
  onApplyFilter,
  initialFilter = null,
}) {
  const [selectedColumn, setSelectedColumn] = useState(initialFilter?.column || (columns[0]?.id || ''));
  const [operator, setOperator] = useState(initialFilter?.operator || 'contains');
  const [filterValue, setFilterValue] = useState(initialFilter?.value || '');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onApplyFilter) {
      onApplyFilter({
        column: selectedColumn,
        operator,
        value: filterValue,
      });
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
    <div className="apex-modal-overlay">
      <div className="apex-modal-container apex-filter-modal-dialog">
        <div className="apex-modal-header">
          <div className="apex-modal-title">
            <IconFilter size={18} />
            <span>Filter</span>
          </div>
          <button type="button" className="apex-modal-close" onClick={onClose}>
            <IconClose size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="apex-modal-body" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.35rem' }}>
                  Column
                </label>
                <select
                  value={selectedColumn}
                  onChange={(e) => setSelectedColumn(e.target.value)}
                  className="apex-form-input"
                  style={{ width: '100%' }}
                >
                  {columns.map((col) => (
                    <option key={col.id} value={col.id}>
                      {col.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.35rem' }}>
                  Operator
                </label>
                <select
                  value={operator}
                  onChange={(e) => setOperator(e.target.value)}
                  className="apex-form-input"
                  style={{ width: '100%' }}
                >
                  <option value="contains">Contains (case insensitive)</option>
                  <option value="equals">Equals (=)</option>
                  <option value="startsWith">Starts With</option>
                  <option value="isNotNull">Is Not Null</option>
                  <option value="isNull">Is Null</option>
                </select>
              </div>
            </div>

            {operator !== 'isNull' && operator !== 'isNotNull' && (
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.35rem' }}>
                  Expression / Value
                </label>
                <input
                  type="text"
                  value={filterValue}
                  onChange={(e) => setFilterValue(e.target.value)}
                  placeholder="Enter filter term..."
                  className="apex-form-input"
                  style={{ width: '100%' }}
                  autoFocus
                />
              </div>
            )}
          </div>

          <div className="apex-modal-footer">
            <button
              type="button"
              className="apex-btn apex-btn-secondary"
              onClick={handleClear}
            >
              Clear Filter
            </button>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                className="apex-btn apex-btn-secondary"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="apex-btn apex-btn-primary"
              >
                Apply
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

