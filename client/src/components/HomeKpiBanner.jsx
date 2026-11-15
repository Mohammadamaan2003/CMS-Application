import React from 'react';
import { IconBuilding, IconUsers, IconLightbulb } from './Icons';

export default function HomeKpiBanner({
  stats,
  isLoading,
  onRefresh,
  onNavigateToContacts,
  onNavigateToCompanies,
  onNavigateToLeads,
}) {
  const totalCompanies = stats?.totalCompanies ?? 0;
  const totalContacts = stats?.totalContacts ?? 0;
  const totalLeads = stats?.totalLeads ?? 0;

  return (
    <div className="apex-kpi-grid" role="region" aria-label="Key Performance Indicators">
      {/* Total Companies KPI Card */}
      <div
        className="apex-kpi-card kpi-blue interactive"
        onClick={() => {
          if (onNavigateToCompanies) onNavigateToCompanies();
          else if (onRefresh) onRefresh();
        }}
        title="Total companies registered in the application (Click to view Companies Report)"
        role="button"
        tabIndex={0}
      >
        <div className="apex-kpi-content">
          <div className="apex-kpi-label-row">
            <span className="apex-kpi-label">Total Companies</span>
            <span className="apex-kpi-badge badge-blue">Registered</span>
          </div>
          <div className="apex-kpi-value">
            {isLoading ? '...' : totalCompanies.toLocaleString()}
          </div>
          <div className="apex-kpi-subtext">
            <span>Corporate accounts in application</span>
          </div>
        </div>
        <div className="apex-kpi-icon-wrap icon-blue">
          <IconBuilding size={24} />
        </div>
      </div>

      {/* Total Contacts KPI Card */}
      <div
        className="apex-kpi-card kpi-green interactive"
        onClick={() => {
          if (onNavigateToContacts) onNavigateToContacts();
          else window.location.hash = '#/contacts';
        }}
        title="Total contacts registered in the application (Click to view Contacts Report)"
        role="button"
        tabIndex={0}
      >
        <div className="apex-kpi-content">
          <div className="apex-kpi-label-row">
            <span className="apex-kpi-label">Total Contacts</span>
            <span className="apex-kpi-badge badge-green">Connected</span>
          </div>
          <div className="apex-kpi-value">
            {isLoading ? '...' : totalContacts.toLocaleString()}
          </div>
          <div className="apex-kpi-subtext">
            <span>Individual contacts &bull; Click to view &rarr;</span>
          </div>
        </div>
        <div className="apex-kpi-icon-wrap icon-green">
          <IconUsers size={24} />
        </div>
      </div>

      {/* Total Leads KPI Card */}
      <div
        className="apex-kpi-card kpi-amber interactive"
        onClick={() => {
          if (onNavigateToLeads) onNavigateToLeads();
          else window.location.hash = '#/leads';
        }}
        title="Total leads registered in the application (Click to view Leads Report)"
        role="button"
        tabIndex={0}
      >
        <div className="apex-kpi-content">
          <div className="apex-kpi-label-row">
            <span className="apex-kpi-label">Total Leads</span>
            <span className="apex-kpi-badge badge-amber">Active</span>
          </div>
          <div className="apex-kpi-value">
            {isLoading ? '...' : totalLeads.toLocaleString()}
          </div>
          <div className="apex-kpi-subtext">
            <span>Sales opportunities &bull; Click to view &rarr;</span>
          </div>
        </div>
        <div className="apex-kpi-icon-wrap icon-amber">
          <IconLightbulb size={24} />
        </div>
      </div>
    </div>
  );
}
