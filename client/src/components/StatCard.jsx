import React from 'react';

export default function StatCard({ label, value, subtext, icon, color = 'blue' }) {
  const colorClass = {
    blue: 'stat-icon-blue',
    green: 'stat-icon-green',
    purple: 'stat-icon-purple',
    amber: 'stat-icon-amber',
  }[color] || 'stat-icon-blue';

  return (
    <div className="stat-card">
      <div>
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
        {subtext && <div className="stat-subtext">{subtext}</div>}
      </div>
      <div className={`stat-icon-wrapper ${colorClass}`}>
        {icon}
      </div>
    </div>
  );
}

