import React, { useState, useEffect } from 'react';
import { IconClose } from './Icons';

/**
 * ApexAggregateModal - Aggregate Dialog matching Screenshot
 * Supports: Sum, Average, Count, Count Distinct, Minimum, Maximum, Median
 */
export default function ApexAggregateModal({
  isOpen,
  onClose,
  columns = [],
  aggregations = [],
  onApply,
  onDelete,
}) {
  const [selectedAggId, setSelectedAggId] = useState('new');
  const [func, setFunc] = useState('Sum');
  const [columnKey, setColumnKey] = useState('');

  // Set default column when opened
  useEffect(() => {
    if (isOpen) {
      if (aggregations && aggregations.length > 0 && selectedAggId !== 'new') {
        const found = aggregations.find((a) => a.id === selectedAggId);
        if (found) {
          setFunc(found.func);
          setColumnKey(found.columnKey);
          return;
        }
      }
      setSelectedAggId('new');
      setFunc('Sum');
      // Default to first numeric column or first column
      const numCol = columns.find((c) =>
        /count|id|total|revenue|num|amount/i.test(c.key)
      );
      setColumnKey(numCol ? numCol.key : (columns[0]?.key || ''));
    }
  }, [isOpen, columns, aggregations, selectedAggId]);

  if (!isOpen) return null;

  const handleAggSelectChange = (e) => {
    const val = e.target.value;
    setSelectedAggId(val);
    if (val === 'new') {
      setFunc('Sum');
      const numCol = columns.find((c) =>
        /count|id|total|revenue|num|amount/i.test(c.key)
      );
      setColumnKey(numCol ? numCol.key : (columns[0]?.key || ''));
    } else {
      const existing = aggregations.find((a) => String(a.id) === String(val));
      if (existing) {
        setFunc(existing.func);
        setColumnKey(existing.columnKey);
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!func || func === '- Select Function -') {
      alert('Please select an aggregation function.');
      return;
    }
    if (!columnKey || columnKey === '- Select Column -') {
      alert('Please select a column to aggregate.');
      return;
    }

    const selectedCol = columns.find((c) => c.key === columnKey);
    const columnLabel = selectedCol ? selectedCol.label : columnKey;

    onApply({
      id: selectedAggId === 'new' ? `agg_${Date.now()}` : selectedAggId,
      func,
      columnKey,
      columnLabel,
    });
    onClose();
  };

  const handleDelete = () => {
    if (selectedAggId !== 'new' && onDelete) {
      onDelete(selectedAggId);
      setSelectedAggId('new');
      onClose();
    }
  };

  return (
    <div className="apex-modal-overlay" style={{ zIndex: 1200 }}>
      <div
        className="apex-modal-card apex-modal-container"
        style={{
          maxWidth: '460px',
          width: '92%',
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          boxShadow: '0 20px 45px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
        }}
      >
        {/* Header matching Oracle APEX Reference Screenshot */}
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
          <h3
            style={{
              fontSize: '1.05rem',
              fontWeight: 700,
              color: '#1e293b',
              margin: 0,
            }}
          >
            Aggregate
          </h3>
          <button
            type="button"
            className="apex-modal-close"
            onClick={onClose}
            aria-label="Close"
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              border: '1px solid #e2e8f0',
              background: '#ffffff',
              color: '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              transition: 'all 0.15s ease',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#f1f5f9';
              e.currentTarget.style.color = '#0f172a';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = '#ffffff';
              e.currentTarget.style.color = '#64748b';
            }}
          >
            <IconClose size={14} />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} style={{ padding: '1.25rem' }}>
          {/* 1. Aggregation selector */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label
              style={{
                display: 'block',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: '#475569',
                marginBottom: '0.35rem',
              }}
            >
              Aggregation
            </label>
            <select
              className="apex-form-input"
              style={{
                width: '100%',
                height: '38px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                padding: '0 0.75rem',
                fontSize: '0.85rem',
                backgroundColor: '#ffffff',
                cursor: 'pointer',
              }}
              value={selectedAggId}
              onChange={handleAggSelectChange}
            >
              <option value="new">- New Aggregation -</option>
              {aggregations &&
                aggregations.map((agg) => (
                  <option key={agg.id} value={agg.id}>
                    {agg.func} ({agg.columnLabel || agg.columnKey})
                  </option>
                ))}
            </select>
          </div>

          {/* 2. Function & Column Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1rem',
              marginBottom: '1.5rem',
            }}
          >
            {/* Function */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: '#475569',
                  marginBottom: '0.35rem',
                }}
              >
                Function
              </label>
              <select
                className="apex-form-input"
                style={{
                  width: '100%',
                  height: '38px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  padding: '0 0.75rem',
                  fontSize: '0.85rem',
                  backgroundColor: '#ffffff',
                  cursor: 'pointer',
                }}
                value={func}
                onChange={(e) => setFunc(e.target.value)}
              >
                <option value="- Select Function -">- Select Function -</option>
                <option value="Sum">Sum</option>
                <option value="Average">Average</option>
                <option value="Count">Count</option>
                <option value="Count Distinct">Count Distinct</option>
                <option value="Minimum">Minimum</option>
                <option value="Maximum">Maximum</option>
                <option value="Median">Median</option>
              </select>
            </div>

            {/* Column */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: '#475569',
                  marginBottom: '0.35rem',
                }}
              >
                Column
              </label>
              <select
                className="apex-form-input"
                style={{
                  width: '100%',
                  height: '38px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  padding: '0 0.75rem',
                  fontSize: '0.85rem',
                  backgroundColor: '#ffffff',
                  cursor: 'pointer',
                }}
                value={columnKey}
                onChange={(e) => setColumnKey(e.target.value)}
              >
                <option value="- Select Column -">- Select Column -</option>
                {columns.map((col) => (
                  <option key={col.key} value={col.key}>
                    {col.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Footer Buttons matching Screenshot */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderTop: '1px solid #f1f5f9',
              paddingTop: '1rem',
            }}
          >
            <div>
              {selectedAggId !== 'new' && (
                <button
                  type="button"
                  onClick={handleDelete}
                  style={{
                    height: '36px',
                    padding: '0 1rem',
                    backgroundColor: '#fee2e2',
                    border: '1px solid #fca5a5',
                    borderRadius: '6px',
                    fontSize: '0.825rem',
                    fontWeight: 600,
                    color: '#b91c1c',
                    cursor: 'pointer',
                  }}
                >
                  Delete
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
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
                  transition: 'background-color 0.15s ease',
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
                  backgroundColor: '#7048e8',
                  color: '#ffffff',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(112, 72, 232, 0.35)',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#5f3dc4')}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#7048e8')}
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

