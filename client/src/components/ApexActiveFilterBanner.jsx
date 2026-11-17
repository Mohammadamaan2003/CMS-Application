import React from 'react';
import { IconClose } from './Icons';

/**
 * ApexActiveFilterBanner
 * Renders the active column filter indicator chip matching Oracle APEX interactive report design:
 * Filter: [ Column = "Value" (x) ]                   Clear Filter
 */
export default function ApexActiveFilterBanner({ filter, columns = [], onClear }) {
  if (!filter || !filter.key || !filter.value) return null;
  const colObj = columns.find((c) => (c.key || c.id) === filter.key);
  const colLabel = colObj?.label || colObj?.title || filter.key;

  return (
    <div
      className="apex-active-filter-banner"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 12px',
        backgroundColor: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '4px',
        marginBottom: '0.65rem',
        fontSize: '0.8rem',
      }}
    >
      <span style={{ fontWeight: 600, color: '#475569' }}>Filter:</span>
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          backgroundColor: '#eff6ff',
          border: '1px solid #bfdbfe',
          color: '#1d4ed8',
          borderRadius: '4px',
          padding: '2px 8px',
          fontWeight: 500,
        }}
      >
        <span>
          {colLabel} = &quot;{filter.value}&quot;
        </span>
        <button
          type="button"
          onClick={onClear}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: '#1d4ed8',
            display: 'flex',
            alignItems: 'center',
            padding: 0,
          }}
          title="Remove filter"
        >
          <IconClose size={12} />
        </button>
      </div>
      <button
        type="button"
        onClick={onClear}
        style={{
          background: 'transparent',
          border: 'none',
          color: '#ef4444',
          cursor: 'pointer',
          fontWeight: 600,
          fontSize: '0.75rem',
          marginLeft: 'auto',
          textDecoration: 'underline',
        }}
      >
        Clear Filter
      </button>
    </div>
  );
}
