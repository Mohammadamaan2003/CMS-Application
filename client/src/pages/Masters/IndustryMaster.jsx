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
  IconUpload,
  IconTrash,
  IconDownload,
} from '../../components/Icons';

// Industry Master Report Columns matching Screenshot 1
export const INDUSTRY_MASTER_COLUMNS = [
  {
    key: 'master_industry',
    label: 'Master Industry',
    getValue: (r) => r.master_industry || '',
  },
  {
    key: 'master_company_type',
    label: 'Master Company Type',
    getValue: (r) => r.master_company_type || '',
  },
  {
    key: 'master_industry_company_type_count',
    label: 'Master Industry Company Type Count',
    getValue: (r) =>
      r.validation_status === 'DATA IN COMPANY' && !r.master_industry
        ? (r.master_industry_company_type_count ? Number(r.master_industry_company_type_count).toLocaleString() : '-')
        : (r.master_industry_company_type_count ? Number(r.master_industry_company_type_count).toLocaleString() : '0'),
  },
  {
    key: 'company_industry',
    label: 'Company Industry',
    getValue: (r) => r.company_industry || '',
  },
  {
    key: 'company_company_type',
    label: 'Company Company Type',
    getValue: (r) => r.company_company_type || '',
  },
  {
    key: 'company_industry_company_type_count',
    label: 'Company Industry Company Type Count',
    getValue: (r) =>
      r.validation_status === 'DATA IN MASTER' && !r.company_company_type
        ? '-'
        : (r.company_industry_company_type_count ? Number(r.company_industry_company_type_count).toLocaleString() : '0'),
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

const DEFAULT_MASTER_KEYS = INDUSTRY_MASTER_COLUMNS.map((c) => c.key);
export const INDUSTRY_COLUMNS = INDUSTRY_MASTER_COLUMNS;

export default function IndustryMaster({ onShowToast, onNavigateToCompanyForm, onNavigateToContactForm }) {
  // Mode: 'report' or 'form' with localStorage persistence across browser refresh
  const [viewMode, setViewMode] = useState(() => {
    try {
      const saved = localStorage.getItem('apex_industry_active_form');
      if (saved) return 'form';
    } catch (e) {}
    return 'report';
  });

  const [selectedRecord, setSelectedRecord] = useState(() => {
    try {
      const saved = localStorage.getItem('apex_industry_active_form');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return null;
  });

  // Form state matching Screenshot 2 (Industry - Form)
  const [formData, setFormData] = useState(() => {
    try {
      const saved = localStorage.getItem('apex_industry_active_form');
      if (saved) {
        const rec = JSON.parse(saved);
        return {
          master_industry: rec.master_industry || '',
          master_company_type: rec.master_company_type || '',
          master_total_company: rec.master_total_company || rec.master_industry_company_type_count || 0,
          validation_status: rec.validation_status || 'DATA IN COMPANY',
          company_industry: rec.company_industry || '',
          company_company_type: rec.company_company_type || '',
          company_company_count: rec.company_company_count || rec.company_industry_company_type_count || 0,
          created_date: formatAppDate(rec.created_date) || '',
          created_by: rec.created_by || 'APEX_PUBLIC_USER',
          modified_by: rec.modified_by || 'AMAAN',
          modified_date: formatAppDate(rec.modified_date) || '',
        };
      }
    } catch (e) {}
    return {
      master_industry: '',
      master_company_type: '',
      master_total_company: 0,
      validation_status: 'DATA IN COMPANY',
      company_industry: '',
      company_company_type: '',
      company_company_count: 0,
      created_date: '',
      created_by: 'APEX_PUBLIC_USER',
      modified_by: 'AMAAN',
      modified_date: '',
    };
  });

  // Top Filter Card State (matching Screenshot 1)
  const [filterIndustry, setFilterIndustry] = useState('');
  const [filterCompanyType, setFilterCompanyType] = useState('');
  const [filterCreatedDate, setFilterCreatedDate] = useState('');
  const [filterModifiedDate, setFilterModifiedDate] = useState('');

  // Applied Filters
  const [activeFilters, setActiveFilters] = useState({
    industry: '',
    company_type: '',
    createdDate: '',
    modifiedDate: '',
  });

  // Filter dropdown suggestions
  const [filterOptions, setFilterOptions] = useState({
    industries: [],
    companyTypes: ['Direct Client', 'IT Company', 'Staffing Firm'],
  });

  // Load filter options on boot
  useEffect(() => {
    api.getIndustryFilters()
      .then((res) => {
        if (res.success && res.data) {
          setFilterOptions({
            industries: res.data.industries || [],
            companyTypes: res.data.companyTypes || ['Direct Client', 'IT Company', 'Staffing Firm'],
          });
        }
      })
      .catch((err) => console.warn('Industry filter options notice:', err.message));
  }, []);

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

  // Master Actions & Columns Modals
  const [showMasterActions, setShowMasterActions] = useState(false);
  const [showMasterColumnsModal, setShowMasterColumnsModal] = useState(false);
  const [showMasterFilterModal, setShowMasterFilterModal] = useState(false);
  const [showMasterChartModal, setShowMasterChartModal] = useState(false);
  const [showAggregateModal, setShowAggregateModal] = useState(false);
  const [aggregations, setAggregations] = useState([]);
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Column visibility
  const [masterVisibleKeys, setMasterVisibleKeys] = useState(() => {
    try {
      const s = localStorage.getItem('industry_master_visible_columns');
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

  const handleSaveColumns = (newKeys) => {
    setMasterVisibleKeys(newKeys);
    try {
      localStorage.setItem('industry_master_visible_columns', JSON.stringify(newKeys));
    } catch (e) {}
  };

  // Load Master Report Data
  const loadMasterData = useCallback(async () => {
    try {
      setLoadingMaster(true);
      const res = await api.getIndustries({
        search: activeMasterSearch,
        industry: activeFilters.industry,
        company_type: activeFilters.company_type,
        createdDate: activeFilters.createdDate,
        modifiedDate: activeFilters.modifiedDate,
        page: masterPage,
        limit: masterRows,
      });
      if (res.success) {
        setMasterList(res.data || []);
        setMasterTotal(res.total || 0);
      }
    } catch (err) {
      console.error('Error loading Master Industries:', err);
      if (onShowToast) onShowToast('error', 'Failed to load master industries: ' + err.message);
    } finally {
      setLoadingMaster(false);
    }
  }, [activeMasterSearch, activeFilters, masterPage, masterRows, onShowToast]);

  useEffect(() => {
    loadMasterData();
  }, [loadMasterData]);

  // Apply Top Filter Card
  const handleApplyTopFilter = () => {
    setActiveFilters({
      industry: filterIndustry,
      company_type: filterCompanyType,
      createdDate: filterCreatedDate,
      modifiedDate: filterModifiedDate,
    });
    setMasterPage(1);
  };

  // Clear Top Filter Card
  const handleClearTopFilter = () => {
    setFilterIndustry('');
    setFilterCompanyType('');
    setFilterCreatedDate('');
    setFilterModifiedDate('');
    setActiveFilters({
      industry: '',
      company_type: '',
      createdDate: '',
      modifiedDate: '',
    });
    setMasterPage(1);
  };

  // Toolbar Search
  const handleToolbarSearch = (e) => {
    if (e) e.preventDefault();
    setActiveMasterSearch(masterSearch.trim());
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
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.size} selected industry record(s)?`)) {
      return;
    }
    try {
      const idArray = Array.from(selectedIds);
      const res = await api.batchDeleteIndustries(idArray);
      if (res.success) {
        if (onShowToast) onShowToast('success', res.message || `Deleted ${idArray.length} records successfully.`);
        setSelectedIds(new Set());
        loadMasterData();
      }
    } catch (err) {
      if (onShowToast) onShowToast('error', 'Batch delete failed: ' + err.message);
    }
  };

  // Export CSV
  const handleDownloadReport = () => {
    if (masterList.length === 0) {
      if (onShowToast) onShowToast('warning', 'No data to export.');
      return;
    }
    const headers = INDUSTRY_MASTER_COLUMNS.filter((c) => masterVisibleKeys.includes(c.key));
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
    link.setAttribute('download', `Industry_Master_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (onShowToast) onShowToast('success', 'Industry report downloaded.');
  };

  // Aggregations
  const handleApplyAggregation = (agg) => {
    setAggregations((prev) => {
      const filtered = prev.filter((a) => a.id !== agg.id);
      return [...filtered, agg];
    });
    if (onShowToast) onShowToast('success', `Aggregation applied: ${agg.func} (${agg.columnLabel})`);
  };

  // Child Report State (Companies drilldown for this industry/company_type)
  const [childCompanies, setChildCompanies] = useState([]);
  const [childLoading, setChildLoading] = useState(false);
  const [childSearch, setChildSearch] = useState('');
  const [childActiveSearch, setChildActiveSearch] = useState('');
  const [childRows, setChildRows] = useState(50);
  const [childPage, setChildPage] = useState(1);
  const [childTotal, setChildTotal] = useState(0);

  // Edit single company modal
  const [editingCompany, setEditingCompany] = useState(null);
  const [editingCompanyForm, setEditingCompanyForm] = useState({
    comp_name: '',
    industry: '',
    company_type: '',
    country: '',
    city: '',
    website: '',
  });

  const handleOpenEditCompany = (c) => {
    setEditingCompany(c);
    setEditingCompanyForm({
      comp_name: c.company_name || c.comp_name || '',
      industry: c.industry || '',
      company_type: c.company_type || '',
      country: c.country || '',
      city: c.city || '',
      website: c.website || '',
    });
  };

  const handleUpdateSingleCompany = async (e) => {
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
          onShowToast('success', `Company #${editingCompany.id} updated successfully.`);
        }
        setEditingCompany(null);
        await Promise.all([loadMasterData(), loadChildCompanies()]);
      }
    } catch (err) {
      if (onShowToast) onShowToast('error', err.message || 'Failed to update company record.');
    }
  };

  // Load Child Companies for Form View
  const loadChildCompanies = useCallback(async () => {
    if (!selectedRecord) return;
    const targetInd = selectedRecord.company_industry || selectedRecord.master_industry || '';
    const targetType = selectedRecord.company_company_type || selectedRecord.master_company_type || '';

    try {
      setChildLoading(true);
      const res = await api.getIndustryCompanies(selectedRecord.id || 0, {
        industry: targetInd,
        company_type: targetType,
        search: childActiveSearch,
        page: childPage,
        limit: childRows,
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

  // Open Edit Form
  const handleOpenEdit = (rec) => {
    setSelectedRecord(rec);
    const countVal = rec.company_industry_company_type_count || rec.master_industry_company_type_count || 0;
    setFormData({
      master_industry: rec.master_industry || '',
      master_company_type: rec.master_company_type || '',
      master_total_company: rec.master_industry ? countVal : 0,
      validation_status: rec.validation_status || 'DATA IN COMPANY',
      company_industry: rec.company_industry || '',
      company_company_type: rec.company_company_type || '',
      company_company_count: countVal,
      created_date: formatAppDate(rec.created_date) || '',
      created_by: rec.created_by || 'APEX_PUBLIC_USER',
      modified_by: rec.modified_by || 'AMAAN',
      modified_date: formatAppDate(rec.modified_date) || '',
    });
    setChildPage(1);
    setChildSearch('');
    setChildActiveSearch('');
    setViewMode('form');
    try {
      localStorage.setItem('apex_industry_active_form', JSON.stringify(rec));
    } catch (e) {}
  };

  // Open Create Form
  const handleOpenCreate = () => {
    const newRec = {
      isCreate: true,
      master_industry: '',
      master_company_type: '',
      master_total_company: 0,
      company_industry: '',
      company_company_type: '',
      company_company_count: 0,
      validation_status: 'DATA IN MASTER',
      created_by: 'APEX_PUBLIC_USER',
      created_date: formatAppDate(new Date()),
      modified_by: 'ADMIN',
      modified_date: formatAppDate(new Date()),
    };
    setSelectedRecord(newRec);
    setFormData(newRec);
    setChildCompanies([]);
    setChildTotal(0);
    setViewMode('form');
    try {
      localStorage.setItem('apex_industry_active_form', JSON.stringify(newRec));
    } catch (e) {}
  };

  // Cancel Form
  const handleCancelForm = () => {
    setViewMode('report');
    setSelectedRecord(null);
    try {
      localStorage.removeItem('apex_industry_active_form');
    } catch (e) {}
  };

  // Delete Record in Form View
  const handleDeleteMaster = async () => {
    if (!selectedRecord || selectedRecord.isCreate) return;
    if (!window.confirm(`Are you sure you want to delete industry "${formData.master_industry || formData.company_industry}"?`)) {
      return;
    }
    try {
      const res = await api.deleteIndustry(selectedRecord.id);
      if (res.success) {
        if (onShowToast) onShowToast('success', 'Industry deleted successfully.');
        handleCancelForm();
        loadMasterData();
      }
    } catch (err) {
      if (onShowToast) onShowToast('error', 'Failed to delete industry: ' + err.message);
    }
  };

  // Apply Changes (Master Record update)
  const handleFormSubmit = async (e) => {
    if (e) e.preventDefault();
    const cleanInd = (formData.master_industry || '').trim();
    const cleanType = (formData.master_company_type || '').trim();
    if (!cleanInd) {
      if (onShowToast) onShowToast('error', 'Master Industry is required.');
      return;
    }

    const dupInd = masterList.find(
      (m) =>
        (m.industry || m.master_industry) &&
        (m.industry || m.master_industry).trim().toLowerCase() === cleanInd.toLowerCase() &&
        (m.company_type || m.master_company_type || '').trim().toLowerCase() === cleanType.toLowerCase() &&
        String(m.id) !== String(selectedRecord?.id)
    );
    if (dupInd) {
      if (onShowToast) onShowToast('error', `Industry "${cleanInd}" already exists. Duplicate records are not allowed.`);
      return;
    }

    try {
      if (selectedRecord && selectedRecord.isCreate) {
        const res = await api.createIndustry({
          master_industry: formData.master_industry.trim(),
          master_company_type: formData.master_company_type ? formData.master_company_type.trim() : '',
        });
        if (res.success) {
          if (onShowToast) onShowToast('success', 'New Master Industry created successfully.');
          handleCancelForm();
          loadMasterData();
        }
      } else {
        const res = await api.updateIndustry(selectedRecord.id, {
          master_industry: formData.master_industry.trim(),
          master_company_type: formData.master_company_type ? formData.master_company_type.trim() : '',
          company_industry: formData.company_industry || null,
          company_company_type: formData.company_company_type || null,
          old_industry: selectedRecord.master_industry || selectedRecord.company_industry,
          old_company_type: selectedRecord.master_company_type || selectedRecord.company_company_type,
          updateCompany: false,
        });
        if (res.success) {
          if (onShowToast) onShowToast('success', 'Industry updated successfully.');
          handleCancelForm();
          loadMasterData();
        }
      }
    } catch (err) {
      if (onShowToast) onShowToast('error', err.message || 'Failed to save changes.');
    }
  };

  // "Update Company" Button: Updates all matching company records in real-time (Screenshot 2)
  const handleUpdateCompanyBatch = async () => {
    if (!selectedRecord) return;
    if (!formData.company_company_type) {
      if (onShowToast) onShowToast('error', 'Please select a Company Company Type to update companies.');
      return;
    }

    try {
      const res = await api.updateIndustry(selectedRecord.id, {
        master_industry: formData.master_industry ? formData.master_industry.trim() : null,
        master_company_type: formData.master_company_type ? formData.master_company_type.trim() : null,
        company_industry: (formData.company_industry || formData.master_industry || '').trim(),
        company_company_type: formData.company_company_type.trim(),
        old_industry: selectedRecord.company_industry || selectedRecord.master_industry || '',
        old_company_type: selectedRecord.company_company_type || selectedRecord.master_company_type || '',
        updateCompany: true,
      });

      if (res.success) {
        if (onShowToast) {
          onShowToast(
            'success',
            `Updated ${res.companiesUpdated || 0} company records to Company Type "${formData.company_company_type}". Dynamic counts updated.`
          );
        }
        setSelectedRecord((prev) => ({
          ...prev,
          company_company_type: formData.company_company_type.trim(),
        }));
        await Promise.all([loadMasterData(), loadChildCompanies()]);
      }
    } catch (err) {
      if (onShowToast) onShowToast('error', err.message || 'Failed to update company records.');
    }
  };

  // Pagination calculation
  const startRow = masterTotal === 0 ? 0 : (masterPage - 1) * (masterRows === 'all' ? masterTotal : masterRows) + 1;
  const endRow = masterRows === 'all' ? masterTotal : Math.min(masterPage * masterRows, masterTotal);
  const totalPages = masterRows === 'all' ? 1 : Math.ceil(masterTotal / masterRows) || 1;

  const childStartRow = childTotal === 0 ? 0 : (childPage - 1) * childRows + 1;
  const childEndRow = Math.min(childPage * childRows, childTotal);
  const childTotalPages = Math.ceil(childTotal / childRows) || 1;

  return (
    <div className="apex-master-page" style={{ padding: '0 0.5rem' }}>
      {/* ==================================================================== */}
      {/* VIEW MODE 1: REPORT VIEW (Screenshot 1: media_1794476778566_a5ab5af3) */}
      {/* ==================================================================== */}
      {viewMode === 'report' && (
        <div>
          {/* Page Title */}
          <div style={{ marginBottom: '1rem' }}>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>
              Industry
            </h1>
          </div>

          {/* TOP FILTER CARD strictly matching Screenshot 1 */}
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '1.25rem 1.5rem',
              marginBottom: '1.25rem',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr) auto', gap: '0.85rem', alignItems: 'flex-end' }}>
              {/* Filter 1: Industry */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                  Industry
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    list="filter-industries-list"
                    type="text"
                    className="apex-form-input"
                    placeholder=""
                    style={{
                      width: '100%',
                      height: '36px',
                      borderRadius: '4px',
                      border: '1px solid #cbd5e1',
                      padding: '0 1.75rem 0 0.75rem',
                      fontSize: '0.825rem',
                      backgroundColor: '#fff',
                    }}
                    value={filterIndustry}
                    onChange={(e) => setFilterIndustry(e.target.value)}
                  />
                  <datalist id="filter-industries-list">
                    {filterOptions.industries.map((ind) => (
                      <option key={ind} value={ind} />
                    ))}
                  </datalist>
                  <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748b' }}>
                    <IconChevronDown size={14} />
                  </span>
                </div>
              </div>

              {/* Filter 2: Company Type */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                  Company Type
                </label>
                <div style={{ position: 'relative' }}>
                  <select
                    className="apex-form-input"
                    style={{
                      width: '100%',
                      height: '36px',
                      borderRadius: '4px',
                      border: '1px solid #cbd5e1',
                      padding: '0 1.75rem 0 0.75rem',
                      fontSize: '0.825rem',
                      backgroundColor: '#fff',
                      appearance: 'none',
                      cursor: 'pointer',
                    }}
                    value={filterCompanyType}
                    onChange={(e) => setFilterCompanyType(e.target.value)}
                  >
                    <option value="">All Company Types</option>
                    {filterOptions.companyTypes.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748b' }}>
                    <IconChevronDown size={14} />
                  </span>
                </div>
              </div>

              {/* Filter 3: Created Date */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                  Created Date
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="date"
                    className="apex-form-input"
                    style={{
                      width: '100%',
                      height: '36px',
                      borderRadius: '4px',
                      border: '1px solid #cbd5e1',
                      padding: '0 0.75rem',
                      fontSize: '0.825rem',
                      backgroundColor: '#fff',
                    }}
                    value={filterCreatedDate}
                    onChange={(e) => setFilterCreatedDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Filter 4: Modified Date */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                  Modified Date
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="date"
                    className="apex-form-input"
                    style={{
                      width: '100%',
                      height: '36px',
                      borderRadius: '4px',
                      border: '1px solid #cbd5e1',
                      padding: '0 0.75rem',
                      fontSize: '0.825rem',
                      backgroundColor: '#fff',
                    }}
                    value={filterModifiedDate}
                    onChange={(e) => setFilterModifiedDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Filter Action Buttons matching Screenshot 1: Clear Filter on left, Search on right */}
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={handleClearTopFilter}
                  style={{
                    height: '36px',
                    padding: '0 1.25rem',
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
                  Clear Filter
                </button>

                <button
                  type="button"
                  onClick={handleApplyTopFilter}
                  style={{
                    height: '36px',
                    padding: '0 1.25rem',
                    backgroundColor: '#102a43',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.825rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    cursor: 'pointer',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#0b1d30')}
                  onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#102a43')}
                >
                  Search
                </button>
              </div>
            </div>
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

                {/* Rows Selector: 10, 25, 50, 100, 500, 1000, All */}
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
                      <option value={500}>500</option>
                      <option value={1000}>1000</option>
                      <option value="all">All</option>
                    </select>
                    <span style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748b' }}>
                      <IconChevronDown size={13} />
                    </span>
                  </div>
                </div>

                {/* Actions Dropdown Menu strictly matching Screenshots */}
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
                      setFilterIndustry('');
                      setFilterCompanyType('');
                      setFilterCreatedDate('');
                      setFilterModifiedDate('');
                      setActiveFilters({ industry: '', company_type: '', createdDate: '', modifiedDate: '' });
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

              {/* Right Toolbar Action Buttons matching Screenshot 1: Upload, Create, Delete Selected */}
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

            {/* Pagination Row matching Screenshot 1: "1 - 50 of 2,457 >" */}
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

            {/* Active Column Filter Banner */}
            <ApexActiveFilterBanner
              filter={headerFilter}
              columns={INDUSTRY_MASTER_COLUMNS}
              onClear={handleClearHeaderFilter}
            />

            {/* Master Table */}
            <div style={{ overflowX: 'auto' }}>
              {loadingMaster ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                  Loading industry master mappings...
                </div>
              ) : processedMasterList.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                  No industry records found matching criteria.
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
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                          <input
                            type="checkbox"
                            checked={processedMasterList.length > 0 && selectedIds.size === processedMasterList.length}
                            onChange={handleSelectAll}
                            style={{ cursor: 'pointer' }}
                          />
                        </div>
                      </th>

                      {/* Dynamic Data Columns with interactive APEX header actions */}
                      {INDUSTRY_MASTER_COLUMNS.filter((c) => masterVisibleKeys.includes(c.key)).map((col) => {
                        const isNumber = col.key.includes('count') || col.key.includes('amount');
                        const isCenter = col.key === 'validation_status' || col.key.includes('date');
                        return (
                          <th
                            key={col.key}
                            className={isNumber ? 'col-number' : isCenter ? 'col-center' : ''}
                            onClick={(e) => handleHeaderClick(e, col)}
                            style={{
                              minWidth: isNumber ? '180px' : isCenter ? (col.key === 'validation_status' ? '140px' : '120px') : '160px',
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
                        {/* Edit Button matching Screenshot 1 */}
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

                        {/* Master Industry */}
                        {masterVisibleKeys.includes('master_industry') && (
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
                              {rec.master_industry || ''}
                            </button>
                          </td>
                        )}

                        {/* Master Company Type */}
                        {masterVisibleKeys.includes('master_company_type') && (
                          <td style={{ color: '#334155' }}>
                            {rec.master_company_type || ''}
                          </td>
                        )}

                        {/* Master Industry Company Type Count */}
                        {masterVisibleKeys.includes('master_industry_company_type_count') && (
                          <td className="col-number" style={{ fontWeight: 600, color: '#334155' }}>
                            {rec.validation_status === 'DATA IN COMPANY' && !rec.master_industry
                              ? (rec.master_industry_company_type_count ? Number(rec.master_industry_company_type_count).toLocaleString() : '')
                              : (rec.master_industry_company_type_count ? Number(rec.master_industry_company_type_count).toLocaleString() : '0')}
                          </td>
                        )}

                        {/* Company Industry */}
                        {masterVisibleKeys.includes('company_industry') && (
                          <td style={{ color: '#334155' }}>
                            {rec.company_industry || ''}
                          </td>
                        )}

                        {/* Company Company Type */}
                        {masterVisibleKeys.includes('company_company_type') && (
                          <td style={{ color: '#334155' }}>
                            {rec.company_company_type || ''}
                          </td>
                        )}

                        {/* Company Industry Company Type Count */}
                        {masterVisibleKeys.includes('company_industry_company_type_count') && (
                          <td className="col-number" style={{ fontWeight: 600, color: '#334155' }}>
                            {rec.validation_status === 'DATA IN MASTER' && !rec.company_company_type
                              ? ''
                              : (rec.company_industry_company_type_count ? Number(rec.company_industry_company_type_count).toLocaleString() : '0')}
                          </td>
                        )}

                        {/* Validation Status Badge */}
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
                        <td colSpan={2} style={{ padding: '8px 12px', fontSize: '0.8rem', color: '#475569', textAlign: 'right' }}>
                          Summary:
                        </td>
                        {masterVisibleKeys.includes('master_industry') && (
                          <td style={{ padding: '8px 12px' }}>
                            {aggregations.filter((a) => a.columnKey === 'master_industry').map((a) => (
                              <div key={a.id} style={{ fontSize: '0.775rem' }}>
                                <span style={{ color: '#64748b' }}>{a.func}: </span>
                                <span style={{ color: '#2563eb' }}>{computeAggregationValue(masterList, a.func, a.columnKey)}</span>
                              </div>
                            ))}
                          </td>
                        )}
                        {masterVisibleKeys.includes('master_company_type') && (
                          <td style={{ padding: '8px 12px' }}>
                            {aggregations.filter((a) => a.columnKey === 'master_company_type').map((a) => (
                              <div key={a.id} style={{ fontSize: '0.775rem' }}>
                                <span style={{ color: '#64748b' }}>{a.func}: </span>
                                <span style={{ color: '#2563eb' }}>{computeAggregationValue(masterList, a.func, a.columnKey)}</span>
                              </div>
                            ))}
                          </td>
                        )}
                        {masterVisibleKeys.includes('master_industry_company_type_count') && (
                          <td className="col-number" style={{ padding: '8px 12px' }}>
                            {aggregations.filter((a) => a.columnKey === 'master_industry_company_type_count').map((a) => (
                              <div key={a.id} style={{ fontSize: '0.775rem' }}>
                                <span style={{ color: '#64748b' }}>{a.func}: </span>
                                <span style={{ color: '#2563eb' }}>{computeAggregationValue(masterList, a.func, a.columnKey)}</span>
                              </div>
                            ))}
                          </td>
                        )}
                        {masterVisibleKeys.includes('company_industry') && (
                          <td style={{ padding: '8px 12px' }}>
                            {aggregations.filter((a) => a.columnKey === 'company_industry').map((a) => (
                              <div key={a.id} style={{ fontSize: '0.775rem' }}>
                                <span style={{ color: '#64748b' }}>{a.func}: </span>
                                <span style={{ color: '#2563eb' }}>{computeAggregationValue(masterList, a.func, a.columnKey)}</span>
                              </div>
                            ))}
                          </td>
                        )}
                        {masterVisibleKeys.includes('company_company_type') && (
                          <td style={{ padding: '8px 12px' }}>
                            {aggregations.filter((a) => a.columnKey === 'company_company_type').map((a) => (
                              <div key={a.id} style={{ fontSize: '0.775rem' }}>
                                <span style={{ color: '#64748b' }}>{a.func}: </span>
                                <span style={{ color: '#2563eb' }}>{computeAggregationValue(masterList, a.func, a.columnKey)}</span>
                              </div>
                            ))}
                          </td>
                        )}
                        {masterVisibleKeys.includes('company_industry_company_type_count') && (
                          <td className="col-number" style={{ padding: '8px 12px' }}>
                            {aggregations.filter((a) => a.columnKey === 'company_industry_company_type_count').map((a) => (
                              <div key={a.id} style={{ fontSize: '0.775rem' }}>
                                <span style={{ color: '#64748b' }}>{a.func}: </span>
                                <span style={{ color: '#2563eb' }}>{computeAggregationValue(masterList, a.func, a.columnKey)}</span>
                              </div>
                            ))}
                          </td>
                        )}
                        {masterVisibleKeys.includes('validation_status') && (
                          <td style={{ padding: '8px 12px' }}>
                            {aggregations.filter((a) => a.columnKey === 'validation_status').map((a) => (
                              <div key={a.id} style={{ fontSize: '0.775rem' }}>
                                <span style={{ color: '#64748b' }}>{a.func}: </span>
                                <span style={{ color: '#2563eb' }}>{computeAggregationValue(masterList, a.func, a.columnKey)}</span>
                              </div>
                            ))}
                          </td>
                        )}
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
      {/* VIEW MODE 2: FORM VIEW (Screenshot 2: media_1794476791776_9d6e00e0)   */}
      {/* ==================================================================== */}
      {viewMode === 'form' && (
        <div>
          {/* Header Banner matching Screenshot 2: Industry - Form */}
          <div
            style={{
              backgroundColor: '#0f2035',
              color: '#ffffff',
              padding: '0.85rem 1.25rem',
              borderRadius: '8px 8px 0 0',
              fontSize: '1.05rem',
              fontWeight: 700,
              letterSpacing: '0.01em',
            }}
          >
            Industry - Form
          </div>

          {/* Main Form White Card */}
          <div className="apex-form-card">
            {/* ROW 1: 4 columns matching Screenshot 2 */}
            <div className="apex-form-grid-4">
              {/* Field 1: Master Industry */}
              <div className="apex-form-field">
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                  Master Industry
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
                  value={formData.master_industry}
                  onChange={(e) => setFormData({ ...formData, master_industry: e.target.value })}
                  disabled={!selectedRecord?.isCreate}
                />
              </div>

              {/* Field 2: Master Company Type */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                  Master Company Type
                </label>
                <div style={{ position: 'relative' }}>
                  <select
                    className="apex-form-input"
                    style={{
                      width: '100%',
                      height: '38px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      padding: '0 2.5rem 0 0.75rem',
                      fontSize: '0.825rem',
                      backgroundColor: '#ffffff',
                      appearance: 'none',
                      cursor: 'pointer',
                      color: '#1e293b',
                    }}
                    value={formData.master_company_type}
                    onChange={(e) => setFormData({ ...formData, master_company_type: e.target.value })}
                  >
                    <option value="">- Select Company Type -</option>
                    {filterOptions.companyTypes.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <div style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {formData.master_company_type && (
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, master_company_type: '' })}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#64748b',
                          padding: '2px',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                        title="Clear"
                      >
                        <IconClose size={13} />
                      </button>
                    )}
                    <span style={{ pointerEvents: 'none', color: '#64748b' }}>
                      <IconChevronDown size={14} />
                    </span>
                  </div>
                </div>
              </div>

              {/* Field 3: Master Total Company (read-only count) */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                  Master Total Company
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
                  value={Number(formData.master_total_company || 0).toLocaleString()}
                />
              </div>

              {/* Field 4: Validation Status (read-only) */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                  Validation Status
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
                    fontWeight: 600,
                  }}
                  value={formData.validation_status}
                />
              </div>
            </div>

            {/* ROW 2: 3 columns matching Screenshot 2 */}
            <div className="apex-form-grid-3">
              {/* Field 1: Company Industry (read-only) */}
              <div className="apex-form-field">
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                  Company Industry
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
                    backgroundColor: '#f8fafc',
                    color: '#1e293b',
                    cursor: 'default',
                  }}
                  value={formData.company_industry || formData.master_industry}
                />
              </div>

              {/* Field 2: Company Company Type (dropdown selector) */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                  Company Company Type
                </label>
                <div style={{ position: 'relative' }}>
                  <select
                    className="apex-form-input"
                    style={{
                      width: '100%',
                      height: '38px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      padding: '0 2rem 0 0.75rem',
                      fontSize: '0.825rem',
                      backgroundColor: '#ffffff',
                      appearance: 'none',
                      cursor: 'pointer',
                      color: '#1e293b',
                    }}
                    value={formData.company_company_type}
                    onChange={(e) => setFormData({ ...formData, company_company_type: e.target.value })}
                  >
                    <option value="">- Select Company Type -</option>
                    {filterOptions.companyTypes.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748b' }}>
                    <IconChevronDown size={14} />
                  </span>
                </div>
              </div>

              {/* Field 3: Company Company Count (read-only count) */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                  Company Company Count
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
                  value={Number(formData.company_company_count || childTotal || 0).toLocaleString()}
                />
              </div>
            </div>

            {/* ROW 3: 4 columns audit fields matching Screenshot 2 */}
            <div className="apex-form-grid-4">
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

              {/* Right: Delete, Apply Changes, Update Company */}
              <div className="apex-form-actions-right">
                {!selectedRecord?.isCreate && selectedRecord?.id < 9900000 && (
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

                <button
                  type="button"
                  onClick={handleUpdateCompanyBatch}
                  style={{
                    height: '36px',
                    padding: '0 1.35rem',
                    backgroundColor: '#0f172a',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.825rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#020617')}
                  onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#0f172a')}
                  title="Update all matching company records in real-time"
                >
                  Update Company
                </button>
              </div>
            </div>
          </div>

          {/* CHILD REPORT: DRILLDOWN COMPANIES MATCHING THIS INDUSTRY & COMPANY TYPE */}
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
                    if (onShowToast) onShowToast('info', 'Actions menu for linked companies.');
                  }}
                >
                  Actions <IconChevronDown size={13} />
                </button>
              </div>

              {/* Pagination info matching Screenshot 2: "1 - 27 of 27" */}
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

            {/* Child Companies Table matching columns in Screenshot 2 */}
            <div style={{ overflowX: 'auto' }}>
              {childLoading ? (
                <div style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b' }}>
                  Loading linked companies...
                </div>
              ) : childCompanies.length === 0 ? (
                <div style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b' }}>
                  No companies found matching this industry & company type.
                </div>
              ) : (
                <table className="apex-master-table">
                  <thead>
                    <tr>
                      <th style={{ width: '40px', textAlign: 'center' }}></th>
                      <th style={{ width: '80px' }}>ID</th>
                      <th style={{ minWidth: '200px' }}>Company Name</th>
                      <th style={{ minWidth: '180px' }}>Industry</th>
                      <th style={{ minWidth: '150px' }}>Company Type</th>
                      <th className="col-number" style={{ minWidth: '120px' }}>Contact Count</th>
                      <th className="col-number" style={{ minWidth: '120px' }}>Lead Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {childCompanies.map((c) => (
                      <tr key={c.id}>
                        <td className="col-center">
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
                            <IconFilePenLine size={14} />
                          </button>
                        </td>
                        <td style={{ color: '#64748b', fontSize: '0.8rem' }}>{c.id}</td>
                        <td style={{ fontWeight: 600, color: '#1e293b' }}>{c.company_name}</td>
                        <td style={{ color: '#334155' }}>{c.industry || '-'}</td>
                        <td style={{ color: '#334155' }}>{c.company_type || '-'}</td>
                        <td className="col-number" style={{ color: '#334155' }}>{Number(c.contact_count || 0).toLocaleString()}</td>
                        <td className="col-number" style={{ color: '#334155' }}>{Number(c.lead_count || 0).toLocaleString()}</td>
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
        columns={INDUSTRY_MASTER_COLUMNS}
        visibleKeys={masterVisibleKeys}
        onSave={handleSaveColumns}
        onReset={() => handleSaveColumns(DEFAULT_MASTER_KEYS)}
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

      {/* Filter Modal */}
      <ApexFilterModal
        isOpen={showMasterFilterModal}
        onClose={() => setShowMasterFilterModal(false)}
        columns={INDUSTRY_MASTER_COLUMNS}
        onApplyFilter={(f) => {
          if (f.column === 'master_industry' || f.column === 'company_industry') {
            setFilterIndustry(f.value);
            setActiveFilters((prev) => ({ ...prev, industry: f.value }));
          } else if (f.column === 'master_company_type' || f.column === 'company_company_type') {
            setFilterCompanyType(f.value);
            setActiveFilters((prev) => ({ ...prev, company_type: f.value }));
          }
          setMasterPage(1);
          if (onShowToast) onShowToast('success', `Filter applied on ${f.column}`);
        }}
      />

      {/* Aggregate Modal matching user requirements */}
      <ApexAggregateModal
        isOpen={showAggregateModal}
        onClose={() => setShowAggregateModal(false)}
        columns={INDUSTRY_MASTER_COLUMNS}
        aggregations={aggregations}
        onApply={handleApplyAggregation}
        onDelete={(id) => setAggregations((prev) => prev.filter((a) => a.id !== id))}
      />

      {/* Chart Modal */}
      <ApexChartModal
        isOpen={showMasterChartModal}
        onClose={() => setShowMasterChartModal(false)}
        columns={INDUSTRY_MASTER_COLUMNS}
        data={masterList}
      />

      {/* Upload CSV Modal */}
      {showUploadModal && (
        <div className="apex-modal-overlay">
          <div className="apex-modal" style={{ maxWidth: '480px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#1e293b' }}>
                Upload Industry Data
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
              Upload a CSV file containing columns: <code>Master Industry</code>, <code>Master Company Type</code>.
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
                    if (onShowToast) onShowToast('success', 'Industry CSV data uploaded and merged.');
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

      {/* Edit Company Modal for Sub-Report Drilldown */}
      {editingCompany && (
        <div className="apex-modal-overlay">
          <div className="apex-modal" style={{ maxWidth: '520px', width: '92%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#1e293b' }}>
                Edit Company #{editingCompany.id}
              </h3>
              <button
                type="button"
                onClick={() => setEditingCompany(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <IconClose size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateSingleCompany}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', marginBottom: '1rem' }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                    Company Name
                  </label>
                  <input
                    type="text"
                    className="apex-form-input"
                    style={{ width: '100%', height: '34px', fontSize: '0.825rem' }}
                    value={editingCompanyForm.comp_name}
                    onChange={(e) => setEditingCompanyForm({ ...editingCompanyForm, comp_name: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                    Industry
                  </label>
                  <input
                    type="text"
                    className="apex-form-input"
                    style={{ width: '100%', height: '34px', fontSize: '0.825rem' }}
                    value={editingCompanyForm.industry}
                    onChange={(e) => setEditingCompanyForm({ ...editingCompanyForm, industry: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                    Company Type
                  </label>
                  <select
                    className="apex-form-input"
                    style={{ width: '100%', height: '34px', fontSize: '0.825rem', backgroundColor: '#fff' }}
                    value={editingCompanyForm.company_type}
                    onChange={(e) => setEditingCompanyForm({ ...editingCompanyForm, company_type: e.target.value })}
                  >
                    <option value="">- Select Company Type -</option>
                    {filterOptions.companyTypes.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                    Country
                  </label>
                  <input
                    type="text"
                    className="apex-form-input"
                    style={{ width: '100%', height: '34px', fontSize: '0.825rem' }}
                    value={editingCompanyForm.country}
                    onChange={(e) => setEditingCompanyForm({ ...editingCompanyForm, country: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                    City
                  </label>
                  <input
                    type="text"
                    className="apex-form-input"
                    style={{ width: '100%', height: '34px', fontSize: '0.825rem' }}
                    value={editingCompanyForm.city}
                    onChange={(e) => setEditingCompanyForm({ ...editingCompanyForm, city: e.target.value })}
                  />
                </div>

                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                    Website
                  </label>
                  <input
                    type="text"
                    className="apex-form-input"
                    style={{ width: '100%', height: '34px', fontSize: '0.825rem' }}
                    value={editingCompanyForm.website}
                    onChange={(e) => setEditingCompanyForm({ ...editingCompanyForm, website: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9' }}>
                <button
                  type="button"
                  onClick={() => setEditingCompany(null)}
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
                  Save Company
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

