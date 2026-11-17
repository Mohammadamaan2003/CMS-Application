import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ApexInteractiveReport from '../../components/ApexInteractiveReport';
import ApexMultiSelect from '../../components/ApexMultiSelect';
import { api } from '../../api/client';
import {
  IconSearch,
  IconDownload,
  IconTrash,
  IconRefresh,
  IconChevronLeft,
  IconChevronRight,
  IconAlertTriangle,
  IconCheckCircle,
  IconEdit,
  IconCalendar,
} from '../../components/Icons';

export default function ContactIncorrectDataPage({ onShowToast, onNavigateToUpload }) {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [applyingChanges, setApplyingChanges] = useState(false);

  // Tabs: 'insert', 'update', 'fix_designation'
  const [activeTab, setActiveTab] = useState('fix_designation');

  // Top Filter Card State (Multi-Select Arrays)
  const [posTypeIncorrectFilter, setPosTypeIncorrectFilter] = useState([]);
  const [linkedinUrlIncorrectFilter, setLinkedinUrlIncorrectFilter] = useState([]);
  const [compEmailIncorrectFilter, setCompEmailIncorrectFilter] = useState([]);
  const [preferredLinkedinIncorrectFilter, setPreferredLinkedinIncorrectFilter] = useState([]);

  const [compIdFilter, setCompIdFilter] = useState('');
  const [designationFilter, setDesignationFilter] = useState([]);
  const [errorDateFilter, setErrorDateFilter] = useState('');
  const [createdByFilter, setCreatedByFilter] = useState([]);
  const [createdFromFilter, setCreatedFromFilter] = useState('');
  const [createdToFilter, setCreatedToFilter] = useState('');

  const [compNameFilter, setCompNameFilter] = useState([]);
  const [errorMessageFilter, setErrorMessageFilter] = useState([]);

  // Committed/Applied filters - only update when clicking Search or Clear
  const [appliedFilters, setAppliedFilters] = useState({
    pos_type_incorrect: [],
    linkedin_url_incorrect: [],
    comp_email_incorrect: [],
    preferred_linkedin_incorrect: [],
    comp_id: '',
    designation: [],
    error_date: '',
    created_by: [],
    created_from: '',
    created_to: '',
    comp_name: [],
    error_message: [],
  });

  // Bulk Apply Changes (under tabs)
  const [selectedPositionType, setSelectedPositionType] = useState('Other IT');

  // Filter options from API
  const [filterOptions, setFilterOptions] = useState({
    createdByList: [],
    posTypeList: [
      'Business Application',
      'Digital Transformation Leader',
      'Head of CRM',
      'Head of IT',
      'IT Manager',
      'Non IT',
      'Other IT',
      'Procurement',
      'Project Manager',
    ],
    designationList: [],
    compNameList: [],
    errorMessageList: [],
  });

  // Batch filter
  const [batches, setBatches] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState('');

  // Search & Pagination
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Fetch batches & filter options
  const fetchFilterOptions = useCallback(async () => {
    try {
      const [batchRes, optRes] = await Promise.all([
        api.getUploadBatches().catch(() => null),
        api.getContactIncorrectFilterOptions().catch(() => null),
      ]);
      if (batchRes && batchRes.success && Array.isArray(batchRes.contactBatches)) {
        setBatches(batchRes.contactBatches);
      }
      if (optRes && optRes.success) {
        setFilterOptions((prev) => ({
          ...prev,
          createdByList: optRes.createdByList || prev.createdByList,
          posTypeList: optRes.posTypeList || prev.posTypeList,
          designationList: optRes.designationList || prev.designationList,
          compNameList: optRes.compNameList || prev.compNameList,
          errorMessageList: optRes.errorMessageList || prev.errorMessageList,
        }));
      }
    } catch (err) {
      console.error('Error fetching filter options:', err);
    }
  }, []);

  useEffect(() => {
    fetchFilterOptions();
  }, [fetchFilterOptions]);

  // Fetch contact error records from PostgreSQL
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.getContactIncorrectData({
        search: searchQuery,
        batch_id: selectedBatchId,
        page,
        limit,
        sortBy: 'error_id',
        sortOrder: 'DESC',
        mode: activeTab,
        pos_type_incorrect: appliedFilters.pos_type_incorrect.join(','),
        linkedin_url_incorrect: appliedFilters.linkedin_url_incorrect.join(','),
        comp_email_incorrect: appliedFilters.comp_email_incorrect.join(','),
        preferred_linkedin_incorrect: appliedFilters.preferred_linkedin_incorrect.join(','),
        comp_id: appliedFilters.comp_id,
        designation: appliedFilters.designation.join(','),
        error_date: appliedFilters.error_date,
        created_by: appliedFilters.created_by.join(','),
        created_from: appliedFilters.created_from,
        created_to: appliedFilters.created_to,
        comp_name: appliedFilters.comp_name.join(','),
        error_message: appliedFilters.error_message.join(','),
      });
      if (res && res.success) {
        setData(res.data || []);
        setTotal(res.total || 0);
      } else {
        setData([]);
        setTotal(0);
      }
    } catch (err) {
      console.error('Error fetching contact incorrect data:', err);
      if (onShowToast) onShowToast('error', `Failed to load incorrect contact records: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [
    searchQuery,
    selectedBatchId,
    page,
    limit,
    activeTab,
    appliedFilters,
    onShowToast,
  ]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle Search from Top Filter Card
  const handleFilterSearch = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setAppliedFilters({
      pos_type_incorrect: posTypeIncorrectFilter,
      linkedin_url_incorrect: linkedinUrlIncorrectFilter,
      comp_email_incorrect: compEmailIncorrectFilter,
      preferred_linkedin_incorrect: preferredLinkedinIncorrectFilter,
      comp_id: compIdFilter,
      designation: designationFilter,
      error_date: errorDateFilter,
      created_by: createdByFilter,
      created_from: createdFromFilter,
      created_to: createdToFilter,
      comp_name: compNameFilter,
      error_message: errorMessageFilter,
    });
    setPage(1);
  };

  // Handle Clear Filter
  const handleClearFilters = () => {
    setPosTypeIncorrectFilter([]);
    setLinkedinUrlIncorrectFilter([]);
    setCompEmailIncorrectFilter([]);
    setPreferredLinkedinIncorrectFilter([]);
    setCompIdFilter('');
    setDesignationFilter([]);
    setErrorDateFilter('');
    setCreatedByFilter([]);
    setCreatedFromFilter('');
    setCreatedToFilter('');
    setCompNameFilter([]);
    setErrorMessageFilter([]);
    setAppliedFilters({
      pos_type_incorrect: [],
      linkedin_url_incorrect: [],
      comp_email_incorrect: [],
      preferred_linkedin_incorrect: [],
      comp_id: '',
      designation: [],
      error_date: '',
      created_by: [],
      created_from: '',
      created_to: '',
      comp_name: [],
      error_message: [],
    });
    setSearchInput('');
    setSearchQuery('');
    setSelectedBatchId('');
    setPage(1);
  };

  // Handle Toolbar Search
  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    setPage(1);
    setSearchQuery(searchInput);
  };

  const handleResetSearch = () => {
    setSearchInput('');
    setSearchQuery('');
    setPage(1);
  };

  // Handle Selection
  const handleToggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = async () => {
    const isAllSelected = total > 0 && selectedIds.size >= total;
    if (isAllSelected) {
      setSelectedIds(new Set());
      if (onShowToast) onShowToast('info', 'Deselected all records.');
    } else {
      try {
        const res = await api.getContactIncorrectData({
          limit: 100000,
          search: searchQuery,
          batch_id: selectedBatchId,
          mode: activeTab,
          pos_type_incorrect: posTypeIncorrectFilter.join(','),
          linkedin_url_incorrect: linkedinUrlIncorrectFilter.join(','),
          comp_email_incorrect: compEmailIncorrectFilter.join(','),
          preferred_linkedin_incorrect: preferredLinkedinIncorrectFilter.join(','),
          comp_id: compIdFilter,
          designation: designationFilter.join(','),
          error_date: errorDateFilter,
          created_by: createdByFilter.join(','),
          created_from: createdFromFilter,
          created_to: createdToFilter,
          comp_name: compNameFilter.join(','),
          error_message: errorMessageFilter.join(','),
        });
        if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
          setSelectedIds(new Set(res.data.map((r) => r.error_id)));
          if (onShowToast) onShowToast('info', `Selected all ${res.data.length} records throughout report.`);
        } else {
          setSelectedIds(new Set(data.map((r) => r.error_id)));
        }
      } catch (err) {
        setSelectedIds(new Set(data.map((r) => r.error_id)));
      }
    }
  };

  // Bulk Apply Changes for selected records
  const handleApplyChanges = async () => {
    if (selectedIds.size === 0) {
      if (onShowToast) onShowToast('info', 'Please select at least one record using the checkboxes.');
      return;
    }
    try {
      setApplyingChanges(true);
      const res = await api.applyContactIncorrectChanges(Array.from(selectedIds), {
        pos_type: selectedPositionType,
      });
      if (res && res.success) {
        if (onShowToast) {
          onShowToast(
            'success',
            res.message || `Successfully applied Position Type "${selectedPositionType}" to ${selectedIds.size} record(s).`
          );
        }
        fetchData();
      } else {
        if (onShowToast) onShowToast('error', res.message || 'Failed to apply changes.');
      }
    } catch (err) {
      if (onShowToast) onShowToast('error', `Apply changes failed: ${err.message}`);
    } finally {
      setApplyingChanges(false);
    }
  };

  // Retry Import for corrected rows
  const handleRetryImport = async (selectedOnly = true) => {
    const rowsToRetry =
      selectedOnly && selectedIds.size > 0
        ? data.filter((r) => selectedIds.has(r.error_id))
        : data;

    if (rowsToRetry.length === 0) {
      if (onShowToast) onShowToast('info', 'No records selected for retry import.');
      return;
    }

    try {
      setRetrying(true);
      const res = await api.retryContactIncorrectData(rowsToRetry, activeTab === 'update' ? 'update' : 'insert');
      if (res && res.success) {
        if (res.importedCount > 0) {
          if (onShowToast) {
            onShowToast(
              'success',
              `Successfully imported ${res.importedCount} contact record(s) into database! (${res.stillInvalidCount} still invalid)`
            );
          }
        } else {
          if (onShowToast) {
            onShowToast(
              'warning',
              `0 imported. All ${res.stillInvalidCount} row(s) still have validation errors.`
            );
          }
        }
        setSelectedIds(new Set());
        fetchData();
      } else {
        if (onShowToast) onShowToast('error', res.message || 'Retry failed.');
      }
    } catch (err) {
      if (onShowToast) onShowToast('error', `Retry import failed: ${err.message}`);
    } finally {
      setRetrying(false);
    }
  };

  // Delete single record
  const handleDeleteSingle = async (errorId) => {
    if (!window.confirm(`Delete contact error record #${errorId}?`)) return;
    try {
      const res = await api.deleteContactIncorrectData(errorId);
      if (res && res.success) {
        if (onShowToast) onShowToast('success', `Record #${errorId} removed.`);
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(errorId);
          return next;
        });
        fetchData();
      }
    } catch (err) {
      if (onShowToast) onShowToast('error', `Delete failed: ${err.message}`);
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    if (data.length === 0) {
      if (onShowToast) onShowToast('info', 'No records to export.');
      return;
    }

    const headers = [
      'Error ID',
      'Batch ID',
      'Excel Row No',
      'Contact Name',
      'Company Name',
      'Error Message',
      'Designation',
      'Position Type',
      'Country',
      'Company Email',
      'LinkedIn URL',
      'Salesperson',
      'Created By',
      'Error Date',
    ];

    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '""';
      return `"${String(val).replace(/"/g, '""')}"`;
    };

    const lines = [
      headers.map(escapeCsv).join(','),
      ...data.map((r) =>
        [
          r.error_id,
          r.batch_id,
          r.excel_row_no,
          r.contact_name,
          r.comp_name,
          r.error_message,
          r.designation,
          r.pos_type,
          r.country,
          r.comp_email,
          r.linkedin_url,
          r.salesperson,
          r.created_by,
          r.error_date,
        ]
          .map(escapeCsv)
          .join(',')
      ),
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Contact_Incorrect_Data_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    if (onShowToast) onShowToast('success', `Exported ${data.length} row(s) to CSV.`);
  };

  const invalidColumns = useMemo(
    () => [
      {
        key: 'error_message',
        label: 'Error Message',
        minWidth: '220px',
        getValue: (r) => r.error_message || '',
        render: (r) => (
          <span
            style={{
              color: 'var(--danger, #f87171)',
              fontSize: '0.8125rem',
              fontWeight: 500,
              lineHeight: 1.4,
            }}
          >
            {r.error_message}
          </span>
        ),
      },
      { key: 'designation', label: 'Designation', minWidth: '180px', getValue: (r) => r.designation || '' },
      { key: 'desig', label: 'Desig', minWidth: '120px', getValue: (r) => r.designation || '' },
      { key: 'pos_type', label: 'Pos Type', minWidth: '130px', getValue: (r) => r.pos_type || '' },
      {
        key: 'pos_type_incorrect',
        label: 'Pos Type Incorrect',
        minWidth: '140px',
        getValue: (r) => (r.error_message && (r.error_message.toLowerCase().includes('position') || r.error_message.toLowerCase().includes('pos_type')) ? 'Yes' : 'No'),
      },
      { key: 'comp_name', label: 'Comp Name', minWidth: '160px', getValue: (r) => r.comp_name || '' },
      { key: 'comp_id', label: 'Company ID', minWidth: '100px', getValue: (r) => r.comp_id || '' },
      { key: 'comp_email', label: 'Company Email', minWidth: '160px', getValue: (r) => r.comp_email || '' },
      { key: 'linkedin_url', label: 'LinkedIn URL', minWidth: '160px', getValue: (r) => r.linkedin_url || '' },
      { key: 'created_by', label: 'Created By', minWidth: '120px', getValue: (r) => r.created_by || '' },
      { key: 'error_date', label: 'Error Date', minWidth: '120px', getValue: (r) => r.error_date || r.created_date || '' },
    ],
    []
  );

  return (
    <div className="apex-master-page" style={{ padding: '0.75rem 1.25rem 2.5rem' }}>
      {/* Top Banner Strip */}
      <div className="apex-pattern-strip" style={{ marginBottom: '1rem', height: '4px' }} />

      {/* 1. TOP MULTI-SELECT FILTER CARD MATCHING SCREENSHOT 2 */}
      <div
        className="apex-card"
        style={{
          backgroundColor: 'var(--bg-surface, #ffffff)',
          border: '1px solid var(--border, #e2e8f0)',
          borderRadius: '12px',
          padding: '1.25rem 1.5rem',
          marginBottom: '1.25rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        }}
      >
        <form onSubmit={handleFilterSearch}>
          {/* Row 1: 4 Multi-Select Columns */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '1.25rem',
              marginBottom: '1rem',
            }}
          >
            {/* Position Type Incorrect */}
            <ApexMultiSelect
              label="Position Type Incorrect"
              options={['Yes', 'No']}
              value={posTypeIncorrectFilter}
              onChange={setPosTypeIncorrectFilter}
              placeholder=""
            />

            {/* LinkedIn URL Incorrect */}
            <ApexMultiSelect
              label="LinkedIn URL Incorrect"
              options={['Yes', 'No']}
              value={linkedinUrlIncorrectFilter}
              onChange={setLinkedinUrlIncorrectFilter}
              placeholder=""
            />

            {/* Company Email Incorrect */}
            <ApexMultiSelect
              label="Company Email Incorrect"
              options={['Yes', 'No']}
              value={compEmailIncorrectFilter}
              onChange={setCompEmailIncorrectFilter}
              placeholder=""
            />

            {/* Preferred LinkedIn Connected Account Incorrect */}
            <ApexMultiSelect
              label="Preferred LinkedIn Connected Account Incorrect"
              options={['Yes', 'No']}
              value={preferredLinkedinIncorrectFilter}
              onChange={setPreferredLinkedinIncorrectFilter}
              placeholder=""
            />
          </div>

          {/* Row 2: Company ID, Designation, Error Date, Created By, Created From, Created To */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(6, 1fr)',
              gap: '1rem',
              marginBottom: '1rem',
            }}
          >
            {/* Company ID */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '5px', color: 'var(--text-main, #0f172a)' }}>
                Company ID
              </label>
              <input
                type="text"
                placeholder="Company ID"
                value={compIdFilter}
                onChange={(e) => setCompIdFilter(e.target.value)}
                style={{
                  width: '100%',
                  height: '36px',
                  backgroundColor: 'var(--bg-input, #ffffff)',
                  border: '1px solid var(--border, #cbd5e1)',
                  borderRadius: '6px',
                  padding: '0 10px',
                  fontSize: '0.825rem',
                  color: 'var(--text-main, #0f172a)',
                }}
              />
            </div>

            {/* Designation (Multi-Select) */}
            <ApexMultiSelect
              label="Designation"
              options={filterOptions.designationList}
              value={designationFilter}
              onChange={setDesignationFilter}
              placeholder=""
            />

            {/* Error Date */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '5px', color: 'var(--text-main, #0f172a)' }}>
                Error Date
              </label>
              <input
                type="date"
                value={errorDateFilter}
                onChange={(e) => setErrorDateFilter(e.target.value)}
                style={{
                  width: '100%',
                  height: '36px',
                  backgroundColor: 'var(--bg-input, #ffffff)',
                  border: '1px solid var(--border, #cbd5e1)',
                  borderRadius: '6px',
                  padding: '0 10px',
                  fontSize: '0.825rem',
                  color: 'var(--text-main, #0f172a)',
                  outline: 'none',
                }}
              />
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted, #94a3b8)', marginTop: '2px', display: 'block' }}>
                Required
              </span>
            </div>

            {/* Created By (Multi-Select) */}
            <ApexMultiSelect
              label="Created By"
              options={filterOptions.createdByList}
              value={createdByFilter}
              onChange={setCreatedByFilter}
              placeholder=""
            />

            {/* Created From */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '5px', color: 'var(--text-main, #0f172a)' }}>
                Created From
              </label>
              <input
                type="date"
                value={createdFromFilter}
                onChange={(e) => setCreatedFromFilter(e.target.value)}
                style={{
                  width: '100%',
                  height: '36px',
                  backgroundColor: 'var(--bg-input, #ffffff)',
                  border: '1px solid var(--border, #cbd5e1)',
                  borderRadius: '6px',
                  padding: '0 10px',
                  fontSize: '0.825rem',
                  color: 'var(--text-main, #0f172a)',
                  outline: 'none',
                }}
              />
            </div>

            {/* Created To */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '5px', color: 'var(--text-main, #0f172a)' }}>
                Created To
              </label>
              <input
                type="date"
                value={createdToFilter}
                onChange={(e) => setCreatedToFilter(e.target.value)}
                style={{
                  width: '100%',
                  height: '36px',
                  backgroundColor: 'var(--bg-input, #ffffff)',
                  border: '1px solid var(--border, #cbd5e1)',
                  borderRadius: '6px',
                  padding: '0 10px',
                  fontSize: '0.825rem',
                  color: 'var(--text-main, #0f172a)',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          {/* Row 3: Company Name, Error Message, Search Button, Clear Filter Button */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.5fr 2fr auto auto',
              gap: '1rem',
              alignItems: 'end',
            }}
          >
            {/* Company Name (Multi-Select) */}
            <ApexMultiSelect
              label="Company Name"
              options={filterOptions.compNameList}
              value={compNameFilter}
              onChange={setCompNameFilter}
              placeholder=""
            />

            {/* Error Message (Multi-Select) */}
            <ApexMultiSelect
              label="Error Message"
              options={filterOptions.errorMessageList}
              value={errorMessageFilter}
              onChange={setErrorMessageFilter}
              placeholder=""
            />

            {/* Search Button */}
            <div>
              <button
                type="submit"
                className="btn-primary btn-filter-search"
                style={{
                  height: '36px',
                  padding: '0 26px',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                Search
              </button>
            </div>

            {/* Clear Filter Button */}
            <div>
              <button
                type="button"
                onClick={handleClearFilters}
                className="btn-secondary btn-filter-clear"
                style={{
                  height: '36px',
                  padding: '0 22px',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                Clear Filter
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* 2. THREE TABS MATCHING SCREENSHOT 2 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid var(--border, #cbd5e1)',
          marginBottom: '1rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', gap: '1.75rem' }}>
          <button
            type="button"
            onClick={() => { setActiveTab('insert'); setPage(1); }}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'insert' ? '3px solid #16a34a' : '3px solid transparent',
              padding: '8px 2px 10px 2px',
              fontSize: '0.9rem',
              fontWeight: activeTab === 'insert' ? 700 : 500,
              color: activeTab === 'insert' ? 'var(--text-main, #0f172a)' : 'var(--text-muted, #64748b)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Contact Invalid Data (Insert Mode)
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('update'); setPage(1); }}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'update' ? '3px solid #16a34a' : '3px solid transparent',
              padding: '8px 2px 10px 2px',
              fontSize: '0.9rem',
              fontWeight: activeTab === 'update' ? 700 : 500,
              color: activeTab === 'update' ? 'var(--text-main, #0f172a)' : 'var(--text-muted, #64748b)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Contact Invalid Data (Update Mode)
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('fix_designation'); setPage(1); }}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'fix_designation' ? '3px solid #16a34a' : '3px solid transparent',
              padding: '8px 2px 10px 2px',
              fontSize: '0.9rem',
              fontWeight: activeTab === 'fix_designation' ? 700 : 500,
              color: activeTab === 'fix_designation' ? 'var(--text-main, #0f172a)' : 'var(--text-muted, #64748b)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Fix Designation
          </button>
        </div>

        {/* 3. SUB-ACTION BAR: Position Type dropdown & Apply Changes button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', paddingBottom: '6px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted, #64748b)' }}>
              Position Type
            </span>
            <select
              value={selectedPositionType}
              onChange={(e) => setSelectedPositionType(e.target.value)}
              style={{
                height: '34px',
                minWidth: '150px',
                backgroundColor: 'var(--bg-input, #ffffff)',
                border: '1px solid var(--border, #cbd5e1)',
                borderRadius: '4px',
                padding: '0 8px',
                fontSize: '0.825rem',
                color: 'var(--text-main, #0f172a)',
                fontWeight: 600,
              }}
            >
              {filterOptions.posTypeList.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={handleApplyChanges}
            disabled={applyingChanges || selectedIds.size === 0}
            className="btn-primary"
            style={{
              height: '34px',
              padding: '0 18px',
              borderRadius: '6px',
              fontSize: '0.825rem',
              fontWeight: 600,
              cursor: selectedIds.size === 0 ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap',
              alignSelf: 'flex-end',
            }}
          >
            {applyingChanges ? 'Applying...' : 'Apply Changes'}
          </button>
        </div>
      </div>

      {/* 4. MAIN INTERACTIVE REPORT REGION */}
      <div
        className="apex-card"
        style={{
          backgroundColor: 'var(--bg-surface, #ffffff)',
          borderRadius: '8px',
          border: '1px solid var(--border, #cbd5e1)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          padding: '0.75rem',
        }}
      >
        <ApexInteractiveReport
          columns={invalidColumns}
          data={data}
          total={total}
          page={page}
          onPageChange={setPage}
          rowsPerPage={limit}
          onRowsPerPageChange={(nl) => { setLimit(nl); setPage(1); }}
          search={searchInput}
          onSearchChange={setSearchInput}
          onSearchSubmit={handleSearchSubmit}
          searchPlaceholder="Search: All Text Columns"
          isServerSide={true}
          isLoading={loading}
          leadingHeader={
            <input
              type="checkbox"
              checked={total > 0 && selectedIds.size >= total}
              ref={(el) => {
                if (el) {
                  el.indeterminate = selectedIds.size > 0 && selectedIds.size < total;
                }
              }}
              onChange={handleSelectAll}
              title={
                selectedIds.size >= total && total > 0
                  ? `All ${total} records selected`
                  : `Select all ${total} records throughout report`
              }
            />
          }
          renderLeadingCell={(r) => (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
              <input
                type="checkbox"
                checked={selectedIds.has(r.error_id)}
                onChange={() => handleToggleSelect(r.error_id)}
              />
              <button
                type="button"
                onClick={() => handleDeleteSingle(r.error_id)}
                title="Delete Record"
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted, #94a3b8)',
                  cursor: 'pointer',
                  padding: '2px',
                }}
                onMouseOver={(e) => (e.currentTarget.style.color = '#dc2626')}
                onMouseOut={(e) => (e.currentTarget.style.color = 'var(--text-muted, #94a3b8)')}
              >
                <IconTrash size={14} />
              </button>
            </div>
          )}
          toolbarButtons={
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => handleRetryImport(true)}
                disabled={retrying || (selectedIds.size === 0 && total === 0)}
                className="btn-primary"
                style={{
                  height: '34px',
                  padding: '0 14px',
                  borderRadius: '4px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <IconRefresh size={14} className={retrying ? 'animate-spin' : ''} />
                {retrying ? 'Importing...' : selectedIds.size > 0 ? `Revalidate (${selectedIds.size})` : 'Revalidate All'}
              </button>
            </div>
          }
          onRefresh={fetchData}
          onReset={handleResetSearch}
          onDownload={handleExportCsv}
          onShowToast={onShowToast}
        />

        {/* Footer Record & Selection Count */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '8px 12px',
            fontSize: '0.825rem',
            color: 'var(--text-muted, #64748b)',
            borderTop: '1px solid var(--border, #cbd5e1)',
            marginTop: '8px',
          }}
        >
          <span>
            {selectedIds.size} rows selected
          </span>
          <span style={{ fontWeight: 600 }}>
            Total {total.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}
