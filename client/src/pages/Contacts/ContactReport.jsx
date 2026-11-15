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
  IconChevronDown,
} from '../../components/Icons';
import ValidationRulesModal from '../../components/ValidationRulesModal';
import UploadModal from '../../components/UploadModal';
import SelectColumnsModal from '../../components/SelectColumnsModal';
import ApexActionsMenu from '../../components/ApexActionsMenu';
import ApexFilterModal from '../../components/ApexFilterModal';
import ApexChartModal from '../../components/ApexChartModal';
import ApexAggregateModal from '../../components/ApexAggregateModal';
import ActiveAggregationsBar from '../../components/ActiveAggregationsBar';
import ApexColumnHeaderMenu from '../../components/ApexColumnHeaderMenu';
import { computeAggregationValue } from '../../utils/aggregationUtils';
import { api } from '../../api/client';
import { formatAppDate } from '../../utils/dateUtils';

export const CONTACT_ALL_COLUMNS = [
  {
    key: 'id',
    label: 'ID',
    render: (c) => <span style={{ color: '#475569', fontSize: '0.8rem', fontWeight: 600 }}>{c.id}</span>,
    getValue: (c) => c.id,
  },
  {
    key: 'comp_id',
    label: 'COMP_ID',
    render: (c, handleOpenEdit, onNavigateToCompany) => (
      <span style={{ color: '#475569', fontSize: '0.8rem' }}>
        {c.comp_id || c.company_id ? (
          <span
            style={{ cursor: 'pointer', color: '#1d4ed8', fontWeight: 500 }}
            onClick={() => {
              if (onNavigateToCompany) {
                onNavigateToCompany(c.comp_id || c.company_id);
              }
            }}
          >
            {c.comp_id || c.company_id}
          </span>
        ) : (
          ''
        )}
      </span>
    ),
    getValue: (c) => c.comp_id || c.company_id || '',
  },
  {
    key: 'comp_name',
    label: 'COMP_NAME',
    render: (c, handleOpenEdit, onNavigateToCompany) => (
      <span style={{ color: '#1e293b' }}>
        {c.comp_name || c.company_name ? (
          <span
            style={{ cursor: (c.comp_id || c.company_id) ? 'pointer' : 'default', color: '#0f172a', fontWeight: 500 }}
            onClick={() => {
              const cid = c.comp_id || c.company_id;
              if (cid && onNavigateToCompany) {
                onNavigateToCompany(cid);
              }
            }}
          >
            {c.comp_name || c.company_name}
          </span>
        ) : (
          ''
        )}
      </span>
    ),
    getValue: (c) => c.comp_name || c.company_name || '',
  },
  {
    key: 'contact_name',
    label: 'CONTACT_NAME',
    render: (c, handleOpenEdit) => (
      <span style={{ fontWeight: 600, color: '#1d4ed8' }}>
        <button
          type="button"
          onClick={() => handleOpenEdit && handleOpenEdit(c)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            textAlign: 'left',
            fontWeight: 600,
            color: '#1d4ed8',
          }}
          onMouseOver={(e) => (e.currentTarget.style.textDecoration = 'underline')}
          onMouseOut={(e) => (e.currentTarget.style.textDecoration = 'none')}
        >
          {c.contact_name}
        </button>
      </span>
    ),
    getValue: (c) => c.contact_name || '',
  },
  {
    key: 'designation',
    label: 'DESIGNATION',
    render: (c) => c.designation || '',
    getValue: (c) => c.designation || '',
  },
  {
    key: 'pos_type',
    label: 'POS_TYPE',
    render: (c) => c.pos_type || c.position_type || '',
    getValue: (c) => c.pos_type || c.position_type || '',
  },
  {
    key: 'priority_contact',
    label: 'PRIORITY_CONTACT',
    render: (c) => c.priority_contact || '',
    getValue: (c) => c.priority_contact || '',
  },
  {
    key: 'country',
    label: 'COUNTRY',
    render: (c) => c.country || '',
    getValue: (c) => c.country || '',
  },
  {
    key: 'industry',
    label: 'INDUSTRY',
    render: (c) => c.industry || '',
    getValue: (c) => c.industry || '',
  },
  {
    key: 'website',
    label: 'WEBSITE',
    render: (c) =>
      c.website ? (
        <a
          href={c.website.startsWith('http') ? c.website : `http://${c.website}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#2563eb', textDecoration: 'none' }}
        >
          {c.website}
        </a>
      ) : '',
    getValue: (c) => c.website || '',
  },
  {
    key: 'technology',
    label: 'TECHNOLOGY',
    render: (c) => c.technology || '',
    getValue: (c) => c.technology || '',
  },
  {
    key: 'comp_email',
    label: 'COMP_EMAIL',
    render: (c) => c.comp_email || c.email || '',
    getValue: (c) => c.comp_email || c.email || '',
  },
  {
    key: 'other_email',
    label: 'OTHER_EMAIL',
    render: (c) => c.other_email || '',
    getValue: (c) => c.other_email || '',
  },
  {
    key: 'comp_email_verified',
    label: 'COMP_EMAIL_VERIFIED',
    render: (c) => c.comp_email_verified || c.email_verified || '',
    getValue: (c) => c.comp_email_verified || c.email_verified || '',
  },
  {
    key: 'mail_tool_verified',
    label: 'MAIL_TOOL_VERIFIED',
    render: (c) => c.mail_tool_verified || c.email_tool_verified || '',
    getValue: (c) => c.mail_tool_verified || c.email_tool_verified || '',
  },
  {
    key: 'email_verified_by_response',
    label: 'EMAIL_VERIFIED_BY_RESPONSE',
    render: (c) => c.email_verified_by_response || c.email_verified_response || '',
    getValue: (c) => c.email_verified_by_response || c.email_verified_response || '',
  },
  {
    key: 'contact_phone',
    label: 'CONTACT_PHONE',
    render: (c) => c.contact_phone || c.phone || '',
    getValue: (c) => c.contact_phone || c.phone || '',
  },
  {
    key: 'contact_phone2',
    label: 'CONTACT_PHONE2',
    render: (c) => c.contact_phone2 || c.phone2 || '',
    getValue: (c) => c.contact_phone2 || c.phone2 || '',
  },
  {
    key: 'contact_phone3',
    label: 'CONTACT_PHONE3',
    render: (c) => c.contact_phone3 || c.phone3 || '',
    getValue: (c) => c.contact_phone3 || c.phone3 || '',
  },
  {
    key: 'contact_mobile',
    label: 'CONTACT_MOBILE',
    render: (c) => c.contact_mobile || c.mobile || '',
    getValue: (c) => c.contact_mobile || c.mobile || '',
  },
  {
    key: 'contact_mobile2',
    label: 'CONTACT_MOBILE2',
    render: (c) => c.contact_mobile2 || c.mobile2 || '',
    getValue: (c) => c.contact_mobile2 || c.mobile2 || '',
  },
  {
    key: 'contact_mobile3',
    label: 'CONTACT_MOBILE3',
    render: (c) => c.contact_mobile3 || c.mobile3 || '',
    getValue: (c) => c.contact_mobile3 || c.mobile3 || '',
  },
  {
    key: 'mobile_verified',
    label: 'MOBILE_VERIFIED',
    render: (c) => c.mobile_verified || '',
    getValue: (c) => c.mobile_verified || '',
  },
  {
    key: 'linkedin_url',
    label: 'LINKEDIN_URL',
    render: (c) =>
      c.linkedin_url ? (
        <a
          href={c.linkedin_url.startsWith('http') ? c.linkedin_url : `https://${c.linkedin_url}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#2563eb', textDecoration: 'none' }}
        >
          LinkedIn
        </a>
      ) : '',
    getValue: (c) => c.linkedin_url || '',
  },
  {
    key: 'linkedlnid',
    label: 'LINKEDLNID',
    render: (c) => c.linkedlnid || c.linkedin_id || '',
    getValue: (c) => c.linkedlnid || c.linkedin_id || '',
  },
  {
    key: 'comp_linkedlnid',
    label: 'COMP_LINKEDLNID',
    render: (c) => c.comp_linkedlnid || c.comp_linkedin_id || '',
    getValue: (c) => c.comp_linkedlnid || c.comp_linkedin_id || '',
  },
  {
    key: 'preferred_linkedin_connected',
    label: 'PREFERRED_LINKEDIN_CONNECTED',
    render: (c) => c.preferred_linkedin_connected || '',
    getValue: (c) => c.preferred_linkedin_connected || '',
  },
  {
    key: 'linkedin_conn_send_acc',
    label: 'LINKEDIN_CONN_SEND_ACC',
    render: (c) => c.linkedin_conn_send_acc || '',
    getValue: (c) => c.linkedin_conn_send_acc || '',
  },
  {
    key: 'linkedin_cnnctd_acc',
    label: 'LINKEDIN_CNNCTD_ACC',
    render: (c) => c.linkedin_cnnctd_acc || c.linkedin_connected_acc || '',
    getValue: (c) => c.linkedin_cnnctd_acc || c.linkedin_connected_acc || '',
  },
  {
    key: 'connection_send_by',
    label: 'CONNECTION_SEND_BY',
    render: (c) => c.connection_send_by || '',
    getValue: (c) => c.connection_send_by || '',
  },
  {
    key: 'connection_date',
    label: 'CONNECTION_DATE',
    render: (c) => formatAppDate(c.connection_date),
    getValue: (c) => formatAppDate(c.connection_date),
  },
  {
    key: 'contactstatus',
    label: 'CONTACTSTATUS',
    render: (c) => c.contactstatus || c.contact_status || '',
    getValue: (c) => c.contactstatus || c.contact_status || '',
  },
  {
    key: 'salesperson',
    label: 'SALESPERSON',
    render: (c) => c.salesperson || '',
    getValue: (c) => c.salesperson || '',
  },
  {
    key: 'source',
    label: 'SOURCE',
    render: (c) => c.source || '',
    getValue: (c) => c.source || '',
  },
  {
    key: 'source_details',
    label: 'SOURCE_DETAILS',
    render: (c) => c.source_details || '',
    getValue: (c) => c.source_details || '',
  },
  {
    key: 'data_extracted',
    label: 'DATA_EXTRACTED',
    render: (c) => c.data_extracted || c.data_extracted_date || '',
    getValue: (c) => c.data_extracted || c.data_extracted_date || '',
  },
  {
    key: 'current_past',
    label: 'CURRENT_PASTE',
    render: (c) => c.current_past || c.current_paste || '',
    getValue: (c) => c.current_past || c.current_paste || '',
  },
  {
    key: 'remark',
    label: 'REMARK',
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
    key: 'created_by',
    label: 'CREATED_BY',
    render: (c) => c.created_by || '',
    getValue: (c) => c.created_by || '',
  },
  {
    key: 'created_date',
    label: 'CREATED_DATE',
    render: (c) => formatAppDate(c.created_date || c.created_at),
    getValue: (c) => formatAppDate(c.created_date || c.created_at),
  },
  {
    key: 'modified_by',
    label: 'MODIFIED_BY',
    render: (c) => c.modified_by || '',
    getValue: (c) => c.modified_by || '',
  },
  {
    key: 'modified_date',
    label: 'MODIFIED_DATE',
    render: (c) => formatAppDate(c.modified_date || c.updated_at),
    getValue: (c) => formatAppDate(c.modified_date || c.updated_at),
  },
];

const DEFAULT_CONTACT_COLUMN_KEYS = CONTACT_ALL_COLUMNS.map((c) => c.key);

export default function ContactReport({ onShowToast, onNavigateToCompany, initialContactId, onClearInitialId, onNavigateReturn }) {
  // Mode: 'report' or 'form'
  const [viewMode, setViewMode] = useState('report');

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
  const [contacts, setContacts] = useState([]);
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
      const saved = localStorage.getItem('contact_visible_columns');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) { }
    return DEFAULT_CONTACT_COLUMN_KEYS;
  });

  const columnMap = useMemo(() => new Map(CONTACT_ALL_COLUMNS.map((c) => [c.key, c])), []);
  const visibleColumns = useMemo(
    () => visibleColumnKeys.map((k) => columnMap.get(k)).filter(Boolean),
    [visibleColumnKeys, columnMap]
  );

  // Initial filter state matching screenshot
  const initialFilterState = {
    id_from: '',
    id_to: '',
    comp_id: '',
    comp_name: '',
    contact_name: '',
    contactstatus: '',
    salesperson: '',
    email: '',
    website: '',
    source: '',
    pos_type: '',
    remark: '',
    country: '',
    designation: '',
    industry: '',
    linkedin_url: '',
    priority_contact: '',
    email_tool_verified: '',
    company_type: '',
    technology: '',
    preferred_linkedin_connected: '',
    linkedin_cnnctd_acc: '',
    linkedin_conn_send_acc: '',
    created_from: '',
    created_to: '',
    modified_from: '',
    modified_to: '',
  };

  const [filters, setFilters] = useState(initialFilterState);
  const [appliedFilters, setAppliedFilters] = useState({});

  const [filterOptions, setFilterOptions] = useState({
    companyNames: [],
    contactNames: [],
    contactStatuses: [],
    salespersons: [],
    sources: [],
    positionTypes: [],
    countries: [],
    designations: [],
    industries: [],
    priorityContacts: [],
    emailToolVerified: [],
    companyTypes: [],
    technologies: [],
    preferredLinkedIns: [],
    linkedinConnectedAccounts: [],
    linkedinConnSendAccounts: [],
  });

  // Companies list for dropdown in Contact Form
  const [availableCompanies, setAvailableCompanies] = useState([]);

  // Editing state
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    contact_name: '',
    company_id: '',
    company_name: '',
    designation: '',
    position_type: 'IT Manager',
    company_type: 'Direct Client',
    contact_status: 'By Email',
    salesperson: '',
    industry: '',
    country: 'India',
    website: '',
    phone: '',
    phone2: '',
    phone3: '',
    mobile: '',
    mobile2: '',
    mobile3: '',
    mobile_verified: 'Yes',
    email: '',
    other_email: '',
    email_verified: 'N',
    email_tool_verified: '',
    email_verified_response: '',
    linkedin_url: '',
    linkedin_id: '',
    comp_linkedin_id: '',
    preferred_linkedin_connected: 'Amaan,Heena K... 1',
    linkedin_conn_send_acc: '',
    connection_date: '',
    connection_send_by: '',
    linkedin_connected_acc: 'Shirin Muzzaffar... 1',
    priority_contact: '',
    current_past: 'Current',
    source: 'LinkedIn, AI Stud... 2',
    source_details: '',
    data_extracted_date: '',
    technology: 'Automation Anywhere',
    remarks: '',
    created_by: 'ADMIN',
    created_at: '7/27/2026',
    modified_by: 'ZAIN_DATEY',
    updated_at: '11/9/2026',
  });

  // Load filter options and company dropdown
  useEffect(() => {
    let isMounted = true;
    Promise.all([
      api.getContactFilters(),
      api.getCompanies({ limit: 100 }),
    ])
      .then(([filterRes, compRes]) => {
        if (isMounted) {
          if (filterRes.success && filterRes.data) {
            setFilterOptions({
              companyNames: filterRes.data.companyNames || [],
              contactNames: filterRes.data.contactNames || [],
              contactStatuses: filterRes.data.contactStatuses || [],
              salespersons: filterRes.data.salespersons || [],
              sources: filterRes.data.sources || [],
              positionTypes: filterRes.data.positionTypes || [],
              countries: filterRes.data.countries || [],
              designations: filterRes.data.designations || [],
              industries: filterRes.data.industries || [],
              priorityContacts: filterRes.data.priorityContacts || [],
              emailToolVerified: filterRes.data.emailToolVerified || [],
              companyTypes: filterRes.data.companyTypes || [],
              technologies: filterRes.data.technologies || [],
              preferredLinkedIns: filterRes.data.preferredLinkedIns || [],
              linkedinConnectedAccounts: filterRes.data.linkedinConnectedAccounts || [],
              linkedinConnSendAccounts: filterRes.data.linkedinConnSendAccounts || [],
            });
          }
          if (compRes.success && compRes.data) {
            setAvailableCompanies(compRes.data || []);
          }
        }
      })
      .catch((err) => console.warn('Options note:', err.message));

    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch Contacts
  const loadContacts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.getContacts({
        search: activeSearch,
        ...appliedFilters,
        page,
        limit,
        sortBy,
        sortOrder,
      });

      if (res.success) {
        setContacts(res.data || []);
        setTotalCount(res.total || 0);
      }
    } catch (err) {
      if (onShowToast) {
        onShowToast('error', `Failed to load contacts: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  }, [activeSearch, appliedFilters, page, limit, sortBy, sortOrder, onShowToast]);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

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
    setFilters((prev) => ({ ...prev, [columnKey]: val }));
    setAppliedFilters((prev) => ({ ...prev, [columnKey]: val }));
    setPage(1);
    if (onShowToast) onShowToast('success', `Filtered by ${columnKey}: ${val}`);
  };

  // Selection handlers - report-wide select all across entire dataset
  const handleToggleSelectAll = async (e) => {
    if (e.target.checked) {
      try {
        const queryParams = {
          search: activeSearch,
          ...appliedFilters,
        };
        const res = await api.getContactIds(queryParams);
        if (res.success && Array.isArray(res.ids)) {
          setSelectedIds(new Set(res.ids));
        } else {
          setSelectedIds(new Set(contacts.map((c) => c.id)));
        }
      } catch (err) {
        console.warn('Failed to select all contact records:', err.message);
        setSelectedIds(new Set(contacts.map((c) => c.id)));
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
    setFormData({
      contact_name: '',
      company_id: availableCompanies[0]?.id ? String(availableCompanies[0].id) : '',
      company_name: availableCompanies[0]?.name || '',
      designation: '',
      position_type: 'IT Manager',
      company_type: 'Direct Client',
      contact_status: 'By Email',
      salesperson: '',
      industry: '',
      country: 'India',
      website: '',
      phone: '',
      phone2: '',
      phone3: '',
      mobile: '',
      mobile2: '',
      mobile3: '',
      mobile_verified: 'Yes',
      email: '',
      other_email: '',
      email_verified: 'N',
      email_tool_verified: '',
      email_verified_response: '',
      linkedin_url: '',
      linkedin_id: '',
      comp_linkedin_id: '',
      preferred_linkedin_connected: 'Amaan,Heena K... 1',
      linkedin_conn_send_acc: '',
      connection_date: '',
      connection_send_by: '',
      linkedin_connected_acc: 'Shirin Muzzaffar... 1',
      priority_contact: '',
      current_past: 'Current',
      source: 'LinkedIn, AI Stud... 2',
      source_details: '',
      data_extracted_date: '',
      technology: 'Automation Anywhere',
      remarks: '',
      created_by: 'ADMIN',
      created_at: new Date().toLocaleDateString('en-US'),
      modified_by: 'ADMIN',
      updated_at: new Date().toLocaleDateString('en-US'),
    });
    setViewMode('form');
  };

  // Open Edit Form
  const handleOpenEdit = async (contact) => {
    setEditingId(contact.id);
    try {
      const res = await api.getContact(contact.id);
      const c = res.success ? res.data : contact;
      setFormData({
        contact_name: c.contact_name || '',
        company_id: c.company_id ? String(c.company_id) : '',
        company_name: c.company_name || '',
        designation: c.designation || '',
        position_type: c.position_type || '',
        company_type: c.company_type || 'Direct Client',
        contact_status: c.contact_status || 'By Email',
        salesperson: c.salesperson || '',
        industry: c.industry || '',
        country: c.country || 'India',
        website: c.website || '',
        phone: c.phone || '',
        phone2: c.phone2 || '',
        phone3: c.phone3 || '',
        mobile: c.mobile || '',
        mobile2: c.mobile2 || '',
        mobile3: c.mobile3 || '',
        mobile_verified: c.mobile_verified || 'Yes',
        email: c.email || '',
        other_email: c.other_email || '',
        email_verified: c.email_verified || 'N',
        email_tool_verified: c.email_tool_verified || '',
        email_verified_response: c.email_verified_response || '',
        linkedin_url: c.linkedin_url || '',
        linkedin_id: c.linkedin_id || '',
        comp_linkedin_id: c.comp_linkedin_id || '',
        preferred_linkedin_connected: c.preferred_linkedin_connected || 'Amaan,Heena K... 1',
        linkedin_conn_send_acc: c.linkedin_conn_send_acc || '',
        connection_date: c.connection_date || '',
        connection_send_by: c.connection_send_by || '',
        linkedin_connected_acc: c.linkedin_connected_acc || 'Shirin Muzzaffar... 1',
        priority_contact: c.priority_contact || '',
        current_past: c.current_past || 'Current',
        source: c.source || 'LinkedIn, AI Stud... 2',
        source_details: c.source_details || '',
        data_extracted_date: c.data_extracted_date || '',
        technology: c.technology || 'Automation Anywhere',
        remarks: c.remarks || '',
        created_by: c.created_by || 'ADMIN',
        created_at: c.created_at || '7/27/2026',
        modified_by: c.modified_by || 'ZAIN_DATEY',
        updated_at: c.updated_at || '11/9/2026',
      });
      setViewMode('form');
    } catch (err) {
      if (onShowToast) onShowToast('error', `Failed to load contact: ${err.message}`);
    }
  };

  // Open directly in Edit mode when given an initial contact ID
  useEffect(() => {
    let target = initialContactId;
    if (!target) {
      try {
        target = localStorage.getItem('apex_open_contact_id');
      } catch (e) {}
    }
    if (!target && window.location.hash.includes('?id=')) {
      const match = window.location.hash.match(/[?&]id=(\d+)/);
      if (match) target = match[1];
    }
    if (target) {
      try {
        localStorage.removeItem('apex_open_contact_id');
      } catch (e) {}
      if (onClearInitialId) onClearInitialId();
      handleOpenEdit({ id: target });
    }
  }, [initialContactId]);

  // Save Form
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    const trimmedName = (formData.contact_name || '').trim();
    if (!trimmedName) {
      if (onShowToast) onShowToast('error', 'Contact Name is required');
      return;
    }

    // Client-side quick check against loaded contacts
    const dupContact = contacts.find(
      (c) =>
        c.contact_name &&
        c.contact_name.trim().toLowerCase() === trimmedName.toLowerCase() &&
        String(c.id) !== String(editingId)
    );
    if (dupContact) {
      const msg = `A contact with the name "${trimmedName}" already exists (Contact #${dupContact.id}). Duplicate contact records are not allowed.`;
      if (onShowToast) onShowToast('error', msg);
      return;
    }

    try {
      const payload = {
        ...formData,
        contact_name: trimmedName,
        company_id: formData.company_id ? parseInt(formData.company_id, 10) : null,
      };

      if (editingId) {
        await api.updateContact(editingId, payload);
        if (onShowToast) onShowToast('success', `Contact #${editingId} updated successfully.`);
      } else {
        await api.createContact(payload);
        if (onShowToast) onShowToast('success', `Contact "${trimmedName}" created successfully.`);
      }
      handleCancelOrReturn();
      loadContacts();
    } catch (err) {
      if (onShowToast) onShowToast('error', err.message || 'Failed to save contact');
    }
  };

  // Delete Current Contact from Form
  const handleDeleteCurrent = async () => {
    if (!editingId) return;
    if (window.confirm(`Are you sure you want to delete contact #${editingId}?`)) {
      try {
        const res = await api.deleteContact(editingId);
        if (onShowToast) onShowToast('success', res.message);
        handleCancelOrReturn();
        loadContacts();
      } catch (err) {
        if (onShowToast) onShowToast('error', err.message);
      }
    }
  };

  // Bulk Delete Selected from Table
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    if (window.confirm(`Are you sure you want to delete ${count} selected contact record(s)?`)) {
      try {
        const res = await api.bulkDeleteContacts(Array.from(selectedIds));
        if (onShowToast) onShowToast('success', res.message);
        setSelectedIds(new Set());
        loadContacts();
      } catch (err) {
        if (onShowToast) onShowToast('error', err.message);
      }
    }
  };

  // Export to CSV (Only currently visible columns in display order)
  const handleDownloadCsv = () => {
    if (!contacts.length) return;
    const headers = visibleColumns.map((c) => c.label);
    const rows = contacts.map((c) =>
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
    link.setAttribute('download', `contact_report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (onShowToast) onShowToast('success', `Exported contact report (${visibleColumns.length} columns) to CSV.`);
  };

  const startRec = totalCount === 0 ? 0 : (page - 1) * limit + 1;
  const endRec = Math.min(page * limit, totalCount);

  // =========================================================================
  // VIEW MODE: FORM (Screenshot 4)
  // =========================================================================
  if (viewMode === 'form') {
    return (
      <div className="form-page-container">
        {/* Card Header matching Screenshot 4: Dark navy header with "Contact" */}
        <div style={{ background: '#0b1a38', color: '#ffffff', padding: '0.75rem 1.25rem', borderRadius: '6px 6px 0 0', fontWeight: 700, fontSize: '0.95rem' }}>
          Contact
        </div>

        <form onSubmit={handleSubmitForm} className="apex-form-card" style={{ background: '#ffffff', padding: '1.5rem', borderRadius: '0 0 6px 6px', border: '1px solid #e2e8f0', borderTop: 'none' }}>
          {/* 3-Column Grid matching Screenshot 4 */}
          <div className="form-grid-3">
            {/* Column 1 */}
            <div className="form-field-row">
              <label className="form-field-label">Company Name</label>
              <div className="form-field-control">
                <select
                  className="form-control-select"
                  value={formData.company_id}
                  onChange={(e) => {
                    const selId = e.target.value;
                    const matched = availableCompanies.find((c) => String(c.id) === selId);
                    setFormData({
                      ...formData,
                      company_id: selId,
                      company_name: matched ? matched.name : '',
                    });
                  }}
                >
                  <option value="">Select Company</option>
                  {availableCompanies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.id})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Column 2 */}
            <div className="form-field-row">
              <label className="form-field-label">Phone</label>
              <div className="form-field-control">
                <input
                  type="text"
                  className="form-control-input"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="1234567890"
                />
              </div>
            </div>

            {/* Column 3 */}
            <div className="form-field-row">
              <label className="form-field-label">Mobile</label>
              <div className="form-field-control">
                <input
                  type="text"
                  className="form-control-input"
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  placeholder="1234567890"
                />
              </div>
            </div>

            {/* Row 2 */}
            <div className="form-field-row">
              <label className="form-field-label">Contact Name</label>
              <div className="form-field-control">
                <input
                  type="text"
                  required
                  className="form-control-input"
                  value={formData.contact_name}
                  onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                  placeholder="Maaz Datey"
                />
              </div>
            </div>

            <div className="form-field-row">
              <label className="form-field-label">Email</label>
              <div className="form-field-control">
                <input
                  type="email"
                  className="form-control-input"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="zainmaazdatey@gmail.com"
                />
              </div>
            </div>

            <div className="form-field-row">
              <label className="form-field-label">Priority Contact</label>
              <div className="form-field-control">
                <input
                  type="text"
                  className="form-control-input"
                  value={formData.priority_contact}
                  onChange={(e) => setFormData({ ...formData, priority_contact: e.target.value })}
                  placeholder="0987654321"
                />
              </div>
            </div>

            {/* Row 3 */}
            <div className="form-field-row">
              <label className="form-field-label">Phone/Mobile Verified</label>
              <div className="form-field-control">
                <select
                  className="form-control-select"
                  value={formData.mobile_verified}
                  onChange={(e) => setFormData({ ...formData, mobile_verified: e.target.value })}
                >
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>
            </div>

            <div className="form-field-row">
              <label className="form-field-label">Preferred LinkedIn Connected Account</label>
              <div className="form-field-control">
                <select
                  className="form-control-select"
                  value={formData.preferred_linkedin_connected}
                  onChange={(e) => setFormData({ ...formData, preferred_linkedin_connected: e.target.value })}
                >
                  <option value="Amaan,Heena K... 1">Amaan,Heena K... 1</option>
                  <option value="Direct Connection">Direct Connection</option>
                </select>
              </div>
            </div>

            <div className="form-field-row">
              <label className="form-field-label">Source</label>
              <div className="form-field-control">
                <select
                  className="form-control-select"
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                >
                  <option value="LinkedIn, AI Stud... 2">LinkedIn, AI Stud... 2</option>
                  <option value="Website Inbound">Website Inbound</option>
                  <option value="Referral">Referral</option>
                </select>
              </div>
            </div>

            {/* Row 4 */}
            <div className="form-field-row">
              <label className="form-field-label">Website</label>
              <div className="form-field-control">
                <input
                  type="text"
                  className="form-control-input"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="www.testy.com"
                />
              </div>
            </div>

            <div className="form-field-row">
              <label className="form-field-label">Country</label>
              <div className="form-field-control">
                <select
                  className="form-control-select"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                >
                  <option value="India">India</option>
                  <option value="United States">United States</option>
                  <option value="United Arab Emirates">United Arab Emirates</option>
                  <option value="United Kingdom">United Kingdom</option>
                </select>
              </div>
            </div>

            <div className="form-field-row">
              <label className="form-field-label">Sales Person</label>
              <div className="form-field-control">
                <select
                  className="form-control-select"
                  value={formData.salesperson}
                  onChange={(e) => setFormData({ ...formData, salesperson: e.target.value })}
                >
                  <option value=""></option>
                  <option value="Amaan">Amaan</option>
                  <option value="Zain Datey">Zain Datey</option>
                  <option value="Mariya Badar">Mariya Badar</option>
                </select>
              </div>
            </div>

            {/* Row 5 */}
            <div className="form-field-row">
              <label className="form-field-label">Other Email</label>
              <div className="form-field-control">
                <input
                  type="email"
                  className="form-control-input"
                  value={formData.other_email}
                  onChange={(e) => setFormData({ ...formData, other_email: e.target.value })}
                />
              </div>
            </div>

            <div className="form-field-row">
              <label className="form-field-label">Linkedin Url</label>
              <div className="form-field-control">
                <input
                  type="text"
                  className="form-control-input"
                  value={formData.linkedin_url}
                  onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                  placeholder="https://www.linkedin.com/in/..."
                />
              </div>
            </div>

            <div className="form-field-row">
              <label className="form-field-label">Contactstatus</label>
              <div className="form-field-control">
                <select
                  className="form-control-select"
                  value={formData.contact_status}
                  onChange={(e) => setFormData({ ...formData, contact_status: e.target.value })}
                >
                  <option value="By Email">By Email</option>
                  <option value="By Phone">By Phone</option>
                  <option value="Connected">Connected</option>
                </select>
              </div>
            </div>

            {/* Row 6 */}
            <div className="form-field-row">
              <label className="form-field-label">Designation</label>
              <div className="form-field-control">
                <input
                  type="text"
                  className="form-control-input"
                  value={formData.designation}
                  onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                  placeholder="Sales manager"
                />
              </div>
            </div>

            <div className="form-field-row">
              <label className="form-field-label">Position Type</label>
              <div className="form-field-control">
                <select
                  className="form-control-select"
                  value={formData.position_type}
                  onChange={(e) => setFormData({ ...formData, position_type: e.target.value })}
                >
                  <option value=""></option>
                  <option value="IT Manager">IT Manager</option>
                  <option value="Sales Manager">Sales Manager</option>
                  <option value="CTO">CTO</option>
                  <option value="Director">Director</option>
                </select>
              </div>
            </div>

            <div className="form-field-row align-start" style={{ gridRow: 'span 2' }}>
              <label className="form-field-label">Remark</label>
              <div className="form-field-control">
                <textarea
                  rows={3}
                  className="form-control-textarea"
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                />
              </div>
            </div>

            {/* Row 7 */}
            <div className="form-field-row">
              <label className="form-field-label">Data Extracted</label>
              <div className="form-field-control">
                <input
                  type="text"
                  className="form-control-input"
                  value={formData.data_extracted_date}
                  onChange={(e) => setFormData({ ...formData, data_extracted_date: e.target.value })}
                />
              </div>
            </div>

            <div className="form-field-row">
              <label className="form-field-label">LinkedIn Connected Account</label>
              <div className="form-field-control">
                <select
                  className="form-control-select"
                  value={formData.linkedin_connected_acc}
                  onChange={(e) => setFormData({ ...formData, linkedin_connected_acc: e.target.value })}
                >
                  <option value="Shirin Muzzaffar... 1">Shirin Muzzaffar... 1</option>
                  <option value="Amaan">Amaan</option>
                </select>
              </div>
            </div>

            {/* Row 8 */}
            <div className="form-field-row">
              <label className="form-field-label">Technology</label>
              <div className="form-field-control">
                <input
                  type="text"
                  className="form-control-input"
                  value={formData.technology}
                  onChange={(e) => setFormData({ ...formData, technology: e.target.value })}
                  placeholder="Automation Anywhere"
                />
              </div>
            </div>

            <div className="form-field-row">
              <label className="form-field-label">Industry</label>
              <div className="form-field-control">
                <input
                  type="text"
                  className="form-control-input"
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Audit Fields Row (4 dashed boxes matching Screenshot 4) */}
          <div className="audit-grid" style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
            <div className="audit-field">
              <label>Created By</label>
              <input type="text" readOnly value={formData.created_by} />
            </div>
            <div className="audit-field">
              <label>Created Date</label>
              <input type="text" readOnly value={formatAppDate(formData.created_at || formData.created_date)} />
            </div>
            <div className="audit-field">
              <label>Modified By</label>
              <input type="text" readOnly value={formData.modified_by} />
            </div>
            <div className="audit-field">
              <label>Modified Date</label>
              <input type="text" readOnly value={formatAppDate(formData.updated_at || formData.modified_date)} />
            </div>
          </div>

          {/* Footer Actions matching Screenshot 4 */}
          <div className="form-footer-bar" style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn-apex-cancel"
                onClick={handleCancelOrReturn}
              >
                Cancel
              </button>

              {formData.company_id && (
                <button
                  type="button"
                  className="btn-apex-cancel"
                  onClick={() => {
                    if (onNavigateToCompany) onNavigateToCompany(formData.company_id);
                  }}
                >
                  - Back To Company
                </button>
              )}
            </div>

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
              <button type="submit" className="btn-apex-top" style={{ padding: '0.5rem 1.25rem' }}>
                {editingId ? 'Apply Changes' : 'Create'}
              </button>
            </div>
          </div>
        </form>
      </div>
    );
  }

  // =========================================================================
  // VIEW MODE: REPORT TABLE (Screenshot 2)
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
        allColumns={CONTACT_ALL_COLUMNS}
        visibleColumnKeys={visibleColumnKeys}
        defaultVisibleKeys={DEFAULT_CONTACT_COLUMN_KEYS}
        onApply={(newKeys) => {
          setVisibleColumnKeys(newKeys);
          try {
            localStorage.setItem('contact_visible_columns', JSON.stringify(newKeys));
          } catch (e) { }
          if (onShowToast) onShowToast('success', `Updated report columns (${newKeys.length} visible).`);
        }}
      />

      {/* Interactive Filter Modal */}
      <ApexFilterModal
        isOpen={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        columns={CONTACT_ALL_COLUMNS.map((c) => ({ id: c.key, label: c.label }))}
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
        title="Contact Data Distribution Chart"
        data={contacts}
        groupByColumns={[
          { id: 'designation', label: 'Designation' },
          { id: 'pos_type', label: 'Position Type' },
          { id: 'contactstatus', label: 'Contact Status' },
          { id: 'country', label: 'Country' },
          { id: 'salesperson', label: 'Salesperson' },
          { id: 'industry', label: 'Industry' },
        ]}
      />

      {/* Upload CSV Modal */}
      <UploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        entityType="Contact"
        onUploadSuccess={() => {
          loadContacts();
          if (onShowToast) onShowToast('success', 'Contacts uploaded successfully.');
        }}
      />

      {/* Top Header Row matching Screenshot 2 */}
      <div className="apex-page-header-row">
        <h1 className="apex-page-heading">Contact</h1>

        <div className="apex-top-actions">
          <button
            type="button"
            className={`btn-apex-top ${showFilters ? 'btn-active-filter' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </button>

          <button
            type="button"
            className="btn-apex-top"
            onClick={() => setShowUploadModal(true)}
          >
            Upload Contacts
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

      {/* Comprehensive Filter Panel matching Contact Screenshot */}
      {showFilters && (
        <form onSubmit={handleApplyFilters} className="company-filters-card">
          <div className="company-filters-grid">
            {/* ROW 1: ID From | ID To | Company ID | Company Name | Contact Name | Contact Status */}
            <div className="company-filter-field">
              <label className="company-filter-label">ID From</label>
              <input
                type="text"
                className="company-filter-input"
                value={filters.id_from}
                onChange={(e) => setFilters({ ...filters, id_from: e.target.value })}
              />
            </div>

            <div className="company-filter-field">
              <label className="company-filter-label">ID To</label>
              <input
                type="text"
                className="company-filter-input"
                value={filters.id_to}
                onChange={(e) => setFilters({ ...filters, id_to: e.target.value })}
              />
            </div>

            <div className="company-filter-field">
              <label className="company-filter-label">Company ID</label>
              <input
                type="text"
                className="company-filter-input"
                value={filters.comp_id}
                onChange={(e) => setFilters({ ...filters, comp_id: e.target.value })}
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
                {filterOptions.companyNames.map((cn) => (
                  <option key={cn} value={cn}>{cn}</option>
                ))}
              </select>
            </div>

            <div className="company-filter-field">
              <label className="company-filter-label">Contact Name</label>
              <select
                className="company-filter-select"
                value={filters.contact_name}
                onChange={(e) => setFilters({ ...filters, contact_name: e.target.value })}
              >
                <option value=""></option>
                {filterOptions.contactNames.map((ctn) => (
                  <option key={ctn} value={ctn}>{ctn}</option>
                ))}
              </select>
            </div>

            <div className="company-filter-field">
              <label className="company-filter-label">Contact Status</label>
              <select
                className="company-filter-select"
                value={filters.contactstatus}
                onChange={(e) => setFilters({ ...filters, contactstatus: e.target.value })}
              >
                <option value=""></option>
                {filterOptions.contactStatuses.map((cs) => (
                  <option key={cs} value={cs}>{cs}</option>
                ))}
              </select>
            </div>

            {/* ROW 2: Sales Person | Email | Website | Source | Position Type | Remark */}
            <div className="company-filter-field">
              <label className="company-filter-label">Sales Person</label>
              <select
                className="company-filter-select"
                value={filters.salesperson}
                onChange={(e) => setFilters({ ...filters, salesperson: e.target.value })}
              >
                <option value=""></option>
                {filterOptions.salespersons.map((sp) => (
                  <option key={sp} value={sp}>{sp}</option>
                ))}
              </select>
            </div>

            <div className="company-filter-field">
              <label className="company-filter-label">Email</label>
              <input
                type="text"
                className="company-filter-input"
                value={filters.email}
                onChange={(e) => setFilters({ ...filters, email: e.target.value })}
              />
            </div>

            <div className="company-filter-field">
              <label className="company-filter-label">Website</label>
              <input
                type="text"
                className="company-filter-input"
                value={filters.website}
                onChange={(e) => setFilters({ ...filters, website: e.target.value })}
              />
            </div>

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
              <label className="company-filter-label">Position Type</label>
              <select
                className="company-filter-select"
                value={filters.pos_type}
                onChange={(e) => setFilters({ ...filters, pos_type: e.target.value })}
              >
                <option value=""></option>
                {filterOptions.positionTypes.map((pt) => (
                  <option key={pt} value={pt}>{pt}</option>
                ))}
              </select>
            </div>

            <div className="company-filter-field">
              <label className="company-filter-label">Remark</label>
              <input
                type="text"
                className="company-filter-input"
                value={filters.remark}
                onChange={(e) => setFilters({ ...filters, remark: e.target.value })}
              />
            </div>

            {/* ROW 3: Country | Designation | Industry | LinkedIn URL | Priority Contact | Email Tool Verified */}
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
              <label className="company-filter-label">Designation</label>
              <select
                className="company-filter-select"
                value={filters.designation}
                onChange={(e) => setFilters({ ...filters, designation: e.target.value })}
              >
                <option value=""></option>
                {filterOptions.designations.map((d) => (
                  <option key={d} value={d}>{d}</option>
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
              <label className="company-filter-label">LinkedIn URL</label>
              <input
                type="text"
                className="company-filter-input"
                value={filters.linkedin_url}
                onChange={(e) => setFilters({ ...filters, linkedin_url: e.target.value })}
              />
            </div>

            <div className="company-filter-field">
              <label className="company-filter-label">Priority Contact</label>
              <select
                className="company-filter-select"
                value={filters.priority_contact}
                onChange={(e) => setFilters({ ...filters, priority_contact: e.target.value })}
              >
                <option value=""></option>
                {filterOptions.priorityContacts.map((pc) => (
                  <option key={pc} value={pc}>{pc}</option>
                ))}
              </select>
            </div>

            <div className="company-filter-field">
              <label className="company-filter-label">Email Tool Verified</label>
              <select
                className="company-filter-select"
                value={filters.email_tool_verified}
                onChange={(e) => setFilters({ ...filters, email_tool_verified: e.target.value })}
              >
                <option value=""></option>
                {filterOptions.emailToolVerified.map((ev) => (
                  <option key={ev} value={ev}>{ev}</option>
                ))}
              </select>
            </div>

            {/* ROW 4: Company Type | Technology | Preferred LinkedIn | LinkedIn Connected Account | LinkedIn Connection Send Account | Created From */}
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
              <label className="company-filter-label">Preferred LinkedIn</label>
              <select
                className="company-filter-select"
                value={filters.preferred_linkedin_connected}
                onChange={(e) => setFilters({ ...filters, preferred_linkedin_connected: e.target.value })}
              >
                <option value=""></option>
                {filterOptions.preferredLinkedIns.map((pl) => (
                  <option key={pl} value={pl}>{pl}</option>
                ))}
              </select>
            </div>

            <div className="company-filter-field">
              <label className="company-filter-label">LinkedIn Connected Account</label>
              <select
                className="company-filter-select"
                value={filters.linkedin_cnnctd_acc}
                onChange={(e) => setFilters({ ...filters, linkedin_cnnctd_acc: e.target.value })}
              >
                <option value=""></option>
                {filterOptions.linkedinConnectedAccounts.map((lca) => (
                  <option key={lca} value={lca}>{lca}</option>
                ))}
              </select>
            </div>

            <div className="company-filter-field">
              <label className="company-filter-label">LinkedIn Connection Send Account</label>
              <select
                className="company-filter-select"
                value={filters.linkedin_conn_send_acc}
                onChange={(e) => setFilters({ ...filters, linkedin_conn_send_acc: e.target.value })}
              >
                <option value=""></option>
                {filterOptions.linkedinConnSendAccounts.map((lsa) => (
                  <option key={lsa} value={lsa}>{lsa}</option>
                ))}
              </select>
            </div>

            <div className="company-filter-field">
              <div className="company-filter-date-wrapper" style={{ marginTop: 'auto' }}>
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

            {/* ROW 5: Created To | Modified From | Modified To | Search Button | Clear Filters Button | empty */}
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

            <div className="company-filter-field" style={{ justifyContent: 'center' }}>
              <button
                type="submit"
                className="btn-apex-top"
                style={{ background: '#0b192c', color: '#ffffff', width: '100%', height: '38px', borderRadius: '4px', fontWeight: 600, border: 'none', cursor: 'pointer' }}
              >
                Search
              </button>
            </div>

            <div className="company-filter-field" style={{ justifyContent: 'center' }}>
              <button
                type="button"
                className="btn-apex-top"
                style={{ background: '#0b192c', color: '#ffffff', width: '100%', height: '38px', borderRadius: '4px', fontWeight: 600, border: 'none', cursor: 'pointer' }}
                onClick={handleClearFilters}
              >
                Clear Filters
              </button>
            </div>

            <div className="company-filter-field"></div>
          </div>
        </form>
      )}

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
              onRefresh={loadContacts}
              onResetReport={() => {
                setVisibleColumnKeys(DEFAULT_CONTACT_COLUMN_KEYS);
                try {
                  localStorage.removeItem('contact_visible_columns');
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

      {/* APEX Pagination Range Header Strip (e.g. 1 - 50 of 59,079 >) */}
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
        data={contacts}
        onEditAggregation={() => setShowAggregateModal(true)}
        onRemoveAggregation={(id) => setAggregations((prev) => prev.filter((a) => a.id !== id))}
        onClearAll={() => setAggregations([])}
      />

      {/* Dense Wide Data Table strictly ordered matching 42 Contact Columns */}
      <div className="dense-table-wrapper" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
        {loading ? (
          <div style={{ padding: '3.5rem', textAlign: 'center', color: '#64748b' }}>
            Loading contacts report...
          </div>
        ) : contacts.length === 0 ? (
          <div style={{ padding: '3.5rem', textAlign: 'center', color: '#64748b' }}>
            No contacts found matching current criteria.
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
              {contacts.map((contact) => {
                const isSelected = selectedIds.has(contact.id);
                return (
                  <tr key={contact.id} className={isSelected ? 'selected' : ''}>
                    {/* Edit icon */}
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        className="row-edit-btn"
                        onClick={() => handleOpenEdit(contact)}
                        title="Edit Contact Form"
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
                        onChange={() => handleToggleSelectOne(contact.id)}
                      />
                    </td>

                    {visibleColumns.map((col) => (
                      <td key={col.key}>{col.render(contact, handleOpenEdit, onNavigateToCompany)}</td>
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
                            <span style={{ color: '#2563eb' }}>{computeAggregationValue(contacts, agg.func, agg.columnKey)}</span>
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
        columns={CONTACT_ALL_COLUMNS}
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
        data={contacts}
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
