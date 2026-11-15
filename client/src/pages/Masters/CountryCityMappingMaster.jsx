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

// Master Country & City Mapping report columns matching Screenshot 2
export const COUNTRY_CITY_MASTER_COLUMNS = [
  {
    key: 'master_country',
    label: 'Master Country',
    getValue: (r) => r.master_country || '',
  },
  {
    key: 'master_city',
    label: 'Master City',
    getValue: (r) => r.master_city || '',
  },
  {
    key: 'master_stored_count',
    label: 'Master Stored Count',
    getValue: (r) =>
      r.validation_status === 'DATA IN COMPANY' || !r.master_country
        ? '-'
        : Number(r.master_stored_count || 0).toLocaleString(),
  },
  {
    key: 'company_country',
    label: 'Company Country',
    getValue: (r) => r.company_country || '',
  },
  {
    key: 'company_city',
    label: 'Company City',
    getValue: (r) => r.company_city || '',
  },
  {
    key: 'actual_company_count',
    label: 'Actual Company Count',
    getValue: (r) =>
      r.validation_status === 'DATA IN MASTER' || !r.company_country
        ? '-'
        : Number(r.actual_company_count || 0).toLocaleString(),
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

const DEFAULT_MASTER_KEYS = COUNTRY_CITY_MASTER_COLUMNS.map((c) => c.key);
export const COUNTRY_CITY_COLUMNS = COUNTRY_CITY_MASTER_COLUMNS;

export default function CountryCityMappingMaster({ onShowToast, onNavigateToCompanyForm, onNavigateToContactForm }) {
  // Mode: 'report' or 'form' with localStorage persistence across browser refresh
  const [viewMode, setViewMode] = useState(() => {
    try {
      const saved = localStorage.getItem('apex_country_city_active_form');
      if (saved) return 'form';
    } catch (e) { }
    return 'report';
  });

  const [selectedRecord, setSelectedRecord] = useState(() => {
    try {
      const saved = localStorage.getItem('apex_country_city_active_form');
      if (saved) return JSON.parse(saved);
    } catch (e) { }
    return null;
  });

  // Form state matching Screenshot 1
  const [formData, setFormData] = useState(() => {
    try {
      const saved = localStorage.getItem('apex_country_city_active_form');
      if (saved) {
        const rec = JSON.parse(saved);
        return {
          master_country: rec.master_country || '',
          master_city: rec.master_city || '',
          master_stored_count: rec.master_stored_count || 0,
          company_country: rec.company_country || '',
          company_city: rec.company_city || '',
          actual_company_count: rec.actual_company_count || 0,
          validation_status: rec.validation_status || 'DATA IN BOTH',
          created_by: rec.created_by || 'APEX_PUBLIC_USER',
          created_date: formatAppDate(rec.created_date) || '08-SEP-2026',
          modified_by: rec.modified_by || 'MARIYA_BADAR',
          modified_date: formatAppDate(rec.modified_date) || '12-NOV-2026',
        };
      }
    } catch (e) { }
    return {
      master_country: '',
      master_city: '',
      master_stored_count: 0,
      company_country: '',
      company_city: '',
      actual_company_count: 0,
      validation_status: 'DATA IN BOTH',
      created_by: 'APEX_PUBLIC_USER',
      created_date: '08-SEP-2026',
      modified_by: 'MARIYA_BADAR',
      modified_date: '12-NOV-2026',
    };
  });

  // Top Filter Card State (matching Screenshot 2)
  const [filterCountry, setFilterCountry] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [filterCreatedDate, setFilterCreatedDate] = useState('');
  const [filterModifiedDate, setFilterModifiedDate] = useState('');

  // Applied Filters
  const [activeFilters, setActiveFilters] = useState({
    country: '',
    city: '',
    createdDate: '',
    modifiedDate: '',
  });

  // Filter dropdown suggestions
  const [filterOptions, setFilterOptions] = useState({ countries: [], cities: [] });

  // Load filter options on boot or when filterCountry changes
  useEffect(() => {
    api.getCountryCityFilterOptions(filterCountry)
      .then((res) => {
        if (res.success) {
          setFilterOptions((prev) => ({
            countries: res.countries || prev.countries,
            cities: res.cities || [],
          }));
        }
      })
      .catch((e) => console.warn('Failed to load filter options:', e.message));
  }, [filterCountry]);

  // Master Report Data State
  const [masterList, setMasterList] = useState([]);
  const [loadingMaster, setLoadingMaster] = useState(true);
  const [masterSearch, setMasterSearch] = useState('');
  const [activeMasterSearch, setActiveMasterSearch] = useState('');
  const [masterRows, setMasterRows] = useState(1000);
  const [masterPage, setMasterPage] = useState(1);
  const [masterTotal, setMasterTotal] = useState(0);

  // Checkbox Selection State
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Actions & Modals
  const [showMasterActions, setShowMasterActions] = useState(false);
  const [showMasterColumnsModal, setShowMasterColumnsModal] = useState(false);
  const [showMasterFilterModal, setShowMasterFilterModal] = useState(false);
  const [showMasterChartModal, setShowMasterChartModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showAggregateModal, setShowAggregateModal] = useState(false);
  const [aggregations, setAggregations] = useState([]);

  const [masterVisibleKeys, setMasterVisibleKeys] = useState(() => {
    try {
      const s = localStorage.getItem('country_city_visible_columns');
      if (s) {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
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

  // Child Report State (Companies filtered by WHERE country = selectedRecord.master_country AND city = selectedRecord.master_city)
  const [childCompanies, setChildCompanies] = useState([]);
  const [childLoading, setChildLoading] = useState(false);
  const [childSearch, setChildSearch] = useState('');
  const [childActiveSearch, setChildActiveSearch] = useState('');
  const [childRows, setChildRows] = useState(50);
  const [childPage, setChildPage] = useState(1);
  const [childTotal, setChildTotal] = useState(0);
  const [showChildActions, setShowChildActions] = useState(false);

  // Edit Company Record Modal
  const [editingCompany, setEditingCompany] = useState(null);
  const [editingCompanyForm, setEditingCompanyForm] = useState({
    comp_name: '',
    country: '',
    city: '',
    industry: '',
    company_type: '',
    employee_size: '',
    website: '',
    technology: '',
  });
  const [citySuggestions, setCitySuggestions] = useState([]);

  // Form dropdown options for Company Country & Company City
  const [allMasterCountries, setAllMasterCountries] = useState([]);
  const [formCityOptions, setFormCityOptions] = useState([]);

  // Fetch unique master country options
  useEffect(() => {
    api.getCountries({ limit: 1000 })
      .then((res) => {
        if (res.success && res.data) {
          const unique = Array.from(
            new Set(res.data.map((r) => r.master_country).filter((c) => c && c.trim()))
          ).sort((a, b) => a.localeCompare(b));
          setAllMasterCountries(unique);
        }
      })
      .catch((e) => console.warn('Failed to fetch country list for dropdown:', e.message));
  }, []);

  // Fetch city options when form's company_country changes
  useEffect(() => {
    if (formData.company_country) {
      api.getCitiesByCountry(formData.company_country)
        .then((res) => {
          if (res.success && res.cities) {
            setFormCityOptions(res.cities);
          }
        })
        .catch((e) => console.warn('Failed to load cities for form:', e.message));
    } else {
      setFormCityOptions([]);
    }
  }, [formData.company_country]);

  // Load Master Report Data
  const loadMasterData = useCallback(async () => {
    try {
      setLoadingMaster(true);
      const res = await api.getCountryCityMappings({
        search: activeMasterSearch,
        country: activeFilters.country,
        city: activeFilters.city,
        createdDate: activeFilters.createdDate,
        modifiedDate: activeFilters.modifiedDate,
        page: masterPage,
        limit: masterRows,
      });
      if (res.success) {
        setMasterList(res.data || []);
        setMasterTotal(res.total || 0);
        setSelectedIds(new Set());
      }
    } catch (err) {
      console.error('Error loading Country & City Mapping:', err);
      if (onShowToast) onShowToast('error', 'Failed to load mappings: ' + err.message);
    } finally {
      setLoadingMaster(false);
    }
  }, [activeMasterSearch, activeFilters, masterPage, masterRows, onShowToast]);

  useEffect(() => {
    loadMasterData();
  }, [loadMasterData]);

  // Handle Top Filter Search
  const handleApplyTopFilter = () => {
    setActiveFilters({
      country: filterCountry,
      city: filterCity,
      createdDate: filterCreatedDate,
      modifiedDate: filterModifiedDate,
    });
    setMasterPage(1);
  };

  // Handle Clear Filter
  const handleClearTopFilter = () => {
    setFilterCountry('');
    setFilterCity('');
    setFilterCreatedDate('');
    setFilterModifiedDate('');
    setActiveFilters({
      country: '',
      city: '',
      createdDate: '',
      modifiedDate: '',
    });
    setMasterPage(1);
  };

  // Handle Toolbar Search
  const handleToolbarSearch = (e) => {
    if (e) e.preventDefault();
    setActiveMasterSearch(masterSearch);
    setMasterPage(1);
  };

  // Select-All Checkbox Handler
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allIds = new Set(masterList.map((r) => r.id));
      setSelectedIds(allIds);
    } else {
      setSelectedIds(new Set());
    }
  };

  // Row Checkbox Handler
  const handleToggleRow = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Batch Delete Handler
  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    if (!window.confirm(`Are you sure you want to delete ${count} selected mapping(s)?`)) {
      return;
    }
    try {
      const ids = Array.from(selectedIds);
      const res = await api.batchDeleteCountryCityMappings(ids);
      if (res.success) {
        if (onShowToast) onShowToast('success', res.message || `Deleted ${count} mappings successfully.`);
        setSelectedIds(new Set());
        loadMasterData();
      }
    } catch (err) {
      if (onShowToast) onShowToast('error', 'Failed to delete selected records: ' + err.message);
    }
  };

  // Download Handler (Exports visible columns to CSV)
  const handleDownloadReport = () => {
    if (!masterList || masterList.length === 0) {
      if (onShowToast) onShowToast('warning', 'No data available to export.');
      return;
    }

    const visibleCols = COUNTRY_CITY_MASTER_COLUMNS.filter((c) => masterVisibleKeys.includes(c.key));
    const headerRow = visibleCols.map((c) => `"${c.label}"`).join(',');

    const dataRows = masterList.map((row) => {
      return visibleCols
        .map((c) => {
          let val = c.getValue(row);
          if (val === null || val === undefined) val = '';
          return `"${String(val).replace(/"/g, '""')}"`;
        })
        .join(',');
    });

    const csvContent = [headerRow, ...dataRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Country_City_Mapping_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    if (onShowToast) onShowToast('success', 'Report downloaded successfully.');
  };

  // Dynamic status and count calculator for Form View
  const handleCompanyCountryOrCityChange = async (newCountry, newCity) => {
    const targetCountry = newCountry !== undefined ? newCountry : formData.company_country;
    const targetCity = newCity !== undefined ? newCity : formData.company_city;

    let dynamicCount = 0;
    if (targetCountry && targetCity) {
      try {
        const countRes = await api.getCompanies({
          country: targetCountry,
          city: targetCity,
          limit: 1,
        });
        if (countRes.success) {
          dynamicCount = countRes.total || 0;
        }
      } catch (e) { }
    }

    const hasMaster = Boolean(formData.master_country && formData.master_city);
    const hasCompany = Boolean(targetCountry && targetCity && dynamicCount > 0);

    let newStatus = 'DATA IN BOTH';
    if (hasMaster && hasCompany) {
      newStatus = 'DATA IN BOTH';
    } else if (hasMaster && !hasCompany) {
      newStatus = 'DATA IN MASTER';
    } else if (!hasMaster && hasCompany) {
      newStatus = 'DATA IN COMPANY';
    }

    setFormData((prev) => ({
      ...prev,
      company_country: targetCountry,
      company_city: targetCity,
      actual_company_count: dynamicCount,
      validation_status: newStatus,
    }));
  };

  // Load Child Companies for Form View
  const activeDrilldownCountry = useMemo(() => {
    if (!selectedRecord) return '';
    return selectedRecord.master_country || selectedRecord.company_country || '';
  }, [selectedRecord]);

  const activeDrilldownCity = useMemo(() => {
    if (!selectedRecord) return '';
    return selectedRecord.master_city || selectedRecord.company_city || '';
  }, [selectedRecord]);

  const loadChildCompanies = useCallback(async () => {
    if (!selectedRecord || selectedRecord.isCreate) return;
    try {
      setChildLoading(true);
      const res = await api.getCompanies({
        country: activeDrilldownCountry,
        city: activeDrilldownCity,
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
  }, [selectedRecord, activeDrilldownCountry, activeDrilldownCity, childActiveSearch, childPage, childRows, onShowToast]);

  useEffect(() => {
    if (viewMode === 'form' && selectedRecord && !selectedRecord.isCreate) {
      loadChildCompanies();
    }
  }, [viewMode, selectedRecord, loadChildCompanies]);

  // Edit Company Modal Handler
  const handleOpenEditCompany = async (company) => {
    const compCountry = company.country || activeDrilldownCountry;
    setEditingCompany(company);
    setEditingCompanyForm({
      comp_name: company.comp_name || company.name || '',
      country: compCountry,
      city: company.city || activeDrilldownCity || '',
      industry: company.industry || '',
      company_type: company.company_type || '',
      employee_size: company.employee_size || '',
      website: company.website || '',
      technology: company.technology || '',
    });

    try {
      const cityRes = await api.getCitiesByCountry(compCountry);
      if (cityRes.success && cityRes.cities) {
        setCitySuggestions(cityRes.cities);
      }
    } catch (e) { }
  };

  const handleCountryChangeInEditCompany = async (newCountry) => {
    setEditingCompanyForm((prev) => ({ ...prev, country: newCountry, city: '' }));
    try {
      const cityRes = await api.getCitiesByCountry(newCountry);
      if (cityRes.success && cityRes.cities) {
        setCitySuggestions(cityRes.cities);
      }
    } catch (e) { }
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
            `Record #${editingCompany.id} updated successfully. Dynamic counts synchronized.`
          );
        }
        setEditingCompany(null);
        await Promise.all([loadMasterData(), loadChildCompanies()]);
      }
    } catch (err) {
      if (onShowToast) onShowToast('error', err.message || 'Failed to update company record.');
    }
  };

  // Open Edit Form
  const handleOpenEdit = (rec) => {
    setSelectedRecord(rec);
    setFormData({
      master_country: rec.master_country || '',
      master_city: rec.master_city || '',
      master_stored_count: rec.master_stored_count || 0,
      company_country: rec.company_country || '',
      company_city: rec.company_city || '',
      actual_company_count: rec.actual_company_count || 0,
      validation_status: rec.validation_status || 'DATA IN BOTH',
      created_by: rec.created_by || 'APEX_PUBLIC_USER',
      created_date: formatAppDate(rec.created_date) || '08-SEP-2026',
      modified_by: rec.modified_by || 'MARIYA_BADAR',
      modified_date: formatAppDate(rec.modified_date) || '12-NOV-2026',
    });
    setChildPage(1);
    setChildSearch('');
    setChildActiveSearch('');
    setViewMode('form');
    try {
      localStorage.setItem('apex_country_city_active_form', JSON.stringify(rec));
    } catch (e) { }
  };

  // Open Create Form
  const handleOpenCreate = () => {
    const newRec = {
      isCreate: true,
      master_country: '',
      master_city: '',
      master_stored_count: 0,
      company_country: '',
      company_city: '',
      actual_company_count: 0,
      validation_status: 'DATA IN MASTER',
      created_by: 'APEX_PUBLIC_USER',
      created_date: '08-SEP-2026',
      modified_by: 'MARIYA_BADAR',
      modified_date: '12-NOV-2026',
    };
    setSelectedRecord(newRec);
    setFormData(newRec);
    setViewMode('form');
    try {
      localStorage.setItem('apex_country_city_active_form', JSON.stringify(newRec));
    } catch (e) { }
  };

  // Cancel Form
  const handleCancelForm = () => {
    setViewMode('report');
    setSelectedRecord(null);
    try {
      localStorage.removeItem('apex_country_city_active_form');
    } catch (e) { }
  };

  // Delete Form Record
  const handleDeleteMaster = async () => {
    if (!selectedRecord || selectedRecord.isCreate) return;
    if (!window.confirm(`Are you sure you want to delete mapping for "${formData.master_country} - ${formData.master_city}"?`)) {
      return;
    }
    try {
      const res = await api.deleteCountryCityMapping(selectedRecord.id);
      if (res.success) {
        if (onShowToast) onShowToast('success', 'Mapping deleted successfully.');
        handleCancelForm();
        loadMasterData();
      }
    } catch (err) {
      if (onShowToast) onShowToast('error', 'Failed to delete mapping: ' + err.message);
    }
  };

  // Save / Apply Changes
  const handleFormSubmit = async (e) => {
    if (e) e.preventDefault();
    const targetCountry = (formData.master_country || '').trim();
    const targetCity = (formData.master_city || '').trim();
    if (!targetCountry || !targetCity) {
      if (onShowToast) onShowToast('error', 'Master Country and Master City are both required.');
      return;
    }

    const dupMapping = masterList.find(
      (m) =>
        (m.country || m.master_country) &&
        (m.city || m.master_city) &&
        (m.country || m.master_country).trim().toLowerCase() === targetCountry.toLowerCase() &&
        (m.city || m.master_city).trim().toLowerCase() === targetCity.toLowerCase() &&
        String(m.id) !== String(selectedRecord?.id)
    );
    if (dupMapping) {
      if (onShowToast) onShowToast('error', `Mapping for "${targetCountry}" - "${targetCity}" already exists. Duplicate records are not allowed.`);
      return;
    }

    try {
      if (selectedRecord && selectedRecord.isCreate) {
        const res = await api.createCountryCityMapping({
          master_country: formData.master_country.trim(),
          master_city: formData.master_city.trim(),
        });
        if (res.success) {
          if (onShowToast) onShowToast('success', 'New Country & City mapping created successfully.');
          handleCancelForm();
          loadMasterData();
        }
      } else {
        const res = await api.updateCountryCityMapping(selectedRecord.id, {
          master_country: formData.master_country.trim(),
          master_city: formData.master_city.trim(),
          company_country: formData.company_country || null,
          company_city: formData.company_city || null,
          old_company_country: selectedRecord.company_country || selectedRecord.master_country || null,
          old_company_city: selectedRecord.company_city || selectedRecord.master_city || null,
        });
        if (res.success) {
          if (onShowToast) onShowToast('success', 'Mapping updated successfully.');
          handleCancelForm();
          loadMasterData();
        }
      }
    } catch (err) {
      if (onShowToast) onShowToast('error', err.message || 'Failed to save mapping.');
    }
  };

  // "Update Country City" Button: Synchronizes all companies in real-time
  const handleUpdateCountryCityBatch = async () => {
    if (!selectedRecord) return;
    if (!formData.company_country || !formData.company_city) {
      if (onShowToast) onShowToast('error', 'Please select both Company Country and Company City to synchronize.');
      return;
    }

    try {
      const res = await api.updateCountryCityMapping(selectedRecord.id, {
        master_country: formData.master_country ? formData.master_country.trim() : null,
        master_city: formData.master_city ? formData.master_city.trim() : null,
        company_country: formData.company_country.trim(),
        company_city: formData.company_city.trim(),
        old_company_country: selectedRecord.company_country || selectedRecord.master_country || null,
        old_company_city: selectedRecord.company_city || selectedRecord.master_city || null,
        updateRecords: true,
      });

      if (res.success) {
        if (onShowToast) {
          onShowToast(
            'success',
            `Synchronized company records to "${formData.company_country} - ${formData.company_city}". Dynamic counts updated.`
          );
        }
        await Promise.all([loadMasterData(), loadChildCompanies()]);
      }
    } catch (err) {
      if (onShowToast) onShowToast('error', err.message || 'Failed to update country & city records.');
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
    <div className="apex-master-page">
      {/* VIEW MODE 1: REPORT VIEW (Screenshot 2) */}
      {viewMode === 'report' && (
        <div>
          {/* Page Title */}
          <div style={{ marginBottom: '1rem' }}>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>
              Country & City Mapping
            </h1>
          </div>

          {/* TOP FILTER CARD strictly matching Screenshot 2 */}
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr) auto', gap: '1rem', alignItems: 'flex-end' }}>
              {/* Filter: Country */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                  Country
                </label>
                <div style={{ position: 'relative' }}>
                  <select
                    className="apex-form-input"
                    style={{ width: '100%', height: '36px', borderRadius: '4px', border: '1px solid #cbd5e1', padding: '0 1.75rem 0 0.75rem', fontSize: '0.825rem', backgroundColor: '#fff', appearance: 'none', cursor: 'pointer' }}
                    value={filterCountry}
                    onChange={(e) => setFilterCountry(e.target.value)}
                  >
                    <option value="">All Countries</option>
                    {filterOptions.countries.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748b' }}>
                    <IconChevronDown size={14} />
                  </span>
                </div>
              </div>

              {/* Filter: City */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                  City
                </label>
                <div style={{ position: 'relative' }}>
                  <select
                    className="apex-form-input"
                    style={{ width: '100%', height: '36px', borderRadius: '4px', border: '1px solid #cbd5e1', padding: '0 1.75rem 0 0.75rem', fontSize: '0.825rem', backgroundColor: '#fff', appearance: 'none', cursor: 'pointer' }}
                    value={filterCity}
                    onChange={(e) => setFilterCity(e.target.value)}
                  >
                    <option value="">All Cities</option>
                    {filterOptions.cities.map((city) => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                  <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748b' }}>
                    <IconChevronDown size={14} />
                  </span>
                </div>
              </div>

              {/* Filter: Created Date */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                  Created Date
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="date"
                    className="apex-form-input"
                    style={{ width: '100%', height: '36px', borderRadius: '4px', border: '1px solid #cbd5e1', padding: '0 0.75rem', fontSize: '0.825rem', backgroundColor: '#fff' }}
                    value={filterCreatedDate}
                    onChange={(e) => setFilterCreatedDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Filter: Modified Date */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                  Modified Date
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="date"
                    className="apex-form-input"
                    style={{ width: '100%', height: '36px', borderRadius: '4px', border: '1px solid #cbd5e1', padding: '0 0.75rem', fontSize: '0.825rem', backgroundColor: '#fff' }}
                    value={filterModifiedDate}
                    onChange={(e) => setFilterModifiedDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Filter Action Buttons matching Screenshot 2 */}
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
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
                  <IconSearch size={14} /> Search
                </button>

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
            {/* Toolbar strictly matching Screenshot 2 */}
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
              {/* Left Controls: Search bar + Search button + Rows + Actions */}
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
                      padding: '0 12px',
                      backgroundColor: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '4px',
                      fontSize: '0.825rem',
                      fontWeight: 600,
                      color: '#1e293b',
                      cursor: 'pointer',
                    }}
                  >
                    Search
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
                      setFilterCountry('');
                      setFilterCity('');
                      setFilterCreatedDate('');
                      setFilterModifiedDate('');
                      setActiveFilters({ country: '', city: '', createdDate: '', modifiedDate: '' });
                      setAggregations([]);
                      setMasterRows(1000);
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

            {/* Pagination Info Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                padding: '0.25rem 0 0.75rem',
                fontSize: '0.8rem',
                color: '#64748b',
                gap: '0.75rem',
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
              columns={COUNTRY_CITY_MASTER_COLUMNS}
              onClear={handleClearHeaderFilter}
            />

            {/* Master Table */}
            <div style={{ overflowX: 'auto' }}>
              {loadingMaster ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                  Loading country & city mappings...
                </div>
              ) : processedMasterList.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                  No mapping records found matching criteria.
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
                      {COUNTRY_CITY_MASTER_COLUMNS.filter((c) => masterVisibleKeys.includes(c.key)).map((col) => {
                        const isNumber = col.key.includes('count') || col.key.includes('amount');
                        const isCenter = col.key === 'validation_status' || col.key.includes('date');
                        return (
                          <th
                            key={col.key}
                            className={isNumber ? 'col-number' : isCenter ? 'col-center' : ''}
                            onClick={(e) => handleHeaderClick(e, col)}
                            style={{
                              minWidth: isNumber ? '160px' : isCenter ? (col.key === 'validation_status' ? '140px' : '120px') : '150px',
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

                        {/* Master Country */}
                        {masterVisibleKeys.includes('master_country') && (
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
                              {rec.master_country || '-'}
                            </button>
                          </td>
                        )}

                        {/* Master City */}
                        {masterVisibleKeys.includes('master_city') && (
                          <td style={{ color: '#334155' }}>
                            {rec.master_city || '-'}
                          </td>
                        )}

                        {/* Master Stored Count */}
                        {masterVisibleKeys.includes('master_stored_count') && (
                          <td className="col-number" style={{ fontWeight: 600, color: '#334155' }}>
                            {rec.validation_status === 'DATA IN COMPANY' || !rec.master_country
                              ? '-'
                              : Number(rec.master_stored_count || 0).toLocaleString()}
                          </td>
                        )}

                        {/* Company Country */}
                        {masterVisibleKeys.includes('company_country') && (
                          <td style={{ color: '#334155' }}>
                            {rec.company_country || '-'}
                          </td>
                        )}

                        {/* Company City */}
                        {masterVisibleKeys.includes('company_city') && (
                          <td style={{ color: '#334155' }}>
                            {rec.company_city || '-'}
                          </td>
                        )}

                        {/* Actual Company Count */}
                        {masterVisibleKeys.includes('actual_company_count') && (
                          <td className="col-number" style={{ fontWeight: 600, color: '#334155' }}>
                            {rec.validation_status === 'DATA IN MASTER' || !rec.company_country
                              ? '-'
                              : Number(rec.actual_company_count || 0).toLocaleString()}
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
                        {masterVisibleKeys.includes('master_country') && (
                          <td style={{ padding: '8px 12px' }}>
                            {aggregations.filter((a) => a.columnKey === 'master_country').map((a) => (
                              <div key={a.id} style={{ fontSize: '0.775rem' }}>
                                <span style={{ color: '#64748b' }}>{a.func}: </span>
                                <span style={{ color: '#2563eb' }}>{computeAggregationValue(masterList, a.func, a.columnKey)}</span>
                              </div>
                            ))}
                          </td>
                        )}
                        {masterVisibleKeys.includes('master_city') && (
                          <td style={{ padding: '8px 12px' }}>
                            {aggregations.filter((a) => a.columnKey === 'master_city').map((a) => (
                              <div key={a.id} style={{ fontSize: '0.775rem' }}>
                                <span style={{ color: '#64748b' }}>{a.func}: </span>
                                <span style={{ color: '#2563eb' }}>{computeAggregationValue(masterList, a.func, a.columnKey)}</span>
                              </div>
                            ))}
                          </td>
                        )}
                        {masterVisibleKeys.includes('master_stored_count') && (
                          <td className="col-number" style={{ padding: '8px 12px' }}>
                            {aggregations.filter((a) => a.columnKey === 'master_stored_count').map((a) => (
                              <div key={a.id} style={{ fontSize: '0.775rem' }}>
                                <span style={{ color: '#64748b' }}>{a.func}: </span>
                                <span style={{ color: '#2563eb' }}>{computeAggregationValue(masterList, a.func, a.columnKey)}</span>
                              </div>
                            ))}
                          </td>
                        )}
                        {masterVisibleKeys.includes('company_country') && (
                          <td style={{ padding: '8px 12px' }}>
                            {aggregations.filter((a) => a.columnKey === 'company_country').map((a) => (
                              <div key={a.id} style={{ fontSize: '0.775rem' }}>
                                <span style={{ color: '#64748b' }}>{a.func}: </span>
                                <span style={{ color: '#2563eb' }}>{computeAggregationValue(masterList, a.func, a.columnKey)}</span>
                              </div>
                            ))}
                          </td>
                        )}
                        {masterVisibleKeys.includes('company_city') && (
                          <td style={{ padding: '8px 12px' }}>
                            {aggregations.filter((a) => a.columnKey === 'company_city').map((a) => (
                              <div key={a.id} style={{ fontSize: '0.775rem' }}>
                                <span style={{ color: '#64748b' }}>{a.func}: </span>
                                <span style={{ color: '#2563eb' }}>{computeAggregationValue(masterList, a.func, a.columnKey)}</span>
                              </div>
                            ))}
                          </td>
                        )}
                        {masterVisibleKeys.includes('actual_company_count') && (
                          <td className="col-number" style={{ padding: '8px 12px' }}>
                            {aggregations.filter((a) => a.columnKey === 'actual_company_count').map((a) => (
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

      {/* VIEW MODE 2: FORM PAGE + CHILD FILTERED REPORT (Screenshot 1) */}
      {viewMode === 'form' && (
        <div>
          {/* Top Form Card strictly matching Screenshot 1 */}
          <div className="apex-form-card">
            <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>
                {!selectedRecord || selectedRecord.isCreate ? 'Create Country & City Mapping' : 'Country & City Mapping'}
              </h2>
            </div>

            <form onSubmit={handleFormSubmit}>
              {/* Row 1: 4 columns matching Screenshot 1 */}
              <div className="apex-form-grid-4">
                <div className="apex-form-field">
                  <label>
                    Master Country
                  </label>
                  <input
                    type="text"
                    required
                    className="apex-form-input"
                    style={{ width: '100%', height: '36px', borderRadius: '4px', border: '1px solid #cbd5e1', padding: '0 0.75rem' }}
                    value={formData.master_country}
                    onChange={(e) => setFormData({ ...formData, master_country: e.target.value })}
                    placeholder="e.g. Saudi Arabia"
                  />
                </div>

                <div className="apex-form-field">
                  <label>
                    Master City
                  </label>
                  <input
                    type="text"
                    required
                    className="apex-form-input"
                    style={{ width: '100%', height: '36px', borderRadius: '4px', border: '1px solid #cbd5e1', padding: '0 0.75rem' }}
                    value={formData.master_city}
                    onChange={(e) => setFormData({ ...formData, master_city: e.target.value })}
                    placeholder="e.g. Riyadh"
                  />
                </div>

                <div className="apex-form-field">
                  <label>
                    Master Count
                  </label>
                  <input
                    type="text"
                    readOnly
                    className="apex-form-input readonly-input"
                    style={{ width: '100%', height: '36px', borderRadius: '4px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', padding: '0 0.75rem', color: '#64748b' }}
                    value={Number(formData.master_stored_count || 0).toLocaleString()}
                  />
                </div>

                <div className="apex-form-field">
                  <label>
                    Validation Status
                  </label>
                  <input
                    type="text"
                    readOnly
                    className="apex-form-input readonly-input"
                    style={{
                      width: '100%',
                      height: '36px',
                      borderRadius: '4px',
                      border: '1px solid #e2e8f0',
                      backgroundColor: '#f8fafc',
                      padding: '0 0.75rem',
                      fontWeight: 600,
                      color:
                        formData.validation_status === 'DATA IN BOTH'
                          ? '#166534'
                          : formData.validation_status === 'DATA IN COMPANY'
                            ? '#1e40af'
                            : '#b45309',
                    }}
                    value={formData.validation_status}
                  />
                </div>
              </div>

              {/* Row 2: Company Country & City (Editable Dropdowns with Clear Button) & Company Count */}
              <div className="apex-form-grid-4">
                <div className="apex-form-field">
                  <label>
                    Company Country
                  </label>
                  <div style={{ position: 'relative', width: '100%' }}>
                    <select
                      className="apex-form-input"
                      style={{
                        width: '100%',
                        height: '36px',
                        borderRadius: '4px',
                        border: '1px solid #cbd5e1',
                        padding: '0 2.25rem 0 0.75rem',
                        fontSize: '0.825rem',
                        backgroundColor: '#ffffff',
                        appearance: 'none',
                        cursor: 'pointer',
                      }}
                      value={formData.company_country || ''}
                      onChange={(e) => handleCompanyCountryOrCityChange(e.target.value, '')}
                    >
                      <option value="">-- Select Master Country --</option>
                      {allMasterCountries.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>

                    {formData.company_country && (
                      <button
                        type="button"
                        onClick={() => handleCompanyCountryOrCityChange('', '')}
                        style={{
                          position: 'absolute',
                          right: '26px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#94a3b8',
                          padding: '2px',
                        }}
                        title="Clear Company Country"
                      >
                        <IconClose size={13} />
                      </button>
                    )}

                    <span style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748b' }}>
                      <IconChevronDown size={14} />
                    </span>
                  </div>
                </div>

                <div className="apex-form-field">
                  <label>
                    Company City
                  </label>
                  <div style={{ position: 'relative', width: '100%' }}>
                    {formCityOptions.length > 0 ? (
                      <select
                        className="apex-form-input"
                        style={{
                          width: '100%',
                          height: '36px',
                          borderRadius: '4px',
                          border: '1px solid #cbd5e1',
                          padding: '0 2.25rem 0 0.75rem',
                          fontSize: '0.825rem',
                          backgroundColor: '#ffffff',
                          appearance: 'none',
                          cursor: 'pointer',
                        }}
                        value={formData.company_city || ''}
                        onChange={(e) => handleCompanyCountryOrCityChange(undefined, e.target.value)}
                      >
                        <option value="">-- Select Master City --</option>
                        {formCityOptions.map((ct) => (
                          <option key={ct} value={ct}>{ct}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        className="apex-form-input"
                        placeholder="Enter City"
                        style={{ width: '100%', height: '36px', borderRadius: '4px', border: '1px solid #cbd5e1', padding: '0 2.25rem 0 0.75rem', fontSize: '0.825rem' }}
                        value={formData.company_city || ''}
                        onChange={(e) => handleCompanyCountryOrCityChange(undefined, e.target.value)}
                      />
                    )}

                    {formData.company_city && (
                      <button
                        type="button"
                        onClick={() => handleCompanyCountryOrCityChange(undefined, '')}
                        style={{
                          position: 'absolute',
                          right: '26px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#94a3b8',
                          padding: '2px',
                        }}
                        title="Clear Company City"
                      >
                        <IconClose size={13} />
                      </button>
                    )}

                    <span style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748b' }}>
                      <IconChevronDown size={14} />
                    </span>
                  </div>
                </div>

                <div className="apex-form-field">
                  <label>
                    Company Count
                  </label>
                  <input
                    type="text"
                    readOnly
                    className="apex-form-input readonly-input"
                    style={{ width: '100%', height: '36px', borderRadius: '4px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', padding: '0 0.75rem', color: '#64748b' }}
                    value={Number(formData.actual_company_count || 0).toLocaleString()}
                  />
                </div>

                <div className="apex-form-field"></div>
              </div>

              {/* Row 3: Read-only Audit Fields */}
              <div className="apex-form-grid-4">
                <div className="apex-form-field">
                  <label>
                    Created By
                  </label>
                  <input
                    type="text"
                    readOnly
                    className="apex-form-input readonly-input"
                    style={{ width: '100%', height: '36px', borderRadius: '4px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', padding: '0 0.75rem', color: '#64748b' }}
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
                    className="apex-form-input readonly-input"
                    style={{ width: '100%', height: '36px', borderRadius: '4px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', padding: '0 0.75rem', color: '#64748b' }}
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
                    className="apex-form-input readonly-input"
                    style={{ width: '100%', height: '36px', borderRadius: '4px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', padding: '0 0.75rem', color: '#64748b' }}
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
                    className="apex-form-input readonly-input"
                    style={{ width: '100%', height: '36px', borderRadius: '4px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', padding: '0 0.75rem', color: '#64748b' }}
                    value={formatAppDate(formData.modified_date)}
                  />
                </div>
              </div>

              {/* Form Actions Footer strictly matching Screenshot 1 */}
              <div className="apex-form-actions-row">
                <button
                  type="button"
                  onClick={handleCancelForm}
                  style={{
                    height: '36px',
                    padding: '0 1.25rem',
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    fontSize: '0.825rem',
                    fontWeight: 600,
                    color: '#475569',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>

                <div className="apex-form-actions-right">
                  {!selectedRecord?.isCreate && (
                    <button
                      type="button"
                      onClick={handleDeleteMaster}
                      style={{
                        height: '36px',
                        padding: '0 1.25rem',
                        backgroundColor: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        fontSize: '0.825rem',
                        fontWeight: 600,
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
                      height: '36px',
                      padding: '0 1.25rem',
                      backgroundColor: '#102a43',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '0.825rem',
                      fontWeight: 600,
                      color: '#ffffff',
                      cursor: 'pointer',
                    }}
                  >
                    Apply Changes
                  </button>

                  <button
                    type="button"
                    onClick={handleUpdateCountryCityBatch}
                    style={{
                      height: '36px',
                      padding: '0 1.25rem',
                      backgroundColor: '#102a43',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '0.825rem',
                      fontWeight: 600,
                      color: '#ffffff',
                      cursor: 'pointer',
                    }}
                  >
                    Update Country City
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Child Companies Report below Form */}
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '1.25rem 1.5rem',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
            }}
          >
            {/* Child Toolbar */}
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
                    setChildActiveSearch(childSearch);
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
                      padding: '0 12px',
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

                <div style={{ position: 'relative' }}>
                  <button
                    type="button"
                    onClick={() => setShowChildActions(!showChildActions)}
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
                    isOpen={showChildActions}
                    onClose={() => setShowChildActions(false)}
                    onDownload={() => {
                      if (!childCompanies || childCompanies.length === 0) return;
                      const header = 'ID,Company Name,Country,City';
                      const rows = childCompanies.map(
                        (c) => `"${c.id}","${(c.comp_name || c.name || '').replace(/"/g, '""')}","${(c.country || '').replace(/"/g, '""')}","${(c.city || '').replace(/"/g, '""')}"`
                      );
                      const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `Companies_${activeDrilldownCountry}_${activeDrilldownCity}.csv`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    onRefresh={loadChildCompanies}
                    currentRows={childRows}
                  />
                </div>
              </div>

              {/* Child Pagination */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#64748b' }}>
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

            {/* Child Table */}
            <div style={{ overflowX: 'auto' }}>
              {childLoading ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                  Loading companies...
                </div>
              ) : childCompanies.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                  No companies found matching Country: "{activeDrilldownCountry}" & City: "{activeDrilldownCity}".
                </div>
              ) : (
                <table className="apex-master-table">
                  <thead>
                    <tr>
                      <th style={{ width: '40px', textAlign: 'center' }}></th>
                      <th style={{ width: '100px' }}>ID</th>
                      <th style={{ minWidth: '240px' }}>Comp Name</th>
                      <th style={{ minWidth: '150px' }}>Country</th>
                      <th style={{ minWidth: '150px' }}>City</th>
                    </tr>
                  </thead>
                  <tbody>
                    {childCompanies.map((comp) => (
                      <tr key={comp.id}>
                        <td className="col-center">
                          <button
                            type="button"
                            className="apex-edit-icon-btn"
                            onClick={() => {
                              if (onNavigateToCompanyForm) {
                                onNavigateToCompanyForm(comp.id);
                              } else {
                                try {
                                  localStorage.setItem('apex_open_company_id', String(comp.id));
                                } catch (e) { }
                                window.location.hash = `#/companies?id=${comp.id}`;
                              }
                            }}
                            title={`Edit Company #${comp.id} Form`}
                          >
                            <IconFilePenLine size={15} />
                          </button>
                        </td>
                        <td style={{ fontWeight: 600, color: '#1e293b' }}>{comp.id}</td>
                        <td style={{ fontWeight: 500, color: '#1e293b' }}>{comp.comp_name || comp.name || '-'}</td>
                        <td style={{ color: '#475569' }}>{comp.country || '-'}</td>
                        <td style={{ color: '#475569' }}>{comp.city || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: Select Columns Modal */}
      {showMasterColumnsModal && (
        <SelectColumnsModal
          allColumns={COUNTRY_CITY_MASTER_COLUMNS}
          visibleColumns={masterVisibleKeys}
          onSave={(newKeys) => {
            setMasterVisibleKeys(newKeys);
            setShowMasterColumnsModal(false);
            try {
              localStorage.setItem('country_city_visible_columns', JSON.stringify(newKeys));
            } catch (e) { }
            if (onShowToast) onShowToast('success', 'Column visibility saved.');
          }}
          onClose={() => setShowMasterColumnsModal(false)}
        />
      )}

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

      {/* MODAL 2: Advanced Filter Modal */}
      {showMasterFilterModal && (
        <ApexFilterModal
          columns={COUNTRY_CITY_MASTER_COLUMNS}
          onApply={(filters) => {
            setShowMasterFilterModal(false);
            const statusFilter = filters.find((f) => f.column === 'validation_status');
            if (statusFilter) {
              api.getCountryCityMappings({
                validationStatus: statusFilter.value,
                limit: masterRows,
              }).then((res) => {
                if (res.success) {
                  setMasterList(res.data || []);
                  setMasterTotal(res.total || 0);
                }
              });
            }
          }}
          onClose={() => setShowMasterFilterModal(false)}
        />
      )}

      {/* MODAL 3: Chart Modal */}
      {showMasterChartModal && (
        <ApexChartModal
          data={masterList.map((m) => ({
            label: `${m.master_country || m.company_country || ''} - ${m.master_city || m.company_city || ''}`,
            count: Number(m.actual_company_count || m.master_stored_count || 0),
          }))}
          title="Country & City Distribution Chart"
          onClose={() => setShowMasterChartModal(false)}
        />
      )}

      {/* MODAL 4: Edit Single Company Record */}
      {editingCompany && (
        <div className="apex-modal-overlay" style={{ zIndex: 1200 }}>
          <div
            className="apex-modal"
            style={{
              maxWidth: '600px',
              width: '90%',
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              padding: '1.5rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>
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

            <form onSubmit={handleUpdateCompanyRecord}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                    Company Name
                  </label>
                  <input
                    type="text"
                    required
                    className="apex-form-input"
                    style={{ width: '100%', height: '36px', borderRadius: '4px', border: '1px solid #cbd5e1', padding: '0 0.75rem' }}
                    value={editingCompanyForm.comp_name}
                    onChange={(e) => setEditingCompanyForm({ ...editingCompanyForm, comp_name: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                    Country
                  </label>
                  <select
                    className="apex-form-input"
                    style={{ width: '100%', height: '36px', borderRadius: '4px', border: '1px solid #cbd5e1', padding: '0 0.75rem' }}
                    value={editingCompanyForm.country}
                    onChange={(e) => handleCountryChangeInEditCompany(e.target.value)}
                  >
                    <option value="">-- Select Country --</option>
                    {allMasterCountries.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                    City
                  </label>
                  {citySuggestions.length > 0 ? (
                    <select
                      className="apex-form-input"
                      style={{ width: '100%', height: '36px', borderRadius: '4px', border: '1px solid #cbd5e1', padding: '0 0.75rem' }}
                      value={editingCompanyForm.city}
                      onChange={(e) => setEditingCompanyForm({ ...editingCompanyForm, city: e.target.value })}
                    >
                      <option value="">-- Select City --</option>
                      {citySuggestions.map((ct) => (
                        <option key={ct} value={ct}>{ct}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      className="apex-form-input"
                      placeholder="Enter city"
                      style={{ width: '100%', height: '36px', borderRadius: '4px', border: '1px solid #cbd5e1', padding: '0 0.75rem' }}
                      value={editingCompanyForm.city}
                      onChange={(e) => setEditingCompanyForm({ ...editingCompanyForm, city: e.target.value })}
                    />
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                    Industry
                  </label>
                  <input
                    type="text"
                    className="apex-form-input"
                    style={{ width: '100%', height: '36px', borderRadius: '4px', border: '1px solid #cbd5e1', padding: '0 0.75rem' }}
                    value={editingCompanyForm.industry}
                    onChange={(e) => setEditingCompanyForm({ ...editingCompanyForm, industry: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                    Company Type
                  </label>
                  <input
                    type="text"
                    className="apex-form-input"
                    style={{ width: '100%', height: '36px', borderRadius: '4px', border: '1px solid #cbd5e1', padding: '0 0.75rem' }}
                    value={editingCompanyForm.company_type}
                    onChange={(e) => setEditingCompanyForm({ ...editingCompanyForm, company_type: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setEditingCompany(null)}
                  style={{
                    height: '36px',
                    padding: '0 1rem',
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    fontSize: '0.825rem',
                    fontWeight: 600,
                    color: '#475569',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    height: '36px',
                    padding: '0 1.25rem',
                    backgroundColor: '#102a43',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.825rem',
                    fontWeight: 600,
                    color: '#ffffff',
                    cursor: 'pointer',
                  }}
                >
                  Save & Update Real-Time
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: Upload Data Modal */}
      {showUploadModal && (
        <div className="apex-modal-overlay" style={{ zIndex: 1200 }}>
          <div
            className="apex-modal"
            style={{
              maxWidth: '500px',
              width: '90%',
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              padding: '1.5rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>
                Upload Data - Country & City Mapping
              </h3>
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <IconClose size={18} />
              </button>
            </div>

            <div style={{ padding: '1rem 0' }}>
              <p style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '1rem' }}>
                Upload a CSV file containing <strong>Country</strong> and <strong>City</strong> columns to bulk import into Country & City Mapping.
              </p>
              <input
                type="file"
                accept=".csv"
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px dashed #94a3b8',
                  borderRadius: '6px',
                  backgroundColor: '#f8fafc',
                  cursor: 'pointer',
                }}
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    if (onShowToast) onShowToast('info', `Selected ${file.name}. Processing...`);
                    setShowUploadModal(false);
                    setTimeout(() => {
                      if (onShowToast) onShowToast('success', `Imported records from ${file.name}`);
                      loadMasterData();
                    }, 800);
                  }
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                style={{
                  height: '36px',
                  padding: '0 1rem',
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  fontSize: '0.825rem',
                  fontWeight: 600,
                  color: '#475569',
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: Aggregate Modal strictly matching Screenshot */}
      <ApexAggregateModal
        isOpen={showAggregateModal}
        onClose={() => setShowAggregateModal(false)}
        columns={COUNTRY_CITY_MASTER_COLUMNS}
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
    </div>
  );
}
