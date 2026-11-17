import React, { useState } from 'react';
import { IconClose } from './Icons';

const PRESETS = {
  yellow: { label: 'Warm Yellow', bg: '#fef08a', text: '#854d0e' },
  green: { label: 'Success Green', bg: '#bbf7d0', text: '#166534' },
  blue: { label: 'Soft Blue', bg: '#bfdbfe', text: '#1e40af' },
  red: { label: 'Alert Red', bg: '#fecaca', text: '#991b1b' },
  purple: { label: 'Royal Purple', bg: '#e9d5ff', text: '#6b21a8' },
};

/**
 * ApexHighlightModal - Format -> Highlight
 * Row formatting with color presets matching APEX Reference Standard.
 */
export default function ApexHighlightModal({
  isOpen,
  onClose,
  columns = [],
  highlights = [],
  onApplyHighlight,
  onDeleteHighlight,
}) {
  const [highlightName, setHighlightName] = useState('');
  const [columnKey, setColumnKey] = useState(columns[0]?.key || columns[0]?.id || '');
  const [operator, setOperator] = useState('equals');
  const [value, setValue] = useState('');
  const [colorPreset, setColorPreset] = useState('yellow');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!columnKey || !value) return;

    const preset = PRESETS[colorPreset] || PRESETS.yellow;
    const newHighlight = {
      id: Date.now().toString(),
      name: highlightName.trim() || `${columnKey} ${operator} ${value}`,
      columnKey,
      operator,
      value,
      bg: preset.bg,
      text: preset.text,
    };

    if (onApplyHighlight) {
      onApplyHighlight(newHighlight);
    }
    onClose();
  };

  return (
    <div className="apex-modal-overlay" style={{ zIndex: 1200 }}>
      <div
        className="apex-modal-container"
        style={{
          maxWidth: '540px',
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
            Highlight
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
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                Name
              </label>
              <input
                type="text"
                placeholder="e.g. High Priority, Overdue"
                value={highlightName}
                onChange={(e) => setHighlightName(e.target.value)}
                className="apex-modal-input"
                style={{ width: '100%', height: '36px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.825rem', backgroundColor: '#ffffff', color: '#0f172a' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: '12px', marginBottom: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                  Column
                </label>
                <select
                  value={columnKey}
                  onChange={(e) => setColumnKey(e.target.value)}
                  className="apex-modal-select"
                  style={{ width: '100%', height: '36px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.825rem', backgroundColor: '#ffffff', color: '#0f172a' }}
                >
                  {columns.map((col) => (
                    <option key={col.key || col.id} value={col.key || col.id}>
                      {col.label || col.title || col.key || col.id}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                  Operator
                </label>
                <select
                  value={operator}
                  onChange={(e) => setOperator(e.target.value)}
                  className="apex-modal-select"
                  style={{ width: '100%', height: '36px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.825rem', backgroundColor: '#ffffff', color: '#0f172a' }}
                >
                  <option value="equals">equals</option>
                  <option value="contains">contains</option>
                  <option value="greaterThan">&gt;</option>
                  <option value="lessThan">&lt;</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                Expression / Target Value
              </label>
              <input
                type="text"
                placeholder="Target value..."
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="apex-modal-input"
                style={{ width: '100%', height: '36px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.825rem', backgroundColor: '#ffffff', color: '#0f172a' }}
                required
              />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                Highlight Color
              </label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {Object.entries(PRESETS).map(([k, p]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setColorPreset(k)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: colorPreset === k ? '2px solid #7048e8' : '1px solid #cbd5e1',
                      backgroundColor: p.bg,
                      color: p.text,
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {highlights && highlights.length > 0 && (
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '10px', marginTop: '10px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>Active Highlights:</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                  {highlights.map((h) => (
                    <span
                      key={h.id}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: h.bg,
                        color: h.text,
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                      }}
                    >
                      <span>{h.name}</span>
                      <button
                        type="button"
                        onClick={() => onDeleteHighlight && onDeleteHighlight(h.id)}
                        style={{ background: 'none', border: 'none', color: h.text, cursor: 'pointer', padding: 0 }}
                        title="Remove highlight"
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
              alignItems: 'center',
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
