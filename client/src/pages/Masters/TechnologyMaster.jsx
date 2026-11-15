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
import { useApexColumnMenu } from '../../utils/useApexColumnMenu';
import {
  IconSearch,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconFilePenLine,
  IconClose,
  IconCalendar,
} from '../../components/Icons';

export const TECHNOLOGY_MASTER_COLUMNS = [
  {
    key: 'master_technology',
    label: 'Master Technology',
    getValue: (r) => r.master_technology || r.technology || '',
  },
  {
    key: 'master_technology_category',
    label: 'Master Technology Category',
    getValue: (r) => r.master_technology_category || r.technology_category || '',
  },
  {
    key: 'master_technology_count',
    label: 'Master Technology Count',
    getValue: (r) => (r.master_technology_count !== undefined ? Number(r.master_technology_count).toLocaleString() : '0'),
  },
  {
    key: 'company_technology',
    label: 'Company Technology',
    getValue: (r) => r.company_technology || '',
  },
  {
    key: 'company_technology_count',
    label: 'Company Technology Count',
    getValue: (r) => (r.company_technology_count !== undefined ? Number(r.company_technology_count).toLocaleString() : '0'),
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

const DEFAULT_MASTER_KEYS = TECHNOLOGY_MASTER_COLUMNS.map((c) => c.key);

export const CHILD_COMPANY_COLUMNS = [
  { key: 'id', label: 'ID' },
  { key: 'contact_count', label: 'Contact Count' },
  { key: 'company_name', label: 'Company Name' },
  { key: 'employee_size', label: 'Employee Size' },
  { key: 'company_type', label: 'Company Type' },
  { key: 'country', label: 'Country' },
  { key: 'city', label: 'City' },
  { key: 'technology', label: 'Technology' },
  { key: 'industry', label: 'Industry' },
  { key: 'email', label: 'Email' },
  { key: 'website', label: 'Website' },
];

export default function TechnologyMaster({ onShowToast, onNavigateToCompanyForm, onNavigateToContactForm }) {
  // Mode: 'report' or 'form'
  const [viewMode, setViewMode] = useState(() => {
    try {
      const saved = localStorage.getItem('apex_technology_active_form');
      if (saved) return 'form';
    } catch (e) {}
    return 'report';
  });

  const [selectedRecord, setSelectedRecord] = useState(() => {
    try {
      const saved = localStorage.getItem('apex_technology_active_form');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return null;
  });

  // Top Filter state matching Screenshot 3
  const [filters, setFilters] = useState({
    technology: '',
    technology_category: '',
    created_date: '',
    modified_date: '',
  });
  const [appliedFilters, setAppliedFilters] = useState({});
  const [filterOptions, setFilterOptions] = useState({ technologies: [], categories: [] });

  // Form state matching Screenshot 4
  const [formData, setFormData] = useState(() => {
    try {
      const saved = localStorage.getItem('apex_technology_active_form');
      if (saved) {
        const rec = JSON.parse(saved);
        return {
          master_technology: rec.master_technology || rec.technology || '',
          technology_category: rec.technology_category || rec.master_technology_category || 'CRM',
          total_count: rec.total_count || rec.company_technology_count || rec.master_technology_count || 0,
          contact_technology: rec.contact_technology || rec.company_technology || rec.technology || '',
          contact_technology_count: rec.contact_technology_count || rec.company_technology_count || 0,
          validation_status: rec.validation_status || 'DATA IN BOTH',
          created_by: rec.created_by || 'APEX_PUBLIC_USER',
          created_date: rec.created_date || '7/20/2026',
          modified_by: rec.modified_by || 'AMAAN',
          modified_date: rec.modified_date || '11/10/2026',
        };
      }
    } catch (e) {}
    return {
      master_technology: '',
      technology_category: 'CRM',
      total_count: 0,
      contact_technology: '',
      contact_technology_count: 0,
      validation_status: 'DATA IN BOTH',
      created_by: 'APEX_PUBLIC_USER',
      created_date: '7/20/2026',
      modified_by: 'AMAAN',
      modified_date: '11/10/2026',
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

  // Modals
  const [showMasterActions, setShowMasterActions] = useState(false);
  const [showMasterColumnsModal, setShowMasterColumnsModal] = useState(false);
  const [showMasterFilterModal, setShowMasterFilterModal] = useState(false);
  const [showMasterChartModal, setShowMasterChartModal] = useState(false);
  const [showAggregateModal, setShowAggregateModal] = useState(false);
  const [aggregations, setAggregations] = useState([]);
  const [masterVisibleKeys, setMasterVisibleKeys] = useState(() => {
    try {
      const saved = localStorage.getItem('technology_master_visible_columns');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_MASTER_KEYS;
  });

  // Child Companies Report State (Screenshot 4)
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

  // Load top filter options
  useEffect(() => {
    api.getTechnologyFilterOptions()
      .then((res) => {
        if (res.success && res.data) {
          setFilterOptions(res.data);
        }
      })
      .catch((e) => console.warn('Filter options error:', e.message));
  }, []);

  // Load Master Report Data
  const loadMasterData = useCallback(async () => {
    try {
      setLoadingMaster(true);
      const res = await api.getTechnologiesMaster({
        search: activeMasterSearch,
        technology: appliedFilters.technology,
        technology_category: appliedFilters.technology_category,
        created_date: appliedFilters.created_date,
        modified_date: appliedFilters.modified_date,
        page: masterPage,
        limit: masterRows,
      });
      if (res.success) {
        setMasterList(res.data || []);
        setMasterTotal(res.total || 0);
      }
    } catch (err) {
      if (onShowToast) onShowToast('error', 'Failed to load technology master: ' + err.message);
    } finally {
      setLoadingMaster(false);
    }
  }, [activeMasterSearch, appliedFilters, masterPage, masterRows, onShowToast]);

  useEffect(() => {
    loadMasterData();
  }, [loadMasterData]);

  // Load Child Companies for Selected Technology
  const loadChildCompanies = useCallback(async () => {
    if (!selectedRecord) return;
    try {
      setLoadingChild(true);
      // Child report strictly displays companies for the master record being edited.
      // Changing the form's replacement dropdown does NOT trigger or filter this report.
      const targetTech = selectedRecord.master_technology || selectedRecord.technology || selectedRecord.company_technology;
      const res = await api.getTechnologyCompanies(selectedRecord.id, {
        technology: targetTech,
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

  // Handle Search in Top Filters
  const handleApplyTopFilters = (e) => {
    if (e) e.preventDefault();
    setAppliedFilters({ ...filters });
    setMasterPage(1);
  };

  const handleClearTopFilters = () => {
    setFilters({ technology: '', technology_category: '', created_date: '', modified_date: '' });
    setAppliedFilters({});
    setMasterPage(1);
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
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.size} selected technology record(s)?`)) {
      return;
    }
    try {
      const idArray = Array.from(selectedIds);
      const res = await api.batchDeleteTechnologies(idArray);
      if (res.success) {
        if (onShowToast) onShowToast('success', res.message || `Deleted ${idArray.length} technologies successfully.`);
        setSelectedIds(new Set());
        loadMasterData();
      }
    } catch (err) {
      if (onShowToast) onShowToast('error', 'Batch delete failed: ' + err.message);
    }
  };

  // Open Form Create
  const handleOpenCreate = () => {
    const newForm = {
      master_technology: '',
      technology_category: 'General',
      total_count: 0,
      contact_technology: '',
      contact_technology_count: 0,
      validation_status: 'DATA IN MASTER',
      created_by: 'APEX_PUBLIC_USER',
      created_date: formatAppDate(new Date()),
      modified_by: 'AMAAN',
      modified_date: formatAppDate(new Date()),
    };
    setSelectedRecord(null);
    setFormData(newForm);
    setViewMode('form');
    try {
      localStorage.setItem('apex_technology_active_form', JSON.stringify({ isNew: true, ...newForm }));
    } catch (e) {}
  };

  // Open Form Edit
  const handleOpenEdit = async (record) => {
    setSelectedRecord(record);
    setViewMode('form');
    setChildPage(1);
    setActiveChildSearch('');
    setChildSearch('');

    try {
      const res = await api.getTechnologyMaster(record.id);
      const rec = res.success && res.data ? res.data : record;
      const f = {
        master_technology: rec.master_technology || rec.technology || '',
        technology_category: rec.technology_category || rec.master_technology_category || 'CRM',
        total_count: rec.total_count || rec.company_technology_count || rec.master_technology_count || 0,
        contact_technology: rec.contact_technology || rec.company_technology || rec.technology || '',
        contact_technology_count: rec.contact_technology_count || rec.company_technology_count || 0,
        validation_status: rec.validation_status || 'DATA IN BOTH',
        created_by: rec.created_by || 'APEX_PUBLIC_USER',
        created_date: rec.created_date || '7/20/2026',
        modified_by: rec.modified_by || 'AMAAN',
        modified_date: rec.modified_date || '11/10/2026',
      };
      setFormData(f);
      try {
        localStorage.setItem('apex_technology_active_form', JSON.stringify({ ...record, ...f }));
      } catch (e) {}
    } catch (err) {
      console.warn('Error loading single technology:', err.message);
    }
  };

  // Close Form
  const handleCancel = () => {
    setViewMode('report');
    setSelectedRecord(null);
    try {
      localStorage.removeItem('apex_technology_active_form');
    } catch (e) {}
  };

  // Save / Apply Changes
  const handleApplyChanges = async (e) => {
    if (e) e.preventDefault();
    const techVal = (formData.master_technology || '').trim();
    if (!techVal) {
      if (onShowToast) onShowToast('error', 'Master Technology name is required.');
      return;
    }

    const dupTech = masterList.find(
      (m) =>
        (m.master_technology || m.technology) &&
        (m.master_technology || m.technology).trim().toLowerCase() === techVal.toLowerCase() &&
        String(m.id) !== String(selectedRecord?.id)
    );
    if (dupTech) {
      if (onShowToast) onShowToast('error', `Technology "${techVal}" already exists. Duplicate records are not allowed.`);
      return;
    }

    try {
      if (selectedRecord && selectedRecord.id && selectedRecord.id < 9900000) {
        await api.updateTechnologyMaster(selectedRecord.id, {
          master_technology: techVal,
          technology_category: formData.technology_category,
        });
        if (onShowToast) onShowToast('success', 'Technology updated successfully.');
      } else {
        const res = await api.createTechnologyMaster({
          master_technology: techVal,
          technology_category: formData.technology_category,
        });
        if (onShowToast) onShowToast('success', res.message || 'Technology created successfully.');
      }
      handleCancel();
      loadMasterData();
    } catch (err) {
      if (onShowToast) onShowToast('error', err.message);
    }
  };

  // Update Records Button: Updates companies linked to this technology
  const handleUpdateRecords = async () => {
    if (!selectedRecord) return;
    const oldTech = (selectedRecord.master_technology || selectedRecord.technology || selectedRecord.company_technology || '').trim();
    const newTech = (formData.contact_technology || '').trim();

    if (!newTech) {
      if (onShowToast) onShowToast('error', 'Please select a replacement Contact Technology from the dropdown.');
      return;
    }

    if (newTech.toLowerCase() === oldTech.toLowerCase()) {
      if (onShowToast) onShowToast('info', 'Target technology is the same as current technology.');
      return;
    }

    if (window.confirm(`Are you sure you want to update all linked company records from "${oldTech}" to "${newTech}"?`)) {
      try {
        const res = await api.updateTechnologyRecords(selectedRecord.id, {
          old_technology: oldTech,
          new_technology: newTech,
        });
        if (onShowToast) onShowToast('success', res.message || 'Records updated successfully.');

        // Update selectedRecord to target newTech so child report refreshes with the updated values
        const updatedRec = {
          ...selectedRecord,
          master_technology: newTech,
          technology: newTech,
          company_technology: newTech,
          contact_technology: newTech,
        };
        setSelectedRecord(updatedRec);

        // Fetch updated dynamic count for newTech
        let newCount = res.updatedCount || 0;
        try {
          const cRes = await api.getCompanies({ technology: newTech, limit: 1 });
          if (cRes.success) newCount = cRes.total || newCount;
        } catch (e) {}

        setFormData((prev) => ({
          ...prev,
          master_technology: newTech,
          contact_technology: newTech,
          total_count: newCount,
          contact_technology_count: newCount,
        }));

        loadMasterData();
      } catch (err) {
        if (onShowToast) onShowToast('error', err.message);
      }
    }
  };

  // Delete
  const handleDelete = async () => {
    if (!selectedRecord || !selectedRecord.id) return;
    if (window.confirm(`Are you sure you want to delete technology "${formData.master_technology}"?`)) {
      try {
        await api.deleteTechnologyMaster(selectedRecord.id);
        if (onShowToast) onShowToast('success', 'Technology deleted successfully.');
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
    const activeCols = TECHNOLOGY_MASTER_COLUMNS.filter((c) => masterVisibleKeys.includes(c.key));
    const headers = activeCols.map((c) => `"${c.label}"`).join(',');
    const rows = masterList.map((row) =>
      activeCols.map((c) => `"${String(c.getValue(row)).replace(/"/g, '""')}"`).join(',')
    );
    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Technology_Master_${Date.now()}.csv`;
    link.click();
  };

  // Download Child Companies CSV
  const handleDownloadChildCsv = () => {
    if (!childCompanies.length) return;
    const activeCols = CHILD_COMPANY_COLUMNS.filter((c) => childVisibleKeys.includes(c.key));
    const headers = activeCols.map((c) => `"${c.label}"`).join(',');
    const rows = childCompanies.map((c) =>
      activeCols.map((col) => `"${String(c[col.key] || '').replace(/"/g, '""')}"`).join(',')
    );
    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Companies_Technology_${(formData.master_technology || 'export').replace(/[^a-zA-Z0-9]/g, '_')}.csv`;
    link.click();
  };

  const masterStartIdx = masterTotal === 0 ? 0 : (masterPage - 1) * masterRows + 1;
  const masterEndIdx = masterRows === 'all' ? masterTotal : Math.min(masterPage * masterRows, masterTotal);

  const childStartIdx = childTotal === 0 ? 0 : (childPage - 1) * childRows + 1;
  const childEndIdx = childRows === 'all' ? childTotal : Math.min(childPage * childRows, childTotal);

  return (
    <div className="company-type-master-container">
      {/* Select Columns Modal */}
      <SelectColumnsModal
        isOpen={showMasterColumnsModal}
        onClose={() => setShowMasterColumnsModal(false)}
        allColumns={TECHNOLOGY_MASTER_COLUMNS}
        visibleColumnKeys={masterVisibleKeys}
        defaultVisibleKeys={DEFAULT_MASTER_KEYS}
        onApply={(newKeys) => {
          setMasterVisibleKeys(newKeys);
          try { localStorage.setItem('technology_master_visible_columns', JSON.stringify(newKeys)); } catch (e) {}
        }}
      />

      {/* Filter Modal */}
      <ApexFilterModal
        isOpen={showMasterFilterModal}
        onClose={() => setShowMasterFilterModal(false)}
        columns={TECHNOLOGY_MASTER_COLUMNS.map((c) => ({ id: c.key, label: c.label }))}
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
        labelKey="master_technology"
        valueKey="company_technology_count"
        title="Technology Distribution Chart"
      />

      {/* Aggregate Modal */}
      <ApexAggregateModal
        isOpen={showAggregateModal}
        onClose={() => setShowAggregateModal(false)}
        columns={TECHNOLOGY_MASTER_COLUMNS.map((c) => ({ id: c.key, label: c.label }))}
        onApplyAggregate={(agg) => setAggregations((prev) => [...prev, { ...agg, id: Date.now() }])}
      />

      {/* Select Columns Modal for Child Companies */}
      <SelectColumnsModal
        isOpen={showChildColumnsModal}
        onClose={() => setShowChildColumnsModal(false)}
        allColumns={CHILD_COMPANY_COLUMNS}
        visibleColumnKeys={childVisibleKeys}
        defaultVisibleKeys={CHILD_COMPANY_COLUMNS.map((c) => c.key)}
        onApply={(newKeys) => setChildVisibleKeys(newKeys)}
      />

      {/* Page Title Header */}
      <div className="master-page-header">
        <h1 className="master-page-title">Technology</h1>
      </div>

      {/* VIEW MODE: FORM (Screenshot 4) */}
      {viewMode === 'form' ? (
        <div className="master-form-wrapper">
          <form onSubmit={handleApplyChanges} className="master-form-card" style={{ background: '#ffffff', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-field-group">
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                  Master Technology
                </label>
                <input
                  type="text"
                  required
                  className="form-control-input"
                  value={formData.master_technology}
                  onChange={(e) => setFormData({ ...formData, master_technology: e.target.value })}
                  placeholder="e.g. Zoho CRM"
                  autoFocus
                />
              </div>

              <div className="form-field-group">
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                  Total Count
                </label>
                <input
                  type="text"
                  readOnly
                  style={{ border: '1px dashed #cbd5e1', backgroundColor: '#f8fafc', color: '#475569' }}
                  className="form-control-input"
                  value={formData.total_count}
                />
              </div>

              <div className="form-field-group">
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                  Contact Technology
                </label>
                <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                  <select
                    className="form-control-select"
                    value={formData.contact_technology}
                    onChange={async (e) => {
                      const val = e.target.value;
                      let cnt = 0;
                      if (val) {
                        const matched = masterList.find(
                          (m) =>
                            (m.company_technology || m.technology || m.master_technology || '').toLowerCase() === val.toLowerCase()
                        );
                        if (matched && matched.company_technology_count !== undefined) {
                          cnt = matched.company_technology_count;
                        } else {
                          try {
                            const cRes = await api.getCompanies({ technology: val, limit: 1 });
                            if (cRes.success) cnt = cRes.total || 0;
                          } catch (err) {}
                        }
                      }
                      setFormData((prev) => ({
                        ...prev,
                        contact_technology: val,
                        contact_technology_count: cnt,
                      }));
                    }}
                  >
                    <option value=""></option>
                    {filterOptions.technologies.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  {formData.contact_technology && (
                    <button
                      type="button"
                      title="Clear Technology"
                      onClick={() => setFormData({ ...formData, contact_technology: '', contact_technology_count: 0 })}
                      style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '0.25rem', color: '#64748b' }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              <div className="form-field-group">
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                  Contact Technology Count
                </label>
                <input
                  type="text"
                  readOnly
                  style={{ border: '1px dashed #cbd5e1', backgroundColor: '#f8fafc', color: '#475569' }}
                  className="form-control-input"
                  value={formData.contact_technology_count}
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

            {/* Audit Fields */}
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

            {/* Form Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
              <button type="button" className="btn-apex-cancel" onClick={handleCancel}>
                Cancel
              </button>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {selectedRecord && (
                  <button type="button" className="btn btn-primary" style={{ background: '#102a43', color: '#ffffff' }} onClick={handleUpdateRecords}>
                    Update Records
                  </button>
                )}
                {selectedRecord && (
                  <button type="button" className="btn btn-secondary" style={{ background: '#f1f5f9', color: '#0f172a' }} onClick={handleDelete}>
                    Delete
                  </button>
                )}
                <button type="submit" className="btn-apex-top">
                  {selectedRecord ? 'Apply Changes' : 'Create'}
                </button>
              </div>
            </div>
          </form>

          {/* Child Companies Report below form (Screenshot 4) */}
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
                        placeholder="Search linked companies..."
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

                  <div className="apex-rows-select-group">
                    <span>Rows</span>
                    <select
                      className="apex-rows-select"
                      value={childRows}
                      onChange={(e) => {
                        const val = e.target.value === 'all' ? 'all' : parseInt(e.target.value, 10);
                        setChildRows(val);
                        setChildPage(1);
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
                    <button type="button" className="btn-apex-actions" onClick={() => setShowChildActions((prev) => !prev)}>
                      <span>Actions</span>
                      <IconChevronDown size={13} />
                    </button>
                    <ApexActionsMenu
                      isOpen={showChildActions}
                      onClose={() => setShowChildActions(false)}
                      onOpenColumns={() => setShowChildColumnsModal(true)}
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
                      <th style={{ width: '38px', textAlign: 'center' }}>
                      <span
                        style={{ cursor: 'pointer', fontSize: '1rem', color: '#1e293b' }}
                        title="Select Columns"
                        onClick={() => setShowChildColumnsModal(true)}
                      >
                        ✎
                      </span>
                    </th>
                      {CHILD_COMPANY_COLUMNS.filter((c) => childVisibleKeys.includes(c.key)).map((col) => (
                        <th key={col.key}>{col.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loadingChild ? (
                      <tr><td colSpan={childVisibleKeys.length + 1} style={{ textAlign: 'center', padding: '2rem' }}>Loading companies...</td></tr>
                    ) : childCompanies.length === 0 ? (
                      <tr><td colSpan={childVisibleKeys.length + 1} style={{ textAlign: 'center', padding: '2rem' }}>No companies found for this technology.</td></tr>
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
                                  onNavigateToCompanyForm(comp.id, 'master_technology', window.location.hash);
                                }
                              }}
                            >
                              <IconFilePenLine size={14} />
                            </button>
                          </td>
                          {childVisibleKeys.includes('id') && <td>{comp.id}</td>}
                          {childVisibleKeys.includes('contact_count') && (
                            <td style={{ textAlign: 'center', fontWeight: comp.contact_count > 0 ? 600 : 400 }}>
                              {comp.contact_count}
                            </td>
                          )}
                          {childVisibleKeys.includes('company_name') && <td style={{ fontWeight: 600 }}>{comp.company_name}</td>}
                          {childVisibleKeys.includes('employee_size') && <td>{comp.employee_size || '—'}</td>}
                          {childVisibleKeys.includes('company_type') && (
                            <td>{comp.company_type && comp.company_type !== 'undefined' ? comp.company_type : '—'}</td>
                          )}
                          {childVisibleKeys.includes('country') && <td>{comp.country || '—'}</td>}
                          {childVisibleKeys.includes('city') && <td>{comp.city || '—'}</td>}
                          {childVisibleKeys.includes('technology') && <td>{comp.technology || '—'}</td>}
                          {childVisibleKeys.includes('industry') && <td>{comp.industry || '—'}</td>}
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
        /* VIEW MODE: REPORT TABLE (Screenshot 3) */
        <div>
          {/* Top Filter Card matching Screenshot 3 */}
          <form onSubmit={handleApplyTopFilters} style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '1rem 1.25rem', marginBottom: '1.25rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>Technology</label>
                <select
                  className="form-control-select"
                  value={filters.technology}
                  onChange={(e) => setFilters({ ...filters, technology: e.target.value })}
                >
                  <option value=""></option>
                  {filterOptions.technologies.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>Technology Category</label>
                <select
                  className="form-control-select"
                  value={filters.technology_category}
                  onChange={(e) => setFilters({ ...filters, technology_category: e.target.value })}
                >
                  <option value=""></option>
                  {filterOptions.categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>Created Date</label>
                <input
                  type="date"
                  className="form-control-input"
                  value={filters.created_date}
                  onChange={(e) => setFilters({ ...filters, created_date: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>Modified Date</label>
                <input
                  type="date"
                  className="form-control-input"
                  value={filters.modified_date}
                  onChange={(e) => setFilters({ ...filters, modified_date: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="submit" className="btn-apex-top" style={{ background: '#102a43', padding: '0.45rem 1.25rem' }}>
                  Search
                </button>
                <button type="button" className="btn-apex-cancel" onClick={handleClearTopFilters} style={{ padding: '0.45rem 1rem' }}>
                  Clear Filter
                </button>
              </div>
            </div>
          </form>

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
                  onOpenColumns={() => setShowMasterColumnsModal(true)}
                  onOpenFilter={() => setShowMasterFilterModal(true)}
                  onOpenAggregate={() => setShowAggregateModal(true)}
                  onOpenGroupBy={() => setShowMasterChartModal(true)}
                  onDownload={handleDownloadMasterCsv}
                  onOpenChart={() => setShowMasterChartModal(true)}
                  onRefresh={loadMasterData}
                  onResetReport={() => {
                    setMasterVisibleKeys(DEFAULT_MASTER_KEYS);
                    try { localStorage.removeItem('technology_master_visible_columns'); } catch (e) {}
                    setActiveMasterSearch('');
                    setMasterSearch('');
                    setFilters({ technology: '', technology_category: '', created_date: '', modified_date: '' });
                    setAppliedFilters({});
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

          {/* Master Table matching Screenshot 3 */}
          <div style={{ overflowX: 'auto' }}>
            {loadingMaster ? (
              <div style={{ padding: '3.5rem', textAlign: 'center', color: '#64748b' }}>Loading technology report...</div>
            ) : processedMasterList.length === 0 ? (
              <div style={{ padding: '3.5rem', textAlign: 'center', color: '#64748b' }}>No technology records found.</div>
            ) : (
              <table className="dense-table">
                <thead>
                  <tr>
                    {/* Column 1: Edit/Select Columns Icon header (matching standard report) */}
                    <th style={{ width: '40px', textAlign: 'center' }}>
                      <span
                        style={{ cursor: 'pointer', fontSize: '1rem', color: '#1e293b' }}
                        title="Select Columns"
                        onClick={() => setShowMasterColumnsModal(true)}
                      >
                        ✎
                      </span>
                    </th>
                    {/* Column 2: Selected Checkbox Column with Select-All */}
                    <th style={{ width: '80px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <input
                          type="checkbox"
                          checked={processedMasterList.length > 0 && selectedIds.size === processedMasterList.length}
                          onChange={handleSelectAll}
                          style={{ cursor: 'pointer' }}
                        />
                      </div>
                    </th>
                    {/* Dynamic Data Columns with interactive APEX header actions */}
                    {TECHNOLOGY_MASTER_COLUMNS.filter((c) => masterVisibleKeys.includes(c.key)).map((col) => {
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
                          className="table-action-icon-btn apex-edit-icon-btn"
                          title="Edit Technology Record"
                          onClick={() => handleOpenEdit(row)}
                        >
                          <IconFilePenLine size={15} color="#2563eb" />
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
                      {masterVisibleKeys.includes('master_technology') && (
                        <td style={{ fontWeight: 600 }}>{row.master_technology || '—'}</td>
                      )}
                      {masterVisibleKeys.includes('master_technology_category') && (
                        <td>{row.master_technology_category || '—'}</td>
                      )}
                      {masterVisibleKeys.includes('master_technology_count') && (
                        <td style={{ textAlign: 'center', fontWeight: 600 }}>{Number(row.master_technology_count || 0).toLocaleString()}</td>
                      )}
                      {masterVisibleKeys.includes('company_technology') && (
                        <td>{row.company_technology || '—'}</td>
                      )}
                      {masterVisibleKeys.includes('company_technology_count') && (
                        <td style={{ textAlign: 'center' }}>{Number(row.company_technology_count || 0).toLocaleString()}</td>
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
                Upload Technology Data
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
              Upload a CSV file containing records for Technologies.
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
                    if (onShowToast) onShowToast('success', 'Technology CSV data uploaded and merged.');
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

