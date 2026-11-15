import React from 'react';
import HomeKpiBanner from '../components/HomeKpiBanner';

export default function Dashboard({
  stats,
  isLoading,
  onNavigate,
  onRefreshStats,
}) {
  return (
    <div className="apex-home-view">
      {/* Page Heading */}
      <div className="apex-page-header-row" style={{ marginBottom: '1.25rem' }}>
        <h1 className="apex-page-heading">Home</h1>
      </div>

      {/* KPI Section: Total Companies, Total Contacts & Total Leads */}
      <HomeKpiBanner
        stats={stats}
        isLoading={isLoading}
        onRefresh={onRefreshStats}
        onNavigateToCompanies={() => {
          if (onNavigate) onNavigate('companies');
          else window.location.hash = '#/companies';
        }}
        onNavigateToContacts={() => {
          if (onNavigate) onNavigate('contacts');
          else window.location.hash = '#/contacts';
        }}
        onNavigateToLeads={() => {
          if (onNavigate) onNavigate('leads');
          else window.location.hash = '#/leads';
        }}
      />
    </div>
  );
}
