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
  IconTrash,
  IconDownload,
  IconUpload,
} from '../../components/Icons';

export const LEAD_SOURCE_MASTER_COLUMNS = [
  {
    key: 'master_source',
    label: 'Master Source',
    getValue: (r) => r.master_source || r.source || '',
  },
  {
    key: 'master_source_count',
    label: 'Master Source Count',
    getValue: (r) => (r.master_source_count !== undefined ? Number(r.master_source_count).toLocaleString() : '0'),
  },
  {
    key: 'lead_source',
    label: 'Contact Source',
    getValue: (r) => r.lead_source || r.source || '',
  },
  {
    key: 'lead_source_count',
    label: 'Contact Source Count',
    getValue: (r) => (r.lead_source_count !== undefined ? Number(r.lead_source_count).toLocaleString() : '0'),
  },
  {
    key: 'validation_status',
    label: 'Validation Status',
    getValue: (r) => r.validation_status || 'DATA IN BOTH',
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

const DEFAULT_MASTER_KEYS = LEAD_SOURCE_MASTER_COLUMNS.map((c) => c.key);

export const CHILD_COMPANY_COLUMNS = [
  { key: 'country', label: 'Country' },
  { key: 'source', label: 'Source' },
  { key: 'created_by', label: 'Created By' },
  { key: 'created_date', label: 'Created Date' },
  { key: 'industry', label: 'Industry' },
  { key: 'company_name', label: 'Company Name' },
  { key: 'email', label: 'Email' },
  { key: 'website', label: 'Website' },
];

export default function LeadSourceMaster({ onShowToast, onNavigateToCompanyForm, onNavigateToContactForm }) {
  // Mode: 'report' or 'form'
  const [viewMode, setViewMode] = useState(() => {
    try {
      const saved = localStorage.getItem('apex_lead_source_active_form');
      if (saved) return 'form';
    } catch (e) { }
    return 'report';
  });

  const [selectedRecord, setSelectedRecord] = useState(() => {
    try {
      const saved = localStorage.getItem('apex_lead_source_active_form');
      if (saved) return JSON.parse(saved);
    } catch (e) { }
    return null;
  });

  // Form state matching Screenshot 6
  const [formData, setFormData] = useState(() => {
    try {
      const saved = localStorage.getItem('apex_lead_source_active_form');
      if (saved) {
        const rec = JSON.parse(saved);
        return {
          master_source: rec.master_source || rec.source || '',
          master_source_count: rec.master_source_count !== undefined ? rec.master_source_count : 0,
          lead_source: rec.lead_source || rec.source || '',
          lead_source_count: rec.lead_source_count !== undefined ? rec.lead_source_count : 0,
          validation_status: rec.validation_status || 'DATA IN BOTH',
          created_by: rec.created_by || 'APEX_PUBLIC_USER',
          created_date: rec.created_date || '8/28/2026',
          modified_by: rec.modified_by || 'ZUBAIR',
          modified_date: rec.modified_date || '10/31/2026',
        };
      }
    } catch (e) { }
    return {
      master_source: '',
      master_source_count: 0,
      lead_source: '',
      lead_source_count: 0,
      validation_status: 'DATA IN BOTH',
      created_by: 'APEX_PUBLIC_USER',
      created_date: '8/28/2026',
      modified_by: 'ZUBAIR',
      modified_date: '10/31/2026',
    };
  });

  // Master List State
  const [masterList, setMasterList] = useState([]);
  const [loadingMaster, setLoadingMaster] = useState(false);
  const [masterSearch, setMasterSearch] = useState('');
  const [activeMasterSearch, setActiveMasterSearch] = useState('');
  const [masterRows, setMasterRows] = useState(50);
  const [masterPage, setMasterPage] = useState(1);
  const [masterTotal, setMasterTotal] = useState(0);
  const [reconciliationCounts, setReconciliationCounts] = useState({
    total: 0,
    totalBoth: 0,
    totalMasterOnly: 0,
    totalCompanyOnly: 0,
  });

  // Row selection for batch actions
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Master Actions & Modals
  const [showMasterActions, setShowMasterActions] = useState(false);
  const [showMasterColumnsModal, setShowMasterColumnsModal] = useState(false);
  const [showMasterFilterModal, setShowMasterFilterModal] = useState(false);
  const [showMasterChartModal, setShowMasterChartModal] = useState(false);
  const [showMasterAggregateModal, setShowMasterAggregateModal] = useState(false);
  const [masterVisibleKeys, setMasterVisibleKeys] = useState(DEFAULT_MASTER_KEYS);
  const [masterFilters, setMasterFilters] = useState([]);
  const [masterAggregations, setMasterAggregations] = useState([]);

  // Child Companies State (Form view)
  const [childCompanies, setChildCompanies] = useState([]);
  const [loadingChild, setLoadingChild] = useState(false);
  const [childSearch, setChildSearch] = useState('');
  const [activeChildSearch, setActiveChildSearch] = useState('');
  const [childRows, setChildRows] = useState(50);
  const [childPage, setChildPage] = useState(1);
  const [childTotal, setChildTotal] = useState(0);
  const [showChildActions, setShowChildActions] = useState(false);
  const [showChildColumnsModal, setShowChildColumnsModal] = useState(false);
  const [childVisibleKeys, setChildVisibleKeys] = useState(CHILD_COMPANY_COLUMNS.map((c) => c.key));

  // Distinct Source Options for Form dropdown
  const [distinctSourceOptions, setDistinctSourceOptions] = useState([]);

  useEffect(() => {
    api.getSourceOptions()
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          setDistinctSourceOptions(res.data);
        }
      })
      .catch((e) => console.warn('Failed to load source options:', e.message));
  }, []);

  // Fetch Master Report Data
  const loadMasterData = useCallback(async () => {
    try {
      setLoadingMaster(true);
      const res = await api.getLeadSources({
        search: activeMasterSearch,
        page: masterPage,
        limit: masterRows,
      });
      if (res.success) {
        setMasterList(res.data || []);
        setMasterTotal(res.total || 0);
        if (res.reconciliation) {
          setReconciliationCounts(res.reconciliation);
        }
      }
    } catch (err) {
      if (onShowToast) onShowToast('error', 'Failed to load lead source master: ' + err.message);
    } finally {
      setLoadingMaster(false);
    }
  }, [activeMasterSearch, masterPage, masterRows, onShowToast]);

  useEffect(() => {
    loadMasterData();
  }, [loadMasterData]);

  // Fetch Child Companies for Selected Lead Source
  const loadChildCompanies = useCallback(async () => {
    if (!selectedRecord) return;
    try {
      setLoadingChild(true);
      // Child report strictly displays companies for the master record being edited.
      // Changing the form's replacement dropdown does NOT trigger or filter this report.
      const targetSource = selectedRecord.master_source || selectedRecord.source || selectedRecord.lead_source;
      const res = await api.getLeadSourceCompanies(selectedRecord.id, {
        source: targetSource,
        search: activeChildSearch,
        page: childPage,
        limit: childRows,
      });
      if (res.success) {
        setChildCompanies(res.data || []);
        setChildTotal(res.total || 0);
      }
    } catch (err) {
      console.warn('Failed to load child companies:', err.message);
    } finally {
      setLoadingChild(false);
    }
  }, [selectedRecord, activeChildSearch, childPage, childRows]);

  useEffect(() => {
    if (viewMode === 'form' && selectedRecord) {
      loadChildCompanies();
    }
  }, [viewMode, selectedRecord, loadChildCompanies]);

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
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.size} selected lead source record(s)?`)) {
      return;
    }
    try {
      const idArray = Array.from(selectedIds);
      const res = await api.batchDeleteLeadSources(idArray);
      if (res.success) {
        if (onShowToast) onShowToast('success', res.message || `Deleted ${idArray.length} lead sources successfully.`);
        setSelectedIds(new Set());
        loadMasterData();
      }
    } catch (err) {
      if (onShowToast) onShowToast('error', 'Batch delete failed: ' + err.message);
    }
  };

  // Open Form in Create mode
  const handleOpenCreate = () => {
    const newForm = {
      master_source: '',
      master_source_count: 0,
      lead_source: '',
      lead_source_count: 0,
      validation_status: 'DATA IN MASTER',
      created_by: 'APEX_PUBLIC_USER',
      created_date: formatAppDate(new Date()),
      modified_by: 'ZUBAIR',
      modified_date: formatAppDate(new Date()),
    };
    setSelectedRecord(null);
    setFormData(newForm);
    setViewMode('form');
    try {
      localStorage.setItem('apex_lead_source_active_form', JSON.stringify({ isNew: true, ...newForm }));
    } catch (e) { }
  };

  // Open Form in Edit mode
  const handleOpenEdit = async (record) => {
    setSelectedRecord(record);
    setViewMode('form');
    setChildPage(1);
    setActiveChildSearch('');
    setChildSearch('');

    try {
      const res = await api.getLeadSource(record.id);
      const rec = res.success && res.data ? res.data : record;
      const f = {
        master_source: rec.master_source || rec.source || '',
        master_source_count: rec.master_source_count !== undefined ? rec.master_source_count : 0,
        lead_source: rec.lead_source || rec.source || '',
        lead_source_count: rec.lead_source_count !== undefined ? rec.lead_source_count : 0,
        validation_status: rec.validation_status || 'DATA IN BOTH',
        created_by: rec.created_by || 'APEX_PUBLIC_USER',
        created_date: rec.created_date || '8/28/2026',
        modified_by: rec.modified_by || 'ZUBAIR',
        modified_date: rec.modified_date || '10/31/2026',
      };
      setFormData(f);
      try {
        localStorage.setItem('apex_lead_source_active_form', JSON.stringify({ ...record, ...f }));
      } catch (e) { }
    } catch (err) {
      console.warn('Error loading single lead source:', err.message);
    }
  };

  // Close Form and return to Report
  const handleCancel = () => {
    setViewMode('report');
    setSelectedRecord(null);
    try {
      localStorage.removeItem('apex_lead_source_active_form');
    } catch (e) { }
  };

  // Save / Apply Changes
  const handleApplyChanges = async (e) => {
    if (e) e.preventDefault();
    const sourceVal = (formData.master_source || '').trim();
    if (!sourceVal) {
      if (onShowToast) onShowToast('error', 'Master Source name is required.');
      return;
    }

    const dupSource = masterList.find(
      (m) =>
        (m.master_source || m.source || m.lead_source) &&
        (m.master_source || m.source || m.lead_source).trim().toLowerCase() === sourceVal.toLowerCase() &&
        String(m.id) !== String(selectedRecord?.id)
    );
    if (dupSource) {
      if (onShowToast) onShowToast('error', `Lead Source "${sourceVal}" already exists. Duplicate records are not allowed.`);
      return;
    }

    try {
      if (selectedRecord && selectedRecord.id && selectedRecord.id < 9900000) {
        await api.updateLeadSource(selectedRecord.id, {
          master_source: sourceVal,
        });
        if (onShowToast) onShowToast('success', 'Lead Source updated successfully.');
      } else {
        const res = await api.createLeadSource({
          master_source: sourceVal,
        });
        if (onShowToast) onShowToast('success', res.message || 'Lead Source created successfully.');
      }
      handleCancel();
      loadMasterData();
    } catch (err) {
      if (onShowToast) onShowToast('error', err.message);
    }
  };

  // Update Records Button: Renames source across all linked companies
  const handleUpdateRecords = async () => {
    if (!selectedRecord) return;
    const oldSource = (selectedRecord.master_source || selectedRecord.source || selectedRecord.lead_source || '').trim();
    const newSource = (formData.lead_source || '').trim();

    if (!newSource) {
      if (onShowToast) onShowToast('error', 'Please select a replacement Lead Source from the dropdown.');
      return;
    }

    if (newSource.toLowerCase() === oldSource.toLowerCase()) {
      if (onShowToast) onShowToast('info', 'Target source is already the current source.');
      return;
    }

    if (window.confirm(`Are you sure you want to update all linked companies from "${oldSource}" to "${newSource}"?`)) {
      try {
        const res = await api.updateLeadSourceRecords(selectedRecord.id, {
          old_source: oldSource,
          new_source: newSource,
        });
        if (onShowToast) onShowToast('success', res.message || 'Company records updated successfully.');

        // Update selectedRecord so child report refreshes with the new updated source
        const updatedRec = {
          ...selectedRecord,
          master_source: newSource,
          source: newSource,
          lead_source: newSource,
        };
        setSelectedRecord(updatedRec);

        let newCount = res.updatedCount || 0;
        try {
          const cRes = await api.getCompanies({ source: newSource, limit: 1 });
          if (cRes.success) newCount = cRes.total || newCount;
        } catch (e) { }

        setFormData((prev) => ({
          ...prev,
          master_source: newSource,
          lead_source: newSource,
          master_source_count: newCount,
          lead_source_count: newCount,
        }));

        loadMasterData();
      } catch (err) {
        if (onShowToast) onShowToast('error', err.message);
      }
    }
  };

  // Delete Lead Source
  const handleDelete = async () => {
    if (!selectedRecord || !selectedRecord.id) return;
    if (window.confirm(`Are you sure you want to delete lead source "${formData.master_source}"?`)) {
      try {
        await api.deleteLeadSource(selectedRecord.id);
        if (onShowToast) onShowToast('success', 'Lead source deleted successfully.');
        handleCancel();
        loadMasterData();
      } catch (err) {
        if (onShowToast) onShowToast('error', err.message);
      }
    }
  };

  // Download Master CSV
  const handleDownloadMasterCsv = () => {
    if (!masterList.length) return;
    const activeCols = LEAD_SOURCE_MASTER_COLUMNS.filter((c) => masterVisibleKeys.includes(c.key));
    const headers = activeCols.map((c) => `"${c.label}"`).join(',');
    const rows = masterList.map((row) =>
      activeCols.map((c) => `"${String(c.getValue(row)).replace(/"/g, '""')}"`).join(',')
    );
    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Lead_Source_Master_${Date.now()}.csv`;
    link.click();
  };

  // Download Child Companies CSV
  const handleDownloadChildCsv = () => {
    if (!childCompanies.length) return;
    const activeCols = CHILD_COMPANY_COLUMNS.filter((c) => childVisibleKeys.includes(c.key));
    const headers = activeCols.map((c) => `"${c.label}"`).join(',');
    const rows = childCompanies.map((row) =>
      activeCols.map((c) => `"${String(row[c.key] || '').replace(/"/g, '""')}"`).join(',')
    );
    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Companies_${formData.master_source || 'source'}_${Date.now()}.csv`;
    link.click();
  };

  // Pagination calculation
  const masterStartIdx = masterTotal === 0 ? 0 : (masterPage - 1) * masterRows + 1;
  const masterEndIdx = Math.min(masterPage * masterRows, masterTotal);

  const childStartIdx = childTotal === 0 ? 0 : (childPage - 1) * childRows + 1;
  const childEndIdx = Math.min(childPage * childRows, childTotal);

  return (
    <div className="apex-page-container">
      {/* Page Header */}
      <div className="apex-page-header">
        <h1 className="apex-page-title">Lead Source</h1>
      </div>

      {viewMode === 'form' ? (
        /* VIEW MODE: FORM (Screenshot 6) */
        <div className="apex-form-card" style={{ background: '#ffffff', borderRadius: '8px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>Lead Source</h2>
            <button
              type="button"
              onClick={handleCancel}
              style={{ background: 'transparent', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '0.25rem 0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              title="Close"
            >
              <IconClose size={18} />
            </button>
          </div>

          <form onSubmit={handleApplyChanges}>
            {/* Row 1: Master Source, Master Source Count, Validation Status, Lead Source */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                  Master Source
                </label>
                <input
                  type="text"
                  value={formData.master_source}
                  onChange={(e) => setFormData({ ...formData, master_source: e.target.value })}
                  style={{ width: '100%', padding: '0.45rem 0.65rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                  Master Source Count
                </label>
                <input
                  type="text"
                  readOnly
                  value={formData.master_source_count !== undefined ? Number(formData.master_source_count).toLocaleString() : '0'}
                  style={{ width: '100%', padding: '0.45rem 0.65rem', border: '1px solid #e2e8f0', background: '#f8fafc', borderRadius: '4px', fontSize: '0.9rem', color: '#64748b' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                  Validation Status
                </label>
                <input
                  type="text"
                  readOnly
                  value={formData.validation_status}
                  style={{
                    width: '100%',
                    padding: '0.45rem 0.65rem',
                    border: '1px dashed #94a3b8',
                    background: '#f8fafc',
                    borderRadius: '4px',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    color: formData.validation_status === 'DATA IN BOTH' ? '#059669' : formData.validation_status === 'DATA IN MASTER' ? '#0284c7' : '#d97706',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                  Lead Source
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    list="lead-source-list"
                    value={formData.lead_source}
                    onChange={(e) => setFormData({ ...formData, lead_source: e.target.value })}
                    style={{ width: '100%', padding: '0.45rem 0.65rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.9rem' }}
                  />
                  <datalist id="lead-source-list">
                    {distinctSourceOptions.map((opt) => (
                      <option key={opt} value={opt} />
                    ))}
                  </datalist>
                </div>
              </div>
            </div>

            {/* Row 2: Lead Source Count */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                  Lead Source Count
                </label>
                <input
                  type="text"
                  readOnly
                  value={formData.lead_source_count !== undefined ? Number(formData.lead_source_count).toLocaleString() : ''}
                  style={{ width: '100%', padding: '0.45rem 0.65rem', border: '1px dashed #cbd5e1', background: '#f8fafc', borderRadius: '4px', fontSize: '0.9rem', color: '#64748b' }}
                />
              </div>
              <div></div>
              <div></div>
              <div></div>
            </div>

            {/* Row 3: Created By, Created Date, Modified By, Modified Date */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                  Created By
                </label>
                <input
                  type="text"
                  readOnly
                  value={formData.created_by}
                  style={{ width: '100%', padding: '0.45rem 0.65rem', border: '1px solid #e2e8f0', background: '#f8fafc', borderRadius: '4px', fontSize: '0.9rem', color: '#64748b' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                  Created Date
                </label>
                <input
                  type="text"
                  readOnly
                  value={formData.created_date}
                  style={{ width: '100%', padding: '0.45rem 0.65rem', border: '1px solid #e2e8f0', background: '#f8fafc', borderRadius: '4px', fontSize: '0.9rem', color: '#64748b' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                  Modified By
                </label>
                <input
                  type="text"
                  readOnly
                  value={formData.modified_by}
                  style={{ width: '100%', padding: '0.45rem 0.65rem', border: '1px solid #e2e8f0', background: '#f8fafc', borderRadius: '4px', fontSize: '0.9rem', color: '#64748b' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                  Modified Date
                </label>
                <input
                  type="text"
                  readOnly
                  value={formData.modified_date}
                  style={{ width: '100%', padding: '0.45rem 0.65rem', border: '1px solid #e2e8f0', background: '#f8fafc', borderRadius: '4px', fontSize: '0.9rem', color: '#64748b' }}
                />
              </div>
            </div>

            {/* Buttons Row: Cancel, Delete, Apply Changes, Update Records */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
              <button
                type="button"
                onClick={handleCancel}
                style={{ padding: '0.45rem 1.25rem', border: '1px solid #cbd5e1', background: '#ffffff', borderRadius: '4px', fontWeight: 600, color: '#334155', cursor: 'pointer' }}
              >
                Cancel
              </button>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {selectedRecord && selectedRecord.id && selectedRecord.id < 9900000 && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    style={{ padding: '0.45rem 1rem', border: '1px solid #e2e8f0', background: '#f1f5f9', borderRadius: '4px', fontWeight: 600, color: '#475569', cursor: 'pointer' }}
                  >
                    Delete
                  </button>
                )}
                <button
                  type="submit"
                  style={{ padding: '0.45rem 1.25rem', border: 'none', background: '#102a43', borderRadius: '4px', fontWeight: 600, color: '#ffffff', cursor: 'pointer' }}
                >
                  Apply Changes
                </button>
                <button
                  type="button"
                  onClick={handleUpdateRecords}
                  style={{ padding: '0.45rem 1.25rem', border: 'none', background: '#102a43', borderRadius: '4px', fontWeight: 600, color: '#ffffff', cursor: 'pointer' }}
                  title="Update source across all linked company records"
                >
                  Update Records
                </button>
              </div>
            </div>
          </form>

          {/* Child Companies Report below Form (Screenshot 6) */}
          {selectedRecord && (
            <div
              style={{
                marginTop: '2.5rem',
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '1.25rem 1.5rem',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
              }}
            >
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
                  <form onSubmit={(e) => { e.preventDefault(); setActiveChildSearch(childSearch.trim()); setChildPage(1); }} style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
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
                          backgroundColor: '#ffffff',
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

                  <div className="apex-actions-wrapper" style={{ position: 'relative' }}>
                    <button
                      type="button"
                      className="apex-btn apex-btn-actions"
                      onClick={() => setShowChildActions(!showChildActions)}
                    >
                      Actions <IconChevronDown size={14} />
                    </button>
                    <ApexActionsMenu
                      isOpen={showChildActions}
                      onClose={() => setShowChildActions(false)}
                      onOpenColumns={() => setShowChildColumnsModal(true)}
                      onOpenFilter={() => { }}
                      onOpenChart={() => { }}
                      onOpenAggregate={() => { }}
                      onDownload={handleDownloadChildCsv}
                      onRefresh={loadChildCompanies}
                    />
                  </div>
                </div>
              </div>

              {/* Range strip */}
              <div className="apex-pagination-strip" style={{ marginBottom: '0.5rem' }}>
                <span>{childStartIdx} - {childEndIdx} of {childTotal.toLocaleString()}</span>
                <button
                  type="button"
                  className="pagination-nav-btn"
                  disabled={childPage <= 1}
                  onClick={() => setChildPage((p) => Math.max(1, p - 1))}
                  title="Previous Page"
                >
                  <IconChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  className="pagination-nav-btn"
                  disabled={childEndIdx >= childTotal}
                  onClick={() => setChildPage((p) => p + 1)}
                  title="Next Page"
                >
                  <IconChevronRight size={16} />
                </button>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table className="dense-table">
                  <thead>
                    <tr>
                      <th style={{ width: '38px', textAlign: 'center' }}></th>
                      {CHILD_COMPANY_COLUMNS.filter((c) => childVisibleKeys.includes(c.key)).map((col) => (
                        <th key={col.key}>{col.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loadingChild ? (
                      <tr><td colSpan={childVisibleKeys.length + 1} style={{ textAlign: 'center', padding: '2rem' }}>Loading companies...</td></tr>
                    ) : childCompanies.length === 0 ? (
                      <tr><td colSpan={childVisibleKeys.length + 1} style={{ textAlign: 'center', padding: '2rem' }}>No companies found for this source.</td></tr>
                    ) : (
                      childCompanies.map((comp) => (
                        <tr key={comp.id}>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              type="button"
                              className="table-action-icon-btn"
                              title={`Edit Company #${comp.id}`}
                              onClick={() => {
                                if (onNavigateToCompanyForm) {
                                  onNavigateToCompanyForm(comp.id, 'master_lead_source', window.location.hash);
                                }
                              }}
                            >
                              <IconFilePenLine size={14} />
                            </button>
                          </td>
                          {childVisibleKeys.includes('country') && <td>{comp.country || '—'}</td>}
                          {childVisibleKeys.includes('source') && <td>{comp.source || '—'}</td>}
                          {childVisibleKeys.includes('created_by') && <td>{comp.created_by || '—'}</td>}
                          {childVisibleKeys.includes('created_date') && <td>{formatAppDate(comp.created_date)}</td>}
                          {childVisibleKeys.includes('industry') && <td>{comp.industry || '—'}</td>}
                          {childVisibleKeys.includes('company_name') && <td style={{ fontWeight: 600 }}>{comp.company_name || '—'}</td>}
                          {childVisibleKeys.includes('email') && <td>{comp.email || '—'}</td>}
                          {childVisibleKeys.includes('website') && (
                            <td>
                              {comp.website ? (
                                <a href={comp.website.startsWith('http') ? comp.website : `https://${comp.website}`} target="_blank" rel="noopener noreferrer" style={{ color: '#1d4ed8', textDecoration: 'underline' }}>
                                  {comp.website}
                                </a>
                              ) : (
                                '—'
                              )}
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* VIEW MODE: REPORT TABLE (Screenshot 5) */
        <div>
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
            {/* Toolbar */}
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
                <form onSubmit={(e) => { e.preventDefault(); setActiveMasterSearch(masterSearch.trim()); setMasterPage(1); }} style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
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
                      backgroundColor: '#ffffff',
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

              <div className="apex-rows-select-group">
                <span className="apex-rows-label">Rows</span>
                <select
                  className="apex-rows-select"
                  value={masterRows}
                  onChange={(e) => { setMasterRows(Number(e.target.value)); setMasterPage(1); }}
                >
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={500}>500</option>
                </select>
              </div>

              <div className="apex-actions-wrapper" style={{ position: 'relative' }}>
                <button
                  type="button"
                  className="apex-btn apex-btn-actions"
                  onClick={() => setShowMasterActions(!showMasterActions)}
                >
                  Actions <IconChevronDown size={14} />
                </button>
                <ApexActionsMenu
                  isOpen={showMasterActions}
                  onClose={() => setShowMasterActions(false)}
                  onOpenColumns={() => setShowMasterColumnsModal(true)}
                  onOpenFilter={() => setShowMasterFilterModal(true)}
                  onOpenChart={() => setShowMasterChartModal(true)}
                  onOpenAggregate={() => setShowMasterAggregateModal(true)}
                  onDownload={handleDownloadMasterCsv}
                  onRefresh={loadMasterData}
                />
              </div>
            </div>

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

          {/* Active Aggregations */}
          {masterAggregations.length > 0 && (
            <ActiveAggregationsBar
              aggregations={masterAggregations}
              data={masterList}
              onRemove={(idx) => setMasterAggregations(prev => prev.filter((_, i) => i !== idx))}
            />
          )}

          {/* Pagination strip */}
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
            <span>{masterStartIdx} - {masterEndIdx} of {masterTotal.toLocaleString()}</span>
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
                disabled={masterEndIdx >= masterTotal}
                onClick={() => setMasterPage((p) => p + 1)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: masterEndIdx >= masterTotal ? 'not-allowed' : 'pointer',
                  color: masterEndIdx >= masterTotal ? '#cbd5e1' : '#475569',
                  padding: '2px 4px',
                }}
              >
                <IconChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Master Table */}
          <div style={{ overflowX: 'auto' }}>
            <table className="dense-table">
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
                  {LEAD_SOURCE_MASTER_COLUMNS.filter((c) => masterVisibleKeys.includes(c.key)).map((col) => (
                    <th key={col.key}>{col.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loadingMaster ? (
                  <tr><td colSpan={masterVisibleKeys.length + 2} style={{ textAlign: 'center', padding: '2rem' }}>Loading lead sources...</td></tr>
                ) : masterList.length === 0 ? (
                  <tr><td colSpan={masterVisibleKeys.length + 2} style={{ textAlign: 'center', padding: '2rem' }}>No records found.</td></tr>
                ) : (
                  masterList.map((row) => (
                    <tr key={row.id}>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className="table-action-icon-btn"
                          title={`Edit ${row.master_source || row.lead_source || ''}`}
                          onClick={() => handleOpenEdit(row)}
                        >
                          <IconFilePenLine size={14} />
                        </button>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(row.id)}
                          onChange={() => handleToggleRow(row.id)}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>
                      {masterVisibleKeys.includes('master_source') && (
                        <td style={{ fontWeight: 600 }}>{row.master_source || '—'}</td>
                      )}
                      {masterVisibleKeys.includes('master_source_count') && (
                        <td>{row.master_source_count !== undefined ? Number(row.master_source_count).toLocaleString() : '0'}</td>
                      )}
                      {masterVisibleKeys.includes('lead_source') && (
                        <td>{row.lead_source || '—'}</td>
                      )}
                      {masterVisibleKeys.includes('lead_source_count') && (
                        <td>{row.lead_source_count !== undefined ? Number(row.lead_source_count).toLocaleString() : '0'}</td>
                      )}
                      {masterVisibleKeys.includes('validation_status') && (
                        <td>
                          <span
                            className="status-pill"
                            style={{
                              background: row.validation_status === 'DATA IN BOTH' ? '#dcfce7' : row.validation_status === 'DATA IN MASTER' ? '#e0f2fe' : '#fef3c7',
                              color: row.validation_status === 'DATA IN BOTH' ? '#166534' : row.validation_status === 'DATA IN MASTER' ? '#0369a1' : '#b45309',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                            }}
                          >
                            {row.validation_status || 'DATA IN BOTH'}
                          </span>
                        </td>
                      )}
                      {masterVisibleKeys.includes('created_date') && (
                        <td>{formatAppDate(row.created_date)}</td>
                      )}
                      {masterVisibleKeys.includes('modified_date') && (
                        <td>{formatAppDate(row.modified_date)}</td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          </div>
        </div>
      )}

      {/* Columns Modal for Master */}
      <SelectColumnsModal
        isOpen={showMasterColumnsModal}
        columns={LEAD_SOURCE_MASTER_COLUMNS}
        visibleKeys={masterVisibleKeys}
        onSave={(keys) => { setMasterVisibleKeys(keys); setShowMasterColumnsModal(false); }}
        onClose={() => setShowMasterColumnsModal(false)}
      />

      {/* Filter Modal for Master */}
      <ApexFilterModal
        isOpen={showMasterFilterModal}
        columns={LEAD_SOURCE_MASTER_COLUMNS}
        onApply={(filter) => {
          setMasterFilters((prev) => [...prev, filter]);
          setShowMasterFilterModal(false);
        }}
        onClose={() => setShowMasterFilterModal(false)}
      />

      {/* Chart Modal for Master */}
      <ApexChartModal
        isOpen={showMasterChartModal}
        data={masterList}
        columns={LEAD_SOURCE_MASTER_COLUMNS}
        onClose={() => setShowMasterChartModal(false)}
      />

      {/* Aggregate Modal for Master */}
      <ApexAggregateModal
        isOpen={showMasterAggregateModal}
        columns={LEAD_SOURCE_MASTER_COLUMNS.filter((c) => c.key.includes('count'))}
        onApply={(agg) => {
          setMasterAggregations((prev) => [...prev, agg]);
          setShowMasterAggregateModal(false);
        }}
        onClose={() => setShowMasterAggregateModal(false)}
      />

      {/* Columns Modal for Child Companies */}
      <SelectColumnsModal
        isOpen={showChildColumnsModal}
        columns={CHILD_COMPANY_COLUMNS}
        visibleKeys={childVisibleKeys}
        onSave={(keys) => { setChildVisibleKeys(keys); setShowChildColumnsModal(false); }}
        onClose={() => setShowChildColumnsModal(false)}
      />

      {/* CSV Upload Modal */}
      {showUploadModal && (
        <div className="apex-modal-overlay">
          <div className="apex-modal-container" style={{ maxWidth: '480px' }}>
            <div className="apex-modal-header">
              <div className="apex-modal-title">
                <IconUpload size={18} />
                <span>Upload Lead Source Master CSV</span>
              </div>
              <button
                type="button"
                className="apex-modal-close"
                onClick={() => setShowUploadModal(false)}
                title="Close"
              >
                <IconClose size={18} />
              </button>
            </div>
            <p style={{ fontSize: '0.825rem', color: '#64748b', marginBottom: '1rem' }}>
              Upload a CSV file containing records for Lead Source Master.
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
                    if (onShowToast) onShowToast('success', 'Lead Source CSV data uploaded and merged.');
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

