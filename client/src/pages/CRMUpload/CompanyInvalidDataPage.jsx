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

export default function CompanyInvalidDataPage({ onShowToast, onNavigateToUpload }) {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [applyingChanges, setApplyingChanges] = useState(false);

  // Tabs: 'insert', 'update', 'fix_industry'
  const [activeTab, setActiveTab] = useState('fix_industry');

  // Top Filter Card State (Multi-Select Arrays)
  const [remarksFilter, setRemarksFilter] = useState([]);
  const [compNameIncorrectFilter, setCompNameIncorrectFilter] = useState([]);
  const [websiteIncorrectFilter, setWebsiteIncorrectFilter] = useState([]);
  const [industryIncorrectFilter, setIndustryIncorrectFilter] = useState([]);
  const [cityIncorrectFilter, setCityIncorrectFilter] = useState([]);
  const [countryIncorrectFilter, setCountryIncorrectFilter] = useState([]);

  const [createdByFilter, setCreatedByFilter] = useState([]);
  const [errorDateFilter, setErrorDateFilter] = useState('');
  const [industryFilter, setIndustryFilter] = useState([]);
  const [createdDateFilter, setCreatedDateFilter] = useState('');

  // Committed/Applied filters - only update when clicking Search or Clear
  const [appliedFilters, setAppliedFilters] = useState({
    remarks: [],
    comp_name_incorrect: [],
    website_incorrect: [],
    industry_incorrect: [],
    city_incorrect: [],
    country_incorrect: [],
    created_by: [],
    error_date: '',
    industry: [],
    created_date: '',
  });

  // Bulk Apply Changes (under tabs)
  const [selectedCompanyType, setSelectedCompanyType] = useState('Direct Client');

  // Filter options from API
  const [filterOptions, setFilterOptions] = useState({
    createdByList: [],
    industryList: [],
    companyTypeList: ['Direct Client', 'IT Company', 'Partner', 'Vendor'],
    cityList: [],
    countryList: [],
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
        api.getCompanyInvalidFilterOptions().catch(() => null),
      ]);
      if (batchRes && batchRes.success && Array.isArray(batchRes.companyBatches)) {
        setBatches(batchRes.companyBatches);
      }
      if (optRes && optRes.success) {
        setFilterOptions((prev) => ({
          ...prev,
          createdByList: optRes.createdByList || prev.createdByList,
          industryList: optRes.industryList || prev.industryList,
          companyTypeList: optRes.companyTypeList || prev.companyTypeList,
          cityList: optRes.cityList || prev.cityList,
          countryList: optRes.countryList || prev.countryList,
        }));
      }
    } catch (err) {
      console.error('Error fetching filter options:', err);
    }
  }, []);

  useEffect(() => {
    fetchFilterOptions();
  }, [fetchFilterOptions]);

  // Fetch error records from PostgreSQL
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.getCompanyInvalidData({
        search: searchQuery,
        batch_id: selectedBatchId,
        page,
        limit,
        sortBy: 'error_id',
        sortOrder: 'DESC',
        mode: activeTab,
        remark: appliedFilters.remarks.join(','),
        comp_name_incorrect: appliedFilters.comp_name_incorrect.join(','),
        website_incorrect: appliedFilters.website_incorrect.join(','),
        industry_incorrect: appliedFilters.industry_incorrect.join(','),
        city_incorrect: appliedFilters.city_incorrect.join(','),
        country_incorrect: appliedFilters.country_incorrect.join(','),
        created_by: appliedFilters.created_by.join(','),
        error_date: appliedFilters.error_date,
        industry: appliedFilters.industry.join(','),
        created_date: appliedFilters.created_date,
      });
      if (res && res.success) {
        setData(res.data || []);
        setTotal(res.total || 0);
      } else {
        setData([]);
        setTotal(0);
      }
    } catch (err) {
      console.error('Error fetching company invalid data:', err);
      if (onShowToast) onShowToast('error', `Failed to load invalid records: ${err.message}`);
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

  // Handle Search Submit from Top Filter Card
  const handleFilterSearch = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setAppliedFilters({
      remarks: remarksFilter,
      comp_name_incorrect: compNameIncorrectFilter,
      website_incorrect: websiteIncorrectFilter,
      industry_incorrect: industryIncorrectFilter,
      city_incorrect: cityIncorrectFilter,
      country_incorrect: countryIncorrectFilter,
      created_by: createdByFilter,
      error_date: errorDateFilter,
      industry: industryFilter,
      created_date: createdDateFilter,
    });
    setPage(1);
  };

  // Handle Clear Filter
  const handleClearFilters = () => {
    setRemarksFilter([]);
    setCompNameIncorrectFilter([]);
    setWebsiteIncorrectFilter([]);
    setIndustryIncorrectFilter([]);
    setCityIncorrectFilter([]);
    setCountryIncorrectFilter([]);
    setCreatedByFilter([]);
    setErrorDateFilter('');
    setIndustryFilter([]);
    setCreatedDateFilter('');
    setAppliedFilters({
      remarks: [],
      comp_name_incorrect: [],
      website_incorrect: [],
      industry_incorrect: [],
      city_incorrect: [],
      country_incorrect: [],
      created_by: [],
      error_date: '',
      industry: [],
      created_date: '',
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
        const res = await api.getCompanyInvalidData({
          limit: 100000,
          search: searchQuery,
          batch_id: selectedBatchId,
          mode: activeTab,
          remark: remarksFilter.join(','),
          comp_name_incorrect: compNameIncorrectFilter.join(','),
          website_incorrect: websiteIncorrectFilter.join(','),
          industry_incorrect: industryIncorrectFilter.join(','),
          city_incorrect: cityIncorrectFilter.join(','),
          country_incorrect: countryIncorrectFilter.join(','),
          created_by: createdByFilter.join(','),
          error_date: errorDateFilter,
          industry: industryFilter.join(','),
          created_date: createdDateFilter,
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
      const res = await api.applyCompanyInvalidChanges(Array.from(selectedIds), {
        company_type: selectedCompanyType,
      });
      if (res && res.success) {
        if (onShowToast) {
          onShowToast(
            'success',
            res.message || `Successfully applied Company Type "${selectedCompanyType}" to ${selectedIds.size} record(s).`
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
      const res = await api.retryCompanyInvalidData(rowsToRetry, activeTab === 'update' ? 'update' : 'insert');
      if (res && res.success) {
        if (res.importedCount > 0) {
          if (onShowToast) {
            onShowToast(
              'success',
              `Successfully imported ${res.importedCount} company record(s) into database! (${res.stillInvalidCount} still invalid)`
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
    if (!window.confirm(`Delete company error record #${errorId}?`)) return;
    try {
      const res = await api.deleteCompanyInvalidData(errorId);
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
      'Company Name',
      'Error Message',
      'Technology',
      'Country',
      'City',
      'Website',
      'Company Type',
      'Employee Size',
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
          r.comp_name,
          r.error_message,
          r.technology,
          r.country,
          r.city,
          r.website,
          r.company_type,
          r.employee_size,
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
    link.download = `Company_Invalid_Data_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    if (onShowToast) onShowToast('success', `Exported ${data.length} row(s) to CSV.`);
  };

  const invalidColumns = useMemo(() => {
    if (activeTab === 'fix_industry') {
      return [
        { key: 'batch_id', label: 'Batch', width: '80px', getValue: (r) => (r.batch_id ? `${r.batch_id}...` : '1...') },
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
        { key: 'industry', label: 'Industry', minWidth: '220px', getValue: (r) => r.industry || '' },
        {
          key: 'industry_incorrect',
          label: 'Industry Incorrect',
          minWidth: '220px',
          getValue: (r) => r.industry_incorrect || (r.error_message && r.error_message.toLowerCase().includes('industry') ? `Industry "${r.industry || ''}" not found` : ''),
          render: (r) => (
            <span style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '0.8125rem' }}>
              {r.industry_incorrect || (r.error_message && r.error_message.toLowerCase().includes('industry') ? `Industry "${r.industry || ''}" not found` : '')}
            </span>
          ),
        },
        { key: 'company_type', label: 'Company Type', minWidth: '120px', getValue: (r) => r.company_type || '' },
        { key: 'comp_name', label: 'Comp Name', minWidth: '160px', getValue: (r) => r.comp_name || '' },
        { key: 'source', label: 'Source', minWidth: '100px', getValue: (r) => r.source || 'linkedIn' },
      ];
    }

    if (activeTab === 'fix_technology') {
      return [
        { key: 'batch_id', label: 'Batch Id', width: '80px', getValue: (r) => (r.batch_id ? `${r.batch_id}...` : '1...') },
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
        { key: 'technology', label: 'Technology', minWidth: '180px', getValue: (r) => r.technology || '' },
        {
          key: 'technology_incorrect',
          label: 'Technology Incorrect',
          minWidth: '180px',
          getValue: (r) => r.technology_incorrect || (r.error_message && r.error_message.toLowerCase().includes('technology') ? `Technology "${r.technology || ''}" not found` : ''),
          render: (r) => (
            <span style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '0.8125rem' }}>
              {r.technology_incorrect || (r.error_message && r.error_message.toLowerCase().includes('technology') ? `Technology "${r.technology || ''}" not found` : '')}
            </span>
          ),
        },
        { key: 'existingcomp', label: 'Existingcomp', minWidth: '110px', getValue: (r) => r.existingcomp || '' },
        { key: 'comp_name', label: 'Comp Name', minWidth: '160px', getValue: (r) => r.comp_name || '' },
        { key: 'registered_url', label: 'Registered Url', minWidth: '150px', getValue: (r) => r.registered_url || '' },
        { key: 'registration_status', label: 'Registration Status', minWidth: '130px', getValue: (r) => r.registration_status || '' },
        { key: 'supplier_number', label: 'Supplier Number', minWidth: '120px', getValue: (r) => r.supplier_number || '' },
        { key: 'username', label: 'Username', minWidth: '110px', getValue: (r) => r.username || '' },
        { key: 'password', label: 'Password', minWidth: '110px', getValue: (r) => r.password || '' },
        { key: 'registration_date', label: 'Registration Date', minWidth: '120px', getValue: (r) => r.registration_date || '' },
        { key: 'prev_salesperson', label: 'Prev Salesperson', minWidth: '130px', getValue: (r) => r.prev_salesperson || '' },
      ];
    }

    return [
      { key: 'batch_id', label: 'Batch', width: '80px', getValue: (r) => (r.batch_id ? `${r.batch_id}...` : '1...') },
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
      { key: 'industry', label: 'Industry', minWidth: '200px', getValue: (r) => r.industry || '' },
      { key: 'company_type', label: 'Company Type', minWidth: '120px', getValue: (r) => r.company_type || '' },
      { key: 'comp_name', label: 'Comp Name', minWidth: '160px', getValue: (r) => r.comp_name || '' },
      { key: 'source', label: 'Source', minWidth: '100px', getValue: (r) => r.source || 'linkedIn' },
      { key: 'country', label: 'Country', minWidth: '110px', getValue: (r) => r.country || '' },
      { key: 'city', label: 'City', minWidth: '100px', getValue: (r) => r.city || '' },
      { key: 'website', label: 'Website', minWidth: '150px', getValue: (r) => r.website || '' },
      { key: 'remark', label: 'Remarks', minWidth: '120px', getValue: (r) => r.remark || '' },
      { key: 'created_by', label: 'Created By', minWidth: '120px', getValue: (r) => r.created_by || '' },
      { key: 'error_date', label: 'Error Date', minWidth: '120px', getValue: (r) => r.error_date || r.created_date || '' },
    ];
  }, [activeTab]);

  return (
    <div className="apex-master-page" style={{ padding: '0.75rem 1.25rem 2.5rem' }}>
      {/* Top Banner Strip */}
      <div className="apex-pattern-strip" style={{ marginBottom: '1rem', height: '4px' }} />

      {/* 1. TOP MULTI-SELECT FILTER CARD MATCHING SCREENSHOT 1 */}
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
          {/* Row 1: 6 Multi-Select Columns */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(6, 1fr)',
              gap: '1rem',
              marginBottom: '1rem',
            }}
          >
            {/* Remarks */}
            <ApexMultiSelect
              label="Remarks"
              options={['Duplicate', 'Invalid', 'Missing', 'Format Error']}
              value={remarksFilter}
              onChange={setRemarksFilter}
              placeholder=""
            />

            {/* Company Name Incorrect */}
            <ApexMultiSelect
              label="Company Name Incorrect"
              options={['Yes', 'No']}
              value={compNameIncorrectFilter}
              onChange={setCompNameIncorrectFilter}
              placeholder=""
            />

            {/* Website Incorrect */}
            <ApexMultiSelect
              label="Website Incorrect"
              options={['Yes', 'No']}
              value={websiteIncorrectFilter}
              onChange={setWebsiteIncorrectFilter}
              placeholder=""
            />

            {/* Industry Incorrect */}
            <ApexMultiSelect
              label="Industry Incorrect"
              options={['Yes', 'No']}
              value={industryIncorrectFilter}
              onChange={setIndustryIncorrectFilter}
              placeholder=""
            />

            {/* City Incorrect */}
            <ApexMultiSelect
              label="City Incorrect"
              options={['Yes', 'No']}
              value={cityIncorrectFilter}
              onChange={setCityIncorrectFilter}
              placeholder=""
            />

            {/* Country Incorrect */}
            <ApexMultiSelect
              label="Country Incorrect"
              options={['Yes', 'No']}
              value={countryIncorrectFilter}
              onChange={setCountryIncorrectFilter}
              placeholder=""
            />
          </div>

          {/* Row 2: Created By, Error Date, Industry, Created Date, Search, Clear Filter */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.2fr 1.2fr 1.6fr 1.2fr auto auto',
              gap: '1rem',
              alignItems: 'end',
            }}
          >
            {/* Created By (Multi-Select with Count Badge) */}
            <ApexMultiSelect
              label="Created By"
              options={filterOptions.createdByList}
              value={createdByFilter}
              onChange={setCreatedByFilter}
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
            </div>

            {/* Industry (Multi-Select) */}
            <ApexMultiSelect
              label="Industry"
              options={filterOptions.industryList}
              value={industryFilter}
              onChange={setIndustryFilter}
              placeholder=""
            />

            {/* Created Date */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '5px', color: 'var(--text-main, #0f172a)' }}>
                Created Date
              </label>
              <input
                type="date"
                value={createdDateFilter}
                onChange={(e) => setCreatedDateFilter(e.target.value)}
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

      {/* 2. THREE TABS MATCHING SCREENSHOT 1 */}
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
            Company Invalid Data (Insert Mode)
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
            Company Invalid Data (Update Mode)
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('fix_industry'); setPage(1); }}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'fix_industry' ? '3px solid #16a34a' : '3px solid transparent',
              padding: '8px 2px 10px 2px',
              fontSize: '0.9rem',
              fontWeight: activeTab === 'fix_industry' ? 700 : 500,
              color: activeTab === 'fix_industry' ? 'var(--text-main, #0f172a)' : 'var(--text-muted, #64748b)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Fix Industry
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('fix_technology'); setPage(1); }}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'fix_technology' ? '3px solid #16a34a' : '3px solid transparent',
              padding: '8px 2px 10px 2px',
              fontSize: '0.9rem',
              fontWeight: activeTab === 'fix_technology' ? 700 : 500,
              color: activeTab === 'fix_technology' ? 'var(--text-main, #0f172a)' : 'var(--text-muted, #64748b)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Fix Technology
          </button>
        </div>

        {/* 3. SUB-ACTION BAR: Company Type dropdown & Apply Changes button for Fix Industry / Fix Technology */}
        {activeTab === 'fix_industry' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', paddingBottom: '6px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted, #64748b)' }}>
                Company Type
              </span>
              <select
                value={selectedCompanyType}
                onChange={(e) => setSelectedCompanyType(e.target.value)}
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
                {filterOptions.companyTypeList.map((t) => (
                  <option key={t} value={t}>
                    {t}
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
        )}
        {activeTab === 'fix_technology' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', paddingBottom: '6px' }}>
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
              {applyingChanges ? 'Applying...' : 'Apply'}
            </button>
          </div>
        )}
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
