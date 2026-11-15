import React, { useMemo, useState } from 'react';
import { IconClose, IconBarChart } from './Icons';

export default function ApexChartModal({
  isOpen,
  onClose,
  title = 'Interactive Chart',
  data = [],
  groupByColumns = [],
}) {
  const [selectedGroupCol, setSelectedGroupCol] = useState(groupByColumns[0]?.id || 'industry');

  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    const counts = {};
    for (const item of data) {
      const val = item[selectedGroupCol] || 'Unassigned / Blank';
      counts[val] = (counts[val] || 0) + 1;
    }
    const sorted = Object.entries(counts)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    const max = Math.max(...sorted.map((s) => s.count), 1);
    return sorted.map((s) => ({ ...s, percent: Math.round((s.count / max) * 100) }));
  }, [data, selectedGroupCol]);

  if (!isOpen) return null;

  return (
    <div className="apex-modal-overlay">
      <div className="apex-modal-container" style={{ maxWidth: '640px', width: '92%' }}>
        <div className="apex-modal-header">
          <div className="apex-modal-title">
            <IconBarChart size={18} />
            <span>{title}</span>
          </div>
          <button type="button" className="apex-modal-close" onClick={onClose}>
            <IconClose size={18} />
          </button>
        </div>

        <div className="apex-modal-body" style={{ padding: '1.25rem' }}>
          {groupByColumns.length > 1 && (
            <div style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>
                Group By:
              </label>
              <select
                value={selectedGroupCol}
                onChange={(e) => setSelectedGroupCol(e.target.value)}
                className="apex-form-input"
                style={{ width: 'auto', minWidth: '200px' }}
              >
                {groupByColumns.map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {chartData.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: '160px',
                    fontSize: '0.8rem',
                    fontWeight: 500,
                    color: '#334155',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    textAlign: 'right',
                  }}
                  title={item.label}
                >
                  {item.label}
                </div>
                <div style={{ flex: 1, backgroundColor: '#f1f5f9', height: '22px', borderRadius: '4px', overflow: 'hidden', position: 'relative' }}>
                  <div
                    style={{
                      width: `${item.percent}%`,
                      height: '100%',
                      backgroundColor: '#2563eb',
                      borderRadius: '4px',
                      transition: 'width 0.3s ease',
                    }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      right: '8px',
                      top: '2px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: item.percent > 70 ? '#ffffff' : '#334155',
                    }}
                  >
                    {item.count.toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="apex-modal-footer">
          <button type="button" className="apex-btn apex-btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

