import React, { useState } from 'react';
import iqraLogo from '../assets/iqra-logo.png';
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
  IconSun,
  IconMoon,
} from './Icons';

export default function ApexHeader({
  onToggleSidebar,
  activeTab,
  onTabChange,
  currentUser,
  onSwitchUser,
  availableUsers = [],
  theme = 'light',
  onToggleTheme,
}) {
  const [showUserMenu, setShowUserMenu] = useState(false);

  const role = (currentUser?.role || 'admin').toLowerCase();

  const isDark = theme === 'dark';

  const roleBadgeStyles = isDark ? {
    admin: { bg: 'rgba(99, 102, 241, 0.25)', text: '#e0e7ff', border: 'rgba(129, 140, 248, 0.5)', label: 'Admin', icon: IconShield },
    sales: { bg: 'rgba(56, 189, 248, 0.25)', text: '#e0f2fe', border: 'rgba(56, 189, 248, 0.5)', label: 'Sales', icon: IconBriefcase },
    marketing: { bg: 'rgba(52, 211, 153, 0.25)', text: '#d1fae5', border: 'rgba(52, 211, 153, 0.5)', label: 'Marketing', icon: IconUsers },
    viewer: { bg: 'rgba(148, 163, 184, 0.25)', text: '#f1f5f9', border: 'rgba(148, 163, 184, 0.5)', label: 'Viewer', icon: IconEye },
  }[role] || { bg: 'rgba(148, 163, 184, 0.25)', text: '#f1f5f9', border: 'rgba(148, 163, 184, 0.5)', label: role, icon: IconUser }
  : {
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
          <img
            src={iqraLogo}
            alt="IQRA Technology"
            className="iqra-brand-logo"
          />
        </div>

        {/* System Title */}
        <div className="apex-app-title">
          <span>Customer Management System</span>
        </div>
      </div>

      {/* User Role Switcher, Theme Switcher & Profile Dropdown on the far right */}
      <div className="apex-topbar-right">
        {/* Light / Dark / Blue Theme Switcher Pill Button */}
        <button
          type="button"
          className="apex-theme-toggle-btn"
          onClick={() => onToggleTheme && onToggleTheme()}
          title={`Currently ${theme === 'dark' ? 'Dark' : theme === 'blue' ? 'Blue' : 'Light'} theme. Click to switch theme.`}
          aria-label={`Switch theme`}
        >
          <span className="apex-theme-toggle-indicator">
            {theme === 'dark' ? (
              <IconMoon size={14} className="theme-icon-moon" />
            ) : theme === 'blue' ? (
              <span style={{ fontSize: '11px', lineHeight: 1 }}>🔷</span>
            ) : (
              <IconSun size={14} className="theme-icon-sun" />
            )}
          </span>
          <span className="apex-theme-toggle-label">
            {theme === 'dark' ? 'Dark' : theme === 'blue' ? 'Blue' : 'Light'}
          </span>
        </button>

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
                background: 'var(--bg-surface, #111C2E)',
                border: '1px solid var(--border, #26364F)',
                borderRadius: '8px',
                boxShadow: '0 10px 25px -3px rgba(0,0,0,0.5)',
                zIndex: 1000,
                padding: '0.75rem 0',
              }}
            >
              {/* User Identity Info */}
              <div style={{ padding: '0.5rem 1rem', borderBottom: '1px solid var(--border, #26364F)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CurrentRoleIcon size={16} style={{ color: roleBadgeStyles.text }} />
                  <strong style={{ fontSize: '0.875rem', color: 'var(--text-main, #F1F5F9)' }}>
                    {currentUser?.full_name || 'Amaan'}
                  </strong>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94A3B8)', marginTop: '2px' }}>
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
                      backgroundColor: currentUser?.can_login !== false ? (isDark ? 'rgba(52, 211, 153, 0.2)' : '#dcfce7') : (isDark ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2'),
                      color: currentUser?.can_login !== false ? (isDark ? '#6ee7b7' : '#15803d') : (isDark ? '#fca5a5' : '#b91c1c'),
                      fontWeight: 600,
                    }}
                  >
                    {currentUser?.can_login !== false ? 'Login Allowed' : 'Login Blocked'}
                  </span>
                </div>
              </div>

              {/* Navigation Shortcuts based on role */}
              <div style={{ padding: '0.4rem 0', borderBottom: '1px solid var(--border, #26364F)' }}>
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

              {/* Theme Selection Section */}
              <div
                className="user-dropdown-theme-row"
                style={{
                  padding: '0.6rem 1rem',
                  borderBottom: '1px solid var(--border, #26364F)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.785rem', fontWeight: 600, color: 'var(--text-main, #F1F5F9)' }}>
                  {theme === 'dark' ? <IconMoon size={14} style={{ color: '#818cf8' }} /> : theme === 'blue' ? <span style={{ fontSize: '13px' }}>🔷</span> : <IconSun size={14} style={{ color: '#d97706' }} />}
                  <span>Interface Theme:</span>
                </div>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    background: 'var(--bg-input, #161616)',
                    borderRadius: '6px',
                    padding: '2px',
                    gap: '2px',
                    border: '1px solid var(--border, #2C2C2C)',
                  }}
                  className="theme-switch-pills"
                >
                  <button
                    type="button"
                    onClick={() => onToggleTheme && onToggleTheme('dark')}
                    style={{
                      border: 'none',
                      background: theme === 'dark' ? 'var(--btn-primary, #2563EB)' : 'transparent',
                      color: theme === 'dark' ? '#ffffff' : 'var(--text-muted, #A3A3A3)',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      fontSize: '0.725rem',
                      fontWeight: theme === 'dark' ? 700 : 500,
                      cursor: 'pointer',
                      boxShadow: theme === 'dark' ? '0 1px 3px rgba(0,0,0,0.3)' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <IconMoon size={12} /> Dark
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleTheme && onToggleTheme('blue')}
                    style={{
                      border: 'none',
                      background: theme === 'blue' ? 'var(--btn-primary, #0284c7)' : 'transparent',
                      color: theme === 'blue' ? '#ffffff' : 'var(--text-muted, #A3A3A3)',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      fontSize: '0.725rem',
                      fontWeight: theme === 'blue' ? 700 : 500,
                      cursor: 'pointer',
                      boxShadow: theme === 'blue' ? '0 1px 3px rgba(0,0,0,0.3)' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <span>🔷</span> Blue
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleTheme && onToggleTheme('light')}
                    style={{
                      border: 'none',
                      background: theme === 'light' ? '#ffffff' : 'transparent',
                      color: theme === 'light' ? '#0f172a' : 'var(--text-muted, #A3A3A3)',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      fontSize: '0.725rem',
                      fontWeight: theme === 'light' ? 700 : 500,
                      cursor: 'pointer',
                      boxShadow: theme === 'light' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <IconSun size={12} /> Light
                  </button>
                </div>
              </div>

              {/* Switch Role / User List */}
              <div style={{ padding: '0.5rem 1rem 0.25rem' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted, #94A3B8)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
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
                          border: isSelected ? '1px solid #2563EB' : '1px solid transparent',
                          background: isSelected ? (isDark ? 'rgba(37, 99, 235, 0.25)' : '#eff6ff') : 'transparent',
                          color: 'var(--text-main, #F1F5F9)',
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
