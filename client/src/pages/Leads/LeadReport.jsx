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
import ApexInteractiveReport from '../../components/ApexInteractiveReport';
import { computeAggregationValue } from '../../utils/aggregationUtils';
import {
  IconSearch,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconFilePenLine,
  IconClose,
  IconFilter,
  IconTrash,
  IconDownload,
  IconRefresh,
} from '../../components/Icons';

// Clean undefined / null strings from display
const cleanVal = (val) => {
  if (val === undefined || val === null) return '';
  const str = String(val).trim();
  if (str === 'undefined' || str === 'null') return '';
  return str;
};

// Convert stored DD/MM/YYYY to YYYY-MM-DD for native HTML5 date input
const toIsoDate = (val) => {
  if (!val || val === 'undefined' || val === 'null') return '';
  const str = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  const parts = str.split('/');
  if (parts.length === 3) {
    const [d, m, y] = parts;
    return `${y.padStart(4, '0')}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return '';
};

// Convert YYYY-MM-DD back to stored DD/MM/YYYY
const fromIsoDate = (isoStr) => {
  if (!isoStr) return '';
  const str = String(isoStr).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [y, m, d] = str.split('-');
    return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
  }
  return str;
};

// Master Columns configuration for Lead Report (matching Screenshot 5)
export const LEAD_MASTER_COLUMNS = [
  {
    key: 'sr_no',
    label: 'Sr No',
    getValue: (r) => (r.sr_no !== undefined && r.sr_no !== null ? String(r.sr_no) : ''),
  },
  {
    key: 'company_name',
    label: 'Company Name',
    getValue: (r) => cleanVal(r.company_name),
  },
  {
    key: 'name_of_coordinator',
    label: 'Name Of Coordinator',
    getValue: (r) => cleanVal(r.name_of_coordinator),
  },
  {
    key: 'account_manager',
    label: 'Account Manager',
    getValue: (r) => cleanVal(r.account_manager),
  },
  {
    key: 'industry',
    label: 'Industry',
    getValue: (r) => cleanVal(r.industry),
  },
  {
    key: 'technology',
    label: 'Technology',
    getValue: (r) => cleanVal(r.technology),
  },
  {
    key: 'lead_date',
    label: 'Lead Date',
    getValue: (r) => cleanVal(r.lead_date),
  },
  {
    key: 'city',
    label: 'City',
    getValue: (r) => cleanVal(r.city),
  },
  {
    key: 'country',
    label: 'Country',
    getValue: (r) => cleanVal(r.country),
  },
  {
    key: 'probability',
    label: 'Probability',
    getValue: (r) => cleanVal(r.probability),
  },
  {
    key: 'company_type',
    label: 'Company Type',
    getValue: (r) => cleanVal(r.company_type),
  },
  {
    key: 'contacts',
    label: 'Contacts',
    getValue: (r) => cleanVal(r.contacts),
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

const DEFAULT_LEAD_KEYS = LEAD_MASTER_COLUMNS.map((c) => c.key);

export default function LeadReport({
  onShowToast,
  onNavigateToCompany,
  onNavigateToCompanyForm,
  onNavigateToContact,
  onNavigateToContactForm,
  initialLeadId,
  onClearInitialId,
}) {
  // Support either prop naming pattern seamlessly
  const goToCompany = onNavigateToCompany || onNavigateToCompanyForm;
  const goToContact = onNavigateToContact || onNavigateToContactForm;
  // Standardized child report column definitions
  const leadLineReportColumns = useMemo(() => [
    { key: 'technology', label: 'Technology', minWidth: '140px', getValue: (r) => r.technology || r.technology_required || '' },
    { key: 'model', label: 'Model', minWidth: '110px', getValue: (r) => r.model || '' },
    { key: 'no_of_resources', label: 'No of Resources', minWidth: '120px', getValue: (r) => r.no_of_resources || '' },
    { key: 'rate', label: 'Rate', minWidth: '100px', getValue: (r) => r.rate ? (r.currency_code ? r.currency_code + ' ' + r.rate : '$ ' + r.rate) : '' },
    { key: 'amount', label: 'Amount', minWidth: '110px', getValue: (r) => r.amount ? (r.currency_code ? r.currency_code + ' ' + r.amount : '$ ' + r.amount) : '' },
    { key: 'amount_in_inr', label: 'Amount in INR', minWidth: '120px', getValue: (r) => r.amount_in_inr ? '₹ ' + r.amount_in_inr : '' },
    { key: 'required_service', label: 'Service', minWidth: '120px', getValue: (r) => r.required_service || '' },
    { key: 'cv_sent', label: 'CV Sent', minWidth: '90px', getValue: (r) => r.cv_sent || 'No' },
  ], []);

  const leadResourceReportColumns = useMemo(() => [
    { key: 'resource_name', label: 'Resource Name', minWidth: '140px', getValue: (r) => r.resource_name || '' },
    { key: 'resource_type', label: 'Type', minWidth: '110px', getValue: (r) => r.resource_type || '' },
    { key: 'designation', label: 'Designation', minWidth: '120px', getValue: (r) => r.designation || '' },
    { key: 'status', label: 'Status', minWidth: '100px', getValue: (r) => r.status || 'Allocated' },
    { key: 'created_date', label: 'Created Date', minWidth: '120px', getValue: (r) => r.created_date || '' },
  ], []);

  const leadContactReportColumns = useMemo(() => [
    {
      key: 'client_full_name',
      label: 'Client Full Name',
      minWidth: '160px',
      getValue: (r) => r.client_full_name || '',
      render: (ct) => (
        ct.contact_id && goToContact ? (
          <a
            href={'#/contacts?id=' + ct.contact_id}
            onClick={(e) => {
              e.preventDefault();
              try {
                localStorage.setItem('apex_return_tab', 'leads');
                localStorage.setItem('apex_return_hash', '#/leads');
              } catch (err) { }
              goToContact(ct.contact_id, 'leads', '#/leads');
            }}
            style={{ color: '#0284c7', textDecoration: 'none', fontWeight: 600 }}
            onMouseEnter={(e) => (e.target.style.textDecoration = 'underline')}
            onMouseLeave={(e) => (e.target.style.textDecoration = 'none')}
          >
            {ct.client_full_name}
          </a>
        ) : (
          <span style={{ fontWeight: 600 }}>{ct.client_full_name}</span>
        )
      ),
    },
    { key: 'designation', label: 'Designation', minWidth: '130px', getValue: (r) => r.designation || '' },
    { key: 'email', label: 'Email', minWidth: '160px', getValue: (r) => r.email || '' },
    { key: 'mobile_number', label: 'Mobile Number', minWidth: '130px', getValue: (r) => r.mobile_number || '' },
    { key: 'interview_status', label: 'Interview Status', minWidth: '120px', getValue: (r) => r.interview_status || '' },
    { key: 'proposal', label: 'Proposal', minWidth: '100px', getValue: (r) => r.proposal || '' },
    { key: 'connection_sent', label: 'Connection Sent', minWidth: '120px', getValue: (r) => r.connection_sent || '' },
    { key: 'linkedin_url', label: 'Linkedin Url', minWidth: '140px', getValue: (r) => r.linkedin_url || '' },
    { key: 'department', label: 'Department', minWidth: '110px', getValue: (r) => r.department || '' },
    { key: 'role', label: 'Role', minWidth: '100px', getValue: (r) => r.role || '' },
    { key: 'created_by', label: 'Created By', minWidth: '100px', getValue: (r) => r.created_by || '' },
    { key: 'created_date', label: 'Created Date', minWidth: '120px', getValue: (r) => r.created_date || '' },
    { key: 'modified_by', label: 'Modified By', minWidth: '100px', getValue: (r) => r.modified_by || '' },
  ], [goToContact]);

  const leadNaukriReportColumns = useMemo(() => [
    { key: 'title', label: 'Job Title', minWidth: '160px', getValue: (r) => r.title || '' },
    { key: 'job_location', label: 'Location', minWidth: '120px', getValue: (r) => r.job_location || '' },
    {
      key: 'experience',
      label: 'Experience',
      minWidth: '120px',
      getValue: (r) => (r.min_experience || 0) + ' - ' + (r.max_experience || 0) + ' yrs',
    },
    { key: 'vacancies', label: 'Vacancies', minWidth: '90px', getValue: (r) => r.vacancies || '' },
    { key: 'status', label: 'Status', minWidth: '100px', getValue: (r) => r.status || '' },
    { key: 'created_date', label: 'Created Date', minWidth: '120px', getValue: (r) => formatAppDate(r.created_date) },
  ], []);

  const leadProposalReportColumns = useMemo(() => [
    { key: 'proposal_number', label: 'Proposal Number', minWidth: '140px', getValue: (r) => r.proposal_number || '' },
    { key: 'proposal_title', label: 'Title', minWidth: '160px', getValue: (r) => r.proposal_title || '' },
    { key: 'client_name', label: 'Client', minWidth: '130px', getValue: (r) => r.client_name || '' },
    {
      key: 'proposal_value',
      label: 'Value',
      minWidth: '110px',
      getValue: (r) => r.proposal_value ? (r.currency_code ? r.currency_code + ' ' + r.proposal_value : '$ ' + r.proposal_value) : '',
    },
    { key: 'status', label: 'Status', minWidth: '100px', getValue: (r) => r.status || '' },
    { key: 'created_date', label: 'Created Date', minWidth: '120px', getValue: (r) => formatAppDate(r.created_date) },
  ], []);


  // Mode: 'report' or 'form' with localStorage persistence
  const [viewMode, setViewMode] = useState(() => {
    try {
      const saved = localStorage.getItem('apex_lead_active_form');
      if (saved) return 'form';
    } catch (e) {}
    return 'report';
  });

  const [activeSubTab, setActiveSubTab] = useState(() => {
    try {
      return localStorage.getItem('apex_lead_form_tab') || 'lead';
    } catch (e) {
      return 'lead';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('apex_lead_form_tab', activeSubTab);
    } catch (e) {}
  }, [activeSubTab]);

  // Master LOVs
  const [lovs, setLovs] = useState({
    accountManagers: [],
    coordinators: [],
    currencies: [],
    probabilities: [],
    leadTypes: [],
    models: [],
    requiredServices: [],
    cvMadeBy: [],
    sources: [],
    companies: [],
    industries: [],
    countries: [],
    companyTypes: [],
  });

  // Report state
  const [leads, setLeads] = useState([]);
  const [totalLeads, setTotalLeads] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('sr_no');
  const [sortOrder, setSortOrder] = useState('ASC');

  // Filter drawer (Screenshot 5: "Show Filters" button in top-right)
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    company_name: '',
    account_manager: '',
    coordinator: '',
    industry: '',
    country: '',
    technology: '',
    probability: '',
    company_type: '',
    lead_type: '',
    city: '',
  });

  // APEX Column Header Popover Menu
  const [headerMenu, setHeaderMenu] = useState({
    isOpen: false,
    column: null,
    anchorRect: null,
    distinctValues: [],
  });

  // APEX Interactive Modals
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showColumnsModal, setShowColumnsModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showChartModal, setShowChartModal] = useState(false);
  const [showAggregateModal, setShowAggregateModal] = useState(false);
  const [aggregations, setAggregations] = useState([]);

  // Column visibility
  const [visibleKeys, setVisibleKeys] = useState(() => {
    try {
      const s = localStorage.getItem('lead_visible_columns');
      if (s) {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return DEFAULT_LEAD_KEYS;
  });

  const handleSaveColumns = (keys) => {
    setVisibleKeys(keys);
    try {
      localStorage.setItem('lead_visible_columns', JSON.stringify(keys));
    } catch (e) {}
    setShowColumnsModal(false);
    if (onShowToast) onShowToast('success', 'Column visibility updated.');
  };

  // Bulk Selection & Change Account Manager
  const [selectedLeadIds, setSelectedLeadIds] = useState(new Set());
  const [showAcctMgrModal, setShowAcctMgrModal] = useState(false);
  const [newAccountManager, setNewAccountManager] = useState('');
  const [updatingAcctMgr, setUpdatingAcctMgr] = useState(false);

  // Selected Lead for Form / Child tabs
  const [selectedLead, setSelectedLead] = useState(() => {
    try {
      const saved = localStorage.getItem('apex_lead_active_form');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return null;
  });

  const [formData, setFormData] = useState(() => {
    try {
      const saved = localStorage.getItem('apex_lead_active_form');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {};
  });

  const [formSubmitting, setFormSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  // Child data states
  const [leadLines, setLeadLines] = useState([]);
  const [leadContacts, setLeadContacts] = useState([]);
  const [naukriAds, setNaukriAds] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [leadResources, setLeadResources] = useState([]);

  // Active child form modals / editors
  const [editingLine, setEditingLine] = useState(null);
  const [editingContact, setEditingContact] = useState(null);
  const [editingNaukri, setEditingNaukri] = useState(null);
  const [editingProposal, setEditingProposal] = useState(null);
  const [resourceTypeFilter, setResourceTypeFilter] = useState('Iqra Employee');

  // Fetch LOVs on mount
  useEffect(() => {
    api.getLeadLovs()
      .then((res) => {
        if (res && res.success) setLovs(res.data);
      })
      .catch((err) => console.error('Failed to load LOVs:', err));
  }, []);

  // Fetch Leads report list
  const offset = rowsPerPage === 'all' ? 0 : (page - 1) * Number(rowsPerPage);
  const fetchLimit = rowsPerPage === 'all' ? 10000 : Number(rowsPerPage);

  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        limit: fetchLimit,
        offset,
        search: appliedSearch,
        sortBy,
        sortOrder,
        ...filters,
      };
      const res = await api.getLeads(params);
      if (res && res.success) {
        setLeads(res.data || []);
        setTotalLeads(res.total || 0);
      }
    } catch (err) {
      if (onShowToast) onShowToast('error', err.message || 'Failed to load leads.');
    } finally {
      setLoading(false);
    }
  }, [fetchLimit, offset, appliedSearch, sortBy, sortOrder, filters, onShowToast]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Load Child Data for Selected Lead
  const loadChildData = useCallback(async (leadId) => {
    if (!leadId) return;
    try {
      const [linesRes, contactsRes, naukriRes, proposalsRes, resRes] = await Promise.all([
        api.getLeadLines(leadId),
        api.getLeadContacts(leadId),
        api.getLeadNaukriAds(leadId),
        api.getLeadProposals(leadId),
        api.getLeadResources(leadId),
      ]);
      if (linesRes && linesRes.success) setLeadLines(linesRes.data || []);
      if (contactsRes && contactsRes.success) setLeadContacts(contactsRes.data || []);
      if (naukriRes && naukriRes.success) setNaukriAds(naukriRes.data || []);
      if (proposalsRes && proposalsRes.success) setProposals(proposalsRes.data || []);
      if (resRes && resRes.success) setLeadResources(resRes.data || []);
    } catch (err) {
      console.error('Error loading child records:', err);
    }
  }, []);

  // Handle Initial Lead ID if passed via navigation
  useEffect(() => {
    if (initialLeadId) {
      api.getLead(initialLeadId).then((res) => {
        if (res && res.success) {
          openLeadForm(res.data);
        }
      }).catch((e) => console.error(e));
      if (onClearInitialId) onClearInitialId();
    }
  }, [initialLeadId]);

  // When selectedLead changes, sync child data
  useEffect(() => {
    if (selectedLead && selectedLead.lead_id) {
      loadChildData(selectedLead.lead_id);
    }
  }, [selectedLead, loadChildData]);

  // Open Lead in Form view
  const openLeadForm = (lead = null) => {
    if (lead) {
      setSelectedLead(lead);
      setFormData({ ...lead });
      try {
        localStorage.setItem('apex_lead_active_form', JSON.stringify(lead));
      } catch (e) {}
      loadChildData(lead.lead_id);
    } else {
      // New lead creation defaults matching Screenshot 6
      const nextSr = totalLeads + 1;
      const today = new Date();
      const day = String(today.getDate()).padStart(2, '0');
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const yr = today.getFullYear();
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];

      const newRec = {
        sr_no: nextSr,
        lead_date: `${day}/${month}/${yr}`,
        company_name: '',
        company_id: null,
        company_type: '',
        da: '',
        source: 'Email',
        currency_id: 1,
        currency_code: 'USD',
        end_client: '',
        connection_sent: 'No',
        reason: '',
        name_of_coordinator: '',
        lead_type: 'New Client',
        company_url: '',
        city: '',
        status: '',
        status_detail: '',
        referrer: '',
        amount: '',
        amount_in_inr: '',
        page_url: '',
        last_followup: '',
        month: monthNames[today.getMonth()],
        year: yr,
        account_manager: '',
        probability: 'P4',
        industry: '',
        country: '',
        contract_no: '',
        proposal: 'No',
        lead_time: '',
        created_by: 'ADMIN',
        created_date: '20-JUL-2026',
        modified_by: '',
        modified_date: '',
      };

      setSelectedLead(null);
      setFormData(newRec);
      try {
        localStorage.removeItem('apex_lead_active_form');
      } catch (e) {}
      setLeadLines([]);
      setLeadContacts([]);
      setNaukriAds([]);
      setProposals([]);
      setLeadResources([]);
    }
    setActiveSubTab('lead');
    setViewMode('form');
    setErrors({});
  };

  // Close form view (returns to origin view)
  const closeFormView = () => {
    try {
      localStorage.removeItem('apex_lead_active_form');
      const returnTab = localStorage.getItem('apex_return_tab');
      const returnHash = localStorage.getItem('apex_return_hash');
      if (returnTab && returnTab !== 'leads') {
        localStorage.removeItem('apex_return_tab');
        localStorage.removeItem('apex_return_hash');
        if (returnHash) {
          window.location.hash = returnHash;
          return;
        }
      }
    } catch (e) {}

    setViewMode('report');
    setSelectedLead(null);
    setFormData({});
    setEditingLine(null);
    setEditingContact(null);
    setEditingNaukri(null);
    setEditingProposal(null);
    fetchLeads();
  };

  // Handle Form Change
  const handleFormChange = (e) => {
    const { name, value, type } = e.target;
    const finalValue = type === 'date' ? fromIsoDate(value) : value;

    setFormData((prev) => {
      const updated = { ...prev, [name]: finalValue };

      // Auto-calculate Month and Year when lead_date changes
      if (name === 'lead_date' && finalValue) {
        const parts = finalValue.split('/');
        if (parts.length === 3) {
          const mIdx = parseInt(parts[1], 10) - 1;
          const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
          ];
          if (monthNames[mIdx]) updated.month = monthNames[mIdx];
          if (parts[2]) updated.year = parseInt(parts[2], 10);
        }
      }

      // If company selected from dropdown, auto-fill company attributes
      if (name === 'company_name' && finalValue) {
        const found = lovs.companies.find(
          (c) => c.comp_name.toLowerCase() === finalValue.trim().toLowerCase()
        );
        if (found) {
          updated.company_id = found.id;
          if (!updated.company_type && found.company_type) updated.company_type = found.company_type;
          if (!updated.industry && found.industry) updated.industry = found.industry;
          if (!updated.country && found.country) updated.country = found.country;
          if (!updated.city && found.city) updated.city = found.city;
          if (!updated.company_url && found.website) updated.company_url = found.website;
        }
      }

      return updated;
    });

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  // Save Lead Form (Create or Update)
  const handleSaveLead = async (e) => {
    if (e) e.preventDefault();
    if (!formData.company_name || !formData.company_name.trim()) {
      setErrors({ company_name: 'Company Name is required' });
      if (onShowToast) onShowToast('error', 'Company Name is required.');
      return;
    }

    if (formData.lead_date && !/^\d{2}\/\d{2}\/\d{4}$/.test(formData.lead_date)) {
      setErrors((prev) => ({ ...prev, lead_date: 'Invalid Lead Date format (expected DD/MM/YYYY)' }));
      if (onShowToast) onShowToast('error', 'Invalid Lead Date format.');
      return;
    }

    if (formData.last_followup && !/^\d{2}\/\d{2}\/\d{4}$/.test(formData.last_followup)) {
      setErrors((prev) => ({ ...prev, last_followup: 'Invalid Last Followup date format (expected DD/MM/YYYY)' }));
      if (onShowToast) onShowToast('error', 'Invalid Last Followup date format.');
      return;
    }

    if (formData.amount !== undefined && formData.amount !== null && String(formData.amount).trim() !== '') {
      const numAmt = Number(formData.amount);
      if (isNaN(numAmt) || numAmt < 0) {
        setErrors((prev) => ({ ...prev, amount: 'Amount must be a non-negative number' }));
        if (onShowToast) onShowToast('error', 'Amount must be a non-negative number.');
        return;
      }
    }

    if (formData.amount_in_inr !== undefined && formData.amount_in_inr !== null && String(formData.amount_in_inr).trim() !== '') {
      const numInr = Number(formData.amount_in_inr);
      if (isNaN(numInr) || numInr < 0) {
        setErrors((prev) => ({ ...prev, amount_in_inr: 'Amount (INR) must be a non-negative number' }));
        if (onShowToast) onShowToast('error', 'Amount (INR) must be a non-negative number.');
        return;
      }
    }

    try {
      setFormSubmitting(true);
      if (selectedLead && selectedLead.lead_id) {
        const res = await api.updateLead(selectedLead.lead_id, formData);
        if (res && res.success) {
          if (onShowToast) onShowToast('success', 'Lead updated successfully.');
          setSelectedLead(res.data);
          setFormData(res.data);
          closeFormView();
        }
      } else {
        const res = await api.createLead(formData);
        if (res && res.success) {
          if (onShowToast) onShowToast('success', 'Lead created successfully.');
          setSelectedLead(res.data);
          setFormData(res.data);
          closeFormView();
        }
      }
    } catch (err) {
      if (onShowToast) onShowToast('error', err.message || 'Failed to save lead.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Delete Lead
  const handleDeleteLead = async () => {
    if (!selectedLead || !selectedLead.lead_id) return;
    if (
      !window.confirm(
        `Are you sure you want to delete lead #${selectedLead.sr_no} (${selectedLead.company_name})?`
      )
    )
      return;

    try {
      setFormSubmitting(true);
      const res = await api.deleteLead(selectedLead.lead_id);
      if (res && res.success) {
        if (onShowToast) onShowToast('success', 'Lead deleted successfully.');
        closeFormView();
      }
    } catch (err) {
      if (onShowToast) onShowToast('error', err.message || 'Failed to delete lead.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Bulk Change Account Manager
  const handleApplyAccountManagerChange = async () => {
    if (!newAccountManager) {
      if (onShowToast) onShowToast('error', 'Please select an Account Manager.');
      return;
    }
    if (selectedLeadIds.size === 0) {
      if (onShowToast) onShowToast('error', 'Please select at least one lead from the table.');
      return;
    }

    try {
      setUpdatingAcctMgr(true);
      const res = await api.changeLeadAccountManager(Array.from(selectedLeadIds), newAccountManager);
      if (res && res.success) {
        if (onShowToast) onShowToast('success', res.message || 'Account Manager updated.');
        setShowAcctMgrModal(false);
        setSelectedLeadIds(new Set());
        fetchLeads();
      }
    } catch (err) {
      if (onShowToast) onShowToast('error', err.message || 'Failed to update Account Manager.');
    } finally {
      setUpdatingAcctMgr(false);
    }
  };

  // Toggle Row Selection
  const toggleSelectRow = (leadId) => {
    setSelectedLeadIds((prev) => {
      const next = new Set(prev);
      if (next.has(leadId)) next.delete(leadId);
      else next.add(leadId);
      return next;
    });
  };

  const toggleSelectAll = async () => {
    const isAllSelected = totalLeads > 0 && selectedLeadIds.size >= totalLeads;
    if (isAllSelected) {
      setSelectedLeadIds(new Set());
      if (onShowToast) onShowToast('info', 'Deselected all leads.');
    } else {
      try {
        const params = {
          search: appliedSearch,
          ...filters,
        };
        const res = await api.getLeadIds(params);
        if (res && res.success && Array.isArray(res.ids) && res.ids.length > 0) {
          setSelectedLeadIds(new Set(res.ids));
          if (onShowToast) onShowToast('info', `Selected all ${res.ids.length} leads throughout report.`);
        } else {
          setSelectedLeadIds(new Set(leads.map((l) => l.lead_id)));
        }
      } catch (err) {
        console.warn('Failed to select all lead records:', err.message);
        setSelectedLeadIds(new Set(leads.map((l) => l.lead_id)));
      }
    }
  };

  // Sorting Handler
  const handleSort = (columnKey) => {
    if (sortBy === columnKey) {
      setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortBy(columnKey);
      setSortOrder('ASC');
    }
    setPage(1);
  };

  // Header Column Popover Handlers (matches Oracle APEX Column Header Menu)
  const handleHeaderClick = async (e, col) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setHeaderMenu({
      isOpen: true,
      column: col,
      anchorRect: rect,
      distinctValues: [],
    });

    try {
      const colKey = col.key === 'name_of_coordinator' ? 'coordinator' : col.key;
      const res = await api.getLeadColumnValues(colKey);
      if (res && res.success && Array.isArray(res.data)) {
        setHeaderMenu((prev) => {
          if (prev.column?.key === col.key) {
            return { ...prev, distinctValues: res.data };
          }
          return prev;
        });
      }
    } catch (err) {
      console.error('Error fetching distinct column values:', err);
    }
  };

  const handleMenuSort = (columnKey, direction) => {
    setSortBy(columnKey);
    setSortOrder(direction.toUpperCase());
    setPage(1);
  };

  const handleMenuHideColumn = (columnKey) => {
    setVisibleKeys((prev) => {
      const updated = prev.filter((k) => k !== columnKey);
      try {
        localStorage.setItem('lead_visible_columns', JSON.stringify(updated));
      } catch (err) {}
      return updated;
    });
    if (onShowToast) onShowToast('info', `Column hidden from table.`);
  };

  const handleMenuControlBreak = (columnKey) => {
    setShowChartModal(true);
    if (onShowToast) onShowToast('info', `Control break opened for ${columnKey}`);
  };

  const handleMenuFilterValue = (columnKey, val) => {
    const filterKey = columnKey === 'name_of_coordinator' ? 'coordinator' : columnKey;
    setFilters((prev) => ({
      ...prev,
      [filterKey]: val,
    }));
    setPage(1);
    if (onShowToast) onShowToast('success', `Filtered by ${columnKey}: ${val}`);
  };

  // Download CSV
  const handleDownloadReport = () => {
    if (leads.length === 0) {
      if (onShowToast) onShowToast('warning', 'No data to export.');
      return;
    }
    const headers = LEAD_MASTER_COLUMNS.filter((c) => visibleKeys.includes(c.key));
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [
        headers.map((h) => `"${h.label}"`).join(','),
        ...leads.map((row) =>
          headers
            .map((h) => {
              const val = h.getValue(row);
              return `"${String(val !== undefined && val !== null ? val : '').replace(/"/g, '""')}"`;
            })
            .join(',')
        ),
      ].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Lead_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (onShowToast) onShowToast('success', 'CSV exported successfully.');
  };

  // Pagination navigation calculations
  const totalPages = rowsPerPage === 'all' ? 1 : Math.ceil(totalLeads / (Number(rowsPerPage) || 50)) || 1;
  const startRow = totalLeads === 0 ? 0 : (page - 1) * (rowsPerPage === 'all' ? totalLeads : Number(rowsPerPage)) + 1;
  const endRow = rowsPerPage === 'all' ? totalLeads : Math.min(page * Number(rowsPerPage), totalLeads);

  return (
    <div className="apex-master-page" style={{ padding: '0.75rem 1.25rem 2.5rem' }}>
      {/* Top Banner Pattern Strip */}
      <div className="apex-pattern-strip" style={{ marginBottom: '1rem', height: '4px' }} />

      {/* ==================================================================== */}
      {/* 1. REPORT VIEW (Screenshot 5: media_1794510274686_6aeadf5c.png)      */}
      {/* ==================================================================== */}
      {viewMode === 'report' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {/* Top Page Header: Title + Show Filters button matching Screenshot 5 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1 className="apex-page-heading" style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
              Lead
            </h1>

            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              style={{
                height: '32px',
                padding: '0 14px',
                backgroundColor: showFilters ? '#0f2035' : '#071531',
                border: 'none',
                borderRadius: '6px',
                color: '#ffffff',
                fontSize: '0.825rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'background-color 0.15s ease',
              }}
            >
              <IconFilter size={14} />
              <span>{showFilters ? 'Hide Filters' : 'Show Filters'}</span>
            </button>
          </div>

          {/* Collapsible Filter Bar Drawer */}
          {showFilters && (
            <div
              className="company-filters-card apex-filter-panel"
              style={{
                borderRadius: '8px',
                padding: '1rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                  gap: '0.75rem',
                  alignItems: 'flex-end',
                }}
              >
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    Account Manager
                  </label>
                  <select
                    className="apex-form-input"
                    value={filters.account_manager}
                    onChange={(e) => {
                      setFilters({ ...filters, account_manager: e.target.value });
                      setPage(1);
                    }}
                    style={{ width: '100%', height: '34px', fontSize: '0.825rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  >
                    <option value="">All Account Managers</option>
                    {lovs.accountManagers.map((am) => (
                      <option key={am} value={am}>{am}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    Coordinator
                  </label>
                  <select
                    className="apex-form-input"
                    value={filters.coordinator}
                    onChange={(e) => {
                      setFilters({ ...filters, coordinator: e.target.value });
                      setPage(1);
                    }}
                    style={{ width: '100%', height: '34px', fontSize: '0.825rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  >
                    <option value="">All Coordinators</option>
                    {lovs.coordinators.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    Probability
                  </label>
                  <select
                    className="apex-form-input"
                    value={filters.probability}
                    onChange={(e) => {
                      setFilters({ ...filters, probability: e.target.value });
                      setPage(1);
                    }}
                    style={{ width: '100%', height: '34px', fontSize: '0.825rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  >
                    <option value="">All Probabilities</option>
                    {lovs.probabilities.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    Company Type
                  </label>
                  <select
                    className="apex-form-input"
                    value={filters.company_type}
                    onChange={(e) => {
                      setFilters({ ...filters, company_type: e.target.value });
                      setPage(1);
                    }}
                    style={{ width: '100%', height: '34px', fontSize: '0.825rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  >
                    <option value="">All Types</option>
                    {lovs.companyTypes.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    Country
                  </label>
                  <select
                    className="apex-form-input"
                    value={filters.country}
                    onChange={(e) => {
                      setFilters({ ...filters, country: e.target.value });
                      setPage(1);
                    }}
                    style={{ width: '100%', height: '34px', fontSize: '0.825rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  >
                    <option value="">All Countries</option>
                    {lovs.countries.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    Industry
                  </label>
                  <input
                    type="text"
                    className="apex-form-input"
                    placeholder="Search industry..."
                    value={filters.industry}
                    onChange={(e) => {
                      setFilters({ ...filters, industry: e.target.value });
                      setPage(1);
                    }}
                    style={{ width: '100%', height: '34px', fontSize: '0.825rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    Technology
                  </label>
                  <input
                    type="text"
                    className="apex-form-input"
                    placeholder="Search technology..."
                    value={filters.technology}
                    onChange={(e) => {
                      setFilters({ ...filters, technology: e.target.value });
                      setPage(1);
                    }}
                    style={{ width: '100%', height: '34px', fontSize: '0.825rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>

                <div>
                  <button
                    type="button"
                    onClick={() => {
                      setFilters({
                        account_manager: '',
                        coordinator: '',
                        industry: '',
                        country: '',
                        technology: '',
                        probability: '',
                        company_type: '',
                        lead_type: '',
                        city: '',
                      });
                      setPage(1);
                    }}
                    className="btn-apex-cancel"
                    style={{
                      height: '34px',
                      padding: '0 14px',
                      borderRadius: '4px',
                      fontSize: '0.825rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      width: '100%',
                    }}
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Master Toolbar & Table Card */}
          <div
            className="apex-table-card dense-table-wrapper"
            style={{
              borderRadius: '8px',
              padding: '0.75rem 1rem',
            }}
          >
            {/* Top Toolbar matching Screenshot 5 */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.75rem',
                marginBottom: '0.75rem',
              }}
            >
              {/* Left Controls: Search bar + Go button + Rows + Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setAppliedSearch(search);
                    setPage(1);
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
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
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
                    className="btn-apex-go"
                    style={{
                      height: '34px',
                      padding: '0 14px',
                      borderRadius: '4px',
                      fontSize: '0.825rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Go
                  </button>
                </form>

                {/* Rows Selector: 10, 25, 50, 100, All */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginLeft: '0.25rem' }}>
                  <span style={{ fontSize: '0.825rem', color: 'var(--text-muted, #94a3b8)', fontWeight: 500 }}>Rows</span>
                  <div style={{ position: 'relative' }}>
                    <select
                      className="apex-form-input apex-rows-select"
                      value={rowsPerPage}
                      onChange={(e) => {
                        const val = e.target.value === 'all' ? 'all' : Number(e.target.value);
                        setRowsPerPage(val);
                        setPage(1);
                      }}
                      style={{
                        height: '34px',
                        padding: '0 24px 0 8px',
                        borderRadius: '4px',
                        fontSize: '0.825rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        appearance: 'none',
                      }}
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                      <option value="all">All</option>
                    </select>
                    <span style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748b' }}>
                      <IconChevronDown size={13} />
                    </span>
                  </div>
                </div>

                {/* Actions Dropdown */}
                <div style={{ position: 'relative' }}>
                  <button
                    type="button"
                    className="btn-apex-actions"
                    onClick={() => setShowActionsMenu(!showActionsMenu)}
                    style={{
                      height: '34px',
                      padding: '0 12px',
                      borderRadius: '4px',
                      fontSize: '0.825rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    Actions <IconChevronDown size={13} />
                  </button>

                  <ApexActionsMenu
                    isOpen={showActionsMenu}
                    onClose={() => setShowActionsMenu(false)}
                    onOpenColumns={() => setShowColumnsModal(true)}
                    onOpenFilter={() => setShowFilterModal(true)}
                    onOpenAggregate={() => setShowAggregateModal(true)}
                    onOpenChart={() => setShowChartModal(true)}
                    columns={LEAD_MASTER_COLUMNS}
                    data={leads}
                    reportId="lead_master_report"
                    onApplySort={(rules) => {
                      if (rules && rules[0] && rules[0].key) {
                        setSortBy(rules[0].key);
                        setSortOrder((rules[0].dir || 'asc').toUpperCase());
                        if (onShowToast) onShowToast('info', `Sorted by ${rules[0].key} (${(rules[0].dir || 'asc').toUpperCase()})`);
                      }
                    }}
                    onDownload={handleDownloadReport}
                    onRefresh={fetchLeads}
                    onResetReport={() => {
                      setSearch('');
                      setAppliedSearch('');
                      setAggregations([]);
                      setRowsPerPage(50);
                      setPage(1);
                      setFilters({
                        account_manager: '',
                        coordinator: '',
                        industry: '',
                        country: '',
                        technology: '',
                        probability: '',
                        company_type: '',
                        lead_type: '',
                        city: '',
                      });
                      if (onShowToast) onShowToast('info', 'Report reset to default.');
                    }}
                    onChangeRows={(r) => {
                      setRowsPerPage(r);
                      setPage(1);
                    }}
                    currentRows={rowsPerPage}
                    isEditableGrid={true}
                    hasSelection={selectedLeadIds.size > 0}
                    onSelectAll={toggleSelectAll}
                    onDeselectAll={() => setSelectedLeadIds(new Set())}
                  />
                </div>
              </div>

              {/* Right Controls: Change Account Manager + Create matching Screenshot 5 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedLeadIds.size === 0) {
                      if (onShowToast) onShowToast('info', 'Please select at least one lead row using the checkbox first.');
                      return;
                    }
                    setShowAcctMgrModal(true);
                  }}
                  style={{
                    height: '34px',
                    padding: '0 14px',
                    backgroundColor: '#071531',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.825rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span>Change Account Manager</span>
                  {selectedLeadIds.size > 0 && (
                    <span
                      style={{
                        backgroundColor: '#2563eb',
                        color: '#ffffff',
                        padding: '1px 6px',
                        borderRadius: '10px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                      }}
                    >
                      {selectedLeadIds.size}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => openLeadForm(null)}
                  style={{
                    height: '34px',
                    padding: '0 20px',
                    backgroundColor: '#071531',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.825rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Create
                </button>
              </div>
            </div>

            {/* Pagination Strip (matching Screenshot 5: "1 - 50 of 769 >") */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '0.5rem',
                fontSize: '0.825rem',
                color: '#475569',
              }}
            >
              <span>{totalLeads > 0 ? `${startRow} - ${endRow} of ${totalLeads}` : '0 - 0 of 0'}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    cursor: page <= 1 ? 'not-allowed' : 'pointer',
                    opacity: page <= 1 ? 0.35 : 1,
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    color: '#334155',
                  }}
                  title="Previous page"
                >
                  <IconChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                    opacity: page >= totalPages ? 0.35 : 1,
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    color: '#334155',
                  }}
                  title="Next page"
                >
                  <IconChevronRight size={16} />
                </button>
              </div>
            </div>

            {/* Active Filters Bar (Oracle APEX style) */}
            {Object.entries(filters).some(([_, v]) => v && String(v).trim() !== '') && (
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '4px',
                  marginBottom: '0.65rem',
                  fontSize: '0.8rem',
                }}
              >
                <span style={{ fontWeight: 600, color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <IconFilter size={13} /> Active Filters:
                </span>
                {Object.entries(filters)
                  .filter(([_, v]) => v && String(v).trim() !== '')
                  .map(([key, val]) => {
                    const col = LEAD_MASTER_COLUMNS.find((c) => c.key === key || (key === 'coordinator' && c.key === 'name_of_coordinator'));
                    const label = col ? col.label : key.replace(/_/g, ' ');
                    return (
                      <div
                        key={key}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          backgroundColor: '#eff6ff',
                          border: '1px solid #bfdbfe',
                          color: '#1d4ed8',
                          borderRadius: '4px',
                          padding: '2px 8px',
                          fontWeight: 500,
                        }}
                      >
                        <span>{label} = &quot;{val}&quot;</span>
                        <button
                          type="button"
                          onClick={() => {
                            setFilters((prev) => ({ ...prev, [key]: '' }));
                            setPage(1);
                          }}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#1d4ed8',
                            display: 'flex',
                            alignItems: 'center',
                            padding: 0,
                          }}
                          title="Remove filter"
                        >
                          <IconClose size={12} />
                        </button>
                      </div>
                    );
                  })}
                <button
                  type="button"
                  onClick={() => {
                    setFilters({
                      company_name: '',
                      account_manager: '',
                      coordinator: '',
                      industry: '',
                      country: '',
                      technology: '',
                      probability: '',
                      company_type: '',
                      lead_type: '',
                      city: '',
                    });
                    setPage(1);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#ef4444',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    marginLeft: 'auto',
                    textDecoration: 'underline',
                  }}
                >
                  Clear All Filters
                </button>
              </div>
            )}

            {/* Master Lead Report Table (Screenshot 5) */}
            <div style={{ overflowX: 'auto' }}>
              <table className="apex-master-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem' }}>
                <thead>
                  <tr className="apex-report-header-row" style={{ textAlign: 'left' }}>
                    <th style={{ width: '36px', padding: '0.65rem 0.5rem', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={totalLeads > 0 && selectedLeadIds.size >= totalLeads}
                        ref={(el) => {
                          if (el) {
                            el.indeterminate = selectedLeadIds.size > 0 && selectedLeadIds.size < totalLeads;
                          }
                        }}
                        onChange={toggleSelectAll}
                        title={
                          selectedLeadIds.size >= totalLeads && totalLeads > 0
                            ? `All ${totalLeads} leads selected`
                            : `Select all ${totalLeads} leads throughout report`
                        }
                      />
                    </th>
                    <th style={{ width: '36px', padding: '0.65rem 0.5rem', textAlign: 'center' }}></th>
                    {LEAD_MASTER_COLUMNS.filter((c) => visibleKeys.includes(c.key)).map((col) => (
                      <th
                        key={col.key}
                        onClick={(e) => handleHeaderClick(e, col)}
                        style={{
                          padding: '0.65rem 0.75rem',
                          fontWeight: 600,
                          color: '#1e293b',
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
                  {loading ? (
                    <tr>
                      <td colSpan={visibleKeys.length + 2} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                          <IconRefresh className="spin" size={16} /> Loading leads...
                        </div>
                      </td>
                    </tr>
                  ) : leads.length === 0 ? (
                    <tr>
                      <td colSpan={visibleKeys.length + 2} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                        No lead records found.
                      </td>
                    </tr>
                  ) : (
                    leads.map((row) => (
                      <tr
                        key={row.lead_id}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          backgroundColor: selectedLeadIds.has(row.lead_id) ? 'var(--primary-light, #f0f9ff)' : undefined,
                          transition: 'background-color 0.12s',
                        }}
                        onMouseEnter={(e) => {
                          if (!selectedLeadIds.has(row.lead_id)) e.currentTarget.style.backgroundColor = '#f8fafc';
                        }}
                        onMouseLeave={(e) => {
                          if (!selectedLeadIds.has(row.lead_id)) e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={selectedLeadIds.has(row.lead_id)}
                            onChange={() => toggleSelectRow(row.lead_id)}
                          />
                        </td>
                        <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                          <button
                            type="button"
                            className="apex-edit-icon-btn"
                            title="Edit Lead Form"
                            onClick={() => openLeadForm(row)}
                            style={{
                              border: 'none',
                              background: 'transparent',
                              padding: '4px',
                              cursor: 'pointer',
                              color: '#0284c7',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <IconFilePenLine size={14} color="#0284c7" />
                          </button>
                        </td>
                        {LEAD_MASTER_COLUMNS.filter((c) => visibleKeys.includes(c.key)).map((col) => {
                          const val = col.getValue(row);

                          // Interactive link for Company Name
                          if (col.key === 'company_name' && row.company_id && goToCompany) {
                            return (
                              <td key={col.key} style={{ padding: '0.65rem 0.75rem', color: '#1e293b' }}>
                                <a
                                  href={`#/companies?id=${row.company_id}`}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    try {
                                      localStorage.setItem('apex_return_tab', 'leads');
                                      localStorage.setItem('apex_return_hash', '#/leads');
                                    } catch (err) {}
                                    goToCompany(row.company_id, 'leads', '#/leads');
                                  }}
                                  style={{
                                    color: '#0284c7',
                                    fontWeight: 600,
                                    textDecoration: 'none',
                                    cursor: 'pointer',
                                  }}
                                  onMouseEnter={(e) => (e.target.style.textDecoration = 'underline')}
                                  onMouseLeave={(e) => (e.target.style.textDecoration = 'none')}
                                >
                                  {val || '-'}
                                </a>
                              </td>
                            );
                          }

                          // Interactive link for Contacts count or name
                          if (col.key === 'contacts' && row.contacts && goToContact && row.contact_id) {
                            return (
                              <td key={col.key} style={{ padding: '0.65rem 0.75rem', color: '#334155' }}>
                                <a
                                  href={`#/contacts?id=${row.contact_id}`}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    try {
                                      localStorage.setItem('apex_return_tab', 'leads');
                                      localStorage.setItem('apex_return_hash', '#/leads');
                                    } catch (err) {}
                                    goToContact(row.contact_id, 'leads', '#/leads');
                                  }}
                                  style={{
                                    color: '#0284c7',
                                    textDecoration: 'none',
                                    cursor: 'pointer',
                                  }}
                                  onMouseEnter={(e) => (e.target.style.textDecoration = 'underline')}
                                  onMouseLeave={(e) => (e.target.style.textDecoration = 'none')}
                                >
                                  {val || '-'}
                                </a>
                              </td>
                            );
                          }

                          // Probability badge
                          if (col.key === 'probability') {
                            return (
                              <td key={col.key} style={{ padding: '0.65rem 0.75rem' }}>
                                <span
                                  className="prob-badge"
                                  style={{
                                    display: 'inline-block',
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    backgroundColor: '#f1f5f9',
                                    color: '#1e293b',
                                  }}
                                >
                                  {val || '-'}
                                </span>
                              </td>
                            );
                          }

                          return (
                            <td key={col.key} style={{ padding: '0.65rem 0.75rem', color: '#334155' }}>
                              {val || '-'}
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Active Aggregations bar matching Master design */}
            {aggregations.length > 0 && (
              <ActiveAggregationsBar
                aggregations={aggregations.map((agg) => ({
                  ...agg,
                  value: computeAggregationValue(leads, agg.function, agg.column),
                }))}
                onRemoveAggregation={(idx) =>
                  setAggregations((prev) => prev.filter((_, i) => i !== idx))
                }
              />
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 2. FORM & SUB-TABS VIEW (Matching Screenshots 6-10)                   */}
      {/* ==================================================================== */}
      {viewMode === 'form' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {/* Sub-Tabs Bar matching Screenshot 6 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1.5rem',
              borderBottom: '2px solid transparent',
              marginBottom: '0.25rem',
              overflowX: 'auto',
            }}
          >
            {[
              { id: 'lead', label: 'Lead' },
              { id: 'lines', label: `Lead Lines${leadLines.length > 0 ? ` (${leadLines.length})` : ''}` },
              { id: 'contacts', label: `Lead Contacts${leadContacts.length > 0 ? ` (${leadContacts.length})` : ''}` },
              { id: 'naukri', label: `Naukri Advertisement${naukriAds.length > 0 ? ` (${naukriAds.length})` : ''}` },
              { id: 'proposals', label: `Proposals${proposals.length > 0 ? ` (${proposals.length})` : ''}` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  if (tab.id !== 'lead' && (!selectedLead || !selectedLead.lead_id)) {
                    if (onShowToast) onShowToast('info', 'Please save the Lead first before adding child records.');
                    return;
                  }
                  setActiveSubTab(tab.id);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '0.45rem 0.25rem',
                  fontSize: '0.875rem',
                  fontWeight: activeSubTab === tab.id ? 700 : 500,
                  color: activeSubTab === tab.id ? '#1e293b' : '#64748b',
                  borderBottom: activeSubTab === tab.id ? '2px solid #166534' : '2px solid transparent',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* SUBTAB 1: LEAD DETAILS FORM (Screenshot 6) */}
          {activeSubTab === 'lead' && (
            <div
              style={{
                borderRadius: '8px', border: '1px solid var(--border, #e2e8f0)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                overflow: 'hidden',
              }}
            >
              {/* Top Accent Strip + Dark Navy Header Banner */}
              <div style={{ height: '4px', backgroundColor: '#0f2035' }} />
              <div
                style={{
                  backgroundColor: '#071531',
                  color: '#ffffff',
                  padding: '0.65rem 1.25rem',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                }}
              >
                Lead
              </div>

              <form onSubmit={handleSaveLead} style={{ padding: '1.25rem' }}>
                {/* 3-Column Form Grid matching Screenshot 6 */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: '1rem 1.5rem',
                  }}
                >
                  {/* Column 1 */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                        Sr No
                      </label>
                      <input
                        type="text"
                        name="sr_no"
                        value={formData.sr_no || ''}
                        readOnly
                        style={{
                          width: '100%',
                          height: '36px',
                          borderRadius: '4px',
                          border: '1px solid #cbd5e1',
                          backgroundColor: '#f8fafc',
                          color: '#64748b',
                          padding: '0 0.5rem',
                          fontSize: '0.825rem',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                        Lead Date
                      </label>
                      <input
                        type="date"
                        name="lead_date"
                        value={toIsoDate(formData.lead_date)}
                        onChange={handleFormChange}
                        style={{
                          width: '100%',
                          height: '36px',
                          borderRadius: '4px',
                          border: errors.lead_date ? '1px solid #ef4444' : '1px solid #cbd5e1',
                          padding: '0 0.5rem',
                          fontSize: '0.825rem',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                        Company Name <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="text"
                        name="company_name"
                        list="lead_companies_datalist"
                        value={formData.company_name || ''}
                        onChange={handleFormChange}
                        placeholder="Select or enter Company Name"
                        style={{
                          width: '100%',
                          height: '36px',
                          borderRadius: '4px',
                          border: errors.company_name ? '1px solid #ef4444' : '1px solid #cbd5e1',
                          padding: '0 0.5rem',
                          fontSize: '0.825rem',
                        }}
                      />
                      <datalist id="lead_companies_datalist">
                        {lovs.companies.map((c) => (
                          <option key={c.id} value={c.comp_name} />
                        ))}
                      </datalist>
                      {errors.company_name && (
                        <span style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '2px', display: 'block' }}>
                          {errors.company_name}
                        </span>
                      )}
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                        Company Type
                      </label>
                      <input
                        type="text"
                        name="company_type"
                        list="company_types_datalist"
                        value={formData.company_type || ''}
                        onChange={handleFormChange}
                        placeholder="e.g. Direct Client, IT Company"
                        style={{
                          width: '100%',
                          height: '36px',
                          borderRadius: '4px',
                          border: '1px solid #cbd5e1',
                          padding: '0 0.5rem',
                          fontSize: '0.825rem',
                        }}
                      />
                      <datalist id="company_types_datalist">
                        {lovs.companyTypes.map((t) => (
                          <option key={t} value={t} />
                        ))}
                      </datalist>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                        DA
                      </label>
                      <input
                        type="text"
                        name="da"
                        value={formData.da || ''}
                        onChange={handleFormChange}
                        style={{
                          width: '100%',
                          height: '36px',
                          borderRadius: '4px',
                          border: '1px solid #cbd5e1',
                          padding: '0 0.5rem',
                          fontSize: '0.825rem',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                        Source
                      </label>
                      <select
                        name="source"
                        value={formData.source || ''}
                        onChange={handleFormChange}
                        style={{
                          width: '100%',
                          height: '36px',
                          borderRadius: '4px',
                          border: '1px solid #cbd5e1',
                          padding: '0 0.5rem',
                          fontSize: '0.825rem',
                          backgroundColor: '#ffffff',
                        }}
                      >
                        <option value="">Select Source</option>
                        {lovs.sources.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                        Currency
                      </label>
                      <select
                        name="currency_id"
                        value={formData.currency_id || ''}
                        onChange={(e) => {
                          const cid = e.target.value;
                          const found = lovs.currencies.find((c) => String(c.currency_id) === String(cid));
                          setFormData((prev) => ({
                            ...prev,
                            currency_id: cid,
                            currency_code: found ? found.currency_code : '',
                          }));
                        }}
                        style={{
                          width: '100%',
                          height: '36px',
                          borderRadius: '4px',
                          border: '1px solid #cbd5e1',
                          padding: '0 0.5rem',
                          fontSize: '0.825rem',
                          backgroundColor: '#ffffff',
                        }}
                      >
                        <option value="">Select Currency</option>
                        {lovs.currencies.map((c) => (
                          <option key={c.currency_id} value={c.currency_id}>
                            {c.currency_code} - {c.currency_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                        End Client
                      </label>
                      <input
                        type="text"
                        name="end_client"
                        value={formData.end_client || ''}
                        onChange={handleFormChange}
                        style={{
                          width: '100%',
                          height: '36px',
                          borderRadius: '4px',
                          border: '1px solid #cbd5e1',
                          padding: '0 0.5rem',
                          fontSize: '0.825rem',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                        Connection Sent
                      </label>
                      <select
                        name="connection_sent"
                        value={formData.connection_sent || 'No'}
                        onChange={handleFormChange}
                        style={{
                          width: '100%',
                          height: '36px',
                          borderRadius: '4px',
                          border: '1px solid #cbd5e1',
                          padding: '0 0.5rem',
                          fontSize: '0.825rem',
                          backgroundColor: '#ffffff',
                        }}
                      >
                        <option value="No">No</option>
                        <option value="Yes">Yes</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                        Reason
                      </label>
                      <textarea
                        name="reason"
                        rows={3}
                        value={formData.reason || ''}
                        onChange={handleFormChange}
                        placeholder="Reason..."
                        style={{
                          width: '100%',
                          borderRadius: '4px',
                          border: '1px solid #cbd5e1',
                          padding: '0.5rem',
                          fontSize: '0.825rem',
                        }}
                      />
                    </div>

                    {selectedLead && selectedLead.lead_id && (
                      <>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                            Created By
                          </label>
                          <input
                            type="text"
                            name="created_by"
                            value={formData.created_by || 'ADMIN'}
                            readOnly
                            style={{
                              width: '100%',
                              height: '36px',
                              borderRadius: '4px',
                              border: '1px solid #cbd5e1',
                              backgroundColor: '#f8fafc',
                              color: '#64748b',
                              padding: '0 0.5rem',
                              fontSize: '0.825rem',
                            }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                            Modified Date
                          </label>
                          <input
                            type="text"
                            name="modified_date"
                            value={formData.modified_date || ''}
                            readOnly
                            style={{
                              width: '100%',
                              height: '36px',
                              borderRadius: '4px',
                              border: '1px solid #cbd5e1',
                              backgroundColor: '#f8fafc',
                              color: '#64748b',
                              padding: '0 0.5rem',
                              fontSize: '0.825rem',
                            }}
                          />
                        </div>
                      </>
                    )}
                  </div>

                  {/* Column 2 */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                        Name of Coordinator
                      </label>
                      <select
                        name="name_of_coordinator"
                        value={formData.name_of_coordinator || ''}
                        onChange={handleFormChange}
                        style={{
                          width: '100%',
                          height: '36px',
                          borderRadius: '4px',
                          border: '1px solid #cbd5e1',
                          padding: '0 0.5rem',
                          fontSize: '0.825rem',
                          backgroundColor: '#ffffff',
                        }}
                      >
                        <option value="">Select Coordinator</option>
                        {lovs.coordinators.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                        Lead Type
                      </label>
                      <select
                        name="lead_type"
                        value={formData.lead_type || 'New Client'}
                        onChange={handleFormChange}
                        style={{
                          width: '100%',
                          height: '36px',
                          borderRadius: '4px',
                          border: '1px solid #cbd5e1',
                          padding: '0 0.5rem',
                          fontSize: '0.825rem',
                          backgroundColor: '#ffffff',
                        }}
                      >
                        <option value="New Client">New Client</option>
                        <option value="Existing Client">Existing Client</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                        Company URL
                      </label>
                      <input
                        type="text"
                        name="company_url"
                        value={formData.company_url || ''}
                        onChange={handleFormChange}
                        placeholder="https://..."
                        style={{
                          width: '100%',
                          height: '36px',
                          borderRadius: '4px',
                          border: '1px solid #cbd5e1',
                          padding: '0 0.5rem',
                          fontSize: '0.825rem',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                        City
                      </label>
                      <input
                        type="text"
                        name="city"
                        value={formData.city || ''}
                        onChange={handleFormChange}
                        style={{
                          width: '100%',
                          height: '36px',
                          borderRadius: '4px',
                          border: '1px solid #cbd5e1',
                          padding: '0 0.5rem',
                          fontSize: '0.825rem',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                        Status
                      </label>
                      <input
                        type="text"
                        name="status"
                        value={formData.status || ''}
                        onChange={handleFormChange}
                        placeholder="e.g. Open, Discussion, Won, Lost"
                        style={{
                          width: '100%',
                          height: '36px',
                          borderRadius: '4px',
                          border: '1px solid #cbd5e1',
                          padding: '0 0.5rem',
                          fontSize: '0.825rem',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                        Referrer
                      </label>
                      <input
                        type="text"
                        name="referrer"
                        value={formData.referrer || ''}
                        onChange={handleFormChange}
                        style={{
                          width: '100%',
                          height: '36px',
                          borderRadius: '4px',
                          border: '1px solid #cbd5e1',
                          padding: '0 0.5rem',
                          fontSize: '0.825rem',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                        Amount
                      </label>
                      <input
                        type="number"
                        step="any"
                        name="amount"
                        value={formData.amount !== undefined && formData.amount !== null ? formData.amount : ''}
                        onChange={handleFormChange}
                        style={{
                          width: '100%',
                          height: '36px',
                          borderRadius: '4px',
                          border: '1px solid #cbd5e1',
                          padding: '0 0.5rem',
                          fontSize: '0.825rem',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                        Page URL
                      </label>
                      <input
                        type="text"
                        name="page_url"
                        value={formData.page_url || ''}
                        onChange={handleFormChange}
                        style={{
                          width: '100%',
                          height: '36px',
                          borderRadius: '4px',
                          border: '1px solid #cbd5e1',
                          padding: '0 0.5rem',
                          fontSize: '0.825rem',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                        Last Followup
                      </label>
                      <input
                        type="date"
                        name="last_followup"
                        value={toIsoDate(formData.last_followup)}
                        onChange={handleFormChange}
                        style={{
                          width: '100%',
                          height: '36px',
                          borderRadius: '4px',
                          border: errors.last_followup ? '1px solid #ef4444' : '1px solid #cbd5e1',
                          padding: '0 0.5rem',
                          fontSize: '0.825rem',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                        Lead Month
                      </label>
                      <input
                        type="text"
                        name="month"
                        value={formData.month || ''}
                        onChange={handleFormChange}
                        style={{
                          width: '100%',
                          height: '36px',
                          borderRadius: '4px',
                          border: '1px solid #cbd5e1',
                          padding: '0 0.5rem',
                          fontSize: '0.825rem',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                        Created Date
                      </label>
                      <input
                        type="text"
                        name="created_date"
                        value={formData.created_date || ''}
                        readOnly
                        style={{
                          width: '100%',
                          height: '36px',
                          borderRadius: '4px',
                          border: '1px solid #cbd5e1',
                          backgroundColor: '#f8fafc',
                          color: '#64748b',
                          padding: '0 0.5rem',
                          fontSize: '0.825rem',
                        }}
                      />
                    </div>
                  </div>

                  {/* Column 3 */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                        Account Manager
                      </label>
                      <select
                        name="account_manager"
                        value={formData.account_manager || ''}
                        onChange={handleFormChange}
                        style={{
                          width: '100%',
                          height: '36px',
                          borderRadius: '4px',
                          border: '1px solid #cbd5e1',
                          padding: '0 0.5rem',
                          fontSize: '0.825rem',
                          backgroundColor: '#ffffff',
                        }}
                      >
                        <option value="">Select Account Manager</option>
                        {lovs.accountManagers.map((am) => (
                          <option key={am} value={am}>{am}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                        Probability
                      </label>
                      <select
                        name="probability"
                        value={formData.probability || 'P4'}
                        onChange={handleFormChange}
                        style={{
                          width: '100%',
                          height: '36px',
                          borderRadius: '4px',
                          border: '1px solid #cbd5e1',
                          padding: '0 0.5rem',
                          fontSize: '0.825rem',
                          backgroundColor: '#ffffff',
                        }}
                      >
                        <option value="P1">P1</option>
                        <option value="P2">P2</option>
                        <option value="P3">P3</option>
                        <option value="P4">P4</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                        Industry
                      </label>
                      <input
                        type="text"
                        name="industry"
                        list="industries_datalist"
                        value={formData.industry || ''}
                        onChange={handleFormChange}
                        style={{
                          width: '100%',
                          height: '36px',
                          borderRadius: '4px',
                          border: '1px solid #cbd5e1',
                          padding: '0 0.5rem',
                          fontSize: '0.825rem',
                        }}
                      />
                      <datalist id="industries_datalist">
                        {lovs.industries.map((ind) => (
                          <option key={ind} value={ind} />
                        ))}
                      </datalist>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                        Country
                      </label>
                      <input
                        type="text"
                        name="country"
                        list="countries_datalist"
                        value={formData.country || ''}
                        onChange={handleFormChange}
                        style={{
                          width: '100%',
                          height: '36px',
                          borderRadius: '4px',
                          border: '1px solid #cbd5e1',
                          padding: '0 0.5rem',
                          fontSize: '0.825rem',
                        }}
                      />
                      <datalist id="countries_datalist">
                        {lovs.countries.map((c) => (
                          <option key={c} value={c} />
                        ))}
                      </datalist>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                        Status Detail
                      </label>
                      <textarea
                        name="status_detail"
                        rows={3}
                        value={formData.status_detail || ''}
                        onChange={handleFormChange}
                        placeholder="Detailed status updates..."
                        style={{
                          width: '100%',
                          borderRadius: '4px',
                          border: '1px solid #cbd5e1',
                          padding: '0.5rem',
                          fontSize: '0.825rem',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                        Contract No
                      </label>
                      <input
                        type="text"
                        name="contract_no"
                        value={formData.contract_no || ''}
                        onChange={handleFormChange}
                        placeholder="e.g. CNT-2026-001"
                        style={{
                          width: '100%',
                          height: '36px',
                          borderRadius: '4px',
                          border: '1px solid #cbd5e1',
                          padding: '0 0.5rem',
                          fontSize: '0.825rem',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                        Amount in INR
                      </label>
                      <input
                        type="number"
                        step="any"
                        name="amount_in_inr"
                        value={formData.amount_in_inr !== undefined && formData.amount_in_inr !== null ? formData.amount_in_inr : ''}
                        onChange={handleFormChange}
                        style={{
                          width: '100%',
                          height: '36px',
                          borderRadius: '4px',
                          border: '1px solid #cbd5e1',
                          padding: '0 0.5rem',
                          fontSize: '0.825rem',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                        Proposal
                      </label>
                      <select
                        name="proposal"
                        value={formData.proposal || 'No'}
                        onChange={handleFormChange}
                        style={{
                          width: '100%',
                          height: '36px',
                          borderRadius: '4px',
                          border: '1px solid #cbd5e1',
                          padding: '0 0.5rem',
                          fontSize: '0.825rem',
                          backgroundColor: '#ffffff',
                        }}
                      >
                        <option value="No">No</option>
                        <option value="Yes">Yes</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                        Lead Time
                      </label>
                      <input
                        type="text"
                        name="lead_time"
                        value={formData.lead_time || ''}
                        onChange={handleFormChange}
                        placeholder="e.g. 10:30 AM"
                        style={{
                          width: '100%',
                          height: '36px',
                          borderRadius: '4px',
                          border: '1px solid #cbd5e1',
                          padding: '0 0.5rem',
                          fontSize: '0.825rem',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                        Lead Year
                      </label>
                      <input
                        type="number"
                        name="year"
                        value={formData.year || ''}
                        onChange={handleFormChange}
                        style={{
                          width: '100%',
                          height: '36px',
                          borderRadius: '4px',
                          border: '1px solid #cbd5e1',
                          padding: '0 0.5rem',
                          fontSize: '0.825rem',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                        Modified By
                      </label>
                      <input
                        type="text"
                        name="modified_by"
                        value={formData.modified_by || ''}
                        readOnly
                        style={{
                          width: '100%',
                          height: '36px',
                          borderRadius: '4px',
                          border: '1px solid #cbd5e1',
                          backgroundColor: '#f8fafc',
                          color: '#64748b',
                          padding: '0 0.5rem',
                          fontSize: '0.825rem',
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Form Action Buttons matching Screenshot 6 */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: '1.5rem',
                    paddingTop: '1rem',
                    borderTop: '1px solid #f1f5f9',
                  }}
                >
                  <button
                    type="button"
                    className="btn-apex-cancel"
                    onClick={closeFormView}
                  >
                    Cancel
                  </button>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {selectedLead && selectedLead.lead_id && (
                      <button
                        type="button"
                        onClick={handleDeleteLead}
                        disabled={formSubmitting}
                        className="btn btn-secondary"
                        style={{ minWidth: '100px', height: '38px', color: '#dc2626' }}
                      >
                        Delete
                      </button>
                    )}

                    <button
                      type="submit"
                      disabled={formSubmitting}
                      className="btn-apex-top"
                    >
                      {selectedLead && selectedLead.lead_id ? 'Apply Changes' : 'Create'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* SUBTAB 2: LEAD LINES (Screenshots 7 & 8) */}
          {activeSubTab === 'lines' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {editingLine ? (
                /* Edit/Create Lead Line Form (Screenshot 8) */
                <div
                  style={{
                    borderRadius: '8px', border: '1px solid var(--border, #e2e8f0)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    overflow: 'hidden',
                  }}
                >
                  <div style={{ height: '4px', backgroundColor: '#0f2035' }} />
                  <div
                    style={{
                      backgroundColor: '#071531',
                      color: '#ffffff',
                      padding: '0.65rem 1.25rem',
                      fontSize: '0.9rem',
                      fontWeight: 700,
                    }}
                  >
                    Lead Lines
                  </div>

                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      try {
                        if (editingLine.lead_line_id) {
                          await api.updateLeadLine(editingLine.lead_line_id, editingLine);
                          if (onShowToast) onShowToast('success', 'Lead Line updated.');
                        } else {
                          await api.createLeadLine(selectedLead.lead_id, editingLine);
                          if (onShowToast) onShowToast('success', 'Lead Line created.');
                        }
                        setEditingLine(null);
                        loadChildData(selectedLead.lead_id);
                      } catch (err) {
                        if (onShowToast) onShowToast('error', err.message);
                      }
                    }}
                    style={{ padding: '1.25rem' }}
                  >
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                        gap: '1rem 1.5rem',
                      }}
                    >
                      {/* Col 1 */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                            Technology
                          </label>
                          <input
                            type="text"
                            value={editingLine.technology || ''}
                            onChange={(e) => setEditingLine({ ...editingLine, technology: e.target.value })}
                            placeholder="e.g. Node JS, Python, Apex"
                            style={{ width: '100%', height: '36px', borderRadius: '4px', border: '1px solid #cbd5e1', padding: '0 0.5rem', fontSize: '0.825rem' }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                            Model
                          </label>
                          <select
                            value={editingLine.model || ''}
                            onChange={(e) => setEditingLine({ ...editingLine, model: e.target.value })}
                            style={{ width: '100%', height: '36px', borderRadius: '4px', border: '1px solid #cbd5e1', padding: '0 0.5rem', fontSize: '0.825rem', backgroundColor: '#ffffff' }}
                          >
                            <option value="">Select Model</option>
                            {lovs.models.map((m) => (
                              <option key={m} value={m}>{m}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                            No Of Resources
                          </label>
                          <input
                            type="text"
                            value={editingLine.no_of_resources || ''}
                            onChange={(e) => setEditingLine({ ...editingLine, no_of_resources: e.target.value })}
                            style={{ width: '100%', height: '36px', borderRadius: '4px', border: '1px solid #cbd5e1', padding: '0 0.5rem', fontSize: '0.825rem' }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                            Exchange Rate Value
                          </label>
                          <input
                            type="number"
                            step="any"
                            value={editingLine.exchange_rate_value || ''}
                            onChange={(e) => setEditingLine({ ...editingLine, exchange_rate_value: e.target.value })}
                            style={{ width: '100%', height: '36px', borderRadius: '4px', border: '1px solid #cbd5e1', padding: '0 0.5rem', fontSize: '0.825rem' }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                            Requirement Description
                          </label>
                          <textarea
                            rows={3}
                            value={editingLine.requirement_description || ''}
                            onChange={(e) => setEditingLine({ ...editingLine, requirement_description: e.target.value })}
                            style={{ width: '100%', borderRadius: '4px', border: '1px solid #cbd5e1', padding: '0.5rem', fontSize: '0.825rem' }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                            CV Sent
                          </label>
                          <select
                            value={editingLine.cv_sent || 'No'}
                            onChange={(e) => setEditingLine({ ...editingLine, cv_sent: e.target.value })}
                            style={{ width: '100%', height: '36px', borderRadius: '4px', border: '1px solid #cbd5e1', padding: '0 0.5rem', fontSize: '0.825rem', backgroundColor: '#ffffff' }}
                          >
                            <option value="No">No</option>
                            <option value="Yes">Yes</option>
                          </select>
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                            Modified By
                          </label>
                          <input
                            type="text"
                            value={editingLine.modified_by || ''}
                            readOnly
                            style={{ width: '100%', height: '36px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#64748b', padding: '0 0.5rem', fontSize: '0.825rem' }}
                          />
                        </div>
                      </div>

                      {/* Col 2 */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                            Technology Required
                          </label>
                          <input
                            type="text"
                            value={editingLine.technology_required || ''}
                            onChange={(e) => setEditingLine({ ...editingLine, technology_required: e.target.value })}
                            style={{ width: '100%', height: '36px', borderRadius: '4px', border: '1px solid #cbd5e1', padding: '0 0.5rem', fontSize: '0.825rem' }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                            Currency Code
                          </label>
                          <select
                            value={editingLine.currency_id || ''}
                            onChange={(e) => {
                              const cid = e.target.value;
                              const found = lovs.currencies.find((c) => String(c.currency_id) === String(cid));
                              setEditingLine({
                                ...editingLine,
                                currency_id: cid,
                                currency_code: found ? found.currency_code : '',
                              });
                            }}
                            style={{ width: '100%', height: '36px', borderRadius: '4px', border: '1px solid #cbd5e1', padding: '0 0.5rem', fontSize: '0.825rem', backgroundColor: '#ffffff' }}
                          >
                            <option value="">Select Currency</option>
                            {lovs.currencies.map((c) => (
                              <option key={c.currency_id} value={c.currency_id}>{c.currency_code}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                            Duration
                          </label>
                          <input
                            type="text"
                            value={editingLine.duration || ''}
                            onChange={(e) => setEditingLine({ ...editingLine, duration: e.target.value })}
                            style={{ width: '100%', height: '36px', borderRadius: '4px', border: '1px solid #cbd5e1', padding: '0 0.5rem', fontSize: '0.825rem' }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                            Amount in INR
                          </label>
                          <input
                            type="number"
                            step="any"
                            value={editingLine.amount_in_inr || ''}
                            onChange={(e) => setEditingLine({ ...editingLine, amount_in_inr: e.target.value })}
                            style={{ width: '100%', height: '36px', borderRadius: '4px', border: '1px solid #cbd5e1', padding: '0 0.5rem', fontSize: '0.825rem' }}
                          />
                        </div>

                        {editingLine && editingLine.lead_line_id && (
                          <>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                                Created By
                              </label>
                              <input
                                type="text"
                                value={editingLine.created_by || 'ADMIN'}
                                readOnly
                                style={{ width: '100%', height: '36px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#64748b', padding: '0 0.5rem', fontSize: '0.825rem' }}
                              />
                            </div>

                            <div>
                              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                                Modified Date
                              </label>
                              <input
                                type="text"
                                value={editingLine.modified_date || ''}
                                readOnly
                                style={{ width: '100%', height: '36px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#64748b', padding: '0 0.5rem', fontSize: '0.825rem' }}
                              />
                            </div>
                          </>
                        )}
                      </div>

                      {/* Col 3 */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                            Experience
                          </label>
                          <input
                            type="text"
                            value={editingLine.experience || ''}
                            onChange={(e) => setEditingLine({ ...editingLine, experience: e.target.value })}
                            style={{ width: '100%', height: '36px', borderRadius: '4px', border: '1px solid #cbd5e1', padding: '0 0.5rem', fontSize: '0.825rem' }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                            Rate
                          </label>
                          <input
                            type="number"
                            step="any"
                            value={editingLine.rate || ''}
                            onChange={(e) => setEditingLine({ ...editingLine, rate: e.target.value })}
                            style={{ width: '100%', height: '36px', borderRadius: '4px', border: '1px solid #cbd5e1', padding: '0 0.5rem', fontSize: '0.825rem' }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                            Amount
                          </label>
                          <input
                            type="number"
                            step="any"
                            value={editingLine.amount || ''}
                            onChange={(e) => setEditingLine({ ...editingLine, amount: e.target.value })}
                            style={{ width: '100%', height: '36px', borderRadius: '4px', border: '1px solid #cbd5e1', padding: '0 0.5rem', fontSize: '0.825rem' }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                            Required Service
                          </label>
                          <select
                            value={editingLine.required_service || ''}
                            onChange={(e) => setEditingLine({ ...editingLine, required_service: e.target.value })}
                            style={{ width: '100%', height: '36px', borderRadius: '4px', border: '1px solid #cbd5e1', padding: '0 0.5rem', fontSize: '0.825rem', backgroundColor: '#ffffff' }}
                          >
                            <option value="">Select Service</option>
                            {lovs.requiredServices.map((rs) => (
                              <option key={rs} value={rs}>{rs}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                            CV Made By
                          </label>
                          <select
                            value={editingLine.cv_made_by || ''}
                            onChange={(e) => setEditingLine({ ...editingLine, cv_made_by: e.target.value })}
                            style={{ width: '100%', height: '36px', borderRadius: '4px', border: '1px solid #cbd5e1', padding: '0 0.5rem', fontSize: '0.825rem', backgroundColor: '#ffffff' }}
                          >
                            <option value="">Select</option>
                            {lovs.cvMadeBy.map((cv) => (
                              <option key={cv} value={cv}>{cv}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                            Created Date
                          </label>
                          <input
                            type="text"
                            value={editingLine.created_date || ''}
                            readOnly
                            style={{ width: '100%', height: '36px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#64748b', padding: '0 0.5rem', fontSize: '0.825rem' }}
                          />
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginTop: '1.5rem',
                        paddingTop: '1rem',
                        borderTop: '1px solid #f1f5f9',
                      }}
                    >
                      <button
                        type="button"
                        className="btn-apex-cancel"
                        onClick={() => setEditingLine(null)}
                      >
                        Cancel
                      </button>

                      <button
                        type="submit"
                        className="btn-apex-top"
                      >
                        {editingLine.lead_line_id ? 'Apply Changes' : 'Create'}
                      </button>
                    </div>
                  </form>

                  {/* Resource Section Below Lead Line Form matching Screenshot 8 bottom */}
                  <div style={{ padding: '0 1.25rem 1.25rem' }}>
                    <div
                      style={{
                        backgroundColor: '#ffffff',
                        borderRadius: '6px',
                        border: '1px solid #e2e8f0',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          backgroundColor: '#071531',
                          color: '#ffffff',
                          padding: '0.55rem 1rem',
                          fontSize: '0.85rem',
                          fontWeight: 700,
                        }}
                      >
                        Resource
                      </div>

                      <div
                        style={{
                          padding: '0.75rem 1rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '0.75rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.825rem', color: '#475569', fontWeight: 600 }}>Type Filter</span>
                          <select
                            value={resourceTypeFilter}
                            onChange={(e) => setResourceTypeFilter(e.target.value)}
                            style={{
                              height: '32px',
                              borderRadius: '4px',
                              border: '1px solid #cbd5e1',
                              padding: '0 0.5rem',
                              fontSize: '0.825rem',
                              backgroundColor: '#ffffff',
                            }}
                          >
                            <option value="Iqra Employee">Iqra Employee</option>
                            <option value="Contractor">Contractor</option>
                          </select>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            const rName = prompt('Enter Resource Name:');
                            if (rName && rName.trim()) {
                              api.createLeadResource(selectedLead.lead_id, {
                                lead_line_id: editingLine.lead_line_id || null,
                                resource_name: rName.trim(),
                                resource_type: resourceTypeFilter,
                              })
                                .then((res) => {
                                  if (res && res.success) {
                                    if (onShowToast) onShowToast('success', 'Resource added.');
                                    loadChildData(selectedLead.lead_id);
                                  }
                                })
                                .catch((err) => {
                                  if (onShowToast) onShowToast('error', err.message);
                                });
                            }
                          }}
                          style={{
                            height: '32px',
                            padding: '0 14px',
                            backgroundColor: '#071531',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '0.825rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Create Resource
                        </button>
                      </div>

                      <ApexInteractiveReport
                        columns={leadResourceReportColumns}
                        data={leadResources}
                        rowsPerPage={10}
                        renderTrailingCell={(res) => (
                          <button
                            type="button"
                            onClick={async () => {
                              if (window.confirm(`Remove resource ${res.resource_name}?`)) {
                                await api.deleteLeadResource(res.resource_id);
                                loadChildData(selectedLead.lead_id);
                              }
                            }}
                            style={{
                              border: "none",
                              background: "transparent",
                              color: "#ef4444",
                              cursor: "pointer",
                              padding: "4px",
                            }}
                            title="Delete resource"
                          >
                            <IconTrash size={14} />
                          </button>
                        )}
                        onRefresh={() => loadChildData(selectedLead.lead_id)}
                        onShowToast={onShowToast}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* Lead Lines Table View (Screenshot 7) */
                <div
                  style={{
                    borderRadius: '8px', border: '1px solid var(--border, #e2e8f0)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    overflow: 'hidden',
                  }}
                >
                  <div style={{ height: '4px', backgroundColor: '#0f2035' }} />
                  <div
                    style={{
                      backgroundColor: '#071531',
                      color: '#ffffff',
                      padding: '0.65rem 1.25rem',
                      fontSize: '0.9rem',
                      fontWeight: 700,
                    }}
                  >
                    Lead Lines
                  </div>

                <ApexInteractiveReport
                  columns={leadLineReportColumns}
                  data={leadLines}
                  rowsPerPage={10}
                  toolbarButtons={
                    <button
                      type="button"
                      onClick={() =>
                        setEditingLine({
                          technology: "",
                          technology_required: "",
                          experience: "",
                          model: "Project Based",
                          currency_id: 1,
                          currency_code: "USD",
                          rate: "",
                          no_of_resources: "1",
                          duration: "",
                          amount: "",
                          exchange_rate_value: "",
                          amount_in_inr: "",
                          required_service: "Project-based",
                          requirement_description: "",
                          cv_made_by: "Not Applicable",
                          cv_sent: "No",
                          created_by: "ADMIN",
                          created_date: "20-JUL-2026",
                        })
                      }
                      style={{
                        height: "34px",
                        padding: "0 18px",
                        backgroundColor: "#071531",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "6px",
                        fontSize: "0.825rem",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Create Lines
                    </button>
                  }
                  renderLeadingCell={(ln) => (
                    <button
                      type="button"
                      className="apex-edit-icon-btn"
                      onClick={() => setEditingLine(ln)}
                      title="Edit line"
                      style={{
                        border: "none",
                        background: "transparent",
                        padding: "4px",
                        cursor: "pointer",
                        color: "#0284c7",
                      }}
                    >
                      <IconFilePenLine size={14} color="#0284c7" />
                    </button>
                  )}
                  renderTrailingCell={(ln) => (
                    <button
                      type="button"
                      onClick={async () => {
                        if (window.confirm("Delete this line item?")) {
                          await api.deleteLeadLine(ln.lead_line_id);
                          loadChildData(selectedLead.lead_id);
                        }
                      }}
                      style={{
                        border: "none",
                        background: "transparent",
                        color: "#ef4444",
                        cursor: "pointer",
                        padding: "4px",
                      }}
                      title="Delete line"
                    >
                      <IconTrash size={14} />
                    </button>
                  )}
                  onRefresh={() => loadChildData(selectedLead.lead_id)}
                  onShowToast={onShowToast}
                />
                </div>
              )}
            </div>
          )}

          {/* SUBTAB 3: LEAD CONTACTS (Screenshot 9) */}
          {activeSubTab === 'contacts' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div
                style={{
                  borderRadius: '8px', border: '1px solid var(--border, #e2e8f0)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  overflow: 'hidden',
                }}
              >
                <div style={{ height: '4px', backgroundColor: '#0f2035' }} />
                <div
                  style={{
                    backgroundColor: '#071531',
                    color: '#ffffff',
                    padding: '0.65rem 1.25rem',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                  }}
                >
                  Lead Contacts
                </div>

                <ApexInteractiveReport
                  columns={leadContactReportColumns}
                  data={leadContacts}
                  rowsPerPage={10}
                  toolbarButtons={
                    <button
                      type="button"
                      onClick={() =>
                        setEditingContact({
                          client_full_name: "",
                          designation: "",
                          email: "",
                          mobile_number: "",
                          interview_status: "Scheduled",
                          proposal: "No",
                          connection_sent: "Yes",
                          linkedin_url: "",
                          department: "IT",
                          role: "Decision maker",
                          created_by: "ADMIN",
                          created_date: "07/09/2026",
                          modified_by: "ADMIN",
                          modified_date: "11/09/2026",
                        })
                      }
                      style={{
                        height: "34px",
                        padding: "0 18px",
                        backgroundColor: "#071531",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "6px",
                        fontSize: "0.825rem",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Add Contact
                    </button>
                  }
                  renderLeadingCell={(ct) => (
                    <button
                      type="button"
                      className="apex-edit-icon-btn"
                      onClick={() => setEditingContact(ct)}
                      title="Edit contact"
                      style={{
                        border: "none",
                        background: "transparent",
                        padding: "4px",
                        cursor: "pointer",
                        color: "#0284c7",
                      }}
                    >
                      <IconFilePenLine size={14} color="#0284c7" />
                    </button>
                  )}
                  renderTrailingCell={(ct) => (
                    <button
                      type="button"
                      onClick={async () => {
                        if (window.confirm(`Delete contact ${ct.client_full_name}?`)) {
                          await api.deleteLeadContact(ct.lead_contact_id);
                          loadChildData(selectedLead.lead_id);
                        }
                      }}
                      style={{
                        border: "none",
                        background: "transparent",
                        color: "#ef4444",
                        cursor: "pointer",
                        padding: "4px",
                      }}
                      title="Delete contact"
                    >
                      <IconTrash size={14} />
                    </button>
                  )}
                  onRefresh={() => loadChildData(selectedLead.lead_id)}
                  onShowToast={onShowToast}
                />
              </div>
            </div>
          )}

          {/* SUBTAB 4: NAUKRI ADVERTISEMENT */}
          {activeSubTab === 'naukri' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div
                style={{
                  borderRadius: '8px', border: '1px solid var(--border, #e2e8f0)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  overflow: 'hidden',
                }}
              >
                <div style={{ height: '4px', backgroundColor: '#0f2035' }} />
                <div
                  style={{
                    backgroundColor: '#071531',
                    color: '#ffffff',
                    padding: '0.65rem 1.25rem',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                  }}
                >
                  Naukri Advertisement
                </div>

                <ApexInteractiveReport
                  columns={leadNaukriReportColumns}
                  data={naukriAds}
                  rowsPerPage={10}
                  toolbarButtons={
                    <button
                      type="button"
                      onClick={() =>
                        setEditingNaukri({
                          title: "",
                          job_location: "Dubai",
                          min_experience: 3,
                          max_experience: 6,
                          vacancies: 1,
                          job_description: "",
                          status: "Active",
                        })
                      }
                      style={{
                        height: "34px",
                        padding: "0 18px",
                        backgroundColor: "#071531",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "6px",
                        fontSize: "0.825rem",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Add Advertisement
                    </button>
                  }
                  renderLeadingCell={(ad) => (
                    <button
                      type="button"
                      className="apex-edit-icon-btn"
                      onClick={() => setEditingNaukri(ad)}
                      title="Edit ad"
                      style={{
                        border: "none",
                        background: "transparent",
                        padding: "4px",
                        cursor: "pointer",
                        color: "#0284c7",
                      }}
                    >
                      <IconFilePenLine size={14} color="#0284c7" />
                    </button>
                  )}
                  renderTrailingCell={(ad) => (
                    <button
                      type="button"
                      onClick={async () => {
                        if (window.confirm(`Delete advertisement ${ad.title}?`)) {
                          await api.deleteLeadNaukriAd(ad.ad_id);
                          loadChildData(selectedLead.lead_id);
                        }
                      }}
                      style={{
                        border: "none",
                        background: "transparent",
                        color: "#ef4444",
                        cursor: "pointer",
                        padding: "4px",
                      }}
                      title="Delete ad"
                    >
                      <IconTrash size={14} />
                    </button>
                  )}
                  onRefresh={() => loadChildData(selectedLead.lead_id)}
                  onShowToast={onShowToast}
                />
              </div>
            </div>
          )}

          {/* SUBTAB 5: PROPOSALS */}
          {activeSubTab === 'proposals' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div
                style={{
                  borderRadius: '8px', border: '1px solid var(--border, #e2e8f0)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  overflow: 'hidden',
                }}
              >
                <div style={{ height: '4px', backgroundColor: '#0f2035' }} />
                <div
                  style={{
                    backgroundColor: '#071531',
                    color: '#ffffff',
                    padding: '0.65rem 1.25rem',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                  }}
                >
                  Proposals
                </div>

                <ApexInteractiveReport
                  columns={leadProposalReportColumns}
                  data={proposals}
                  rowsPerPage={10}
                  toolbarButtons={
                    <button
                      type="button"
                      onClick={() =>
                        setEditingProposal({
                          proposal_number: `PROP-${Date.now().toString().slice(-4)}`,
                          proposal_title: `${formData.company_name || "Client"} Implementation Proposal`,
                          client_name: formData.company_name || "",
                          status: "Draft",
                          proposal_value: 10000,
                          currency_id: 1,
                        })
                      }
                      style={{
                        height: "34px",
                        padding: "0 18px",
                        backgroundColor: "#071531",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "6px",
                        fontSize: "0.825rem",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Add Proposal
                    </button>
                  }
                  renderLeadingCell={(pr) => (
                    <button
                      type="button"
                      className="apex-edit-icon-btn"
                      onClick={() => setEditingProposal(pr)}
                      title="Edit proposal"
                      style={{
                        border: "none",
                        background: "transparent",
                        padding: "4px",
                        cursor: "pointer",
                        color: "#0284c7",
                      }}
                    >
                      <IconFilePenLine size={14} color="#0284c7" />
                    </button>
                  )}
                  renderTrailingCell={(pr) => (
                    <button
                      type="button"
                      onClick={async () => {
                        if (window.confirm(`Delete proposal ${pr.proposal_number}?`)) {
                          await api.deleteLeadProposal(pr.proposal_id);
                          loadChildData(selectedLead.lead_id);
                        }
                      }}
                      style={{
                        border: "none",
                        background: "transparent",
                        color: "#ef4444",
                        cursor: "pointer",
                        padding: "4px",
                      }}
                      title="Delete proposal"
                    >
                      <IconTrash size={14} />
                    </button>
                  )}
                  onRefresh={() => loadChildData(selectedLead.lead_id)}
                  onShowToast={onShowToast}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* 3. MODALS (APEX Standard Dual Shuttle, Filter, Chart, etc.)          */}
      {/* ==================================================================== */}

      {/* Select Columns Modal (Dual Shuttle) */}
      <SelectColumnsModal
        isOpen={showColumnsModal}
        onClose={() => setShowColumnsModal(false)}
        columns={LEAD_MASTER_COLUMNS}
        visibleKeys={visibleKeys}
        onSave={handleSaveColumns}
        onReset={() => handleSaveColumns(DEFAULT_LEAD_KEYS)}
      />

      {/* APEX Filter Modal */}
      <ApexFilterModal
        isOpen={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        columns={LEAD_MASTER_COLUMNS}
        onApplyFilter={(f) => {
          setAppliedSearch(f.value);
          setPage(1);
          if (onShowToast) onShowToast('success', `Filter applied on ${f.column}`);
        }}
        onResetFilter={() => {
          setAppliedSearch('');
          setSearch('');
          setPage(1);
        }}
      />

      {/* Aggregations Modal */}
      <ApexAggregateModal
        isOpen={showAggregateModal}
        onClose={() => setShowAggregateModal(false)}
        columns={LEAD_MASTER_COLUMNS}
        onAddAggregation={(agg) => setAggregations((prev) => [...prev, agg])}
      />

      {/* Chart Modal */}
      <ApexChartModal
        isOpen={showChartModal}
        onClose={() => setShowChartModal(false)}
        data={leads}
        columns={LEAD_MASTER_COLUMNS}
      />

      {/* Bulk Change Account Manager Modal */}
      {showAcctMgrModal && (
        <div className="apex-modal-overlay">
          <div className="apex-modal-card" style={{ maxWidth: '440px', width: '90%' }}>
            <div className="apex-modal-header">
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Change Account Manager</h3>
              <button
                type="button"
                className="apex-modal-close-btn"
                onClick={() => setShowAcctMgrModal(false)}
              >
                <IconClose size={16} />
              </button>
            </div>
            <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#475569' }}>
                Updating Account Manager for <strong>{selectedLeadIds.size}</strong> selected lead(s).
              </p>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                  Select New Account Manager
                </label>
                <select
                  value={newAccountManager}
                  onChange={(e) => setNewAccountManager(e.target.value)}
                  style={{
                    width: '100%',
                    height: '36px',
                    borderRadius: '4px',
                    border: '1px solid #cbd5e1',
                    padding: '0 0.5rem',
                    fontSize: '0.85rem',
                    backgroundColor: '#ffffff',
                  }}
                >
                  <option value="">-- Select Account Manager --</option>
                  {lovs.accountManagers.map((am) => (
                    <option key={am} value={am}>{am}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowAcctMgrModal(false)}
                  style={{
                    height: '34px',
                    padding: '0 1rem',
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '4px',
                    fontSize: '0.825rem',
                    fontWeight: 600,
                    color: '#475569',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApplyAccountManagerChange}
                  disabled={updatingAcctMgr}
                  style={{
                    height: '34px',
                    padding: '0 1.25rem',
                    backgroundColor: '#071531',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '0.825rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {updatingAcctMgr ? 'Updating...' : 'Apply Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Child Contact Modal */}
      {editingContact && (
        <div className="apex-modal-overlay">
          <div className="apex-modal-card" style={{ maxWidth: '520px', width: '90%' }}>
            <div className="apex-modal-header">
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>
                {editingContact.lead_contact_id ? 'Edit Lead Contact' : 'Add Lead Contact'}
              </h3>
              <button
                type="button"
                className="apex-modal-close-btn"
                onClick={() => setEditingContact(null)}
              >
                <IconClose size={16} />
              </button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!editingContact.client_full_name && !editingContact.email) {
                  if (onShowToast) onShowToast('error', 'Contact Name or Email is required.');
                  return;
                }
                try {
                  if (editingContact.lead_contact_id) {
                    await api.updateLeadContact(editingContact.lead_contact_id, editingContact);
                    if (onShowToast) onShowToast('success', 'Lead Contact updated.');
                  } else {
                    await api.createLeadContact(selectedLead.lead_id, editingContact);
                    if (onShowToast) onShowToast('success', 'Lead Contact added.');
                  }
                  setEditingContact(null);
                  loadChildData(selectedLead.lead_id);
                } catch (err) {
                  if (onShowToast) onShowToast('error', err.message);
                }
              }}
              style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}
            >
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  Client Full Name
                </label>
                <input
                  type="text"
                  value={editingContact.client_full_name || ''}
                  onChange={(e) => setEditingContact({ ...editingContact, client_full_name: e.target.value })}
                  style={{ width: '100%', height: '34px', borderRadius: '4px', border: '1px solid #cbd5e1', padding: '0 0.5rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  Designation
                </label>
                <input
                  type="text"
                  value={editingContact.designation || ''}
                  onChange={(e) => setEditingContact({ ...editingContact, designation: e.target.value })}
                  style={{ width: '100%', height: '34px', borderRadius: '4px', border: '1px solid #cbd5e1', padding: '0 0.5rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  Email
                </label>
                <input
                  type="email"
                  value={editingContact.email || ''}
                  onChange={(e) => setEditingContact({ ...editingContact, email: e.target.value })}
                  style={{ width: '100%', height: '34px', borderRadius: '4px', border: '1px solid #cbd5e1', padding: '0 0.5rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  Mobile Number
                </label>
                <input
                  type="text"
                  value={editingContact.mobile_number || ''}
                  onChange={(e) => setEditingContact({ ...editingContact, mobile_number: e.target.value })}
                  style={{ width: '100%', height: '34px', borderRadius: '4px', border: '1px solid #cbd5e1', padding: '0 0.5rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  Linkedin URL
                </label>
                <input
                  type="text"
                  value={editingContact.linkedin_url || ''}
                  onChange={(e) => setEditingContact({ ...editingContact, linkedin_url: e.target.value })}
                  style={{ width: '100%', height: '34px', borderRadius: '4px', border: '1px solid #cbd5e1', padding: '0 0.5rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setEditingContact(null)}
                  style={{
                    height: '34px',
                    padding: '0 1rem',
                    backgroundColor: '#ffffff',
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
                    height: '34px',
                    padding: '0 1.25rem',
                    backgroundColor: '#071531',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '0.825rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Naukri Ad Modal */}
      {editingNaukri && (
        <div className="apex-modal-overlay">
          <div className="apex-modal-card" style={{ maxWidth: '500px', width: '90%' }}>
            <div className="apex-modal-header">
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>
                {editingNaukri.ad_id ? 'Edit Advertisement' : 'Add Advertisement'}
              </h3>
              <button
                type="button"
                className="apex-modal-close-btn"
                onClick={() => setEditingNaukri(null)}
              >
                <IconClose size={16} />
              </button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  if (editingNaukri.ad_id) {
                    await api.updateLeadNaukriAd(editingNaukri.ad_id, editingNaukri);
                    if (onShowToast) onShowToast('success', 'Advertisement updated.');
                  } else {
                    await api.createLeadNaukriAd(selectedLead.lead_id, editingNaukri);
                    if (onShowToast) onShowToast('success', 'Advertisement added.');
                  }
                  setEditingNaukri(null);
                  loadChildData(selectedLead.lead_id);
                } catch (err) {
                  if (onShowToast) onShowToast('error', err.message);
                }
              }}
              style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}
            >
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  Job Title
                </label>
                <input
                  type="text"
                  required
                  value={editingNaukri.title || ''}
                  onChange={(e) => setEditingNaukri({ ...editingNaukri, title: e.target.value })}
                  style={{ width: '100%', height: '34px', borderRadius: '4px', border: '1px solid #cbd5e1', padding: '0 0.5rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  Location
                </label>
                <input
                  type="text"
                  value={editingNaukri.job_location || ''}
                  onChange={(e) => setEditingNaukri({ ...editingNaukri, job_location: e.target.value })}
                  style={{ width: '100%', height: '34px', borderRadius: '4px', border: '1px solid #cbd5e1', padding: '0 0.5rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                    Min Exp (yrs)
                  </label>
                  <input
                    type="number"
                    value={editingNaukri.min_experience ?? 0}
                    onChange={(e) => setEditingNaukri({ ...editingNaukri, min_experience: parseInt(e.target.value, 10) || 0 })}
                    style={{ width: '100%', height: '34px', borderRadius: '4px', border: '1px solid #cbd5e1', padding: '0 0.5rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                    Max Exp (yrs)
                  </label>
                  <input
                    type="number"
                    value={editingNaukri.max_experience ?? 0}
                    onChange={(e) => setEditingNaukri({ ...editingNaukri, max_experience: parseInt(e.target.value, 10) || 0 })}
                    style={{ width: '100%', height: '34px', borderRadius: '4px', border: '1px solid #cbd5e1', padding: '0 0.5rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setEditingNaukri(null)}
                  style={{
                    height: '34px',
                    padding: '0 1rem',
                    backgroundColor: '#ffffff',
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
                    height: '34px',
                    padding: '0 1.25rem',
                    backgroundColor: '#071531',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '0.825rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Proposal Modal */}
      {editingProposal && (
        <div className="apex-modal-overlay">
          <div className="apex-modal-card" style={{ maxWidth: '500px', width: '90%' }}>
            <div className="apex-modal-header">
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>
                {editingProposal.proposal_id ? 'Edit Proposal' : 'Add Proposal'}
              </h3>
              <button
                type="button"
                className="apex-modal-close-btn"
                onClick={() => setEditingProposal(null)}
              >
                <IconClose size={16} />
              </button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  if (editingProposal.proposal_id) {
                    await api.updateLeadProposal(editingProposal.proposal_id, editingProposal);
                    if (onShowToast) onShowToast('success', 'Proposal updated.');
                  } else {
                    await api.createLeadProposal(selectedLead.lead_id, editingProposal);
                    if (onShowToast) onShowToast('success', 'Proposal created.');
                  }
                  setEditingProposal(null);
                  loadChildData(selectedLead.lead_id);
                } catch (err) {
                  if (onShowToast) onShowToast('error', err.message);
                }
              }}
              style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}
            >
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  Proposal Number
                </label>
                <input
                  type="text"
                  required
                  value={editingProposal.proposal_number || ''}
                  onChange={(e) => setEditingProposal({ ...editingProposal, proposal_number: e.target.value })}
                  style={{ width: '100%', height: '34px', borderRadius: '4px', border: '1px solid #cbd5e1', padding: '0 0.5rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  Proposal Title
                </label>
                <input
                  type="text"
                  required
                  value={editingProposal.proposal_title || ''}
                  onChange={(e) => setEditingProposal({ ...editingProposal, proposal_title: e.target.value })}
                  style={{ width: '100%', height: '34px', borderRadius: '4px', border: '1px solid #cbd5e1', padding: '0 0.5rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                    Proposal Value
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={editingProposal.proposal_value || ''}
                    onChange={(e) => setEditingProposal({ ...editingProposal, proposal_value: e.target.value })}
                    style={{ width: '100%', height: '34px', borderRadius: '4px', border: '1px solid #cbd5e1', padding: '0 0.5rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                    Status
                  </label>
                  <select
                    value={editingProposal.status || 'Draft'}
                    onChange={(e) => setEditingProposal({ ...editingProposal, status: e.target.value })}
                    style={{ width: '100%', height: '34px', borderRadius: '4px', border: '1px solid #cbd5e1', padding: '0 0.5rem', backgroundColor: '#ffffff' }}
                  >
                    <option value="Draft">Draft</option>
                    <option value="Submitted">Submitted</option>
                    <option value="Under Review">Under Review</option>
                    <option value="Accepted">Accepted</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setEditingProposal(null)}
                  style={{
                    height: '34px',
                    padding: '0 1rem',
                    backgroundColor: '#ffffff',
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
                    height: '34px',
                    padding: '0 1.25rem',
                    backgroundColor: '#071531',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '0.825rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Oracle APEX Interactive Column Header Menu */}
      <ApexColumnHeaderMenu
        isOpen={headerMenu.isOpen}
        column={headerMenu.column}
        anchorRect={headerMenu.anchorRect}
        data={leads}
        distinctValues={headerMenu.distinctValues}
        sortConfig={{ key: sortBy, direction: sortOrder ? sortOrder.toLowerCase() : null }}
        onSort={handleMenuSort}
        onHideColumn={handleMenuHideColumn}
        onControlBreak={handleMenuControlBreak}
        onFilterValue={handleMenuFilterValue}
        onClose={() => setHeaderMenu({ isOpen: false, column: null, anchorRect: null, distinctValues: [] })}
      />
    </div>
  );
}
