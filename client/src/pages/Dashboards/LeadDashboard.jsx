import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../../api/client';
import ChartCard from '../../components/ChartCard';
import MultiSelectDropdown from '../../components/MultiSelectDropdown';
import ApexReportToolbar from '../../components/ApexReportToolbar';
import ApexInteractiveReport from '../../components/ApexInteractiveReport';
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
  IconFilePenLine,
} from '../../components/Icons';

const IconHourglass = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 22h14" />
    <path d="M5 2h14" />
    <path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22" />
    <path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2" />
  </svg>
);

const IconPauseCircle = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="10" y1="15" x2="10" y2="9" />
    <line x1="14" y1="15" x2="14" y2="9" />
  </svg>
);

const IconXCircle = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="15" y1="9" x2="9" y2="15" />
    <line x1="9" y1="9" x2="15" y2="15" />
  </svg>
);

const IconCheckCircle = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="9 12 11 14 15 10" />
  </svg>
);

const IconTrophy = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
    <path d="M4 22h16" />
    <path d="M10 14.66V17c0 .55-.45 1-1 1H7" />
    <path d="M14 14.66V17c0 .55.45 1 1 1h2" />
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
  </svg>
);

const IconBanknote = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="12" x="2" y="6" rx="2" />
    <circle cx="12" cy="12" r="2" />
    <path d="M6 12h.01M18 12h.01" />
  </svg>
);

const IconClock = ({ size = 16, color = 'currentColor', className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

// APEX Page 77 Column Bar Chart (Total Leads by Source & Won Leads by Source)
function ApexColumnChart({
  title,
  data = [],
  step = 50,
  maxVal = 450,
  barColor = '#0284c7',
  onBarClick,
}) {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const computedMax = useMemo(() => {
    const highest = Math.max(...data.map((d) => d.count || 0), 0);
    return Math.max(maxVal, Math.ceil(highest / step) * step);
  }, [data, maxVal, step]);

  const ticks = useMemo(() => {
    const arr = [];
    for (let v = 0; v <= computedMax; v += step) {
      arr.push(v);
    }
    return arr;
  }, [computedMax, step]);

  const chartHeight = 220;
  const chartWidth = 560;
  const paddingLeft = 45;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 45;
  const innerWidth = chartWidth - paddingLeft - paddingRight;
  const innerHeight = chartHeight - paddingTop - paddingBottom;

  const barSlotWidth = data.length > 0 ? innerWidth / Math.max(data.length, 10) : 40;
  const barWidth = Math.min(Math.max(barSlotWidth * 0.45, 10), 28);


  // Standardized Drilldown Report Columns
  const drilldownLeadColumns = useMemo(() => [
    { key: 'lead_id', label: 'Lead ID', width: '90px', getValue: (r) => r.lead_id },
    { key: 'company_name', label: 'Company', minWidth: '160px', getValue: (r) => r.company_name || '' },
    { key: 'name_of_coordinator', label: 'Coordinator', minWidth: '130px', getValue: (r) => r.name_of_coordinator || '' },
    { key: 'account_manager', label: 'Account Mgr', minWidth: '130px', getValue: (r) => r.account_manager || '' },
    { key: 'technology', label: 'Technology', minWidth: '120px', getValue: (r) => r.technology || '' },
    { key: 'lead_date', label: 'Lead Date', minWidth: '110px', getValue: (r) => r.lead_date || '' },
    { key: 'country', label: 'Country', minWidth: '110px', getValue: (r) => r.country || '' },
    {
      key: 'lost_won',
      label: 'Status / Outcome',
      minWidth: '120px',
      getValue: (r) => r.lost_won || 'Open',
      render: (r) => (
        <span
          className={`apex-kpi-badge ${
            r.lost_won === 'WON' || r.lost_won === 'Won'
              ? 'badge-green'
              : r.lost_won === 'Lost'
              ? 'badge-blue'
              : 'badge-amber'
          }`}
        >
          {r.lost_won || 'Open'}
        </span>
      ),
    },
    {
      key: 'amount_in_inr',
      label: 'Amount (INR)',
      minWidth: '120px',
      align: 'right',
      getValue: (r) => r.amount_in_inr ? `₹ ${Number(r.amount_in_inr).toLocaleString()}` : '-',
    },
  ], []);

  const drilldownLineColumns = useMemo(() => [
    { key: 'lead_line_id', label: 'Line ID', width: '85px', getValue: (r) => r.lead_line_id },
    { key: 'lead_id', label: 'Lead ID', width: '85px', getValue: (r) => r.lead_id },
    { key: 'company_name', label: 'Company', minWidth: '150px', getValue: (r) => r.company_name || '' },
    { key: 'technology', label: 'Technology', minWidth: '120px', getValue: (r) => r.technology || '' },
    { key: 'model', label: 'Model', minWidth: '110px', getValue: (r) => r.model || '' },
    { key: 'experience', label: 'Experience', minWidth: '100px', getValue: (r) => r.experience || '' },
    { key: 'rate', label: 'Rate', minWidth: '90px', align: 'right', getValue: (r) => r.rate || '' },
    { key: 'no_of_resources', label: 'Resources', minWidth: '90px', align: 'right', getValue: (r) => r.no_of_resources || '' },
    {
      key: 'amount_in_inr',
      label: 'Amount (INR)',
      minWidth: '120px',
      align: 'right',
      getValue: (r) => r.amount_in_inr ? `₹ ${Number(r.amount_in_inr).toLocaleString()}` : '-',
    },
    { key: 'cv_sent', label: 'CV Sent', minWidth: '90px', getValue: (r) => r.cv_sent || 'No' },
  ], []);

  const drilldownProposalColumns = useMemo(() => [
    { key: 'proposal_id', label: 'Proposal ID', width: '90px', getValue: (r) => r.proposal_id },
    { key: 'lead_id', label: 'Lead ID', width: '85px', getValue: (r) => r.lead_id },
    { key: 'company_name', label: 'Company', minWidth: '160px', getValue: (r) => r.company_name || '' },
    { key: 'proposal_number', label: 'Proposal Number', minWidth: '130px', getValue: (r) => r.proposal_number || '' },
    { key: 'date_sent', label: 'Date Sent', minWidth: '110px', getValue: (r) => r.date_sent || '' },
    { key: 'proposal_description', label: 'Description', minWidth: '180px', getValue: (r) => r.proposal_description || '' },
    { key: 'file_name', label: 'File', minWidth: '120px', getValue: (r) => r.file_name || 'Document' },
  ], []);

  const drilldownResourceColumns = useMemo(() => [
    { key: 'resource_id', label: 'Resource ID', width: '90px', getValue: (r) => r.resource_id },
    { key: 'lead_id', label: 'Lead ID', width: '85px', getValue: (r) => r.lead_id },
    { key: 'resource_name', label: 'Resource Name', minWidth: '150px', getValue: (r) => r.resource_name || '' },
    { key: 'designation', label: 'Designation', minWidth: '130px', getValue: (r) => r.designation || '' },
    { key: 'technology', label: 'Technology', minWidth: '120px', getValue: (r) => r.technology || '' },
    { key: 'status', label: 'Status', minWidth: '100px', getValue: (r) => r.status || '' },
  ], []);

  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: '8px',
        border: '1px solid #cbd5e1',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Dark Navy Header matching screenshot */}
      <div
        style={{
          background: '#071531',
          color: '#ffffff',
          padding: '12px 18px',
          fontWeight: 700,
          fontSize: '15px',
          letterSpacing: '0.01em',
        }}
      >
        {title}
      </div>

      {/* SVG Chart Canvas */}
      <div style={{ padding: '16px 12px 10px', position: 'relative' }}>
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          style={{ width: '100%', height: '260px', overflow: 'visible' }}
        >
          {/* Horizontal Grid lines and Y-axis tick values */}
          {ticks.map((tickVal) => {
            const y = paddingTop + innerHeight - (tickVal / computedMax) * innerHeight;
            return (
              <g key={tickVal}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={chartWidth - paddingRight}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeWidth="1"
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 3.5}
                  textAnchor="end"
                  fontSize="11"
                  fill="#64748b"
                  fontFamily="system-ui, -apple-system, sans-serif"
                >
                  {tickVal}
                </text>
              </g>
            );
          })}

          {/* Vertical Grid lines across column slots */}
          {Array.from({ length: Math.max(data.length, 10) + 1 }).map((_, i) => {
            const x = paddingLeft + i * barSlotWidth;
            if (x > chartWidth - paddingRight + 1) return null;
            return (
              <line
                key={i}
                x1={x}
                y1={paddingTop}
                x2={x}
                y2={paddingTop + innerHeight}
                stroke="#f1f5f9"
                strokeWidth="1"
              />
            );
          })}

          {/* Bottom baseline */}
          <line
            x1={paddingLeft}
            y1={paddingTop + innerHeight}
            x2={chartWidth - paddingRight}
            y2={paddingTop + innerHeight}
            stroke="#cbd5e1"
            strokeWidth="1.5"
          />

          {/* Vertical Column Bars */}
          {data.map((item, idx) => {
            const slotCenterX = paddingLeft + idx * barSlotWidth + barSlotWidth / 2;
            const barX = slotCenterX - barWidth / 2;
            const h = computedMax > 0 ? (item.count / computedMax) * innerHeight : 0;
            const barY = paddingTop + innerHeight - h;
            const isHovered = hoveredIndex === idx;

            return (
              <g
                key={idx}
                style={{ cursor: onBarClick ? 'pointer' : 'default' }}
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
                onClick={() => onBarClick && onBarClick(item.label)}
              >
                {/* Bar */}
                <rect
                  x={barX}
                  y={barY}
                  width={barWidth}
                  height={Math.max(h, 2)}
                  fill={isHovered ? '#0284c7' : barColor}
                  rx="1"
                  style={{ transition: 'fill 0.15s ease' }}
                />

                {/* X-axis indicator dot */}
                <circle
                  cx={slotCenterX}
                  cy={paddingTop + innerHeight + 6}
                  r={isHovered ? 3 : 2}
                  fill={isHovered ? '#0284c7' : '#94a3b8'}
                />

                {/* Truncated source label below */}
                <text
                  x={slotCenterX}
                  y={paddingTop + innerHeight + 20}
                  textAnchor="middle"
                  fontSize="9.5"
                  fill={isHovered ? '#0f172a' : '#64748b'}
                  style={{ pointerEvents: 'none' }}
                >
                  {item.label.length > 7 ? `${item.label.slice(0, 6)}…` : item.label}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredIndex !== null && data[hoveredIndex] && (
          <div
            style={{
              position: 'absolute',
              top: '12px',
              right: '20px',
              background: '#071531',
              color: '#ffffff',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              boxShadow: '0 4px 6px rgba(0,0,0,0.15)',
              pointerEvents: 'none',
              zIndex: 10,
            }}
          >
            <strong>{data[hoveredIndex].label}</strong>: {data[hoveredIndex].count.toLocaleString()} leads
            {onBarClick && <span style={{ display: 'block', fontSize: '10px', color: '#94a3b8' }}>Click to view in Leads report</span>}
          </div>
        )}
      </div>
    </div>
  );
}

// APEX Page 77 Sections (ordered exactly matching screenshot media_1794764844899_349111d9.png)
const SECTIONS = [
  { id: 'overview', label: 'Lead Dashboard - Overview' },
  { id: 'sales_performance', label: 'Sales Performance' },
  { id: 'technology', label: 'Technology' },
  { id: 'lead_details', label: 'Lead Details' },
  { id: 'lead_lines_details', label: 'Lead Lines Details' },
  { id: 'lead_resources', label: 'Lead Resources' },
  { id: 'lead_proposals', label: 'Lead Proposals' },
];

export default function LeadDashboard({ onNavigate, onShowToast }) {
  // Active Section Tab
  const [activeSection, setActiveSection] = useState('overview');

  // Filter Drawer / Toolbar open state (collapsed by default matching APEX screenshot)
  const [showFilters, setShowFilters] = useState(false);

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
  const [showLeadDetailsActions, setShowLeadDetailsActions] = useState(false);
  const [showLeadLinesActions, setShowLeadLinesActions] = useState(false);
  const [showProposalsActions, setShowProposalsActions] = useState(false);
  const [showResourcesActions, setShowResourcesActions] = useState(false);

  const handleExportLeadDetailsCsv = () => {
    if (!leadDetails.data || leadDetails.data.length === 0) return;
    const header = 'Lead ID,Company,Coordinator,Account Mgr,Technology,Lead Date,Country,Status,Amount';
    const rows = leadDetails.data.map((r) =>
      `"${r.lead_id}","${(r.company_name || '').replace(/"/g, '""')}","${(r.name_of_coordinator || '').replace(/"/g, '""')}","${(r.account_manager || '').replace(/"/g, '""')}","${(r.technology || '').replace(/"/g, '""')}","${r.lead_date || ''}","${(r.country || '').replace(/"/g, '""')}","${r.lost_won || 'Open'}","${r.amount_in_inr || 0}"`
    );
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Lead_Details_Report_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportLeadLinesCsv = () => {
    if (!leadLines.data || leadLines.data.length === 0) return;
    const header = 'Line ID,Lead ID,Company,Technology,Model,Experience,Rate,Resources,Amount,CV Sent';
    const rows = leadLines.data.map((r) =>
      `"${r.line_id}","${r.lead_id}","${(r.company_name || '').replace(/"/g, '""')}","${(r.technology || '').replace(/"/g, '""')}","${(r.model || '').replace(/"/g, '""')}","${(r.experience || '').replace(/"/g, '""')}","${r.rate || 0}","${r.resources || 0}","${r.amount_in_inr || 0}","${r.cv_sent || ''}"`
    );
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Lead_Lines_Details_Report_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportProposalsCsv = () => {
    if (!proposals.data || proposals.data.length === 0) return;
    const header = 'Proposal ID,Lead ID,Company,Proposal Number,Date Sent,Description,File';
    const rows = proposals.data.map((r) =>
      `"${r.proposal_id}","${r.lead_id}","${(r.company_name || '').replace(/"/g, '""')}","${(r.proposal_number || '').replace(/"/g, '""')}","${r.date_sent || ''}","${(r.proposal_description || '').replace(/"/g, '""')}","${(r.file_name || '').replace(/"/g, '""')}"`
    );
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Lead_Proposals_Report_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportResourcesCsv = () => {
    if (!resources.data || resources.data.length === 0) return;
    const header = 'Resource ID,Lead ID,Company,Resource Name,Designation,Technology,Status';
    const rows = resources.data.map((r) =>
      `"${r.resource_id}","${r.lead_id}","${(r.company_name || '').replace(/"/g, '""')}","${(r.resource_name || '').replace(/"/g, '""')}","${(r.designation || '').replace(/"/g, '""')}","${(r.technology || '').replace(/"/g, '""')}","${(r.status || '').replace(/"/g, '""')}"`
    );
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Lead_Resources_Report_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

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
          1. TOP APEX TAB BAR & SHOW FILTERS ACTION (EXACT APEX SCREENSHOT)
          ======================================================== */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #e2e8f0',
          paddingBottom: '0px',
          marginBottom: '16px',
          gap: '16px',
        }}
      >
        {/* Left: 7 Sections Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', overflowX: 'auto' }}>
          {SECTIONS.map((sec) => {
            const isActive = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => setActiveSection(sec.id)}
                style={{
                  position: 'relative',
                  padding: '6px 2px 14px 2px',
                  background: 'none',
                  border: 'none',
                  color: isActive ? '#0f172a' : '#475569',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '14px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'color 0.15s ease',
                }}
              >
                <span>{sec.label}</span>
                {isActive && (
                  <span
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: '3px',
                      background: '#166534',
                      borderRadius: '2px 2px 0 0',
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Right: Show Filters Navy Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="btn-outline btn-toggle-filters"
            style={{
              borderRadius: '8px',
              padding: '8px 20px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              flexShrink: 0,
              transition: 'all 0.15s ease',
            }}
          >
            <span>{showFilters ? 'Hide Filters' : 'Show Filters'}</span>
            {activeFilterCount > 0 && (
              <span
                style={{
                  background: '#0284c7',
                  color: '#ffffff',
                  borderRadius: '10px',
                  padding: '0 6px',
                  fontSize: '11px',
                  marginLeft: '4px',
                }}
              >
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ========================================================
          2. APEX PAGE 77 FILTER TOOLBAR / PANEL
          ======================================================== */}
      {showFilters && (
        <div
          className="apex-table-card" style={{ borderRadius: '10px', border: '1px solid #e2e8f0',
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
              className="btn-secondary"
              style={{
                padding: '7px 18px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              Reset Filters
            </button>
            <button
              type="button"
              onClick={handleApplyFilters}
              className="btn-primary"
              style={{
                padding: '7px 22px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
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
          {/* ========================================================
              DECORATIVE BANNER WITH 8 KPI CARDS MATCHING SCREENSHOT
              ======================================================== */}
          <div
            style={{
              position: 'relative',
              borderRadius: '10px',
              padding: '16px 14px',
              background: 'linear-gradient(135deg, #fef3c7 0%, #fed7aa 25%, #dcfce7 50%, #bfdbfe 80%, #f1f5f9 100%)',
              border: '1px solid rgba(226, 232, 240, 0.9)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: '12px',
              }}
            >
              {/* Card 1: Total Leads */}
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  borderTop: '3px solid #3b82f6',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '100px',
                  cursor: 'pointer',
                }}
                onClick={() => navigateToReport('leads')}
                title="Click to view all Leads in report"
              >
                <div style={{ marginBottom: '8px' }}>
                  <IconUsers size={20} color="#3b82f6" />
                </div>
                <div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', lineHeight: 1.15 }}>
                    {overviewData.kpis.totalLeads.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', fontWeight: 500, whiteSpace: 'nowrap' }}>
                    Total Leads
                  </div>
                </div>
              </div>

              {/* Card 2: Won Leads */}
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  borderTop: '3px solid #22c55e',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '100px',
                  cursor: 'pointer',
                }}
                onClick={() => navigateToReport('leads', { lost_won: 'Won' })}
                title="Click to view Won Leads"
              >
                <div style={{ marginBottom: '8px' }}>
                  <IconCheckCircle size={20} color="#22c55e" />
                </div>
                <div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', lineHeight: 1.15 }}>
                    {overviewData.kpis.wonLeads.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', fontWeight: 500, whiteSpace: 'nowrap' }}>
                    Won Leads
                  </div>
                </div>
              </div>

              {/* Card 3: Open Leads */}
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  borderTop: '3px solid #eab308',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '100px',
                  cursor: 'pointer',
                }}
                onClick={() => navigateToReport('leads', { lost_won: 'Open' })}
                title="Click to view Open Leads"
              >
                <div style={{ marginBottom: '8px' }}>
                  <IconHourglass size={20} color="#eab308" />
                </div>
                <div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', lineHeight: 1.15 }}>
                    {overviewData.kpis.openLeads.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', fontWeight: 500, whiteSpace: 'nowrap' }}>
                    Open Leads
                  </div>
                </div>
              </div>

              {/* Card 4: On Hold */}
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  borderTop: '3px solid #f97316',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '100px',
                  cursor: 'pointer',
                }}
                onClick={() => navigateToReport('leads', { lost_won: 'On Hold' })}
                title="Click to view On Hold Leads"
              >
                <div style={{ marginBottom: '8px' }}>
                  <IconPauseCircle size={20} color="#f97316" />
                </div>
                <div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', lineHeight: 1.15 }}>
                    {overviewData.kpis.onHoldLeads.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', fontWeight: 500, whiteSpace: 'nowrap' }}>
                    On Hold
                  </div>
                </div>
              </div>

              {/* Card 5: Lost Leads */}
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  borderTop: '3px solid #ef4444',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '100px',
                  cursor: 'pointer',
                }}
                onClick={() => navigateToReport('leads', { lost_won: 'Lost' })}
                title="Click to view Lost Leads"
              >
                <div style={{ marginBottom: '8px' }}>
                  <IconXCircle size={20} color="#ef4444" />
                </div>
                <div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', lineHeight: 1.15 }}>
                    {overviewData.kpis.lostLeads.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', fontWeight: 500, whiteSpace: 'nowrap' }}>
                    Lost Leads
                  </div>
                </div>
              </div>

              {/* Card 6: Win Rate */}
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  borderTop: '3px solid #a855f7',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '100px',
                }}
              >
                <div style={{ marginBottom: '8px' }}>
                  <IconTrophy size={20} color="#a855f7" />
                </div>
                <div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', lineHeight: 1.15 }}>
                    {overviewData.kpis.winRate}%
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', fontWeight: 500, whiteSpace: 'nowrap' }}>
                    Win Rate
                  </div>
                </div>
              </div>

              {/* Card 7: Contract Value (INR) */}
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  borderTop: '3px solid #06b6d4',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '100px',
                }}
              >
                <div style={{ marginBottom: '8px' }}>
                  <IconBanknote size={20} color="#06b6d4" />
                </div>
                <div>
                  <div
                    style={{
                      fontSize: '18px',
                      fontWeight: 800,
                      color: '#0f172a',
                      lineHeight: 1.15,
                      wordBreak: 'break-all',
                    }}
                  >
                    {Math.round(overviewData.kpis.contractValueInr).toLocaleString()}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', fontWeight: 500, whiteSpace: 'nowrap' }}>
                    Contract Value (INR)
                  </div>
                </div>
              </div>

              {/* Card 8: Avg. Time to Close (days) */}
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  borderTop: '3px solid #64748b',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '100px',
                }}
              >
                <div style={{ marginBottom: '8px' }}>
                  <IconClock size={20} color="#64748b" />
                </div>
                <div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', lineHeight: 1.15 }}>
                    {Math.round(overviewData.kpis.avgTimeToCloseDays)}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', fontWeight: 500, whiteSpace: 'nowrap' }}>
                    Avg. Time to Close (days)
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Range Indicator: 1 - 8 */}
          <div style={{ textAlign: 'right', fontSize: '12px', color: '#64748b', marginTop: '-10px', marginRight: '4px' }}>
            1 - 8
          </div>

          {/* Side-by-side Dark Navy Header Charts matching Screenshot 1 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '20px' }}>
            <ApexColumnChart
              title="Total Leads by Source"
              data={overviewData.charts.totalLeadsBySource || []}
              step={50}
              maxVal={450}
              barColor="#0284c7"
              onBarClick={(source) => navigateToReport('leads', { source })}
            />
            <ApexColumnChart
              title="Won Leads by Source"
              data={overviewData.charts.wonLeadsBySource || []}
              step={5}
              maxVal={30}
              barColor="#336a86"
              onBarClick={(source) => navigateToReport('leads', { source, lost_won: 'Won' })}
            />
          </div>

          {/* Overview Charts Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
            {/* 1. Lead Status Donut Chart */}
            <div className="apex-table-card" style={{ borderRadius: '10px', border: '1px solid #e2e8f0', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
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
            <div className="apex-table-card" style={{ borderRadius: '10px', border: '1px solid #e2e8f0', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
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
          <div className="apex-table-card" style={{ borderRadius: '10px', border: '1px solid #e2e8f0', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
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
            <div className="apex-table-card" style={{ borderRadius: '10px', border: '1px solid #e2e8f0', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
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
          <div className="apex-table-card" style={{ borderRadius: '10px', border: '1px solid #e2e8f0', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
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
            <div className="apex-table-card" style={{ borderRadius: '10px', border: '1px solid #e2e8f0', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
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
        <div className="apex-table-card" style={{ borderRadius: '10px', border: '1px solid #e2e8f0', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ marginBottom: '14px' }}>
            <h4 style={{ margin: '0 0 2px', fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
              Lead Details Report
            </h4>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              Showing {leadDetails.data.length} of {leadDetails.total} records matching active filters
            </span>
          </div>

          <ApexInteractiveReport
            reportId="lead_dashboard_lead_details"
            columns={drilldownLeadColumns}
            data={leadDetails.data}
            total={leadDetails.total}
            page={leadDetails.page}
            onPageChange={(newPage) => setLeadDetails((prev) => ({ ...prev, page: newPage }))}
            rowsPerPage={leadDetails.pageSize}
            onRowsPerPageChange={(newRows) => {
              setLeadDetails((prev) => ({ ...prev, pageSize: newRows, page: 1 }));
            }}
            search={leadDetails.search}
            onSearchChange={(val) => setLeadDetails((prev) => ({ ...prev, search: val }))}
            onSearchSubmit={() => {
              setLeadDetails((prev) => ({ ...prev, page: 1 }));
              loadSectionData('lead_details', appliedFilters);
            }}
            isServerSide={true}
            renderLeadingCell={(row) => (
              <button
                type="button"
                className="apex-edit-icon-btn"
                title={`Open Lead #${row.lead_id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  navigateToReport('leads', { lead_id: row.lead_id });
                }}
              >
                <IconFilePenLine size={14} color="#0284c7" />
              </button>
            )}
            onRowClick={(row) => navigateToReport('leads', { lead_id: row.lead_id })}
            onDownload={handleExportLeadDetailsCsv}
            onRefresh={() => loadSectionData('lead_details', appliedFilters)}
          />
        </div>
      )}

      {/* ========================================================
          8. SECTION 5: LEAD LINES DETAILS REPORT
          ======================================================== */}
      {activeSection === 'lead_lines_details' && (
        <div className="apex-table-card" style={{ borderRadius: '10px', border: '1px solid #e2e8f0', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ marginBottom: '14px' }}>
            <h4 style={{ margin: '0 0 2px', fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
              Lead Lines Details Report
            </h4>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              Showing {leadLines.data.length} of {leadLines.total} lead line requirements
            </span>
          </div>

          <ApexInteractiveReport
            reportId="lead_dashboard_line_details"
            columns={drilldownLineColumns}
            data={leadLines.data}
            total={leadLines.total}
            page={leadLines.page}
            onPageChange={(newPage) => setLeadLines((prev) => ({ ...prev, page: newPage }))}
            rowsPerPage={leadLines.pageSize}
            onRowsPerPageChange={(newRows) => {
              setLeadLines((prev) => ({ ...prev, pageSize: newRows, page: 1 }));
            }}
            search={leadLines.search}
            onSearchChange={(val) => setLeadLines((prev) => ({ ...prev, search: val }))}
            onSearchSubmit={() => {
              setLeadLines((prev) => ({ ...prev, page: 1 }));
              loadSectionData('lead_lines_details', appliedFilters);
            }}
            isServerSide={true}
            renderLeadingCell={(row) => (
              <button
                type="button"
                className="apex-edit-icon-btn"
                title={`Open Lead #${row.lead_id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  navigateToReport('leads', { lead_id: row.lead_id });
                }}
              >
                <IconFilePenLine size={14} color="#0284c7" />
              </button>
            )}
            onDownload={handleExportLeadLinesCsv}
            onRefresh={() => loadSectionData('lead_lines_details', appliedFilters)}
          />
        </div>
      )}

      {/* ========================================================
          9. SECTION 6: LEAD PROPOSALS REPORT
          ======================================================== */}
      {activeSection === 'lead_proposals' && (
        <div className="apex-table-card" style={{ borderRadius: '10px', border: '1px solid #e2e8f0', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ marginBottom: '14px' }}>
            <h4 style={{ margin: '0 0 2px', fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
              Lead Proposals Report
            </h4>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              Showing {proposals.data.length} of {proposals.total} sent proposals matching active filters
            </span>
          </div>

          <ApexInteractiveReport
            reportId="lead_dashboard_proposals"
            columns={drilldownProposalColumns}
            data={proposals.data}
            total={proposals.total}
            page={proposals.page}
            onPageChange={(newPage) => setProposals((prev) => ({ ...prev, page: newPage }))}
            rowsPerPage={proposals.pageSize}
            onRowsPerPageChange={(newRows) => {
              setProposals((prev) => ({ ...prev, pageSize: newRows, page: 1 }));
            }}
            search={proposals.search}
            onSearchChange={(val) => setProposals((prev) => ({ ...prev, search: val }))}
            onSearchSubmit={() => {
              setProposals((prev) => ({ ...prev, page: 1 }));
              loadSectionData('lead_proposals', appliedFilters);
            }}
            isServerSide={true}
            onDownload={handleExportProposalsCsv}
            onRefresh={() => loadSectionData('lead_proposals', appliedFilters)}
          />
        </div>
      )}

      {/* ========================================================
          10. SECTION 7: LEAD RESOURCES REPORT
          ======================================================== */}
      {activeSection === 'lead_resources' && (
        <div className="apex-table-card" style={{ borderRadius: '10px', border: '1px solid #e2e8f0', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ marginBottom: '14px' }}>
            <h4 style={{ margin: '0 0 2px', fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
              Lead Resources Report
            </h4>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              Showing {resources.data.length} of {resources.total} candidate and technical resource allocations
            </span>
          </div>

          <ApexInteractiveReport
            reportId="lead_dashboard_resources"
            columns={drilldownResourceColumns}
            data={resources.data}
            total={resources.total}
            page={resources.page}
            onPageChange={(newPage) => setResources((prev) => ({ ...prev, page: newPage }))}
            rowsPerPage={resources.pageSize}
            onRowsPerPageChange={(newRows) => {
              setResources((prev) => ({ ...prev, pageSize: newRows, page: 1 }));
            }}
            search={resources.search}
            onSearchChange={(val) => setResources((prev) => ({ ...prev, search: val }))}
            onSearchSubmit={() => {
              setResources((prev) => ({ ...prev, page: 1 }));
              loadSectionData('lead_resources', appliedFilters);
            }}
            isServerSide={true}
            emptyMessage="No resource allocations recorded in lead_resources for the selected filter set."
            onDownload={handleExportResourcesCsv}
            onRefresh={() => loadSectionData('lead_resources', appliedFilters)}
          />
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
