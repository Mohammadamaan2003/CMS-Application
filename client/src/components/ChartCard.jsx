import React from 'react';

/**
 * Reusable Interactive Bar Chart Card with Accessible Colors, Tooltips, and Click Handlers
 */
export default function ChartCard({
  title,
  subtitle,
  data = [],
  total = 1,
  barColor = '#2563eb',
  onItemClick,
}) {
  const maxVal = Math.max(...data.map((d) => d.count), 1);

  return (
    <div
      className="apex-chart-card"
      style={{
        background: '#ffffff',
        borderRadius: '10px',
        border: '1px solid #e2e8f0',
        padding: '18px 20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ marginBottom: '14px' }}>
        <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
          {title}
        </h4>
        {subtitle && (
          <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
            {subtitle}
          </p>
        )}
      </div>

      {data.length === 0 ? (
        <div style={{ padding: '24px 0', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
          No data matches the selected filters
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', flex: 1 }}>
          {data.map((item, idx) => {
            const pctOfMax = Math.round((item.count / maxVal) * 100);
            const pctOfTotal = total > 0 ? Math.round((item.count / total) * 1000) / 10 : 0;

            return (
              <div
                key={idx}
                onClick={() => onItemClick && onItemClick(item)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: onItemClick ? 'pointer' : 'default',
                  padding: '2px 4px',
                  borderRadius: '4px',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  if (onItemClick) e.currentTarget.style.background = '#f8fafc';
                }}
                onMouseLeave={(e) => {
                  if (onItemClick) e.currentTarget.style.background = 'transparent';
                }}
                title={`${item.label}: ${item.count.toLocaleString()} (${pctOfTotal}% of total). Click to view in report.`}
              >
                <div
                  style={{
                    width: '130px',
                    fontSize: '12px',
                    color: '#334155',
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    textAlign: 'right',
                  }}
                  title={item.label}
                >
                  {item.label}
                </div>

                <div
                  style={{
                    flex: 1,
                    background: '#f1f5f9',
                    height: '20px',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    position: 'relative',
                  }}
                >
                  <div
                    style={{
                      width: `${pctOfMax}%`,
                      height: '100%',
                      background: barColor,
                      borderRadius: '4px',
                      transition: 'width 0.4s ease',
                    }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      right: '6px',
                      top: '2px',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: pctOfMax > 80 ? '#ffffff' : '#475569',
                    }}
                  >
                    {item.count.toLocaleString()}
                  </span>
                </div>

                <div
                  style={{
                    width: '45px',
                    textAlign: 'right',
                    fontSize: '11px',
                    color: '#64748b',
                    fontWeight: 600,
                  }}
                >
                  {pctOfTotal}%
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
