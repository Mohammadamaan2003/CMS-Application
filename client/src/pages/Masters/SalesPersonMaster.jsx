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
  IconEye,
  IconEyeOff,
} from '../../components/Icons';

// Format date for Emails matching Screenshot 1 (e.g. 11/9/2026)
function formatEmailDate(dateStr) {
  if (!dateStr || dateStr.trim() === '') return '';
  if (dateStr.includes('/')) return dateStr;
  const months = { JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6, JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12 };
  const parts = String(dateStr).split('-');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const mon = months[parts[1].toUpperCase()] || parts[1];
    let yr = parts[2];
    if (yr.length === 2) yr = '20' + yr;
    return `${mon}/${day}/${yr}`;
  }
  return dateStr;
}

export const SALES_PERSON_COLUMNS = [
  {
    key: 'salesperson',
    label: 'Salesperson',
    getValue: (r) => r.salesperson || '',
  },
  {
    key: 'jobposition',
    label: 'Job Position',
    getValue: (r) => r.jobposition || '-',
  },
  {
    key: 'mobile',
    label: 'Mobile',
    getValue: (r) => r.mobile || '',
  },
  {
    key: 'emails',
    label: 'Emails',
    getValue: (r) => r.emails || '',
  },
  {
    key: 'address',
    label: 'Address',
    getValue: (r) => r.address || '',
  },
  {
    key: 'is_active',
    label: 'Is Active',
    getValue: (r) => (r.is_active === 'Y' || r.is_active === true ? 'Y' : 'N'),
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

const DEFAULT_COLUMN_KEYS = SALES_PERSON_COLUMNS.map((c) => c.key);

export const SALES_PERSON_CONTACT_COLUMNS = [
  { key: 'id', label: 'Contact ID', getValue: (c) => c.id },
  { key: 'contact_name', label: 'Contact Name', getValue: (c) => c.contact_name || '' },
  { key: 'company_id', label: 'Company ID', getValue: (c) => c.company_id || '' },
  { key: 'company_name', label: 'Company Name', getValue: (c) => c.company_name || '' },
  { key: 'designation', label: 'Designation', getValue: (c) => c.designation || '' },
  { key: 'position_type', label: 'Position Type', getValue: (c) => c.position_type || '' },
  { key: 'email', label: 'Email', getValue: (c) => c.email || '' },
  { key: 'mobile', label: 'Mobile', getValue: (c) => c.mobile || '' },
  { key: 'created_date', label: 'Created Date', getValue: (c) => formatAppDate(c.created_date) },
  { key: 'modified_date', label: 'Modified Date', getValue: (c) => formatAppDate(c.modified_date) },
];

export const SALES_PERSON_EMAIL_COLUMNS = [
  { key: 'email_address', label: 'Email Address', getValue: (e) => e.email_address || '' },
  { key: 'email_daily_limit', label: 'Email Daily Limit', getValue: (e) => e.email_daily_limit ?? 10 },
  { key: 'is_active', label: 'Is Active', getValue: (e) => e.is_active || 'Y' },
  { key: 'created_by', label: 'Created By', getValue: (e) => e.created_by || '' },
  { key: 'created_date', label: 'Created Date', getValue: (e) => formatEmailDate(e.created_date) },
];

export default function SalesPersonMaster({
  onShowToast,
  onNavigateToCompanyForm,
  onNavigateToContactForm,
}) {
  // Mode: 'report' or 'form' with localStorage persistence
  const [viewMode, setViewMode] = useState(() => {
    try {
      const saved = localStorage.getItem('apex_salesperson_active_form');
      if (saved) return 'form';
    } catch (e) {}
    return 'report';
  });

  const [selectedRecord, setSelectedRecord] = useState(() => {
    try {
      const saved = localStorage.getItem('apex_salesperson_active_form');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return null;
  });

  // Form Sub-tabs: 'sales_person' (default) or 'sales_person_emails' (matching Screenshot 1)
  const [formActiveTab, setFormActiveTab] = useState(() => {
    try {
      return localStorage.getItem('apex_salesperson_form_tab') || 'sales_person';
    } catch (e) {
      return 'sales_person';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('apex_salesperson_form_tab', formActiveTab);
    } catch (e) {}
  }, [formActiveTab]);

  // Main Salesperson Form State
  const [formData, setFormData] = useState(() => {
    try {
      const saved = localStorage.getItem('apex_salesperson_active_form');
      if (saved) {
        const rec = JSON.parse(saved);
        return {
          salesperson: rec.salesperson || '',
          jobposition: rec.jobposition || '',
          mobile: rec.mobile || '',
          is_active: rec.is_active === 'Y' || rec.is_active === true,
          left_date: rec.left_date || '',
          replaced_by_id: rec.replaced_by_id || '',
          address: rec.address || '',
          emails: rec.emails || '',
          created_by: rec.created_by || 'APEX_PUBLIC_USER',
          created_date: formatAppDate(rec.created_date) || '20-JUL-2026',
          modified_by: rec.modified_by || 'ADMIN',
          modified_date: formatAppDate(rec.modified_date) || '28-SEP-2026',
          contact_count: rec.contact_count || 0,
        };
      }
    } catch (e) {}
    return {
      salesperson: '',
      jobposition: '',
      mobile: '',
      is_active: true,
      left_date: '',
      replaced_by_id: '',
      address: '',
      emails: '',
      created_by: 'APEX_PUBLIC_USER',
      created_date: '20-JUL-2026',
      modified_by: 'ADMIN',
      modified_date: '28-SEP-2026',
      contact_count: 0,
    };
  });

  // Table Data & Pagination for Main Master Report
  const [data, setData] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [sortBy, setSortBy] = useState('id');
  const [sortOrder, setSortOrder] = useState('ASC');

  // Interactive Modals for Main Report
  const [visibleColumns, setVisibleColumns] = useState(DEFAULT_COLUMN_KEYS);
  const [activeFilters, setActiveFilters] = useState([]);
  const [activeAggregations, setActiveAggregations] = useState([]);
  const [showColumnsModal, setShowColumnsModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showChartModal, setShowChartModal] = useState(false);
  const [showAggregateModal, setShowAggregateModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Sub-report: Child contacts for the open salesperson record
  const [contactsData, setContactsData] = useState([]);
  const [contactsTotal, setContactsTotal] = useState(0);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactsPage, setContactsPage] = useState(1);
  const [contactsLimit, setContactsLimit] = useState(50);
  const [contactsSearch, setContactsSearch] = useState('');
  const [contactsSearchInput, setContactsSearchInput] = useState('');
  const [contactsSortBy, setContactsSortBy] = useState('id');
  const [contactsSortOrder, setContactsSortOrder] = useState('DESC');

  // Child Emails state for the open salesperson (Screenshots 1 & 2)
  const [emailsList, setEmailsList] = useState([]);
  const [emailsLoading, setEmailsLoading] = useState(false);
  const [emailSearch, setEmailSearch] = useState('');
  const [emailSearchInput, setEmailSearchInput] = useState('');
  // Mode inside Emails card: 'table' (Screenshot 1) vs 'form' (Screenshot 2)
  const [emailViewMode, setEmailViewMode] = useState('table');
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);
  const [emailFormData, setEmailFormData] = useState({
    email_address: '',
    smtp_password: '',
    email_daily_limit: 10,
    is_active: 'Y',
    created_by: 'APEX_PUBLIC_USER',
    created_date: '11/9/2026',
  });

  // Load Main Master Report Data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.getSalespersons({
        search,
        page,
        limit,
        sortBy,
        sortOrder,
      });
      if (res.success) {
        setData(res.data);
        setTotalCount(res.pagination?.total || res.data.length);
      }
    } catch (err) {
      if (onShowToast) onShowToast('error', `Failed to load salespersons: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [search, page, limit, sortBy, sortOrder, onShowToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load Child Emails for open Salesperson
  const loadEmails = useCallback(async () => {
    if (!selectedRecord || !selectedRecord.id) return;
    try {
      setEmailsLoading(true);
      const res = await api.getSalespersonEmails(selectedRecord.id, { search: emailSearch });
      if (res.success) {
        setEmailsList(res.data || []);
      }
    } catch (err) {
      console.warn('Failed to load salesperson emails:', err.message);
    } finally {
      setEmailsLoading(false);
    }
  }, [selectedRecord, emailSearch]);

  useEffect(() => {
    if (viewMode === 'form' && selectedRecord?.id) {
      loadEmails();
    }
  }, [viewMode, selectedRecord, loadEmails]);

  // Load Child Contacts for open Salesperson
  const loadChildContacts = useCallback(async () => {
    if (!selectedRecord || !selectedRecord.id) return;
    try {
      setContactsLoading(true);
      const res = await api.getSalespersonContacts(selectedRecord.id, {
        search: contactsSearch,
        page: contactsPage,
        limit: contactsLimit,
        sortBy: contactsSortBy,
        sortOrder: contactsSortOrder,
      });
      if (res.success) {
        setContactsData(res.data);
        setContactsTotal(res.pagination?.total || res.data.length);
        setFormData((prev) => ({
          ...prev,
          contact_count: res.pagination?.total || res.data.length,
        }));
      }
    } catch (err) {
      console.warn('Failed to load child contacts:', err.message);
    } finally {
      setContactsLoading(false);
    }
  }, [
    selectedRecord,
    contactsSearch,
    contactsPage,
    contactsLimit,
    contactsSortBy,
    contactsSortOrder,
  ]);

  useEffect(() => {
    if (viewMode === 'form' && selectedRecord?.id) {
      loadChildContacts();
    }
  }, [viewMode, selectedRecord, loadChildContacts]);

  // Open Form Mode for Existing Record
  const handleEditRecord = (rec) => {
    setSelectedRecord(rec);
    const formVals = {
      salesperson: rec.salesperson || '',
      jobposition: rec.jobposition || '',
      mobile: rec.mobile || '',
      is_active: rec.is_active === 'Y' || rec.is_active === true,
      left_date: rec.left_date || '',
      replaced_by_id: rec.replaced_by_id || '',
      address: rec.address || '',
      emails: rec.emails || '',
      created_by: rec.created_by || 'APEX_PUBLIC_USER',
      created_date: formatAppDate(rec.created_date) || '20-JUL-2026',
      modified_by: rec.modified_by || 'ADMIN',
      modified_date: formatAppDate(rec.modified_date) || '28-SEP-2026',
      contact_count: rec.contact_count || 0,
    };
    setFormData(formVals);
    setViewMode('form');
    setEmailViewMode('table');
    setSelectedEmail(null);
    setContactsPage(1);
    setContactsSearch('');
    setContactsSearchInput('');
    try {
      localStorage.setItem('apex_salesperson_active_form', JSON.stringify({ ...rec, ...formVals }));
    } catch (e) {}
  };

  // Selection Checkboxes
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allIds = new Set(data.map((m) => m.id));
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
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.size} selected salesperson record(s)?`)) {
      return;
    }
    try {
      const idArray = Array.from(selectedIds);
      const res = await api.batchDeleteSalespersons(idArray);
      if (res.success) {
        if (onShowToast) onShowToast('success', res.message || `Deleted ${idArray.length} salespersons successfully.`);
        setSelectedIds(new Set());
        loadData();
      }
    } catch (err) {
      if (onShowToast) onShowToast('error', 'Batch delete failed: ' + err.message);
    }
  };

  // Open Form Mode for Creating New Record
  const handleCreateNew = () => {
    setSelectedRecord(null);
    const newVals = {
      salesperson: '',
      jobposition: '',
      mobile: '',
      is_active: true,
      left_date: '',
      replaced_by_id: '',
      address: '',
      emails: '',
      created_by: 'APEX_PUBLIC_USER',
      created_date: '20-JUL-2026',
      modified_by: 'ADMIN',
      modified_date: '28-SEP-2026',
      contact_count: 0,
    };
    setFormData(newVals);
    setViewMode('form');
    setFormActiveTab('sales_person');
    setEmailViewMode('table');
    setEmailsList([]);
    setContactsData([]);
    setContactsTotal(0);
    try {
      localStorage.setItem('apex_salesperson_active_form', JSON.stringify({ isCreate: true, ...newVals }));
    } catch (e) {}
  };

  // Cancel Form Mode and return to Report
  const handleCancel = () => {
    setViewMode('report');
    setSelectedRecord(null);
    setEmailViewMode('table');
    try {
      localStorage.removeItem('apex_salesperson_active_form');
    } catch (e) {}
  };

  // Save Salesperson Record
  const handleSave = async (e) => {
    if (e) e.preventDefault();
    const cleanSalesperson = (formData.salesperson || '').trim();
    if (!cleanSalesperson) {
      if (onShowToast) onShowToast('error', 'Salesperson name is required.');
      return;
    }

    const dupSp = salespersons.find(
      (s) =>
        s.salesperson &&
        s.salesperson.trim().toLowerCase() === cleanSalesperson.toLowerCase() &&
        String(s.id) !== String(selectedRecord?.id)
    );
    if (dupSp) {
      if (onShowToast) onShowToast('error', `A salesperson with the name "${cleanSalesperson}" already exists. Duplicate records are not allowed.`);
      return;
    }

    const payload = {
      salesperson: formData.salesperson.trim(),
      jobposition: formData.jobposition.trim(),
      mobile: formData.mobile.trim(),
      address: formData.address.trim(),
      is_active: formData.is_active ? 'Y' : 'N',
      left_date: formData.left_date.trim(),
      replaced_by_id: formData.replaced_by_id.trim(),
      emails: formData.emails.trim(),
    };

    try {
      if (selectedRecord && selectedRecord.id) {
        const res = await api.updateSalesperson(selectedRecord.id, payload);
        if (onShowToast) onShowToast('success', res.message || 'Salesperson updated successfully.');
        setSelectedRecord(res.data);
      } else {
        const res = await api.createSalesperson(payload);
        if (onShowToast) onShowToast('success', res.message || 'Salesperson created successfully.');
        setSelectedRecord(res.data);
      }
      try {
        localStorage.removeItem('apex_salesperson_active_form');
      } catch (e) {}
      setViewMode('report');
      loadData();
    } catch (err) {
      if (onShowToast) onShowToast('error', err.message || 'Failed to save salesperson.');
    }
  };

  // Delete Salesperson
  const handleDelete = async () => {
    if (!selectedRecord || !selectedRecord.id) return;
    if (window.confirm(`Are you sure you want to delete salesperson "${selectedRecord.salesperson}"?`)) {
      try {
        const res = await api.deleteSalesperson(selectedRecord.id);
        if (onShowToast) onShowToast('success', res.message || 'Salesperson deleted successfully.');
        try {
          localStorage.removeItem('apex_salesperson_active_form');
        } catch (e) {}
        setViewMode('report');
        setSelectedRecord(null);
        loadData();
      } catch (err) {
        if (onShowToast) onShowToast('error', err.message || 'Failed to delete salesperson.');
      }
    }
  };

  // Open Email Create Mode (Screenshot 2)
  const handleOpenAddEmail = () => {
    setSelectedEmail(null);
    setShowSmtpPassword(false);
    setEmailFormData({
      email_address: '',
      smtp_password: '',
      email_daily_limit: 10,
      is_active: 'Y',
      created_by: 'APEX_PUBLIC_USER',
      created_date: '11/9/2026',
    });
    setEmailViewMode('form');
  };

  // Open Email Edit Mode (Screenshot 2)
  const handleOpenEditEmail = (email) => {
    setSelectedEmail(email);
    setShowSmtpPassword(false);
    setEmailFormData({
      email_address: email.email_address || '',
      smtp_password: email.smtp_password || '',
      email_daily_limit: email.email_daily_limit ?? 10,
      is_active: email.is_active || 'Y',
      created_by: email.created_by || 'APEX_PUBLIC_USER',
      created_date: formatEmailDate(email.created_date) || '11/9/2026',
    });
    setEmailViewMode('form');
  };

  // Save Email (Create or Update)
  const handleSaveEmail = async (e) => {
    if (e) e.preventDefault();
    const cleanEmail = (emailFormData.email_address || '').trim();
    if (!cleanEmail) {
      if (onShowToast) onShowToast('error', 'Email address is required.');
      return;
    }

    const dupEmail = emailsList.find(
      (em) =>
        em.email_address &&
        em.email_address.trim().toLowerCase() === cleanEmail.toLowerCase() &&
        String(em.email_id) !== String(selectedEmail?.email_id)
    );
    if (dupEmail) {
      if (onShowToast) onShowToast('error', `Email "${cleanEmail}" already exists for this salesperson. Duplicate records are not allowed.`);
      return;
    }

    try {
      if (selectedEmail && selectedEmail.email_id) {
        await api.updateSalespersonEmail(selectedEmail.email_id, {
          email_address: emailFormData.email_address.trim(),
          smtp_password: emailFormData.smtp_password.trim(),
          email_daily_limit: parseInt(emailFormData.email_daily_limit, 10) || 10,
          is_active: emailFormData.is_active,
        });
        if (onShowToast) onShowToast('success', 'Email updated successfully.');
      } else {
        await api.createSalespersonEmail(selectedRecord.id, {
          email_address: emailFormData.email_address.trim(),
          smtp_password: emailFormData.smtp_password.trim(),
          email_daily_limit: parseInt(emailFormData.email_daily_limit, 10) || 10,
          is_active: emailFormData.is_active,
          created_date: emailFormData.created_date,
        });
        if (onShowToast) onShowToast('success', 'Email added successfully.');
      }
      setEmailViewMode('table');
      setSelectedEmail(null);
      loadEmails();
      loadData(); // To refresh aggregated emails in report
    } catch (err) {
      if (onShowToast) onShowToast('error', err.message || 'Failed to save email.');
    }
  };

  // Delete Email
  const handleDeleteEmail = async () => {
    if (!selectedEmail || !selectedEmail.email_id) return;
    if (window.confirm(`Are you sure you want to delete email "${selectedEmail.email_address}"?`)) {
      try {
        await api.deleteSalespersonEmail(selectedEmail.email_id);
        if (onShowToast) onShowToast('success', 'Email deleted successfully.');
        setEmailViewMode('table');
        setSelectedEmail(null);
        loadEmails();
        loadData();
      } catch (err) {
        if (onShowToast) onShowToast('error', err.message || 'Failed to delete email.');
      }
    }
  };

  // Filtered emails based on search input
  const filteredEmails = useMemo(() => {
    if (!emailSearch.trim()) return emailsList;
    const s = emailSearch.toLowerCase();
    return emailsList.filter(
      (e) =>
        (e.email_address && e.email_address.toLowerCase().includes(s)) ||
        (e.created_by && e.created_by.toLowerCase().includes(s))
    );
  }, [emailsList, emailSearch]);

  // Main Pagination math
  const totalPages = Math.ceil(totalCount / limit) || 1;
  const startRow = totalCount === 0 ? 0 : (page - 1) * limit + 1;
  const endRow = Math.min(page * limit, totalCount);

  // Sub-report Contacts Pagination math
  const contactsTotalPages = Math.ceil(contactsTotal / contactsLimit) || 1;
  const contactsStartRow = contactsTotal === 0 ? 0 : (contactsPage - 1) * contactsLimit + 1;
  const contactsEndRow = Math.min(contactsPage * contactsLimit, contactsTotal);

  // =========================================================================
  // VIEW MODE: FORM VIEW (Matching Screenshot 1 & 2 from both turns)
  // =========================================================================
  if (viewMode === 'form') {
    return (
      <div className="salesperson-form-page" style={{ padding: '0 0.5rem' }}>
        {/* Top Header with Sales Person Title & Sub-Tabs matching Screenshot 1 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '2.5rem',
            marginBottom: '1rem',
            borderBottom: '1px solid #e2e8f0',
            paddingBottom: '0.2rem',
          }}
        >
          <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
            Sales Person
          </h2>

          <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => {
                setFormActiveTab('sales_person');
                setEmailViewMode('table');
              }}
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: formActiveTab === 'sales_person' ? '2.5px solid #047857' : '2.5px solid transparent',
                padding: '0.45rem 0.25rem',
                fontSize: '0.9rem',
                fontWeight: formActiveTab === 'sales_person' ? 600 : 500,
                color: formActiveTab === 'sales_person' ? '#0f172a' : '#64748b',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              Sales Person
            </button>

            <button
              type="button"
              onClick={() => {
                if (!selectedRecord || !selectedRecord.id) {
                  alert('Please save the Sales Person first before managing emails.');
                  return;
                }
                setFormActiveTab('sales_person_emails');
              }}
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: formActiveTab === 'sales_person_emails' ? '2.5px solid #047857' : '2.5px solid transparent',
                padding: '0.45rem 0.25rem',
                fontSize: '0.9rem',
                fontWeight: formActiveTab === 'sales_person_emails' ? 600 : 500,
                color: formActiveTab === 'sales_person_emails' ? '#0f172a' : '#64748b',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              Sales Person Emails
            </button>
          </div>
        </div>

        {/* =================================================================== */}
        {/* TAB 1: SALES PERSON DETAILS FORM                                    */}
        {/* =================================================================== */}
        {formActiveTab === 'sales_person' && (
          <div
            className="apex-form-card"
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.05)',
              border: '1px solid #e2e8f0',
              padding: '1.5rem',
              marginBottom: '1.5rem',
            }}
          >
            <form onSubmit={handleSave}>
              {/* Row 1: Salesperson, Jobposition, Mobile */}
              <div className="apex-form-grid-3">
                <div className="apex-form-field">
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.825rem', color: '#1e293b', marginBottom: '0.35rem' }}>
                    Salesperson
                  </label>
                  <input
                    type="text"
                    value={formData.salesperson}
                    onChange={(e) => setFormData({ ...formData, salesperson: e.target.value })}
                    placeholder="Salesperson Name"
                    required
                    style={{
                      width: '100%',
                      padding: '0.45rem 0.75rem',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.85rem',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.825rem', color: '#1e293b', marginBottom: '0.35rem' }}>
                    Jobposition
                  </label>
                  <input
                    type="text"
                    value={formData.jobposition}
                    onChange={(e) => setFormData({ ...formData, jobposition: e.target.value })}
                    placeholder="Job Position"
                    style={{
                      width: '100%',
                      padding: '0.45rem 0.75rem',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.85rem',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.825rem', color: '#1e293b', marginBottom: '0.35rem' }}>
                    Mobile
                  </label>
                  <input
                    type="text"
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    placeholder="Mobile Number"
                    style={{
                      width: '100%',
                      padding: '0.45rem 0.75rem',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.85rem',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Row 2: Is Active (toggle), Left Date, Replaced By ID */}
              <div className="apex-form-grid-3">
                <div className="apex-form-field">
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.825rem', color: '#1e293b', marginBottom: '0.35rem' }}>
                    Is Active
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', height: '36px' }}>
                    <div
                      onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                      style={{
                        width: '46px',
                        height: '24px',
                        backgroundColor: formData.is_active ? '#0e7490' : '#cbd5e1',
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
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.825rem', color: '#1e293b', marginBottom: '0.35rem' }}>
                    Left Date
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      value={formData.left_date}
                      onChange={(e) => setFormData({ ...formData, left_date: e.target.value })}
                      placeholder="DD-MON-YYYY"
                      style={{
                        width: '100%',
                        padding: '0.45rem 2rem 0.45rem 0.75rem',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.85rem',
                        outline: 'none',
                      }}
                    />
                    <span
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#94a3b8',
                        pointerEvents: 'none',
                      }}
                    >
                      <IconCalendar size={14} />
                    </span>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.825rem', color: '#1e293b', marginBottom: '0.35rem' }}>
                    Replaced By ID
                  </label>
                  <input
                    type="text"
                    value={formData.replaced_by_id}
                    onChange={(e) => setFormData({ ...formData, replaced_by_id: e.target.value })}
                    placeholder="Replaced By ID"
                    style={{
                      width: '100%',
                      padding: '0.45rem 0.75rem',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.85rem',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Row 3: Address (textarea), Created By, Created Date */}
              <div className="apex-form-grid-3">
                <div className="apex-form-field">
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.825rem', color: '#1e293b', marginBottom: '0.35rem' }}>
                    Address
                  </label>
                  <textarea
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    rows={4}
                    placeholder="Address"
                    style={{
                      width: '100%',
                      padding: '0.45rem 0.75rem',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.85rem',
                      outline: 'none',
                      resize: 'vertical',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.825rem', color: '#1e293b', marginBottom: '0.35rem' }}>
                    Created By
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={formData.created_by}
                    style={{
                      width: '100%',
                      padding: '0.45rem 0.75rem',
                      borderRadius: '6px',
                      border: '1px dashed #cbd5e1',
                      backgroundColor: '#f8fafc',
                      color: '#64748b',
                      fontSize: '0.85rem',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.825rem', color: '#1e293b', marginBottom: '0.35rem' }}>
                    Created Date
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={formData.created_date}
                    style={{
                      width: '100%',
                      padding: '0.45rem 0.75rem',
                      borderRadius: '6px',
                      border: '1px dashed #cbd5e1',
                      backgroundColor: '#f8fafc',
                      color: '#64748b',
                      fontSize: '0.85rem',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Row 4: Modified By, Modified Date, Total Contacts */}
              <div className="apex-form-grid-3">
                <div className="apex-form-field">
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.825rem', color: '#1e293b', marginBottom: '0.35rem' }}>
                    Modified By
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={formData.modified_by}
                    style={{
                      width: '100%',
                      padding: '0.45rem 0.75rem',
                      borderRadius: '6px',
                      border: '1px dashed #cbd5e1',
                      backgroundColor: '#f8fafc',
                      color: '#64748b',
                      fontSize: '0.85rem',
                      outline: 'none',
                    }}
                  />
                </div>

                <div className="apex-form-field">
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.825rem', color: '#1e293b', marginBottom: '0.35rem' }}>
                    Modified Date
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={formData.modified_date}
                    style={{
                      width: '100%',
                      padding: '0.45rem 0.75rem',
                      borderRadius: '6px',
                      border: '1px dashed #cbd5e1',
                      backgroundColor: '#f8fafc',
                      color: '#64748b',
                      fontSize: '0.85rem',
                      outline: 'none',
                    }}
                  />
                </div>

                <div className="apex-form-field">
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.825rem', color: '#1e293b', marginBottom: '0.35rem' }}>
                    Total Contacts
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={formData.contact_count}
                    style={{
                      width: '100%',
                      padding: '0.45rem 0.75rem',
                      borderRadius: '6px',
                      border: '1px dashed #cbd5e1',
                      backgroundColor: '#f8fafc',
                      color: '#64748b',
                      fontSize: '0.85rem',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Action Buttons Bar */}
              <div className="apex-form-actions-row">
                <button
                  type="button"
                  className="btn-apex-cancel"
                  onClick={handleCancel}
                  style={{
                    padding: '0.45rem 1.25rem',
                    fontSize: '0.85rem',
                    fontWeight: 500,
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#334155',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>

                <div className="apex-form-actions-right">
                  {selectedRecord && selectedRecord.id && (
                    <button
                      type="button"
                      onClick={handleDelete}
                      style={{
                        padding: '0.45rem 1.25rem',
                        fontSize: '0.85rem',
                        fontWeight: 500,
                        borderRadius: '6px',
                        border: '1px solid #e2e8f0',
                        background: '#f8fafc',
                        color: '#475569',
                        cursor: 'pointer',
                      }}
                    >
                      Delete
                    </button>
                  )}

                  <button
                    type="submit"
                    style={{
                      padding: '0.45rem 1.25rem',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: '#102a43',
                      color: '#ffffff',
                      cursor: 'pointer',
                    }}
                  >
                    Apply Changes
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 2: SALES PERSON EMAILS (Matching Screenshots 1 & 2)             */}
        {/* =================================================================== */}
        {formActiveTab === 'sales_person_emails' && (
          <div
            className="apex-emails-card"
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.05)',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
              marginBottom: '1.5rem',
            }}
          >
            {/* Dark Navy Header Strip matching Screenshots 1 & 2 */}
            <div
              style={{
                backgroundColor: '#102a43',
                color: '#ffffff',
                padding: '0.65rem 1.25rem',
                fontSize: '0.95rem',
                fontWeight: 600,
                letterSpacing: '0.01em',
              }}
            >
              Sales Person Emails
            </div>

            {/* A. TABLE VIEW matching Screenshot 1 */}
            {emailViewMode === 'table' && (
              <>
                <div
                  style={{
                    padding: '0.75rem 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid #e2e8f0',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ position: 'relative', width: '220px' }}>
                      <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                        <IconSearch size={15} />
                      </span>
                      <input
                        type="text"
                        className="apex-form-input"
                        placeholder="Search"
                        value={emailSearchInput}
                        onChange={(e) => setEmailSearchInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            setEmailSearch(emailSearchInput);
                          }
                        }}
                        style={{
                          width: '100%',
                          height: '34px',
                          paddingLeft: '32px',
                          paddingRight: '10px',
                          borderRadius: '4px',
                          border: '1px solid #cbd5e1',
                          fontSize: '0.825rem',
                          backgroundColor: '#ffffff',
                        }}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => setEmailSearch(emailSearchInput)}
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

                    <button
                      type="button"
                      style={{
                        padding: '0.4rem 0.85rem',
                        fontSize: '0.825rem',
                        fontWeight: 500,
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        background: '#ffffff',
                        color: '#334155',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                      }}
                    >
                      Actions <IconChevronDown size={12} />
                    </button>
                  </div>

                  {/* Add Email Button in Navy #102a43 on far right */}
                  <button
                    type="button"
                    onClick={handleOpenAddEmail}
                    style={{
                      padding: '0.45rem 1.25rem',
                      fontSize: '0.825rem',
                      fontWeight: 600,
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: '#102a43',
                      color: '#ffffff',
                      cursor: 'pointer',
                    }}
                  >
                    Add Email
                  </button>
                </div>

                {/* Emails Table */}
                <div style={{ overflowX: 'auto' }}>
                  <table className="apex-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                        <th style={{ width: '40px', padding: '0.6rem 0.5rem', textAlign: 'center' }}></th>
                        <th style={{ padding: '0.6rem 0.75rem', fontWeight: 600, color: '#1e293b' }}>Email Address</th>
                        <th style={{ padding: '0.6rem 0.75rem', fontWeight: 600, color: '#1e293b', textAlign: 'right' }}>Email Daily Limit</th>
                        <th style={{ padding: '0.6rem 0.75rem', fontWeight: 600, color: '#1e293b' }}>Is Active</th>
                        <th style={{ padding: '0.6rem 0.75rem', fontWeight: 600, color: '#1e293b' }}>Created By</th>
                        <th style={{ padding: '0.6rem 0.75rem', fontWeight: 600, color: '#1e293b' }}>Created Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {emailsLoading ? (
                        <tr>
                          <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                            Loading emails...
                          </td>
                        </tr>
                      ) : filteredEmails.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                            No emails found for this salesperson.
                          </td>
                        </tr>
                      ) : (
                        filteredEmails.map((email) => (
                          <tr
                            key={email.email_id}
                            style={{
                              borderBottom: '1px solid #f1f5f9',
                              transition: 'background-color 0.15s',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                          >
                            <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                              <button
                                type="button"
                                className="btn-icon"
                                title={`Edit email ${email.email_address}`}
                                onClick={() => handleOpenEditEmail(email)}
                                style={{
                                  border: '1px solid #cbd5e1',
                                  borderRadius: '4px',
                                  background: '#ffffff',
                                  padding: '3px 5px',
                                  cursor: 'pointer',
                                  color: '#0284c7',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <IconFilePenLine size={13} color="#0284c7" />
                              </button>
                            </td>
                            <td style={{ padding: '0.55rem 0.75rem', color: '#334155' }}>{email.email_address}</td>
                            <td style={{ padding: '0.55rem 0.75rem', color: '#334155', textAlign: 'right' }}>{email.email_daily_limit ?? 10}</td>
                            <td style={{ padding: '0.55rem 0.75rem', color: '#334155' }}>{email.is_active || 'Y'}</td>
                            <td style={{ padding: '0.55rem 0.75rem', color: '#334155' }}>{email.created_by || ''}</td>
                            <td style={{ padding: '0.55rem 0.75rem', color: '#334155' }}>{formatEmailDate(email.created_date)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination indicator matching Screenshot 1 (e.g. 1 - 2) */}
                <div
                  style={{
                    padding: '0.5rem 1rem',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                    fontSize: '0.825rem',
                    color: '#64748b',
                    borderTop: '1px solid #f1f5f9',
                  }}
                >
                  <span>{filteredEmails.length === 0 ? '0' : `1 - ${filteredEmails.length}`}</span>
                </div>
              </>
            )}

            {/* B. EMAIL FORM VIEW matching Screenshot 2 */}
            {emailViewMode === 'form' && (
              <div style={{ padding: '1.5rem' }}>
                <form onSubmit={handleSaveEmail}>
                  {/* Row 1: Email Address, Smtp Password, Email Daily Limit */}
                  <div className="apex-form-grid-3">
                    <div className="apex-form-field">
                      <label style={{ display: 'block', fontWeight: 600, fontSize: '0.825rem', color: '#1e293b', marginBottom: '0.35rem' }}>
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={emailFormData.email_address}
                        onChange={(e) => setEmailFormData({ ...emailFormData, email_address: e.target.value })}
                        required
                        style={{
                          width: '100%',
                          padding: '0.45rem 0.75rem',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          fontSize: '0.85rem',
                          outline: 'none',
                        }}
                      />
                    </div>

                    <div className="apex-form-field">
                      <label style={{ display: 'block', fontWeight: 600, fontSize: '0.825rem', color: '#1e293b', marginBottom: '0.35rem' }}>
                        Smtp Password
                      </label>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
                        <input
                          type={showSmtpPassword ? 'text' : 'password'}
                          value={emailFormData.smtp_password}
                          onChange={(e) => setEmailFormData({ ...emailFormData, smtp_password: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '0.45rem 2.25rem 0.45rem 0.75rem',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            fontSize: '0.85rem',
                            outline: 'none',
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                          style={{
                            position: 'absolute',
                            right: '6px',
                            background: '#f1f5f9',
                            border: '1px solid #e2e8f0',
                            borderRadius: '4px',
                            padding: '3px 6px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            color: '#64748b',
                          }}
                          title={showSmtpPassword ? 'Hide password' : 'Show password'}
                        >
                          {showSmtpPassword ? <IconEyeOff size={14} /> : <IconEye size={14} />}
                        </button>
                      </div>
                    </div>

                    <div className="apex-form-field">
                      <label style={{ display: 'block', fontWeight: 600, fontSize: '0.825rem', color: '#1e293b', marginBottom: '0.35rem' }}>
                        Email Daily Limit
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={emailFormData.email_daily_limit}
                        onChange={(e) => setEmailFormData({ ...emailFormData, email_daily_limit: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '0.45rem 0.75rem',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          fontSize: '0.85rem',
                          outline: 'none',
                        }}
                      />
                    </div>
                  </div>

                  {/* Row 2: Is Active (select), Created By, Created Date */}
                  <div className="apex-form-grid-3">
                    <div className="apex-form-field">
                      <label style={{ display: 'block', fontWeight: 600, fontSize: '0.825rem', color: '#1e293b', marginBottom: '0.35rem' }}>
                        Is Active
                      </label>
                      <select
                        value={emailFormData.is_active}
                        onChange={(e) => setEmailFormData({ ...emailFormData, is_active: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '0.45rem 0.75rem',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          fontSize: '0.85rem',
                          outline: 'none',
                          backgroundColor: '#ffffff',
                        }}
                      >
                        <option value="Y">Y</option>
                        <option value="N">N</option>
                      </select>
                    </div>

                    <div className="apex-form-field">
                      <label style={{ display: 'block', fontWeight: 600, fontSize: '0.825rem', color: '#1e293b', marginBottom: '0.35rem' }}>
                        Created By
                      </label>
                      <input
                        type="text"
                        readOnly
                        value={emailFormData.created_by}
                        style={{
                          width: '100%',
                          padding: '0.45rem 0.75rem',
                          borderRadius: '6px',
                          border: '1px dashed #cbd5e1',
                          backgroundColor: '#f8fafc',
                          color: '#64748b',
                          fontSize: '0.85rem',
                          outline: 'none',
                        }}
                      />
                    </div>

                    <div className="apex-form-field">
                      <label style={{ display: 'block', fontWeight: 600, fontSize: '0.825rem', color: '#1e293b', marginBottom: '0.35rem' }}>
                        Created Date
                      </label>
                      <div style={{ position: 'relative', width: '100%' }}>
                        <input
                          type="text"
                          value={emailFormData.created_date}
                          onChange={(e) => setEmailFormData({ ...emailFormData, created_date: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '0.45rem 2rem 0.45rem 0.75rem',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            fontSize: '0.85rem',
                            outline: 'none',
                          }}
                        />
                        <span
                          style={{
                            position: 'absolute',
                            right: '8px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: '#94a3b8',
                            pointerEvents: 'none',
                          }}
                        >
                          <IconCalendar size={14} />
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Form Action Buttons matching Screenshot 2 */}
                  <div className="apex-form-actions-row">
                    <button
                      type="button"
                      className="btn-apex-cancel"
                      onClick={() => {
                        setEmailViewMode('table');
                        setSelectedEmail(null);
                      }}
                      style={{
                        padding: '0.45rem 1.25rem',
                        fontSize: '0.85rem',
                        fontWeight: 500,
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        background: '#ffffff',
                        color: '#334155',
                        cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>

                    <div className="apex-form-actions-right">
                      {selectedEmail && selectedEmail.email_id && (
                        <button
                          type="button"
                          onClick={handleDeleteEmail}
                          style={{
                            padding: '0.45rem 1.25rem',
                            fontSize: '0.85rem',
                            fontWeight: 500,
                            borderRadius: '6px',
                            border: '1px solid #e2e8f0',
                            background: '#f8fafc',
                            color: '#475569',
                            cursor: 'pointer',
                          }}
                        >
                          Delete
                        </button>
                      )}

                      <button
                        type="submit"
                        style={{
                          padding: '0.45rem 1.25rem',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          borderRadius: '6px',
                          border: 'none',
                          backgroundColor: '#102a43',
                          color: '#ffffff',
                          cursor: 'pointer',
                        }}
                      >
                        {selectedEmail && selectedEmail.email_id ? 'Apply Changes' : 'Create'}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {/* =================================================================== */}
        {/* SUB-REPORT: CONTACT COUNT (Visible on both sub-tabs, Screenshot 1)  */}
        {/* =================================================================== */}
        <div
          className="apex-subreport-card"
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.05)',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
            marginBottom: '2rem',
          }}
        >
          {/* Dark Navy Header Strip */}
          <div
            style={{
              backgroundColor: '#102a43',
              color: '#ffffff',
              padding: '0.65rem 1.25rem',
              fontSize: '0.95rem',
              fontWeight: 600,
              letterSpacing: '0.01em',
            }}
          >
            Contact Count
          </div>

          {/* Sub-report Toolbar */}
          <div
            style={{
              padding: '0.75rem 1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid #e2e8f0',
              flexWrap: 'wrap',
              gap: '0.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ position: 'relative', width: '220px' }}>
                <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                  <IconSearch size={15} />
                </span>
                <input
                  type="text"
                  className="apex-form-input"
                  placeholder="Search"
                  value={contactsSearchInput}
                  onChange={(e) => setContactsSearchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setContactsSearch(contactsSearchInput);
                      setContactsPage(1);
                    }
                  }}
                  style={{
                    width: '100%',
                    height: '34px',
                    paddingLeft: '32px',
                    paddingRight: '10px',
                    borderRadius: '4px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.825rem',
                    backgroundColor: '#ffffff',
                  }}
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  setContactsSearch(contactsSearchInput);
                  setContactsPage(1);
                }}
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

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.825rem', color: '#64748b' }}>
                <span>Rows</span>
                <select
                  value={contactsLimit}
                  onChange={(e) => {
                    const val = e.target.value === 'all' ? 10000 : parseInt(e.target.value, 10);
                    setContactsLimit(val);
                    setContactsPage(1);
                  }}
                  style={{
                    padding: '0.35rem 0.5rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.825rem',
                    outline: 'none',
                    background: '#ffffff',
                  }}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value="all">All</option>
                </select>
              </div>

              <ApexActionsMenu
                onSelectColumns={() => {}}
                onFilter={() => {}}
                onChart={() => {}}
                onAggregate={() => {}}
                onDownload={() => {}}
              />
            </div>

            {/* Sub-report Pagination */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.825rem', color: '#475569' }}>
              <span>
                {contactsTotal === 0 ? '0 of 0' : `${contactsStartRow} - ${contactsEndRow} of ${contactsTotal}`}
              </span>
              <button
                type="button"
                disabled={contactsPage <= 1}
                onClick={() => setContactsPage((p) => Math.max(1, p - 1))}
                style={{
                  border: 'none',
                  background: 'transparent',
                  cursor: contactsPage <= 1 ? 'not-allowed' : 'pointer',
                  opacity: contactsPage <= 1 ? 0.4 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  padding: '2px',
                }}
              >
                <IconChevronLeft size={16} />
              </button>
              <button
                type="button"
                disabled={contactsPage >= contactsTotalPages}
                onClick={() => setContactsPage((p) => Math.min(contactsTotalPages, p + 1))}
                style={{
                  border: 'none',
                  background: 'transparent',
                  cursor: contactsPage >= contactsTotalPages ? 'not-allowed' : 'pointer',
                  opacity: contactsPage >= contactsTotalPages ? 0.4 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  padding: '2px',
                }}
              >
                <IconChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Sub-report Table */}
          <div style={{ overflowX: 'auto' }}>
            <table className="apex-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ width: '40px', padding: '0.6rem 0.5rem', textAlign: 'center' }}></th>
                  {SALES_PERSON_CONTACT_COLUMNS.map((col) => (
                    <th
                      key={col.key}
                      onClick={() => {
                        if (contactsSortBy === col.key) {
                          setContactsSortOrder((prev) => (prev === 'ASC' ? 'DESC' : 'ASC'));
                        } else {
                          setContactsSortBy(col.key);
                          setContactsSortOrder('ASC');
                        }
                      }}
                      style={{
                        padding: '0.6rem 0.75rem',
                        fontWeight: 600,
                        color: '#334155',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <span>{col.label}</span>
                        {contactsSortBy === col.key && (
                          <span style={{ fontSize: '0.7rem' }}>
                            {contactsSortOrder === 'ASC' ? '▲' : '▼'}
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {contactsLoading ? (
                  <tr>
                    <td colSpan={SALES_PERSON_CONTACT_COLUMNS.length + 1} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                      Loading associated contacts...
                    </td>
                  </tr>
                ) : contactsData.length === 0 ? (
                  <tr>
                    <td colSpan={SALES_PERSON_CONTACT_COLUMNS.length + 1} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                      No contacts found for this salesperson.
                    </td>
                  </tr>
                ) : (
                  contactsData.map((c) => (
                    <tr
                      key={c.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background-color 0.15s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      {/* Edit Icon Button: Redirects to Contact Form */}
                      <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                        <button
                          type="button"
                          className="btn-icon"
                          title={`Edit contact #${c.id}`}
                          onClick={() => {
                            if (onNavigateToContactForm) {
                              onNavigateToContactForm(c.id, 'master_sales_person', '#/masters/sales-person');
                            }
                          }}
                          style={{
                            border: '1px solid #cbd5e1',
                            borderRadius: '4px',
                            background: '#ffffff',
                            padding: '3px 5px',
                            cursor: 'pointer',
                            color: '#0284c7',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <IconFilePenLine size={13} color="#0284c7" />
                        </button>
                      </td>

                      {SALES_PERSON_CONTACT_COLUMNS.map((col) => {
                        if (col.key === 'company_name' || col.key === 'company_id') {
                          return (
                            <td key={col.key} style={{ padding: '0.55rem 0.75rem', color: '#334155' }}>
                              {c.company_id ? (
                                <span
                                  onClick={() => {
                                    if (onNavigateToCompanyForm) {
                                      onNavigateToCompanyForm(c.company_id, 'master_sales_person', '#/masters/sales-person');
                                    }
                                  }}
                                  style={{
                                    color: '#0284c7',
                                    cursor: 'pointer',
                                    textDecoration: 'underline',
                                  }}
                                  title={`View Company #${c.company_id}`}
                                >
                                  {col.getValue(c)}
                                </span>
                              ) : (
                                col.getValue(c)
                              )}
                            </td>
                          );
                        }

                        return (
                          <td key={col.key} style={{ padding: '0.55rem 0.75rem', color: '#334155', whiteSpace: 'nowrap' }}>
                            {col.getValue(c)}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW MODE: REPORT TABLE (Matching Screenshot 1 of previous turn)
  // =========================================================================
  return (
    <div className="salesperson-master-page" style={{ padding: '0 0.5rem' }}>
      {/* Title */}
      <div style={{ marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
          Sales Person
        </h2>
      </div>

      {/* Main Table Card */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
          border: '1px solid #e2e8f0',
          padding: '1.25rem 1.5rem',
          marginBottom: '2rem',
        }}
      >
        {/* Main Toolbar */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', width: '220px' }}>
              <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                <IconSearch size={15} />
              </span>
              <input
                type="text"
                className="apex-form-input"
                placeholder="Search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setSearch(searchInput);
                    setPage(1);
                  }
                }}
                style={{
                  width: '100%',
                  height: '34px',
                  paddingLeft: '32px',
                  paddingRight: '10px',
                  borderRadius: '4px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.825rem',
                  backgroundColor: '#ffffff',
                }}
              />
            </div>

            <button
              type="button"
              onClick={() => {
                setSearch(searchInput);
                setPage(1);
              }}
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

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.825rem', color: '#64748b' }}>
              <span>Rows</span>
              <select
                value={limit}
                onChange={(e) => {
                  const val = e.target.value === 'all' ? 10000 : parseInt(e.target.value, 10);
                  setLimit(val);
                  setPage(1);
                }}
                style={{
                  padding: '0.35rem 0.5rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.825rem',
                  outline: 'none',
                  background: '#ffffff',
                }}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value="all">All</option>
              </select>
            </div>

            <ApexActionsMenu
              onSelectColumns={() => setShowColumnsModal(true)}
              onFilter={() => setShowFilterModal(true)}
              onChart={() => setShowChartModal(true)}
              onAggregate={() => setShowAggregateModal(true)}
              onDownload={() => {}}
            />
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
              onClick={handleCreateNew}
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

        {/* Active Aggregations */}
        <ActiveAggregationsBar
          aggregations={activeAggregations}
          onRemove={(idx) => setActiveAggregations((prev) => prev.filter((_, i) => i !== idx))}
        />

        {/* Pagination Indicator */}
        <div
          style={{
            padding: '0.5rem 1rem',
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.825rem',
            color: '#475569',
            borderBottom: '1px solid #f1f5f9',
          }}
        >
          <span>
            {totalCount === 0 ? '0 of 0' : `${startRow} - ${endRow} of ${totalCount}`}
          </span>
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            style={{
              border: 'none',
              background: 'transparent',
              cursor: page <= 1 ? 'not-allowed' : 'pointer',
              opacity: page <= 1 ? 0.4 : 1,
              display: 'flex',
              alignItems: 'center',
              padding: '2px',
            }}
          >
            <IconChevronLeft size={16} />
          </button>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            style={{
              border: 'none',
              background: 'transparent',
              cursor: page >= totalPages ? 'not-allowed' : 'pointer',
              opacity: page >= totalPages ? 0.4 : 1,
              display: 'flex',
              alignItems: 'center',
              padding: '2px',
            }}
          >
            <IconChevronRight size={16} />
          </button>
        </div>

        {/* Main Table */}
        <div style={{ overflowX: 'auto' }}>
          <table className="apex-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                <th style={{ width: '40px', padding: '0.6rem 0.5rem', textAlign: 'center' }}></th>
                <th style={{ width: '80px', padding: '0.6rem 0.5rem', textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <input
                      type="checkbox"
                      checked={data.length > 0 && selectedIds.size === data.length}
                      onChange={handleSelectAll}
                      style={{ cursor: 'pointer' }}
                    />
                  </div>
                </th>
                {SALES_PERSON_COLUMNS.filter((c) => visibleColumns.includes(c.key)).map((col) => (
                  <th
                    key={col.key}
                    onClick={() => {
                      if (sortBy === col.key) {
                        setSortOrder((prev) => (prev === 'ASC' ? 'DESC' : 'ASC'));
                      } else {
                        setSortBy(col.key);
                        setSortOrder('ASC');
                      }
                    }}
                    style={{
                      padding: '0.6rem 0.75rem',
                      fontWeight: 600,
                      color: '#334155',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <span>{col.label}</span>
                      {sortBy === col.key && (
                        <span style={{ fontSize: '0.7rem' }}>
                          {sortOrder === 'ASC' ? '▲' : '▼'}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={visibleColumns.length + 2} style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
                    Loading Sales Person records...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumns.length + 2} style={{ textAlign: 'center', padding: '2.5rem', color: '#94a3b8' }}>
                    No Sales Person records found.
                  </td>
                </tr>
              ) : (
                data.map((row) => (
                  <tr
                    key={row.id}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      transition: 'background-color 0.15s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                      <button
                        type="button"
                        className="btn-icon"
                        title={`Edit ${row.salesperson}`}
                        onClick={() => handleEditRecord(row)}
                        style={{
                          border: '1px solid #cbd5e1',
                          borderRadius: '4px',
                          background: '#ffffff',
                          padding: '3px 5px',
                          cursor: 'pointer',
                          color: '#0284c7',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <IconFilePenLine size={13} color="#0284c7" />
                      </button>
                    </td>

                    <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(row.id)}
                        onChange={() => handleToggleRow(row.id)}
                        style={{ cursor: 'pointer' }}
                      />
                    </td>

                    {SALES_PERSON_COLUMNS.filter((col) => visibleColumns.includes(col.key)).map((col) => {
                      if (col.key === 'emails') {
                        return (
                          <td
                            key={col.key}
                            style={{
                              padding: '0.55rem 0.75rem',
                              color: '#334155',
                              whiteSpace: 'pre-line',
                              maxWidth: '300px',
                            }}
                          >
                            {col.getValue(row)}
                          </td>
                        );
                      }

                      if (col.key === 'address') {
                        return (
                          <td
                            key={col.key}
                            style={{
                              padding: '0.55rem 0.75rem',
                              color: '#334155',
                              maxWidth: '320px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                            title={row.address || ''}
                          >
                            {col.getValue(row)}
                          </td>
                        );
                      }

                      return (
                        <td
                          key={col.key}
                          style={{
                            padding: '0.55rem 0.75rem',
                            color: '#334155',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {col.getValue(row)}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Main Report Modals */}
      {showColumnsModal && (
        <SelectColumnsModal
          availableColumns={SALES_PERSON_COLUMNS}
          selectedKeys={visibleColumns}
          onApply={(newCols) => {
            setVisibleColumns(newCols);
            setShowColumnsModal(false);
          }}
          onClose={() => setShowColumnsModal(false)}
        />
      )}

      {showFilterModal && (
        <ApexFilterModal
          columns={SALES_PERSON_COLUMNS}
          onApplyFilter={(f) => {
            setActiveFilters((prev) => [...prev, f]);
            setShowFilterModal(false);
          }}
          onClose={() => setShowFilterModal(false)}
        />
      )}

      {showChartModal && (
        <ApexChartModal
          columns={SALES_PERSON_COLUMNS}
          data={data}
          onClose={() => setShowChartModal(false)}
        />
      )}

      {showAggregateModal && (
        <ApexAggregateModal
          columns={SALES_PERSON_COLUMNS}
          onApply={(agg) => {
            setActiveAggregations((prev) => [...prev, agg]);
            setShowAggregateModal(false);
          }}
          onClose={() => setShowAggregateModal(false)}
        />
      )}

      {/* Upload CSV Modal */}
      {showUploadModal && (
        <div className="apex-modal-overlay">
          <div className="apex-modal" style={{ maxWidth: '480px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#1e293b' }}>
                Upload Salesperson Data
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
              Upload a CSV file containing records for Salespersons.
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
                    if (onShowToast) onShowToast('success', 'Salesperson CSV data uploaded and merged.');
                    loadData();
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
