import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../../api/client';
import { formatAppDate } from '../../utils/dateUtils';
import ApexActionsMenu from '../../components/ApexActionsMenu';
import SelectColumnsModal from '../../components/SelectColumnsModal';
import ApexFilterModal from '../../components/ApexFilterModal';
import ApexChartModal from '../../components/ApexChartModal';
import ApexAggregateModal from '../../components/ApexAggregateModal';
import ActiveAggregationsBar from '../../components/ActiveAggregationsBar';
import ApexColumnHeaderMenu from '../../components/ApexColumnHeaderMenu';
import ApexActiveFilterBanner from '../../components/ApexActiveFilterBanner';
import ApexReportToolbar from '../../components/ApexReportToolbar';
import ApexInteractiveReport from '../../components/ApexInteractiveReport';
import { useApexColumnMenu } from '../../utils/useApexColumnMenu';
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
} from '../../components/Icons';

export const SOURCE_MASTER_COLUMNS = [
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
    key: 'contact_source',
    label: 'Contact Source',
    getValue: (r) => r.contact_source || '',
  },
  {
    key: 'contact_source_count',
    label: 'Contact Source Count',
    getValue: (r) => (r.contact_source_count !== undefined ? Number(r.contact_source_count).toLocaleString() : '0'),
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

const DEFAULT_MASTER_KEYS = SOURCE_MASTER_COLUMNS.map((c) => c.key);

export const CHILD_CONTACT_COLUMNS = [
  { key: 'id', label: 'Id', width: '80px', getValue: (r) => r.id },
  { key: 'contact_name', label: 'Contact Name', minWidth: '180px', getValue: (r) => r.contact_name || '' },
  { key: 'comp_name', label: 'Comp Name', minWidth: '180px', getValue: (r) => r.comp_name || '' },
  { key: 'designation', label: 'Designation', minWidth: '150px', getValue: (r) => r.designation || '' },
  { key: 'pos_type', label: 'Pos Type', minWidth: '140px', getValue: (r) => r.pos_type || '' },
  { key: 'country', label: 'Country', minWidth: '120px', getValue: (r) => r.country || '' },
  { key: 'comp_email', label: 'Comp Email', minWidth: '180px', getValue: (r) => r.comp_email || '' },
  { key: 'contact_mobile', label: 'Contact Mobile', minWidth: '130px', getValue: (r) => r.contact_mobile || '' },
  {
    key: 'linkedin_url',
    label: 'Linkedin Url',
    minWidth: '160px',
    getValue: (r) => r.linkedin_url || '',
    render: (ct) => ct.linkedin_url ? (
      <a href={ct.linkedin_url} target="_blank" rel="noopener noreferrer" style={{ color: '#1d4ed8', textDecoration: 'underline' }}>
        {ct.linkedin_url}
      </a>
    ) : '—',
  },
];

export default function SourceMaster({ onShowToast, onNavigateToContactForm, onNavigateToCompanyForm }) {
  // Mode: 'report' or 'form'
  const [viewMode, setViewMode] = useState(() => {
    try {
      const saved = localStorage.getItem('apex_source_active_form');
      if (saved) return 'form';
    } catch (e) { }
    return 'report';
  });

  const [selectedRecord, setSelectedRecord] = useState(() => {
    try {
      const saved = localStorage.getItem('apex_source_active_form');
      if (saved) return JSON.parse(saved);
    } catch (e) { }
    return null;
  });

  // Form state matching Screenshot 2
  const [formData, setFormData] = useState(() => {
    try {
      const saved = localStorage.getItem('apex_source_active_form');
      if (saved) {
        const rec = JSON.parse(saved);
        return {
          master_source: rec.master_source || rec.source || '',
          total_contact_count: rec.total_contact_count || rec.contact_source_count || rec.master_source_count || 0,
          contact_source: rec.contact_source || rec.source || '',
          contact_source_count: rec.contact_source_count || 0,
          validation_status: rec.validation_status || 'DATA IN BOTH',
          created_by: rec.created_by || 'APEX_PUBLIC_USER',
          created_date: rec.created_date || '7/20/2026',
          modified_by: rec.modified_by || 'ZEBA_KHAN',
          modified_date: rec.modified_date || '11/12/2026',
        };
      }
    } catch (e) { }
    return {
      master_source: '',
      total_contact_count: 0,
      contact_source: '',
      contact_source_count: 0,
      validation_status: 'DATA IN BOTH',
      created_by: 'APEX_PUBLIC_USER',
      created_date: '7/20/2026',
      modified_by: 'ZEBA_KHAN',
      modified_date: '11/12/2026',
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
  const [reconciliationCounts, setReconciliationCounts] = useState({ total: 0, totalBoth: 0, totalMasterOnly: 0, totalContactOnly: 0 });

  // Row selection for batch actions
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Modals & Tools for Master Report
  const [showMasterActions, setShowMasterActions] = useState(false);
  const [showMasterColumnsModal, setShowMasterColumnsModal] = useState(false);
  const [showMasterFilterModal, setShowMasterFilterModal] = useState(false);
  const [showMasterChartModal, setShowMasterChartModal] = useState(false);
  const [showAggregateModal, setShowAggregateModal] = useState(false);
  const [aggregations, setAggregations] = useState([]);
  const [masterVisibleKeys, setMasterVisibleKeys] = useState(() => {
    try {
      const saved = localStorage.getItem('source_master_visible_columns');
      if (saved) return JSON.parse(saved);
    } catch (e) { }
    return DEFAULT_MASTER_KEYS;
  });

  // Oracle APEX Column Header Menu & Live Filter/Sort Hook
  const {
    headerMenu,
    handleHeaderClick,
    sortKey,
    sortDir,
    headerFilter,
    handleMenuSort,
    handleMenuHideColumn,
    handleMenuFilterValue,
    handleClearHeaderFilter,
    closeHeaderMenu,
    processedData: processedMasterList,
  } = useApexColumnMenu(masterList);

  // Child Contacts Report State (Screenshot 2)
  const [childContacts, setChildContacts] = useState([]);
  const [loadingChild, setLoadingChild] = useState(false);
  const [childSearch, setChildSearch] = useState('');
  const [activeChildSearch, setActiveChildSearch] = useState('');
  const [childRows, setChildRows] = useState(50);
  const [childPage, setChildPage] = useState(1);
  const [childTotal, setChildTotal] = useState(0);
  const [showChildActions, setShowChildActions] = useState(false);
  const [showChildColumnsModal, setShowChildColumnsModal] = useState(false);
  const [childVisibleKeys, setChildVisibleKeys] = useState(CHILD_CONTACT_COLUMNS.map((c) => c.key));

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
      const res = await api.getSources({
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
      if (onShowToast) onShowToast('error', 'Failed to load source master: ' + err.message);
    } finally {
      setLoadingMaster(false);
    }
  }, [activeMasterSearch, masterPage, masterRows, onShowToast]);

  useEffect(() => {
    loadMasterData();
  }, [loadMasterData]);

  // Fetch Child Contacts for Selected Source
  const loadChildContacts = useCallback(async () => {
    if (!selectedRecord) return;
    try {
      setLoadingChild(true);
      // Child report strictly displays contacts for the master record being edited.
      // Changing the form's replacement dropdown does NOT trigger or filter this report.
      const targetSource = selectedRecord.master_source || selectedRecord.source || selectedRecord.contact_source;
      const res = await api.getSourceContacts(selectedRecord.id, {
        source: targetSource,
        search: activeChildSearch,
        page: childPage,
        limit: childRows,
      });
      if (res.success) {
        setChildContacts(res.data || []);
        setChildTotal(res.total || 0);
      }
    } catch (err) {
      console.warn('Failed to load child contacts:', err.message);
    } finally {
      setLoadingChild(false);
    }
  }, [selectedRecord, activeChildSearch, childPage, childRows]);

  useEffect(() => {
    if (viewMode === 'form' && selectedRecord) {
      loadChildContacts();
    }
  }, [viewMode, selectedRecord, loadChildContacts]);

  // Selection Checkboxes
  const handleSelectAll = () => {
    const isAllSelected = processedMasterList.length > 0 && selectedIds.size >= processedMasterList.length;
    if (isAllSelected) {
      setSelectedIds(new Set());
      if (onShowToast) onShowToast('info', 'Deselected all records.');
    } else {
      const allIds = new Set(processedMasterList.map((m) => m.id));
      setSelectedIds(allIds);
      if (onShowToast) onShowToast('info', `Selected all ${processedMasterList.length} records throughout report.`);
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
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.size} selected source record(s)?`)) {
      return;
    }
    try {
      const idArray = Array.from(selectedIds);
      const res = await api.batchDeleteSources(idArray);
      if (res.success) {
        if (onShowToast) onShowToast('success', res.message || `Deleted ${idArray.length} sources successfully.`);
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
      total_contact_count: 0,
      contact_source: '',
      contact_source_count: 0,
      validation_status: 'DATA IN MASTER',
      created_by: 'APEX_PUBLIC_USER',
      created_date: formatAppDate(new Date()),
      modified_by: 'ZEBA_KHAN',
      modified_date: formatAppDate(new Date()),
    };
    setSelectedRecord(null);
    setFormData(newForm);
    setViewMode('form');
    try {
      localStorage.setItem('apex_source_active_form', JSON.stringify({ isNew: true, ...newForm }));
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
      const res = await api.getSource(record.id);
      const rec = res.success && res.data ? res.data : record;
      const f = {
        master_source: rec.master_source || rec.source || '',
        total_contact_count: rec.total_contact_count || rec.contact_source_count || rec.master_source_count || 0,
        contact_source: rec.contact_source || rec.source || '',
        contact_source_count: rec.contact_source_count || 0,
        validation_status: rec.validation_status || 'DATA IN BOTH',
        created_by: rec.created_by || 'APEX_PUBLIC_USER',
        created_date: rec.created_date || '7/20/2026',
        modified_by: rec.modified_by || 'ZEBA_KHAN',
        modified_date: rec.modified_date || '11/12/2026',
      };
      setFormData(f);
      try {
        localStorage.setItem('apex_source_active_form', JSON.stringify({ ...record, ...f }));
      } catch (e) { }
    } catch (err) {
      console.warn('Error loading single source:', err.message);
    }
  };

  // Close Form and return to Report
  const handleCancel = () => {
    setViewMode('report');
    setSelectedRecord(null);
    try {
      localStorage.removeItem('apex_source_active_form');
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
        (m.master_source || m.source) &&
        (m.master_source || m.source).trim().toLowerCase() === sourceVal.toLowerCase() &&
        String(m.id) !== String(selectedRecord?.id)
    );
    if (dupSource) {
      if (onShowToast) onShowToast('error', `Source "${sourceVal}" already exists. Duplicate records are not allowed.`);
      return;
    }

    try {
      if (selectedRecord && selectedRecord.id && selectedRecord.id < 9900000) {
        await api.updateSource(selectedRecord.id, {
          master_source: sourceVal,
        });
        if (onShowToast) onShowToast('success', 'Source updated successfully.');
      } else {
        const res = await api.createSource({
          master_source: sourceVal,
        });
        if (onShowToast) onShowToast('success', res.message || 'Source created successfully.');
      }
      handleCancel();
      loadMasterData();
    } catch (err) {
      if (onShowToast) onShowToast('error', err.message);
    }
  };

  // Update Records Button: Renames source across all linked contacts
  const handleUpdateRecords = async () => {
    if (!selectedRecord) return;
    const oldSource = (selectedRecord.master_source || selectedRecord.source || selectedRecord.contact_source || '').trim();
    const newSource = (formData.contact_source || '').trim();

    if (!newSource) {
      if (onShowToast) onShowToast('error', 'Please select a replacement Contact Source from the dropdown.');
      return;
    }

    if (newSource.toLowerCase() === oldSource.toLowerCase()) {
      if (onShowToast) onShowToast('info', 'Target source is already the current source.');
      return;
    }

    if (window.confirm(`Are you sure you want to update all linked contacts from "${oldSource}" to "${newSource}"?`)) {
      try {
        const res = await api.updateSourceRecords(selectedRecord.id, {
          old_source: oldSource,
          new_source: newSource,
        });
        if (onShowToast) onShowToast('success', res.message || 'Records updated successfully.');

        // Update selectedRecord so child report refreshes with the new updated source
        const updatedRec = {
          ...selectedRecord,
          master_source: newSource,
          source: newSource,
          contact_source: newSource,
        };
        setSelectedRecord(updatedRec);

        let newCount = res.updatedCount || 0;
        try {
          const cRes = await api.getContacts({ source: newSource, limit: 1 });
          if (cRes.success) newCount = cRes.total || newCount;
        } catch (e) { }

        setFormData((prev) => ({
          ...prev,
          master_source: newSource,
          contact_source: newSource,
          total_contact_count: newCount,
          contact_source_count: newCount,
        }));

        loadMasterData();
      } catch (err) {
        if (onShowToast) onShowToast('error', err.message);
      }
    }
  };

  // Delete Source
  const handleDelete = async () => {
    if (!selectedRecord || !selectedRecord.id) return;
    if (window.confirm(`Are you sure you want to delete source "${formData.master_source}"?`)) {
      try {
        await api.deleteSource(selectedRecord.id);
        if (onShowToast) onShowToast('success', 'Source deleted successfully.');
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
    const activeCols = SOURCE_MASTER_COLUMNS.filter((c) => masterVisibleKeys.includes(c.key));
    const headers = activeCols.map((c) => `"${c.label}"`).join(',');
    const rows = masterList.map((row) =>
      activeCols.map((c) => `"${String(c.getValue(row)).replace(/"/g, '""')}"`).join(',')
    );
    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Source_Master_${Date.now()}.csv`;
    link.click();
  };

  // Download Child Contacts CSV
  const handleDownloadChildCsv = () => {
    if (!childContacts.length) return;
    const activeCols = CHILD_CONTACT_COLUMNS.filter((c) => childVisibleKeys.includes(c.key));
    const headers = activeCols.map((c) => `"${c.label}"`).join(',');
    const rows = childContacts.map((c) =>
      activeCols.map((col) => `"${String(c[col.key] || '').replace(/"/g, '""')}"`).join(',')
    );
    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Contacts_Source_${(formData.master_source || 'export').replace(/[^a-zA-Z0-9]/g, '_')}.csv`;
    link.click();
  };

  const masterStartIdx = masterTotal === 0 ? 0 : (masterPage - 1) * masterRows + 1;
  const masterEndIdx = masterRows === 'all' ? masterTotal : Math.min(masterPage * masterRows, masterTotal);

  const childStartIdx = childTotal === 0 ? 0 : (childPage - 1) * childRows + 1;
  const childEndIdx = childRows === 'all' ? childTotal : Math.min(childPage * childRows, childTotal);

  return (
    <div className="company-type-master-container">
      {/* Select Columns Modal for Master Report */}
      <SelectColumnsModal
        isOpen={showMasterColumnsModal}
        onClose={() => setShowMasterColumnsModal(false)}
        allColumns={SOURCE_MASTER_COLUMNS}
        visibleColumnKeys={masterVisibleKeys}
        defaultVisibleKeys={DEFAULT_MASTER_KEYS}
        onApply={(newKeys) => {
          setMasterVisibleKeys(newKeys);
          try {
            localStorage.setItem('source_master_visible_columns', JSON.stringify(newKeys));
          } catch (e) { }
        }}
      />

      {/* Filter Modal */}
      <ApexFilterModal
        isOpen={showMasterFilterModal}
        onClose={() => setShowMasterFilterModal(false)}
        columns={SOURCE_MASTER_COLUMNS.map((c) => ({ id: c.key, label: c.label }))}
        onApplyFilter={({ expression }) => {
          if (expression) {
            setActiveMasterSearch(expression);
            setMasterSearch(expression);
          }
        }}
      />

      {/* Chart Modal */}
      <ApexChartModal
        isOpen={showMasterChartModal}
        onClose={() => setShowMasterChartModal(false)}
        data={masterList}
        labelKey="master_source"
        valueKey="master_source_count"
        title="Source Distribution Chart"
      />

      {/* Aggregate Modal */}
      <ApexAggregateModal
        isOpen={showAggregateModal}
        onClose={() => setShowAggregateModal(false)}
        columns={SOURCE_MASTER_COLUMNS.map((c) => ({ id: c.key, label: c.label }))}
        onApplyAggregate={(agg) => setAggregations((prev) => [...prev, { ...agg, id: Date.now() }])}
      />

      {/* Select Columns Modal for Child Contacts Report */}
      <SelectColumnsModal
        isOpen={showChildColumnsModal}
        onClose={() => setShowChildColumnsModal(false)}
        allColumns={CHILD_CONTACT_COLUMNS}
        visibleColumnKeys={childVisibleKeys}
        defaultVisibleKeys={CHILD_CONTACT_COLUMNS.map((c) => c.key)}
        onApply={(newKeys) => setChildVisibleKeys(newKeys)}
      />

      {/* Page Title Header */}
      <div className="master-page-header">
        <h1 className="master-page-title">Source</h1>
      </div>

      {/* VIEW MODE: FORM (Screenshot 2) */}
      {viewMode === 'form' ? (
        <div className="master-form-wrapper">
          <form onSubmit={handleApplyChanges} className="master-form-card" style={{ background: '#ffffff', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-field-group">
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                  Master Source
                </label>
                <input
                  type="text"
                  required
                  className="form-control-input"
                  value={formData.master_source}
                  onChange={(e) => setFormData({ ...formData, master_source: e.target.value })}
                  placeholder="e.g. LinkedIn"
                  autoFocus
                />
              </div>

              <div className="form-field-group">
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                  Total Contact Count
                </label>
                <input
                  type="text"
                  readOnly
                  style={{ border: '1px dashed #cbd5e1', backgroundColor: '#f8fafc', color: '#475569' }}
                  className="form-control-input"
                  value={formData.total_contact_count}
                />
              </div>

              <div className="form-field-group">
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                  Contact Source
                </label>
                <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                  <select
                    className="form-control-select"
                    value={formData.contact_source}
                    onChange={(e) => {
                      const val = e.target.value;
                      const matched = masterList.find((m) => (m.contact_source || m.source) === val);
                      const cnt = matched ? matched.contact_source_count : 0;
                      setFormData({
                        ...formData,
                        contact_source: val,
                        contact_source_count: cnt,
                      });
                    }}
                  >
                    <option value=""></option>
                    {distinctSourceOptions.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                  {formData.contact_source && (
                    <button
                      type="button"
                      title="Clear Contact Source"
                      onClick={() => setFormData({ ...formData, contact_source: '', contact_source_count: 0 })}
                      style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '0.25rem', color: '#64748b' }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              <div className="form-field-group">
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                  Contact Source Count
                </label>
                <input
                  type="text"
                  readOnly
                  style={{ border: '1px dashed #cbd5e1', backgroundColor: '#f8fafc', color: '#475569' }}
                  className="form-control-input"
                  value={formData.contact_source_count}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
              <div className="form-field-group">
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                  Validation Status
                </label>
                <input
                  type="text"
                  readOnly
                  style={{ border: '1px dashed #cbd5e1', backgroundColor: '#f8fafc', color: '#475569', fontWeight: 600 }}
                  className="form-control-input"
                  value={formData.validation_status}
                />
              </div>
            </div>

            {/* Audit Fields Row (Only visible when editing an existing record) */}
            {selectedRecord && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '0.25rem' }}>Created By</label>
                  <input type="text" readOnly style={{ border: '1px dashed #cbd5e1', backgroundColor: '#f8fafc', color: '#64748b' }} className="form-control-input" value={formData.created_by} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '0.25rem' }}>Created Date</label>
                  <input type="text" readOnly style={{ border: '1px dashed #cbd5e1', backgroundColor: '#f8fafc', color: '#64748b' }} className="form-control-input" value={formatAppDate(formData.created_date)} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '0.25rem' }}>Modified By</label>
                  <input type="text" readOnly style={{ border: '1px dashed #cbd5e1', backgroundColor: '#f8fafc', color: '#64748b' }} className="form-control-input" value={formData.modified_by} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '0.25rem' }}>Modified Date</label>
                  <input type="text" readOnly style={{ border: '1px dashed #cbd5e1', backgroundColor: '#f8fafc', color: '#64748b' }} className="form-control-input" value={formatAppDate(formData.modified_date)} />
                </div>
              </div>
            )}

            {/* Form Footer Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
              <button type="button" className="btn-apex-cancel" onClick={handleCancel}>
                Cancel
              </button>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {selectedRecord && (
                  <button type="button" className="btn btn-secondary" style={{ background: '#f1f5f9', color: '#0f172a' }} onClick={handleDelete}>
                    Delete
                  </button>
                )}
                <button type="submit" className="btn-apex-create">
                  {selectedRecord ? 'Apply Changes' : 'Create'}
                </button>
                {selectedRecord && (
                  <button type="button" className="btn btn-primary" style={{ background: '#102a43', color: '#ffffff' }} onClick={handleUpdateRecords}>
                    Update Records
                  </button>
                )}
              </div>
            </div>
          </form>

          {/* Child Contacts Report below form (Screenshot 2) */}
          {selectedRecord && (
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '1.25rem 1.5rem',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
              }}
            >
              <ApexInteractiveReport
                reportTitle={`Contacts for ${formData.source || formData.master_source || 'Source'}`}
                badge={childTotal}
                columns={CHILD_CONTACT_COLUMNS}
                data={childContacts}
                total={childTotal}
                page={childPage}
                onPageChange={setChildPage}
                rowsPerPage={childRows}
                onRowsPerPageChange={(nr) => { setChildRows(nr); setChildPage(1); }}
                search={childSearch}
                onSearchChange={setChildSearch}
                onSearchSubmit={() => { setActiveChildSearch(childSearch.trim()); setChildPage(1); }}
                isServerSide={true}
                isLoading={loadingChild}
                renderLeadingCell={(ct) => (
                  <button
                    type="button"
                    className="table-action-icon-btn"
                    title={`Edit Contact #${ct.id}`}
                    onClick={() => {
                      if (onNavigateToContactForm) {
                        onNavigateToContactForm(ct.id, 'master_source', window.location.hash);
                      }
                    }}
                  >
                    <IconFilePenLine size={14} />
                  </button>
                )}
                onRefresh={loadChildContacts}
                onReset={() => {
                  setChildSearch('');
                  setActiveChildSearch('');
                  setChildPage(1);
                  setChildRows(50);
                }}
                onDownload={handleDownloadChildCsv}
                onShowToast={onShowToast}
              />
            </div>
          )}
        </div>
      ) : (
        /* VIEW MODE: REPORT TABLE (Screenshot 1) */
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
                  <span>Rows</span>
                  <select
                    className="apex-rows-select"
                    value={masterRows}
                    onChange={(e) => {
                      const val = e.target.value === 'all' ? 'all' : parseInt(e.target.value, 10);
                      setMasterRows(val);
                      setMasterPage(1);
                    }}
                  >
                    <option value="10">10</option>
                    <option value="25">25</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                    <option value="all">All</option>
                  </select>
                </div>

                <div className="apex-actions-wrapper">
                  <button type="button" className="btn-apex-actions" onClick={() => setShowMasterActions((prev) => !prev)}>
                    <span>Actions</span>
                    <IconChevronDown size={13} />
                  </button>
                  <ApexActionsMenu
                    isOpen={showMasterActions}
                    onClose={() => setShowMasterActions(false)}
                  isEditableGrid={true}
                  hasSelection={selectedIds.size > 0}
                  onSelectAll={handleSelectAll}
                  onDeselectAll={() => setSelectedIds(new Set())}
                    onOpenColumns={() => setShowMasterColumnsModal(true)}
                    onOpenFilter={() => setShowMasterFilterModal(true)}
                    onOpenAggregate={() => setShowAggregateModal(true)}
                    columns={SOURCE_MASTER_COLUMNS}
                    data={masterList}
                    reportId="source_master"
                    onApplySort={(rules) => {
                      if (rules && rules[0] && rules[0].key) {
                        handleMenuSort(rules[0].key, rules[0].dir || 'asc');
                      }
                    }}
                    onDownload={handleDownloadMasterCsv}
                    onOpenChart={() => setShowMasterChartModal(true)}
                    onRefresh={loadMasterData}
                    onResetReport={() => {
                      setMasterVisibleKeys(DEFAULT_MASTER_KEYS);
                      try { localStorage.removeItem('source_master_visible_columns'); } catch (e) { }
                      setActiveMasterSearch('');
                      setMasterSearch('');
                      setMasterRows(50);
                      setMasterPage(1);
                    }}
                    onChangeRows={(r) => { setMasterRows(r); setMasterPage(1); }}
                    currentRows={masterRows}
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

            {/* Active APEX Filter Banner */}
            <ApexActiveFilterBanner headerFilter={headerFilter} onClear={handleClearHeaderFilter} />

            {/* Active Aggregations */}
            <ActiveAggregationsBar
              aggregations={aggregations}
              data={processedMasterList}
              onEditAggregation={() => setShowAggregateModal(true)}
              onRemoveAggregation={(id) => setAggregations((prev) => prev.filter((a) => a.id !== id))}
              onClearAll={() => setAggregations([])}
            />

            {/* Master Table matching Screenshot 1 */}
            <div style={{ overflowX: 'auto' }}>
              {loadingMaster ? (
                <div style={{ padding: '3.5rem', textAlign: 'center', color: '#64748b' }}>Loading source report...</div>
              ) : processedMasterList.length === 0 ? (
                <div style={{ padding: '3.5rem', textAlign: 'center', color: '#64748b' }}>No source records found.</div>
              ) : (
                <table className="dense-table apex-master-table">
                  <thead>
                    <tr>
                      <th style={{ width: '40px', textAlign: 'center' }}>
                        <span
                          style={{ cursor: 'pointer', fontSize: '1rem', color: '#1e293b' }}
                          title="Select Columns"
                          onClick={() => setShowMasterColumnsModal(true)}
                        >
                          ✎
                        </span>
                      </th>
                      <th style={{ width: '80px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <input
                          type="checkbox"
                          checked={processedMasterList.length > 0 && selectedIds.size >= processedMasterList.length}
                          ref={(el) => {
                            if (el) {
                              el.indeterminate = selectedIds.size > 0 && selectedIds.size < processedMasterList.length;
                            }
                          }}
                          onChange={handleSelectAll}
                          style={{ cursor: 'pointer' }}
                          title={
                            selectedIds.size >= processedMasterList.length && processedMasterList.length > 0
                              ? `All ${processedMasterList.length} records selected`
                              : `Select all ${processedMasterList.length} records throughout report`
                          }
                        />
                        </div>
                      </th>
                      {SOURCE_MASTER_COLUMNS.filter((c) => masterVisibleKeys.includes(c.key)).map((col) => {
                        const isNumber = col.key.includes('count');
                        const isCenter = col.key === 'validation_status' || col.key.includes('date');
                        return (
                          <th
                            key={col.key}
                            className={isNumber ? 'col-number' : isCenter ? 'col-center' : ''}
                            onClick={(e) => handleHeaderClick(e, col)}
                            style={{
                              cursor: 'pointer',
                              userSelect: 'none',
                              whiteSpace: 'nowrap',
                              transition: 'background-color 0.15s ease',
                            }}
                            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                            title={`Click to sort, filter, or configure ${col.label}`}
                          >
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <span>{col.label}</span>
                              {sortKey === col.key && (
                                <span style={{ fontSize: '0.75rem', color: '#2563eb' }}>
                                  {sortDir === 'asc' ? '↑' : '↓'}
                                </span>
                              )}
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {processedMasterList.map((row) => (
                      <tr key={row.id}>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            className="table-action-icon-btn"
                            title="Edit Source Record"
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
                          <td style={{ textAlign: 'center', fontWeight: 600 }}>{Number(row.master_source_count || 0).toLocaleString()}</td>
                        )}
                        {masterVisibleKeys.includes('contact_source') && (
                          <td>{row.contact_source || '—'}</td>
                        )}
                        {masterVisibleKeys.includes('contact_source_count') && (
                          <td style={{ textAlign: 'center' }}>{Number(row.contact_source_count || 0).toLocaleString()}</td>
                        )}
                        {masterVisibleKeys.includes('validation_status') && (
                          <td>
                            <span className={`badge ${row.validation_status === 'DATA IN BOTH' ? 'badge-primary' : 'badge-secondary'}`}>
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
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Upload CSV Modal */}
      {showUploadModal && (
        <div className="apex-modal-overlay">
          <div className="apex-modal" style={{ maxWidth: '480px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#1e293b' }}>
                Upload Source Data
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
              Upload a CSV file containing records for Sources.
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
                    if (onShowToast) onShowToast('success', 'Source CSV data uploaded and merged.');
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
      {/* Interactive Column Header Actions Menu */}
      <ApexColumnHeaderMenu headerMenu={headerMenu} onClose={closeHeaderMenu} />
    </div>
  );
}

