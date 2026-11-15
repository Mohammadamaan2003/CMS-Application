import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../../api/client';
import { formatAppDate } from '../../utils/dateUtils';
import ApexActionsMenu from '../../components/ApexActionsMenu';
import SelectColumnsModal from '../../components/SelectColumnsModal';
import ApexFilterModal from '../../components/ApexFilterModal';
import ApexChartModal from '../../components/ApexChartModal';
import ApexAggregateModal from '../../components/ApexAggregateModal';
import ActiveAggregationsBar from '../../components/ActiveAggregationsBar';
import { computeAggregationValue } from '../../utils/aggregationUtils';
import {
  IconSearch,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconFilePenLine,
  IconClose,
  IconCalendar,
  IconTrash,
  IconDownload,
} from '../../components/Icons';

export const LINKEDIN_ACCOUNTS_MASTER_COLUMNS = [
  {
    key: 'master_linkedin_connected_account',
    label: 'Master Linkedin Connected Account',
    getValue: (r) => r.master_linkedin_connected_account || r.linkedin_conn_acc || '',
  },
  {
    key: 'master_contact_count',
    label: 'Master Contact Count',
    getValue: (r) => (r.master_contact_count !== undefined ? Number(r.master_contact_count).toLocaleString() : '0'),
  },
  {
    key: 'linkedin_id',
    label: 'LinkedIn ID',
    getValue: (r) => r.linkedin_id || r.linked_id || '',
  },
  {
    key: 'linkedin_url',
    label: 'LinkedIn URL',
    getValue: (r) => r.linkedin_url || r.linked_in_url || '',
  },
  {
    key: 'account_status',
    label: 'Account Status',
    getValue: (r) => (r.is_active === 'Y' || r.account_status === 'Active' ? 'Active' : 'Inactive'),
  },
  {
    key: 'country',
    label: 'Country',
    getValue: (r) => r.country || '',
  },
  {
    key: 'linkedin_updated_date',
    label: 'LinkedIn Updated Date',
    getValue: (r) => formatAppDate(r.linkedin_updated_date || r.linked_in_updated_date),
  },
  {
    key: 'created_date',
    label: 'Created Date',
    getValue: (r) => formatAppDate(r.created_date),
  },
  {
    key: 'modified_date',
    label: 'Modified Date',
    getValue: (r) => formatAppDate(r.modified_date),
  },
];

const DEFAULT_MASTER_KEYS = LINKEDIN_ACCOUNTS_MASTER_COLUMNS.map((c) => c.key);
export const LINKEDIN_ACCOUNTS_COLUMNS = LINKEDIN_ACCOUNTS_MASTER_COLUMNS;

export default function LinkedinAccountsMaster({ onShowToast, onNavigateToContactForm, onNavigateToCompanyForm }) {
  // Mode: 'report' or 'form' with localStorage persistence
  const [viewMode, setViewMode] = useState(() => {
    try {
      const saved = localStorage.getItem('apex_linkedin_accounts_active_form');
      if (saved) return 'form';
    } catch (e) {}
    return 'report';
  });

  const [selectedRecord, setSelectedRecord] = useState(() => {
    try {
      const saved = localStorage.getItem('apex_linkedin_accounts_active_form');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return null;
  });

  // Form state matching Screenshot 2
  const [formData, setFormData] = useState(() => {
    try {
      const saved = localStorage.getItem('apex_linkedin_accounts_active_form');
      if (saved) {
        const rec = JSON.parse(saved);
        return {
          linkedin_conn_acc: rec.linkedin_conn_acc || rec.master_linkedin_connected_account || '',
          is_active: rec.is_active === 'Y' || rec.is_active === true,
          linked_id: rec.linked_id || rec.linkedin_id || '',
          linked_in_url: rec.linked_in_url || rec.linkedin_url || '',
          country: rec.country || '',
          linked_in_updated_date: formatAppDate(rec.linked_in_updated_date || rec.linkedin_updated_date),
          created_by: rec.created_by || 'APEX_PUBLIC_USER',
          created_date: formatAppDate(rec.created_date) || '20-JUL-2026',
          modified_by: rec.modified_by || 'MARIYA_BADAR',
          modified_date: formatAppDate(rec.modified_date) || '12-NOV-2026',
        };
      }
    } catch (e) {}
    return {
      linkedin_conn_acc: '',
      is_active: true,
      linked_id: '',
      linked_in_url: '',
      country: '',
      linked_in_updated_date: '',
      created_by: 'APEX_PUBLIC_USER',
      created_date: '20-JUL-2026',
      modified_by: 'MARIYA_BADAR',
      modified_date: '12-NOV-2026',
    };
  });

  // Master Report Data State
  const [masterList, setMasterList] = useState([]);
  const [loadingMaster, setLoadingMaster] = useState(true);
  const [masterSearch, setMasterSearch] = useState('');
  const [activeMasterSearch, setActiveMasterSearch] = useState('');
  const [masterRows, setMasterRows] = useState(50);
  const [masterPage, setMasterPage] = useState(1);
  const [masterTotal, setMasterTotal] = useState(0);

  // Row selection for batch actions
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Modals & Menu
  const [showMasterActions, setShowMasterActions] = useState(false);
  const [showMasterColumnsModal, setShowMasterColumnsModal] = useState(false);
  const [showMasterFilterModal, setShowMasterFilterModal] = useState(false);
  const [showMasterChartModal, setShowMasterChartModal] = useState(false);
  const [showAggregateModal, setShowAggregateModal] = useState(false);
  const [aggregations, setAggregations] = useState([]);

  // Column visibility
  const [masterVisibleKeys, setMasterVisibleKeys] = useState(() => {
    try {
      const s = localStorage.getItem('linkedin_accounts_visible_columns');
      if (s) {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return DEFAULT_MASTER_KEYS;
  });

  const handleSaveColumns = (newKeys) => {
    setMasterVisibleKeys(newKeys);
    try {
      localStorage.setItem('linkedin_accounts_visible_columns', JSON.stringify(newKeys));
    } catch (e) {}
  };

  // Load Master Report Data
  const loadMasterData = useCallback(async () => {
    try {
      setLoadingMaster(true);
      const res = await api.getLinkedinAccounts({
        search: activeMasterSearch,
        page: masterPage,
        limit: masterRows,
      });
      if (res.success) {
        setMasterList(res.data || []);
        setMasterTotal(res.total || 0);
      }
    } catch (err) {
      console.error('Error loading Master LinkedIn accounts:', err);
      if (onShowToast) onShowToast('error', 'Failed to load LinkedIn accounts: ' + err.message);
    } finally {
      setLoadingMaster(false);
    }
  }, [activeMasterSearch, masterPage, masterRows, onShowToast]);

  useEffect(() => {
    loadMasterData();
  }, [loadMasterData]);

  // Search submit
  const handleToolbarSearch = (e) => {
    if (e) e.preventDefault();
    setActiveMasterSearch(masterSearch.trim());
    setMasterPage(1);
  };

  // Export CSV
  const handleDownloadReport = () => {
    if (masterList.length === 0) {
      if (onShowToast) onShowToast('warning', 'No data to export.');
      return;
    }
    const headers = LINKEDIN_ACCOUNTS_MASTER_COLUMNS.filter((c) => masterVisibleKeys.includes(c.key));
    const headerRow = headers.map((h) => `"${h.label}"`).join(',');
    const rows = masterList.map((rec) =>
      headers
        .map((h) => {
          const val = h.getValue ? h.getValue(rec) : rec[h.key] || '';
          return `"${String(val).replace(/"/g, '""')}"`;
        })
        .join(',')
    );
    const csvContent = [headerRow, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `LinkedIn_Accounts_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (onShowToast) onShowToast('success', 'LinkedIn accounts report downloaded.');
  };

  // Aggregations
  const handleApplyAggregation = (agg) => {
    setAggregations((prev) => {
      const filtered = prev.filter((a) => a.id !== agg.id);
      return [...filtered, agg];
    });
    if (onShowToast) onShowToast('success', `Aggregation applied: ${agg.func} (${agg.columnLabel})`);
  };

  // Child Report State (Contacts matching this LinkedIn Connected Account)
  const [childContacts, setChildContacts] = useState([]);
  const [childLoading, setChildLoading] = useState(false);
  const [childSearch, setChildSearch] = useState('');
  const [childActiveSearch, setChildActiveSearch] = useState('');
  const [childRows, setChildRows] = useState(50);
  const [childPage, setChildPage] = useState(1);
  const [childTotal, setChildTotal] = useState(0);

  // Edit single contact modal
  const [editingContact, setEditingContact] = useState(null);
  const [editingContactForm, setEditingContactForm] = useState({
    contact_name: '',
    comp_name: '',
    designation: '',
    pos_type: '',
    comp_email: '',
    contact_phone: '',
    country: '',
  });

  const handleOpenEditContact = (c) => {
    setEditingContact(c);
    setEditingContactForm({
      contact_name: c.contact_name || '',
      comp_name: c.comp_name || '',
      designation: c.designation || '',
      pos_type: c.pos_type || '',
      comp_email: c.comp_email || '',
      contact_phone: c.contact_phone || '',
      country: c.country || '',
    });
  };

  const handleUpdateContact = async (e) => {
    e.preventDefault();
    if (!editingContact) return;
    try {
      const res = await api.updateContact(editingContact.id, editingContactForm);
      if (res.success) {
        if (onShowToast) onShowToast('success', `Contact #${editingContact.id} updated successfully.`);
        setEditingContact(null);
        await Promise.all([loadMasterData(), loadChildContacts()]);
      }
    } catch (err) {
      if (onShowToast) onShowToast('error', err.message || 'Failed to update contact.');
    }
  };

  // Load Child Contacts for Form View
  const loadChildContacts = useCallback(async () => {
    if (!selectedRecord) return;
    const targetAcc = selectedRecord.master_linkedin_connected_account || selectedRecord.linkedin_conn_acc;
    if (!targetAcc) return;

    try {
      setChildLoading(true);
      const res = await api.getLinkedinAccountContacts(selectedRecord.id, {
        account: targetAcc,
        search: childActiveSearch,
        page: childPage,
        limit: childRows,
      });
      if (res.success) {
        setChildContacts(res.data || []);
        setChildTotal(res.total || 0);
      }
    } catch (err) {
      console.error('Error loading linked contacts:', err);
      if (onShowToast) onShowToast('error', 'Failed to load contacts: ' + err.message);
    } finally {
      setChildLoading(false);
    }
  }, [selectedRecord, childActiveSearch, childPage, childRows, onShowToast]);

  useEffect(() => {
    if (viewMode === 'form' && selectedRecord) {
      loadChildContacts();
    }
  }, [viewMode, selectedRecord, loadChildContacts]);

  // Open Edit Form
  const handleOpenEdit = (rec) => {
    setSelectedRecord(rec);
    setFormData({
      linkedin_conn_acc: rec.master_linkedin_connected_account || rec.linkedin_conn_acc || '',
      is_active: rec.is_active === 'Y' || rec.account_status === 'Active',
      linked_id: rec.linkedin_id || rec.linked_id || '',
      linked_in_url: rec.linkedin_url || rec.linked_in_url || '',
      country: rec.country || '',
      linked_in_updated_date: formatAppDate(rec.linkedin_updated_date || rec.linked_in_updated_date),
      created_by: rec.created_by || 'APEX_PUBLIC_USER',
      created_date: formatAppDate(rec.created_date) || '20-JUL-2026',
      modified_by: rec.modified_by || 'MARIYA_BADAR',
      modified_date: formatAppDate(rec.modified_date) || '12-NOV-2026',
    });
    setChildPage(1);
    setChildSearch('');
    setChildActiveSearch('');
    setViewMode('form');
    try {
      localStorage.setItem('apex_linkedin_accounts_active_form', JSON.stringify(rec));
    } catch (e) {}
  };

  // Selection Checkboxes
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allIds = new Set(masterList.map((m) => m.id));
      setSelectedIds(allIds);
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleToggleRow = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Batch Delete
  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.size} selected LinkedIn account(s)?`)) {
      return;
    }
    try {
      const idArray = Array.from(selectedIds);
      const res = await api.batchDeleteLinkedinAccounts(idArray);
      if (res.success) {
        if (onShowToast) onShowToast('success', res.message || `Deleted ${idArray.length} accounts successfully.`);
        setSelectedIds(new Set());
        loadMasterData();
      }
    } catch (err) {
      if (onShowToast) onShowToast('error', 'Batch delete failed: ' + err.message);
    }
  };

  // Open Create Form
  const handleOpenCreate = () => {
    const newRec = {
      isCreate: true,
      linkedin_conn_acc: '',
      is_active: true,
      linked_id: '',
      linked_in_url: '',
      country: '',
      linked_in_updated_date: formatAppDate(new Date()),
      created_by: 'APEX_PUBLIC_USER',
      created_date: formatAppDate(new Date()),
      modified_by: 'MARIYA_BADAR',
      modified_date: formatAppDate(new Date()),
    };
    setSelectedRecord(newRec);
    setFormData(newRec);
    setChildContacts([]);
    setChildTotal(0);
    setViewMode('form');
    try {
      localStorage.setItem('apex_linkedin_accounts_active_form', JSON.stringify(newRec));
    } catch (e) {}
  };

  // Cancel Form
  const handleCancelForm = () => {
    setViewMode('report');
    setSelectedRecord(null);
    try {
      localStorage.removeItem('apex_linkedin_accounts_active_form');
    } catch (e) {}
  };

  // Delete Record in Form View
  const handleDeleteMaster = async () => {
    if (!selectedRecord || selectedRecord.isCreate) return;
    if (!window.confirm(`Are you sure you want to delete LinkedIn account "${formData.linkedin_conn_acc}"?`)) {
      return;
    }
    try {
      const res = await api.deleteLinkedinAccount(selectedRecord.id);
      if (res.success) {
        if (onShowToast) onShowToast('success', 'LinkedIn account deleted successfully.');
        handleCancelForm();
        loadMasterData();
      }
    } catch (err) {
      if (onShowToast) onShowToast('error', 'Failed to delete: ' + err.message);
    }
  };

  // Save / Apply Changes
  const handleFormSubmit = async (e) => {
    if (e) e.preventDefault();
    const cleanAcc = (formData.linkedin_conn_acc || '').trim();
    const cleanId = (formData.linked_id || '').trim();
    if (!cleanAcc) {
      if (onShowToast) onShowToast('error', 'LinkedIn Connected Account is required.');
      return;
    }

    const dupAcc = masterList.find(
      (m) =>
        ((m.linkedin_conn_acc && m.linkedin_conn_acc.trim().toLowerCase() === cleanAcc.toLowerCase()) ||
          (cleanId && m.linked_id && m.linked_id.trim().toLowerCase() === cleanId.toLowerCase())) &&
        String(m.id) !== String(selectedRecord?.id)
    );
    if (dupAcc) {
      if (onShowToast) onShowToast('error', `LinkedIn account "${cleanAcc}" already exists. Duplicate records are not allowed.`);
      return;
    }

    try {
      const payload = {
        linkedin_conn_acc: formData.linkedin_conn_acc.trim(),
        linked_id: formData.linked_id ? formData.linked_id.trim() : '',
        linked_in_url: formData.linked_in_url ? formData.linked_in_url.trim() : '',
        country: formData.country ? formData.country.trim() : '',
        linked_in_updated_date: formData.linked_in_updated_date || null,
        is_active: formData.is_active ? 'Y' : 'N',
      };

      if (selectedRecord && selectedRecord.isCreate) {
        const res = await api.createLinkedinAccount(payload);
        if (res.success) {
          if (onShowToast) onShowToast('success', 'New LinkedIn Account created successfully.');
          handleCancelForm();
          loadMasterData();
        }
      } else {
        const res = await api.updateLinkedinAccount(selectedRecord.id, payload);
        if (res.success) {
          if (onShowToast) onShowToast('success', 'LinkedIn Account updated successfully.');
          handleCancelForm();
          loadMasterData();
        }
      }
    } catch (err) {
      if (onShowToast) onShowToast('error', err.message || 'Failed to save account.');
    }
  };

  // Pagination calculations
  const startRow = masterTotal === 0 ? 0 : (masterPage - 1) * (masterRows === 'all' ? masterTotal : masterRows) + 1;
  const endRow = masterRows === 'all' ? masterTotal : Math.min(masterPage * masterRows, masterTotal);
  const totalPages = masterRows === 'all' ? 1 : Math.ceil(masterTotal / masterRows) || 1;

  const childStartRow = childTotal === 0 ? 0 : (childPage - 1) * childRows + 1;
  const childEndRow = Math.min(childPage * childRows, childTotal);
  const childTotalPages = Math.ceil(childTotal / childRows) || 1;

  return (
    <div className="apex-master-page" style={{ padding: '0 0.5rem' }}>
      {/* ==================================================================== */}
      {/* VIEW MODE 1: REPORT VIEW (Screenshot 1: media_1794480046910_c6fd09fc) */}
      {/* ==================================================================== */}
      {viewMode === 'report' && (
        <div>
          {/* Page Title */}
          <div style={{ marginBottom: '1rem' }}>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>
              LinkedIn Accounts & Countries
            </h1>
          </div>

          {/* MAIN REPORT TABLE CARD */}
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '1.25rem 1.5rem',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
            }}
          >
            {/* Toolbar strictly matching Screenshot 1 */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem',
                marginBottom: '1rem',
              }}
            >
              {/* Left Controls: Search bar + Go button + Rows + Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <form onSubmit={handleToolbarSearch} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <div style={{ position: 'relative', width: '220px' }}>
                    <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                      <IconSearch size={15} />
                    </span>
                    <input
                      type="text"
                      className="apex-form-input"
                      placeholder="Search"
                      value={masterSearch}
                      onChange={(e) => setMasterSearch(e.target.value)}
                      style={{
                        width: '100%',
                        height: '34px',
                        paddingLeft: '32px',
                        paddingRight: '10px',
                        borderRadius: '4px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.825rem',
                      }}
                    />
                  </div>
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

                {/* Rows Selector: 10, 25, 50, 100, All */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginLeft: '0.25rem' }}>
                  <span style={{ fontSize: '0.825rem', color: '#475569', fontWeight: 500 }}>Rows</span>
                  <div style={{ position: 'relative' }}>
                    <select
                      className="apex-form-input"
                      value={masterRows}
                      onChange={(e) => {
                        const val = e.target.value === 'all' ? 'all' : Number(e.target.value);
                        setMasterRows(val);
                        setMasterPage(1);
                      }}
                      style={{
                        height: '34px',
                        padding: '0 24px 0 8px',
                        borderRadius: '4px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.825rem',
                        fontWeight: 600,
                        backgroundColor: '#ffffff',
                        cursor: 'pointer',
                        appearance: 'none',
                      }}
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                      <option value="all">All</option>
                    </select>
                    <span style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748b' }}>
                      <IconChevronDown size={13} />
                    </span>
                  </div>
                </div>

                {/* Actions Dropdown */}
                <div style={{ position: 'relative' }}>
                  <button
                    type="button"
                    onClick={() => setShowMasterActions(!showMasterActions)}
                    style={{
                      height: '34px',
                      padding: '0 12px',
                      backgroundColor: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '4px',
                      fontSize: '0.825rem',
                      fontWeight: 600,
                      color: '#1e293b',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    Actions <IconChevronDown size={13} />
                  </button>

                  <ApexActionsMenu
                    isOpen={showMasterActions}
                    onClose={() => setShowMasterActions(false)}
                    onOpenColumns={() => setShowMasterColumnsModal(true)}
                    onOpenFilter={() => setShowMasterFilterModal(true)}
                    onOpenAggregate={() => setShowAggregateModal(true)}
                    onOpenChart={() => setShowMasterChartModal(true)}
                    onOpenGroupBy={() => setShowMasterChartModal(true)}
                    onDownload={handleDownloadReport}
                    onRefresh={loadMasterData}
                    onResetReport={() => {
                      setMasterSearch('');
                      setActiveMasterSearch('');
                      setAggregations([]);
                      setMasterRows(50);
                      setMasterPage(1);
                      if (onShowToast) onShowToast('info', 'Report reset to default.');
                    }}
                    onChangeRows={(r) => {
                      setMasterRows(r);
                      setMasterPage(1);
                    }}
                    currentRows={masterRows}
                  />
                </div>
              </div>

              {/* Right Toolbar Action Buttons matching Screenshot 2: Upload, Create, Delete Selected */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowUploadModal(true)}
                  style={{
                    height: '34px',
                    padding: '0 16px',
                    backgroundColor: '#102a43',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.825rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#0b1d30')}
                  onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#102a43')}
                >
                  Upload
                </button>

                <button
                  type="button"
                  onClick={handleOpenCreate}
                  style={{
                    height: '34px',
                    padding: '0 16px',
                    backgroundColor: '#102a43',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.825rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#0b1d30')}
                  onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#102a43')}
                >
                  Create
                </button>

                <button
                  type="button"
                  onClick={handleBatchDelete}
                  disabled={selectedIds.size === 0}
                  style={{
                    height: '34px',
                    padding: '0 16px',
                    backgroundColor: selectedIds.size > 0 ? '#dc2626' : '#102a43',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.825rem',
                    fontWeight: 600,
                    cursor: selectedIds.size > 0 ? 'pointer' : 'not-allowed',
                    opacity: selectedIds.size > 0 ? 1 : 0.85,
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                  }}
                  title={selectedIds.size > 0 ? `Delete ${selectedIds.size} selected` : 'Select rows to delete'}
                >
                  Delete Selected {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
                </button>
              </div>
            </div>

            {/* Pagination Row matching Screenshot 1: "1 - 9 of 9" */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.825rem',
                color: '#475569',
                padding: '0.4rem 0.25rem 0.75rem',
                borderBottom: '1px solid #f1f5f9',
              }}
            >
              <span>
                {masterTotal === 0 ? '0 of 0' : `${startRow.toLocaleString()} - ${endRow.toLocaleString()} of ${masterTotal.toLocaleString()}`}
              </span>
              <div style={{ display: 'flex', gap: '2px' }}>
                <button
                  type="button"
                  disabled={masterPage <= 1}
                  onClick={() => setMasterPage((p) => Math.max(1, p - 1))}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: masterPage <= 1 ? 'not-allowed' : 'pointer',
                    color: masterPage <= 1 ? '#cbd5e1' : '#475569',
                    padding: '2px 4px',
                  }}
                >
                  <IconChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  disabled={masterPage >= totalPages}
                  onClick={() => setMasterPage((p) => Math.min(totalPages, p + 1))}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: masterPage >= totalPages ? 'not-allowed' : 'pointer',
                    color: masterPage >= totalPages ? '#cbd5e1' : '#475569',
                    padding: '2px 4px',
                  }}
                >
                  <IconChevronRight size={16} />
                </button>
              </div>
            </div>

            {/* Active Aggregations Chips Bar */}
            <ActiveAggregationsBar
              aggregations={aggregations}
              data={masterList}
              onEditAggregation={() => setShowAggregateModal(true)}
              onRemoveAggregation={(id) => setAggregations((prev) => prev.filter((a) => a.id !== id))}
              onClearAll={() => setAggregations([])}
            />

            {/* Master Table matching Screenshot 1 */}
            <div style={{ overflowX: 'auto' }}>
              {loadingMaster ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                  Loading LinkedIn accounts...
                </div>
              ) : masterList.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                  No LinkedIn accounts found.
                </div>
              ) : (
                <table className="apex-master-table">
                  <thead>
                    <tr>
                      <th style={{ width: '40px', textAlign: 'center' }}></th>
                      <th style={{ width: '80px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <input
                            type="checkbox"
                            checked={masterList.length > 0 && selectedIds.size === masterList.length}
                            onChange={handleSelectAll}
                            style={{ cursor: 'pointer' }}
                          />
                        </div>
                      </th>
                      {masterVisibleKeys.includes('master_linkedin_connected_account') && (
                        <th style={{ minWidth: '170px' }}>Master Linkedin Connected Account</th>
                      )}
                      {masterVisibleKeys.includes('master_contact_count') && (
                        <th className="col-number" style={{ minWidth: '120px' }}>Master Contact Count</th>
                      )}
                      {masterVisibleKeys.includes('linkedin_id') && (
                        <th style={{ minWidth: '200px' }}>LinkedIn ID</th>
                      )}
                      {masterVisibleKeys.includes('linkedin_url') && (
                        <th style={{ minWidth: '240px' }}>LinkedIn URL</th>
                      )}
                      {masterVisibleKeys.includes('account_status') && (
                        <th className="col-center" style={{ minWidth: '110px' }}>Account Status</th>
                      )}
                      {masterVisibleKeys.includes('country') && (
                        <th style={{ minWidth: '150px' }}>Country</th>
                      )}
                      {masterVisibleKeys.includes('linkedin_updated_date') && (
                        <th className="col-center" style={{ minWidth: '140px' }}>LinkedIn Updated Date</th>
                      )}
                      {masterVisibleKeys.includes('created_date') && (
                        <th className="col-center" style={{ minWidth: '120px' }}>Created Date</th>
                      )}
                      {masterVisibleKeys.includes('modified_date') && (
                        <th className="col-center" style={{ minWidth: '120px' }}>Modified Date</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {masterList.map((rec) => (
                      <tr key={rec.id}>
                        {/* Edit Button matching Screenshot 1 */}
                        <td className="col-center">
                          <button
                            type="button"
                            className="apex-edit-icon-btn"
                            onClick={() => handleOpenEdit(rec)}
                            title="Edit Account"
                          >
                            <IconFilePenLine size={15} />
                          </button>
                        </td>

                        {/* Selected Checkbox */}
                        <td className="col-center">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(rec.id)}
                            onChange={() => handleToggleRow(rec.id)}
                            style={{ cursor: 'pointer' }}
                          />
                        </td>

                        {/* Master Linkedin Connected Account */}
                        {masterVisibleKeys.includes('master_linkedin_connected_account') && (
                          <td>
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(rec)}
                              style={{
                                background: 'none',
                                border: 'none',
                                padding: 0,
                                textAlign: 'left',
                                cursor: 'pointer',
                                color: '#1e293b',
                                fontWeight: 500,
                                fontSize: '0.825rem',
                              }}
                              onMouseOver={(e) => (e.currentTarget.style.color = '#2563eb')}
                              onMouseOut={(e) => (e.currentTarget.style.color = '#1e293b')}
                            >
                              {rec.master_linkedin_connected_account || rec.linkedin_conn_acc || '-'}
                            </button>
                          </td>
                        )}

                        {/* Master Contact Count */}
                        {masterVisibleKeys.includes('master_contact_count') && (
                          <td className="col-number" style={{ fontWeight: 600, color: '#334155' }}>
                            {Number(rec.master_contact_count || rec.contact_count || 0).toLocaleString()}
                          </td>
                        )}

                        {/* LinkedIn ID */}
                        {masterVisibleKeys.includes('linkedin_id') && (
                          <td style={{ color: '#334155' }}>
                            {rec.linkedin_id || rec.linked_id || '-'}
                          </td>
                        )}

                        {/* LinkedIn URL (clickable blue link) */}
                        {masterVisibleKeys.includes('linkedin_url') && (
                          <td style={{ maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {rec.linkedin_url || rec.linked_in_url ? (
                              <a
                                href={rec.linkedin_url || rec.linked_in_url}
                                target="_blank"
                                rel="noreferrer"
                                style={{ color: '#2563eb', textDecoration: 'none' }}
                                onMouseOver={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                                onMouseOut={(e) => (e.currentTarget.style.textDecoration = 'none')}
                              >
                                {rec.linkedin_url || rec.linked_in_url}
                              </a>
                            ) : (
                              '-'
                            )}
                          </td>
                        )}

                        {/* Account Status Badge matching Screenshot 1 */}
                        {masterVisibleKeys.includes('account_status') && (
                          <td className="col-center">
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '0.775rem',
                                fontWeight: 600,
                                color: (rec.is_active === 'Y' || rec.account_status === 'Active') ? '#15803d' : '#64748b',
                                backgroundColor: (rec.is_active === 'Y' || rec.account_status === 'Active') ? '#f0fdf4' : '#f1f5f9',
                              }}
                            >
                              {rec.is_active === 'Y' || rec.account_status === 'Active' ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                        )}

                        {/* Country */}
                        {masterVisibleKeys.includes('country') && (
                          <td style={{ color: '#334155' }}>
                            {rec.country || '-'}
                          </td>
                        )}

                        {/* LinkedIn Updated Date */}
                        {masterVisibleKeys.includes('linkedin_updated_date') && (
                          <td className="col-center" style={{ color: '#64748b' }}>
                            {formatAppDate(rec.linkedin_updated_date || rec.linked_in_updated_date)}
                          </td>
                        )}

                        {/* Created Date */}
                        {masterVisibleKeys.includes('created_date') && (
                          <td className="col-center" style={{ color: '#64748b' }}>
                            {formatAppDate(rec.created_date)}
                          </td>
                        )}

                        {/* Modified Date */}
                        {masterVisibleKeys.includes('modified_date') && (
                          <td className="col-center" style={{ color: '#64748b' }}>
                            {formatAppDate(rec.modified_date)}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>

                  {/* Summary Aggregations Footer */}
                  {aggregations.length > 0 && (
                    <tfoot style={{ backgroundColor: '#f8fafc', borderTop: '2px solid #cbd5e1', fontWeight: 700 }}>
                      <tr>
                        <td style={{ padding: '8px 12px', fontSize: '0.8rem', color: '#475569', textAlign: 'right' }}>
                          Summary:
                        </td>
                        {masterVisibleKeys.includes('master_linkedin_connected_account') && (
                          <td style={{ padding: '8px 12px' }}>
                            {aggregations.filter((a) => a.columnKey === 'master_linkedin_connected_account').map((a) => (
                              <div key={a.id} style={{ fontSize: '0.775rem' }}>
                                <span style={{ color: '#64748b' }}>{a.func}: </span>
                                <span style={{ color: '#2563eb' }}>{computeAggregationValue(masterList, a.func, a.columnKey)}</span>
                              </div>
                            ))}
                          </td>
                        )}
                        {masterVisibleKeys.includes('master_contact_count') && (
                          <td className="col-number" style={{ padding: '8px 12px' }}>
                            {aggregations.filter((a) => a.columnKey === 'master_contact_count').map((a) => (
                              <div key={a.id} style={{ fontSize: '0.775rem' }}>
                                <span style={{ color: '#64748b' }}>{a.func}: </span>
                                <span style={{ color: '#2563eb' }}>{computeAggregationValue(masterList, a.func, a.columnKey)}</span>
                              </div>
                            ))}
                          </td>
                        )}
                        {masterVisibleKeys.includes('linkedin_id') && <td></td>}
                        {masterVisibleKeys.includes('linkedin_url') && <td></td>}
                        {masterVisibleKeys.includes('account_status') && <td></td>}
                        {masterVisibleKeys.includes('country') && (
                          <td style={{ padding: '8px 12px' }}>
                            {aggregations.filter((a) => a.columnKey === 'country').map((a) => (
                              <div key={a.id} style={{ fontSize: '0.775rem' }}>
                                <span style={{ color: '#64748b' }}>{a.func}: </span>
                                <span style={{ color: '#2563eb' }}>{computeAggregationValue(masterList, a.func, a.columnKey)}</span>
                              </div>
                            ))}
                          </td>
                        )}
                        {masterVisibleKeys.includes('linkedin_updated_date') && <td></td>}
                        {masterVisibleKeys.includes('created_date') && <td></td>}
                        {masterVisibleKeys.includes('modified_date') && <td></td>}
                      </tr>
                    </tfoot>
                  )}
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* VIEW MODE 2: FORM VIEW (Screenshot 2: media_1794480061630_cabcca0e)   */}
      {/* ==================================================================== */}
      {viewMode === 'form' && (
        <div>
          {/* Top Navy Banner Strip */}
          <div
            style={{
              backgroundColor: '#0f2035',
              height: '14px',
              borderRadius: '8px 8px 0 0',
            }}
          />

          {/* Main Form White Card */}
          <div className="apex-form-card">
            {/* ROW 1: 3 columns matching Screenshot 2 */}
            <div className="apex-form-grid-3">
              {/* Field 1: Linkedin Connected Account */}
              <div className="apex-form-field">
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                  Linkedin Connected Account
                </label>
                <input
                  type="text"
                  className="apex-form-input"
                  style={{
                    width: '100%',
                    height: '38px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    padding: '0 0.75rem',
                    fontSize: '0.825rem',
                    backgroundColor: selectedRecord?.isCreate ? '#ffffff' : '#f8fafc',
                    color: '#1e293b',
                  }}
                  value={formData.linkedin_conn_acc}
                  onChange={(e) => setFormData({ ...formData, linkedin_conn_acc: e.target.value })}
                  disabled={!selectedRecord?.isCreate}
                />
              </div>

              {/* Field 2: Is Active (Toggle Pill Switch matching Screenshot 2) */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.55rem' }}>
                  Is Active
                </label>
                <div
                  onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                  style={{
                    width: '46px',
                    height: '24px',
                    backgroundColor: formData.is_active ? '#10b981' : '#94a3b8',
                    borderRadius: '12px',
                    padding: '2px',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: formData.is_active ? 'flex-end' : 'flex-start',
                  }}
                  title={formData.is_active ? 'Active' : 'Inactive'}
                >
                  <div
                    style={{
                      width: '20px',
                      height: '20px',
                      backgroundColor: '#ffffff',
                      borderRadius: '50%',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                    }}
                  />
                </div>
              </div>

              {/* Field 3: Linkedin Id */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                  Linkedin Id
                </label>
                <input
                  type="email"
                  className="apex-form-input"
                  style={{
                    width: '100%',
                    height: '38px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    padding: '0 0.75rem',
                    fontSize: '0.825rem',
                    backgroundColor: '#ffffff',
                    color: '#1e293b',
                  }}
                  value={formData.linked_id}
                  onChange={(e) => setFormData({ ...formData, linked_id: e.target.value })}
                />
              </div>
            </div>

            {/* ROW 2: 3 columns matching Screenshot 2 */}
            <div className="apex-form-grid-3">
              {/* Field 1: Linked In URL (Textarea matching Screenshot 2) */}
              <div className="apex-form-field">
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                  Linked In URL
                </label>
                <textarea
                  className="apex-form-input"
                  rows={3}
                  style={{
                    width: '100%',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.825rem',
                    backgroundColor: '#ffffff',
                    color: '#1e293b',
                    resize: 'vertical',
                  }}
                  value={formData.linked_in_url}
                  onChange={(e) => setFormData({ ...formData, linked_in_url: e.target.value })}
                />
              </div>

              {/* Field 2: Country */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                  Country
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className="apex-form-input"
                    style={{
                      width: '100%',
                      height: '38px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      padding: '0 2rem 0 0.75rem',
                      fontSize: '0.825rem',
                      backgroundColor: '#ffffff',
                      color: '#1e293b',
                    }}
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  />
                  <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748b' }}>
                    <IconChevronDown size={14} />
                  </span>
                </div>
              </div>

              {/* Field 3: Linked In Updated Date */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                  Linked In Updated Date
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="date"
                    className="apex-form-input"
                    style={{
                      width: '100%',
                      height: '38px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      padding: '0 0.75rem',
                      fontSize: '0.825rem',
                      backgroundColor: '#ffffff',
                    }}
                    value={formData.linked_in_updated_date}
                    onChange={(e) => setFormData({ ...formData, linked_in_updated_date: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* ROW 3: 4 columns audit fields matching Screenshot 2 */}
            <div className="apex-form-grid-4">
              {/* Created By */}
              <div className="apex-form-field">
                <label>
                  Created By
                </label>
                <input
                  type="text"
                  readOnly
                  disabled
                  className="apex-form-input"
                  style={{
                    width: '100%',
                    height: '38px',
                    borderRadius: '6px',
                    border: '1px solid #e2e8f0',
                    padding: '0 0.75rem',
                    fontSize: '0.825rem',
                    backgroundColor: '#ffffff',
                    color: '#1e293b',
                    cursor: 'default',
                  }}
                  value={formData.created_by}
                />
              </div>

              {/* Created Date */}
              <div className="apex-form-field">
                <label>
                  Created Date
                </label>
                <input
                  type="text"
                  readOnly
                  disabled
                  className="apex-form-input"
                  style={{
                    width: '100%',
                    height: '38px',
                    borderRadius: '6px',
                    border: '1px solid #e2e8f0',
                    padding: '0 0.75rem',
                    fontSize: '0.825rem',
                    backgroundColor: '#ffffff',
                    color: '#1e293b',
                    cursor: 'default',
                  }}
                  value={formatAppDate(formData.created_date)}
                />
              </div>

              {/* Modified By */}
              <div className="apex-form-field">
                <label>
                  Modified By
                </label>
                <input
                  type="text"
                  readOnly
                  disabled
                  className="apex-form-input"
                  style={{
                    width: '100%',
                    height: '38px',
                    borderRadius: '6px',
                    border: '1px solid #e2e8f0',
                    padding: '0 0.75rem',
                    fontSize: '0.825rem',
                    backgroundColor: '#ffffff',
                    color: '#1e293b',
                    cursor: 'default',
                  }}
                  value={formData.modified_by}
                />
              </div>

              {/* Modified Date */}
              <div className="apex-form-field">
                <label>
                  Modified Date
                </label>
                <input
                  type="text"
                  readOnly
                  disabled
                  className="apex-form-input"
                  style={{
                    width: '100%',
                    height: '38px',
                    borderRadius: '6px',
                    border: '1px solid #e2e8f0',
                    padding: '0 0.75rem',
                    fontSize: '0.825rem',
                    backgroundColor: '#ffffff',
                    color: '#1e293b',
                    cursor: 'default',
                  }}
                  value={formatAppDate(formData.modified_date)}
                />
              </div>
            </div>

            {/* FORM ACTION BUTTONS strictly matching Screenshot 2 */}
            <div className="apex-form-actions-row">
              {/* Left: Cancel Button */}
              <button
                type="button"
                onClick={handleCancelForm}
                style={{
                  height: '36px',
                  padding: '0 1.25rem',
                  backgroundColor: '#f1f5f9',
                  color: '#334155',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  fontSize: '0.825rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#e2e8f0')}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
              >
                Cancel
              </button>

              {/* Right: Delete, Apply Changes */}
              <div className="apex-form-actions-right">
                {!selectedRecord?.isCreate && (
                  <button
                    type="button"
                    onClick={handleDeleteMaster}
                    style={{
                      height: '36px',
                      padding: '0 1.25rem',
                      backgroundColor: '#f1f5f9',
                      color: '#475569',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      fontSize: '0.825rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = '#fee2e2';
                      e.currentTarget.style.color = '#dc2626';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = '#f1f5f9';
                      e.currentTarget.style.color = '#475569';
                    }}
                  >
                    Delete
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleFormSubmit}
                  style={{
                    height: '36px',
                    padding: '0 1.35rem',
                    backgroundColor: '#102a43',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.825rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#0b1d30')}
                  onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#102a43')}
                >
                  Apply Changes
                </button>
              </div>
            </div>
          </div>

          {/* CHILD REPORT: DRILLDOWN CONTACTS MATCHING THIS LINKEDIN ACCOUNT */}
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '1.25rem 1.5rem',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
            }}
          >
            {/* Child Report Toolbar matching Screenshot 2 */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem',
                marginBottom: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setChildActiveSearch(childSearch.trim());
                    setChildPage(1);
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <div style={{ position: 'relative', width: '220px' }}>
                    <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                      <IconSearch size={15} />
                    </span>
                    <input
                      type="text"
                      className="apex-form-input"
                      placeholder="Search"
                      value={childSearch}
                      onChange={(e) => setChildSearch(e.target.value)}
                      style={{
                        width: '100%',
                        height: '34px',
                        paddingLeft: '32px',
                        paddingRight: '10px',
                        borderRadius: '4px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.825rem',
                      }}
                    />
                  </div>
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

                {/* Rows Selector */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginLeft: '0.25rem' }}>
                  <span style={{ fontSize: '0.825rem', color: '#475569', fontWeight: 500 }}>Rows</span>
                  <div style={{ position: 'relative' }}>
                    <select
                      className="apex-form-input"
                      value={childRows}
                      onChange={(e) => {
                        setChildRows(Number(e.target.value));
                        setChildPage(1);
                      }}
                      style={{
                        height: '34px',
                        padding: '0 24px 0 8px',
                        borderRadius: '4px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.825rem',
                        fontWeight: 600,
                        backgroundColor: '#ffffff',
                        cursor: 'pointer',
                        appearance: 'none',
                      }}
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                    <span style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748b' }}>
                      <IconChevronDown size={13} />
                    </span>
                  </div>
                </div>

                {/* Actions button */}
                <button
                  type="button"
                  style={{
                    height: '34px',
                    padding: '0 12px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '4px',
                    fontSize: '0.825rem',
                    fontWeight: 600,
                    color: '#1e293b',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer',
                  }}
                  onClick={() => {
                    if (onShowToast) onShowToast('info', 'Actions menu for linked contacts.');
                  }}
                >
                  Actions <IconChevronDown size={13} />
                </button>
              </div>

              {/* Pagination info matching Screenshot 2: "1 - 50 of 587 >" */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '0.825rem',
                  color: '#475569',
                }}
              >
                <span>
                  {childTotal === 0 ? '0 of 0' : `${childStartRow.toLocaleString()} - ${childEndRow.toLocaleString()} of ${childTotal.toLocaleString()}`}
                </span>
                <div style={{ display: 'flex', gap: '2px' }}>
                  <button
                    type="button"
                    disabled={childPage <= 1}
                    onClick={() => setChildPage((p) => Math.max(1, p - 1))}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: childPage <= 1 ? 'not-allowed' : 'pointer',
                      color: childPage <= 1 ? '#cbd5e1' : '#475569',
                      padding: '2px 4px',
                    }}
                  >
                    <IconChevronLeft size={16} />
                  </button>
                  <button
                    type="button"
                    disabled={childPage >= childTotalPages}
                    onClick={() => setChildPage((p) => Math.min(childTotalPages, p + 1))}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: childPage >= childTotalPages ? 'not-allowed' : 'pointer',
                      color: childPage >= childTotalPages ? '#cbd5e1' : '#475569',
                      padding: '2px 4px',
                    }}
                  >
                    <IconChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>

            {/* Child Contacts Table matching Screenshot 2 */}
            <div style={{ overflowX: 'auto' }}>
              {childLoading ? (
                <div style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b' }}>
                  Loading linked contacts...
                </div>
              ) : childContacts.length === 0 ? (
                <div style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b' }}>
                  No contacts found linked to "{formData.linkedin_conn_acc}".
                </div>
              ) : (
                <table className="apex-master-table">
                  <thead>
                    <tr>
                      <th style={{ width: '40px', textAlign: 'center' }}></th>
                      <th style={{ width: '80px' }}>Id</th>
                      <th style={{ minWidth: '180px' }}>Contact Name</th>
                      <th style={{ minWidth: '180px' }}>Comp Name</th>
                      <th style={{ minWidth: '180px' }}>Linkedin Cnnctd Acc</th>
                      <th style={{ minWidth: '140px' }}>Source</th>
                      <th style={{ minWidth: '140px' }}>Designation</th>
                      <th style={{ minWidth: '180px' }}>Email</th>
                      <th style={{ minWidth: '130px' }}>Country</th>
                    </tr>
                  </thead>
                  <tbody>
                    {childContacts.map((c) => (
                      <tr key={c.id}>
                        <td className="col-center">
                          <button
                            type="button"
                            className="apex-edit-icon-btn"
                            onClick={() => {
                              if (onNavigateToContactForm) {
                                onNavigateToContactForm(c.id);
                              } else {
                                try {
                                  localStorage.setItem('apex_open_contact_id', String(c.id));
                                } catch (e) {}
                                window.location.hash = `#/contacts?id=${c.id}`;
                              }
                            }}
                            title={`Edit Contact #${c.id} Form`}
                          >
                            <IconFilePenLine size={14} />
                          </button>
                        </td>
                        <td style={{ color: '#64748b', fontSize: '0.8rem' }}>{c.id}</td>
                        <td style={{ fontWeight: 600, color: '#1e293b' }}>{c.contact_name}</td>
                        <td style={{ color: '#334155' }}>{c.comp_name || '-'}</td>
                        <td style={{ color: '#334155' }}>{c.linkedin_cnnctd_acc || '-'}</td>
                        <td style={{ color: '#64748b' }}>{c.source || '-'}</td>
                        <td style={{ color: '#334155' }}>{c.designation || '-'}</td>
                        <td style={{ color: '#64748b' }}>{c.comp_email || '-'}</td>
                        <td style={{ color: '#334155' }}>{c.country || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODALS                                                              */}
      {/* ==================================================================== */}

      {/* Select Columns Modal */}
      <SelectColumnsModal
        isOpen={showMasterColumnsModal}
        onClose={() => setShowMasterColumnsModal(false)}
        columns={LINKEDIN_ACCOUNTS_MASTER_COLUMNS}
        visibleKeys={masterVisibleKeys}
        onSave={handleSaveColumns}
        onReset={() => handleSaveColumns(DEFAULT_MASTER_KEYS)}
      />

      {/* Filter Modal */}
      <ApexFilterModal
        isOpen={showMasterFilterModal}
        onClose={() => setShowMasterFilterModal(false)}
        columns={LINKEDIN_ACCOUNTS_MASTER_COLUMNS}
        onApplyFilter={(f) => {
          setActiveMasterSearch(f.value);
          setMasterPage(1);
          if (onShowToast) onShowToast('success', `Filter applied on ${f.column}`);
        }}
      />

      {/* Aggregate Modal */}
      <ApexAggregateModal
        isOpen={showAggregateModal}
        onClose={() => setShowAggregateModal(false)}
        columns={LINKEDIN_ACCOUNTS_MASTER_COLUMNS}
        aggregations={aggregations}
        onApply={handleApplyAggregation}
        onDelete={(id) => setAggregations((prev) => prev.filter((a) => a.id !== id))}
      />

      {/* Chart Modal */}
      <ApexChartModal
        isOpen={showMasterChartModal}
        onClose={() => setShowMasterChartModal(false)}
        columns={LINKEDIN_ACCOUNTS_MASTER_COLUMNS}
        data={masterList}
      />

      {/* Edit Contact Modal */}
      {editingContact && (
        <div className="apex-modal-overlay">
          <div className="apex-modal" style={{ maxWidth: '520px', width: '92%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#1e293b' }}>
                Edit Contact #{editingContact.id}
              </h3>
              <button
                type="button"
                onClick={() => setEditingContact(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <IconClose size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateContact}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', marginBottom: '1rem' }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                    Contact Name
                  </label>
                  <input
                    type="text"
                    className="apex-form-input"
                    style={{ width: '100%', height: '34px', fontSize: '0.825rem' }}
                    value={editingContactForm.contact_name}
                    onChange={(e) => setEditingContactForm({ ...editingContactForm, contact_name: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                    Designation
                  </label>
                  <input
                    type="text"
                    className="apex-form-input"
                    style={{ width: '100%', height: '34px', fontSize: '0.825rem' }}
                    value={editingContactForm.designation}
                    onChange={(e) => setEditingContactForm({ ...editingContactForm, designation: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                    Email
                  </label>
                  <input
                    type="email"
                    className="apex-form-input"
                    style={{ width: '100%', height: '34px', fontSize: '0.825rem' }}
                    value={editingContactForm.comp_email}
                    onChange={(e) => setEditingContactForm({ ...editingContactForm, comp_email: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                    Phone
                  </label>
                  <input
                    type="text"
                    className="apex-form-input"
                    style={{ width: '100%', height: '34px', fontSize: '0.825rem' }}
                    value={editingContactForm.contact_phone}
                    onChange={(e) => setEditingContactForm({ ...editingContactForm, contact_phone: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                    Country
                  </label>
                  <input
                    type="text"
                    className="apex-form-input"
                    style={{ width: '100%', height: '34px', fontSize: '0.825rem' }}
                    value={editingContactForm.country}
                    onChange={(e) => setEditingContactForm({ ...editingContactForm, country: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9' }}>
                <button
                  type="button"
                  onClick={() => setEditingContact(null)}
                  style={{
                    padding: '6px 14px',
                    backgroundColor: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    borderRadius: '4px',
                    fontSize: '0.825rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '6px 16px',
                    backgroundColor: '#102a43',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '0.825rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Save Contact
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload CSV Modal */}
      {showUploadModal && (
        <div className="apex-modal-overlay">
          <div className="apex-modal" style={{ maxWidth: '480px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#1e293b' }}>
                Upload LinkedIn Accounts Data
              </h3>
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <IconClose size={18} />
              </button>
            </div>
            <p style={{ fontSize: '0.825rem', color: '#64748b', marginBottom: '1rem' }}>
              Upload a CSV file containing records for LinkedIn Accounts.
            </p>
            <input
              type="file"
              accept=".csv"
              style={{
                width: '100%',
                padding: '1.5rem',
                border: '2px dashed #cbd5e1',
                borderRadius: '8px',
                textAlign: 'center',
                cursor: 'pointer',
                marginBottom: '1rem',
              }}
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  if (onShowToast) onShowToast('info', `File "${file.name}" received. Processing records...`);
                  setShowUploadModal(false);
                  setTimeout(() => {
                    if (onShowToast) onShowToast('success', 'LinkedIn Accounts CSV data uploaded and merged.');
                    loadMasterData();
                  }, 800);
                }
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                style={{
                  padding: '6px 14px',
                  backgroundColor: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px',
                  fontSize: '0.825rem',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

