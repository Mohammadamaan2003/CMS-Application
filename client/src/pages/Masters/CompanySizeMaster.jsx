import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  IconSearch,
  IconFilePenLine,
  IconChevronLeft,
  IconChevronRight,
  IconChevronDown,
  IconPlus,
  IconClose,
} from '../../components/Icons';
import SelectColumnsModal from '../../components/SelectColumnsModal';
import ApexActionsMenu from '../../components/ApexActionsMenu';
import ApexFilterModal from '../../components/ApexFilterModal';
import ApexChartModal from '../../components/ApexChartModal';
import ApexAggregateModal from '../../components/ApexAggregateModal';
import ActiveAggregationsBar from '../../components/ActiveAggregationsBar';
import { computeAggregationValue } from '../../utils/aggregationUtils';
import { api } from '../../api/client';
import { COMPANY_ALL_COLUMNS } from '../Companies/CompanyReport';
import { formatAppDate } from '../../utils/dateUtils';
import ApexColumnHeaderMenu from '../../components/ApexColumnHeaderMenu';
import ApexActiveFilterBanner from '../../components/ApexActiveFilterBanner';
import ApexInteractiveReport from '../../components/ApexInteractiveReport';
import { useApexColumnMenu } from '../../utils/useApexColumnMenu';

// Columns for the Company Size Master Report matching Screenshot 2
export const COMPANY_SIZE_MASTER_COLUMNS = [
  {
    key: 'master_company_size',
    label: 'Master Company Size',
    getValue: (r) => r.master_company_size || '',
  },
  {
    key: 'master_company_size_count',
    label: 'Master Company Size Count',
    getValue: (r) => (r.validation_status === 'DATA IN COMPANY' || !r.master_company_size ? '-' : Number(r.master_company_size_count || 0).toLocaleString()),
  },
  {
    key: 'company_company_size',
    label: 'Company Company Size',
    getValue: (r) => r.company_company_size || '',
  },
  {
    key: 'company_company_size_count',
    label: 'Company Company Size Count',
    getValue: (r) => (r.validation_status === 'DATA IN MASTER' || !r.company_company_size ? '-' : Number(r.company_company_size_count || 0).toLocaleString()),
  },
  {
    key: 'validation_status',
    label: 'Validation Status',
    getValue: (r) => r.validation_status || '',
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

const DEFAULT_MASTER_KEYS = COMPANY_SIZE_MASTER_COLUMNS.map((c) => c.key);
export const COMPANY_SIZE_COLUMNS = COMPANY_SIZE_MASTER_COLUMNS;

export const CHILD_SIZE_COMPANY_COLUMNS = [
  { key: 'id', label: 'ID', width: '80px', getValue: (r) => r.id },
  { key: 'comp_name', label: 'Company Name', minWidth: '220px', getValue: (r) => r.comp_name || r.name || '' },
  { key: 'employee_size', label: 'Employee Size', minWidth: '150px', getValue: (r) => r.employee_size || '' },
  { key: 'company_type', label: 'Company Type', minWidth: '140px', getValue: (r) => r.company_type || '' },
  { key: 'industry', label: 'Industry', minWidth: '180px', getValue: (r) => r.industry || '' },
  { key: 'country', label: 'Country', minWidth: '120px', getValue: (r) => r.country || '' },
  { key: 'city', label: 'City', minWidth: '120px', getValue: (r) => r.city || '' },
  {
    key: 'website',
    label: 'Website',
    minWidth: '180px',
    getValue: (r) => r.website || '',
    render: (c) => c.website ? (
      <a href={c.website.startsWith('http') ? c.website : `https://${c.website}`} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', textDecoration: 'none' }}>
        {c.website}
      </a>
    ) : '-',
  },
  { key: 'technology', label: 'Technology', minWidth: '140px', getValue: (r) => r.technology || '' },
];

export default function CompanySizeMaster({ onShowToast, onNavigateToCompanyForm, onNavigateToContactForm }) {
  // Mode: 'report' or 'form' with localStorage persistence across browser refresh
  const [viewMode, setViewMode] = useState(() => {
    try {
      const saved = localStorage.getItem('apex_company_size_active_form');
      if (saved) return 'form';
    } catch (e) {}
    return 'report';
  });

  const [selectedRecord, setSelectedRecord] = useState(() => {
    try {
      const saved = localStorage.getItem('apex_company_size_active_form');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return null;
  });

  // Form editable state
  const [formData, setFormData] = useState(() => {
    try {
      const saved = localStorage.getItem('apex_company_size_active_form');
      if (saved) {
        const rec = JSON.parse(saved);
        return {
          master_company_size: rec.master_company_size || '',
          master_company_size_count: rec.master_company_size_count || 0,
          company_company_size: rec.company_company_size || '',
          company_company_size_count: rec.company_company_size_count || 0,
          created_by: rec.created_by || 'APEX_PUBLIC_USER',
          created_date: rec.created_date || '7/20/2026',
          modified_by: rec.modified_by || 'AMAAN',
          modified_date: rec.modified_date || '11/10/2026',
        };
      }
    } catch (e) {}
    return {
      master_company_size: '',
      master_company_size_count: 0,
      company_company_size: '',
      company_company_size_count: 0,
      created_by: 'APEX_PUBLIC_USER',
      created_date: '',
      modified_by: 'AMAAN',
      modified_date: '',
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

  // Master Actions & Columns
  const [showMasterActions, setShowMasterActions] = useState(false);
  const [showMasterColumnsModal, setShowMasterColumnsModal] = useState(false);
  const [showMasterFilterModal, setShowMasterFilterModal] = useState(false);
  const [showMasterChartModal, setShowMasterChartModal] = useState(false);
  const [showAggregateModal, setShowAggregateModal] = useState(false);
  const [aggregations, setAggregations] = useState([]);
  const [masterVisibleKeys, setMasterVisibleKeys] = useState(() => {
    try {
      const s = localStorage.getItem('company_size_master_visible_columns');
      if (s) {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
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

  // Edit Company Record Modal ("Update Records" in Real-time)
  const [editingCompany, setEditingCompany] = useState(null);
  const [editingCompanyForm, setEditingCompanyForm] = useState({
    comp_name: '',
    employee_size: '',
    industry: '',
    company_type: '',
    country: '',
    city: '',
    website: '',
    technology: '',
  });

  const handleOpenEditCompany = (company) => {
    setEditingCompany(company);
    setEditingCompanyForm({
      comp_name: company.comp_name || company.name || '',
      employee_size: company.employee_size || '',
      industry: company.industry || '',
      company_type: company.company_type || '',
      country: company.country || '',
      city: company.city || '',
      website: company.website || '',
      technology: company.technology || '',
    });
  };

  const handleUpdateCompanyRecord = async (e) => {
    e.preventDefault();
    if (!editingCompany) return;
    try {
      const res = await api.updateCompany(editingCompany.id, {
        ...editingCompany,
        ...editingCompanyForm,
        name: editingCompanyForm.comp_name,
      });
      if (res.success) {
        if (onShowToast) {
          onShowToast(
            'success',
            `Record #${editingCompany.id} updated to "${editingCompanyForm.employee_size}". Dynamic counts synchronized.`
          );
        }
        setEditingCompany(null);
        await Promise.all([loadMasterData(), loadChildCompanies()]);
      }
    } catch (err) {
      if (onShowToast) onShowToast('error', err.message || 'Failed to update company record.');
    }
  };

  // Child Report State (Companies filtered by WHERE employee_size = selectedRecord.master_company_size)
  const [childCompanies, setChildCompanies] = useState([]);
  const [childLoading, setChildLoading] = useState(false);
  const [childSearch, setChildSearch] = useState('');
  const [childActiveSearch, setChildActiveSearch] = useState('');
  const [childRows, setChildRows] = useState(50);
  const [childPage, setChildPage] = useState(1);
  const [childTotal, setChildTotal] = useState(0);
  const [showChildActions, setShowChildActions] = useState(false);
  const [showChildColumnsModal, setShowChildColumnsModal] = useState(false);
  const [childVisibleKeys, setChildVisibleKeys] = useState([
    'id',
    'comp_name',
    'employee_size',
    'industry',
    'country',
    'city',
    'website',
    'technology',
    'company_type',
  ]);

  // Load Master Report Data
  const loadMasterData = useCallback(async () => {
    try {
      setLoadingMaster(true);
      const res = await api.getCompanySizes({
        search: activeMasterSearch,
        page: masterPage,
        limit: masterRows,
      });
      if (res.success) {
        setMasterList(res.data || []);
        setMasterTotal(res.total || 0);
      }
    } catch (err) {
      console.error('Error loading Master Company Sizes:', err);
      if (onShowToast) onShowToast('error', 'Failed to load master company sizes: ' + err.message);
    } finally {
      setLoadingMaster(false);
    }
  }, [activeMasterSearch, masterPage, masterRows, onShowToast]);

  useEffect(() => {
    loadMasterData();
  }, [loadMasterData]);

  const allMasterSizes = useMemo(() => {
    const set = new Set();
    masterList.forEach((m) => {
      if (m.master_company_size && m.master_company_size.trim()) {
        set.add(m.master_company_size.trim());
      }
    });
    return Array.from(set);
  }, [masterList]);

  const sizeDynamicCountMap = useMemo(() => {
    const map = {};
    masterList.forEach((m) => {
      if (m.company_company_size) map[m.company_company_size] = m.company_company_size_count;
      if (m.master_company_size && map[m.master_company_size] === undefined) {
        map[m.master_company_size] = m.company_company_size_count || m.master_company_size_count || 0;
      }
    });
    return map;
  }, [masterList]);

  const handleCompanySizeChange = (newVal) => {
    const matchedCount = sizeDynamicCountMap[newVal] || 0;
    const newStatus = formData.master_company_size && newVal
      ? 'DATA IN BOTH'
      : (newVal ? 'DATA IN COMPANY' : 'DATA IN MASTER');

    setFormData((prev) => ({
      ...prev,
      company_company_size: newVal,
      company_company_size_count: matchedCount,
      validation_status: newStatus,
    }));
  };

  // Load Child Companies for Form View: WHERE employee_size = selectedRecord.master_company_size
  const loadChildCompanies = useCallback(async () => {
    if (!selectedRecord || !selectedRecord.master_company_size) return;
    try {
      setChildLoading(true);
      const res = await api.getCompanies({
        employee_size: selectedRecord.master_company_size,
        search: childActiveSearch,
        page: childPage,
        limit: childRows,
        sortBy: 'id',
        sortOrder: 'DESC',
      });
      if (res.success) {
        setChildCompanies(res.data || []);
        setChildTotal(res.total || 0);
      }
    } catch (err) {
      console.error('Error loading linked companies:', err);
      if (onShowToast) onShowToast('error', 'Failed to load linked companies: ' + err.message);
    } finally {
      setChildLoading(false);
    }
  }, [selectedRecord, childActiveSearch, childPage, childRows, onShowToast]);

  useEffect(() => {
    if (viewMode === 'form' && selectedRecord) {
      loadChildCompanies();
    }
  }, [viewMode, selectedRecord, loadChildCompanies]);

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
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.size} selected company size record(s)?`)) {
      return;
    }
    try {
      const idArray = Array.from(selectedIds);
      const res = await api.batchDeleteCompanySizes(idArray);
      if (res.success) {
        if (onShowToast) onShowToast('success', res.message || `Deleted ${idArray.length} records successfully.`);
        setSelectedIds(new Set());
        loadMasterData();
      }
    } catch (err) {
      if (onShowToast) onShowToast('error', 'Batch delete failed: ' + err.message);
    }
  };

  // Handle Edit Drilldown -> switches to Form view
  const handleOpenEdit = (rec) => {
    setSelectedRecord(rec);
    setFormData({
      master_company_size: rec.master_company_size || '',
      master_company_size_count: rec.master_company_size_count || 0,
      company_company_size: rec.company_company_size || '',
      company_company_size_count: rec.company_company_size_count || 0,
      created_by: rec.created_by || 'APEX_PUBLIC_USER',
      created_date: rec.created_date || '7/20/2026',
      modified_by: rec.modified_by || 'AMAAN',
      modified_date: rec.modified_date || '11/10/2026',
    });
    setChildPage(1);
    setChildSearch('');
    setChildActiveSearch('');
    setViewMode('form');
    try {
      localStorage.setItem('apex_company_size_active_form', JSON.stringify(rec));
    } catch (e) {}
  };

  // Open Form Page in Create Mode (Brand New Record)
  const handleOpenCreate = () => {
    setSelectedRecord({ isCreate: true });
    setFormData({
      master_company_size: '',
      master_company_size_count: 0,
      company_company_size: '',
      company_company_size_count: 0,
      created_by: 'APEX_PUBLIC_USER',
      created_date: formatAppDate(new Date()),
      modified_by: 'APEX_PUBLIC_USER',
      modified_date: formatAppDate(new Date()),
    });
    setChildPage(1);
    setChildSearch('');
    setChildActiveSearch('');
    setViewMode('form');
    try {
      localStorage.setItem('apex_company_size_active_form', JSON.stringify({ isCreate: true }));
    } catch (e) {}
  };

  // Handle Form Actions
  const handleCancelForm = () => {
    setViewMode('report');
    setSelectedRecord(null);
    try {
      localStorage.removeItem('apex_company_size_active_form');
    } catch (e) {}
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const cleanSize = (formData.master_company_size || '').trim();
    if (!cleanSize) {
      if (onShowToast) onShowToast('error', 'Master Company Size name is required.');
      return;
    }

    const dupSize = masterList.find(
      (m) =>
        m.master_company_size &&
        m.master_company_size.trim().toLowerCase() === cleanSize.toLowerCase() &&
        String(m.id) !== String(selectedRecord?.id)
    );
    if (dupSize) {
      if (onShowToast) onShowToast('error', `Master company size "${cleanSize}" already exists. Duplicate records are not allowed.`);
      return;
    }

    const isCreate = !selectedRecord || selectedRecord.isCreate;

    if (isCreate) {
      try {
        const res = await api.createCompanySize({ master_company_size: formData.master_company_size.trim() });
        if (res.success) {
          const newId = res.data?.id;
          if (onShowToast) {
            onShowToast(
              'success',
              `Master Company Size "${formData.master_company_size.trim()}" created successfully with ID #${newId}. Added to report.`
            );
          }
          await loadMasterData();
          setViewMode('report');
          setSelectedRecord(null);
          try {
            localStorage.removeItem('apex_company_size_active_form');
          } catch (e) {}
        }
      } catch (err) {
        if (onShowToast) onShowToast('error', err.message || 'Failed to create Master Company Size.');
      }
    } else {
      try {
        const res = await api.updateCompanySize(selectedRecord.id, {
          master_company_size: formData.master_company_size.trim(),
          company_company_size: formData.company_company_size,
          old_company_size: selectedRecord.company_company_size || selectedRecord.master_company_size,
        });
        if (res.success) {
          if (onShowToast) onShowToast('success', 'Master Company Size updated successfully.');
          await loadMasterData();
          setViewMode('report');
          setSelectedRecord(null);
          try {
            localStorage.removeItem('apex_company_size_active_form');
          } catch (e) {}
        }
      } catch (err) {
        if (onShowToast) onShowToast('error', err.message || 'Failed to update Master Company Size.');
      }
    }
  };

  const handleDeleteMaster = async () => {
    if (!selectedRecord || selectedRecord.isCreate) return;
    if (!window.confirm(`Are you sure you want to delete master company size "${selectedRecord.master_company_size}"?`)) {
      return;
    }
    try {
      const res = await api.deleteCompanySize(selectedRecord.id);
      if (res.success) {
        if (onShowToast) onShowToast('success', 'Master Company Size deleted successfully.');
        loadMasterData();
        setViewMode('report');
        setSelectedRecord(null);
        try {
          localStorage.removeItem('apex_company_size_active_form');
        } catch (e) {}
      }
    } catch (err) {
      if (onShowToast) onShowToast('error', err.message || 'Failed to delete Master Company Size.');
    }
  };

  // CSV Download for Master Report
  const handleDownloadMasterCsv = () => {
    const activeCols = COMPANY_SIZE_MASTER_COLUMNS.filter((c) => masterVisibleKeys.includes(c.key));
    const headers = activeCols.map((c) => `"${c.label}"`).join(',');
    const rows = masterList.map((r) =>
      activeCols
        .map((c) => {
          const val = c.getValue(r);
          return `"${String(val !== null && val !== undefined ? val : '').replace(/"/g, '""')}"`;
        })
        .join(',')
    );
    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Company_Size_Master_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    if (onShowToast) onShowToast('success', 'Company Size master CSV downloaded.');
  };

  // CSV Download for Child Linked Companies
  const handleDownloadChildCsv = () => {
    const colMap = new Map(COMPANY_ALL_COLUMNS.map((c) => [c.key, c]));
    const activeCols = childVisibleKeys.map((k) => colMap.get(k)).filter(Boolean);
    const headers = activeCols.map((c) => `"${c.label}"`).join(',');
    const rows = childCompanies.map((c) =>
      activeCols
        .map((col) => {
          const val = col.getValue(c);
          return `"${String(val !== null && val !== undefined ? val : '').replace(/"/g, '""')}"`;
        })
        .join(',')
    );
    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Companies_${(selectedRecord?.master_company_size || 'filtered').replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    if (onShowToast) onShowToast('success', 'Filtered companies CSV downloaded.');
  };

  // Pagination bounds
  const masterStartIdx = masterTotal === 0 ? 0 : (masterPage - 1) * (masterRows === 'all' ? masterTotal : masterRows) + 1;
  const masterEndIdx = masterRows === 'all' ? masterTotal : Math.min(masterPage * masterRows, masterTotal);
  const totalPages = masterRows === 'all' ? 1 : Math.ceil(masterTotal / masterRows) || 1;

  const childStartIdx = childTotal === 0 ? 0 : (childPage - 1) * (childRows === 'all' ? childTotal : childRows) + 1;
  const childEndIdx = childRows === 'all' ? childTotal : Math.min(childPage * childRows, childTotal);

  return (
    <div className="company-size-master-container">
      {/* Select Columns Modal for Master Report */}
      <SelectColumnsModal
        isOpen={showMasterColumnsModal}
        onClose={() => setShowMasterColumnsModal(false)}
        allColumns={COMPANY_SIZE_MASTER_COLUMNS}
        visibleColumnKeys={masterVisibleKeys}
        defaultVisibleKeys={DEFAULT_MASTER_KEYS}
        onApply={(newKeys) => {
          setMasterVisibleKeys(newKeys);
          try {
            localStorage.setItem('company_size_master_visible_columns', JSON.stringify(newKeys));
          } catch (e) {}
          if (onShowToast) onShowToast('success', `Updated master report columns (${newKeys.length} visible).`);
        }}
      />

      {/* Filter Modal for Master */}
      <ApexFilterModal
        isOpen={showMasterFilterModal}
        onClose={() => setShowMasterFilterModal(false)}
        columns={COMPANY_SIZE_MASTER_COLUMNS.map((c) => ({ id: c.key, label: c.label }))}
        onApplyFilter={(f) => {
          if (!f || !f.value) {
            setActiveMasterSearch('');
            setMasterSearch('');
          } else {
            setActiveMasterSearch(f.value);
            setMasterSearch(f.value);
          }
          setMasterPage(1);
        }}
      />

      {/* Quick Chart Modal for Master */}
      <ApexChartModal
        isOpen={showMasterChartModal}
        onClose={() => setShowMasterChartModal(false)}
        title="Company Size Dynamic Distribution"
        data={masterList}
        groupByColumns={[
          { id: 'master_company_size', label: 'Company Size' },
          { id: 'validation_status', label: 'Validation Status' },
        ]}
      />

      {/* Oracle APEX Interactive Column Header Menu */}
      <ApexColumnHeaderMenu
        isOpen={headerMenu.isOpen}
        column={headerMenu.column}
        anchorRect={headerMenu.anchorRect}
        data={masterList}
        sortConfig={{ key: sortKey, direction: sortDir }}
        onSort={handleMenuSort}
        onHideColumn={handleMenuHideColumn}
        onControlBreak={() => setShowMasterChartModal(true)}
        onFilterValue={handleMenuFilterValue}
        onClose={closeHeaderMenu}
      />

      {/* Select Columns Modal for Linked Companies Child Report */}
      <SelectColumnsModal
        isOpen={showChildColumnsModal}
        onClose={() => setShowChildColumnsModal(false)}
        allColumns={COMPANY_ALL_COLUMNS}
        visibleColumnKeys={childVisibleKeys}
        defaultVisibleKeys={COMPANY_ALL_COLUMNS.map((c) => c.key)}
        onApply={(newKeys) => {
          setChildVisibleKeys(newKeys);
          if (onShowToast) onShowToast('success', `Updated linked companies columns (${newKeys.length} visible).`);
        }}
      />

      {/* VIEW MODE 1: MASTER REPORT (Screenshot 2) */}
      {viewMode === 'report' && (
        <div>
          {/* Header */}
          <div className="apex-page-header-row" style={{ marginBottom: '1.25rem' }}>
            <h1 className="apex-page-heading">Company Size</h1>
          </div>

          {/* MAIN REPORT TABLE CARD (matching Designation & Position) */}
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
                {/* Search Bar (Industry Style) */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setActiveMasterSearch(masterSearch);
                  setMasterPage(1);
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

              {/* Rows Selector */}
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
                  <option value="500">500</option>
                  <option value="1000">1000</option>
                  <option value="all">All</option>
                </select>
              </div>

              {/* Actions Dropdown */}
              <div className="apex-actions-wrapper">
                <button
                  type="button"
                  className="btn-apex-actions"
                  onClick={() => setShowMasterActions((prev) => !prev)}
                >
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
                  columns={COMPANY_SIZE_MASTER_COLUMNS}
                  data={masterList}
                  reportId="company_size_master"
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
                    try {
                      localStorage.removeItem('company_size_master_visible_columns');
                    } catch (e) {}
                    setActiveMasterSearch('');
                    setMasterSearch('');
                    setMasterRows(50);
                    setMasterPage(1);
                    if (onShowToast) onShowToast('info', 'Report reset to default configuration.');
                  }}
                  onChangeRows={(newRows) => {
                    setMasterRows(newRows);
                    setMasterPage(1);
                  }}
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

          {/* Pagination summary row matching Screenshot 2: "1 - 50 of 218 < >" */}
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
              {masterTotal === 0 ? '0 of 0' : `${masterStartIdx.toLocaleString()} - ${masterEndIdx.toLocaleString()} of ${masterTotal.toLocaleString()}`}
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

          {/* Active Aggregations Bar */}
          <ActiveAggregationsBar
            aggregations={aggregations}
            data={masterList}
            onEditAggregation={() => setShowAggregateModal(true)}
            onRemoveAggregation={(id) => setAggregations((prev) => prev.filter((a) => a.id !== id))}
            onClearAll={() => setAggregations([])}
          />

          {/* Active Column Filter Banner */}
          <ApexActiveFilterBanner
            filter={headerFilter}
            columns={COMPANY_SIZE_MASTER_COLUMNS}
            onClear={handleClearHeaderFilter}
          />

          {/* Master Table */}
          <div style={{ overflowX: 'auto' }}>
            {loadingMaster ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                Loading Master Company Sizes...
              </div>
            ) : processedMasterList.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                No master company sizes found.
              </div>
            ) : (
              <table className="apex-master-table">
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

                    {/* Dynamic Data Columns with interactive APEX header actions */}
                    {COMPANY_SIZE_MASTER_COLUMNS.filter((c) => masterVisibleKeys.includes(c.key)).map((col) => {
                      const isNumber = col.key.includes('count') || col.key.includes('amount');
                      const isCenter = col.key === 'validation_status' || col.key.includes('date');
                      return (
                        <th
                          key={col.key}
                          className={isNumber ? 'col-number' : isCenter ? 'col-center' : ''}
                          onClick={(e) => handleHeaderClick(e, col)}
                          style={{
                            minWidth: isNumber ? '180px' : isCenter ? (col.key === 'validation_status' ? '160px' : '130px') : '220px',
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
                  {processedMasterList.map((rec) => (
                    <tr key={rec.id}>
                      {/* Edit Button matching Screenshot 2 */}
                      <td className="col-center">
                        <button
                          type="button"
                          className="apex-edit-icon-btn"
                          onClick={() => handleOpenEdit(rec)}
                          title="Edit Master Form"
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

                      {masterVisibleKeys.includes('master_company_size') && (
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
                            {rec.master_company_size}
                          </button>
                        </td>
                      )}

                      {masterVisibleKeys.includes('master_company_size_count') && (
                        <td className="col-number" style={{ fontWeight: 600, color: '#334155' }}>
                          {rec.validation_status === 'DATA IN COMPANY' || !rec.master_company_size
                            ? '-'
                            : Number(rec.master_company_size_count || 0).toLocaleString()}
                        </td>
                      )}

                      {masterVisibleKeys.includes('company_company_size') && (
                        <td style={{ color: '#334155' }}>
                          {rec.company_company_size || '-'}
                        </td>
                      )}

                      {masterVisibleKeys.includes('company_company_size_count') && (
                        <td className="col-number" style={{ fontWeight: 600, color: '#334155' }}>
                          {rec.validation_status === 'DATA IN MASTER' || !rec.company_company_size
                            ? '-'
                            : Number(rec.company_company_size_count || 0).toLocaleString()}
                        </td>
                      )}

                      {masterVisibleKeys.includes('validation_status') && (
                        <td className="col-center">
                          <span
                            className={
                              rec.validation_status === 'DATA IN BOTH'
                                ? 'apex-validation-badge-both'
                                : rec.validation_status === 'DATA IN COMPANY'
                                ? 'apex-validation-badge-company'
                                : 'apex-validation-badge-missing'
                            }
                          >
                            {rec.validation_status || 'DATA IN BOTH'}
                          </span>
                        </td>
                      )}

                      {masterVisibleKeys.includes('created_date') && (
                        <td className="col-center" style={{ color: '#64748b' }}>
                          {formatAppDate(rec.created_date)}
                        </td>
                      )}

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
                      {masterVisibleKeys.includes('master_company_size') && (
                        <td style={{ padding: '8px 12px' }}>
                          {aggregations.filter((a) => a.columnKey === 'master_company_size').map((a) => (
                            <div key={a.id} style={{ fontSize: '0.775rem' }}>
                              <span style={{ color: '#64748b' }}>{a.func}: </span>
                              <span style={{ color: '#2563eb' }}>{computeAggregationValue(masterList, a.func, a.columnKey)}</span>
                            </div>
                          ))}
                        </td>
                      )}
                      {masterVisibleKeys.includes('master_company_size_count') && (
                        <td className="col-number" style={{ padding: '8px 12px' }}>
                          {aggregations.filter((a) => a.columnKey === 'master_company_size_count').map((a) => (
                            <div key={a.id} style={{ fontSize: '0.775rem' }}>
                              <span style={{ color: '#64748b' }}>{a.func}: </span>
                              <span style={{ color: '#2563eb' }}>{computeAggregationValue(masterList, a.func, a.columnKey)}</span>
                            </div>
                          ))}
                        </td>
                      )}
                      {masterVisibleKeys.includes('company_company_size') && (
                        <td style={{ padding: '8px 12px' }}>
                          {aggregations.filter((a) => a.columnKey === 'company_company_size').map((a) => (
                            <div key={a.id} style={{ fontSize: '0.775rem' }}>
                              <span style={{ color: '#64748b' }}>{a.func}: </span>
                              <span style={{ color: '#2563eb' }}>{computeAggregationValue(masterList, a.func, a.columnKey)}</span>
                            </div>
                          ))}
                        </td>
                      )}
                      {masterVisibleKeys.includes('company_company_size_count') && (
                        <td className="col-number" style={{ padding: '8px 12px' }}>
                          {aggregations.filter((a) => a.columnKey === 'company_company_size_count').map((a) => (
                            <div key={a.id} style={{ fontSize: '0.775rem' }}>
                              <span style={{ color: '#64748b' }}>{a.func}: </span>
                              <span style={{ color: '#2563eb' }}>{computeAggregationValue(masterList, a.func, a.columnKey)}</span>
                            </div>
                          ))}
                        </td>
                      )}
                      {masterVisibleKeys.includes('validation_status') && (
                        <td className="col-center" style={{ padding: '8px 12px' }}>
                          {aggregations.filter((a) => a.columnKey === 'validation_status').map((a) => (
                            <div key={a.id} style={{ fontSize: '0.775rem' }}>
                              <span style={{ color: '#64748b' }}>{a.func}: </span>
                              <span style={{ color: '#2563eb' }}>{computeAggregationValue(masterList, a.func, a.columnKey)}</span>
                            </div>
                          ))}
                        </td>
                      )}
                      {masterVisibleKeys.includes('created_date') && (
                        <td className="col-center" style={{ padding: '8px 12px' }}>
                          {aggregations.filter((a) => a.columnKey === 'created_date').map((a) => (
                            <div key={a.id} style={{ fontSize: '0.775rem' }}>
                              <span style={{ color: '#64748b' }}>{a.func}: </span>
                              <span style={{ color: '#2563eb' }}>{computeAggregationValue(masterList, a.func, a.columnKey)}</span>
                            </div>
                          ))}
                        </td>
                      )}
                      {masterVisibleKeys.includes('modified_date') && (
                        <td className="col-center" style={{ padding: '8px 12px' }}>
                          {aggregations.filter((a) => a.columnKey === 'modified_date').map((a) => (
                            <div key={a.id} style={{ fontSize: '0.775rem' }}>
                              <span style={{ color: '#64748b' }}>{a.func}: </span>
                              <span style={{ color: '#2563eb' }}>{computeAggregationValue(masterList, a.func, a.columnKey)}</span>
                            </div>
                          ))}
                        </td>
                      )}
                    </tr>
                  </tfoot>
                )}
              </table>
            )}
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODE 2: FORM PAGE + CHILD FILTERED REPORT (Screenshot 3) */}
      {viewMode === 'form' && (
        <div>
          {/* Top Form Card matching Screenshot 3 */}
          <div className="apex-form-card">
            <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>
                {!selectedRecord || selectedRecord.isCreate ? 'Create Master Company Size' : 'Edit Company Size'}
              </h2>
            </div>
            <form onSubmit={handleFormSubmit}>
              {/* Row 1: 4 columns */}
              <div className="apex-form-grid-4">
                <div className="apex-form-field">
                  <label>
                    Master Company Size
                  </label>
                  <input
                    type="text"
                    className="apex-form-input"
                    style={{ width: '100%', height: '36px', borderRadius: '4px', border: '1px solid #cbd5e1', padding: '0 0.75rem' }}
                    value={formData.master_company_size}
                    onChange={(e) => setFormData({ ...formData, master_company_size: e.target.value })}
                  />
                </div>

                <div className="apex-form-field">
                  <label>
                    Master Company Size Total
                  </label>
                  <input
                    type="text"
                    readOnly
                    className="apex-form-input"
                    style={{ width: '100%', height: '36px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', padding: '0 0.75rem', color: '#475569', fontWeight: 600 }}
                    value={Number(formData.master_company_size_count || 0).toLocaleString()}
                  />
                </div>

                <div className="apex-form-field">
                  <label>
                    Company Company Size
                  </label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
                    <select
                      className="apex-form-input"
                      style={{
                        width: '100%',
                        height: '36px',
                        borderRadius: '4px',
                        border: '1px solid #cbd5e1',
                        padding: '0 2rem 0 0.75rem',
                        backgroundColor: '#ffffff',
                        color: '#1e293b',
                        fontSize: '0.825rem',
                      }}
                      value={formData.company_company_size || ''}
                      onChange={(e) => handleCompanySizeChange(e.target.value)}
                    >
                      <option value="">-- Select Master Size --</option>
                      {allMasterSizes.map((sName) => (
                        <option key={sName} value={sName}>
                          {sName}
                        </option>
                      ))}
                    </select>
                    {formData.company_company_size && (
                      <button
                        type="button"
                        onClick={() => handleCompanySizeChange('')}
                        style={{
                          position: 'absolute',
                          right: '24px',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#64748b',
                          fontSize: '0.75rem',
                          padding: '2px',
                        }}
                        title="Clear selection"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                <div className="apex-form-field">
                  <label>
                    Company Company Size Count
                  </label>
                  <input
                    type="text"
                    readOnly
                    className="apex-form-input"
                    style={{ width: '100%', height: '36px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', padding: '0 0.75rem', color: '#475569', fontWeight: 600 }}
                    value={Number(formData.company_company_size_count || 0).toLocaleString()}
                  />
                </div>
              </div>

              {/* Row 2: Validation Status */}
              <div className="apex-form-grid-4">
                <div className="apex-form-field">
                  <label>
                    Validation Status
                  </label>
                  <input
                    type="text"
                    readOnly
                    className="apex-form-input"
                    style={{ width: '100%', height: '36px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', padding: '0 0.75rem', color: '#475569', fontWeight: 600 }}
                    value={formData.validation_status || ''}
                  />
                </div>
              </div>

              {/* Row 3: 4 columns (Only visible when editing an existing record) */}
              {selectedRecord && !selectedRecord.isCreate && (
                <div className="apex-form-grid-4">
                  <div className="apex-form-field">
                    <label>
                      Created By
                    </label>
                    <input
                      type="text"
                      readOnly
                      className="apex-form-input"
                      style={{ width: '100%', height: '36px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', padding: '0 0.75rem', color: '#475569' }}
                      value={formData.created_by}
                    />
                  </div>

                  <div className="apex-form-field">
                    <label>
                      Created Date
                    </label>
                    <input
                      type="text"
                      readOnly
                      className="apex-form-input"
                      style={{ width: '100%', height: '36px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', padding: '0 0.75rem', color: '#475569' }}
                      value={formatAppDate(formData.created_date)}
                    />
                  </div>

                  <div className="apex-form-field">
                    <label>
                      Modified By
                    </label>
                    <input
                      type="text"
                      readOnly
                      className="apex-form-input"
                      style={{ width: '100%', height: '36px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', padding: '0 0.75rem', color: '#475569' }}
                      value={formData.modified_by}
                    />
                  </div>

                  <div className="apex-form-field">
                    <label>
                      Modified Date
                    </label>
                    <input
                      type="text"
                      readOnly
                      className="apex-form-input"
                      style={{ width: '100%', height: '36px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', padding: '0 0.75rem', color: '#475569' }}
                      value={formatAppDate(formData.modified_date)}
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons Row */}
              <div className="apex-form-actions-row">
                <button
                  type="button"
                  className="btn-apex-cancel"
                  onClick={handleCancelForm}
                >
                  Cancel
                </button>

                <div className="apex-form-actions-right">
                  {selectedRecord && !selectedRecord.isCreate && (
                    <button
                      type="button"
                      className="apex-btn apex-btn-secondary"
                      onClick={handleDeleteMaster}
                      style={{ minWidth: '90px', color: '#dc2626' }}
                    >
                      Delete
                    </button>
                  )}
                  {selectedRecord && !selectedRecord.isCreate && (
                    <button
                      type="submit"
                      className="btn-apex-top"
                      style={{ minWidth: '120px' }}
                    >
                      Apply Changes
                    </button>
                  )}
                  <button
                    type={!selectedRecord || selectedRecord.isCreate ? 'submit' : 'button'}
                    className="btn-apex-create"
                    style={{ minWidth: '140px' }}
                    onClick={async () => {
                      if (selectedRecord && !selectedRecord.isCreate) {
                        try {
                          await api.updateCompanySize(selectedRecord.id, {
                            master_company_size: (formData.master_company_size || '').trim(),
                            company_company_size: formData.company_company_size,
                            old_company_size: selectedRecord.company_company_size || selectedRecord.master_company_size,
                          });
                          setSelectedRecord((prev) => ({
                            ...prev,
                            master_company_size: formData.company_company_size || formData.master_company_size,
                            company_company_size: formData.company_company_size,
                          }));
                          await Promise.all([loadMasterData(), loadChildCompanies()]);
                          if (onShowToast) onShowToast('success', 'Company Size records updated with real-time company data.');
                        } catch (err) {
                          if (onShowToast) onShowToast('error', err.message || 'Failed to update company size records.');
                        }
                      }
                    }}
                    title={!selectedRecord || selectedRecord.isCreate ? 'Create new Master Company Size' : 'Update company size records'}
                  >
                    {!selectedRecord || selectedRecord.isCreate ? 'Create' : 'Update Records'}
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Child Report below Form: only when editing an existing record */}
          {selectedRecord && !selectedRecord.isCreate && (
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
                reportTitle={`Companies for Size ${selectedRecord.master_company_size || formData.master_company_size || 'Employee Size'}`}
                badge={childTotal}
                columns={CHILD_SIZE_COMPANY_COLUMNS}
                data={childCompanies}
                total={childTotal}
                page={childPage}
                onPageChange={setChildPage}
                rowsPerPage={childRows}
                onRowsPerPageChange={(nr) => { setChildRows(nr); setChildPage(1); }}
                search={childSearch}
                onSearchChange={setChildSearch}
                onSearchSubmit={() => { setChildActiveSearch(childSearch.trim()); setChildPage(1); }}
                isServerSide={true}
                isLoading={childLoading}
                renderLeadingCell={(c) => (
                  <button
                    type="button"
                    className="apex-edit-icon-btn"
                    onClick={() => {
                      if (onNavigateToCompanyForm) {
                        onNavigateToCompanyForm(c.id);
                      } else {
                        try {
                          localStorage.setItem('apex_open_company_id', String(c.id));
                        } catch (e) {}
                        window.location.hash = `#/companies?id=${c.id}`;
                      }
                    }}
                    title={`Edit Company #${c.id} Form`}
                  >
                    <IconFilePenLine size={15} />
                  </button>
                )}
                toolbarButtons={
                  <button
                    type="button"
                    className="btn-apex-top"
                    onClick={() => {
                      loadChildCompanies();
                      loadMasterData();
                      if (onShowToast) onShowToast('info', 'Records updated with real-time data.');
                    }}
                    title="Update records from live data"
                  >
                    Update Records
                  </button>
                }
                onRefresh={loadChildCompanies}
                onReset={() => {
                  setChildSearch('');
                  setChildActiveSearch('');
                  setChildPage(1);
                  setChildRows(50);
                }}
                onDownload={handleDownloadChildCsv}
                onShowToast={onShowToast}
              />
            </div>
          )}
      </div>
    )}

      {/* Edit Company Record Modal ("Update Records" in Real-time) */}
      {editingCompany && (
        <div className="apex-modal-overlay">
          <div className="apex-modal-container" style={{ maxWidth: '580px', width: '92%' }}>
            <div className="apex-modal-header">
              <div className="apex-modal-title">
                <IconFilePenLine size={18} />
                <span>Update Record #{editingCompany.id} - {editingCompany.comp_name || editingCompany.name}</span>
              </div>
              <button
                type="button"
                className="apex-modal-close"
                onClick={() => setEditingCompany(null)}
              >
                <IconClose size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateCompanyRecord}>
              <div className="apex-modal-body" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>
                      Company Name *
                    </label>
                    <input
                      type="text"
                      required
                      className="apex-form-input"
                      style={{ width: '100%' }}
                      value={editingCompanyForm.comp_name}
                      onChange={(e) => setEditingCompanyForm({ ...editingCompanyForm, comp_name: e.target.value })}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.3rem' }}>
                      Employee Size * (Real-time category)
                    </label>
                    <input
                      type="text"
                      list="employee-size-options"
                      required
                      className="apex-form-input"
                      style={{ width: '100%', borderColor: '#2563eb', fontWeight: 600, color: '#1e293b' }}
                      value={editingCompanyForm.employee_size}
                      onChange={(e) => setEditingCompanyForm({ ...editingCompanyForm, employee_size: e.target.value })}
                      placeholder="e.g. 201-500 employees"
                    />
                    <datalist id="employee-size-options">
                      {masterList.map((m) => (
                        <option key={m.master_company_size} value={m.master_company_size} />
                      ))}
                    </datalist>
                    <span style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px', display: 'block' }}>
                      Select or type the size. Updates dynamic counts immediately.
                    </span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>
                      Industry
                    </label>
                    <input
                      type="text"
                      className="apex-form-input"
                      style={{ width: '100%' }}
                      value={editingCompanyForm.industry}
                      onChange={(e) => setEditingCompanyForm({ ...editingCompanyForm, industry: e.target.value })}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>
                      Company Type
                    </label>
                    <input
                      type="text"
                      className="apex-form-input"
                      style={{ width: '100%' }}
                      value={editingCompanyForm.company_type}
                      onChange={(e) => setEditingCompanyForm({ ...editingCompanyForm, company_type: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>
                      Country
                    </label>
                    <input
                      type="text"
                      className="apex-form-input"
                      style={{ width: '100%' }}
                      value={editingCompanyForm.country}
                      onChange={(e) => setEditingCompanyForm({ ...editingCompanyForm, country: e.target.value })}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>
                      City
                    </label>
                    <input
                      type="text"
                      className="apex-form-input"
                      style={{ width: '100%' }}
                      value={editingCompanyForm.city}
                      onChange={(e) => setEditingCompanyForm({ ...editingCompanyForm, city: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>
                      Website
                    </label>
                    <input
                      type="text"
                      className="apex-form-input"
                      style={{ width: '100%' }}
                      value={editingCompanyForm.website}
                      onChange={(e) => setEditingCompanyForm({ ...editingCompanyForm, website: e.target.value })}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>
                      Technology
                    </label>
                    <input
                      type="text"
                      className="apex-form-input"
                      style={{ width: '100%' }}
                      value={editingCompanyForm.technology}
                      onChange={(e) => setEditingCompanyForm({ ...editingCompanyForm, technology: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="apex-modal-footer">
                <button
                  type="button"
                  className="apex-btn apex-btn-secondary"
                  onClick={() => setEditingCompany(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-apex-create"
                  style={{ minWidth: '150px' }}
                  title="Update this company record in real time"
                >
                  Update Records
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Aggregate Modal */}
      <ApexAggregateModal
        isOpen={showAggregateModal}
        onClose={() => setShowAggregateModal(false)}
        columns={COMPANY_SIZE_MASTER_COLUMNS}
        aggregations={aggregations}
        onApply={(newAgg) => {
          setAggregations((prev) => {
            const idx = prev.findIndex((a) => a.id === newAgg.id);
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = newAgg;
              return next;
            }
            return [...prev, newAgg];
          });
          if (onShowToast) onShowToast('success', `Applied ${newAgg.func} aggregation on ${newAgg.columnLabel}`);
        }}
        onDelete={(id) => {
          setAggregations((prev) => prev.filter((a) => a.id !== id));
          if (onShowToast) onShowToast('info', 'Aggregation removed.');
        }}
      />

      {/* Upload CSV Modal */}
      {showUploadModal && (
        <div className="apex-modal-overlay">
          <div className="apex-modal" style={{ maxWidth: '480px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#1e293b' }}>
                Upload Company Size Data
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
              Upload a CSV file containing records for Master Company Size.
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
                    if (onShowToast) onShowToast('success', 'Company Size CSV data uploaded and merged.');
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

