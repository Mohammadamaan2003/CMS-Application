import React from 'react';
import { IconDashboard, IconBuilding, IconUsers } from './Icons';

export default function Navbar({ activeTab, onTabChange }) {
  return (
    <header className="navbar">
      <div className="navbar-inner">
        <div className="nav-brand" onClick={() => onTabChange('dashboard')}>
          <div className="brand-icon-wrapper">
            <IconBuilding size={18} />
          </div>
          <span>CMS Portal</span>
          <span className="badge badge-primary" style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>
            PostgreSQL + MCP
          </span>
        </div>

        <nav className="nav-links">
          <button
            type="button"
            className={`nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => onTabChange('dashboard')}
          >
            <IconDashboard size={15} />
            <span>Dashboard</span>
          </button>

          <button
            type="button"
            className={`nav-btn ${activeTab === 'companies' ? 'active' : ''}`}
            onClick={() => onTabChange('companies')}
          >
            <IconBuilding size={15} />
            <span>Companies Report</span>
          </button>

          <button
            type="button"
            className={`nav-btn ${activeTab === 'contacts' ? 'active' : ''}`}
            onClick={() => onTabChange('contacts')}
          >
            <IconUsers size={15} />
            <span>Contacts Report</span>
          </button>
        </nav>
      </div>
    </header>
  );
}
