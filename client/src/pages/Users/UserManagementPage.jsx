import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../../api/client';
import {
  IconSearch,
  IconEye,
  IconEyeOff,
  IconChevronDown,
  IconCheckCircle,
  IconAlertTriangle,
  IconRefresh,
} from '../../components/Icons';

export default function UserManagementPage({ onShowToast, currentUser, onUserSwitched }) {
  const formRef = useRef(null);

  // Users list state
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  // Search & Filter
  const [searchInput, setSearchInput] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [showActionsDropdown, setShowActionsDropdown] = useState(false);
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('all');

  // Form State (matching top form from screenshot)
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('admin');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Edit mode
  const [editingUserId, setEditingUserId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch users from API
  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        search: activeSearch,
        role: selectedRoleFilter,
        limit: 100,
        sortBy: 'id',
        sortOrder: 'ASC',
      };
      const res = await api.getUsers(params);
      if (res && res.success) {
        setUsers(res.data || []);
        setTotal(res.total || 0);
      }
    } catch (err) {
      if (onShowToast) onShowToast(err.message || 'Failed to fetch users', 'error');
    } finally {
      setLoading(false);
    }
  }, [activeSearch, selectedRoleFilter, onShowToast]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Handle Form Submit (Create or Update User)
  const handleSubmitForm = async (e) => {
    e.preventDefault();

    if (!fullName.trim()) {
      if (onShowToast) onShowToast('Full Name is required', 'warning');
      return;
    }
    if (!username.trim()) {
      if (onShowToast) onShowToast('Username is required', 'warning');
      return;
    }
    if (!email.trim()) {
      if (onShowToast) onShowToast('Email is required', 'warning');
      return;
    }
    if (password && confirmPassword && password !== confirmPassword) {
      if (onShowToast) onShowToast('Password and Confirm Password do not match', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingUserId) {
        // Update user
        const payload = {
          full_name: fullName.trim(),
          username: username.trim(),
          email: email.trim(),
          role,
        };
        if (password) payload.password = password;

        const res = await api.updateUser(editingUserId, payload);
        if (res && res.success) {
          if (onShowToast) onShowToast(`User '${fullName}' updated successfully.`, 'success');
          resetForm();
          loadUsers();
        }
      } else {
        // Create user
        const payload = {
          full_name: fullName.trim(),
          username: username.trim().toUpperCase(),
          email: email.trim(),
          role,
          password: password || 'Welcome@123',
          can_login: true,
          status: 'Active',
        };

        const res = await api.createUser(payload);
        if (res && res.success) {
          if (onShowToast) onShowToast(`User '${fullName}' created successfully.`, 'success');
          resetForm();
          loadUsers();
        }
      }
    } catch (err) {
      if (onShowToast) onShowToast(err.message || 'Operation failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFullName('');
    setUsername('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setRole('admin');
    setEditingUserId(null);
  };

  // Pre-fill form for Edit
  const handleEditClick = (user) => {
    setEditingUserId(user.id);
    setFullName(user.full_name || '');
    setUsername(user.username || '');
    setEmail(user.email || '');
    setRole(user.role || 'sales');
    setPassword('');
    setConfirmPassword('');

    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Toggle Login / Deactivate
  const handleToggleDeactivate = async (user) => {
    if (user.id === 1) {
      if (onShowToast) onShowToast('Primary System Administrator cannot be deactivated.', 'warning');
      return;
    }

    const newCanLogin = !user.can_login;
    const actionLabel = newCanLogin ? 'Activated' : 'Deactivated';

    // Optimistic UI update
    setUsers((prev) =>
      prev.map((u) =>
        u.id === user.id
          ? { ...u, can_login: newCanLogin, status: newCanLogin ? 'Active' : 'Inactive' }
          : u
      )
    );

    try {
      const res = await api.toggleUserLogin(user.id, newCanLogin);
      if (res && res.success) {
        if (onShowToast) {
          onShowToast(`User '${user.full_name}' was ${actionLabel}.`, newCanLogin ? 'success' : 'warning');
        }
      }
    } catch (err) {
      loadUsers();
      if (onShowToast) onShowToast(err.message || 'Failed to update user status', 'error');
    }
  };

  // Search Go button
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setActiveSearch(searchInput.trim());
  };

  // Helper date formatter: M/D/YYYY
  const formatDate = (isoString) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return '';
      return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
    } catch (e) {
      return '';
    }
  };

  // Role display label matching screenshot format
  const getRoleDisplay = (userRole) => {
    const r = (userRole || '').toLowerCase();
    if (r === 'admin') return 'Administrator, All, Marketing, Sales';
    if (r === 'sales') return 'Sales';
    if (r === 'marketing') return 'Marketing';
    if (r === 'viewer') return 'Viewer';
    return userRole || 'Sales';
  };

  return (
    <div style={{ padding: '1.25rem 2rem 3rem', backgroundColor: '#f8fafc', minHeight: 'calc(100vh - 60px)' }}>
      {/* ========================================================
          TOP SECTION: USER FORM (Matches Screenshot Row & Grid)
          ======================================================== */}
      <div
        ref={formRef}
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          padding: '1.5rem 2rem 1.25rem',
          marginBottom: '2rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        {editingUserId && (
          <div
            style={{
              marginBottom: '1rem',
              padding: '0.5rem 1rem',
              backgroundColor: '#fef3c7',
              border: '1px solid #fde68a',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.825rem',
              color: '#92400e',
            }}
          >
            <span>
              <strong>Editing Mode:</strong> Updating details for user ID #{editingUserId}. (Leave password blank to keep current password).
            </span>
            <button
              type="button"
              onClick={resetForm}
              style={{
                background: 'none',
                border: 'none',
                color: '#b45309',
                cursor: 'pointer',
                fontWeight: 600,
                textDecoration: 'underline',
              }}
            >
              Cancel Edit
            </button>
          </div>
        )}

        <form onSubmit={handleSubmitForm}>
          {/* Row 1: Full Name, Username, Email */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              columnGap: '2.5rem',
              rowGap: '1.25rem',
              alignItems: 'center',
              marginBottom: '1.25rem',
            }}
          >
            {/* Full Name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <label
                style={{
                  minWidth: '100px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: '#0f172a',
                }}
              >
                Full Name
              </label>
              <div style={{ flex: 1, position: 'relative' }}>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder=""
                  style={{
                    width: '100%',
                    height: '36px',
                    padding: '0 0.75rem',
                    borderRadius: '4px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.85rem',
                    backgroundColor: '#ffffff',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* Username */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <label
                style={{
                  minWidth: '90px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: '#0f172a',
                }}
              >
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder=""
                style={{
                  flex: 1,
                  height: '36px',
                  padding: '0 0.75rem',
                  borderRadius: '4px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                  backgroundColor: '#ffffff',
                  outline: 'none',
                }}
              />
            </div>

            {/* Email */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <label
                style={{
                  minWidth: '70px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: '#0f172a',
                }}
              >
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder=""
                style={{
                  flex: 1,
                  height: '36px',
                  padding: '0 0.75rem',
                  borderRadius: '4px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                  backgroundColor: '#ffffff',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          {/* Row 2: Password, Confirm Password, Role */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              columnGap: '2.5rem',
              rowGap: '1.25rem',
              alignItems: 'center',
              marginBottom: '1.5rem',
            }}
          >
            {/* Password */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <label
                style={{
                  minWidth: '100px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: '#0f172a',
                }}
              >
                Password
              </label>
              <div style={{ flex: 1, position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder=""
                  style={{
                    width: '100%',
                    height: '36px',
                    padding: '0 2.2rem 0 0.75rem',
                    borderRadius: '4px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.85rem',
                    backgroundColor: '#ffffff',
                    outline: 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#64748b',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <label
                style={{
                  minWidth: '90px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: '#0f172a',
                }}
              >
                Confirm Password
              </label>
              <div style={{ flex: 1, position: 'relative' }}>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder=""
                  style={{
                    width: '100%',
                    height: '36px',
                    padding: '0 2.2rem 0 0.75rem',
                    borderRadius: '4px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.85rem',
                    backgroundColor: '#ffffff',
                    outline: 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#64748b',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  title={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                </button>
              </div>
            </div>

            {/* Role */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <label
                style={{
                  minWidth: '70px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: '#0f172a',
                }}
              >
                Role
              </label>
              <div style={{ flex: 1, position: 'relative' }}>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  style={{
                    width: '100%',
                    height: '36px',
                    padding: '0 2rem 0 0.75rem',
                    borderRadius: '4px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.85rem',
                    backgroundColor: '#ffffff',
                    outline: 'none',
                    cursor: 'pointer',
                    appearance: 'none',
                  }}
                >
                  <option value="admin">Administrator, All, Marketing, Sales</option>
                  <option value="sales">Sales</option>
                  <option value="marketing">Marketing</option>
                  <option value="viewer">Viewer</option>
                </select>
                <span
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none',
                    color: '#64748b',
                  }}
                >
                  <IconChevronDown size={14} />
                </span>
              </div>
            </div>
          </div>

          {/* Create User Button (Aligned to the Right under Role) */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                backgroundColor: '#0b1a30',
                color: '#ffffff',
                border: 'none',
                borderRadius: '4px',
                padding: '9px 26px',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 4px rgba(11,26,48,0.15)',
                transition: 'background-color 0.2s',
              }}
            >
              {isSubmitting ? 'Saving...' : editingUserId ? 'Update User' : 'Create User'}
            </button>
          </div>
        </form>
      </div>

      {/* ========================================================
          BOTTOM SECTION: APPLICATION USERS TABLE CARD
          ======================================================== */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        {/* Dark Navy Blue Header Banner */}
        <div
          style={{
            backgroundColor: '#0b1a30',
            color: '#ffffff',
            padding: '14px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, letterSpacing: '-0.01em' }}>
            Application Users
          </h2>
          <button
            type="button"
            onClick={loadUsers}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.775rem',
            }}
            title="Refresh Users"
          >
            <IconRefresh size={14} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Interactive Report Toolbar (Search + Go + Actions) */}
        <div
          style={{
            padding: '10px 16px',
            backgroundColor: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          {/* Left Toolbar Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            {/* Search Input matching screenshot */}
            <form onSubmit={handleSearchSubmit} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px',
                  height: '34px',
                  width: '240px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2px',
                    padding: '0 6px 0 8px',
                    color: '#64748b',
                  }}
                >
                  <IconSearch size={14} />
                  <IconChevronDown size={11} />
                </div>
                <input
                  type="text"
                  placeholder="Search"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  style={{
                    border: 'none',
                    outline: 'none',
                    fontSize: '0.825rem',
                    width: '100%',
                    height: '100%',
                    paddingRight: '8px',
                  }}
                />
              </div>

              {/* Go Button */}
              <button
                type="submit"
                style={{
                  height: '34px',
                  padding: '0 14px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px',
                  fontSize: '0.825rem',
                  fontWeight: 600,
                  color: '#1e293b',
                  cursor: 'pointer',
                }}
              >
                Go
              </button>
            </form>

            {/* Actions Dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setShowActionsDropdown(!showActionsDropdown)}
                style={{
                  height: '34px',
                  padding: '0 12px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px',
                  fontSize: '0.825rem',
                  fontWeight: 500,
                  color: '#1e293b',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                <span>Actions</span>
                <IconChevronDown size={12} />
              </button>

              {showActionsDropdown && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    marginTop: '4px',
                    width: '180px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '4px',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                    zIndex: 50,
                    padding: '4px 0',
                  }}
                >
                  <div style={{ padding: '4px 12px', fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>
                    FILTER BY ROLE
                  </div>
                  {['all', 'admin', 'sales', 'marketing', 'viewer'].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => {
                        setSelectedRoleFilter(r);
                        setShowActionsDropdown(false);
                      }}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '6px 12px',
                        background: selectedRoleFilter === r ? '#eff6ff' : 'none',
                        border: 'none',
                        fontSize: '0.8rem',
                        color: selectedRoleFilter === r ? '#1d4ed8' : '#334155',
                        fontWeight: selectedRoleFilter === r ? 600 : 400,
                        cursor: 'pointer',
                        textTransform: 'capitalize',
                      }}
                    >
                      {r === 'all' ? 'All Roles' : r}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {(activeSearch || selectedRoleFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput('');
                  setActiveSearch('');
                  setSelectedRoleFilter('all');
                }}
                style={{
                  height: '34px',
                  padding: '0 10px',
                  backgroundColor: '#f1f5f9',
                  border: '1px solid #e2e8f0',
                  borderRadius: '4px',
                  fontSize: '0.775rem',
                  color: '#64748b',
                  cursor: 'pointer',
                }}
              >
                Clear Filter
              </button>
            )}
          </div>

          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Total Users: <strong>{total}</strong>
          </div>
        </div>

        {/* Data Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '12px 16px', fontSize: '0.825rem', fontWeight: 600, color: '#334155' }}>
                  User Name
                </th>
                <th style={{ padding: '12px 16px', fontSize: '0.825rem', fontWeight: 600, color: '#334155' }}>
                  Full Name
                </th>
                <th style={{ padding: '12px 16px', fontSize: '0.825rem', fontWeight: 600, color: '#334155' }}>
                  Email
                </th>
                <th style={{ padding: '12px 16px', fontSize: '0.825rem', fontWeight: 600, color: '#334155' }}>
                  Application Role
                </th>
                <th style={{ padding: '12px 16px', fontSize: '0.825rem', fontWeight: 600, color: '#334155' }}>
                  Status
                </th>
                <th style={{ padding: '12px 16px', fontSize: '0.825rem', fontWeight: 600, color: '#334155' }}>
                  Date Created
                </th>
                <th style={{ padding: '12px 16px', fontSize: '0.825rem', fontWeight: 600, color: '#334155' }}>
                  Date Last Login
                </th>
                <th style={{ padding: '12px 16px', fontSize: '0.825rem', fontWeight: 600, color: '#334155', textAlign: 'center', width: '220px' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                    Loading application users...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                    No users found matching current filters.
                  </td>
                </tr>
              ) : (
                users.map((user) => {
                  const isDeactivated = !user.can_login || user.status === 'Inactive' || user.status === 'Blocked';
                  const isProtectedAdmin = user.id === 1;

                  return (
                    <tr
                      key={user.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        backgroundColor: '#ffffff',
                        transition: 'background-color 0.15s',
                      }}
                    >
                      {/* User Name */}
                      <td style={{ padding: '12px 16px', fontSize: '0.825rem', fontWeight: 600, color: '#0f172a' }}>
                        {user.username}
                      </td>

                      {/* Full Name */}
                      <td style={{ padding: '12px 16px', fontSize: '0.825rem', color: '#334155' }}>
                        {user.full_name || '—'}
                      </td>

                      {/* Email */}
                      <td style={{ padding: '12px 16px', fontSize: '0.825rem', color: '#334155' }}>
                        {user.email}
                      </td>

                      {/* Application Role */}
                      <td style={{ padding: '12px 16px', fontSize: '0.825rem', color: '#334155' }}>
                        {getRoleDisplay(user.role)}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '12px 16px', fontSize: '0.825rem' }}>
                        <span
                          style={{
                            color: isDeactivated ? '#dc2626' : '#059669',
                            fontWeight: 600,
                          }}
                        >
                          {isDeactivated ? 'Inactive' : 'Active'}
                        </span>
                      </td>

                      {/* Date Created */}
                      <td style={{ padding: '12px 16px', fontSize: '0.825rem', color: '#475569' }}>
                        {formatDate(user.created_at) || '11/2/2026'}
                      </td>

                      {/* Date Last Login */}
                      <td style={{ padding: '12px 16px', fontSize: '0.825rem', color: '#475569' }}>
                        {formatDate(user.last_login_at) || (user.id === 1 ? '11/13/2026' : '')}
                      </td>

                      {/* Actions: Edit (amber) & Deactivate / Activate (red/green) */}
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem' }}>
                          {/* Edit Button (Amber / Golden Brown) */}
                          <button
                            type="button"
                            onClick={() => handleEditClick(user)}
                            style={{
                              backgroundColor: '#b45309',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '4px',
                              padding: '5px 16px',
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              minWidth: '60px',
                              boxShadow: '0 1px 2px rgba(180,83,9,0.2)',
                            }}
                          >
                            Edit
                          </button>

                          {/* Deactivate / Activate Button */}
                          <button
                            type="button"
                            onClick={() => handleToggleDeactivate(user)}
                            disabled={isProtectedAdmin}
                            title={
                              isProtectedAdmin
                                ? 'Primary Administrator cannot be deactivated'
                                : isDeactivated
                                ? 'Activate login for this user'
                                : 'Deactivate login for this user'
                            }
                            style={{
                              backgroundColor: isDeactivated ? '#16a34a' : '#dc2626',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '4px',
                              padding: '5px 14px',
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              cursor: isProtectedAdmin ? 'not-allowed' : 'pointer',
                              opacity: isProtectedAdmin ? 0.45 : 1,
                              minWidth: '85px',
                              boxShadow: isDeactivated
                                ? '0 1px 2px rgba(22,163,74,0.2)'
                                : '0 1px 2px rgba(220,38,38,0.2)',
                            }}
                          >
                            {isDeactivated ? 'Activate' : 'Deactivate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
