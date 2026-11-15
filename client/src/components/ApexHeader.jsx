import React, { useState } from 'react';
import {
  IconMenu,
  IconUser,
  IconChevronDown,
  IconShield,
  IconBriefcase,
  IconUsers,
  IconEye,
  IconCheckCircle,
  IconAlertTriangle,
} from './Icons';

export default function ApexHeader({
  onToggleSidebar,
  activeTab,
  onTabChange,
  currentUser,
  onSwitchUser,
  availableUsers = [],
}) {
  const [showUserMenu, setShowUserMenu] = useState(false);

  const role = (currentUser?.role || 'admin').toLowerCase();

  const roleBadgeStyles = {
    admin: { bg: '#eef2ff', text: '#4338ca', border: '#c7d2fe', label: 'Admin', icon: IconShield },
    sales: { bg: '#f0f9ff', text: '#0369a1', border: '#bae6fd', label: 'Sales', icon: IconBriefcase },
    marketing: { bg: '#ecfdf5', text: '#047857', border: '#a7f3d0', label: 'Marketing', icon: IconUsers },
    viewer: { bg: '#f8fafc', text: '#475569', border: '#cbd5e1', label: 'Viewer', icon: IconEye },
  }[role] || { bg: '#f1f5f9', text: '#334155', border: '#cbd5e1', label: role, icon: IconUser };

  const CurrentRoleIcon = roleBadgeStyles.icon;

  const handleSelectUser = (u) => {
    if (!u.can_login) {
      alert(`Access Denied: User '${u.full_name}' has login disabled (can_login=false) by an administrator.`);
      return;
    }
    if (onSwitchUser) onSwitchUser(u);
    setShowUserMenu(false);
  };

  return (
    <header className="apex-topbar">
      <div className="apex-topbar-left">
        <button
          type="button"
          className="apex-hamburger-btn"
          onClick={onToggleSidebar}
          title="Toggle Navigation Menu"
          aria-label="Toggle Navigation"
        >
          <IconMenu size={22} />
        </button>

        {/* Branded IQRA Logo Box */}
        <div
          className="iqra-logo-box"
          onClick={() => onTabChange('dashboard')}
          role="button"
          tabIndex={0}
          title="Home"
        >
          <div className="iqra-logo-mark">
            <svg width="28" height="28" viewBox="0 0 100 100" fill="none">
              <circle cx="50" cy="50" r="46" stroke="#1d4ed8" strokeWidth="4" strokeDasharray="6 3" />
              <ellipse cx="50" cy="50" rx="46" ry="18" stroke="#0284c7" strokeWidth="3" />
              <ellipse cx="50" cy="50" rx="18" ry="46" stroke="#0284c7" strokeWidth="3" />
              <line x1="4" y1="50" x2="96" y2="50" stroke="#1d4ed8" strokeWidth="3" />
              <line x1="50" y1="4" x2="50" y2="96" stroke="#1d4ed8" strokeWidth="3" />
            </svg>
          </div>
          <div className="iqra-logo-text">
            <span className="iqra-title">IQRA</span>
            <span className="iqra-subtitle">TECHNOLOGY</span>
          </div>
        </div>

        {/* System Title */}
        <div className="apex-app-title">
          <span>Customer Management System</span>
        </div>
      </div>

      {/* User Role Switcher & Profile Dropdown on the far right */}
      <div className="apex-topbar-right">
        {/* Quick Role Simulation Badge */}
        <div
          className="role-simulator-badge"
          title="Active role and session simulation. Switch user to test role-based access without logging in."
        >
          <span className="role-simulator-label">
            Simulate Role:
          </span>
          <select
            className="role-simulator-select"
            value={currentUser?.id || 1}
            onChange={(e) => {
              const selectedId = Number(e.target.value);
              const target = availableUsers.find((u) => u.id === selectedId);
              if (target) handleSelectUser(target);
            }}
          >
            {availableUsers.map((u) => (
              <option key={u.id} value={u.id} disabled={!u.can_login}>
                {u.full_name} ({u.role.toUpperCase()}) {!u.can_login ? '— BLOCKED' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Profile Dropdown */}
        <div className="user-profile-menu">
          <button
            type="button"
            className="user-profile-btn"
            onClick={() => setShowUserMenu(!showUserMenu)}
          >
            <div
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                backgroundColor: roleBadgeStyles.bg,
                color: roleBadgeStyles.text,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 600,
                fontSize: '0.75rem',
                border: `1px solid ${roleBadgeStyles.border}`,
                flexShrink: 0,
              }}
            >
              {(currentUser?.full_name || 'A')[0].toUpperCase()}
            </div>
            <span className="user-name">
              {currentUser?.full_name || 'Amaan'}
            </span>
            <span
              className="user-role-badge"
              style={{
                backgroundColor: roleBadgeStyles.bg,
                color: roleBadgeStyles.text,
                border: `1px solid ${roleBadgeStyles.border}`,
              }}
            >
              {role}
            </span>
            <IconChevronDown size={14} style={{ flexShrink: 0 }} />
          </button>

          {showUserMenu && (
            <div
              className="user-dropdown-card"
              style={{
                position: 'absolute',
                right: 0,
                top: 'calc(100% + 6px)',
                width: '290px',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
                zIndex: 1000,
                padding: '0.75rem 0',
              }}
            >
              {/* User Identity Info */}
              <div style={{ padding: '0.5rem 1rem', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CurrentRoleIcon size={16} style={{ color: roleBadgeStyles.text }} />
                  <strong style={{ fontSize: '0.875rem', color: '#0f172a' }}>
                    {currentUser?.full_name || 'Amaan'}
                  </strong>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                  {currentUser?.email || 'amaan@iqratechnology.com'}
                </div>
                <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      padding: '2px 8px',
                      borderRadius: '10px',
                      backgroundColor: roleBadgeStyles.bg,
                      color: roleBadgeStyles.text,
                      border: `1px solid ${roleBadgeStyles.border}`,
                      fontWeight: 600,
                    }}
                  >
                    Role: {roleBadgeStyles.label}
                  </span>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      padding: '2px 8px',
                      borderRadius: '10px',
                      backgroundColor: currentUser?.can_login !== false ? '#dcfce7' : '#fee2e2',
                      color: currentUser?.can_login !== false ? '#15803d' : '#b91c1c',
                      fontWeight: 600,
                    }}
                  >
                    {currentUser?.can_login !== false ? 'Login Allowed' : 'Login Blocked'}
                  </span>
                </div>
              </div>

              {/* Navigation Shortcuts based on role */}
              <div style={{ padding: '0.4rem 0', borderBottom: '1px solid #f1f5f9' }}>
                <button
                  type="button"
                  className="user-dropdown-item"
                  onClick={() => {
                    onTabChange('dashboard');
                    setShowUserMenu(false);
                  }}
                  style={{ width: '100%', textAlign: 'left', padding: '0.45rem 1rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}
                >
                  Dashboard Overview
                </button>
                <button
                  type="button"
                  className="user-dropdown-item"
                  onClick={() => {
                    onTabChange('companies');
                    setShowUserMenu(false);
                  }}
                  style={{ width: '100%', textAlign: 'left', padding: '0.45rem 1rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}
                >
                  Companies Report
                </button>
                <button
                  type="button"
                  className="user-dropdown-item"
                  onClick={() => {
                    onTabChange('contacts');
                    setShowUserMenu(false);
                  }}
                  style={{ width: '100%', textAlign: 'left', padding: '0.45rem 1rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}
                >
                  Contacts Report
                </button>

                {role === 'admin' && (
                  <button
                    type="button"
                    className="user-dropdown-item"
                    onClick={() => {
                      onTabChange('user_management');
                      setShowUserMenu(false);
                    }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '0.45rem 1rem',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      color: '#4338ca',
                      fontWeight: 600,
                    }}
                  >
                    Users Management
                  </button>
                )}
              </div>

              {/* Switch Role / User List */}
              <div style={{ padding: '0.5rem 1rem 0.25rem' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                  Simulate Another User:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', maxHeight: '180px', overflowY: 'auto' }}>
                  {availableUsers.map((u) => {
                    const isSelected = u.id === (currentUser?.id || 1);
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => handleSelectUser(u)}
                        disabled={!u.can_login}
                        title={!u.can_login ? 'Cannot switch: Login blocked by administrator' : `Switch to ${u.full_name}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.35rem 0.5rem',
                          borderRadius: '4px',
                          border: isSelected ? '1px solid #93c5fd' : '1px solid transparent',
                          background: isSelected ? '#eff6ff' : 'transparent',
                          cursor: !u.can_login ? 'not-allowed' : 'pointer',
                          opacity: !u.can_login ? 0.45 : 1,
                          textAlign: 'left',
                          fontSize: '0.775rem',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: isSelected ? 700 : 500, color: isSelected ? '#1d4ed8' : '#334155' }}>
                            {u.full_name}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                            {u.role.toUpperCase()} • @{u.username}
                          </div>
                        </div>
                        <div>
                          {!u.can_login ? (
                            <span style={{ fontSize: '0.65rem', color: '#dc2626', fontWeight: 600 }}>BLOCKED</span>
                          ) : isSelected ? (
                            <IconCheckCircle size={14} style={{ color: '#2563eb' }} />
                          ) : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
