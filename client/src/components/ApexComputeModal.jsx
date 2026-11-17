import React, { useState, useEffect } from 'react';
import { IconClose, IconCalculator } from './Icons';

/**
 * ApexComputeModal - Create Calculated Display Columns
 * Allows creating dynamically calculated columns from existing record fields.
 */
export default function ApexComputeModal({
  isOpen,
  onClose,
  columns = [],
  computations = [],
  onApplyCompute,
  onDeleteCompute,
}) {
  const [columnLabel, setColumnLabel] = useState('');
  const [colA, setColA] = useState('');
  const [operator, setOperator] = useState('*');
  const [colB, setColB] = useState('');
  const [constantVal, setConstantVal] = useState('');
  const [useConstant, setUseConstant] = useState(false);
  const [formatMask, setFormatMask] = useState('none');

  useEffect(() => {
    if (isOpen) {
      setColumnLabel('');
      const firstNum = columns.find((c) => /amount|rate|price|total|count|cost/i.test(c.key || c.id));
      setColA(firstNum ? (firstNum.key || firstNum.id) : (columns[0]?.key || columns[0]?.id || ''));
      setColB(columns[1]?.key || columns[1]?.id || '');
      setConstantVal('');
      setUseConstant(false);
      setOperator('*');
      setFormatMask('none');
    }
  }, [isOpen, columns]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!columnLabel.trim()) {
      alert('Please enter a column heading for the computed column.');
      return;
    }
    if (!colA) {
      alert('Please select a base column.');
      return;
    }

    const newComp = {
      id: `comp_${Date.now()}`,
      label: columnLabel.trim(),
      colA,
      operator,
      useConstant,
      colB: useConstant ? null : colB,
      constantVal: useConstant ? Number(constantVal) || 0 : null,
      formatMask,
    };

    if (onApplyCompute) {
      onApplyCompute(newComp);
    }
    onClose();
  };

  return (
    <div className="apex-modal-overlay" style={{ zIndex: 1200 }}>
      <div
        className="apex-modal-card apex-modal-container"
        style={{
          maxWidth: '560px',
          width: '92%',
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          boxShadow: '0 20px 45px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
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
          <div className="apex-modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#1e293b' }}>
              Compute
            </h3>
          </div>
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

        <form onSubmit={handleSubmit}>
          <div className="apex-modal-body" style={{ padding: '1.25rem' }}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.35rem' }}>
                Column Heading
              </label>
              <input
                type="text"
                placeholder="e.g. Total Revenue, Net Amount, Full Spec"
                value={columnLabel}
                onChange={(e) => setColumnLabel(e.target.value)}
                className="apex-form-input"
                style={{ width: '100%' }}
                required
                autoFocus
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 1fr', gap: '0.5rem', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                  First Operand
                </label>
                <select
                  value={colA}
                  onChange={(e) => setColA(e.target.value)}
                  className="apex-form-input"
                  style={{ width: '100%' }}
                >
                  {columns.map((col) => (
                    <option key={col.key || col.id} value={col.key || col.id}>
                      {col.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem', textAlign: 'center' }}>
                  Operator
                </label>
                <select
                  value={operator}
                  onChange={(e) => setOperator(e.target.value)}
                  className="apex-form-input"
                  style={{ width: '100%', textAlign: 'center' }}
                >
                  <option value="*">* (Multiply)</option>
                  <option value="+">+ (Add)</option>
                  <option value="-">- (Subtract)</option>
                  <option value="/">/ (Divide)</option>
                  <option value="concat">|| (Join Text)</option>
                </select>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>
                    Second Operand
                  </label>
                  <button
                    type="button"
                    onClick={() => setUseConstant(!useConstant)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#0284c7',
                      fontSize: '0.7rem',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    {useConstant ? 'Use Column' : 'Use Number'}
                  </button>
                </div>

                {useConstant ? (
                  <input
                    type="number"
                    step="any"
                    placeholder="Enter number..."
                    value={constantVal}
                    onChange={(e) => setConstantVal(e.target.value)}
                    className="apex-form-input"
                    style={{ width: '100%' }}
                    required
                  />
                ) : (
                  <select
                    value={colB}
                    onChange={(e) => setColB(e.target.value)}
                    className="apex-form-input"
                    style={{ width: '100%' }}
                  >
                    <option value="">- Select Column -</option>
                    {columns.map((col) => (
                      <option key={col.key || col.id} value={col.key || col.id}>
                        {col.label}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.35rem' }}>
                Format Mask
              </label>
              <select
                value={formatMask}
                onChange={(e) => setFormatMask(e.target.value)}
                className="apex-form-input"
                style={{ width: '100%' }}
              >
                <option value="none">Standard Display</option>
                <option value="currency_usd">USD Currency ($ 1,234.00)</option>
                <option value="currency_inr">INR Currency (₹ 1,23,456.00)</option>
                <option value="percent">Percentage (%)</option>
                <option value="integer">Integer (rounded)</option>
              </select>
            </div>

            {computations && computations.length > 0 && (
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem', marginTop: '0.75rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>Active Computations:</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                  {computations.map((c) => (
                    <span
                      key={c.id}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: '#eff6ff',
                        color: '#1d4ed8',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                      }}
                    >
                      <span>{c.label}</span>
                      <button
                        type="button"
                        onClick={() => onDeleteCompute && onDeleteCompute(c.id)}
                        style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: 0 }}
                        title="Remove computation"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div
            className="apex-modal-footer"
            style={{
              padding: '12px 20px',
              borderTop: '1px solid #f1f5f9',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              backgroundColor: '#ffffff',
            }}
          >
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
        </form>
      </div>
    </div>
  );
}
