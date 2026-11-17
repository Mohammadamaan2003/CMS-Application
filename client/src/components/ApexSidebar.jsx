import React, { useState } from 'react';
import {
  IconHome,
  IconSparkles,
  IconUsers,
  IconBuilding,
  IconUploadCloud,
  IconLightbulb,
  IconGitMerge,
  IconBarChart,
  IconUserCheck,
  IconBullhorn,
  IconGraduationCap,
  IconWrench,
  IconBot,
  IconChevronDown,
  IconChevronRight,
  IconGlobe,
  IconBriefcase,
  IconUser,
  IconTable,
  IconMap,
  IconBookOpen,
  IconFactory,
  IconShare2,
  IconMonitor,
  IconTarget,
  IconArrowUpDown,
  IconShield,
  IconCreditCard,
  IconCircle,
} from './Icons';

const MASTER_ITEMS = [
  { id: 'master_company_size', label: 'Company Size', icon: IconBuilding },
  { id: 'master_company_type', label: 'Company Type', icon: IconGitMerge },
  { id: 'master_country', label: 'Country', icon: IconGlobe },
  { id: 'master_country_city_mapping', label: 'Country & City Mapping', icon: IconMap },
  { id: 'master_designation_position', label: 'Designation & Position', icon: IconBookOpen },
  { id: 'master_industry', label: 'Industry', icon: IconFactory },
  { id: 'master_linkedin_accounts', label: 'LinkedIn Accounts & Cou...', icon: IconShare2 },
  { id: 'master_position_type', label: 'Position Type', icon: IconBriefcase },
  { id: 'master_sales_person', label: 'Sales Person', icon: IconUser },
  { id: 'master_source', label: 'Source', icon: IconBookOpen },
  { id: 'master_technology', label: 'Technology', icon: IconMonitor },
  { id: 'master_lead_source', label: 'Lead Source', icon: IconTarget },
  { id: 'master_range_master', label: 'Range Master', icon: IconArrowUpDown },
  { id: 'master_registration_status', label: 'Registration Status', icon: IconShield },
  { id: 'master_company_categories', label: 'Company Categories', icon: IconTable },
  { id: 'master_account_manager', label: 'Account Manager', icon: IconCreditCard },
  { id: 'master_technology_role', label: 'Technology Role', icon: IconCircle },
];

export default function ApexSidebar({ activeTab, onTabChange, isCollapsed, currentUser }) {
  // Controlled group open state: collapsed by default (null).
  // Clicking an expanded group collapses it again.
  // Expanding one group auto-collapses others so that on short screens, navigation links remain accessible without overflowing or getting cut off.
  const [openGroup, setOpenGroup] = useState(null);

  const toggleGroup = (groupName) => {
    setOpenGroup((prev) => (prev === groupName ? null : groupName));
  };

  const mastersOpen = openGroup === 'masters';
  const crmOpen = openGroup === 'crm';
  const uploadOpen = openGroup === 'upload';
  const mergerOpen = openGroup === 'merger';
  const mergerSuggestedOpen = openGroup === 'merger_suggested';
  const dashboardsOpen = openGroup === 'dashboards';
  const campaignsOpen = openGroup === 'campaigns';

  const role = (currentUser?.role || 'admin').toLowerCase();

  // Role Access Rules:
  // admin: all access
  // sales: almost all access, but NO user management
  // marketing: dashboard and contact and company (crm) ONLY
  // viewer: read-only dashboard and crm
  const canViewMasters = role === 'admin' || role === 'sales';
  const canViewUpload = role === 'admin' || role === 'sales';
  const canViewLeads = role === 'admin' || role === 'sales';
  const canViewMerger = role === 'admin' || role === 'sales';
  const canViewCampaigns = role === 'admin' || role === 'sales';
  const canViewUsers = role === 'admin'; // Only Admin can manage users!

  const isMasterActive = activeTab && activeTab.startsWith('master_');

  return (
    <aside className={`apex-sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <nav className="apex-sidebar-nav">
        {/* Home */}
        <button
          type="button"
          className={`apex-nav-item ${(activeTab === 'dashboard' || activeTab === 'home') ? 'active' : ''}`}
          onClick={() => onTabChange('dashboard')}
          title="Home"
        >
          <span className="apex-nav-icon"><IconHome size={17} /></span>
          {!isCollapsed && <span className="apex-nav-text">Home</span>}
        </button>

        {/* Masters (Collapsible, opens on click) */}
        {canViewMasters && (
          <div className={`apex-nav-group ${mastersOpen ? 'open' : ''}`}>
            <button
              type="button"
              className={`apex-nav-item has-sub ${isMasterActive ? 'active-group' : ''}`}
              onClick={() => toggleGroup('masters')}
              title="Masters"
            >
              <span className="apex-nav-icon"><IconSparkles size={17} /></span>
              {!isCollapsed && (
                <>
                  <span className="apex-nav-text">Masters</span>
                  <span className="apex-nav-arrow">
                    {mastersOpen ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
                  </span>
                </>
              )}
            </button>
            {!isCollapsed && mastersOpen && (
              <div className="apex-sub-menu">
                {MASTER_ITEMS.map((item) => {
                  const ItemIcon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`apex-sub-item ${isActive ? 'active' : ''}`}
                      onClick={() => onTabChange(item.id)}
                      title={item.label}
                    >
                      <span className="apex-sub-icon">
                        <ItemIcon size={14} />
                      </span>
                      <span className="apex-sub-text">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* CRM (Collapsible, opens on click) */}
        <div className={`apex-nav-group ${crmOpen ? 'open' : ''}`}>
          <button
            type="button"
            className={`apex-nav-item has-sub ${(activeTab === 'companies' || activeTab === 'contacts') ? 'active-group' : ''}`}
            onClick={() => toggleGroup('crm')}
            title="CRM"
          >
            <span className="apex-nav-icon"><IconUsers size={17} /></span>
            {!isCollapsed && (
              <>
                <span className="apex-nav-text">CRM</span>
                <span className="apex-nav-arrow">
                  {crmOpen ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
                </span>
              </>
            )}
          </button>

          {!isCollapsed && crmOpen && (
            <div className="apex-sub-menu">
              <button
                type="button"
                className={`apex-sub-item ${activeTab === 'companies' ? 'active' : ''}`}
                onClick={() => onTabChange('companies')}
                title="Company Report"
              >
                <span className="apex-sub-icon"><IconBuilding size={15} /></span>
                <span className="apex-sub-text">Company</span>
              </button>

              <button
                type="button"
                className={`apex-sub-item ${activeTab === 'contacts' ? 'active' : ''}`}
                onClick={() => onTabChange('contacts')}
                title="Contact Report"
              >
                <span className="apex-sub-icon">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 7h.01"/><path d="M7 12h10"/><path d="M7 17h10"/>
                  </svg>
                </span>
                <span className="apex-sub-text">Contact</span>
              </button>
            </div>
          )}
        </div>

        {/* CRM Upload (Collapsible, opens on click) */}
        {canViewUpload && (() => {
          const isUploadActive =
            activeTab === 'upload_companies' ||
            activeTab === 'company_invalid_data' ||
            activeTab === 'upload_contacts' ||
            activeTab === 'contact_incorrect_data';
          const isGroupOpen = uploadOpen;

          return (
            <div className={`apex-nav-group ${isGroupOpen ? 'open' : ''}`}>
              <button
                type="button"
                className={`apex-nav-item has-sub ${isUploadActive ? 'active-group' : ''}`}
                onClick={() => toggleGroup('upload')}
                title="CRM Upload"
              >
                <span className="apex-nav-icon"><IconUploadCloud size={17} /></span>
                {!isCollapsed && (
                  <>
                    <span className="apex-nav-text">CRM Upload</span>
                    <span className="apex-nav-arrow">
                      {isGroupOpen ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
                    </span>
                  </>
                )}
              </button>
              {!isCollapsed && isGroupOpen && (
                <div className="apex-sub-menu">
                  <button
                    type="button"
                    className={`apex-sub-item ${activeTab === 'upload_companies' ? 'active' : ''}`}
                    onClick={() => onTabChange('upload_companies')}
                  >
                    Upload Companies
                  </button>
                  <button
                    type="button"
                    className={`apex-sub-item ${activeTab === 'company_invalid_data' ? 'active' : ''}`}
                    onClick={() => onTabChange('company_invalid_data')}
                  >
                    Company Invalid Data
                  </button>
                  <button
                    type="button"
                    className={`apex-sub-item ${activeTab === 'upload_contacts' ? 'active' : ''}`}
                    onClick={() => onTabChange('upload_contacts')}
                  >
                    Upload Contacts
                  </button>
                  <button
                    type="button"
                    className={`apex-sub-item ${activeTab === 'contact_incorrect_data' ? 'active' : ''}`}
                    onClick={() => onTabChange('contact_incorrect_data')}
                  >
                    Contact Incorrect Data
                  </button>
                </div>
              )}
            </div>
          );
        })()}

        {/* Lead */}
        {canViewLeads && (
          <button
            type="button"
            className={`apex-nav-item ${activeTab === 'leads' ? 'active' : ''}`}
            onClick={() => onTabChange('leads')}
            title="Lead"
          >
            <span className="apex-nav-icon"><IconLightbulb size={17} /></span>
            {!isCollapsed && <span className="apex-nav-text">Lead</span>}
          </button>
        )}

        {/* Duplicate Merger (APEX 4-Page System) */}
        {canViewMerger && (() => {
          const isMergerActive =
            activeTab === 'duplicate_company_report' ||
            activeTab === 'merge_companies' ||
            activeTab === 'duplicate_contact_report' ||
            activeTab === 'merge_contacts';
          const isGroupOpen = mergerOpen;

          return (
            <div className={`apex-nav-group ${isGroupOpen ? 'open' : ''}`}>
              <button
                type="button"
                className={`apex-nav-item has-sub ${isMergerActive ? 'active-group' : ''}`}
                onClick={() => toggleGroup('merger')}
                title="Duplicate Merger"
              >
                <span className="apex-nav-icon"><IconGitMerge size={17} /></span>
                {!isCollapsed && (
                  <>
                    <span className="apex-nav-text">Duplicate Merger</span>
                    <span className="apex-nav-arrow">
                      {isGroupOpen ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
                    </span>
                  </>
                )}
              </button>
              {!isCollapsed && isGroupOpen && (
                <div className="apex-sub-menu">
                  <button
                    type="button"
                    className={`apex-sub-item ${activeTab === 'duplicate_company_report' ? 'active' : ''}`}
                    onClick={() => onTabChange('duplicate_company_report')}
                  >
                    Duplicate Company Report
                  </button>
                  <button
                    type="button"
                    className={`apex-sub-item ${activeTab === 'merge_companies' ? 'active' : ''}`}
                    onClick={() => onTabChange('merge_companies')}
                  >
                    Merge Companies
                  </button>
                  <button
                    type="button"
                    className={`apex-sub-item ${activeTab === 'duplicate_contact_report' ? 'active' : ''}`}
                    onClick={() => onTabChange('duplicate_contact_report')}
                  >
                    Duplicate Contact Report
                  </button>
                  <button
                    type="button"
                    className={`apex-sub-item ${activeTab === 'merge_contacts' ? 'active' : ''}`}
                    onClick={() => onTabChange('merge_contacts')}
                  >
                    Merge Contacts
                  </button>
                </div>
              )}
            </div>
          );
        })()}

        {/* Duplicate Merger Suggested */}
        {canViewMerger && (() => {
          const isSuggestedActive =
            activeTab === 'merge_companies_suggested' ||
            activeTab === 'merge_contacts_suggested';
          const isGroupOpen = mergerSuggestedOpen;

          return (
            <div className={`apex-nav-group ${isGroupOpen ? 'open' : ''}`}>
              <button
                type="button"
                className={`apex-nav-item has-sub ${isSuggestedActive ? 'active-group' : ''}`}
                onClick={() => toggleGroup('merger_suggested')}
                title="Duplicate Merger Suggested"
              >
                <span className="apex-nav-icon"><IconGitMerge size={17} /></span>
                {!isCollapsed && (
                  <>
                    <span className="apex-nav-text">Duplicate Merger Suggested</span>
                    <span className="apex-nav-arrow">
                      {isGroupOpen ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
                    </span>
                  </>
                )}
              </button>
              {!isCollapsed && isGroupOpen && (
                <div className="apex-sub-menu">
                  <button
                    type="button"
                    className={`apex-sub-item ${activeTab === 'merge_companies_suggested' ? 'active' : ''}`}
                    onClick={() => onTabChange('merge_companies_suggested')}
                  >
                    Merge Companies
                  </button>
                  <button
                    type="button"
                    className={`apex-sub-item ${activeTab === 'merge_contacts_suggested' ? 'active' : ''}`}
                    onClick={() => onTabChange('merge_contacts_suggested')}
                  >
                    Merge Contacts
                  </button>
                </div>
              )}
            </div>
          );
        })()}

        {/* Dashboards */}
        {(() => {
          const isDashboardActive =
            activeTab === 'dashboards' ||
            activeTab === 'crm_analytics' ||
            activeTab === 'sales_performance' ||
            activeTab === 'lead_dashboard' ||
            activeTab === 'company_dashboard' ||
            activeTab === 'glass_dashboard';
          const isGroupOpen = dashboardsOpen;

          return (
            <div className={`apex-nav-group ${isGroupOpen ? 'open' : ''}`}>
              <button
                type="button"
                className={`apex-nav-item has-sub ${isDashboardActive ? 'active-group' : ''}`}
                onClick={() => toggleGroup('dashboards')}
                title="Dashboards"
              >
                <span className="apex-nav-icon"><IconBarChart size={17} /></span>
                {!isCollapsed && (
                  <>
                    <span className="apex-nav-text">Dashboards</span>
                    <span className="apex-nav-arrow">
                      {isGroupOpen ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
                    </span>
                  </>
                )}
              </button>
              {!isCollapsed && isGroupOpen && (
                <div className="apex-sub-menu">
                  <button
                    type="button"
                    className={`apex-sub-item ${activeTab === 'lead_dashboard' || activeTab === 'sales_performance' ? 'active' : ''}`}
                    onClick={() => onTabChange('lead_dashboard')}
                  >
                    Lead
                  </button>
                  <button
                    type="button"
                    className={`apex-sub-item ${activeTab === 'company_dashboard' || activeTab === 'crm_analytics' || activeTab === 'dashboards' ? 'active' : ''}`}
                    onClick={() => onTabChange('company_dashboard')}
                  >
                    Company
                  </button>
                  <button
                    type="button"
                    className={`apex-sub-item ${activeTab === 'glass_dashboard' ? 'active' : ''}`}
                    onClick={() => onTabChange('glass_dashboard')}
                    title="Lumina Glassmorphism Dashboard"
                  >
                    <span className="apex-sub-icon">
                      <IconSparkles size={14} style={{ color: '#c084fc' }} />
                    </span>
                    <span className="apex-sub-text" style={{ color: activeTab === 'glass_dashboard' ? '#c084fc' : undefined, fontWeight: activeTab === 'glass_dashboard' ? 600 : undefined }}>
                      Lumina Glass
                    </span>
                  </button>
                </div>
              )}
            </div>
          );
        })()}

        {/* Users Management (Admin Only) */}
        {canViewUsers && (
          <button
            type="button"
            className={`apex-nav-item ${activeTab === 'user_management' ? 'active' : ''}`}
            onClick={() => onTabChange('user_management')}
            title="Users Management"
          >
            <span className="apex-nav-icon"><IconUserCheck size={17} /></span>
            {!isCollapsed && <span className="apex-nav-text">Users Management</span>}
          </button>
        )}

        {/* Campaigns */}
        {canViewCampaigns && (
          <div className="apex-nav-group">
            <button
              type="button"
              className="apex-nav-item has-sub"
              onClick={() => toggleGroup('campaigns')}
              title="Campaigns"
            >
              <span className="apex-nav-icon"><IconBullhorn size={17} /></span>
              {!isCollapsed && (
                <>
                  <span className="apex-nav-text">Campaigns</span>
                  <span className="apex-nav-arrow">
                    {campaignsOpen ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
                  </span>
                </>
              )}
            </button>
            {!isCollapsed && campaignsOpen && (
              <div className="apex-sub-menu">
                <button type="button" className="apex-sub-item">Email Campaigns</button>
                <button type="button" className="apex-sub-item">Outreach Lists</button>
              </div>
            )}
          </div>
        )}
      </nav>
    </aside>
  );
}

