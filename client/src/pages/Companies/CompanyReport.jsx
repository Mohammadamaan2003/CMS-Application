import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  IconSearch,
  IconFilter,
  IconDownload,
  IconPlus,
  IconTrash,
  IconFilePenLine,
  IconChevronLeft,
  IconChevronRight,
  IconGlobe,
  IconChevronDown,
} from '../../components/Icons';
import ValidationRulesModal from '../../components/ValidationRulesModal';
import UploadModal from '../../components/UploadModal';
import SelectColumnsModal from '../../components/SelectColumnsModal';
import ApexActionsMenu from '../../components/ApexActionsMenu';
import ApexFilterModal from '../../components/ApexFilterModal';
import ApexChartModal from '../../components/ApexChartModal';
import ApexAggregateModal from '../../components/ApexAggregateModal';
import ApexColumnHeaderMenu from '../../components/ApexColumnHeaderMenu';
import ActiveAggregationsBar from '../../components/ActiveAggregationsBar';
import HomeKpiBanner from '../../components/HomeKpiBanner';
import { computeAggregationValue } from '../../utils/aggregationUtils';
import { api } from '../../api/client';
import { formatAppDate } from '../../utils/dateUtils';

export const COMPANY_ALL_COLUMNS = [
  {
    key: 'id',
    label: 'ID',
    render: (c) => <span style={{ color: '#475569', fontSize: '0.8rem', fontWeight: 600 }}>{c.id}</span>,
    getValue: (c) => c.id,
  },
  {
    key: 'comp_name',
    label: 'Company Name',
    render: (c, handleOpenEdit) => (
      <button
        type="button"
        onClick={() => handleOpenEdit && handleOpenEdit(c)}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          textAlign: 'left',
          fontWeight: 500,
          color: '#1e293b',
        }}
        onMouseOver={(e) => (e.currentTarget.style.color = '#2563eb')}
        onMouseOut={(e) => (e.currentTarget.style.color = '#1e293b')}
      >
        {c.comp_name || c.name}
      </button>
    ),
    getValue: (c) => c.comp_name || c.name || '',
  },
  {
    key: 'company_type',
    label: 'Company Type',
    render: (c) => (c.company_type && c.company_type !== 'undefined' ? c.company_type : '—'),
    getValue: (c) => (c.company_type && c.company_type !== 'undefined' ? c.company_type : '—'),
  },
  {
    key: 'industry',
    label: 'Industry',
    render: (c) => c.industry || '',
    getValue: (c) => c.industry || '',
  },
  {
    key: 'employee_size',
    label: 'Employee Size',
    render: (c) => c.employee_size || '',
    getValue: (c) => c.employee_size || '',
  },
  {
    key: 'technology',
    label: 'Technology',
    render: (c) => c.technology || '',
    getValue: (c) => c.technology || '',
  },
  {
    key: 'company_categories',
    label: 'Company Categories',
    render: (c) => c.company_categories || '',
    getValue: (c) => c.company_categories || '',
  },
  {
    key: 'country',
    label: 'Country',
    render: (c) => c.country || '',
    getValue: (c) => c.country || '',
  },
  {
    key: 'city',
    label: 'City',
    render: (c) => c.city || '',
    getValue: (c) => c.city || '',
  },
  {
    key: 'companyphone',
    label: 'Company Phone',
    render: (c) => c.companyphone || c.phone || '',
    getValue: (c) => c.companyphone || c.phone || '',
  },
  {
    key: 'com_email',
    label: 'Com Email',
    render: (c) => c.com_email || c.email || '',
    getValue: (c) => c.com_email || c.email || '',
  },
  {
    key: 'website',
    label: 'Website',
    render: (c) =>
      c.website ? (
        <a
          href={c.website.startsWith('http') ? c.website : `http://${c.website}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#2563eb', textDecoration: 'none' }}
          onMouseOver={(e) => (e.currentTarget.style.textDecoration = 'underline')}
          onMouseOut={(e) => (e.currentTarget.style.textDecoration = 'none')}
        >
          {c.website}
        </a>
      ) : '',
    getValue: (c) => c.website || '',
  },
  {
    key: 'normalized_website',
    label: 'Normalized Website',
    render: (c) => c.normalized_website || '',
    getValue: (c) => c.normalized_website || '',
  },
  {
    key: 'registered_url',
    label: 'Registered URL',
    render: (c) =>
      c.registered_url ? (
        <a
          href={c.registered_url.startsWith('http') ? c.registered_url : `http://${c.registered_url}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#2563eb', textDecoration: 'none' }}
        >
          {c.registered_url}
        </a>
      ) : '',
    getValue: (c) => c.registered_url || '',
  },
  {
    key: 'registration_status',
    label: 'Registration Status',
    render: (c) => c.registration_status || '',
    getValue: (c) => c.registration_status || '',
  },
  {
    key: 'registration_date',
    label: 'Registration Date',
    render: (c) => formatAppDate(c.registration_date),
    getValue: (c) => formatAppDate(c.registration_date),
  },
  {
    key: 'existingcomp',
    label: 'Existing Company',
    render: (c) => <span style={{ display: 'block', textAlign: 'center' }}>{c.existingcomp || c.existing_comp || 'N'}</span>,
    getValue: (c) => c.existingcomp || c.existing_comp || 'N',
  },
  {
    key: 'supplier_number',
    label: 'Supplier Number',
    render: (c) => c.supplier_number || '',
    getValue: (c) => c.supplier_number || '',
  },
  {
    key: 'da',
    label: 'DA',
    render: (c) => c.da || '',
    getValue: (c) => c.da || '',
  },
  {
    key: 'source',
    label: 'Source',
    render: (c) => c.source || '',
    getValue: (c) => c.source || '',
  },
  {
    key: 'salesperson',
    label: 'Salesperson',
    render: (c) => c.salesperson || '',
    getValue: (c) => c.salesperson || '',
  },
  {
    key: 'prev_salesperson',
    label: 'Prev Salesperson',
    render: (c) => c.prev_salesperson || '',
    getValue: (c) => c.prev_salesperson || '',
  },
  {
    key: 'remark',
    label: 'Remark',
    render: (c) => (
      <span
        style={{ display: 'block', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        title={c.remark || c.remarks}
      >
        {c.remark || c.remarks || ''}
      </span>
    ),
    getValue: (c) => c.remark || c.remarks || '',
  },
  {
    key: 'contacts_count',
    label: 'Contacts Count',
    render: (c) => {
      const dynamicCount = c.contact_count !== undefined && c.contact_count !== null ? c.contact_count : (c.contacts_count !== undefined ? c.contacts_count : 0);
      return (
        <span style={{ display: 'block', textAlign: 'center', fontWeight: dynamicCount > 0 ? 600 : 400, color: dynamicCount > 0 ? '#1d4ed8' : '#64748b' }}>
          {dynamicCount}
        </span>
      );
    },
    getValue: (c) => (c.contact_count !== undefined && c.contact_count !== null ? c.contact_count : (c.contacts_count !== undefined ? c.contacts_count : 0)),
  },
  {
    key: 'contact_count',
    label: 'Contact Count',
    render: (c) => {
      const dynamicCount = c.contact_count !== undefined && c.contact_count !== null ? c.contact_count : (c.contacts_count !== undefined ? c.contacts_count : 0);
      return (
        <span style={{ display: 'block', textAlign: 'center', fontWeight: dynamicCount > 0 ? 600 : 400, color: dynamicCount > 0 ? '#1d4ed8' : '#64748b' }}>
          {dynamicCount}
        </span>
      );
    },
    getValue: (c) => (c.contact_count !== undefined && c.contact_count !== null ? c.contact_count : (c.contacts_count !== undefined ? c.contacts_count : 0)),
  },
  {
    key: 'lead_count',
    label: 'Lead Count',
    render: (c) => <span style={{ display: 'block', textAlign: 'center' }}>{c.lead_count !== undefined && c.lead_count !== null ? c.lead_count : ''}</span>,
    getValue: (c) => (c.lead_count !== undefined && c.lead_count !== null ? c.lead_count : ''),
  },
  {
    key: 'joget_id',
    label: 'Joget ID',
    render: (c) => <span style={{ color: '#64748b' }}>{c.joget_id || ''}</span>,
    getValue: (c) => c.joget_id || '',
  },
  {
    key: 'created_by',
    label: 'Created By',
    render: (c) => c.created_by || '',
    getValue: (c) => c.created_by || '',
  },
  {
    key: 'created_date',
    label: 'Created Date',
    render: (c) => formatAppDate(c.created_date || c.created_at),
    getValue: (c) => formatAppDate(c.created_date || c.created_at),
  },
  {
    key: 'modified_by',
    label: 'Modified By',
    render: (c) => c.modified_by || '',
    getValue: (c) => c.modified_by || '',
  },
  {
    key: 'modified_date',
    label: 'Modified Date',
    render: (c) => formatAppDate(c.modified_date || c.updated_at),
    getValue: (c) => formatAppDate(c.modified_date || c.updated_at),
  },
];

export const DEFAULT_COMPANY_COLUMN_KEYS = [
  'id',
  'comp_name',
  'company_type',
  'industry',
  'employee_size',
  'technology',
  'company_categories',
  'country',
  'city',
  'website',
  'registration_status',
  'contact_count',
  'modified_date',
];

export default function CompanyReport({
  onShowToast,
  onNavigateToContact,
  initialCompanyId,
  onClearInitialId,
  onNavigateReturn,
  onNavigateToUpload,
  onNavigateToContacts,
  stats,
  isLoadingStats,
  onRefreshStats,
}) {
  // Mode: 'report' or 'form'
  const [viewMode, setViewMode] = useState('report');
  // Form active sub-tab: 'company' or 'contacts'
  const [formActiveTab, setFormActiveTab] = useState('company');

  // KPI Statistics State
  const [kpiStats, setKpiStats] = useState(stats || null);
  const [kpiLoading, setKpiLoading] = useState(isLoadingStats || false);

  const fetchKpis = useCallback(async () => {
    try {
      setKpiLoading(true);
      const res = await api.getDashboardStats();
      if (res && res.success) {
        setKpiStats(res.data);
      }
    } catch (e) {
      console.warn('Failed to load KPI stats:', e);
    } finally {
      setKpiLoading(false);
    }
  }, []);

  useEffect(() => {
    if (stats) {
      setKpiStats(stats);
      setKpiLoading(Boolean(isLoadingStats));
    } else {
      fetchKpis();
    }
  }, [stats, isLoadingStats, fetchKpis]);

  // Cancel or return redirect back to caller page
  const handleCancelOrReturn = useCallback(() => {
    if (onNavigateReturn && onNavigateReturn()) {
      return;
    }
    try {
      const returnTab = localStorage.getItem('apex_return_tab');
      if (returnTab) {
        const returnHash = localStorage.getItem('apex_return_hash');
        localStorage.removeItem('apex_return_tab');
        localStorage.removeItem('apex_return_hash');
        if (returnHash) {
          window.location.hash = returnHash;
        }
        return;
      }
    } catch (e) {}
    setViewMode('report');
    setEditingId(null);
  }, [onNavigateReturn]);

  // Modals
  const [showValidationRules, setShowValidationRules] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Data & Pagination
  const [companies, setCompanies] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [sortBy, setSortBy] = useState('id');
  const [sortOrder, setSortOrder] = useState('DESC');

  // Selection & UI controls
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [searchInput, setSearchInput] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // APEX Column Header Popover Menu
  const [headerMenu, setHeaderMenu] = useState({
    isOpen: false,
    column: null,
    anchorRect: null,
  });

  // Actions Dropdown & Modals
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showColumnsModal, setShowColumnsModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showChartModal, setShowChartModal] = useState(false);
  const [showAggregateModal, setShowAggregateModal] = useState(false);
  const [aggregations, setAggregations] = useState([]);
  const [visibleColumnKeys, setVisibleColumnKeys] = useState(() => {
    try {
      const saved = localStorage.getItem('company_visible_columns');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return DEFAULT_COMPANY_COLUMN_KEYS;
  });

  const columnMap = useMemo(() => new Map(COMPANY_ALL_COLUMNS.map((c) => [c.key, c])), []);
  const visibleColumns = useMemo(
    () => visibleColumnKeys.map((k) => columnMap.get(k)).filter(Boolean),
    [visibleColumnKeys, columnMap]
  );

  // Initial filter state matching screenshot
  const initialFilterState = {
    id_from: '',
    id_to: '',
    comp_name: '',
    technology: '',
    company_type: '',
    company_categories: '',
    country: '',
    city: '',
    website: '',
    lead_count: '',
    employee_size: '',
    contact_count: '',
    source: '',
    industry: '',
    remark: '',
    registration_date: '',
    registration_status: '',
    supplier_number: '',
    created_from: '',
    created_to: '',
    modified_from: '',
    modified_to: '',
    created_by: '',
    companyphone: '',
  };

  const [filters, setFilters] = useState(initialFilterState);
  const [appliedFilters, setAppliedFilters] = useState({});

  const [filterOptions, setFilterOptions] = useState({
    industries: [],
    countries: [],
    technologies: [],
    companyTypes: [],
    companyNames: [],
    categories: [],
    cities: [],
    employeeSizes: [],
    sources: [],
    registrationStatuses: [],
    supplierNumbers: [],
    createdBys: [],
    leadCounts: [],
    remarks: [],
  });

  // Scope: 'local' (1,001 synced records) or 'all' (33,937 live connected records)
  const [scope, setScope] = useState('local');
  const [connectedTotal, setConnectedTotal] = useState(33937);

  // Master lists for authentic form dropdown choices
  const [countryMasterList, setCountryMasterList] = useState([]);
  const [companyTypesMaster, setCompanyTypesMaster] = useState([]);
  const [companySizesMaster, setCompanySizesMaster] = useState([]);
  const [companyCategoriesMaster, setCompanyCategoriesMaster] = useState([]);
  const [technologiesMaster, setTechnologiesMaster] = useState([]);
  const [industriesMaster, setIndustriesMaster] = useState([]);

  // Editing state
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    technology: '',
    industry: '',
    city: '',
    country: '',
    website: '',
    existing_comp: 'N',
    da: '',
    phone: '',
    email: '',
    company_categories: '',
    company_type: 'Direct Client',
    employee_size: '',
    registered_url: '',
    registration_status: '',
    supplier_number: '',
    registration_date: '',
    source: '',
    remarks: '',
    salesperson: '',
    prev_salesperson: '',
    joget_id: '',
    created_by: 'ADMIN',
    created_at: '',
    modified_by: 'ADMIN',
    updated_at: '',
  });

  // Company Contacts sub-tab state (Screenshot 2 inside Company form)
  const [companyContacts, setCompanyContacts] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [contactSearch, setContactSearch] = useState('');
  const [showAddContactInline, setShowAddContactInline] = useState(false);
  const [inlineContactData, setInlineContactData] = useState({
    contact_name: '',
    designation: '',
    position_type: 'Other IT',
    email: '',
    phone: '',
  });

  const [citySuggestions, setCitySuggestions] = useState([]);
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch all authentic Master tables on mount
  useEffect(() => {
    let isMounted = true;
    Promise.all([
      api.getCountries({ limit: 1000 }).catch(() => ({ data: [] })),
      api.getCompanyTypes({ limit: 1000 }).catch(() => ({ data: [] })),
      api.getCompanySizes({ limit: 1000 }).catch(() => ({ data: [] })),
      api.getCompanyCategories().catch(() => ({ data: [] })),
      api.getTechnologies().catch(() => ({ data: [] })),
      api.getIndustries({ limit: 1000 }).catch(() => ({ data: [] })),
    ]).then(([countriesRes, typesRes, sizesRes, catsRes, techsRes, indsRes]) => {
      if (!isMounted) return;
      if (countriesRes?.data) setCountryMasterList(countriesRes.data);
      if (typesRes?.data) setCompanyTypesMaster(typesRes.data);
      if (sizesRes?.data) setCompanySizesMaster(sizesRes.data);
      if (catsRes?.data) setCompanyCategoriesMaster(catsRes.data);
      if (techsRes?.data) setTechnologiesMaster(techsRes.data);
      if (indsRes?.data) setIndustriesMaster(indsRes.data);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch city suggestions from CRM.COUNTRY_CITY_MAPPING when country changes
  useEffect(() => {
    if (!formData.country) {
      setCitySuggestions([]);
      return;
    }
    let isMounted = true;
    api.getCitiesByCountry(formData.country)
      .then((res) => {
        if (isMounted && res.success && res.cities) {
          setCitySuggestions(res.cities);
        }
      })
      .catch((e) => console.warn('City suggestions warning:', e.message));
    return () => {
      isMounted = false;
    };
  }, [formData.country]);

  // Country options: country master is primary source, while existing company country values not in master are preserved
  const countryOptions = useMemo(() => {
    const set = new Set();
    countryMasterList.forEach((c) => {
      if (c.master_country) set.add(c.master_country);
    });
    (filterOptions.countries || []).forEach((c) => {
      if (c) set.add(c);
    });
    if (formData.country) set.add(formData.country);
    return Array.from(set).sort();
  }, [countryMasterList, filterOptions.countries, formData.country]);

  // Company Type options: from master_company_types, excluding literal 'undefined', preserving current
  const companyTypeOptions = useMemo(() => {
    const set = new Set();
    companyTypesMaster.forEach((t) => {
      const val = t.master_company_type || t.company_type;
      if (val && val !== 'undefined') set.add(val);
    });
    (filterOptions.companyTypes || []).forEach((t) => {
      if (t && t !== 'undefined') set.add(t);
    });
    set.add('Direct Client');
    set.add('IT Company');
    set.add('Partner');
    if (formData.company_type && formData.company_type !== 'undefined') {
      set.add(formData.company_type);
    }
    return Array.from(set).sort();
  }, [companyTypesMaster, filterOptions.companyTypes, formData.company_type]);

  // Company Categories options: authentic master (Partner Company, Client Company, Supplier Company)
  const companyCategoryOptions = useMemo(() => {
    const set = new Set();
    companyCategoriesMaster.forEach((c) => {
      const val = c.company_categories || c.category;
      if (val) set.add(val);
    });
    set.add('Partner Company');
    set.add('Client Company');
    set.add('Supplier Company');
    (filterOptions.categories || []).forEach((c) => {
      if (c && !['Enterprise', 'Mid-Market', 'SMB'].includes(c)) set.add(c);
    });
    if (formData.company_categories) {
      set.add(formData.company_categories);
    }
    return Array.from(set).sort();
  }, [companyCategoriesMaster, filterOptions.categories, formData.company_categories]);

  // Employee Size options: authentic master
  const employeeSizeOptions = useMemo(() => {
    const set = new Set();
    companySizesMaster.forEach((s) => {
      const val = s.master_company_size || s.employee_size;
      if (val) set.add(val);
    });
    (filterOptions.employeeSizes || []).forEach((s) => {
      if (s) set.add(s);
    });
    const standards = [
      '1-10 employees',
      '11-50 employees',
      '51-200 employees',
      '201-500 employees',
      '501-1,000 employees',
      '1,001-5,000 employees',
      '5,001-10,000 employees',
      '10,001+ employees',
    ];
    standards.forEach((s) => set.add(s));
    if (formData.employee_size) {
      set.add(formData.employee_size);
    }
    return Array.from(set);
  }, [companySizesMaster, filterOptions.employeeSizes, formData.employee_size]);

  // Technology options: authentic master
  const technologyOptions = useMemo(() => {
    const set = new Set();
    technologiesMaster.forEach((t) => {
      if (t) set.add(t);
    });
    (filterOptions.technologies || []).forEach((t) => {
      if (t) set.add(t);
    });
    if (formData.technology) {
      set.add(formData.technology);
    }
    return Array.from(set).sort();
  }, [technologiesMaster, filterOptions.technologies, formData.technology]);

  // Industry options: authentic master
  const industryOptions = useMemo(() => {
    const set = new Set();
    industriesMaster.forEach((ind) => {
      const val = ind.master_industry || ind.industry;
      if (val) set.add(val);
    });
    (filterOptions.industries || []).forEach((ind) => {
      if (ind) set.add(ind);
    });
    if (formData.industry) {
      set.add(formData.industry);
    }
    return Array.from(set).sort();
  }, [industriesMaster, filterOptions.industries, formData.industry]);

  // Registration Status options: approved states
  const registrationStatusOptions = useMemo(() => {
    const set = new Set(['Active', 'Pending', 'Suspended', 'In Review']);
    if (formData.registration_status) {
      set.add(formData.registration_status);
    }
    return Array.from(set);
  }, [formData.registration_status]);

  // Load filter options
  useEffect(() => {
    let isMounted = true;
    api.getCompanyFilters()
      .then((res) => {
        if (isMounted && res.success && res.data) {
          setFilterOptions({
            industries: res.data.industries || [],
            countries: res.data.countries || [],
            technologies: res.data.technologies || [],
            companyTypes: res.data.companyTypes || [],
            companyNames: res.data.companyNames || [],
            categories: res.data.categories || [],
            cities: res.data.cities || [],
            employeeSizes: res.data.employeeSizes || [],
            sources: res.data.sources || [],
            registrationStatuses: res.data.registrationStatuses || [],
            supplierNumbers: res.data.supplierNumbers || [],
            createdBys: res.data.createdBys || [],
            leadCounts: res.data.leadCounts || [],
            remarks: res.data.remarks || [],
          });
        }
      })
      .catch((err) => console.warn('Filter options note:', err.message));
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch Companies with Dynamic Contact Counts & Active Scope
  const loadCompanies = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.getCompanies({
        scope,
        search: activeSearch,
        ...appliedFilters,
        page,
        limit,
        sortBy,
        sortOrder,
      });

      if (res.success) {
        setCompanies(res.data || []);
        setTotalCount(res.total || 0);
        if (res.connectedTotal) {
          setConnectedTotal(res.connectedTotal);
        }
      }
    } catch (err) {
      if (onShowToast) {
        onShowToast('error', `Failed to load companies: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  }, [scope, activeSearch, appliedFilters, page, limit, sortBy, sortOrder, onShowToast]);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  const handleApplyFilters = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setAppliedFilters({ ...filters });
    setPage(1);
  };

  const handleClearFilters = () => {
    setFilters(initialFilterState);
    setAppliedFilters({});
    setPage(1);
  };

  const handleHeaderClick = (e, col) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setHeaderMenu({
      isOpen: true,
      column: col,
      anchorRect: rect,
    });
  };

  const handleMenuSort = (columnKey, direction) => {
    setSortBy(columnKey);
    setSortOrder(direction.toUpperCase());
    setPage(1);
  };

  const handleMenuHideColumn = (columnKey) => {
    setVisibleColumnKeys((prev) => prev.filter((k) => k !== columnKey));
    if (onShowToast) onShowToast('info', 'Column hidden.');
  };

  const handleMenuControlBreak = (columnKey) => {
    setShowChartModal(true);
  };

  const handleMenuFilterValue = (columnKey, val) => {
    const filterKey = columnKey === 'company_name' ? 'comp_name' : columnKey;
    setFilters((prev) => ({ ...prev, [filterKey]: val }));
    setAppliedFilters((prev) => ({ ...prev, [filterKey]: val }));
    setPage(1);
    if (onShowToast) onShowToast('success', `Filtered by ${columnKey}: ${val}`);
  };

  // Load Company Contacts when switching to contacts tab in Form
  const loadCompanyContacts = useCallback(async () => {
    if (!editingId) return;
    try {
      setLoadingContacts(true);
      const res = await api.getCompany(editingId);
      if (res.success && res.data) {
        setCompanyContacts(res.data.contacts || []);
      }
    } catch (err) {
      console.warn('Error loading company contacts:', err.message);
    } finally {
      setLoadingContacts(false);
    }
  }, [editingId]);

  useEffect(() => {
    if (viewMode === 'form' && formActiveTab === 'contacts') {
      loadCompanyContacts();
    }
  }, [viewMode, formActiveTab, loadCompanyContacts]);

  // Selection handlers - report-wide select all across entire dataset
  const handleToggleSelectAll = async (e) => {
    if (e.target.checked) {
      try {
        const queryParams = {
          search: activeSearch,
          ...appliedFilters,
        };
        const res = await api.getCompanyIds(queryParams);
        if (res.success && Array.isArray(res.ids)) {
          setSelectedIds(new Set(res.ids));
        } else {
          setSelectedIds(new Set(companies.map((c) => c.id)));
        }
      } catch (err) {
        console.warn('Failed to select all report records:', err.message);
        setSelectedIds(new Set(companies.map((c) => c.id)));
      }
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleToggleSelectOne = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  // Search Go button
  const handleGoSearch = (e) => {
    if (e) e.preventDefault();
    setActiveSearch(searchInput.trim());
    setPage(1);
  };

  // Open Create Form
  const handleOpenCreate = () => {
    setEditingId(null);
    setFieldErrors({});
    setFormData({
      name: '',
      technology: '',
      industry: '',
      city: '',
      country: '',
      website: '',
      existing_comp: 'N',
      da: '',
      phone: '',
      email: '',
      company_categories: '',
      company_type: '',
      employee_size: '',
      registered_url: '',
      registration_status: '',
      supplier_number: '',
      registration_date: new Date().toLocaleDateString('en-US'),
      source: '',
      remarks: '',
      salesperson: '',
      prev_salesperson: '',
      joget_id: '',
      created_by: 'ADMIN',
      created_at: new Date().toLocaleDateString('en-US'),
      modified_by: 'ADMIN',
      updated_at: new Date().toLocaleDateString('en-US'),
    });
    setFormActiveTab('company');
    setViewMode('form');
  };

  // Open Edit Form
  const handleOpenEdit = async (company) => {
    setEditingId(company.id);
    setFieldErrors({});
    try {
      const res = await api.getCompany(company.id);
      const c = res.success ? res.data : company;
      const compType = c.company_type === 'undefined' ? '' : (c.company_type || '');
      setFormData({
        name: c.name || c.comp_name || '',
        technology: c.technology || '',
        industry: c.industry || '',
        city: c.city || '',
        country: c.country || '',
        website: c.website || '',
        existing_comp: c.existing_comp === 'Y' || c.existingcomp === 'Y' ? 'Y' : 'N',
        da: c.da || '',
        phone: c.phone || c.companyphone || '',
        email: c.email || c.com_email || '',
        company_categories: c.company_categories || '',
        company_type: compType,
        employee_size: c.employee_size || '',
        registered_url: c.registered_url || '',
        registration_status: c.registration_status || '',
        supplier_number: c.supplier_number || '',
        registration_date: c.registration_date || '',
        source: c.source || '',
        remarks: c.remarks || c.remark || '',
        salesperson: c.salesperson || '',
        prev_salesperson: c.prev_salesperson || '',
        joget_id: c.joget_id || '',
        created_by: c.created_by || 'MARIYA_BADAR',
        created_at: c.created_at || c.created_date || '11/10/2026',
        modified_by: c.modified_by || 'MARIYA_BADAR',
        updated_at: c.updated_at || c.modified_date || '11/10/2026',
      });
      setFormActiveTab('company');
      setViewMode('form');
    } catch (err) {
      if (onShowToast) onShowToast('error', `Failed to load company: ${err.message}`);
    }
  };

  // Open directly in Edit mode when given an initial company ID
  useEffect(() => {
    let target = initialCompanyId;
    if (!target) {
      try {
        target = localStorage.getItem('apex_open_company_id');
      } catch (e) {}
    }
    if (!target && window.location.hash.includes('?id=')) {
      const match = window.location.hash.match(/[?&]id=(\d+)/);
      if (match) target = match[1];
    }
    if (target) {
      try {
        localStorage.removeItem('apex_open_company_id');
      } catch (e) {}
      if (onClearInitialId) onClearInitialId();
      handleOpenEdit({ id: target });
    }
  }, [initialCompanyId]);

  // Save Form with verified constraints & validations
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setFieldErrors({});

    const normalizedName = (formData.name || '').trim();
    if (!normalizedName) {
      setFieldErrors((prev) => ({ ...prev, name: 'Company Name is required.' }));
      if (onShowToast) onShowToast('error', 'Company Name is required.');
      return;
    }

    // Client-side quick check against loaded companies
    const dupCompany = companies.find(
      (c) =>
        (c.name || c.comp_name) &&
        (c.name || c.comp_name).trim().toLowerCase() === normalizedName.toLowerCase() &&
        String(c.id) !== String(editingId)
    );
    if (dupCompany) {
      const msg = `A company with the name "${normalizedName}" already exists (Company #${dupCompany.id}). Duplicate company records are not allowed.`;
      setFieldErrors((prev) => ({ ...prev, name: msg }));
      if (onShowToast) onShowToast('error', msg);
      return;
    }

    const normalizedWebsite = (formData.website || '').trim();
    if (normalizedWebsite) {
      if (/\s/.test(normalizedWebsite)) {
        const msg = 'Website cannot contain spaces.';
        setFieldErrors((prev) => ({ ...prev, website: msg }));
        if (onShowToast) onShowToast('error', msg);
        return;
      }
      const dup = companies.find(
        (c) =>
          c.website &&
          c.website.trim().toLowerCase() === normalizedWebsite.toLowerCase() &&
          String(c.id) !== String(editingId)
      );
      if (dup) {
        const msg = `WEBSITE "${normalizedWebsite}" already exists for Company #${dup.id}.`;
        setFieldErrors((prev) => ({ ...prev, website: msg }));
        if (onShowToast) onShowToast('error', msg);
        return;
      }
    }

    const normalizedEmail = (formData.email || '').trim();
    if (normalizedEmail) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        const msg = 'Please enter a valid email address (e.g. contact@example.com).';
        setFieldErrors((prev) => ({ ...prev, email: msg }));
        if (onShowToast) onShowToast('error', msg);
        return;
      }
    }

    const normalizedJogetId = (formData.joget_id || '').trim();
    if (normalizedJogetId) {
      const dup = companies.find(
        (c) =>
          c.joget_id &&
          c.joget_id.trim().toLowerCase() === normalizedJogetId.toLowerCase() &&
          String(c.id) !== String(editingId)
      );
      if (dup) {
        const msg = `JOGET_ID "${normalizedJogetId}" already exists for Company #${dup.id}.`;
        setFieldErrors((prev) => ({ ...prev, joget_id: msg }));
        if (onShowToast) onShowToast('error', msg);
        return;
      }
    }

    const payload = {
      ...formData,
      name: normalizedName,
      website: normalizedWebsite || null,
      email: normalizedEmail || null,
      joget_id: normalizedJogetId || null,
      existingcomp: formData.existing_comp === 'Y' ? 'Y' : 'N',
      existing_comp: formData.existing_comp === 'Y' ? 'Y' : 'N',
      phone: (formData.phone || '').trim() || null,
      city: (formData.city || '').trim() || null,
      country: (formData.country || '').trim() || null,
      industry: (formData.industry || '').trim() || null,
      technology: (formData.technology || '').trim() || null,
      company_type: (formData.company_type || '').trim() || null,
      company_categories: (formData.company_categories || '').trim() || null,
      employee_size: (formData.employee_size || '').trim() || null,
      registration_status: (formData.registration_status || '').trim() || null,
      supplier_number: (formData.supplier_number || '').trim() || null,
      registered_url: (formData.registered_url || '').trim() || null,
      registration_date: (formData.registration_date || '').trim() || null,
      source: (formData.source || '').trim() || null,
      remarks: (formData.remarks || '').trim() || null,
      salesperson: (formData.salesperson || '').trim() || null,
      prev_salesperson: (formData.prev_salesperson || '').trim() || null,
      da: (formData.da || '').trim() || null,
    };
    delete payload.password;
    delete payload.username;

    try {
      setIsSubmitting(true);
      if (editingId) {
        await api.updateCompany(editingId, payload);
        if (onShowToast) onShowToast('success', `Company #${editingId} updated successfully.`);
      } else {
        const res = await api.createCompany(payload);
        const newId = res.data?.id;
        if (onShowToast) onShowToast('success', `Company "${normalizedName}" created successfully with ID #${newId}.`);
      }
      handleCancelOrReturn();
      loadCompanies();
      fetchKpis();
      if (onRefreshStats) onRefreshStats();
    } catch (err) {
      const msg = err.message || 'Failed to save company';
      if (msg.includes('WEBSITE')) {
        setFieldErrors((prev) => ({ ...prev, website: msg }));
      } else if (msg.includes('JOGET_ID')) {
        setFieldErrors((prev) => ({ ...prev, joget_id: msg }));
      } else if (msg.includes('EXISTINGCOMP')) {
        setFieldErrors((prev) => ({ ...prev, existing_comp: msg }));
      } else if (msg.includes('Registration Status')) {
        setFieldErrors((prev) => ({ ...prev, registration_status: msg }));
      } else if (msg.toLowerCase().includes('company with the name') || msg.toLowerCase().includes('duplicate company')) {
        setFieldErrors((prev) => ({ ...prev, name: msg }));
      }
      if (onShowToast) onShowToast('error', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Current Company from Form
  const handleDeleteCurrent = async () => {
    if (!editingId) return;
    if (window.confirm(`Are you sure you want to delete company #${editingId}? Any associated contacts will remain safely preserved.`)) {
      try {
        const res = await api.deleteCompany(editingId);
        if (onShowToast) onShowToast('success', res.message);
        handleCancelOrReturn();
        loadCompanies();
      } catch (err) {
        if (onShowToast) onShowToast('error', err.message);
      }
    }
  };

  // Bulk Delete Selected from Table
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    if (window.confirm(`Are you sure you want to delete ${count} selected company record(s)? Contacts will be safely preserved.`)) {
      try {
        const res = await api.bulkDeleteCompanies(Array.from(selectedIds));
        if (onShowToast) onShowToast('success', res.message);
        setSelectedIds(new Set());
        loadCompanies();
        fetchKpis();
        if (onRefreshStats) onRefreshStats();
      } catch (err) {
        if (onShowToast) onShowToast('error', err.message);
      }
    }
  };

  // Export to CSV (Only currently visible columns in display order)
  const handleDownloadCsv = () => {
    if (!companies.length) return;
    const headers = visibleColumns.map((c) => c.label);
    const rows = companies.map((c) =>
      visibleColumns.map((col) => {
        const val = col.getValue(c);
        if (typeof val === 'string') {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val !== undefined && val !== null ? val : '';
      })
    );

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `company_report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (onShowToast) onShowToast('success', `Exported company report (${visibleColumns.length} columns) to CSV.`);
  };

  const startRec = totalCount === 0 ? 0 : (page - 1) * limit + 1;
  const endRec = Math.min(page * limit, totalCount);

  // =========================================================================
  // VIEW MODE: FORM (Screenshot 1)
  // =========================================================================
  if (viewMode === 'form') {
    return (
      <div className="form-page-container">
        {/* Form Sub-Tabs (Screenshot 1) */}
        <div className="form-tabs" style={{ marginBottom: '1rem' }}>
          <button
            type="button"
            onClick={() => setFormActiveTab('company')}
            className={`form-tab-btn ${formActiveTab === 'company' ? 'active' : ''}`}
            style={{
              border: formActiveTab === 'company' ? '2px dashed #94a3b8' : 'none',
              background: '#ffffff',
              padding: '0.45rem 1.25rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Company
          </button>
          <button
            type="button"
            onClick={() => {
              if (!editingId) {
                alert('Please save the company first before viewing or linking contacts.');
                return;
              }
              setFormActiveTab('contacts');
            }}
            className={`form-tab-btn ${formActiveTab === 'contacts' ? 'active' : ''}`}
            style={{
              background: '#ffffff',
              padding: '0.45rem 1.25rem',
              fontWeight: 500,
              cursor: 'pointer',
              border: 'none',
              color: '#64748b',
            }}
          >
            Contacts
          </button>
        </div>

        {/* TAB 1: COMPANY FORM (Screenshot 1) */}
        {formActiveTab === 'company' && (
          <form onSubmit={handleSubmitForm} className="apex-form-card" style={{ background: '#ffffff', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            {/* SECTION 1: Company Details */}
            <div style={{
              fontSize: '0.8rem',
              fontWeight: 700,
              letterSpacing: '0.03em',
              textTransform: 'uppercase',
              color: '#0f172a',
              borderBottom: '1px solid #e2e8f0',
              paddingBottom: '0.4rem',
              marginBottom: '0.85rem',
            }}>
              1. Company Details
            </div>
            <div className="form-grid-3">
              <div className="form-field-row">
                <label className="form-field-label">
                  Company Name <span className="required" style={{ color: '#dc2626' }}>*</span>
                </label>
                <div className="form-field-control">
                  <input
                    type="text"
                    required
                    className="form-control-input"
                    style={fieldErrors.name ? { borderColor: '#dc2626' } : {}}
                    value={formData.name}
                    onChange={(e) => {
                      setFormData({ ...formData, name: e.target.value });
                      if (fieldErrors.name) setFieldErrors({ ...fieldErrors, name: '' });
                    }}
                    placeholder="e.g. Acme Corporation"
                    autoFocus
                  />
                  {fieldErrors.name && (
                    <span style={{ color: '#dc2626', fontSize: '0.72rem', marginTop: '2px', display: 'block' }}>
                      {fieldErrors.name}
                    </span>
                  )}
                </div>
              </div>

              <div className="form-field-row">
                <label className="form-field-label">Website</label>
                <div className="form-field-control">
                  <input
                    type="text"
                    className="form-control-input"
                    style={fieldErrors.website ? { borderColor: '#dc2626' } : {}}
                    value={formData.website}
                    onChange={(e) => {
                      setFormData({ ...formData, website: e.target.value });
                      if (fieldErrors.website) setFieldErrors({ ...fieldErrors, website: '' });
                    }}
                    placeholder="e.g. https://www.acme.com"
                  />
                  {fieldErrors.website && (
                    <span style={{ color: '#dc2626', fontSize: '0.72rem', marginTop: '2px', display: 'block' }}>
                      {fieldErrors.website}
                    </span>
                  )}
                </div>
              </div>

              <div className="form-field-row">
                <label className="form-field-label">Normalized Website</label>
                <div className="form-field-control">
                  <input
                    type="text"
                    readOnly
                    className="form-control-input"
                    style={{ backgroundColor: '#f8fafc', color: '#64748b' }}
                    value={
                      formData.website
                        ? formData.website.trim().toLowerCase().replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0]
                        : '—'
                    }
                    title="Auto-normalized domain"
                  />
                </div>
              </div>

              <div className="form-field-row">
                <label className="form-field-label">Phone</label>
                <div className="form-field-control">
                  <input
                    type="text"
                    className="form-control-input"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="e.g. +1 555-0199"
                  />
                </div>
              </div>

              <div className="form-field-row">
                <label className="form-field-label">Email</label>
                <div className="form-field-control">
                  <input
                    type="email"
                    className="form-control-input"
                    style={fieldErrors.email ? { borderColor: '#dc2626' } : {}}
                    value={formData.email}
                    onChange={(e) => {
                      setFormData({ ...formData, email: e.target.value });
                      if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: '' });
                    }}
                    placeholder="e.g. info@acme.com"
                  />
                  {fieldErrors.email && (
                    <span style={{ color: '#dc2626', fontSize: '0.72rem', marginTop: '2px', display: 'block' }}>
                      {fieldErrors.email}
                    </span>
                  )}
                </div>
              </div>

              <div className="form-field-row">
                <label className="form-field-label">Existing Company</label>
                <div className="form-field-control">
                  <select
                    className="form-control-select"
                    value={formData.existing_comp || 'N'}
                    onChange={(e) => setFormData({ ...formData, existing_comp: e.target.value })}
                  >
                    <option value="Y">Y - Yes (Active Client)</option>
                    <option value="N">N - No (Prospect / Lead)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* SECTION 2: Location */}
            <div style={{
              fontSize: '0.8rem',
              fontWeight: 700,
              letterSpacing: '0.03em',
              textTransform: 'uppercase',
              color: '#0f172a',
              borderBottom: '1px solid #e2e8f0',
              paddingBottom: '0.4rem',
              marginTop: '1.25rem',
              marginBottom: '0.85rem',
            }}>
              2. Location
            </div>
            <div className="form-grid-3">
              <div className="form-field-row">
                <label className="form-field-label">Country</label>
                <div className="form-field-control">
                  <select
                    className="form-control-select"
                    value={formData.country}
                    onChange={(e) => {
                      setFormData({ ...formData, country: e.target.value, city: '' });
                    }}
                  >
                    <option value="">-- Select Country (Master) --</option>
                    {countryOptions.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-field-row">
                <label className="form-field-label">City</label>
                <div className="form-field-control">
                  <input
                    type="text"
                    list="company-form-cities"
                    className="form-control-input"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="e.g. Riyadh, London, New York"
                  />
                  <datalist id="company-form-cities">
                    {citySuggestions.map((ct) => (
                      <option key={ct} value={ct} />
                    ))}
                  </datalist>
                </div>
              </div>
            </div>

            {/* SECTION 3: Classification & Profile */}
            <div style={{
              fontSize: '0.8rem',
              fontWeight: 700,
              letterSpacing: '0.03em',
              textTransform: 'uppercase',
              color: '#0f172a',
              borderBottom: '1px solid #e2e8f0',
              paddingBottom: '0.4rem',
              marginTop: '1.25rem',
              marginBottom: '0.85rem',
            }}>
              3. Classification &amp; Profile
            </div>
            <div className="form-grid-3">
              <div className="form-field-row">
                <label className="form-field-label">Company Type</label>
                <div className="form-field-control">
                  <select
                    className="form-control-select"
                    value={formData.company_type}
                    onChange={(e) => setFormData({ ...formData, company_type: e.target.value })}
                  >
                    <option value="">-- Select Company Type --</option>
                    {companyTypeOptions.map((ct) => (
                      <option key={ct} value={ct}>{ct}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-field-row">
                <label className="form-field-label">Company Categories</label>
                <div className="form-field-control">
                  <select
                    className="form-control-select"
                    value={formData.company_categories}
                    onChange={(e) => setFormData({ ...formData, company_categories: e.target.value })}
                  >
                    <option value="">-- Select Category --</option>
                    {companyCategoryOptions.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-field-row">
                <label className="form-field-label">Employee Size</label>
                <div className="form-field-control">
                  <select
                    className="form-control-select"
                    value={formData.employee_size}
                    onChange={(e) => setFormData({ ...formData, employee_size: e.target.value })}
                  >
                    <option value="">-- Select Employee Size --</option>
                    {employeeSizeOptions.map((sz) => (
                      <option key={sz} value={sz}>{sz}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-field-row">
                <label className="form-field-label">Industry</label>
                <div className="form-field-control">
                  <select
                    className="form-control-select"
                    value={formData.industry}
                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                  >
                    <option value="">-- Select Industry --</option>
                    {industryOptions.map((ind) => (
                      <option key={ind} value={ind}>{ind}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-field-row">
                <label className="form-field-label">Technology</label>
                <div className="form-field-control">
                  <select
                    className="form-control-select"
                    value={formData.technology}
                    onChange={(e) => setFormData({ ...formData, technology: e.target.value })}
                  >
                    <option value="">-- Select Technology --</option>
                    {technologyOptions.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-field-row">
                <label className="form-field-label">DA</label>
                <div className="form-field-control">
                  <input
                    type="text"
                    className="form-control-input"
                    value={formData.da}
                    onChange={(e) => setFormData({ ...formData, da: e.target.value })}
                    placeholder="e.g. 45"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 4: Registration & Tracking */}
            <div style={{
              fontSize: '0.8rem',
              fontWeight: 700,
              letterSpacing: '0.03em',
              textTransform: 'uppercase',
              color: '#0f172a',
              borderBottom: '1px solid #e2e8f0',
              paddingBottom: '0.4rem',
              marginTop: '1.25rem',
              marginBottom: '0.85rem',
            }}>
              4. Registration &amp; Tracking
            </div>
            <div className="form-grid-3">
              <div className="form-field-row">
                <label className="form-field-label">Registration Status</label>
                <div className="form-field-control">
                  <select
                    className="form-control-select"
                    value={formData.registration_status}
                    onChange={(e) => setFormData({ ...formData, registration_status: e.target.value })}
                  >
                    <option value="">-- Select Registration Status --</option>
                    {registrationStatusOptions.map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-field-row">
                <label className="form-field-label">Registration Date</label>
                <div className="form-field-control">
                  <input
                    type="text"
                    className="form-control-input"
                    value={formData.registration_date}
                    onChange={(e) => setFormData({ ...formData, registration_date: e.target.value })}
                    placeholder="e.g. 12-NOV-2026"
                  />
                </div>
              </div>

              <div className="form-field-row">
                <label className="form-field-label">Registered URL</label>
                <div className="form-field-control">
                  <input
                    type="text"
                    className="form-control-input"
                    value={formData.registered_url}
                    onChange={(e) => setFormData({ ...formData, registered_url: e.target.value })}
                    placeholder="e.g. https://portal.example.com/vendor"
                  />
                </div>
              </div>

              <div className="form-field-row">
                <label className="form-field-label">Supplier Number</label>
                <div className="form-field-control">
                  <input
                    type="text"
                    className="form-control-input"
                    value={formData.supplier_number}
                    onChange={(e) => setFormData({ ...formData, supplier_number: e.target.value })}
                    placeholder="e.g. SUP-98210"
                  />
                </div>
              </div>

              <div className="form-field-row">
                <label className="form-field-label">Company Source</label>
                <div className="form-field-control">
                  <select
                    className="form-control-select"
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  >
                    <option value="">-- Select Source --</option>
                    <option value="LinkedIn">LinkedIn</option>
                    <option value="Inbound">Inbound</option>
                    <option value="Referral">Referral</option>
                    <option value="Direct Sales">Direct Sales</option>
                    <option value="Website">Website</option>
                  </select>
                </div>
              </div>

              <div className="form-field-row">
                <label className="form-field-label">JOGET ID</label>
                <div className="form-field-control">
                  <input
                    type="text"
                    className="form-control-input"
                    style={fieldErrors.joget_id ? { borderColor: '#dc2626' } : {}}
                    value={formData.joget_id}
                    onChange={(e) => {
                      setFormData({ ...formData, joget_id: e.target.value });
                      if (fieldErrors.joget_id) setFieldErrors({ ...fieldErrors, joget_id: '' });
                    }}
                    placeholder="e.g. JOGET_12345"
                  />
                  {fieldErrors.joget_id && (
                    <span style={{ color: '#dc2626', fontSize: '0.72rem', marginTop: '2px', display: 'block' }}>
                      {fieldErrors.joget_id}
                    </span>
                  )}
                </div>
              </div>

              <div className="form-field-row">
                <label className="form-field-label">Lead Count</label>
                <div className="form-field-control">
                  <input
                    type="number"
                    className="form-control-input"
                    value={formData.lead_count || ''}
                    onChange={(e) => setFormData({ ...formData, lead_count: e.target.value })}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="form-field-row align-start" style={{ gridColumn: 'span 2' }}>
                <label className="form-field-label">Remarks</label>
                <div className="form-field-control">
                  <textarea
                    rows={3}
                    className="form-control-textarea"
                    value={formData.remarks}
                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                    placeholder="Internal company notes, qualification details..."
                  />
                </div>
              </div>

              {/* Credential Protection Policy notice */}
              <div style={{
                gridColumn: '1 / -1',
                padding: '0.65rem 0.85rem',
                background: '#f8fafc',
                border: '1px dashed #cbd5e1',
                borderRadius: '6px',
                fontSize: '0.75rem',
                color: '#64748b',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}>
                <span style={{ fontSize: '0.95rem' }}>🔒</span>
                <span>
                  <strong>Credential Protection Policy:</strong> Password and Username inputs have been permanently removed from this interface to prevent accidental plaintext exposure. Stored credentials remain protected in the data layer pending cryptographic migration.
                </span>
              </div>
            </div>

            {/* SECTION 5: Sales Assignment */}
            <div style={{
              fontSize: '0.8rem',
              fontWeight: 700,
              letterSpacing: '0.03em',
              textTransform: 'uppercase',
              color: '#0f172a',
              borderBottom: '1px solid #e2e8f0',
              paddingBottom: '0.4rem',
              marginTop: '1.25rem',
              marginBottom: '0.85rem',
            }}>
              5. Sales Assignment
            </div>
            <div className="form-grid-3">
              <div className="form-field-row">
                <label className="form-field-label">Salesperson</label>
                <div className="form-field-control">
                  <input
                    type="text"
                    className="form-control-input"
                    value={formData.salesperson}
                    onChange={(e) => setFormData({ ...formData, salesperson: e.target.value })}
                    placeholder="Assigned Sales Representative"
                  />
                </div>
              </div>

              <div className="form-field-row">
                <label className="form-field-label">Prev Salesperson</label>
                <div className="form-field-control">
                  <input
                    type="text"
                    className="form-control-input"
                    value={formData.prev_salesperson}
                    onChange={(e) => setFormData({ ...formData, prev_salesperson: e.target.value })}
                    placeholder="Prior Sales Representative"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 6: Audit Information */}
            <div style={{
              fontSize: '0.8rem',
              fontWeight: 700,
              letterSpacing: '0.03em',
              textTransform: 'uppercase',
              color: '#0f172a',
              borderBottom: '1px solid #e2e8f0',
              paddingBottom: '0.4rem',
              marginTop: '1.25rem',
              marginBottom: '0.85rem',
            }}>
              6. Audit Information
            </div>
            <div className="audit-grid" style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: 'none' }}>
              <div className="audit-field">
                <label>Created By</label>
                <input type="text" readOnly value={formData.created_by || '—'} />
              </div>
              <div className="audit-field">
                <label>Created Date</label>
                <input type="text" readOnly value={formatAppDate(formData.created_at || formData.created_date) || '—'} />
              </div>
              <div className="audit-field">
                <label>Modified By</label>
                <input type="text" readOnly value={formData.modified_by || '—'} />
              </div>
              <div className="audit-field">
                <label>Modified Date</label>
                <input type="text" readOnly value={formatAppDate(formData.updated_at || formData.modified_date) || '—'} />
              </div>
            </div>

            {/* Footer Actions */}
            <div className="form-footer-bar" style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between' }}>
              <button
                type="button"
                className="btn-apex-cancel"
                onClick={handleCancelOrReturn}
              >
                Cancel
              </button>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {editingId && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ background: '#f1f5f9', color: '#0f172a' }}
                    onClick={handleDeleteCurrent}
                  >
                    Delete
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-apex-top"
                  style={{ padding: '0.5rem 1.25rem', opacity: isSubmitting ? 0.7 : 1 }}
                >
                  {isSubmitting ? 'Saving...' : editingId ? 'Apply Changes' : 'Create'}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* TAB 2: COMPANY CONTACTS */}
        {formActiveTab === 'contacts' && (
          <div className="apex-form-card" style={{ background: '#ffffff', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <input
                type="text"
                className="form-control-input"
                style={{ width: '240px' }}
                placeholder="Filter company contacts..."
                value={contactSearch}
                onChange={(e) => setContactSearch(e.target.value)}
              />
              <button
                type="button"
                className="btn-apex-top"
                onClick={() => setShowAddContactInline(!showAddContactInline)}
              >
                <IconPlus size={14} /> Add Contact Here
              </button>
            </div>

            {/* Inline Add Contact */}
            {showAddContactInline && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!inlineContactData.contact_name.trim()) return;
                  try {
                    await api.createContact({
                      ...inlineContactData,
                      company_id: editingId,
                      company_name: formData.name,
                    });
                    setShowAddContactInline(false);
                    setInlineContactData({ contact_name: '', designation: '', position_type: 'Other IT', email: '', phone: '' });
                    loadCompanyContacts();
                    if (onShowToast) onShowToast('success', 'Contact added to this company.');
                  } catch (err) {
                    if (onShowToast) onShowToast('error', err.message);
                  }
                }}
                style={{ background: '#f8fafc', padding: '1rem', borderRadius: '6px', marginBottom: '1rem', border: '1px solid #e2e8f0' }}
              >
                <h4 style={{ fontSize: '0.825rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                  New Contact for {formData.name}
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.65rem', marginBottom: '0.65rem' }}>
                  <input
                    type="text"
                    required
                    placeholder="Contact Name *"
                    className="form-control-input"
                    value={inlineContactData.contact_name}
                    onChange={(e) => setInlineContactData({ ...inlineContactData, contact_name: e.target.value })}
                  />
                  <input
                    type="text"
                    placeholder="Designation"
                    className="form-control-input"
                    value={inlineContactData.designation}
                    onChange={(e) => setInlineContactData({ ...inlineContactData, designation: e.target.value })}
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    className="form-control-input"
                    value={inlineContactData.email}
                    onChange={(e) => setInlineContactData({ ...inlineContactData, email: e.target.value })}
                  />
                  <input
                    type="text"
                    placeholder="Phone"
                    className="form-control-input"
                    value={inlineContactData.phone}
                    onChange={(e) => setInlineContactData({ ...inlineContactData, phone: e.target.value })}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                  <button type="button" className="btn-apex-cancel" onClick={() => setShowAddContactInline(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-apex-top">Save Contact</button>
                </div>
              </form>
            )}

            {/* Table of Linked Contacts */}
            {loadingContacts ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Loading contacts...</div>
            ) : companyContacts.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                No contacts currently linked to this company.
              </div>
            ) : (
              <div className="dense-table-wrapper">
                <table className="dense-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Contact Name</th>
                      <th>Designation</th>
                      <th>Position Type</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Country</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {companyContacts
                      .filter((c) => !contactSearch || (c.contact_name || '').toLowerCase().includes(contactSearch.toLowerCase()))
                      .map((ct) => (
                        <tr key={ct.id}>
                          <td>{ct.id}</td>
                          <td style={{ fontWeight: 600 }}>{ct.contact_name}</td>
                          <td>{ct.designation || '—'}</td>
                          <td>{ct.position_type || '—'}</td>
                          <td>{ct.email || '—'}</td>
                          <td>{ct.phone || ct.mobile || '—'}</td>
                          <td>{ct.country || '—'}</td>
                          <td><span className="badge badge-primary">{ct.contact_status || 'Active'}</span></td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="form-footer-bar" style={{ marginTop: '1.25rem' }}>
              <button
                type="button"
                className="btn-apex-cancel"
                onClick={handleCancelOrReturn}
              >
                Back to Company Report
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // VIEW MODE: REPORT TABLE (Screenshot 3)
  // =========================================================================
  return (
    <div>
      {/* Validation Rules Modal */}
      <ValidationRulesModal
        isOpen={showValidationRules}
        onClose={() => setShowValidationRules(false)}
      />

      {/* Select Columns Modal */}
      <SelectColumnsModal
        isOpen={showColumnsModal}
        onClose={() => setShowColumnsModal(false)}
        allColumns={COMPANY_ALL_COLUMNS}
        visibleColumnKeys={visibleColumnKeys}
        defaultVisibleKeys={DEFAULT_COMPANY_COLUMN_KEYS}
        onApply={(newKeys) => {
          setVisibleColumnKeys(newKeys);
          try {
            localStorage.setItem('company_visible_columns', JSON.stringify(newKeys));
          } catch (e) {}
          if (onShowToast) onShowToast('success', `Updated report columns (${newKeys.length} visible).`);
        }}
      />

      {/* Interactive Filter Modal */}
      <ApexFilterModal
        isOpen={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        columns={COMPANY_ALL_COLUMNS.map((c) => ({ id: c.key, label: c.label }))}
        onApplyFilter={(f) => {
          if (!f) {
            setFilters(initialFilterState);
          } else {
            setFilters((prev) => ({
              ...prev,
              [f.column]: f.value,
            }));
            setShowFilters(true);
          }
          setPage(1);
        }}
      />

      {/* Quick Chart Modal */}
      <ApexChartModal
        isOpen={showChartModal}
        onClose={() => setShowChartModal(false)}
        title="Company Data Distribution Chart"
        data={companies}
        groupByColumns={[
          { id: 'industry', label: 'Industry' },
          { id: 'employee_size', label: 'Employee Size' },
          { id: 'company_type', label: 'Company Type' },
          { id: 'country', label: 'Country' },
          { id: 'technology', label: 'Technology' },
        ]}
      />

      {/* Upload CSV Modal */}
      <UploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        entityType="Company"
        onUploadSuccess={() => {
          loadCompanies();
          fetchKpis();
          if (onRefreshStats) onRefreshStats();
          if (onShowToast) onShowToast('success', 'Companies uploaded successfully.');
        }}
      />

      {/* Top Header Row matching Screenshot 3 */}
      <div className="apex-page-header-row">
        <h1 className="apex-page-heading">Company</h1>

        <div className="apex-top-actions">
          <button
            type="button"
            className={`btn-apex-top ${showFilters ? 'btn-active-filter' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            Show Filters
          </button>

          <button
            type="button"
            className="btn-apex-top"
            onClick={() => {
              if (onNavigateToUpload) onNavigateToUpload();
              else window.location.hash = '#/upload/companies';
            }}
          >
            Upload Company
          </button>

          <button
            type="button"
            className="btn-apex-top"
            onClick={handleDownloadCsv}
          >
            Download
          </button>

          <button
            type="button"
            className="btn-apex-top"
            onClick={handleBulkDelete}
            disabled={selectedIds.size === 0}
            style={{ opacity: selectedIds.size === 0 ? 0.7 : 1 }}
          >
            Delete {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
          </button>
        </div>
      </div>

      {/* APEX Interactive Report Toolbar Card */}
      <div className="apex-ir-card">
        <div className="apex-ir-left">
          {/* Search Bar (Industry Style) */}
          <form onSubmit={handleGoSearch} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
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
              value={limit}
              onChange={(e) => {
                const val = e.target.value === 'all' ? 'all' : parseInt(e.target.value, 10);
                setLimit(val);
                setPage(1);
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
              onClick={() => setShowActionsMenu((prev) => !prev)}
            >
              <span>Actions</span>
              <IconChevronDown size={13} />
            </button>

            <ApexActionsMenu
              isOpen={showActionsMenu}
              onClose={() => setShowActionsMenu(false)}
              onOpenColumns={() => setShowColumnsModal(true)}
              onOpenFilter={() => setShowFilterModal(true)}
              onOpenAggregate={() => setShowAggregateModal(true)}
              onOpenGroupBy={() => setShowChartModal(true)}
              onToggleFilter={() => setShowFilters((prev) => !prev)}
              onDownload={handleDownloadCsv}
              onOpenChart={() => setShowChartModal(true)}
              onRefresh={loadCompanies}
              onResetReport={() => {
                setVisibleColumnKeys(DEFAULT_COMPANY_COLUMN_KEYS);
                try {
                  localStorage.removeItem('company_visible_columns');
                } catch (e) {}
                setFilters(initialFilterState);
                setActiveSearch('');
                setSearchInput('');
                setShowFilters(false);
                setLimit(50);
                setPage(1);
                if (onShowToast) onShowToast('info', 'Report reset to default configuration.');
              }}
              onChangeRows={(newRows) => {
                setLimit(newRows);
                setPage(1);
              }}
              currentRows={limit}
            />
          </div>
        </div>

        <div className="apex-ir-right">
          {/* Validation Rules */}
          <button
            type="button"
            className="btn-apex-validation-rules"
            onClick={() => setShowValidationRules(true)}
          >
            <span style={{ fontSize: '0.95rem' }}>ⓘ</span>
            <span>Validation Rules</span>
          </button>

          {/* Create Button */}
          <button
            type="button"
            className="btn-apex-create"
            onClick={handleOpenCreate}
          >
            Create
          </button>
        </div>
      </div>

      {/* Full 6-Column Filter Panel matching Screenshot */}
      {showFilters && (
        <form onSubmit={handleApplyFilters} className="company-filters-card">
          <div className="company-filters-grid">
            {/* ROW 1 */}
            <div className="company-filter-field">
              <input
                type="number"
                placeholder="ID from"
                className="company-filter-input"
                value={filters.id_from}
                onChange={(e) => setFilters({ ...filters, id_from: e.target.value })}
              />
            </div>

            <div className="company-filter-field">
              <input
                type="number"
                placeholder="ID to"
                className="company-filter-input"
                value={filters.id_to}
                onChange={(e) => setFilters({ ...filters, id_to: e.target.value })}
              />
            </div>

            <div className="company-filter-field">
              <label className="company-filter-label">Company Name</label>
              <select
                className="company-filter-select"
                value={filters.comp_name}
                onChange={(e) => setFilters({ ...filters, comp_name: e.target.value })}
              >
                <option value=""></option>
                {filterOptions.companyNames.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>

            <div className="company-filter-field">
              <label className="company-filter-label">Technology</label>
              <select
                className="company-filter-select"
                value={filters.technology}
                onChange={(e) => setFilters({ ...filters, technology: e.target.value })}
              >
                <option value=""></option>
                {filterOptions.technologies.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="company-filter-field">
              <label className="company-filter-label">Company Type</label>
              <select
                className="company-filter-select"
                value={filters.company_type}
                onChange={(e) => setFilters({ ...filters, company_type: e.target.value })}
              >
                <option value=""></option>
                {filterOptions.companyTypes.map((ct) => (
                  <option key={ct} value={ct}>{ct}</option>
                ))}
              </select>
            </div>

            <div className="company-filter-field">
              <label className="company-filter-label">Categories</label>
              <select
                className="company-filter-select"
                value={filters.company_categories}
                onChange={(e) => setFilters({ ...filters, company_categories: e.target.value })}
              >
                <option value=""></option>
                {filterOptions.categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* ROW 2 */}
            <div className="company-filter-field">
              <label className="company-filter-label">Country</label>
              <select
                className="company-filter-select"
                value={filters.country}
                onChange={(e) => setFilters({ ...filters, country: e.target.value })}
              >
                <option value=""></option>
                {filterOptions.countries.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="company-filter-field">
              <label className="company-filter-label">City</label>
              <select
                className="company-filter-select"
                value={filters.city}
                onChange={(e) => setFilters({ ...filters, city: e.target.value })}
              >
                <option value=""></option>
                {filterOptions.cities.map((city) => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>

            <div className="company-filter-field">
              <label className="company-filter-label">Website</label>
              <input
                type="text"
                placeholder="Website"
                className="company-filter-input"
                value={filters.website}
                onChange={(e) => setFilters({ ...filters, website: e.target.value })}
              />
            </div>

            <div className="company-filter-field">
              <label className="company-filter-label">Lead Count</label>
              <select
                className="company-filter-select"
                value={filters.lead_count}
                onChange={(e) => setFilters({ ...filters, lead_count: e.target.value })}
              >
                <option value=""></option>
                {filterOptions.leadCounts.map((lc) => (
                  <option key={lc} value={lc}>{lc}</option>
                ))}
              </select>
            </div>

            <div className="company-filter-field">
              <label className="company-filter-label">Employee Size</label>
              <select
                className="company-filter-select"
                value={filters.employee_size}
                onChange={(e) => setFilters({ ...filters, employee_size: e.target.value })}
              >
                <option value=""></option>
                {filterOptions.employeeSizes.map((es) => (
                  <option key={es} value={es}>{es}</option>
                ))}
              </select>
            </div>

            <div className="company-filter-field">
              <label className="company-filter-label">Contact Count</label>
              <input
                type="number"
                placeholder="Contact Count"
                className="company-filter-input"
                value={filters.contact_count}
                onChange={(e) => setFilters({ ...filters, contact_count: e.target.value })}
              />
            </div>

            {/* ROW 3 */}
            <div className="company-filter-field">
              <label className="company-filter-label">Source</label>
              <select
                className="company-filter-select"
                value={filters.source}
                onChange={(e) => setFilters({ ...filters, source: e.target.value })}
              >
                <option value=""></option>
                {filterOptions.sources.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="company-filter-field">
              <label className="company-filter-label">Industry</label>
              <select
                className="company-filter-select"
                value={filters.industry}
                onChange={(e) => setFilters({ ...filters, industry: e.target.value })}
              >
                <option value=""></option>
                {filterOptions.industries.map((ind) => (
                  <option key={ind} value={ind}>{ind}</option>
                ))}
              </select>
            </div>

            <div className="company-filter-field">
              <label className="company-filter-label">Remark</label>
              <select
                className="company-filter-select"
                value={filters.remark}
                onChange={(e) => setFilters({ ...filters, remark: e.target.value })}
              >
                <option value=""></option>
                {filterOptions.remarks.map((rem) => (
                  <option key={rem} value={rem}>{rem}</option>
                ))}
              </select>
            </div>

            <div className="company-filter-field">
              <label className="company-filter-label">Registeration Date</label>
              <div className="company-filter-date-wrapper">
                <input
                  type="date"
                  className="company-filter-input"
                  value={filters.registration_date}
                  onChange={(e) => setFilters({ ...filters, registration_date: e.target.value })}
                />
              </div>
            </div>

            <div className="company-filter-field">
              <label className="company-filter-label">Registration Status</label>
              <select
                className="company-filter-select"
                value={filters.registration_status}
                onChange={(e) => setFilters({ ...filters, registration_status: e.target.value })}
              >
                <option value=""></option>
                {filterOptions.registrationStatuses.map((st) => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>

            <div className="company-filter-field">
              <label className="company-filter-label">Supplier Number</label>
              <select
                className="company-filter-select"
                value={filters.supplier_number}
                onChange={(e) => setFilters({ ...filters, supplier_number: e.target.value })}
              >
                <option value=""></option>
                {filterOptions.supplierNumbers.map((sn) => (
                  <option key={sn} value={sn}>{sn}</option>
                ))}
              </select>
            </div>

            {/* ROW 4 */}
            <div className="company-filter-field">
              <div className="company-filter-date-wrapper">
                <input
                  type="date"
                  placeholder="Created From"
                  className="company-filter-input"
                  value={filters.created_from}
                  onChange={(e) => setFilters({ ...filters, created_from: e.target.value })}
                  title="Created From"
                />
              </div>
            </div>

            <div className="company-filter-field">
              <div className="company-filter-date-wrapper">
                <input
                  type="date"
                  placeholder="Created To"
                  className="company-filter-input"
                  value={filters.created_to}
                  onChange={(e) => setFilters({ ...filters, created_to: e.target.value })}
                  title="Created To"
                />
              </div>
            </div>

            <div className="company-filter-field">
              <div className="company-filter-date-wrapper">
                <input
                  type="date"
                  placeholder="Modified From"
                  className="company-filter-input"
                  value={filters.modified_from}
                  onChange={(e) => setFilters({ ...filters, modified_from: e.target.value })}
                  title="Modified From"
                />
              </div>
            </div>

            <div className="company-filter-field">
              <div className="company-filter-date-wrapper">
                <input
                  type="date"
                  placeholder="Modified To"
                  className="company-filter-input"
                  value={filters.modified_to}
                  onChange={(e) => setFilters({ ...filters, modified_to: e.target.value })}
                  title="Modified To"
                />
              </div>
            </div>

            <div className="company-filter-field">
              <label className="company-filter-label">Created By</label>
              <select
                className="company-filter-select"
                value={filters.created_by}
                onChange={(e) => setFilters({ ...filters, created_by: e.target.value })}
              >
                <option value=""></option>
                {filterOptions.createdBys.map((cb) => (
                  <option key={cb} value={cb}>{cb}</option>
                ))}
              </select>
            </div>

            <div className="company-filter-field">
              <label className="company-filter-label">Company Phone</label>
              <input
                type="text"
                placeholder="Company Phone"
                className="company-filter-input"
                value={filters.companyphone}
                onChange={(e) => setFilters({ ...filters, companyphone: e.target.value })}
              />
            </div>
          </div>

          {/* ACTION BUTTONS: Search & Clear filter */}
          <div className="company-filter-actions">
            <button type="submit" className="btn-filter-search">
              Search
            </button>
            <button type="button" className="btn-filter-clear" onClick={handleClearFilters}>
              Clear filter
            </button>
          </div>
        </form>
      )}

      {/* APEX Pagination Range Header Strip (e.g. 1 - 50 of 1,001) */}
      <div className="apex-pagination-strip">
        <span>
          {startRec} - {endRec} of {totalCount.toLocaleString()}
        </span>
        <button
          type="button"
          className="pagination-nav-btn"
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          title="Previous Page"
        >
          <IconChevronLeft size={16} />
        </button>
        <button
          type="button"
          className="pagination-nav-btn"
          disabled={endRec >= totalCount}
          onClick={() => setPage((p) => p + 1)}
          title="Next Page"
        >
          <IconChevronRight size={16} />
        </button>
      </div>

      {/* Active Aggregations Bar */}
      <ActiveAggregationsBar
        aggregations={aggregations}
        data={companies}
        onEditAggregation={() => setShowAggregateModal(true)}
        onRemoveAggregation={(id) => setAggregations((prev) => prev.filter((a) => a.id !== id))}
        onClearAll={() => setAggregations([])}
      />

      {/* Dense Wide Data Table strictly ordered matching 33 Oracle CMS Columns */}
      <div className="dense-table-wrapper" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
        {loading ? (
          <div style={{ padding: '3.5rem', textAlign: 'center', color: '#64748b' }}>
            Loading companies report...
          </div>
        ) : companies.length === 0 ? (
          <div style={{ padding: '3.5rem', textAlign: 'center', color: '#64748b' }}>
            No companies found matching current filters.
          </div>
        ) : (
          <table className="dense-table">
            <thead>
              <tr>
                <th style={{ width: '36px', textAlign: 'center' }}>
                  <span
                    style={{ cursor: 'pointer' }}
                    title="Select Columns"
                    onClick={() => setShowColumnsModal(true)}
                  >
                    ✎
                  </span>
                </th>
                <th style={{ width: '36px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    className="table-checkbox"
                    checked={totalCount > 0 && selectedIds.size === totalCount}
                    ref={(el) => {
                      if (el) {
                        el.indeterminate = selectedIds.size > 0 && selectedIds.size < totalCount;
                      }
                    }}
                    onChange={handleToggleSelectAll}
                    title={
                      selectedIds.size === totalCount && totalCount > 0
                        ? `All ${totalCount} records throughout report selected`
                        : `Select all ${totalCount} records throughout report`
                    }
                  />
                </th>
                {visibleColumns.map((col) => (
                  <th
                    key={col.key}
                    onClick={(e) => handleHeaderClick(e, col)}
                    style={{
                      cursor: 'pointer',
                      userSelect: 'none',
                      whiteSpace: 'nowrap',
                      transition: 'background-color 0.15s ease',
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = '#f1f5f9';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                    title={`Click to sort, filter, or configure ${col.label}`}
                  >
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <span>{col.label}</span>
                      {sortBy === col.key && (
                        <span style={{ fontSize: '0.75rem', color: '#2563eb' }}>
                          {sortOrder === 'ASC' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {companies.map((company) => {
                const isSelected = selectedIds.has(company.id);

                return (
                  <tr key={company.id} className={isSelected ? 'selected' : ''}>
                    {/* Edit icon */}
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        className="row-edit-btn"
                        onClick={() => handleOpenEdit(company)}
                        title="Edit Company Form"
                        style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b', padding: '2px' }}
                      >
                        <IconFilePenLine size={15} />
                      </button>
                    </td>

                    {/* Checkbox */}
                    <td style={{ textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        className="table-checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelectOne(company.id)}
                      />
                    </td>

                    {visibleColumns.map((col) => (
                      <td key={col.key}>{col.render(company, handleOpenEdit)}</td>
                    ))}
                  </tr>
                );
              })}
            </tbody>

            {/* Summary Aggregations Footer */}
            {aggregations.length > 0 && (
              <tfoot style={{ backgroundColor: '#f8fafc', borderTop: '2px solid #cbd5e1', fontWeight: 700 }}>
                <tr>
                  <td colSpan={2} style={{ padding: '8px 12px', fontSize: '0.8rem', color: '#475569', textAlign: 'right' }}>
                    Summary:
                  </td>
                  {visibleColumns.map((col) => {
                    const aggForCol = aggregations.filter((a) => a.columnKey === col.key);
                    return (
                      <td key={col.key} style={{ padding: '8px 12px' }}>
                        {aggForCol.map((agg) => (
                          <div key={agg.id} style={{ fontSize: '0.775rem' }}>
                            <span style={{ color: '#64748b' }}>{agg.func}: </span>
                            <span style={{ color: '#2563eb' }}>{computeAggregationValue(companies, agg.func, agg.columnKey)}</span>
                          </div>
                        ))}
                      </td>
                    );
                  })}
                </tr>
              </tfoot>
            )}
          </table>
        )}
      </div>

      {/* Aggregate Modal */}
      <ApexAggregateModal
        isOpen={showAggregateModal}
        onClose={() => setShowAggregateModal(false)}
        columns={COMPANY_ALL_COLUMNS}
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
      {/* Oracle APEX Interactive Column Header Menu */}
      <ApexColumnHeaderMenu
        isOpen={headerMenu.isOpen}
        column={headerMenu.column}
        anchorRect={headerMenu.anchorRect}
        data={companies}
        sortConfig={{ key: sortBy, direction: sortOrder ? sortOrder.toLowerCase() : null }}
        onSort={handleMenuSort}
        onHideColumn={handleMenuHideColumn}
        onControlBreak={handleMenuControlBreak}
        onFilterValue={handleMenuFilterValue}
        onClose={() => setHeaderMenu({ isOpen: false, column: null, anchorRect: null })}
      />
    </div>
  );
}
