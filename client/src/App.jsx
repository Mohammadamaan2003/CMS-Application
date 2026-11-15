import React, { useState, useEffect, useCallback } from 'react';
import ApexHeader from './components/ApexHeader';
import ApexSidebar from './components/ApexSidebar';
import Toast from './components/Toast';
import Dashboard from './pages/Dashboard';
import CompanyReport from './pages/Companies/CompanyReport';
import ContactReport from './pages/Contacts/ContactReport';
import CompanySizeMaster from './pages/Masters/CompanySizeMaster';
import CompanyTypeMaster from './pages/Masters/CompanyTypeMaster';
import CountryMaster from './pages/Masters/CountryMaster';
import CountryCityMappingMaster from './pages/Masters/CountryCityMappingMaster';
import DesignationPositionMaster from './pages/Masters/DesignationPositionMaster';
import IndustryMaster from './pages/Masters/IndustryMaster';
import LinkedinAccountsMaster from './pages/Masters/LinkedinAccountsMaster';
import PositionTypeMaster from './pages/Masters/PositionTypeMaster';
import SalesPersonMaster from './pages/Masters/SalesPersonMaster';
import SourceMaster from './pages/Masters/SourceMaster';
import TechnologyMaster from './pages/Masters/TechnologyMaster';
import LeadSourceMaster from './pages/Masters/LeadSourceMaster';
import GenericMasterView from './pages/Masters/GenericMasterView';
import LeadReport from './pages/Leads/LeadReport';
import CompanyUploadPage from './pages/Companies/CompanyUploadPage';
import CompanyInvalidDataPage from './pages/CRMUpload/CompanyInvalidDataPage';
import ContactUploadPage from './pages/CRMUpload/ContactUploadPage';
import ContactIncorrectDataPage from './pages/CRMUpload/ContactIncorrectDataPage';
import MergeCompaniesPage from './pages/DuplicateMerger/MergeCompaniesPage';
import MergeContactsPage from './pages/DuplicateMerger/MergeContactsPage';
import CompanyDashboard from './pages/Dashboards/CompanyDashboard';
import LeadDashboard from './pages/Dashboards/LeadDashboard';
import LuminaGlassDashboard from './pages/Dashboards/LuminaGlassDashboard';
import UserManagementPage from './pages/Users/UserManagementPage';
import { api } from './api/client';

const MASTER_LABELS = {
  master_company_size: 'Company Size',
  master_company_type: 'Company Type',
  master_country: 'Country',
  master_country_city_mapping: 'Country & City Mapping',
  master_designation_position: 'Designation & Position',
  master_industry: 'Industry',
  master_linkedin_accounts: 'LinkedIn Accounts & Countries',
  master_position_type: 'Position Type',
  master_sales_person: 'Sales Person',
  master_source: 'Source',
  master_technology: 'Technology',
  master_lead_source: 'Lead Source',
  master_range_master: 'Range Master',
  master_registration_status: 'Registration Status',
  master_company_categories: 'Company Categories',
  master_account_manager: 'Account Manager',
  master_technology_role: 'Technology Role',
};

const TAB_TO_HASH = {
  home: '#/home',
  dashboard: '#/home',
  companies: '#/companies',
  contacts: '#/contacts',
  leads: '#/leads',
  upload_companies: '#/upload/companies',
  company_invalid_data: '#/crm-upload/company-invalid-data',
  upload_contacts: '#/upload/contacts',
  contact_incorrect_data: '#/crm-upload/contact-incorrect-data',
  merge_companies: '#/duplicate-merger/companies',
  merge_contacts: '#/duplicate-merger/contacts',
  dashboards: '#/dashboards',
  crm_analytics: '#/dashboards/company',
  sales_performance: '#/dashboards/lead',
  lead_dashboard: '#/dashboards/lead',
  company_dashboard: '#/dashboards/company',
  glass_dashboard: '#/dashboards/glass',
  lumina: '#/dashboards/glass',
  user_management: '#/users',
  master_company_size: '#/masters/company-size',
  master_company_type: '#/masters/company-type',
  master_country: '#/masters/country',
  master_country_city_mapping: '#/masters/country-city-mapping',
  master_designation_position: '#/masters/designation-position',
  master_industry: '#/masters/industry',
  master_linkedin_accounts: '#/masters/linkedin-accounts',
  master_position_type: '#/masters/position-type',
  master_sales_person: '#/masters/sales-person',
  master_source: '#/masters/source',
  master_technology: '#/masters/technology',
  master_lead_source: '#/masters/lead-source',
  master_range_master: '#/masters/range-master',
  master_registration_status: '#/masters/registration-status',
  master_company_categories: '#/masters/company-categories',
  master_account_manager: '#/masters/account-manager',
  master_technology_role: '#/masters/technology-role',
};

const HASH_TO_TAB = Object.fromEntries(
  Object.entries(TAB_TO_HASH).map(([tab, hash]) => [hash, tab])
);

function getInitialTab() {
  const rawHash = window.location.hash || '';
  const hash = rawHash.split('?')[0];
  if (!hash || hash === '#' || hash === '#/' || hash === '#/dashboard' || hash === '#/home') {
    return 'dashboard';
  }
  if (hash && HASH_TO_TAB[hash]) {
    return HASH_TO_TAB[hash];
  }
  if (hash && hash.startsWith('#/masters/')) {
    const matched = Object.entries(TAB_TO_HASH).find(([, h]) => h === hash);
    if (matched) return matched[0];
  }
  if (hash && hash.startsWith('#/duplicate-merger/')) {
    const matched = Object.entries(TAB_TO_HASH).find(([, h]) => h === hash);
    if (matched) return matched[0];
  }
  if (hash && (hash.startsWith('#/dashboards') || hash.startsWith('#/dashboards/'))) {
    const matched = Object.entries(TAB_TO_HASH).find(([, h]) => h === hash);
    if (matched) return matched[0];
    return 'crm_analytics';
  }
  if (hash) {
    const clean = hash.replace(/^#\/?/, '').replace(/-/g, '_');
    if (clean === 'dashboard' || clean === 'home') return 'dashboard';
    if (TAB_TO_HASH[clean] || MASTER_LABELS[clean]) return clean;
  }
  try {
    const saved = localStorage.getItem('apex_active_tab');
    if (saved && (TAB_TO_HASH[saved] || saved.startsWith('master_'))) {
      return saved;
    }
  } catch (e) {}
  return 'dashboard';
}

export default function App() {
  const [activeTab, setActiveTabState] = useState(getInitialTab);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth <= 1024;
    }
    return false;
  });
  const [dashboardStats, setDashboardStats] = useState(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  // Current user state (Simulated authentication session without login page)
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('apex_current_user');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      id: 1,
      full_name: 'Amaan',
      username: 'amaan',
      email: 'amaan@iqratechnology.com',
      role: 'admin',
      can_login: true,
      status: 'Active',
    };
  });

  const [availableUsers, setAvailableUsers] = useState([
    { id: 1, full_name: 'Amaan', username: 'amaan', email: 'amaan@iqratechnology.com', role: 'admin', can_login: true, status: 'Active' },
    { id: 2, full_name: 'Heena Naaz', username: 'heena.sales', email: 'heena.naaz@iqratechnology.com', role: 'sales', can_login: true, status: 'Active' },
    { id: 3, full_name: 'Rifah Sheikh', username: 'rifah.mktg', email: 'rifah@iqratechnology.com', role: 'marketing', can_login: true, status: 'Active' },
    { id: 4, full_name: 'David Miller', username: 'david.viewer', email: 'david.miller@iqratechnology.com', role: 'viewer', can_login: true, status: 'Active' },
    { id: 5, full_name: 'Tariq Mansoor', username: 'tariq.sales', email: 'tariq.m@iqratechnology.com', role: 'sales', can_login: false, status: 'Blocked' },
  ]);

  const fetchUsersList = useCallback(async () => {
    try {
      const res = await api.getUsers({ limit: 100 });
      if (res && res.success && res.data?.length > 0) {
        setAvailableUsers(res.data);
      }
    } catch (e) {
      // fallback to initial list
    }
  }, []);

  useEffect(() => {
    fetchUsersList();
  }, [fetchUsersList]);

  const [targetContactId, setTargetContactId] = useState(() => {
    try {
      const match = window.location.hash.match(/[?&]id=(\d+)/);
      if (match && window.location.hash.startsWith('#/contacts')) return match[1];
      return localStorage.getItem('apex_open_contact_id') || null;
    } catch (e) {
      return null;
    }
  });

  const [targetCompanyId, setTargetCompanyId] = useState(() => {
    try {
      const match = window.location.hash.match(/[?&]id=(\d+)/);
      if (match && window.location.hash.startsWith('#/companies')) return match[1];
      return localStorage.getItem('apex_open_company_id') || null;
    } catch (e) {
      return null;
    }
  });

  const [targetLeadId, setTargetLeadId] = useState(() => {
    try {
      const match = window.location.hash.match(/[?&]id=(\d+)/);
      if (match && window.location.hash.startsWith('#/leads')) return match[1];
      return localStorage.getItem('apex_open_lead_id') || null;
    } catch (e) {
      return null;
    }
  });

  const setActiveTab = useCallback((tab) => {
    setActiveTabState(tab);
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      setSidebarCollapsed(true);
    }
    const targetHash = TAB_TO_HASH[tab] || `#/masters/${tab.replace('master_', '').replace(/_/g, '-')}`;
    if (window.location.hash.split('?')[0] !== targetHash) {
      window.location.hash = targetHash;
    }
    try {
      localStorage.setItem('apex_active_tab', tab);
    } catch (e) {}
  }, []);

  const navigateToContactForm = useCallback((contactId, returnTab, returnHash) => {
    const fromTab = returnTab || activeTab;
    const fromHash = returnHash || window.location.hash;
    try {
      localStorage.setItem('apex_open_contact_id', String(contactId));
      if (fromTab && fromTab !== 'contacts') {
        localStorage.setItem('apex_return_tab', fromTab);
        if (fromHash) localStorage.setItem('apex_return_hash', fromHash);
      }
    } catch (e) {}
    setTargetContactId(String(contactId));
    setActiveTabState('contacts');
    window.location.hash = `#/contacts?id=${contactId}`;
  }, [activeTab]);

  const navigateToCompanyForm = useCallback((companyId, returnTab, returnHash) => {
    const fromTab = returnTab || activeTab;
    const fromHash = returnHash || window.location.hash;
    try {
      localStorage.setItem('apex_open_company_id', String(companyId));
      if (fromTab && fromTab !== 'companies') {
        localStorage.setItem('apex_return_tab', fromTab);
        if (fromHash) localStorage.setItem('apex_return_hash', fromHash);
      }
    } catch (e) {}
    setTargetCompanyId(String(companyId));
    setActiveTabState('companies');
    window.location.hash = `#/companies?id=${companyId}`;
  }, [activeTab]);

  const handleReturn = useCallback(() => {
    let returnTab = null;
    let returnHash = null;
    try {
      returnTab = localStorage.getItem('apex_return_tab');
      returnHash = localStorage.getItem('apex_return_hash');
      if (returnTab) {
        localStorage.removeItem('apex_return_tab');
        localStorage.removeItem('apex_return_hash');
      }
      localStorage.removeItem('apex_open_company_id');
      localStorage.removeItem('apex_open_contact_id');
    } catch (e) {}

    setTargetCompanyId(null);
    setTargetContactId(null);

    if (returnTab) {
      setActiveTabState(returnTab);
      if (returnHash) {
        window.location.hash = returnHash;
      } else {
        window.location.hash = TAB_TO_HASH[returnTab] || `#/masters/${returnTab.replace('master_', '').replace(/_/g, '-')}`;
      }
      try {
        localStorage.setItem('apex_active_tab', returnTab);
      } catch (e) {}
      return true;
    }
    return false;
  }, []);

  useEffect(() => {
    const handleHashChange = () => {
      const newTab = getInitialTab();
      setActiveTabState(newTab);
      if (typeof window !== 'undefined' && window.innerWidth <= 768) {
        setSidebarCollapsed(true);
      }
      const hash = window.location.hash;
      const contactMatch = hash.match(/#\/contacts\?.*id=(\d+)/);
      if (contactMatch) {
        setTargetContactId(contactMatch[1]);
      }
      const companyMatch = hash.match(/#\/companies\?.*id=(\d+)/);
      if (companyMatch) {
        setTargetCompanyId(companyMatch[1]);
      }
      const leadMatch = hash.match(/#\/leads\?.*id=(\d+)/);
      if (leadMatch) {
        setTargetLeadId(leadMatch[1]);
      }
      try {
        localStorage.setItem('apex_active_tab', newTab);
      } catch (e) {}
    };

    const initialHash = TAB_TO_HASH[activeTab] || `#/masters/${activeTab.replace('master_', '').replace(/_/g, '-')}`;
    if (!window.location.hash || window.location.hash === '#') {
      window.location.hash = initialHash;
    }

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [activeTab]);

  // Toast Notifications
  const [toasts, setToasts] = useState([]);
  const showToast = useCallback((arg1, arg2) => {
    const knownTypes = ['success', 'error', 'warning', 'info'];
    let type = 'info';
    let message = '';

    if (knownTypes.includes(String(arg1).toLowerCase())) {
      type = String(arg1).toLowerCase();
      message = String(arg2 || '');
    } else if (knownTypes.includes(String(arg2).toLowerCase())) {
      type = String(arg2).toLowerCase();
      message = String(arg1 || '');
    } else {
      type = 'info';
      message = String(arg1 || arg2 || '');
    }

    const id = Date.now() + Math.random().toString();
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Fetch Dashboard Stats
  const fetchDashboardStats = useCallback(async () => {
    try {
      setIsLoadingStats(true);
      const res = await api.getDashboardStats();
      if (res.success) {
        setDashboardStats(res.data);
      }
    } catch (err) {
      console.warn('Dashboard stats load note:', err.message);
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats]);

  const handleSwitchUser = useCallback((user) => {
    if (!user.can_login) {
      showToast('error', `Cannot switch session: Login is disabled (can_login=false) for ${user.full_name}.`);
      return;
    }
    setCurrentUser(user);
    try {
      localStorage.setItem('apex_current_user', JSON.stringify(user));
    } catch (e) {}
    showToast('info', `Switched active session to ${user.full_name} (${user.role.toUpperCase()})`);

    const role = (user.role || 'sales').toLowerCase();
    // Role-based route guard
    if (activeTab === 'user_management' && role !== 'admin') {
      setActiveTab('dashboard');
    } else if (role === 'marketing' || role === 'viewer') {
      const allowedMarketingTabs = [
        'dashboard',
        'home',
        'companies',
        'contacts',
        'dashboards',
        'crm_analytics',
        'sales_performance',
        'lead_dashboard',
        'company_dashboard',
        'glass_dashboard',
        'lumina',
      ];
      if (!allowedMarketingTabs.includes(activeTab)) {
        setActiveTab('dashboard');
      }
    }
  }, [activeTab, setActiveTab, showToast]);

  return (
    <div className="apex-app-root">
      {/* Toast Alert System */}
      <Toast toasts={toasts} onDismiss={dismissToast} />

      {/* Branded Top Navigation Header */}
      <ApexHeader
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onToggleSidebar={() => setSidebarCollapsed((prev) => !prev)}
        currentUser={currentUser}
        onSwitchUser={handleSwitchUser}
        availableUsers={availableUsers}
      />

      <div className="apex-layout-body">
        {/* Left Dark Navy Sidebar */}
        <ApexSidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          isCollapsed={sidebarCollapsed}
          currentUser={currentUser}
        />

        {/* Mobile Sidebar Backdrop Overlay */}
        {!sidebarCollapsed && (
          <div
            className="apex-sidebar-mobile-backdrop"
            onClick={() => setSidebarCollapsed(true)}
            aria-hidden="true"
          />
        )}

        {/* Main Content Area */}
        <div className="apex-main-viewport">
          {/* Top Decorative Banner Strip */}
          <div className="apex-pattern-strip" />

          <main
            className="apex-main-inner"
            style={activeTab === 'glass_dashboard' || activeTab === 'lumina' ? { padding: 0 } : undefined}
          >
            {(activeTab === 'dashboard' || activeTab === 'home') && (
              <Dashboard
                stats={dashboardStats}
                isLoading={isLoadingStats}
                onNavigate={setActiveTab}
                onRefreshStats={fetchDashboardStats}
              />
            )}

            {activeTab === 'companies' && (
              <CompanyReport
                onShowToast={showToast}
                initialCompanyId={targetCompanyId}
                onClearInitialId={() => setTargetCompanyId(null)}
                onNavigateReturn={handleReturn}
                onNavigateToContact={(contactId) => {
                  if (contactId) navigateToContactForm(contactId);
                  else setActiveTab('contacts');
                }}
                onNavigateToContacts={() => setActiveTab('contacts')}
                onNavigateToUpload={() => setActiveTab('upload_companies')}
              />
            )}

            {activeTab === 'upload_companies' && (
              <CompanyUploadPage
                onShowToast={showToast}
                onNavigateToCompanies={() => setActiveTab('companies')}
                onNavigateToInvalidData={() => setActiveTab('company_invalid_data')}
              />
            )}

            {activeTab === 'company_invalid_data' && (
              <CompanyInvalidDataPage
                onShowToast={showToast}
                onNavigateToUpload={() => setActiveTab('upload_companies')}
              />
            )}

            {activeTab === 'upload_contacts' && (
              <ContactUploadPage
                onShowToast={showToast}
                onNavigateToContacts={() => setActiveTab('contacts')}
                onNavigateToIncorrectData={() => setActiveTab('contact_incorrect_data')}
              />
            )}

            {activeTab === 'contact_incorrect_data' && (
              <ContactIncorrectDataPage
                onShowToast={showToast}
                onNavigateToUpload={() => setActiveTab('upload_contacts')}
              />
            )}

            {activeTab === 'merge_companies' && (
              <MergeCompaniesPage onShowToast={showToast} />
            )}

            {activeTab === 'merge_contacts' && (
              <MergeContactsPage onShowToast={showToast} />
            )}

            {(activeTab === 'lead_dashboard' || activeTab === 'sales_performance') && (
              <LeadDashboard
                onNavigate={setActiveTab}
                onShowToast={showToast}
              />
            )}

            {(activeTab === 'company_dashboard' ||
              activeTab === 'crm_analytics' ||
              activeTab === 'dashboards') && (
              <CompanyDashboard
                onNavigate={setActiveTab}
                onShowToast={showToast}
              />
            )}

            {(activeTab === 'glass_dashboard' || activeTab === 'lumina') && (
              <LuminaGlassDashboard
                currentUser={currentUser}
                onNavigate={setActiveTab}
              />
            )}

            {activeTab === 'user_management' && (
              currentUser?.role?.toLowerCase() === 'admin' ? (
                <UserManagementPage
                  onShowToast={showToast}
                  currentUser={currentUser}
                  onUserSwitched={handleSwitchUser}
                />
              ) : (
                <div style={{ padding: '3rem 2rem', textAlign: 'center', background: '#ffffff', borderRadius: '8px', border: '1px solid #fee2e2', margin: '2rem' }}>
                  <h2 style={{ color: '#dc2626', marginBottom: '0.5rem' }}>Access Restricted</h2>
                  <p style={{ color: '#64748b', maxWidth: '500px', margin: '0 auto 1.5rem' }}>
                    Your current role (<strong>{currentUser?.role}</strong>) does not have authorization to view or configure Users Management. Only administrators can access this section.
                  </p>
                  <button
                    type="button"
                    className="btn-apex-primary"
                    onClick={() => setActiveTab('dashboard')}
                    style={{ backgroundColor: '#0f172a' }}
                  >
                    Return to Home
                  </button>
                </div>
              )
            )}

            {activeTab === 'contacts' && (
              <ContactReport
                onShowToast={showToast}
                initialContactId={targetContactId}
                onClearInitialId={() => setTargetContactId(null)}
                onNavigateReturn={handleReturn}
                onNavigateToCompany={(companyId) => {
                  if (companyId) navigateToCompanyForm(companyId);
                  else setActiveTab('companies');
                }}
              />
            )}

            {activeTab === 'leads' && (
              <LeadReport
                onShowToast={showToast}
                initialLeadId={targetLeadId}
                onClearInitialId={() => setTargetLeadId(null)}
                onNavigateToCompany={(companyId) => {
                  if (companyId) navigateToCompanyForm(companyId, 'leads', '#/leads');
                  else setActiveTab('companies');
                }}
                onNavigateToContact={(contactId) => {
                  if (contactId) navigateToContactForm(contactId, 'leads', '#/leads');
                  else setActiveTab('contacts');
                }}
              />
            )}

            {activeTab === 'master_company_size' && (
              <CompanySizeMaster
                onShowToast={showToast}
                onNavigateToCompanyForm={navigateToCompanyForm}
                onNavigateToContactForm={navigateToContactForm}
              />
            )}

            {activeTab === 'master_company_type' && (
              <CompanyTypeMaster
                onShowToast={showToast}
                onNavigateToCompanyForm={navigateToCompanyForm}
                onNavigateToContactForm={navigateToContactForm}
              />
            )}

            {activeTab === 'master_country' && (
              <CountryMaster
                onShowToast={showToast}
                onNavigateToCompanyForm={navigateToCompanyForm}
                onNavigateToContactForm={navigateToContactForm}
              />
            )}

            {activeTab === 'master_country_city_mapping' && (
              <CountryCityMappingMaster
                onShowToast={showToast}
                onNavigateToCompanyForm={navigateToCompanyForm}
                onNavigateToContactForm={navigateToContactForm}
              />
            )}

            {activeTab === 'master_designation_position' && (
              <DesignationPositionMaster
                onShowToast={showToast}
                onNavigateToCompanyForm={navigateToCompanyForm}
                onNavigateToContactForm={navigateToContactForm}
              />
            )}

            {activeTab === 'master_industry' && (
              <IndustryMaster
                onShowToast={showToast}
                onNavigateToCompanyForm={navigateToCompanyForm}
                onNavigateToContactForm={navigateToContactForm}
              />
            )}

            {activeTab === 'master_linkedin_accounts' && (
              <LinkedinAccountsMaster
                onShowToast={showToast}
                onNavigateToCompanyForm={navigateToCompanyForm}
                onNavigateToContactForm={navigateToContactForm}
              />
            )}

            {activeTab === 'master_position_type' && (
              <PositionTypeMaster
                onShowToast={showToast}
                onNavigateToCompanyForm={navigateToCompanyForm}
                onNavigateToContactForm={navigateToContactForm}
              />
            )}

            {activeTab === 'master_sales_person' && (
              <SalesPersonMaster
                onShowToast={showToast}
                onNavigateToCompanyForm={navigateToCompanyForm}
                onNavigateToContactForm={navigateToContactForm}
              />
            )}

            {activeTab === 'master_source' && (
              <SourceMaster
                onShowToast={showToast}
                onNavigateToCompanyForm={navigateToCompanyForm}
                onNavigateToContactForm={navigateToContactForm}
              />
            )}

            {activeTab === 'master_technology' && (
              <TechnologyMaster
                onShowToast={showToast}
                onNavigateToCompanyForm={navigateToCompanyForm}
                onNavigateToContactForm={navigateToContactForm}
              />
            )}

            {activeTab === 'master_lead_source' && (
              <LeadSourceMaster
                onShowToast={showToast}
                onNavigateToCompanyForm={navigateToCompanyForm}
                onNavigateToContactForm={navigateToContactForm}
              />
            )}

            {activeTab.startsWith('master_') &&
              activeTab !== 'master_company_size' &&
              activeTab !== 'master_company_type' &&
              activeTab !== 'master_country' &&
              activeTab !== 'master_country_city_mapping' &&
              activeTab !== 'master_designation_position' &&
              activeTab !== 'master_industry' &&
              activeTab !== 'master_linkedin_accounts' &&
              activeTab !== 'master_position_type' &&
              activeTab !== 'master_sales_person' &&
              activeTab !== 'master_source' &&
              activeTab !== 'master_technology' &&
              activeTab !== 'master_lead_source' && (
                <GenericMasterView
                  masterKey={activeTab}
                  title={MASTER_LABELS[activeTab] || 'Master Report'}
                  onShowToast={showToast}
                />
              )}
          </main>
        </div>
      </div>
    </div>
  );
}
