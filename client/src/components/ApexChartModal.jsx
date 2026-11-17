import React, { useState, useMemo } from 'react';
import { IconClose, IconBarChart } from './Icons';

/**
 * ApexChartModal
 * Recreated precisely to match Oracle APEX Chart Modal (User Reference Screenshot 6):
 * - Header: "Chart" with circular close button
 * - Chart Type Selector: Bar (active with purple underline), Line with Area, Pie, Line
 * - Form grid: Label, Axis Title for Label, Value, Axis Title for Value, Function, Orientation, Sort
 * - Footer: Cancel and purple Apply button
 */
export default function ApexChartModal({
  isOpen,
  onClose,
  columns = [],
  data = [],
  groupByColumns = [],
  onApplyChart,
}) {
  const allCols = columns.length > 0 ? columns : groupByColumns;

  const [chartType, setChartType] = useState('bar'); // 'bar' | 'area' | 'pie' | 'line'
  const [labelCol, setLabelCol] = useState(allCols[0]?.key || allCols[0]?.id || '');
  const [axisTitleLabel, setAxisTitleLabel] = useState('');
  const [valueCol, setValueCol] = useState(allCols[1]?.key || allCols[1]?.id || '');
  const [axisTitleValue, setAxisTitleValue] = useState('');
  const [func, setFunc] = useState('Count');
  const [orientation, setOrientation] = useState('Vertical');
  const [sort, setSort] = useState('Default');
  const [activeTab, setActiveTab] = useState('config'); // 'config' | 'preview'

  // Computed chart data
  const chartPoints = useMemo(() => {
    if (!data || data.length === 0 || !labelCol) return [];
    const counts = {};
    for (const item of data) {
      const raw = item[labelCol];
      const val = raw !== undefined && raw !== null && raw !== '' ? String(raw) : '(Blank)';
      if (func === 'Count') {
        counts[val] = (counts[val] || 0) + 1;
      } else if (valueCol) {
        const num = parseFloat(String(item[valueCol]).replace(/[^0-9.-]/g, '')) || 0;
        counts[val] = (counts[val] || 0) + num;
      }
    }

    let list = Object.entries(counts).map(([label, count]) => ({ label, count }));

    if (sort === 'Label - Ascending') list.sort((a, b) => a.label.localeCompare(b.label));
    else if (sort === 'Label - Descending') list.sort((a, b) => b.label.localeCompare(a.label));
    else if (sort === 'Value - Ascending') list.sort((a, b) => a.count - b.count);
    else if (sort === 'Value - Descending') list.sort((a, b) => b.count - a.count);
    else list.sort((a, b) => b.count - a.count);

    list = list.slice(0, 10);
    const max = Math.max(...list.map((s) => s.count), 1);
    return list.map((s) => ({ ...s, percent: Math.round((s.count / max) * 100) }));
  }, [data, labelCol, valueCol, func, sort]);

  if (!isOpen) return null;

  const handleApply = (e) => {
    if (e) e.preventDefault();
    if (onApplyChart) {
      onApplyChart({
        chartType,
        labelCol,
        axisTitleLabel,
        valueCol,
        axisTitleValue,
        func,
        orientation,
        sort,
      });
    }
    onClose();
  };

  return (
    <div className="apex-modal-overlay" style={{ zIndex: 1200 }}>
      <div
        className="apex-modal-container"
        style={{
          maxWidth: '650px',
          width: '92%',
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          boxShadow: '0 20px 45px rgba(0,0,0,0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header matching APEX Reference Screenshot 6 */}
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
              Chart
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

        {/* Chart Type Selector Tabs matching Screenshot 6 */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            borderBottom: '1px solid #e2e8f0',
            backgroundColor: '#ffffff',
            textAlign: 'center',
          }}
        >
          {[
            { id: 'bar', label: 'Bar', icon: '📊' },
            { id: 'area', label: 'Line with Area', icon: '📈' },
            { id: 'pie', label: 'Pie', icon: '🥧' },
            { id: 'line', label: 'Line', icon: '📉' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setChartType(t.id)}
              style={{
                padding: '12px 8px',
                border: 'none',
                background: 'transparent',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: chartType === t.id ? '#7048e8' : '#64748b',
                borderBottom: chartType === t.id ? '2px solid #7048e8' : '2px solid transparent',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.15s ease',
              }}
            >
              <span style={{ fontSize: '18px' }}>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        <form onSubmit={handleApply}>
          <div className="apex-modal-body" style={{ padding: '20px', backgroundColor: '#ffffff', maxHeight: '70vh', overflowY: 'auto' }}>
            {/* View Mode Toggle: Configuration / Chart Preview */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '14px' }}>
              <button
                type="button"
                onClick={() => setActiveTab(activeTab === 'config' ? 'preview' : 'config')}
                style={{
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  color: '#475569',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {activeTab === 'config' ? 'Show Live Preview' : 'Show Parameters'}
              </button>
            </div>

            {activeTab === 'config' ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 14px' }}>
                {/* Row 1: Label | Axis Title for Label */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                    Label
                  </label>
                  <select
                    value={labelCol}
                    onChange={(e) => setLabelCol(e.target.value)}
                    className="apex-modal-select"
                    style={{ width: '100%', height: '36px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.825rem', backgroundColor: '#ffffff', color: '#0f172a' }}
                  >
                    <option value="">- Select Column -</option>
                    {allCols.map((c) => (
                      <option key={c.key || c.id} value={c.key || c.id}>
                        {c.label || c.title || c.key || c.id}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                    Axis Title for Label
                  </label>
                  <input
                    type="text"
                    value={axisTitleLabel}
                    onChange={(e) => setAxisTitleLabel(e.target.value)}
                    placeholder=""
                    className="apex-modal-input"
                    style={{ width: '100%', height: '36px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.825rem', backgroundColor: '#ffffff', color: '#0f172a' }}
                  />
                </div>

                {/* Row 2: Value | Axis Title for Value */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                    Value
                  </label>
                  <select
                    value={valueCol}
                    onChange={(e) => setValueCol(e.target.value)}
                    className="apex-modal-select"
                    style={{ width: '100%', height: '36px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.825rem', backgroundColor: '#ffffff', color: '#0f172a' }}
                  >
                    <option value="">- Select Column -</option>
                    {allCols.map((c) => (
                      <option key={c.key || c.id} value={c.key || c.id}>
                        {c.label || c.title || c.key || c.id}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                    Axis Title for Value
                  </label>
                  <input
                    type="text"
                    value={axisTitleValue}
                    onChange={(e) => setAxisTitleValue(e.target.value)}
                    placeholder=""
                    className="apex-modal-input"
                    style={{ width: '100%', height: '36px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.825rem', backgroundColor: '#ffffff', color: '#0f172a' }}
                  />
                </div>

                {/* Row 3: Function | Orientation */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                    Function
                  </label>
                  <select
                    value={func}
                    onChange={(e) => setFunc(e.target.value)}
                    className="apex-modal-select"
                    style={{ width: '100%', height: '36px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.825rem', backgroundColor: '#ffffff', color: '#0f172a' }}
                  >
                    <option value="Count">Count</option>
                    <option value="Sum">Sum</option>
                    <option value="Average">Average</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                    Orientation
                  </label>
                  <select
                    value={orientation}
                    onChange={(e) => setOrientation(e.target.value)}
                    className="apex-modal-select"
                    style={{ width: '100%', height: '36px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.825rem', backgroundColor: '#ffffff', color: '#0f172a' }}
                  >
                    <option value="Vertical">Vertical</option>
                    <option value="Horizontal">Horizontal</option>
                  </select>
                </div>

                {/* Row 4: Sort */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                    Sort
                  </label>
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                    className="apex-modal-select"
                    style={{ width: '100%', height: '36px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.825rem', backgroundColor: '#ffffff', color: '#0f172a' }}
                  >
                    <option value="Default">Default</option>
                    <option value="Label - Ascending">Label - Ascending</option>
                    <option value="Label - Descending">Label - Descending</option>
                    <option value="Value - Ascending">Value - Ascending</option>
                    <option value="Value - Descending">Value - Descending</option>
                  </select>
                </div>
              </div>
            ) : (
              /* Live Chart Visualization with Solid Opaque Card */
              <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '16px' }}>
                <h4 style={{ margin: '0 0 12px', fontSize: '0.9rem', color: '#0f172a' }}>
                  {axisTitleLabel || labelCol} Distribution ({func})
                </h4>
                {chartPoints.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                    No chart data available for selected columns.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {chartPoints.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.775rem' }}>
                        <span style={{ width: '140px', textAlign: 'right', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 500, color: '#334155' }}>
                          {item.label}
                        </span>
                        <div style={{ flex: 1, backgroundColor: '#f1f5f9', height: '18px', borderRadius: '4px', overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${item.percent}%`,
                              height: '100%',
                              backgroundColor: '#7048e8',
                              borderRadius: '4px',
                              transition: 'width 0.3s ease',
                            }}
                          />
                        </div>
                        <span style={{ width: '50px', fontWeight: 700, color: '#0f172a', textAlign: 'right' }}>
                          {item.count.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer matching APEX Reference Screenshot 6 */}
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
