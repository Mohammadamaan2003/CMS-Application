import React, { useState, useEffect, useCallback } from 'react';
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
} from '../../components/Icons';

export default function ContactIncorrectDataPage({ onShowToast, onNavigateToUpload }) {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [isEditingGrid, setIsEditingGrid] = useState(false);

  // Batch filter
  const [batches, setBatches] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState('');

  // Search & Pagination
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showActionsDropdown, setShowActionsDropdown] = useState(false);

  // Fetch batches
  const fetchBatches = useCallback(async () => {
    try {
      const res = await api.getUploadBatches();
      if (res && res.success && Array.isArray(res.contactBatches)) {
        setBatches(res.contactBatches);
      }
    } catch (err) {
      console.error('Error fetching contact batches:', err);
    }
  }, []);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

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
  }, [searchQuery, selectedBatchId, page, limit, onShowToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle Search
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

  const handleSelectAll = () => {
    if (selectedIds.size === data.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(data.map((r) => r.error_id)));
    }
  };

  // Inline Cell Change
  const handleCellChange = (errorId, field, val) => {
    setData((prev) =>
      prev.map((row) => (row.error_id === errorId ? { ...row, [field]: val } : row))
    );
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
      const res = await api.retryContactIncorrectData(rowsToRetry, 'insert');
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
        fetchBatches();
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
        fetchBatches();
      }
    } catch (err) {
      if (onShowToast) onShowToast('error', `Delete failed: ${err.message}`);
    }
  };

  // Clear selected or clear all
  const handleClearSelected = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Delete ${selectedIds.size} selected contact error record(s)?`)) return;
    try {
      const res = await api.clearContactIncorrectData(Array.from(selectedIds));
      if (res && res.success) {
        if (onShowToast) onShowToast('success', `Removed ${selectedIds.size} record(s).`);
        setSelectedIds(new Set());
        fetchData();
        fetchBatches();
      }
    } catch (err) {
      if (onShowToast) onShowToast('error', `Bulk delete failed: ${err.message}`);
    }
  };

  const handleClearAll = async () => {
    if (total === 0) return;
    if (!window.confirm(`Are you sure you want to clear ALL ${total} contact error records?`)) return;
    try {
      const res = await api.clearContactIncorrectData(null);
      if (res && res.success) {
        if (onShowToast) onShowToast('success', 'All contact incorrect data cleared.');
        setSelectedIds(new Set());
        fetchData();
        fetchBatches();
      }
    } catch (err) {
      if (onShowToast) onShowToast('error', `Clear failed: ${err.message}`);
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
      'Email',
      'Phone',
      'LinkedIn URL',
      'Salesperson',
      'Source',
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
          r.contact_phone,
          r.linkedin_url,
          r.salesperson,
          r.source,
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

  const startRecord = total > 0 ? (page - 1) * limit + 1 : 0;
  const endRecord = Math.min(page * limit, total);
  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="apex-master-page" style={{ padding: '0.75rem 1.25rem 2.5rem' }}>
      {/* Top Banner Strip */}
      <div className="apex-pattern-strip" style={{ marginBottom: '1rem', height: '4px' }} />

      {/* Page Title & Summary Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#071531',
          color: '#ffffff',
          borderRadius: '8px 8px 0 0',
          padding: '0.875rem 1.25rem',
          marginBottom: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <IconAlertTriangle size={20} className="text-amber-400" />
          <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 600, letterSpacing: '-0.01em' }}>
            Contact Incorrect Data
          </h2>
          <span
            style={{
              backgroundColor: total > 0 ? '#ef4444' : '#10b981',
              color: '#ffffff',
              fontSize: '0.75rem',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '12px',
            }}
          >
            {total} {total === 1 ? 'Error' : 'Errors'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {onNavigateToUpload && (
            <button
              type="button"
              onClick={onNavigateToUpload}
              style={{
                backgroundColor: '#ffffff',
                color: '#071531',
                border: 'none',
                borderRadius: '4px',
                padding: '6px 12px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Back to Contact Upload
            </button>
          )}
        </div>
      </div>

      {/* Main Interactive Report Card */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '0 0 8px 8px',
          border: '1px solid #e2e8f0',
          borderTop: 'none',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          padding: '1rem',
        }}
      >
        {/* Toolbar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
            marginBottom: '1rem',
            paddingBottom: '0.75rem',
            borderBottom: '1px solid #f1f5f9',
          }}
        >
          {/* Left: Search input + Go + Batch Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <form
              onSubmit={handleSearchSubmit}
              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <span
                  style={{
                    position: 'absolute',
                    left: '10px',
                    color: '#94a3b8',
                    display: 'flex',
                    alignItems: 'center',
                    pointerEvents: 'none',
                  }}
                >
                  <IconSearch size={15} />
                </span>
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search All Text Columns"
                  style={{
                    height: '34px',
                    width: '240px',
                    paddingLeft: '32px',
                    paddingRight: '10px',
                    fontSize: '0.825rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '4px',
                    outline: 'none',
                  }}
                />
              </div>
              <button
                type="submit"
                style={{
                  height: '34px',
                  padding: '0 12px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: '#334155',
                  cursor: 'pointer',
                }}
              >
                Go
              </button>
              {searchQuery && (
                <button
                  type="button"
                  onClick={handleResetSearch}
                  style={{
                    height: '34px',
                    padding: '0 10px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '4px',
                    fontSize: '0.775rem',
                    color: '#64748b',
                    cursor: 'pointer',
                  }}
                >
                  Clear
                </button>
              )}
            </form>

            {/* Batch ID Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: '#475569' }}>
              <span style={{ fontWeight: 500 }}>Batch:</span>
              <select
                value={selectedBatchId}
                onChange={(e) => {
                  setSelectedBatchId(e.target.value);
                  setPage(1);
                }}
                style={{
                  height: '34px',
                  padding: '0 8px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px',
                  fontSize: '0.8rem',
                  backgroundColor: '#ffffff',
                  outline: 'none',
                  cursor: 'pointer',
                  maxWidth: '170px',
                }}
              >
                <option value="">All Batches</option>
                {batches.map((b) => (
                  <option key={b.batch_id} value={b.batch_id}>
                    Batch #{b.batch_id} ({b.count} err)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Right: Rows, Edit Mode, Revalidate & Import, Actions, Refresh */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: '#475569' }}>
              <span>Rows</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                style={{
                  height: '34px',
                  padding: '0 8px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px',
                  fontSize: '0.8rem',
                  backgroundColor: '#ffffff',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            {/* Edit Mode Toggle */}
            <button
              type="button"
              onClick={() => setIsEditingGrid(!isEditingGrid)}
              title="Toggle inline edit mode to fix values before retry"
              style={{
                height: '34px',
                padding: '0 12px',
                backgroundColor: isEditingGrid ? '#eff6ff' : '#ffffff',
                border: isEditingGrid ? '1px solid #3b82f6' : '1px solid #cbd5e1',
                borderRadius: '4px',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: isEditingGrid ? '#1d4ed8' : '#334155',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <IconEdit size={14} />
              {isEditingGrid ? 'Done Editing' : 'Edit Mode'}
            </button>

            {/* Revalidate & Import Button */}
            <button
              type="button"
              disabled={retrying || (selectedIds.size === 0 && data.length === 0)}
              onClick={() => handleRetryImport(selectedIds.size > 0)}
              title="Re-validate rows and import valid ones into the CRM database"
              style={{
                height: '34px',
                padding: '0 14px',
                backgroundColor: '#071531',
                border: '1px solid #071531',
                borderRadius: '4px',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: '#ffffff',
                cursor: retrying || (selectedIds.size === 0 && data.length === 0) ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                opacity: retrying ? 0.7 : 1,
              }}
            >
              <IconRefresh size={14} className={retrying ? 'animate-spin' : ''} />
              {retrying
                ? 'Importing...'
                : selectedIds.size > 0
                ? `Revalidate & Import (${selectedIds.size})`
                : 'Revalidate & Import All'}
            </button>

            {/* Actions Menu */}
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
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: '#334155',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                Actions ▾
              </button>

              {showActionsDropdown && (
                <div
                  style={{
                    position: 'absolute',
                    top: '38px',
                    right: 0,
                    width: '180px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    zIndex: 50,
                    overflow: 'hidden',
                  }}
                  onMouseLeave={() => setShowActionsDropdown(false)}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setShowActionsDropdown(false);
                      handleExportCsv();
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      textAlign: 'left',
                      fontSize: '0.8rem',
                      border: 'none',
                      backgroundColor: 'transparent',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      color: '#334155',
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                    onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <IconDownload size={14} /> Download CSV
                  </button>

                  {selectedIds.size > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowActionsDropdown(false);
                        handleClearSelected();
                      }}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        textAlign: 'left',
                        fontSize: '0.8rem',
                        border: 'none',
                        backgroundColor: 'transparent',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        color: '#dc2626',
                      }}
                      onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#fef2f2')}
                      onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <IconTrash size={14} /> Delete Selected ({selectedIds.size})
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setShowActionsDropdown(false);
                      handleClearAll();
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      textAlign: 'left',
                      fontSize: '0.8rem',
                      border: 'none',
                      backgroundColor: 'transparent',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      color: '#dc2626',
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#fef2f2')}
                    onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <IconTrash size={14} /> Clear All Records
                  </button>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                fetchData();
                fetchBatches();
              }}
              title="Refresh Data"
              style={{
                height: '34px',
                width: '34px',
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '4px',
                color: '#475569',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <IconRefresh size={15} />
            </button>
          </div>
        </div>

        {/* Selected rows action bar */}
        {selectedIds.size > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: '4px',
              padding: '6px 12px',
              marginBottom: '0.75rem',
              fontSize: '0.8rem',
              color: '#1e40af',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 600 }}>{selectedIds.size} row(s) selected</span>
              <span>— edit values in table and click "Revalidate & Import" to save to CRM database</span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => handleRetryImport(true)}
                disabled={retrying}
                style={{
                  backgroundColor: '#071531',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '3px',
                  padding: '4px 12px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: retrying ? 'not-allowed' : 'pointer',
                }}
              >
                {retrying ? 'Importing...' : 'Revalidate & Import'}
              </button>
              <button
                type="button"
                onClick={handleClearSelected}
                style={{
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '3px',
                  padding: '4px 10px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Delete Selected
              </button>
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                style={{
                  backgroundColor: '#ffffff',
                  color: '#64748b',
                  border: '1px solid #cbd5e1',
                  borderRadius: '3px',
                  padding: '4px 8px',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                }}
              >
                Deselect All
              </button>
            </div>
          </div>
        )}

        {/* Data Table */}
        <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '4px' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              textAlign: 'left',
              fontSize: '0.8rem',
              color: '#334155',
            }}
          >
            <thead>
              <tr
                style={{
                  backgroundColor: '#f8fafc',
                  borderBottom: '2px solid #e2e8f0',
                  color: '#475569',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                }}
              >
                <th style={{ padding: '8px 10px', width: '36px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={data.length > 0 && selectedIds.size === data.length}
                    onChange={handleSelectAll}
                  />
                </th>
                <th style={{ padding: '8px 10px', width: '40px', textAlign: 'center' }}>Del</th>
                <th style={{ padding: '8px 10px' }}>Error ID</th>
                <th style={{ padding: '8px 10px' }}>Batch ID</th>
                <th style={{ padding: '8px 10px' }}>Row No</th>
                <th style={{ padding: '8px 10px', minWidth: '160px' }}>Contact Name</th>
                <th style={{ padding: '8px 10px', minWidth: '150px' }}>Company Name</th>
                <th style={{ padding: '8px 10px', minWidth: '220px' }}>Error Message</th>
                <th style={{ padding: '8px 10px', minWidth: '130px' }}>Designation</th>
                <th style={{ padding: '8px 10px', minWidth: '120px' }}>Pos Type</th>
                <th style={{ padding: '8px 10px', minWidth: '120px' }}>Country</th>
                <th style={{ padding: '8px 10px', minWidth: '150px' }}>Company Email</th>
                <th style={{ padding: '8px 10px', minWidth: '120px' }}>Contact Phone</th>
                <th style={{ padding: '8px 10px', minWidth: '140px' }}>LinkedIn URL</th>
                <th style={{ padding: '8px 10px', minWidth: '120px' }}>Salesperson</th>
                <th style={{ padding: '8px 10px', minWidth: '110px' }}>Source</th>
                <th style={{ padding: '8px 10px' }}>Error Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={17} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                    Loading contact incorrect data...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={17} style={{ padding: '2.5rem', textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                      <IconCheckCircle size={32} style={{ color: '#10b981' }} />
                      <div style={{ fontWeight: 600, color: '#1e293b' }}>No Contact Errors Found</div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        All uploaded contact records passed validation without errors.
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                data.map((r) => {
                  const isSelected = selectedIds.has(r.error_id);
                  return (
                    <tr
                      key={r.error_id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        backgroundColor: isSelected ? '#fef2f2' : 'transparent',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseOver={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = '#fafafa';
                      }}
                      onMouseOut={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(r.error_id)}
                        />
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleDeleteSingle(r.error_id)}
                          title="Delete Record"
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#94a3b8',
                            cursor: 'pointer',
                            padding: '2px',
                          }}
                          onMouseOver={(e) => (e.currentTarget.style.color = '#dc2626')}
                          onMouseOut={(e) => (e.currentTarget.style.color = '#94a3b8')}
                        >
                          <IconTrash size={14} />
                        </button>
                      </td>
                      <td style={{ padding: '8px 10px', fontWeight: 600, color: '#64748b' }}>
                        {r.error_id}
                      </td>
                      <td style={{ padding: '8px 10px', color: '#64748b' }}>{r.batch_id}</td>
                      <td style={{ padding: '8px 10px', fontWeight: 600 }}>{r.excel_row_no}</td>

                      {/* Contact Name */}
                      <td style={{ padding: '6px 10px', fontWeight: 600, color: '#1e293b' }}>
                        {isEditingGrid ? (
                          <input
                            type="text"
                            value={r.contact_name || ''}
                            onChange={(e) => handleCellChange(r.error_id, 'contact_name', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '4px 6px',
                              fontSize: '0.775rem',
                              border: '1px solid #93c5fd',
                              borderRadius: '3px',
                              backgroundColor: '#ffffff',
                            }}
                          />
                        ) : (
                          r.contact_name || '—'
                        )}
                      </td>

                      {/* Company Name */}
                      <td style={{ padding: '6px 10px', color: '#334155' }}>
                        {isEditingGrid ? (
                          <input
                            type="text"
                            value={r.comp_name || ''}
                            onChange={(e) => handleCellChange(r.error_id, 'comp_name', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '4px 6px',
                              fontSize: '0.775rem',
                              border: '1px solid #93c5fd',
                              borderRadius: '3px',
                              backgroundColor: '#ffffff',
                            }}
                          />
                        ) : (
                          r.comp_name || '—'
                        )}
                      </td>

                      {/* Error Message */}
                      <td style={{ padding: '8px 10px' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            backgroundColor: '#fee2e2',
                            color: '#991b1b',
                            border: '1px solid #fca5a5',
                            borderRadius: '4px',
                            padding: '3px 8px',
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            lineHeight: 1.3,
                          }}
                        >
                          {r.error_message}
                        </span>
                      </td>

                      {/* Designation */}
                      <td style={{ padding: '6px 10px' }}>
                        {isEditingGrid ? (
                          <input
                            type="text"
                            value={r.designation || ''}
                            onChange={(e) => handleCellChange(r.error_id, 'designation', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '4px 6px',
                              fontSize: '0.775rem',
                              border: '1px solid #93c5fd',
                              borderRadius: '3px',
                              backgroundColor: '#ffffff',
                            }}
                          />
                        ) : (
                          r.designation || '—'
                        )}
                      </td>

                      {/* Pos Type */}
                      <td style={{ padding: '6px 10px' }}>
                        {isEditingGrid ? (
                          <input
                            type="text"
                            value={r.pos_type || ''}
                            onChange={(e) => handleCellChange(r.error_id, 'pos_type', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '4px 6px',
                              fontSize: '0.775rem',
                              border: '1px solid #93c5fd',
                              borderRadius: '3px',
                              backgroundColor: '#ffffff',
                            }}
                          />
                        ) : (
                          r.pos_type || '—'
                        )}
                      </td>

                      {/* Country */}
                      <td style={{ padding: '6px 10px' }}>
                        {isEditingGrid ? (
                          <input
                            type="text"
                            value={r.country || ''}
                            onChange={(e) => handleCellChange(r.error_id, 'country', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '4px 6px',
                              fontSize: '0.775rem',
                              border: '1px solid #93c5fd',
                              borderRadius: '3px',
                              backgroundColor: '#ffffff',
                            }}
                          />
                        ) : (
                          r.country || '—'
                        )}
                      </td>

                      {/* Company Email */}
                      <td style={{ padding: '6px 10px' }}>
                        {isEditingGrid ? (
                          <input
                            type="text"
                            value={r.comp_email || ''}
                            onChange={(e) => handleCellChange(r.error_id, 'comp_email', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '4px 6px',
                              fontSize: '0.775rem',
                              border: '1px solid #93c5fd',
                              borderRadius: '3px',
                              backgroundColor: '#ffffff',
                            }}
                          />
                        ) : (
                          r.comp_email || '—'
                        )}
                      </td>

                      {/* Contact Phone */}
                      <td style={{ padding: '6px 10px' }}>
                        {isEditingGrid ? (
                          <input
                            type="text"
                            value={r.contact_phone || ''}
                            onChange={(e) => handleCellChange(r.error_id, 'contact_phone', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '4px 6px',
                              fontSize: '0.775rem',
                              border: '1px solid #93c5fd',
                              borderRadius: '3px',
                              backgroundColor: '#ffffff',
                            }}
                          />
                        ) : (
                          r.contact_phone || '—'
                        )}
                      </td>

                      {/* LinkedIn URL */}
                      <td style={{ padding: '6px 10px' }}>
                        {isEditingGrid ? (
                          <input
                            type="text"
                            value={r.linkedin_url || ''}
                            onChange={(e) => handleCellChange(r.error_id, 'linkedin_url', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '4px 6px',
                              fontSize: '0.775rem',
                              border: '1px solid #93c5fd',
                              borderRadius: '3px',
                              backgroundColor: '#ffffff',
                            }}
                          />
                        ) : (
                          <span title={r.linkedin_url} style={{ display: 'block', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {r.linkedin_url || '—'}
                          </span>
                        )}
                      </td>

                      {/* Salesperson */}
                      <td style={{ padding: '6px 10px' }}>
                        {isEditingGrid ? (
                          <input
                            type="text"
                            value={r.salesperson || ''}
                            onChange={(e) => handleCellChange(r.error_id, 'salesperson', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '4px 6px',
                              fontSize: '0.775rem',
                              border: '1px solid #93c5fd',
                              borderRadius: '3px',
                              backgroundColor: '#ffffff',
                            }}
                          />
                        ) : (
                          r.salesperson || '—'
                        )}
                      </td>

                      {/* Source */}
                      <td style={{ padding: '6px 10px' }}>
                        {isEditingGrid ? (
                          <input
                            type="text"
                            value={r.source || ''}
                            onChange={(e) => handleCellChange(r.error_id, 'source', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '4px 6px',
                              fontSize: '0.775rem',
                              border: '1px solid #93c5fd',
                              borderRadius: '3px',
                              backgroundColor: '#ffffff',
                            }}
                          />
                        ) : (
                          r.source || '—'
                        )}
                      </td>

                      {/* Error Date */}
                      <td style={{ padding: '8px 10px', color: '#64748b', whiteSpace: 'nowrap' }}>
                        {r.error_date || r.created_date || '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '1rem',
            marginTop: '1rem',
            paddingTop: '0.75rem',
            borderTop: '1px solid #f1f5f9',
            fontSize: '0.8rem',
            color: '#64748b',
          }}
        >
          <span>
            {startRecord} - {endRecord} of {total}
          </span>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              style={{
                height: '30px',
                width: '30px',
                backgroundColor: page <= 1 ? '#f8fafc' : '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '4px',
                color: page <= 1 ? '#cbd5e1' : '#334155',
                cursor: page <= 1 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <IconChevronLeft size={14} />
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              style={{
                height: '30px',
                width: '30px',
                backgroundColor: page >= totalPages ? '#f8fafc' : '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '4px',
                color: page >= totalPages ? '#cbd5e1' : '#334155',
                cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <IconChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
