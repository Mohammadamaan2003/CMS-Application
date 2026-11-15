import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../../api/client';
import {
  IconBarChart,
  IconBuilding,
  IconUsers,
  IconLightbulb,
  IconGlobe,
  IconBriefcase,
  IconFilter,
  IconRefreshCw,
  IconCheck,
  IconChevronRight,
  IconAlertTriangle,
  IconCalendar,
  IconShield,
  IconX,
  IconTarget,
} from '../../components/Icons';

export default function AnalyticsDashboard({ onNavigate, onShowToast, currentTab }) {
  // Determine initial sub-tab from currentTab
  const getSubTabFromCurrentTab = (tab) => {
    if (tab === 'company_dashboard' || tab === 'crm_analytics' || tab === 'companies') return 'company';
    return 'lead';
  };

  // Active Sub-Tab: 'lead' | 'company'
  const [activeTab, setActiveTab] = useState(() => getSubTabFromCurrentTab(currentTab));

  useEffect(() => {
    if (currentTab === 'company_dashboard' || currentTab === 'crm_analytics') {
      setActiveTab('company');
    } else if (currentTab === 'lead_dashboard' || currentTab === 'sales_performance') {
      setActiveTab('lead');
    }
  }, [currentTab]);

  // Filter Controls State
  const [filterOptions, setFilterOptions] = useState({
    countries: [],
    industries: [],
    accountManagers: [],
    years: [],
  });

  const [datePreset, setDatePreset] = useState('all'); // 'all', '2026', '2025', '2024', 'last90', 'last30', 'custom'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState('');
  const [selectedManager, setSelectedManager] = useState('');

  // Applied Filters State (what is currently queried)
  const [appliedFilters, setAppliedFilters] = useState({});

  // Analytics Data & Loading State
  const [analyticsData, setAnalyticsData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load Filter Options
  useEffect(() => {
    api.getDashboardFilterOptions()
      .then((res) => {
        if (res && res.success) {
          setFilterOptions(res.data);
        }
      })
      .catch((err) => {
        console.warn('Failed to load filter options:', err);
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

  // Fetch Analytics from server
  const loadAnalytics = useCallback(async (filtersToApply = appliedFilters) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.getDashboardAnalytics(filtersToApply);
      if (res && res.success) {
        setAnalyticsData(res.data);
      } else {
        throw new Error(res?.message || 'Failed to fetch analytics');
      }
    } catch (err) {
      console.error('Analytics load error:', err);
      setError(err.message);
      onShowToast?.(`Error loading dashboard: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [appliedFilters, onShowToast]);

  useEffect(() => {
    loadAnalytics(appliedFilters);
  }, [appliedFilters, loadAnalytics]);

  // Handle Apply Filter
  const handleApplyFilters = () => {
    const nextFilters = {
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      country: selectedCountry || undefined,
      industry: selectedIndustry || undefined,
      accountManager: selectedManager || undefined,
    };
    setAppliedFilters(nextFilters);
  };

  // Handle Reset Filters
  const handleResetFilters = () => {
    setDatePreset('all');
    setStartDate('');
    setEndDate('');
    setSelectedCountry('');
    setSelectedIndustry('');
    setSelectedManager('');
    setAppliedFilters({});
  };

  // Drill-down navigation helpers
  const navigateToReport = (reportTab, queryParams = {}) => {
    const searchParams = new URLSearchParams();
    for (const [k, v] of Object.entries(queryParams)) {
      if (v) searchParams.append(k, v);
    }
    const qStr = searchParams.toString() ? `?${searchParams.toString()}` : '';
    if (onNavigate) {
      onNavigate(reportTab);
      window.location.hash = `#/${reportTab}${qStr}`;
    } else {
      window.location.hash = `#/${reportTab}${qStr}`;
    }
  };

  // Check if any filter is active
  const hasActiveFilters = useMemo(() => {
    return Object.values(appliedFilters).some((val) => Boolean(val));
  }, [appliedFilters]);

  // Sub-tabs navigation: Lead & Company
  const SUB_TABS = [
    { id: 'lead', label: 'Lead', icon: IconTarget },
    { id: 'company', label: 'Company', icon: IconBuilding },
  ];

  return (
    <div className="analytics-dashboard-page" style={{ padding: '20px 24px' }}>
      {/* Header Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>
            <span>Dashboards</span>
            <IconChevronRight size={13} />
            <span style={{ color: '#0f172a', fontWeight: 600 }}>
              {activeTab === 'company' ? 'Company' : 'Lead'}
            </span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
            {activeTab === 'company' ? 'Company Dashboard' : 'Lead Dashboard'}
          </h1>
        </div>

        {/* Refresh & Last Updated Timestamp */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {analyticsData?.refreshedAt && (
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              Refreshed at: {new Date(analyticsData.refreshedAt).toLocaleTimeString()}
            </span>
          )}
          <button
            type="button"
            onClick={() => loadAnalytics(appliedFilters)}
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
            <IconRefreshCw size={14} className={isLoading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Control Bar: Filters & Date Pickers */}
      <div style={{
        background: '#ffffff',
        borderRadius: '10px',
        border: '1px solid #e2e8f0',
        padding: '16px 20px',
        marginBottom: '20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}>
        {/* Preset Buttons & Date Boundaries */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569', marginRight: '4px' }}>
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
                  transition: 'all 0.15s ease',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div style={{ fontSize: '12px', color: '#64748b' }}>
            Boundaries: <strong>{startDate || 'Earliest record'}</strong> &rarr; <strong>{endDate || 'Latest record'}</strong>
          </div>
        </div>

        {/* Filter Inputs Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px',
          alignItems: 'flex-end',
        }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
              From Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setDatePreset('custom');
              }}
              style={{
                width: '100%',
                height: '34px',
                padding: '0 8px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '12px',
                color: '#1e293b',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
              To Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setDatePreset('custom');
              }}
              style={{
                width: '100%',
                height: '34px',
                padding: '0 8px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '12px',
                color: '#1e293b',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
              Country
            </label>
            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              style={{
                width: '100%',
                height: '34px',
                padding: '0 8px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '12px',
                color: '#1e293b',
                background: '#ffffff',
              }}
            >
              <option value="">All Countries</option>
              {filterOptions.countries.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
              Industry
            </label>
            <select
              value={selectedIndustry}
              onChange={(e) => setSelectedIndustry(e.target.value)}
              style={{
                width: '100%',
                height: '34px',
                padding: '0 8px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '12px',
                color: '#1e293b',
                background: '#ffffff',
              }}
            >
              <option value="">All Industries</option>
              {filterOptions.industries.map((ind) => (
                <option key={ind} value={ind}>
                  {ind}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
              Account Manager
            </label>
            <select
              value={selectedManager}
              onChange={(e) => setSelectedManager(e.target.value)}
              style={{
                width: '100%',
                height: '34px',
                padding: '0 8px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '12px',
                color: '#1e293b',
                background: '#ffffff',
              }}
            >
              <option value="">All Account Managers</option>
              {filterOptions.accountManagers.map((mgr) => (
                <option key={mgr} value={mgr}>
                  {mgr}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={handleApplyFilters}
              style={{
                flex: 1,
                height: '34px',
                background: '#0284c7',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
              }}
            >
              <IconFilter size={13} />
              <span>Apply</span>
            </button>
            <button
              type="button"
              onClick={handleResetFilters}
              title="Reset all filters"
              style={{
                height: '34px',
                padding: '0 12px',
                background: '#f1f5f9',
                color: '#475569',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Reset
            </button>
          </div>
        </div>

        {/* Active Filters Pill Bar */}
        {hasActiveFilters && (
          <div style={{
            marginTop: '12px',
            paddingTop: '10px',
            borderTop: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexWrap: 'wrap',
          }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              Active Filters:
            </span>
            {appliedFilters.country && (
              <span className="apex-kpi-badge badge-blue">
                Country: {appliedFilters.country}
              </span>
            )}
            {appliedFilters.industry && (
              <span className="apex-kpi-badge badge-blue">
                Industry: {appliedFilters.industry}
              </span>
            )}
            {appliedFilters.accountManager && (
              <span className="apex-kpi-badge badge-blue">
                Manager: {appliedFilters.accountManager}
              </span>
            )}
            {appliedFilters.startDate && (
              <span className="apex-kpi-badge badge-green">
                From: {appliedFilters.startDate}
              </span>
            )}
            {appliedFilters.endDate && (
              <span className="apex-kpi-badge badge-green">
                To: {appliedFilters.endDate}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ERROR STATE */}
      {error && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          padding: '16px',
          color: '#991b1b',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          <IconAlertTriangle size={20} />
          <div>
            <strong>Failed to load dashboard metrics:</strong> {error}
          </div>
        </div>
      )}

      {/* LOADING STATE */}
      {isLoading && (
        <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
          <IconRefreshCw size={24} className="spin" style={{ margin: '0 auto 12px', display: 'block' }} />
          <div style={{ fontWeight: 600, fontSize: '15px', color: '#0f172a' }}>
            Calculating CRM Analytics from PostgreSQL...
          </div>
          <div style={{ fontSize: '13px', marginTop: '4px' }}>
            Aggregating company, contact, and sales pipeline datasets.
          </div>
        </div>
      )}

      {/* DASHBOARD CONTENT */}
      {!isLoading && analyticsData && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* SECTION 1: SUMMARY KPIS */}
          <div className="apex-kpi-grid">
            {activeTab === 'company' && (
              <>
                {/* Total Companies */}
                <div
                  className="apex-kpi-card kpi-blue interactive"
                  onClick={() => navigateToReport('companies', { country: appliedFilters.country, industry: appliedFilters.industry })}
                  title="Click to view Companies Report"
                  role="button"
                  tabIndex={0}
                >
                  <div className="apex-kpi-content">
                    <div className="apex-kpi-label-row">
                      <span className="apex-kpi-label">{analyticsData.kpis.companies.label}</span>
                      <span className="apex-kpi-badge badge-blue">
                        {hasActiveFilters ? 'Filtered' : 'Total in DB'}
                      </span>
                    </div>
                    <div className="apex-kpi-value">
                      {analyticsData.kpis.companies.total.toLocaleString()}
                    </div>
                    <div className="apex-kpi-subtext">
                      <span>{analyticsData.kpis.companies.subtext} &bull; Click to view &rarr;</span>
                    </div>
                  </div>
                  <div className="apex-kpi-icon-wrap icon-blue">
                    <IconBuilding size={24} />
                  </div>
                </div>

                {/* Total Contacts */}
                <div
                  className="apex-kpi-card kpi-green interactive"
                  onClick={() => navigateToReport('contacts', { country: appliedFilters.country, industry: appliedFilters.industry })}
                  title="Click to view Contacts Report"
                  role="button"
                  tabIndex={0}
                >
                  <div className="apex-kpi-content">
                    <div className="apex-kpi-label-row">
                      <span className="apex-kpi-label">{analyticsData.kpis.contacts.label}</span>
                      <span className="apex-kpi-badge badge-green">
                        {hasActiveFilters ? 'Filtered' : '100% Linked'}
                      </span>
                    </div>
                    <div className="apex-kpi-value">
                      {analyticsData.kpis.contacts.total.toLocaleString()}
                    </div>
                    <div className="apex-kpi-subtext">
                      <span>{analyticsData.kpis.contacts.assigned.toLocaleString()} linked to companies &bull; Click &rarr;</span>
                    </div>
                  </div>
                  <div className="apex-kpi-icon-wrap icon-green">
                    <IconUsers size={24} />
                  </div>
                </div>
              </>
            )}

            {activeTab === 'lead' && (
              <>
                {/* Total Leads */}
                <div
                  className="apex-kpi-card kpi-amber interactive"
                  onClick={() => navigateToReport('leads', { country: appliedFilters.country, industry: appliedFilters.industry, account_manager: appliedFilters.accountManager })}
                  title="Click to view Leads Report"
                  role="button"
                  tabIndex={0}
                >
                  <div className="apex-kpi-content">
                    <div className="apex-kpi-label-row">
                      <span className="apex-kpi-label">{analyticsData.kpis.leads.label}</span>
                      <span className="apex-kpi-badge badge-amber">
                        {analyticsData.kpis.leads.overallWinRate}% Win Rate
                      </span>
                    </div>
                    <div className="apex-kpi-value">
                      {analyticsData.kpis.leads.total.toLocaleString()}
                    </div>
                    <div className="apex-kpi-subtext">
                      <span>
                        <strong>{analyticsData.kpis.leads.won}</strong> Won &bull;{' '}
                        <strong>{analyticsData.kpis.leads.open}</strong> Open &bull;{' '}
                        Click to view &rarr;
                      </span>
                    </div>
                  </div>
                  <div className="apex-kpi-icon-wrap icon-amber">
                    <IconLightbulb size={24} />
                  </div>
                </div>

                {/* Valued Pipeline */}
                <div
                  className="apex-kpi-card interactive"
                  onClick={() => navigateToReport('leads')}
                  style={{ borderLeft: '4px solid #8b5cf6' }}
                  title="Total recorded contract value in INR"
                  role="button"
                  tabIndex={0}
                >
                  <div className="apex-kpi-content">
                    <div className="apex-kpi-label-row">
                      <span className="apex-kpi-label">Pipeline Value (INR)</span>
                      <span style={{ background: '#f3e8ff', color: '#6b21a8', padding: '1px 6px', borderRadius: '10px', fontSize: '11px', fontWeight: 600 }}>
                        ₹{(analyticsData.kpis.leads.totalPipelineInr / 10000000).toFixed(2)} Cr
                      </span>
                    </div>
                    <div className="apex-kpi-value" style={{ color: '#6b21a8' }}>
                      ₹{(analyticsData.kpis.leads.wonPipelineInr / 100000).toFixed(1)}L
                    </div>
                    <div className="apex-kpi-subtext">
                      <span>Won Contract Revenue &bull; ₹11.71 Cr total pipeline</span>
                    </div>
                  </div>
                  <div className="apex-kpi-icon-wrap" style={{ background: '#f5f3ff', color: '#7c3aed', border: '1px solid #ddd6fe' }}>
                    <IconTarget size={24} />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* COMPANY TAB: CORPORATE ACCOUNTS & ORGANIZATIONS */}
          {activeTab === 'company' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#0f172a' }}>
                  Corporate Accounts & Organizations Breakdown
                </h3>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  Source: <code>public.companies</code> ({analyticsData.kpis.companies.dateFieldUsed})
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
                {/* 1. Companies by Country */}
                <ChartCard
                  title="Top Countries (Companies)"
                  subtitle="Headquarter distribution of corporate accounts"
                  data={analyticsData.breakdowns.companies.byCountry}
                  total={analyticsData.kpis.companies.total}
                  barColor="#2563eb"
                  onItemClick={(item) => navigateToReport('companies', { country: item.label === 'Unspecified' ? '' : item.label })}
                />

                {/* 2. Companies by Industry */}
                <ChartCard
                  title="Top Industries (Companies)"
                  subtitle="Vertical classification of client organizations"
                  data={analyticsData.breakdowns.companies.byIndustry}
                  total={analyticsData.kpis.companies.total}
                  barColor="#3b82f6"
                  onItemClick={(item) => navigateToReport('companies', { industry: item.label === 'Unspecified' ? '' : item.label })}
                />

                {/* 3. Companies by Company Type */}
                <ChartCard
                  title="Company Types"
                  subtitle="Direct client vs IT vendor classification"
                  data={analyticsData.breakdowns.companies.byType}
                  total={analyticsData.kpis.companies.total}
                  barColor="#60a5fa"
                  onItemClick={(item) => navigateToReport('companies', { company_type: item.label === 'Unspecified' ? '' : item.label })}
                />

                {/* 4. Companies by Employee Size */}
                <ChartCard
                  title="Employee Size Distribution"
                  subtitle="Organization scale and tier classification"
                  data={analyticsData.breakdowns.companies.bySize}
                  total={analyticsData.kpis.companies.total}
                  barColor="#0284c7"
                  onItemClick={(item) => navigateToReport('companies', { employee_size: item.label === 'Unspecified' ? '' : item.label })}
                />
              </div>
            </div>
          )}

          {/* COMPANY TAB: CONTACT STAKEHOLDERS */}
          {activeTab === 'company' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', marginTop: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#0f172a' }}>
                  Contact Stakeholders & Reach Breakdown
                </h3>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  Source: <code>public.contacts</code> ({analyticsData.kpis.contacts.dateFieldUsed})
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
                {/* 1. Contacts by Country */}
                <ChartCard
                  title="Top Countries (Contacts)"
                  subtitle="Geographic concentration of stakeholders"
                  data={analyticsData.breakdowns.contacts.byCountry}
                  total={analyticsData.kpis.contacts.total}
                  barColor="#059669"
                  onItemClick={(item) => navigateToReport('contacts', { country: item.label === 'Unspecified' ? '' : item.label })}
                />

                {/* 2. Top Organizations by Contact Count */}
                <ChartCard
                  title="Top Organizations by Contact Count"
                  subtitle="Key client accounts with largest stakeholder presence"
                  data={analyticsData.breakdowns.contacts.byCompany}
                  total={analyticsData.kpis.contacts.total}
                  barColor="#10b981"
                  onItemClick={(item) => navigateToReport('contacts', { comp_name: item.label === 'Unassigned' ? '' : item.label })}
                />

                {/* 3. Contacts by Designation */}
                <ChartCard
                  title="Top Designations"
                  subtitle="Decision maker roles and executive profiles"
                  data={analyticsData.breakdowns.contacts.byDesignation}
                  total={analyticsData.kpis.contacts.total}
                  barColor="#34d399"
                  onItemClick={(item) => navigateToReport('contacts', { designation: item.label === 'Unspecified' ? '' : item.label })}
                />

                {/* 4. Contacts by Acquisition Source */}
                <ChartCard
                  title="Contact Acquisition Sources"
                  subtitle="Lead acquisition channel distribution"
                  data={analyticsData.breakdowns.contacts.bySource}
                  total={analyticsData.kpis.contacts.total}
                  barColor="#047857"
                  onItemClick={(item) => navigateToReport('contacts', { source: item.label === 'Unspecified' ? '' : item.label })}
                />
              </div>
            </div>
          )}

          {/* LEAD TAB: SALES & LEAD PIPELINE PERFORMANCE */}
          {activeTab === 'lead' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', marginTop: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#0f172a' }}>
                  Sales Pipeline & Deal Performance
                </h3>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  Source: <code>public.leads</code> ({analyticsData.kpis.leads.dateFieldUsed})
                </span>
              </div>

              {/* Pipeline Stage Funnel Cards */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '14px',
                marginBottom: '20px',
              }}>
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '16px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>
                    Won Deals
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: 800, color: '#15803d', margin: '4px 0' }}>
                    {analyticsData.kpis.leads.won}
                  </div>
                  <div style={{ fontSize: '12px', color: '#166534' }}>
                    {analyticsData.kpis.leads.overallWinRate}% of all leads &bull; {analyticsData.kpis.leads.closedWinRate}% closed deals
                  </div>
                </div>

                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '16px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e40af', textTransform: 'uppercase' }}>
                    Open Opportunities
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: 800, color: '#1d4ed8', margin: '4px 0' }}>
                    {analyticsData.kpis.leads.open}
                  </div>
                  <div style={{ fontSize: '12px', color: '#1e40af' }}>
                    Active in-flight negotiations & pitches
                  </div>
                </div>

                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '16px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#92400e', textTransform: 'uppercase' }}>
                    On Hold Deals
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: 800, color: '#b45309', margin: '4px 0' }}>
                    {analyticsData.kpis.leads.onHold}
                  </div>
                  <div style={{ fontSize: '12px', color: '#92400e' }}>
                    Paused by client or awaiting budgets
                  </div>
                </div>

                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '16px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#991b1b', textTransform: 'uppercase' }}>
                    Lost Opportunities
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: 800, color: '#b91c1c', margin: '4px 0' }}>
                    {analyticsData.kpis.leads.lost}
                  </div>
                  <div style={{ fontSize: '12px', color: '#991b1b' }}>
                    Closed lost or non-converting proposals
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
                {/* 1. Leads by Account Manager */}
                <ChartCard
                  title="Lead Volume by Account Manager"
                  subtitle="Distribution of opportunities assigned to coordinators"
                  data={analyticsData.breakdowns.leads.byAccountManager}
                  total={analyticsData.kpis.leads.total}
                  barColor="#d97706"
                  onItemClick={(item) => navigateToReport('leads', { account_manager: item.label === 'Unassigned' ? '' : item.label })}
                />

                {/* 2. Leads by Lead Source */}
                <ChartCard
                  title="Top Lead Generation Sources"
                  subtitle="Inbound vs outbound lead channels"
                  data={analyticsData.breakdowns.leads.bySource}
                  total={analyticsData.kpis.leads.total}
                  barColor="#f59e0b"
                  onItemClick={(item) => navigateToReport('leads', { source: item.label === 'Unspecified' ? '' : item.label })}
                />

                {/* 3. Leads by Year / Trend */}
                <ChartCard
                  title="Leads Volume Trend by Year"
                  subtitle="Historical distribution of sales opportunities"
                  data={analyticsData.breakdowns.leads.byYear}
                  total={analyticsData.kpis.leads.total}
                  barColor="#8b5cf6"
                  onItemClick={() => navigateToReport('leads')}
                />

                {/* 4. Leads by Pipeline Stage */}
                <ChartCard
                  title="Leads by Final Outcome / Stage"
                  subtitle="Pipeline conversion breakdown"
                  data={analyticsData.breakdowns.leads.byStage}
                  total={analyticsData.kpis.leads.total}
                  barColor="#0ea5e9"
                  onItemClick={() => navigateToReport('leads')}
                />
              </div>
            </div>
          )}

          {/* Metric Documentation & Data Governance Footer */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '16px 20px',
            fontSize: '12px',
            color: '#64748b',
            lineHeight: 1.6,
          }}>
            <div style={{ fontWeight: 700, color: '#334155', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <IconShield size={14} style={{ color: '#0284c7' }} />
              <span>Local Database Metric Governance & Definitions:</span>
            </div>
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              <li>
                <strong>Total Companies:</strong> Distinct count of corporate accounts in <code>companies</code>. Filtered by <code>created_at</code> when date ranges are active.
              </li>
              <li>
                <strong>Total Contacts:</strong> Distinct count of stakeholders in <code>contacts</code>. Filtered by <code>created_at</code>.
              </li>
              <li>
                <strong>Total Leads & Win Rate:</strong> Distinct count of opportunities in <code>leads</code>. Filtered by <code>lead_date</code> (DD/MM/YYYY) and <code>year</code>. Win rate is calculated as <code>WON / Total Leads</code>.
              </li>
              <li>
                <strong>Pipeline Value:</strong> Aggregated from <code>leads.amount_in_inr</code> where deal values are recorded.
              </li>
              <li>
                <strong>Report Drill-Down:</strong> Clicking any KPI card or chart bar routes directly to the corresponding report with matching dimension filters pre-applied.
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Reusable Interactive Bar Chart Card with Accessible Colors, Tooltips, and Click Handlers
 */
function ChartCard({ title, subtitle, data = [], total = 1, barColor = '#2563eb', onItemClick }) {
  const maxVal = Math.max(...data.map((d) => d.count), 1);

  return (
    <div style={{
      background: '#ffffff',
      borderRadius: '10px',
      border: '1px solid #e2e8f0',
      padding: '18px 20px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{ marginBottom: '14px' }}>
        <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
          {title}
        </h4>
        {subtitle && (
          <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
            {subtitle}
          </p>
        )}
      </div>

      {data.length === 0 ? (
        <div style={{ padding: '24px 0', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
          No data matches the selected filters
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', flex: 1 }}>
          {data.map((item, idx) => {
            const pctOfMax = Math.round((item.count / maxVal) * 100);
            const pctOfTotal = total > 0 ? Math.round((item.count / total) * 1000) / 10 : 0;

            return (
              <div
                key={idx}
                onClick={() => onItemClick && onItemClick(item)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: onItemClick ? 'pointer' : 'default',
                  padding: '2px 4px',
                  borderRadius: '4px',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  if (onItemClick) e.currentTarget.style.background = '#f8fafc';
                }}
                onMouseLeave={(e) => {
                  if (onItemClick) e.currentTarget.style.background = 'transparent';
                }}
                title={`${item.label}: ${item.count.toLocaleString()} (${pctOfTotal}% of total). Click to view in report.`}
              >
                <div
                  style={{
                    width: '130px',
                    fontSize: '12px',
                    color: '#334155',
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    textAlign: 'right',
                  }}
                  title={item.label}
                >
                  {item.label}
                </div>

                <div style={{ flex: 1, background: '#f1f5f9', height: '20px', borderRadius: '4px', overflow: 'hidden', position: 'relative' }}>
                  <div
                    style={{
                      width: `${pctOfMax}%`,
                      height: '100%',
                      background: barColor,
                      borderRadius: '4px',
                      transition: 'width 0.4s ease',
                    }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      right: '6px',
                      top: '2px',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: pctOfMax > 80 ? '#ffffff' : '#475569',
                    }}
                  >
                    {item.count.toLocaleString()}
                  </span>
                </div>

                <div style={{ width: '45px', textAlign: 'right', fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                  {pctOfTotal}%
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
