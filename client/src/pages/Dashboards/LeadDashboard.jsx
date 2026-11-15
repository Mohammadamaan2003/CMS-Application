import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../../api/client';
import ChartCard from '../../components/ChartCard';
import MultiSelectDropdown from '../../components/MultiSelectDropdown';
import {
  IconLightbulb,
  IconTarget,
  IconFilter,
  IconRefreshCw,
  IconChevronRight,
  IconAlertTriangle,
  IconShield,
  IconUsers,
  IconBarChart,
  IconBuilding,
  IconMonitor,
  IconTable,
  IconColumns,
  IconShare2,
  IconCheck,
  IconX,
  IconSearch,
  IconArrowUpDown,
} from '../../components/Icons';

const IconClock = ({ size = 16, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

// APEX Page 77 Sections
const SECTIONS = [
  { id: 'overview', label: 'Overview', icon: IconBarChart },
  { id: 'sales_performance', label: 'Sales Performance', icon: IconUsers },
  { id: 'technology', label: 'Technology', icon: IconMonitor },
  { id: 'lead_details', label: 'Lead Details', icon: IconTable },
  { id: 'lead_lines_details', label: 'Lead Lines Details', icon: IconColumns },
  { id: 'lead_proposals', label: 'Lead Proposals', icon: IconShare2 },
  { id: 'lead_resources', label: 'Lead Resources', icon: IconBuilding },
];

export default function LeadDashboard({ onNavigate, onShowToast }) {
  // Active Section Tab
  const [activeSection, setActiveSection] = useState('overview');

  // Filter Drawer / Toolbar open state
  const [showFilters, setShowFilters] = useState(true);

  // Available Filter Options from Server
  const [filterOptions, setFilterOptions] = useState({
    companies: [],
    coordinators: [],
    leadTypes: [],
    industries: [],
    accountManagers: [],
    sources: [],
    countries: [],
    companyTypes: [],
    statuses: [],
    lostWon: [],
    cities: [],
    probabilities: [],
    proposals: ['Yes', 'No'],
    technologies: [],
    models: [],
    requiredServices: [],
    connectionSent: ['Yes', 'No'],
    cvSent: ['Yes', 'No'],
    years: [],
  });

  // Staged Filter Selections (user interacting in toolbar)
  const [selectedCompanies, setSelectedCompanies] = useState([]);
  const [selectedCoordinators, setSelectedCoordinators] = useState([]);
  const [selectedLeadTypes, setSelectedLeadTypes] = useState([]);
  const [selectedIndustries, setSelectedIndustries] = useState([]);
  const [selectedManagers, setSelectedManagers] = useState([]);
  const [selectedSources, setSelectedSources] = useState([]);
  const [selectedCountries, setSelectedCountries] = useState([]);
  const [selectedCompanyTypes, setSelectedCompanyTypes] = useState([]);
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [selectedLostWon, setSelectedLostWon] = useState([]);
  const [selectedCities, setSelectedCities] = useState([]);
  const [selectedProbabilities, setSelectedProbabilities] = useState([]);
  const [selectedProposals, setSelectedProposals] = useState([]);
  const [selectedConnectionSent, setSelectedConnectionSent] = useState([]);
  const [selectedTechnologies, setSelectedTechnologies] = useState([]);
  const [selectedModels, setSelectedModels] = useState([]);
  const [selectedRequiredServices, setSelectedRequiredServices] = useState([]);
  const [selectedCvSent, setSelectedCvSent] = useState([]);
  const [yearFrom, setYearFrom] = useState('');
  const [yearTo, setYearTo] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [datePreset, setDatePreset] = useState('all');

  // Applied Filters Object (what is submitted to API queries)
  const [appliedFilters, setAppliedFilters] = useState({});

  // Loading & Error States
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshedAt, setRefreshedAt] = useState(null);

  // Data Stores for Different Sections
  const [overviewData, setOverviewData] = useState(null);
  const [salesData, setSalesData] = useState(null);
  const [techData, setTechData] = useState(null);

  // Paginated Reports States
  const [leadDetails, setLeadDetails] = useState({ data: [], total: 0, page: 1, pageSize: 25, search: '' });
  const [leadLines, setLeadLines] = useState({ data: [], total: 0, page: 1, pageSize: 25, search: '' });
  const [proposals, setProposals] = useState({ data: [], total: 0, page: 1, pageSize: 25, search: '' });
  const [resources, setResources] = useState({ data: [], total: 0, page: 1, pageSize: 25, search: '' });
  const [isReportLoading, setIsReportLoading] = useState(false);

  // Load Filter Options on Mount
  useEffect(() => {
    api.getLeadFilterOptions()
      .then((res) => {
        if (res && res.success) {
          setFilterOptions(res.data);
        }
      })
      .catch((err) => {
        console.warn('Failed to load APEX Page 77 filter options:', err);
      });
  }, []);

  // Compute preset date ranges
  const handlePresetChange = (preset) => {
    setDatePreset(preset);
    const today = new Date();
    const formatDate = (d) => d.toISOString().split('T')[0];

    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    } else if (preset === '2026') {
      setStartDate('2026-01-01');
      setEndDate('2026-12-31');
    } else if (preset === '2025') {
      setStartDate('2025-01-01');
      setEndDate('2025-12-31');
    } else if (preset === '2024') {
      setStartDate('2024-01-01');
      setEndDate('2024-12-31');
    } else if (preset === 'last90') {
      const past = new Date(today);
      past.setDate(past.getDate() - 90);
      setStartDate(formatDate(past));
      setEndDate(formatDate(today));
    } else if (preset === 'last30') {
      const past = new Date(today);
      past.setDate(past.getDate() - 30);
      setStartDate(formatDate(past));
      setEndDate(formatDate(today));
    }
  };

  // Convert staged filters into request object
  const buildCurrentFilterPayload = useCallback(() => {
    const p = {};
    if (selectedCompanies.length > 0) p.company_name = selectedCompanies;
    if (selectedCoordinators.length > 0) p.name_of_coordinator = selectedCoordinators;
    if (selectedLeadTypes.length > 0) p.lead_type = selectedLeadTypes;
    if (selectedIndustries.length > 0) p.industry = selectedIndustries;
    if (selectedManagers.length > 0) p.account_manager = selectedManagers;
    if (selectedSources.length > 0) p.source = selectedSources;
    if (selectedCountries.length > 0) p.country = selectedCountries;
    if (selectedCompanyTypes.length > 0) p.company_type = selectedCompanyTypes;
    if (selectedStatuses.length > 0) p.status = selectedStatuses;
    if (selectedLostWon.length > 0) p.lost_won = selectedLostWon;
    if (selectedCities.length > 0) p.city = selectedCities;
    if (selectedProbabilities.length > 0) p.probability = selectedProbabilities;
    if (selectedProposals.length > 0) p.proposal = selectedProposals;
    if (selectedConnectionSent.length > 0) p.connection_sent = selectedConnectionSent;
    if (selectedTechnologies.length > 0) p.technology = selectedTechnologies;
    if (selectedModels.length > 0) p.model = selectedModels;
    if (selectedRequiredServices.length > 0) p.required_service = selectedRequiredServices;
    if (selectedCvSent.length > 0) p.cv_sent = selectedCvSent;
    if (yearFrom) p.year_from = yearFrom;
    if (yearTo) p.year_to = yearTo;
    if (startDate) p.start_date = startDate;
    if (endDate) p.end_date = endDate;
    return p;
  }, [
    selectedCompanies,
    selectedCoordinators,
    selectedLeadTypes,
    selectedIndustries,
    selectedManagers,
    selectedSources,
    selectedCountries,
    selectedCompanyTypes,
    selectedStatuses,
    selectedLostWon,
    selectedCities,
    selectedProbabilities,
    selectedProposals,
    selectedConnectionSent,
    selectedTechnologies,
    selectedModels,
    selectedRequiredServices,
    selectedCvSent,
    yearFrom,
    yearTo,
    startDate,
    endDate,
  ]);

  // Load Section Data
  const loadSectionData = useCallback(
    async (sectionId, filtersToUse = appliedFilters) => {
      try {
        setError(null);
        if (sectionId === 'overview') {
          setIsLoading(true);
          const res = await api.getLeadOverview(filtersToUse);
          if (res && res.success) {
            setOverviewData(res.data);
            setRefreshedAt(res.data.refreshedAt);
          }
        } else if (sectionId === 'sales_performance') {
          setIsLoading(true);
          const res = await api.getLeadSalesPerformance(filtersToUse);
          if (res && res.success) {
            setSalesData(res.data);
          }
        } else if (sectionId === 'technology') {
          setIsLoading(true);
          const res = await api.getLeadTechnology(filtersToUse);
          if (res && res.success) {
            setTechData(res.data);
          }
        } else if (sectionId === 'lead_details') {
          setIsReportLoading(true);
          const res = await api.getLeadDetailsReport({
            ...filtersToUse,
            page: leadDetails.page,
            pageSize: leadDetails.pageSize,
            search: leadDetails.search,
          });
          if (res && res.success) {
            setLeadDetails((prev) => ({ ...prev, data: res.data, total: res.total, totalPages: res.totalPages }));
          }
        } else if (sectionId === 'lead_lines_details') {
          setIsReportLoading(true);
          const res = await api.getLeadLinesReport({
            ...filtersToUse,
            page: leadLines.page,
            pageSize: leadLines.pageSize,
            search: leadLines.search,
          });
          if (res && res.success) {
            setLeadLines((prev) => ({ ...prev, data: res.data, total: res.total, totalPages: res.totalPages }));
          }
        } else if (sectionId === 'lead_proposals') {
          setIsReportLoading(true);
          const res = await api.getLeadProposalsReport({
            ...filtersToUse,
            page: proposals.page,
            pageSize: proposals.pageSize,
            search: proposals.search,
          });
          if (res && res.success) {
            setProposals((prev) => ({ ...prev, data: res.data, total: res.total, totalPages: res.totalPages }));
          }
        } else if (sectionId === 'lead_resources') {
          setIsReportLoading(true);
          const res = await api.getLeadResourcesReport({
            ...filtersToUse,
            page: resources.page,
            pageSize: resources.pageSize,
            search: resources.search,
          });
          if (res && res.success) {
            setResources((prev) => ({ ...prev, data: res.data, total: res.total, totalPages: res.totalPages }));
          }
        }
      } catch (err) {
        console.error(`Error loading section ${sectionId}:`, err);
        setError(err.message || 'Error communicating with database');
        if (onShowToast) onShowToast(err.message || 'Failed to refresh data', 'error');
      } finally {
        setIsLoading(false);
        setIsReportLoading(false);
      }
    },
    [appliedFilters, leadDetails.page, leadDetails.pageSize, leadDetails.search, leadLines.page, leadLines.pageSize, leadLines.search, proposals.page, proposals.pageSize, proposals.search, resources.page, resources.pageSize, resources.search, onShowToast]
  );

  // Trigger loading when activeSection or appliedFilters changes
  useEffect(() => {
    loadSectionData(activeSection, appliedFilters);
  }, [activeSection, appliedFilters, loadSectionData]);

  // Handle Apply Filters
  const handleApplyFilters = () => {
    const nextFilters = buildCurrentFilterPayload();
    setAppliedFilters(nextFilters);
  };

  // Handle Reset Filters
  const handleResetFilters = () => {
    setSelectedCompanies([]);
    setSelectedCoordinators([]);
    setSelectedLeadTypes([]);
    setSelectedIndustries([]);
    setSelectedManagers([]);
    setSelectedSources([]);
    setSelectedCountries([]);
    setSelectedCompanyTypes([]);
    setSelectedStatuses([]);
    setSelectedLostWon([]);
    setSelectedCities([]);
    setSelectedProbabilities([]);
    setSelectedProposals([]);
    setSelectedConnectionSent([]);
    setSelectedTechnologies([]);
    setSelectedModels([]);
    setSelectedRequiredServices([]);
    setSelectedCvSent([]);
    setYearFrom('');
    setYearTo('');
    setStartDate('');
    setEndDate('');
    setDatePreset('all');
    setAppliedFilters({});
  };

  // Helper to remove a single active filter pill
  const handleRemoveFilter = (key, valToRemove = null) => {
    if (key === 'company_name') {
      const next = selectedCompanies.filter((v) => v !== valToRemove);
      setSelectedCompanies(next);
      setAppliedFilters((prev) => ({ ...prev, company_name: next.length > 0 ? next : undefined }));
    } else if (key === 'name_of_coordinator') {
      const next = selectedCoordinators.filter((v) => v !== valToRemove);
      setSelectedCoordinators(next);
      setAppliedFilters((prev) => ({ ...prev, name_of_coordinator: next.length > 0 ? next : undefined }));
    } else if (key === 'account_manager') {
      const next = selectedManagers.filter((v) => v !== valToRemove);
      setSelectedManagers(next);
      setAppliedFilters((prev) => ({ ...prev, account_manager: next.length > 0 ? next : undefined }));
    } else if (key === 'industry') {
      const next = selectedIndustries.filter((v) => v !== valToRemove);
      setSelectedIndustries(next);
      setAppliedFilters((prev) => ({ ...prev, industry: next.length > 0 ? next : undefined }));
    } else if (key === 'country') {
      const next = selectedCountries.filter((v) => v !== valToRemove);
      setSelectedCountries(next);
      setAppliedFilters((prev) => ({ ...prev, country: next.length > 0 ? next : undefined }));
    } else if (key === 'lost_won') {
      const next = selectedLostWon.filter((v) => v !== valToRemove);
      setSelectedLostWon(next);
      setAppliedFilters((prev) => ({ ...prev, lost_won: next.length > 0 ? next : undefined }));
    } else if (key === 'technology') {
      const next = selectedTechnologies.filter((v) => v !== valToRemove);
      setSelectedTechnologies(next);
      setAppliedFilters((prev) => ({ ...prev, technology: next.length > 0 ? next : undefined }));
    } else if (key === 'year_range') {
      setYearFrom('');
      setYearTo('');
      setAppliedFilters((prev) => {
        const copy = { ...prev };
        delete copy.year_from;
        delete copy.year_to;
        return copy;
      });
    } else if (key === 'date_range') {
      setStartDate('');
      setEndDate('');
      setDatePreset('all');
      setAppliedFilters((prev) => {
        const copy = { ...prev };
        delete copy.start_date;
        delete copy.end_date;
        return copy;
      });
    }
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    for (const [k, v] of Object.entries(appliedFilters)) {
      if (Array.isArray(v)) count += v.length;
      else if (v) count += 1;
    }
    return count;
  }, [appliedFilters]);

  // Drill down to CRM report
  const navigateToReport = (target, queryParams = {}) => {
    if (!onNavigate) return;
    const cleanParams = {};
    for (const [k, v] of Object.entries(queryParams)) {
      if (v) cleanParams[k] = v;
    }
    const queryString = new URLSearchParams(cleanParams).toString();
    const hash = queryString ? `#/${target}?${queryString}` : `#/${target}`;
    window.location.hash = hash;
    onNavigate(target);
  };

  return (
    <div className="lead-dashboard-apex-page" style={{ padding: '20px 24px', background: '#f8fafc', minHeight: '100vh' }}>
      {/* ========================================================
          1. HEADER BANNER & REFRESH ACTION
          ======================================================== */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>
            <span>Dashboards</span>
            <IconChevronRight size={13} />
            <span style={{ color: '#0f172a', fontWeight: 600 }}>Lead Dashboard (APEX Page 77)</span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
            Lead Dashboard
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>
            Oracle APEX Application 136, Page 77 Model &bull; Real-time Sales, Technology & Opportunity Intelligence
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {refreshedAt && (
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              Refreshed at: {new Date(refreshedAt).toLocaleTimeString()}
            </span>
          )}
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              background: showFilters ? '#e0f2fe' : '#ffffff',
              border: showFilters ? '1px solid #38bdf8' : '1px solid #cbd5e1',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              color: showFilters ? '#0369a1' : '#334155',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            }}
          >
            <IconFilter size={14} />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span style={{ background: '#0284c7', color: '#ffffff', borderRadius: '10px', padding: '0 6px', fontSize: '11px' }}>
                {activeFilterCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => loadSectionData(activeSection, appliedFilters)}
            title="Refresh dashboard data"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              fontSize: '13px',
              color: '#334155',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            }}
          >
            <IconRefreshCw size={14} className={isLoading || isReportLoading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ========================================================
          2. APEX PAGE 77 FILTER TOOLBAR / PANEL
          ======================================================== */}
      {showFilters && (
        <div
          style={{
            background: '#ffffff',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            padding: '18px 20px',
            marginBottom: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          {/* Quick Date Range Presets */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569', marginRight: '4px', textTransform: 'uppercase' }}>
                Time Period:
              </span>
              {[
                { id: 'all', label: 'All Time' },
                { id: '2026', label: '2026' },
                { id: '2025', label: '2025' },
                { id: '2024', label: '2024' },
                { id: 'last90', label: 'Last 90 Days' },
                { id: 'last30', label: 'Last 30 Days' },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handlePresetChange(p.id)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: datePreset === p.id ? 600 : 500,
                    border: '1px solid',
                    borderColor: datePreset === p.id ? '#0284c7' : '#cbd5e1',
                    background: datePreset === p.id ? '#f0f9ff' : '#ffffff',
                    color: datePreset === p.id ? '#0284c7' : '#475569',
                    cursor: 'pointer',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div style={{ fontSize: '12px', color: '#64748b' }}>
              Lead Date Field: <code>leads.lead_date</code> (DD/MM/YYYY)
            </div>
          </div>

          {/* Core APEX Filters Grid (19 Filters) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: '12px',
              alignItems: 'flex-start',
            }}
          >
            {/* 1. Company Name */}
            <MultiSelectDropdown
              label="Company Name"
              options={filterOptions.companies}
              selected={selectedCompanies}
              onChange={setSelectedCompanies}
              placeholder="All Companies"
            />

            {/* 2. Coordinator */}
            <MultiSelectDropdown
              label="Coordinator"
              options={filterOptions.coordinators}
              selected={selectedCoordinators}
              onChange={setSelectedCoordinators}
              placeholder="All Coordinators"
            />

            {/* 3. Account Manager */}
            <MultiSelectDropdown
              label="Salesperson / Mgr"
              options={filterOptions.accountManagers}
              selected={selectedManagers}
              onChange={setSelectedManagers}
              placeholder="All Managers"
            />

            {/* 4. Industry */}
            <MultiSelectDropdown
              label="Industry"
              options={filterOptions.industries}
              selected={selectedIndustries}
              onChange={setSelectedIndustries}
              placeholder="All Industries"
            />

            {/* 5. Country */}
            <MultiSelectDropdown
              label="Country"
              options={filterOptions.countries}
              selected={selectedCountries}
              onChange={setSelectedCountries}
              placeholder="All Countries"
            />

            {/* 6. City */}
            <MultiSelectDropdown
              label="City"
              options={filterOptions.cities}
              selected={selectedCities}
              onChange={setSelectedCities}
              placeholder="All Cities"
            />

            {/* 7. Status */}
            <MultiSelectDropdown
              label="Status"
              options={filterOptions.statuses}
              selected={selectedStatuses}
              onChange={setSelectedStatuses}
              placeholder="All Statuses"
            />

            {/* 8. Lost/Won */}
            <MultiSelectDropdown
              label="Lost / Won"
              options={filterOptions.lostWon}
              selected={selectedLostWon}
              onChange={setSelectedLostWon}
              placeholder="All Outcomes"
            />

            {/* 9. Technology (Lead & Lead Lines) */}
            <MultiSelectDropdown
              label="Technology"
              options={filterOptions.technologies}
              selected={selectedTechnologies}
              onChange={setSelectedTechnologies}
              placeholder="All Technologies"
            />

            {/* 10. Lead Type */}
            <MultiSelectDropdown
              label="Lead Type"
              options={filterOptions.leadTypes}
              selected={selectedLeadTypes}
              onChange={setSelectedLeadTypes}
              placeholder="All Types"
            />

            {/* 11. Company Type */}
            <MultiSelectDropdown
              label="Company Type"
              options={filterOptions.companyTypes}
              selected={selectedCompanyTypes}
              onChange={setSelectedCompanyTypes}
              placeholder="All Company Types"
            />

            {/* 12. Source */}
            <MultiSelectDropdown
              label="Source"
              options={filterOptions.sources}
              selected={selectedSources}
              onChange={setSelectedSources}
              placeholder="All Sources"
            />

            {/* 13. Probability */}
            <MultiSelectDropdown
              label="Probability"
              options={filterOptions.probabilities}
              selected={selectedProbabilities}
              onChange={setSelectedProbabilities}
              placeholder="All Probabilities"
            />

            {/* 14. Lead-line Model */}
            <MultiSelectDropdown
              label="Line Model"
              options={filterOptions.models}
              selected={selectedModels}
              onChange={setSelectedModels}
              placeholder="All Models"
            />

            {/* 15. Lead-line Required Service */}
            <MultiSelectDropdown
              label="Required Service"
              options={filterOptions.requiredServices}
              selected={selectedRequiredServices}
              onChange={setSelectedRequiredServices}
              placeholder="All Services"
            />

            {/* 16. CV Sent */}
            <MultiSelectDropdown
              label="CV Sent"
              options={filterOptions.cvSent}
              selected={selectedCvSent}
              onChange={setSelectedCvSent}
              placeholder="CV Sent (Yes/No)"
            />

            {/* 17. Connection Sent */}
            <MultiSelectDropdown
              label="Connection Sent"
              options={filterOptions.connectionSent}
              selected={selectedConnectionSent}
              onChange={setSelectedConnectionSent}
              placeholder="Connection Sent"
            />

            {/* 18. Year From & Year To */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px', textTransform: 'uppercase' }}>
                Year Range
              </label>
              <div style={{ display: 'flex', gap: '4px' }}>
                <select
                  value={yearFrom}
                  onChange={(e) => setYearFrom(e.target.value)}
                  style={{ width: '50%', height: '34px', padding: '0 4px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                >
                  <option value="">From</option>
                  {filterOptions.years.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <select
                  value={yearTo}
                  onChange={(e) => setYearTo(e.target.value)}
                  style={{ width: '50%', height: '34px', padding: '0 4px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                >
                  <option value="">To</option>
                  {filterOptions.years.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* 19. From / To Date */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px', textTransform: 'uppercase' }}>
                From / To Date
              </label>
              <div style={{ display: 'flex', gap: '4px' }}>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setDatePreset('custom');
                  }}
                  style={{ width: '50%', height: '34px', padding: '0 4px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px' }}
                  title="From Date"
                />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setDatePreset('custom');
                  }}
                  style={{ width: '50%', height: '34px', padding: '0 4px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px' }}
                  title="To Date"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons: Apply & Reset */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px', paddingTop: '14px', borderTop: '1px solid #f1f5f9' }}>
            <button
              type="button"
              onClick={handleResetFilters}
              style={{
                padding: '7px 18px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 600,
                background: '#f1f5f9',
                border: '1px solid #cbd5e1',
                color: '#475569',
                cursor: 'pointer',
              }}
            >
              Reset Filters
            </button>
            <button
              type="button"
              onClick={handleApplyFilters}
              style={{
                padding: '7px 22px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 600,
                background: '#0f172a',
                border: 'none',
                color: '#ffffff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 4px rgba(15, 23, 42, 0.15)',
              }}
            >
              <IconCheck size={14} />
              <span>Apply Filters</span>
            </button>
          </div>

          {/* Active Filter Badges Bar */}
          {activeFilterCount > 0 && (
            <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                Active Filters ({activeFilterCount}):
              </span>
              {appliedFilters.country && (Array.isArray(appliedFilters.country) ? appliedFilters.country : [appliedFilters.country]).map((c) => (
                <span key={c} className="apex-kpi-badge badge-blue" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <span>Country: {c}</span>
                  <IconX size={12} style={{ cursor: 'pointer' }} onClick={() => handleRemoveFilter('country', c)} />
                </span>
              ))}
              {appliedFilters.account_manager && (Array.isArray(appliedFilters.account_manager) ? appliedFilters.account_manager : [appliedFilters.account_manager]).map((m) => (
                <span key={m} className="apex-kpi-badge badge-blue" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <span>Mgr: {m}</span>
                  <IconX size={12} style={{ cursor: 'pointer' }} onClick={() => handleRemoveFilter('account_manager', m)} />
                </span>
              ))}
              {appliedFilters.industry && (Array.isArray(appliedFilters.industry) ? appliedFilters.industry : [appliedFilters.industry]).map((ind) => (
                <span key={ind} className="apex-kpi-badge badge-blue" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <span>Industry: {ind}</span>
                  <IconX size={12} style={{ cursor: 'pointer' }} onClick={() => handleRemoveFilter('industry', ind)} />
                </span>
              ))}
              {appliedFilters.lost_won && (Array.isArray(appliedFilters.lost_won) ? appliedFilters.lost_won : [appliedFilters.lost_won]).map((lw) => (
                <span key={lw} className="apex-kpi-badge badge-green" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <span>Outcome: {lw}</span>
                  <IconX size={12} style={{ cursor: 'pointer' }} onClick={() => handleRemoveFilter('lost_won', lw)} />
                </span>
              ))}
              {appliedFilters.technology && (Array.isArray(appliedFilters.technology) ? appliedFilters.technology : [appliedFilters.technology]).map((t) => (
                <span key={t} className="apex-kpi-badge badge-amber" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <span>Tech: {t}</span>
                  <IconX size={12} style={{ cursor: 'pointer' }} onClick={() => handleRemoveFilter('technology', t)} />
                </span>
              ))}
              {(appliedFilters.year_from || appliedFilters.year_to) && (
                <span className="apex-kpi-badge badge-blue" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <span>Years: {appliedFilters.year_from || 'Min'} &rarr; {appliedFilters.year_to || 'Max'}</span>
                  <IconX size={12} style={{ cursor: 'pointer' }} onClick={() => handleRemoveFilter('year_range')} />
                </span>
              )}
              {(appliedFilters.start_date || appliedFilters.end_date) && (
                <span className="apex-kpi-badge badge-green" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <span>Date: {appliedFilters.start_date || 'Start'} &rarr; {appliedFilters.end_date || 'End'}</span>
                  <IconX size={12} style={{ cursor: 'pointer' }} onClick={() => handleRemoveFilter('date_range')} />
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          3. APEX PAGE 77 SUB-NAVIGATION TABS (7 SECTIONS)
          ======================================================== */}
      <div style={{ display: 'flex', borderBottom: '2px solid #e2e8f0', marginBottom: '22px', gap: '6px', overflowX: 'auto' }}>
        {SECTIONS.map((sec) => {
          const Icon = sec.icon;
          const isActive = activeSection === sec.id;
          return (
            <button
              key={sec.id}
              type="button"
              onClick={() => setActiveSection(sec.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '11px 18px',
                background: 'none',
                border: 'none',
                borderBottom: isActive ? '3px solid #0284c7' : '3px solid transparent',
                color: isActive ? '#0284c7' : '#64748b',
                fontWeight: isActive ? 700 : 500,
                fontSize: '13px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              <Icon size={15} />
              <span>{sec.label}</span>
            </button>
          );
        })}
      </div>

      {/* ERROR STATE */}
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '16px', color: '#991b1b', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <IconAlertTriangle size={20} />
          <div><strong>Failed to load Lead Dashboard data:</strong> {error}</div>
        </div>
      )}

      {/* LOADING STATE */}
      {isLoading && (
        <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
          <IconRefreshCw size={26} className="spin" style={{ margin: '0 auto 12px', display: 'block', color: '#0284c7' }} />
          <div style={{ fontWeight: 600, fontSize: '15px', color: '#0f172a' }}>
            Aggregating Lead Intelligence from PostgreSQL...
          </div>
          <div style={{ fontSize: '13px', marginTop: '4px' }}>
            Calculating APEX Page 77 KPIs, conversion rates, and pipeline metrics.
          </div>
        </div>
      )}

      {/* ========================================================
          4. SECTION 1: OVERVIEW (8 KPIs, Donut, Reasons, Month, Tree)
          ======================================================== */}
      {!isLoading && activeSection === 'overview' && overviewData && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* 8 APEX Overview KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
            {/* Total Leads */}
            <div
              className="apex-kpi-card kpi-blue interactive"
              onClick={() => navigateToReport('leads')}
              title="Click to view all Leads in report"
            >
              <div className="apex-kpi-content">
                <div className="apex-kpi-label-row">
                  <span className="apex-kpi-label">Total Leads</span>
                  <span className="apex-kpi-badge badge-blue">All Leads</span>
                </div>
                <div className="apex-kpi-value">{overviewData.kpis.totalLeads.toLocaleString()}</div>
                <div className="apex-kpi-subtext"><span>Recorded in database &bull; Click &rarr;</span></div>
              </div>
              <div className="apex-kpi-icon-wrap icon-blue"><IconLightbulb size={24} /></div>
            </div>

            {/* Won Leads */}
            <div
              className="apex-kpi-card kpi-green interactive"
              onClick={() => navigateToReport('leads', { lost_won: 'Won' })}
              title="Click to view Won Leads"
            >
              <div className="apex-kpi-content">
                <div className="apex-kpi-label-row">
                  <span className="apex-kpi-label">Won Leads</span>
                  <span className="apex-kpi-badge badge-green">Won</span>
                </div>
                <div className="apex-kpi-value" style={{ color: '#15803d' }}>
                  {overviewData.kpis.wonLeads.toLocaleString()}
                </div>
                <div className="apex-kpi-subtext"><span>Successfully converted deals</span></div>
              </div>
              <div className="apex-kpi-icon-wrap icon-green"><IconCheck size={24} /></div>
            </div>

            {/* Open Leads */}
            <div
              className="apex-kpi-card interactive"
              onClick={() => navigateToReport('leads', { lost_won: 'Open' })}
              style={{ borderLeft: '4px solid #0284c7' }}
              title="Click to view Open Leads"
            >
              <div className="apex-kpi-content">
                <div className="apex-kpi-label-row">
                  <span className="apex-kpi-label">Open Leads</span>
                  <span className="apex-kpi-badge badge-blue">Active</span>
                </div>
                <div className="apex-kpi-value" style={{ color: '#0369a1' }}>
                  {overviewData.kpis.openLeads.toLocaleString()}
                </div>
                <div className="apex-kpi-subtext"><span>Active pitches & evaluations</span></div>
              </div>
              <div className="apex-kpi-icon-wrap icon-blue"><IconTarget size={24} /></div>
            </div>

            {/* On Hold */}
            <div
              className="apex-kpi-card kpi-amber interactive"
              onClick={() => navigateToReport('leads', { lost_won: 'On Hold' })}
              title="Click to view On Hold Leads"
            >
              <div className="apex-kpi-content">
                <div className="apex-kpi-label-row">
                  <span className="apex-kpi-label">On Hold</span>
                  <span className="apex-kpi-badge badge-amber">Paused</span>
                </div>
                <div className="apex-kpi-value" style={{ color: '#b45309' }}>
                  {overviewData.kpis.onHoldLeads.toLocaleString()}
                </div>
                <div className="apex-kpi-subtext"><span>Awaiting budget or deferred</span></div>
              </div>
              <div className="apex-kpi-icon-wrap icon-amber"><IconClock size={24} /></div>
            </div>

            {/* Lost Leads */}
            <div
              className="apex-kpi-card interactive"
              onClick={() => navigateToReport('leads', { lost_won: 'Lost' })}
              style={{ borderLeft: '4px solid #ef4444' }}
              title="Click to view Lost Leads"
            >
              <div className="apex-kpi-content">
                <div className="apex-kpi-label-row">
                  <span className="apex-kpi-label">Lost Leads</span>
                  <span style={{ background: '#fef2f2', color: '#991b1b', borderRadius: '10px', padding: '1px 6px', fontSize: '11px', fontWeight: 600 }}>
                    Closed Lost
                  </span>
                </div>
                <div className="apex-kpi-value" style={{ color: '#b91c1c' }}>
                  {overviewData.kpis.lostLeads.toLocaleString()}
                </div>
                <div className="apex-kpi-subtext"><span>Non-converting prospects</span></div>
              </div>
              <div className="apex-kpi-icon-wrap" style={{ background: '#fef2f2', color: '#dc2626' }}><IconX size={24} /></div>
            </div>

            {/* Win Rate */}
            <div className="apex-kpi-card" style={{ borderLeft: '4px solid #10b981' }}>
              <div className="apex-kpi-content">
                <div className="apex-kpi-label-row">
                  <span className="apex-kpi-label">Win Rate</span>
                  <span className="apex-kpi-badge badge-green">Won / Total</span>
                </div>
                <div className="apex-kpi-value" style={{ color: '#047857' }}>
                  {overviewData.kpis.winRate}%
                </div>
                <div className="apex-kpi-subtext"><span>Won leads &divide; filtered total</span></div>
              </div>
              <div className="apex-kpi-icon-wrap icon-green"><IconBarChart size={24} /></div>
            </div>

            {/* Contract Value (INR) */}
            <div className="apex-kpi-card" style={{ borderLeft: '4px solid #8b5cf6' }}>
              <div className="apex-kpi-content">
                <div className="apex-kpi-label-row">
                  <span className="apex-kpi-label">Contract Value (INR)</span>
                  <span style={{ background: '#f3e8ff', color: '#7e22ce', borderRadius: '10px', padding: '1px 6px', fontSize: '11px', fontWeight: 600 }}>
                    ₹{(overviewData.kpis.contractValueInr / 10000000).toFixed(2)} Cr
                  </span>
                </div>
                <div className="apex-kpi-value" style={{ color: '#7c3aed' }}>
                  ₹{(overviewData.kpis.contractValueInr / 100000).toFixed(1)}L
                </div>
                <div className="apex-kpi-subtext"><span>Total sum of <code>amount_in_inr</code></span></div>
              </div>
              <div className="apex-kpi-icon-wrap" style={{ background: '#f5f3ff', color: '#7c3aed' }}><IconTarget size={24} /></div>
            </div>

            {/* Avg. Time to Close (days) */}
            <div className="apex-kpi-card" style={{ borderLeft: '4px solid #f59e0b' }}>
              <div className="apex-kpi-content">
                <div className="apex-kpi-label-row">
                  <span className="apex-kpi-label">Avg. Time to Close</span>
                  <span className="apex-kpi-badge badge-amber">Days</span>
                </div>
                <div className="apex-kpi-value" style={{ color: '#d97706' }}>
                  {overviewData.kpis.avgTimeToCloseDays} <span style={{ fontSize: '15px' }}>days</span>
                </div>
                <div className="apex-kpi-subtext"><span>AVG(UPDATED_DATE - LEAD_DATE)</span></div>
              </div>
              <div className="apex-kpi-icon-wrap icon-amber"><IconClock size={24} /></div>
            </div>
          </div>

          {/* Overview Charts Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
            {/* 1. Lead Status Donut Chart */}
            <div style={{ background: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <h4 style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                Lead Status Distribution
              </h4>
              <p style={{ margin: '0 0 16px', fontSize: '12px', color: '#64748b' }}>
                Outcome breakdown across all filtered opportunities
              </p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', gap: '20px' }}>
                {/* Visual SVG Donut */}
                <div style={{ position: 'relative', width: '130px', height: '130px', flexShrink: 0 }}>
                  <svg width="130" height="130" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="38" fill="none" stroke="#e2e8f0" strokeWidth="16" />
                    {/* Slices */}
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="16"
                      strokeDasharray="238"
                      strokeDashoffset={238 - (238 * (overviewData.kpis.lostLeads / Math.max(overviewData.kpis.totalLeads, 1)))}
                      transform="rotate(-90 50 50)"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="16"
                      strokeDasharray="238"
                      strokeDashoffset={238 - (238 * (overviewData.kpis.wonLeads / Math.max(overviewData.kpis.totalLeads, 1)))}
                      transform="rotate(0 50 50)"
                    />
                  </svg>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>{overviewData.kpis.totalLeads}</span>
                    <span style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase' }}>Leads</span>
                  </div>
                </div>

                {/* Legend list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                  {overviewData.charts.statusDonut.map((item, idx) => {
                    const colorMap = {
                      Lost: '#ef4444',
                      WON: '#10b981',
                      Won: '#10b981',
                      Open: '#0284c7',
                      'On Hold': '#f59e0b',
                    };
                    const color = colorMap[item.label] || '#94a3b8';
                    const pct = overviewData.kpis.totalLeads > 0 ? Math.round((item.count / overviewData.kpis.totalLeads) * 100) : 0;
                    return (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: color }} />
                          <span style={{ color: '#334155', fontWeight: 500 }}>{item.label}</span>
                        </div>
                        <span style={{ fontWeight: 700, color: '#0f172a' }}>{item.count} ({pct}%)</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 2. Lead Lost by Reason Horizontal Bar Chart */}
            <ChartCard
              title="Lead Lost by Reason"
              subtitle="APEX Page 77: Primary causes recorded for closed lost deals"
              data={overviewData.charts.lostByReason}
              total={overviewData.kpis.lostLeads}
              barColor="#dc2626"
              onItemClick={(item) => navigateToReport('leads', { lost_won: 'Lost' })}
            />

            {/* 3. Total Leads by Month Bar Chart */}
            <ChartCard
              title="Total Leads by Calendar Month"
              subtitle="Aggregated seasonal volume across all filtered years"
              data={overviewData.charts.totalLeadsByMonth}
              total={overviewData.kpis.totalLeads}
              barColor="#0284c7"
              onItemClick={() => navigateToReport('leads')}
            />

            {/* 4. Monthly Leads Trend Summary */}
            <div style={{ background: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <h4 style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                Monthly Leads by Year (Multi-Year Trajectory)
              </h4>
              <p style={{ margin: '0 0 14px', fontSize: '12px', color: '#64748b' }}>
                Historical volume progression across recording periods
              </p>
              <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                      <th style={{ padding: '6px 8px', color: '#475569' }}>Year</th>
                      <th style={{ padding: '6px 8px', color: '#475569' }}>Month</th>
                      <th style={{ padding: '6px 8px', color: '#475569', textAlign: 'right' }}>Leads</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overviewData.charts.monthlyLeadsByYear.map((row, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '6px 8px', fontWeight: 600, color: '#0f172a' }}>{row.year}</td>
                        <td style={{ padding: '6px 8px', color: '#334155' }}>{row.month}</td>
                        <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: '#0284c7' }}>{row.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* 5. Lead Decomposition Tree (APEX Page 77 Specification) */}
          <div style={{ background: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <h4 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
              Lead Decomposition Tree
            </h4>
            <p style={{ margin: '0 0 16px', fontSize: '12px', color: '#64748b' }}>
              Hierarchical breakdown starting from Total Leads into outcomes, top loss causes, conversion drivers, and pipelines.
            </p>

            {/* Tree UI Visualization */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Root node */}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', background: '#0f172a', color: '#ffffff', padding: '8px 16px', borderRadius: '8px', width: 'fit-content', fontWeight: 700 }}>
                <IconLightbulb size={16} />
                <span>Total Leads: {overviewData.charts.decompositionTree.value.toLocaleString()}</span>
              </div>

              {/* Child Nodes: Lost, Won, Open, On Hold */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', paddingLeft: '16px', borderLeft: '3px solid #cbd5e1', marginLeft: '12px', marginTop: '6px' }}>
                {overviewData.charts.decompositionTree.children.map((child, idx) => (
                  <div key={idx} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <strong style={{ fontSize: '13px', color: '#0f172a' }}>{child.name}</strong>
                      <span style={{ fontWeight: 800, fontSize: '14px', color: child.name === 'Won' ? '#15803d' : child.name === 'Lost' ? '#b91c1c' : '#0284c7' }}>
                        {child.value.toLocaleString()}
                      </span>
                    </div>

                    {child.children && child.children.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderTop: '1px solid #e2e8f0', paddingTop: '6px' }}>
                        {child.children.map((sub, sIdx) => (
                          <div key={sIdx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#475569' }}>
                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }} title={sub.name}>
                              &bull; {sub.name}
                            </span>
                            <strong>{sub.value}</strong>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          5. SECTION 2: SALES PERFORMANCE
          ======================================================== */}
      {!isLoading && activeSection === 'sales_performance' && salesData && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Charts Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
            {/* Total Leads by Account Manager */}
            <ChartCard
              title="Total Leads by Account Manager"
              subtitle="Workload & opportunity distribution assigned to sales executives"
              data={salesData.totalLeadsByAccountManager}
              total={overviewData?.kpis?.totalLeads || 1}
              barColor="#d97706"
              onItemClick={(item) => navigateToReport('leads', { account_manager: item.label === 'Unassigned' ? '' : item.label })}
            />

            {/* Leads by Contact Report */}
            <div style={{ background: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <h4 style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                Leads by Contact Report
              </h4>
              <p style={{ margin: '0 0 14px', fontSize: '12px', color: '#64748b' }}>
                Key external client stakeholders linked to opportunity generation
              </p>
              <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                      <th style={{ padding: '6px 8px', color: '#475569' }}>Contact</th>
                      <th style={{ padding: '6px 8px', color: '#475569' }}>Company</th>
                      <th style={{ padding: '6px 8px', color: '#475569', textAlign: 'right' }}>Leads</th>
                      <th style={{ padding: '6px 8px', color: '#475569', textAlign: 'right' }}>Won</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesData.leadsByContact.map((row, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '6px 8px', fontWeight: 600, color: '#0f172a' }}>{row.contact_name}</td>
                        <td style={{ padding: '6px 8px', color: '#334155' }}>{row.company_name}</td>
                        <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: '#0284c7' }}>{row.lead_count}</td>
                        <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: '#15803d' }}>{row.won_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Sales Team Performance Comprehensive Table */}
          <div style={{ background: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <h4 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
              Sales Team Performance Matrix
            </h4>
            <p style={{ margin: '0 0 16px', fontSize: '12px', color: '#64748b' }}>
              Individual deal conversion efficiency, pipeline volume, and closed contract revenue.
            </p>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                    <th style={{ padding: '10px 12px', color: '#475569', fontWeight: 700 }}>Salesperson</th>
                    <th style={{ padding: '10px 12px', color: '#475569', fontWeight: 700, textAlign: 'right' }}>Total Leads</th>
                    <th style={{ padding: '10px 12px', color: '#475569', fontWeight: 700, textAlign: 'right' }}>Won Deals</th>
                    <th style={{ padding: '10px 12px', color: '#475569', fontWeight: 700, textAlign: 'right' }}>Open Deals</th>
                    <th style={{ padding: '10px 12px', color: '#475569', fontWeight: 700, textAlign: 'right' }}>Lost Deals</th>
                    <th style={{ padding: '10px 12px', color: '#475569', fontWeight: 700, textAlign: 'right' }}>Win Rate %</th>
                    <th style={{ padding: '10px 12px', color: '#475569', fontWeight: 700, textAlign: 'right' }}>Won Revenue (INR)</th>
                  </tr>
                </thead>
                <tbody>
                  {salesData.salesTeamPerformance.map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 600, color: '#0f172a' }}>{row.salesperson}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>{row.total_leads}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#15803d' }}>{row.won_deals}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', color: '#0369a1' }}>{row.open_deals}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', color: '#b91c1c' }}>{row.lost_deals}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700 }}>{row.win_rate_pct}%</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#7c3aed' }}>
                        ₹{parseFloat(row.won_pipeline_inr).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          6. SECTION 3: TECHNOLOGY
          ======================================================== */}
      {!isLoading && activeSection === 'technology' && techData && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
            {/* Technology by Total Leads Bar Chart */}
            <ChartCard
              title="Technology by Total Leads"
              subtitle="APEX Page 77: Opportunities categorized by core technology stack"
              data={techData.technologyByTotalLeads}
              total={overviewData?.kpis?.totalLeads || 1}
              barColor="#8b5cf6"
              onItemClick={(item) => navigateToReport('leads', { technology: item.label === 'Other' ? '' : item.label })}
            />

            {/* Countries by Total Leads (Grouped by Country and Technology) */}
            <div style={{ background: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <h4 style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                Countries by Total Leads (Country &bull; Technology)
              </h4>
              <p style={{ margin: '0 0 14px', fontSize: '12px', color: '#64748b' }}>
                Grouped by Country and Technology with distinct Lead ID counts
              </p>
              <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                      <th style={{ padding: '8px 10px', color: '#475569' }}>Country</th>
                      <th style={{ padding: '8px 10px', color: '#475569' }}>Technology</th>
                      <th style={{ padding: '8px 10px', color: '#475569', textAlign: 'right' }}>Distinct Leads</th>
                      <th style={{ padding: '8px 10px', color: '#475569', textAlign: 'right' }}>Won Leads</th>
                    </tr>
                  </thead>
                  <tbody>
                    {techData.countriesByTechnology.map((row, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 10px', fontWeight: 600, color: '#0f172a' }}>{row.country}</td>
                        <td style={{ padding: '8px 10px', color: '#334155' }}>{row.technology_name}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#0284c7' }}>{row.total_leads}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#15803d' }}>{row.won_leads}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          7. SECTION 4: LEAD DETAILS REPORT
          ======================================================== */}
      {activeSection === 'lead_details' && (
        <div style={{ background: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h4 style={{ margin: '0 0 2px', fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                Lead Details Report
              </h4>
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                Showing {leadDetails.data.length} of {leadDetails.total} records matching active filters
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="text"
                placeholder="Search leads..."
                value={leadDetails.search}
                onChange={(e) => setLeadDetails((prev) => ({ ...prev, search: e.target.value, page: 1 }))}
                style={{ height: '32px', padding: '0 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', width: '200px' }}
              />
              <button
                type="button"
                onClick={() => loadSectionData('lead_details', appliedFilters)}
                style={{ height: '32px', padding: '0 12px', background: '#0284c7', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
              >
                Search
              </button>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '8px 10px', color: '#475569' }}>Lead ID</th>
                  <th style={{ padding: '8px 10px', color: '#475569' }}>Company</th>
                  <th style={{ padding: '8px 10px', color: '#475569' }}>Coordinator</th>
                  <th style={{ padding: '8px 10px', color: '#475569' }}>Account Mgr</th>
                  <th style={{ padding: '8px 10px', color: '#475569' }}>Technology</th>
                  <th style={{ padding: '8px 10px', color: '#475569' }}>Lead Date</th>
                  <th style={{ padding: '8px 10px', color: '#475569' }}>Country</th>
                  <th style={{ padding: '8px 10px', color: '#475569' }}>Status / Outcome</th>
                  <th style={{ padding: '8px 10px', color: '#475569', textAlign: 'right' }}>Amount (INR)</th>
                </tr>
              </thead>
              <tbody>
                {leadDetails.data.map((row) => (
                  <tr
                    key={row.lead_id}
                    style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
                    onClick={() => navigateToReport('leads', { lead_id: row.lead_id })}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '8px 10px', fontWeight: 700, color: '#0284c7' }}>#{row.lead_id}</td>
                    <td style={{ padding: '8px 10px', fontWeight: 600, color: '#0f172a' }}>{row.company_name}</td>
                    <td style={{ padding: '8px 10px', color: '#334155' }}>{row.name_of_coordinator}</td>
                    <td style={{ padding: '8px 10px', color: '#334155' }}>{row.account_manager}</td>
                    <td style={{ padding: '8px 10px', color: '#64748b' }}>{row.technology}</td>
                    <td style={{ padding: '8px 10px', color: '#64748b' }}>{row.lead_date}</td>
                    <td style={{ padding: '8px 10px', color: '#334155' }}>{row.country}</td>
                    <td style={{ padding: '8px 10px' }}>
                      <span
                        className={`apex-kpi-badge ${
                          row.lost_won === 'WON' || row.lost_won === 'Won'
                            ? 'badge-green'
                            : row.lost_won === 'Lost'
                            ? 'badge-blue'
                            : 'badge-amber'
                        }`}
                      >
                        {row.lost_won || 'Open'}
                      </span>
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#7c3aed' }}>
                      ₹{parseFloat(row.amount_in_inr || 0).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              Page {leadDetails.page} of {leadDetails.totalPages || 1}
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                disabled={leadDetails.page <= 1}
                onClick={() => setLeadDetails((prev) => ({ ...prev, page: prev.page - 1 }))}
                style={{ padding: '4px 10px', fontSize: '12px', borderRadius: '4px', border: '1px solid #cbd5e1', cursor: leadDetails.page <= 1 ? 'default' : 'pointer' }}
              >
                Previous
              </button>
              <button
                type="button"
                disabled={leadDetails.page >= (leadDetails.totalPages || 1)}
                onClick={() => setLeadDetails((prev) => ({ ...prev, page: prev.page + 1 }))}
                style={{ padding: '4px 10px', fontSize: '12px', borderRadius: '4px', border: '1px solid #cbd5e1', cursor: leadDetails.page >= (leadDetails.totalPages || 1) ? 'default' : 'pointer' }}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          8. SECTION 5: LEAD LINES DETAILS REPORT
          ======================================================== */}
      {activeSection === 'lead_lines_details' && (
        <div style={{ background: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div>
              <h4 style={{ margin: '0 0 2px', fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                Lead Lines Details Report
              </h4>
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                Showing {leadLines.data.length} of {leadLines.total} lead line requirements
              </span>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '8px 10px', color: '#475569' }}>Line ID</th>
                  <th style={{ padding: '8px 10px', color: '#475569' }}>Lead ID</th>
                  <th style={{ padding: '8px 10px', color: '#475569' }}>Company</th>
                  <th style={{ padding: '8px 10px', color: '#475569' }}>Technology</th>
                  <th style={{ padding: '8px 10px', color: '#475569' }}>Model</th>
                  <th style={{ padding: '8px 10px', color: '#475569' }}>Experience</th>
                  <th style={{ padding: '8px 10px', color: '#475569', textAlign: 'right' }}>Rate</th>
                  <th style={{ padding: '8px 10px', color: '#475569', textAlign: 'right' }}>Resources</th>
                  <th style={{ padding: '8px 10px', color: '#475569', textAlign: 'right' }}>Amount (INR)</th>
                  <th style={{ padding: '8px 10px', color: '#475569' }}>CV Sent</th>
                </tr>
              </thead>
              <tbody>
                {leadLines.data.map((row) => (
                  <tr key={row.lead_line_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px 10px', fontWeight: 700, color: '#0284c7' }}>#{row.lead_line_id}</td>
                    <td style={{ padding: '8px 10px', color: '#64748b' }}>#{row.lead_id}</td>
                    <td style={{ padding: '8px 10px', fontWeight: 600, color: '#0f172a' }}>{row.company_name}</td>
                    <td style={{ padding: '8px 10px', color: '#334155' }}>{row.technology_name}</td>
                    <td style={{ padding: '8px 10px', color: '#334155' }}>{row.model}</td>
                    <td style={{ padding: '8px 10px', color: '#64748b' }}>{row.experience}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right' }}>{row.currency_code} {row.rate}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600 }}>{row.no_of_resources}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#7c3aed' }}>
                      ₹{parseFloat(row.amount_in_inr || 0).toLocaleString()}
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      <span className={`apex-kpi-badge ${row.cv_sent === 'Yes' ? 'badge-green' : 'badge-blue'}`}>
                        {row.cv_sent}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================
          9. SECTION 6: LEAD PROPOSALS REPORT
          ======================================================== */}
      {activeSection === 'lead_proposals' && (
        <div style={{ background: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ marginBottom: '14px' }}>
            <h4 style={{ margin: '0 0 2px', fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
              Lead Proposals Report
            </h4>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              Showing {proposals.data.length} of {proposals.total} sent proposals
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '8px 10px', color: '#475569' }}>Proposal ID</th>
                  <th style={{ padding: '8px 10px', color: '#475569' }}>Lead ID</th>
                  <th style={{ padding: '8px 10px', color: '#475569' }}>Company</th>
                  <th style={{ padding: '8px 10px', color: '#475569' }}>Proposal Number</th>
                  <th style={{ padding: '8px 10px', color: '#475569' }}>Date Sent</th>
                  <th style={{ padding: '8px 10px', color: '#475569' }}>Description</th>
                  <th style={{ padding: '8px 10px', color: '#475569' }}>File</th>
                </tr>
              </thead>
              <tbody>
                {proposals.data.map((row) => (
                  <tr key={row.proposal_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px 10px', fontWeight: 700, color: '#0284c7' }}>#{row.proposal_id}</td>
                    <td style={{ padding: '8px 10px', color: '#64748b' }}>#{row.lead_id}</td>
                    <td style={{ padding: '8px 10px', fontWeight: 600, color: '#0f172a' }}>{row.company_name}</td>
                    <td style={{ padding: '8px 10px', fontWeight: 600, color: '#334155' }}>{row.proposal_number}</td>
                    <td style={{ padding: '8px 10px', color: '#64748b' }}>{row.date_sent}</td>
                    <td style={{ padding: '8px 10px', color: '#475569' }}>{row.proposal_description}</td>
                    <td style={{ padding: '8px 10px', color: '#0284c7' }}>{row.file_name || 'Document'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================
          10. SECTION 7: LEAD RESOURCES REPORT
          ======================================================== */}
      {activeSection === 'lead_resources' && (
        <div style={{ background: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ marginBottom: '14px' }}>
            <h4 style={{ margin: '0 0 2px', fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
              Lead Resources Report
            </h4>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              Dedicated candidate and technical resource allocations for qualified leads
            </span>
          </div>

          {resources.data.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
              No resource allocations recorded in <code>lead_resources</code> for the selected filter set.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                    <th style={{ padding: '8px 10px', color: '#475569' }}>Resource ID</th>
                    <th style={{ padding: '8px 10px', color: '#475569' }}>Lead ID</th>
                    <th style={{ padding: '8px 10px', color: '#475569' }}>Resource Name</th>
                    <th style={{ padding: '8px 10px', color: '#475569' }}>Designation</th>
                    <th style={{ padding: '8px 10px', color: '#475569' }}>Technology</th>
                    <th style={{ padding: '8px 10px', color: '#475569' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {resources.data.map((row) => (
                    <tr key={row.resource_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px 10px', fontWeight: 700, color: '#0284c7' }}>#{row.resource_id}</td>
                      <td style={{ padding: '8px 10px', color: '#64748b' }}>#{row.lead_id}</td>
                      <td style={{ padding: '8px 10px', fontWeight: 600, color: '#0f172a' }}>{row.resource_name}</td>
                      <td style={{ padding: '8px 10px', color: '#334155' }}>{row.designation}</td>
                      <td style={{ padding: '8px 10px', color: '#334155' }}>{row.technology}</td>
                      <td style={{ padding: '8px 10px' }}>{row.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          11. METRIC GOVERNANCE & BUSINESS RULES FOOTER
          ======================================================== */}
      <div
        style={{
          marginTop: '24px',
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '16px 20px',
          fontSize: '12px',
          color: '#64748b',
          lineHeight: 1.6,
        }}
      >
        <div style={{ fontWeight: 700, color: '#334155', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <IconShield size={14} style={{ color: '#0284c7' }} />
          <span>Oracle APEX Page 77 Model &bull; Metric Governance & Data Dictionary:</span>
        </div>
        <ul style={{ margin: 0, paddingLeft: '20px' }}>
          <li>
            <strong>Total Leads:</strong> Distinct count of records in <code>leads</code> (<code>COUNT(DISTINCT l.lead_id)</code>) matching active dimension and date filters.
          </li>
          <li>
            <strong>Win Rate:</strong> Calculated strictly as won leads divided by total leads in the filtered result: <code>(Won Leads / Total Leads) &times; 100</code>, displayed to one decimal place.
          </li>
          <li>
            <strong>Contract Value (INR):</strong> Sum of <code>leads.amount_in_inr</code> across all matching leads.
          </li>
          <li>
            <strong>Avg. Time to Close (days):</strong> Average difference in days between <code>modified_date</code> (DD-MON-YYYY) and <code>lead_date</code> (DD/MM/YYYY) for leads whose status outcome is <strong>Won</strong> or <strong>Lost</strong>.
          </li>
          <li>
            <strong>Lead Line Joins & De-duplication:</strong> Line-level dimension filters (Technology, Model, Required Service, CV Sent) use correlated <code>EXISTS</code> subqueries or distinct lead ID groupings to ensure lead counts are never duplicated by multiple line items.
          </li>
        </ul>
      </div>
    </div>
  );
}
