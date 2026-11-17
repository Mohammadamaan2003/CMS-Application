import React from 'react';
import { IconSigma, IconClose } from './Icons';
import { computeAggregationValue } from '../utils/aggregationUtils';

/**
 * ActiveAggregationsBar - Displays active aggregation chips above report tables
 */
export default function ActiveAggregationsBar({
  aggregations = [],
  data = [],
  onEditAggregation,
  onRemoveAggregation,
  onClearAll,
}) {
  if (!aggregations || aggregations.length === 0) return null;

  return (
    <div
      className="apex-active-aggregations-bar"
      style={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.5rem',
        marginBottom: '0.75rem',
        padding: '0.4rem 0.6rem',
        backgroundColor: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '6px',
      }}
    >
      <span
        style={{
          fontSize: '0.75rem',
          fontWeight: 700,
          color: '#475569',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}
      >
        <IconSigma size={14} /> Aggregations:
      </span>

      {aggregations.map((agg) => {
        const val = computeAggregationValue(data, agg.func, agg.columnKey);
        return (
          <div
            key={agg.id}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '4px',
              padding: '2px 8px',
              fontSize: '0.775rem',
              color: '#1e293b',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
            }}
          >
            <button
              type="button"
              onClick={() => onEditAggregation && onEditAggregation(agg)}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                color: '#1e293b',
                fontWeight: 600,
              }}
              title="Click to edit aggregation"
            >
              <span>{agg.func}</span>({agg.columnLabel || agg.columnKey}):{' '}
              <span style={{ color: '#2563eb', fontWeight: 700 }}>{val}</span>
            </button>

            <button
              type="button"
              onClick={() => onRemoveAggregation && onRemoveAggregation(agg.id)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#94a3b8',
                padding: '2px',
                display: 'flex',
                alignItems: 'center',
              }}
              title="Remove aggregation"
            >
              <IconClose size={12} />
            </button>
          </div>
        );
      })}

      {aggregations.length > 1 && (
        <button
          type="button"
          onClick={onClearAll}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '0.725rem',
            color: '#dc2626',
            cursor: 'pointer',
            padding: '2px 4px',
            fontWeight: 600,
          }}
        >
          Clear All
        </button>
      )}
    </div>
  );
}

