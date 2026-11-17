import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../../api/client';
import ApexInteractiveReport from '../../components/ApexInteractiveReport';
import ExcelFilterDropdown from '../../components/ExcelFilterDropdown';
import {
  IconBuilding,
  IconUsers,
  IconFilter,
  IconRefreshCw,
  IconSearch,
  IconChevronDown,
  IconDownload,
  IconCheck,
} from '../../components/Icons';

// Sub-Navigation Tabs definition (APEX Page 74)
const DASHBOARD_TABS = [
  { id: 'company_contact_details', label: 'Company Contact Details' },
  { id: 'company_details', label: 'Company Details' },
  { id: 'contact_details', label: 'Contact Details' },
  { id: 'linkedin_by_position_type', label: 'Linkedin by Position Type' },
  { id: 'preferred_linkedin_by_position_type', label: 'Preferred Linkedin by Position Type' },
  { id: 'preferred_linkedin_by_technology', label: 'Preferred Linkedin by Technology' },
  { id: 'country_wise_position_type', label: 'Country wise Position Type' },
  { id: 'source_wise_position_type', label: 'Source wise Position Type' },
  { id: 'technology_wise_position_type', label: 'Technology Wise Position Type' },
  { id: 'technology_wise_source', label: 'Technology wise Source' },
  { id: 'registered_data', label: 'Registered Data' },
];

export default function CompanyDashboard({ onNavigate, onShowToast }) {
  // 1. Filter Dropdown Options
  const [filterOptions, setFilterOptions] = useState({
    countries: [],
    companyTypes: [],
    industries: [],
    employeeSizes: [],
    technologies: [],
    companySources: [],
    positionTypes: [],
    linkedinAccounts: [],
    salespersons: [],
    companyCategories: [],
    contactSources: [],
    preferredLinkedin: [],
    companyNames: [],
    contactNames: [],
    websites: [],
    contactCounts: [],
  });

  // 2. Active 21 Form Input State (multi-select arrays for Excel filters, strings for text/date)
  const initialFilterForm = {
    company_id: '',
    company_name: [],
    country: [],
    company_type: [],
    industry: [],
    employee_size: [],
    technology: [],
    company_source: [],
    website: [],
    contact_id: '',
    contact_name: [],
    contact_count: [],
    position_type: [],
    linkedin_connected_account: [],
    linkedin_url: '',
    salesperson: [],
    company_categories: [],
    contact_source: [],
    preferred_linkedin_connected: [],
    contact_from_date: '',
    contact_to_date: '',
  };

  const [filterForm, setFilterForm] = useState(initialFilterForm);
  const [appliedFilters, setAppliedFilters] = useState({});

  // 3. UI Toggle for Filter Panel (collapsible)
  const [showFilters, setShowFilters] = useState(true);

  // 4. KPI Counts State (queried directly from PostgreSQL database)
  const [kpis, setKpis] = useState({
    companyCount: 0,
    contactCount: 0,
  });

  // 5. Active Tab State
  const [activeTab, setActiveTab] = useState('company_contact_details');

  // 6. Report State (data, total, page, pageSize, search, sorting)
  const [reportData, setReportData] = useState([]);
  const [reportTotal, setReportTotal] = useState(0);
  const [dynamicColumns, setDynamicColumns] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);

  // Load Filter Options on mount
  useEffect(() => {
    api.getCompanyDashboardFilters()
      .then((res) => {
        if (res && res.success && res.data) {
          setFilterOptions(res.data);
        }
      })
      .catch((err) => {
        console.warn('Failed to load company dashboard filter options:', err);
      });
  }, []);

  // Fetch KPI Counts when applied filters change
  const loadKpis = useCallback(async (filters) => {
    try {
      const res = await api.getCompanyDashboardKpis(filters);
      if (res && res.success && res.data) {
        setKpis({
          companyCount: res.data.companyCount ?? 0,
          contactCount: res.data.contactCount ?? 0,
        });
      }
    } catch (err) {
      console.warn('Failed to fetch company dashboard KPIs:', err);
    }
  }, []);

  // Fetch Report Data for the active tab
  const loadReport = useCallback(async (tabId, filters, curPage, curPageSize, curSearch) => {
    try {
      setIsLoading(true);
      const params = {
        tabId,
        page: curPage,
        pageSize: curPageSize,
        search: curSearch || '',
        ...filters,
      };
      const res = await api.getCompanyDashboardReport(params);
      if (res && res.success) {
        setReportData(res.data || []);
        setReportTotal(res.total ?? 0);
        if (res.columns && res.columns.length > 0) {
          setDynamicColumns(res.columns);
        } else {
          setDynamicColumns([]);
        }
      } else {
        setReportData([]);
        setReportTotal(0);
        setDynamicColumns([]);
      }
    } catch (err) {
      console.error('Failed to load report data:', err);
      setReportData([]);
      setReportTotal(0);
      setDynamicColumns([]);
      if (onShowToast) onShowToast('Failed to load report data', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [onShowToast]);

  // Initial and reactive load on tab or filter change
  useEffect(() => {
    loadKpis(appliedFilters);
  }, [appliedFilters, loadKpis]);

  useEffect(() => {
    setSelectedRowKeys([]);
    loadReport(activeTab, appliedFilters, page, pageSize, search);
  }, [activeTab, appliedFilters, page, pageSize, loadReport]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle Search submit from filter panel
  const handleFilterSearch = (e) => {
    if (e) e.preventDefault();
    setPage(1);
    setAppliedFilters({ ...filterForm });
  };

  // Handle Clear Filters
  const handleClearFilters = () => {
    setFilterForm(initialFilterForm);
    setSearch('');
    setPage(1);
    setAppliedFilters({});
  };

  // Handle input change
  const handleInputChange = (field, value) => {
    setFilterForm((prev) => ({ ...prev, [field]: value }));
  };

  // Handle Tab Switch
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setDynamicColumns([]);
    setPage(1);
    setSelectedRowKeys([]);
  };

  // Handle Download Selected / Export CSV
  const handleDownloadSelected = () => {
    let rowsToExport = reportData;
    if (selectedRowKeys.length > 0) {
      rowsToExport = reportData.filter((r, idx) => {
        const k = getDashboardRowKey(r, idx, activeTab);
        return selectedRowKeys.map(String).includes(k);
      });
    }

    if (rowsToExport.length === 0) {
      if (onShowToast) onShowToast('No rows selected to download', 'info');
      return;
    }

    const currentTabObj = DASHBOARD_TABS.find(t => t.id === activeTab);
    const exportCols = columns && columns.length > 0
      ? columns
      : Object.keys(rowsToExport[0] || {}).map(k => ({ key: k, label: k }));
    const csvContent = [
      exportCols.map(c => `"${String(c.label || c.key).replace(/"/g, '""')}"`).join(','),
      ...rowsToExport.map((row) =>
        exportCols.map((c) => `"${String(row[c.key] ?? '').replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${currentTabObj?.id || 'report'}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    if (onShowToast) onShowToast(`Downloaded ${rowsToExport.length} rows`, 'success');
  };

  // Helper to get consistent unique key for rows across tabs
  const getDashboardRowKey = (row, idx, tab) => {
    if (!row) return String(idx);
    if (tab === 'company_contact_details') {
      return String(row.contact_id ? `${row.company_id || ''}_${row.contact_id}` : (row.id || row.company_id || idx));
    }
    if (tab === 'company_details' || tab === 'registered_data') {
      return String(row.company_id || row.id || idx);
    }
    if (tab === 'contact_details') {
      return String(row.contact_id || row.id || idx);
    }
    return String(
      row.id ||
      row.company_id ||
      row.contact_id ||
      row.linkedin_connected_account ||
      row.preferred_linkedin_connected ||
      row.country ||
      row.source ||
      row.technology ||
      idx
    );
  };

  // Column definitions for each of the 11 Tabs matching APEX Page 74 & full database schema
  const columns = useMemo(() => {
    // If backend provided dynamic pivot matrix columns (Tabs 4-10), use them directly!
    if (dynamicColumns && dynamicColumns.length > 0) {
      return dynamicColumns;
    }

    switch (activeTab) {
      case 'company_contact_details':
        return [
          // Primary columns (visible by default)
          { key: 'company_id', label: 'Company ID', minWidth: 110, sortable: true },
          { key: 'company_name', label: 'Company Name', minWidth: 180, sortable: true },
          { key: 'contact_id', label: 'Contact ID', minWidth: 100, sortable: true },
          { key: 'contact_name', label: 'Contact Name', minWidth: 160, sortable: true },
          { key: 'designation', label: 'Designation', minWidth: 160, sortable: true },
          { key: 'position_type', label: 'Position Type', minWidth: 140, sortable: true },
          { key: 'email', label: 'Email', minWidth: 180, sortable: true },
          { key: 'phone', label: 'Phone', minWidth: 130, sortable: true },
          { key: 'mobile', label: 'Mobile', minWidth: 130, sortable: true },
          { key: 'company_contacts_count', label: 'Company Contacts Count', minWidth: 150, align: 'right', sortable: true },
          { key: 'employee_size', label: 'Employee Size', minWidth: 140, sortable: true },
          { key: 'preferred_linkedin_connected', label: 'Preferred Linkedin Connected', minWidth: 190, sortable: true },
          { key: 'linkedin_connected_account', label: 'Linkedin Connected Account', minWidth: 190, sortable: true },
          { key: 'linkedin_url', label: 'LinkedIn URL', minWidth: 180, sortable: true },
          { key: 'company_type', label: 'Company Type', minWidth: 130, sortable: true },
          { key: 'company_industry', label: 'Company Industry', minWidth: 180, sortable: true },
          { key: 'company_country', label: 'Company Country', minWidth: 130, sortable: true },
          { key: 'company_technology', label: 'Company Technology', minWidth: 160, sortable: true },
          { key: 'website', label: 'Website', minWidth: 180, sortable: true },
          { key: 'city', label: 'City', minWidth: 130, sortable: true },
          { key: 'salesperson', label: 'Sales Person', minWidth: 140, sortable: true },
          { key: 'company_source', label: 'Company Source', minWidth: 130, sortable: true },
          // Extended DB columns (available via Actions > Columns shuttle)
          { key: 'contact_company_id', label: 'Contact Company Id', minWidth: 140, sortable: true, defaultHidden: true },
          { key: 'contact_company_name', label: 'Contact Company Name', minWidth: 180, sortable: true, defaultHidden: true },
          { key: 'company_contact_count', label: 'Company Contact Count', minWidth: 150, align: 'right', sortable: true, defaultHidden: true },
          { key: 'contact_country', label: 'Contact Country', minWidth: 130, sortable: true, defaultHidden: true },
          { key: 'contact_industry', label: 'Contact Industry', minWidth: 160, sortable: true, defaultHidden: true },
          { key: 'contact_source', label: 'Contact Source', minWidth: 130, sortable: true, defaultHidden: true },
          { key: 'other_email', label: 'Other Email', minWidth: 180, sortable: true, defaultHidden: true },
          { key: 'comp_email_verified', label: 'Email Verified', minWidth: 130, sortable: true, defaultHidden: true },
          { key: 'phone2', label: 'Phone 2', minWidth: 130, sortable: true, defaultHidden: true },
          { key: 'phone3', label: 'Phone 3', minWidth: 130, sortable: true, defaultHidden: true },
          { key: 'mobile2', label: 'Mobile 2', minWidth: 130, sortable: true, defaultHidden: true },
          { key: 'mobile3', label: 'Mobile 3', minWidth: 130, sortable: true, defaultHidden: true },
          { key: 'mobile_verified', label: 'Mobile Verified', minWidth: 130, sortable: true, defaultHidden: true },
          { key: 'linkedin_id', label: 'LinkedIn ID', minWidth: 140, sortable: true, defaultHidden: true },
          { key: 'comp_linkedin_id', label: 'Company LinkedIn ID', minWidth: 160, sortable: true, defaultHidden: true },
          { key: 'priority_contact', label: 'Priority Contact', minWidth: 130, sortable: true, defaultHidden: true },
          { key: 'connection_date', label: 'Connection Date', minWidth: 130, sortable: true, defaultHidden: true },
          { key: 'connection_send_by', label: 'Connection Sent By', minWidth: 150, sortable: true, defaultHidden: true },
          { key: 'contact_status', label: 'Contact Status', minWidth: 130, sortable: true, defaultHidden: true },
          { key: 'source_details', label: 'Source Details', minWidth: 140, sortable: true, defaultHidden: true },
          { key: 'data_extracted', label: 'Data Extracted Date', minWidth: 150, sortable: true, defaultHidden: true },
          { key: 'current_past', label: 'Current / Past', minWidth: 130, sortable: true, defaultHidden: true },
          { key: 'company_salesperson', label: 'Company Salesperson', minWidth: 150, sortable: true, defaultHidden: true },
          { key: 'contact_salesperson', label: 'Contact Salesperson', minWidth: 150, sortable: true, defaultHidden: true },
          { key: 'existingcomp', label: 'Existing Company', minWidth: 140, sortable: true, defaultHidden: true },
          { key: 'company_phone', label: 'Company Phone', minWidth: 140, sortable: true, defaultHidden: true },
          { key: 'company_categories', label: 'Company Categories', minWidth: 160, sortable: true, defaultHidden: true },
          { key: 'supplier_number', label: 'Supplier Number', minWidth: 140, sortable: true, defaultHidden: true },
          { key: 'registered_url', label: 'Registered URL', minWidth: 180, sortable: true, defaultHidden: true },
          { key: 'registration_status', label: 'Registration Status', minWidth: 150, sortable: true, defaultHidden: true },
          { key: 'registration_date', label: 'Registration Date', minWidth: 140, sortable: true, defaultHidden: true },
          { key: 'username', label: 'Username', minWidth: 130, sortable: true, defaultHidden: true },
          { key: 'password', label: 'Password', minWidth: 130, sortable: true, defaultHidden: true },
          { key: 'da', label: 'DA', minWidth: 100, sortable: true, defaultHidden: true },
          { key: 'company_email', label: 'Company Email', minWidth: 180, sortable: true, defaultHidden: true },
          { key: 'company_remark', label: 'Company Remark', minWidth: 180, sortable: true, defaultHidden: true },
          { key: 'contact_remark', label: 'Contact Remark', minWidth: 180, sortable: true, defaultHidden: true },
          { key: 'lead_count', label: 'Lead Count', minWidth: 110, align: 'right', sortable: true, defaultHidden: true },
          { key: 'prev_salesperson', label: 'Previous Salesperson', minWidth: 160, sortable: true, defaultHidden: true },
          { key: 'joget_id', label: 'Joget ID', minWidth: 120, sortable: true, defaultHidden: true },
          { key: 'company_created_by', label: 'Company Created By', minWidth: 150, sortable: true, defaultHidden: true },
          { key: 'company_created_date', label: 'Company Created Date', minWidth: 150, sortable: true, defaultHidden: true },
          { key: 'company_modified_by', label: 'Company Modified By', minWidth: 150, sortable: true, defaultHidden: true },
          { key: 'company_modified_date', label: 'Company Modified Date', minWidth: 150, sortable: true, defaultHidden: true },
          { key: 'contact_created_by', label: 'Contact Created By', minWidth: 150, sortable: true, defaultHidden: true },
          { key: 'contact_created_date', label: 'Contact Created Date', minWidth: 150, sortable: true, defaultHidden: true },
          { key: 'contact_modified_by', label: 'Contact Modified By', minWidth: 150, sortable: true, defaultHidden: true },
          { key: 'contact_modified_date', label: 'Contact Modified Date', minWidth: 150, sortable: true, defaultHidden: true },
        ];

      case 'company_details':
        return [
          { key: 'company_id', label: 'Company ID', minWidth: 110, sortable: true },
          { key: 'company_name', label: 'Company Name', minWidth: 200, sortable: true },
          { key: 'technology', label: 'Technology', minWidth: 180, sortable: true },
          { key: 'industry', label: 'Industry', minWidth: 180, sortable: true },
          { key: 'company_type', label: 'Company Type', minWidth: 130, sortable: true },
          { key: 'country', label: 'Country', minWidth: 130, sortable: true },
          { key: 'city', label: 'City', minWidth: 130, sortable: true },
          { key: 'employee_size', label: 'Employee Size', minWidth: 140, sortable: true },
          { key: 'website', label: 'Website', minWidth: 180, sortable: true },
          { key: 'company_phone', label: 'Company Phone', minWidth: 130, sortable: true },
          { key: 'salesperson', label: 'Sales Person', minWidth: 140, sortable: true },
          { key: 'contacts_count', label: 'Contacts Count', minWidth: 120, align: 'right', sortable: true },
          { key: 'source', label: 'Source', minWidth: 130, sortable: true },
          { key: 'company_categories', label: 'Company Categories', minWidth: 160, sortable: true },
          { key: 'registration_status', label: 'Registration Status', minWidth: 150, sortable: true },
          { key: 'created_date', label: 'Created Date', minWidth: 130, sortable: true },
          // Extended DB columns
          { key: 'existingcomp', label: 'Existing Company', minWidth: 140, sortable: true, defaultHidden: true },
          { key: 'prev_salesperson', label: 'Previous Salesperson', minWidth: 160, sortable: true, defaultHidden: true },
          { key: 'lead_count', label: 'Lead Count', minWidth: 110, align: 'right', sortable: true, defaultHidden: true },
          { key: 'registered_url', label: 'Registered URL', minWidth: 180, sortable: true, defaultHidden: true },
          { key: 'supplier_number', label: 'Supplier Number', minWidth: 140, sortable: true, defaultHidden: true },
          { key: 'registration_date', label: 'Registration Date', minWidth: 140, sortable: true, defaultHidden: true },
          { key: 'username', label: 'Username', minWidth: 130, sortable: true, defaultHidden: true },
          { key: 'password', label: 'Password', minWidth: 130, sortable: true, defaultHidden: true },
          { key: 'da', label: 'DA', minWidth: 100, sortable: true, defaultHidden: true },
          { key: 'company_email', label: 'Company Email', minWidth: 180, sortable: true, defaultHidden: true },
          { key: 'remark', label: 'Remark', minWidth: 180, sortable: true, defaultHidden: true },
          { key: 'joget_id', label: 'Joget ID', minWidth: 120, sortable: true, defaultHidden: true },
          { key: 'created_by', label: 'Created By', minWidth: 140, sortable: true, defaultHidden: true },
          { key: 'modified_by', label: 'Modified By', minWidth: 140, sortable: true, defaultHidden: true },
          { key: 'modified_date', label: 'Modified Date', minWidth: 140, sortable: true, defaultHidden: true },
        ];

      case 'contact_details':
        return [
          { key: 'contact_id', label: 'Contact ID', minWidth: 100, sortable: true },
          { key: 'contact_name', label: 'Contact Name', minWidth: 180, sortable: true },
          { key: 'company_id', label: 'Company ID', minWidth: 110, sortable: true },
          { key: 'company_name', label: 'Company Name', minWidth: 200, sortable: true },
          { key: 'designation', label: 'Designation', minWidth: 180, sortable: true },
          { key: 'position_type', label: 'Position Type', minWidth: 140, sortable: true },
          { key: 'email', label: 'Email', minWidth: 200, sortable: true },
          { key: 'phone', label: 'Phone', minWidth: 130, sortable: true },
          { key: 'mobile', label: 'Mobile', minWidth: 130, sortable: true },
          { key: 'linkedin_url', label: 'LinkedIn URL', minWidth: 200, sortable: true },
          { key: 'preferred_linkedin_connected', label: 'Preferred LinkedIn Connected', minWidth: 190, sortable: true },
          { key: 'linkedin_connected_account', label: 'LinkedIn Connected Account', minWidth: 190, sortable: true },
          { key: 'country', label: 'Country', minWidth: 130, sortable: true },
          { key: 'city', label: 'City', minWidth: 130, sortable: true },
          { key: 'industry', label: 'Industry', minWidth: 180, sortable: true },
          { key: 'technology', label: 'Technology', minWidth: 180, sortable: true },
          { key: 'salesperson', label: 'Sales Person', minWidth: 140, sortable: true },
          { key: 'source', label: 'Source', minWidth: 130, sortable: true },
          { key: 'created_date', label: 'Created Date', minWidth: 130, sortable: true },
          // Extended DB columns
          { key: 'priority_contact', label: 'Priority Contact', minWidth: 130, sortable: true, defaultHidden: true },
          { key: 'other_email', label: 'Other Email', minWidth: 180, sortable: true, defaultHidden: true },
          { key: 'comp_email_verified', label: 'Email Verified', minWidth: 130, sortable: true, defaultHidden: true },
          { key: 'email_tool_verified', label: 'Email Tool Verified', minWidth: 140, sortable: true, defaultHidden: true },
          { key: 'email_verified_by_response', label: 'Email Verified by Response', minWidth: 160, sortable: true, defaultHidden: true },
          { key: 'phone2', label: 'Phone 2', minWidth: 130, sortable: true, defaultHidden: true },
          { key: 'phone3', label: 'Phone 3', minWidth: 130, sortable: true, defaultHidden: true },
          { key: 'mobile2', label: 'Mobile 2', minWidth: 130, sortable: true, defaultHidden: true },
          { key: 'mobile3', label: 'Mobile 3', minWidth: 130, sortable: true, defaultHidden: true },
          { key: 'mobile_verified', label: 'Mobile Verified', minWidth: 130, sortable: true, defaultHidden: true },
          { key: 'linkedin_id', label: 'LinkedIn ID', minWidth: 140, sortable: true, defaultHidden: true },
          { key: 'comp_linkedin_id', label: 'Comp LinkedIn ID', minWidth: 160, sortable: true, defaultHidden: true },
          { key: 'linkedin_conn_send_acc', label: 'LinkedIn Conn Send Acc', minWidth: 180, sortable: true, defaultHidden: true },
          { key: 'connection_date', label: 'Connection Date', minWidth: 130, sortable: true, defaultHidden: true },
          { key: 'connection_send_by', label: 'Connection Send By', minWidth: 150, sortable: true, defaultHidden: true },
          { key: 'contact_status', label: 'Contact Status', minWidth: 130, sortable: true, defaultHidden: true },
          { key: 'source_details', label: 'Source Details', minWidth: 140, sortable: true, defaultHidden: true },
          { key: 'data_extracted', label: 'Data Extracted Date', minWidth: 150, sortable: true, defaultHidden: true },
          { key: 'current_past', label: 'Current / Past', minWidth: 130, sortable: true, defaultHidden: true },
          { key: 'remark', label: 'Remark', minWidth: 180, sortable: true, defaultHidden: true },
          { key: 'website', label: 'Website', minWidth: 180, sortable: true, defaultHidden: true },
          { key: 'created_by', label: 'Created By', minWidth: 140, sortable: true, defaultHidden: true },
          { key: 'modified_by', label: 'Modified By', minWidth: 140, sortable: true, defaultHidden: true },
          { key: 'modified_date', label: 'Modified Date', minWidth: 140, sortable: true, defaultHidden: true },
        ];

      case 'linkedin_by_position_type':
        return [
          { key: 'position_type', label: 'Position Type', minWidth: 220, sortable: true },
          { key: 'total_contacts', label: 'Total Contacts', minWidth: 140, align: 'right', sortable: true },
          { key: 'linkedin_available', label: 'LinkedIn Available', minWidth: 160, align: 'right', sortable: true },
          { key: 'linkedin_connected', label: 'LinkedIn Connected', minWidth: 160, align: 'right', sortable: true },
          {
            key: 'percentage_connected',
            label: '% Connected',
            minWidth: 130,
            align: 'right',
            sortable: true,
            render: (val) => `${val || 0}%`,
          },
        ];

      case 'preferred_linkedin_by_position_type':
        return [
          { key: 'position_type', label: 'Position Type', minWidth: 220, sortable: true },
          { key: 'preferred_linkedin_connected', label: 'Preferred LinkedIn Connected', minWidth: 220, sortable: true },
          { key: 'contact_count', label: 'Contact Count', minWidth: 140, align: 'right', sortable: true },
          { key: 'company_count', label: 'Company Count', minWidth: 140, align: 'right', sortable: true },
        ];

      case 'preferred_linkedin_by_technology':
        return [
          { key: 'technology', label: 'Technology', minWidth: 240, sortable: true },
          { key: 'preferred_linkedin_connected', label: 'Preferred LinkedIn Connected', minWidth: 220, sortable: true },
          { key: 'contact_count', label: 'Contact Count', minWidth: 140, align: 'right', sortable: true },
          { key: 'company_count', label: 'Company Count', minWidth: 140, align: 'right', sortable: true },
        ];

      case 'country_wise_position_type':
        return [
          { key: 'country', label: 'Country', minWidth: 180, sortable: true },
          { key: 'position_type', label: 'Position Type', minWidth: 220, sortable: true },
          { key: 'contact_count', label: 'Contact Count', minWidth: 140, align: 'right', sortable: true },
          { key: 'company_count', label: 'Company Count', minWidth: 140, align: 'right', sortable: true },
        ];

      case 'source_wise_position_type':
        return [
          { key: 'source', label: 'Source', minWidth: 180, sortable: true },
          { key: 'position_type', label: 'Position Type', minWidth: 220, sortable: true },
          { key: 'contact_count', label: 'Contact Count', minWidth: 140, align: 'right', sortable: true },
          { key: 'company_count', label: 'Company Count', minWidth: 140, align: 'right', sortable: true },
        ];

      case 'technology_wise_position_type':
        return [
          { key: 'technology', label: 'Technology', minWidth: 240, sortable: true },
          { key: 'position_type', label: 'Position Type', minWidth: 220, sortable: true },
          { key: 'contact_count', label: 'Contact Count', minWidth: 140, align: 'right', sortable: true },
          { key: 'company_count', label: 'Company Count', minWidth: 140, align: 'right', sortable: true },
        ];

      case 'technology_wise_source':
        return [
          { key: 'technology', label: 'Technology', minWidth: 240, sortable: true },
          { key: 'source', label: 'Source', minWidth: 180, sortable: true },
          { key: 'company_count', label: 'Company Count', minWidth: 140, align: 'right', sortable: true },
          { key: 'contact_count', label: 'Contact Count', minWidth: 140, align: 'right', sortable: true },
        ];

      case 'registered_data':
        return [
          { key: 'company_id', label: 'Company ID', minWidth: 110, sortable: true },
          { key: 'company_name', label: 'Company Name', minWidth: 200, sortable: true },
          { key: 'supplier_number', label: 'Supplier Number', minWidth: 150, sortable: true },
          { key: 'registration_status', label: 'Registration Status', minWidth: 160, sortable: true },
          { key: 'registered_url', label: 'Registered URL', minWidth: 200, sortable: true },
          { key: 'registration_date', label: 'Registration Date', minWidth: 150, sortable: true },
          { key: 'country', label: 'Country', minWidth: 130, sortable: true },
          { key: 'city', label: 'City', minWidth: 130, sortable: true },
          { key: 'website', label: 'Website', minWidth: 180, sortable: true },
          { key: 'username', label: 'Username', minWidth: 130, sortable: true },
          // Extended DB columns
          { key: 'password', label: 'Password', minWidth: 130, sortable: true, defaultHidden: true },
          { key: 'technology', label: 'Technology', minWidth: 180, sortable: true, defaultHidden: true },
          { key: 'industry', label: 'Industry', minWidth: 180, sortable: true, defaultHidden: true },
          { key: 'employee_size', label: 'Employee Size', minWidth: 140, sortable: true, defaultHidden: true },
          { key: 'company_type', label: 'Company Type', minWidth: 130, sortable: true, defaultHidden: true },
          { key: 'company_categories', label: 'Company Categories', minWidth: 160, sortable: true, defaultHidden: true },
          { key: 'salesperson', label: 'Sales Person', minWidth: 140, sortable: true, defaultHidden: true },
          { key: 'source', label: 'Source', minWidth: 130, sortable: true, defaultHidden: true },
          { key: 'remark', label: 'Remark', minWidth: 180, sortable: true, defaultHidden: true },
          { key: 'created_date', label: 'Created Date', minWidth: 130, sortable: true, defaultHidden: true },
        ];

      default:
        return [];
    }
  }, [activeTab, dynamicColumns]);

  return (
    <div className="company-dashboard-page" style={{ padding: '0 0.5rem 1.5rem 0.5rem' }}>
      {/* 1. TOP 21-FILTER COLLAPSIBLE PANEL */}
      {showFilters && (
        <div
          className="apex-filter-panel"
          style={{
            borderRadius: '6px', padding: '1rem 1.25rem',
            marginBottom: '1rem',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
          }}
        >
          <form onSubmit={handleFilterSearch}>
            {/* Row 1: Company ID, Company Name, Company Country, Company Type, Industry, Employee Size */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '0.75rem',
                marginBottom: '0.75rem',
              }}
            >
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Company ID
                </label>
                <input
                  type="text"
                  className="apex-form-input"
                  style={{ width: '100%', height: '34px', fontSize: '12px' }}
                  value={filterForm.company_id}
                  onChange={(e) => handleInputChange('company_id', e.target.value)}
                  placeholder=""
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Company Name
                </label>
                <ExcelFilterDropdown
                  label="Company Name"
                  options={filterOptions.companyNames}
                  value={filterForm.company_name}
                  onChange={(vals) => handleInputChange('company_name', vals)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Company Country
                </label>
                <ExcelFilterDropdown
                  label="Company Country"
                  options={filterOptions.countries}
                  value={filterForm.country}
                  onChange={(vals) => handleInputChange('country', vals)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Company Type
                </label>
                <ExcelFilterDropdown
                  label="Company Type"
                  options={filterOptions.companyTypes}
                  value={filterForm.company_type}
                  onChange={(vals) => handleInputChange('company_type', vals)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Industry
                </label>
                <ExcelFilterDropdown
                  label="Industry"
                  options={filterOptions.industries}
                  value={filterForm.industry}
                  onChange={(vals) => handleInputChange('industry', vals)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Employee Size
                </label>
                <ExcelFilterDropdown
                  label="Employee Size"
                  options={filterOptions.employeeSizes}
                  value={filterForm.employee_size}
                  onChange={(vals) => handleInputChange('employee_size', vals)}
                />
              </div>
            </div>

            {/* Row 2: Technology, Company Source, Website, Contact ID, Contact Name, Contact Count */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '0.75rem',
                marginBottom: '0.75rem',
              }}
            >
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Technology
                </label>
                <ExcelFilterDropdown
                  label="Technology"
                  options={filterOptions.technologies}
                  value={filterForm.technology}
                  onChange={(vals) => handleInputChange('technology', vals)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Company Source
                </label>
                <ExcelFilterDropdown
                  label="Company Source"
                  options={filterOptions.companySources}
                  value={filterForm.company_source}
                  onChange={(vals) => handleInputChange('company_source', vals)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Website
                </label>
                <ExcelFilterDropdown
                  label="Website"
                  options={filterOptions.websites}
                  value={filterForm.website}
                  onChange={(vals) => handleInputChange('website', vals)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Contact ID
                </label>
                <input
                  type="text"
                  className="apex-form-input"
                  style={{ width: '100%', height: '34px', fontSize: '12px' }}
                  value={filterForm.contact_id}
                  onChange={(e) => handleInputChange('contact_id', e.target.value)}
                  placeholder=""
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Contact Name
                </label>
                <ExcelFilterDropdown
                  label="Contact Name"
                  options={filterOptions.contactNames}
                  value={filterForm.contact_name}
                  onChange={(vals) => handleInputChange('contact_name', vals)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Contact Count
                </label>
                <ExcelFilterDropdown
                  label="Contact Count"
                  options={filterOptions.contactCounts}
                  value={filterForm.contact_count}
                  onChange={(vals) => handleInputChange('contact_count', vals)}
                />
              </div>
            </div>

            {/* Row 3: Position Type, Linkedin Connected Account, Linkedin URL, Sales Person, Company Categories, Contact Source */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '0.75rem',
                marginBottom: '0.75rem',
              }}
            >
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Position Type
                </label>
                <ExcelFilterDropdown
                  label="Position Type"
                  options={filterOptions.positionTypes}
                  value={filterForm.position_type}
                  onChange={(vals) => handleInputChange('position_type', vals)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Linkedin Connected Account
                </label>
                <ExcelFilterDropdown
                  label="Linkedin Connected Account"
                  options={filterOptions.linkedinAccounts}
                  value={filterForm.linkedin_connected_account}
                  onChange={(vals) => handleInputChange('linkedin_connected_account', vals)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Linkedin URL
                </label>
                <input
                  type="text"
                  className="apex-form-input"
                  style={{ width: '100%', height: '34px', fontSize: '12px' }}
                  value={filterForm.linkedin_url}
                  onChange={(e) => handleInputChange('linkedin_url', e.target.value)}
                  placeholder=""
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Sales Person
                </label>
                <ExcelFilterDropdown
                  label="Sales Person"
                  options={filterOptions.salespersons}
                  value={filterForm.salesperson}
                  onChange={(vals) => handleInputChange('salesperson', vals)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Company Categories
                </label>
                <ExcelFilterDropdown
                  label="Company Categories"
                  options={filterOptions.companyCategories}
                  value={filterForm.company_categories}
                  onChange={(vals) => handleInputChange('company_categories', vals)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Contact Source
                </label>
                <ExcelFilterDropdown
                  label="Contact Source"
                  options={filterOptions.contactSources}
                  value={filterForm.contact_source}
                  onChange={(vals) => handleInputChange('contact_source', vals)}
                />
              </div>
            </div>

            {/* Row 4: Preferred Linkedin Connected, Contact Created From Date, Contact Created To Date, [Search, Clear Filters] */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '0.75rem',
                alignItems: 'flex-end',
              }}
            >
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Preferred Linkedin Connected
                </label>
                <ExcelFilterDropdown
                  label="Preferred Linkedin Connected"
                  options={filterOptions.preferredLinkedin}
                  value={filterForm.preferred_linkedin_connected}
                  onChange={(vals) => handleInputChange('preferred_linkedin_connected', vals)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Contact Created From Date
                </label>
                <input
                  type="date"
                  className="apex-form-input"
                  style={{ width: '100%', height: '34px', fontSize: '12px' }}
                  value={filterForm.contact_from_date}
                  onChange={(e) => handleInputChange('contact_from_date', e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Contact Created To Date
                </label>
                <input
                  type="date"
                  className="apex-form-input"
                  style={{ width: '100%', height: '34px', fontSize: '12px' }}
                  value={filterForm.contact_to_date}
                  onChange={(e) => handleInputChange('contact_to_date', e.target.value)}
                />
              </div>

              {/* Action Buttons: Search and Clear Filters */}
              <div
                style={{
                  gridColumn: 'span 3',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '0.6rem',
                  marginTop: '0.5rem',
                }}
              >
                <button
                  type="submit"
                  className="btn-primary btn-filter-search"
                  style={{
                    borderRadius: '5px',
                    padding: '8px 26px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Search
                </button>
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="btn-secondary btn-filter-clear"
                  style={{
                    borderRadius: '5px',
                    padding: '8px 22px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* 2. PRIMARY KPI CARDS & SHOW/HIDE FILTER TOGGLE */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1rem',
        }}
      >
        {/* KPI Cards Row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          {/* Card 1: COMPANY */}
          <div
            style={{
              backgroundColor: 'var(--bg-card, #101a2f)',
              border: '1px solid var(--border, rgba(99, 102, 241, 0.25))',
              borderTop: '3px solid #6366f1',
              borderRadius: '8px',
              padding: '14px 28px',
              minWidth: '240px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            }}
          >
            <div
              style={{
                fontSize: '32px',
                fontWeight: 800,
                color: 'var(--accent-violet, #c084fc)',
                lineHeight: 1.1,
                fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              }}
            >
              {Number(kpis.companyCount).toLocaleString()}
            </div>
            <div
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--text-muted, #cbd5e1)',
                marginTop: '6px',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}
            >
              COMPANY
            </div>
          </div>

          {/* Card 2: CONTACT */}
          <div
            style={{
              backgroundColor: 'var(--bg-card, #101a2f)',
              border: '1px solid var(--border, rgba(20, 184, 166, 0.25))',
              borderTop: '3px solid #14b8a6',
              borderRadius: '8px',
              padding: '14px 28px',
              minWidth: '240px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            }}
          >
            <div
              style={{
                fontSize: '32px',
                fontWeight: 800,
                color: 'var(--accent-violet, #c084fc)',
                lineHeight: 1.1,
                fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              }}
            >
              {Number(kpis.contactCount).toLocaleString()}
            </div>
            <div
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--text-muted, #cbd5e1)',
                marginTop: '6px',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}
            >
              CONTACT
            </div>
          </div>
        </div>

        {/* Far Right: Show Filter / Hide Filter Button */}
        <div>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="btn-outline btn-toggle-filters"
            style={{
              borderRadius: '6px',
              padding: '8px 24px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {showFilters ? 'Hide Filter' : 'Show Filter'}
          </button>
        </div>
      </div>

      {/* 3. 11 SUB-NAVIGATION TABS */}
      <div
        style={{
          borderBottom: '1px solid var(--border, rgba(255, 255, 255, 0.12))',
          marginBottom: '1rem',
          overflowX: 'auto',
          whiteSpace: 'nowrap',
          scrollbarWidth: 'none',
        }}
      >
        <div style={{ display: 'inline-flex', gap: '1.25rem', paddingBottom: '0px' }}>
          {DASHBOARD_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  borderBottom: isActive ? '3px solid var(--accent-teal, #2dd4bf)' : '3px solid transparent',
                  padding: '8px 2px 10px 2px',
                  fontSize: '13px',
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? 'var(--text-main, #ffffff)' : 'var(--text-muted, #94a3b8)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  outline: 'none',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. INTERACTIVE REPORT REGION */}
      <ApexInteractiveReport
        key={activeTab}
        reportId={`company_dashboard_${activeTab}`}
        columns={columns}
        data={reportData}
        rowKey={(row, idx) => getDashboardRowKey(row, idx, activeTab)}
        total={reportTotal}
        page={page}
        onPageChange={(newPage) => setPage(newPage)}
        rowsPerPage={pageSize}
        onRowsPerPageChange={(newSize) => {
          setPageSize(newSize);
          setPage(1);
        }}
        search={search}
        onSearchChange={(val) => setSearch(val)}
        onSearchSubmit={() => {
          setPage(1);
          loadReport(activeTab, appliedFilters, 1, pageSize, search);
        }}
        isServerSide={true}
        isLoading={isLoading}
        selectable={true}
        selectedKeys={selectedRowKeys}
        onSelectionChange={setSelectedRowKeys}
        onRefresh={() => loadReport(activeTab, appliedFilters, page, pageSize, search)}
        toolbarButtons={
          <button
            type="button"
            onClick={handleDownloadSelected}
            className="btn-secondary btn-apex-download"
            style={{
              borderRadius: '5px',
              padding: '6px 16px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            <span>{selectedRowKeys.length > 0 ? `Download Selected (${selectedRowKeys.length})` : 'Download Report'}</span>
            {selectedRowKeys.length > 0 && (
              <span
                style={{
                  backgroundColor: '#ffffff',
                  color: '#0b1a3d',
                  borderRadius: '10px',
                  padding: '1px 6px',
                  fontSize: '11px',
                  fontWeight: 700,
                }}
              >
                {selectedRowKeys.length}
              </span>
            )}
          </button>
        }
      />
    </div>
  );
}
