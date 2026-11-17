const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, '../client/src/index.css');
let content = fs.readFileSync(cssPath, 'utf8');

// The marker where the old dark theme overrides begin
const marker = '/* ==========================================================================\r\n   CUSTOMER MANAGEMENT SYSTEM - DUAL THEME ENGINE (DARK THEME SPECIFICATION)';
const markerLF = '/* ==========================================================================\n   CUSTOMER MANAGEMENT SYSTEM - DUAL THEME ENGINE (DARK THEME SPECIFICATION)';

let splitIdx = content.indexOf(marker);
if (splitIdx === -1) {
  splitIdx = content.indexOf(markerLF);
}

if (splitIdx === -1) {
  console.error('Marker not found in index.css');
  process.exit(1);
}

const baseCss = content.substring(0, splitIdx);
const oldOverrides = content.substring(splitIdx);

// Convert old overrides into the renamed 'blue' theme overrides
const blueOverrides = oldOverrides
  .replace(/CUSTOMER MANAGEMENT SYSTEM - DUAL THEME ENGINE \(DARK THEME SPECIFICATION\)/g, 'CMS BLUE (NAVY) THEME ENGINE')
  .replace(/\.apex-theme-dark/g, '.apex-theme-blue')
  .replace(/\[data-theme="dark"\]/g, '[data-theme="blue"]')
  .replace(/body\.apex-theme-dark/g, 'body.apex-theme-blue')
  .replace(/body:not\(\.apex-theme-dark\)/g, 'body:not(.apex-theme-blue)')
  .replace(/\.apex-theme-dark\.apex-app-root/g, '.apex-theme-blue.apex-app-root');

// Now create the new dark theme specification according to user design tokens
const darkSpecificationCss = `
/* ==========================================================================
   CUSTOMER MANAGEMENT SYSTEM - NEW DARK THEME SPECIFICATION
   Tokens:
   - App background: #171717 (main page and outer workspace)
   - Sidebar background: #111111 (navigation area)
   - Card and panel background: #1C1C1C (dashboard cards, tables, schedule, grouped content)
   - Raised surface: #222222 (dropdown menus, hover surfaces, elements above panels)
   - Input background: #161616 (search boxes, text fields, form controls)
   - Border and divider: #2C2C2C (subtle outlines, separators, table divisions)
   - Primary text: #F5F5F5 (headings, important values, main labels)
   - Secondary text: #A3A3A3 (descriptions, metadata, timestamps, inactive labels)
   - Muted text: #737373 (placeholders and disabled labels)
   - Primary accent: #3B82F6 (links, selected navigation, focus rings, primary actions)
   - Primary button: background #2563EB, text #FFFFFF; hover background #1D4ED8
   - Secondary button: background #222222, text #E5E5E5, border #383838; hover background #2A2A2A
   - Disabled button: background #202020, text #737373, border #2C2C2C
   - Positive status: #22C55E text on #14251A background
   - Negative status: #F87171 text on #2A1717 background
   - Chart colors: blue #3B9DF8, coral #FF8A65, violet #8B7CFF
   ========================================================================== */

/* 1. App background behind all content & outer workspace */
.apex-theme-dark.apex-app-root,
[data-theme="dark"] .apex-app-root,
body.apex-theme-dark,
[data-theme="dark"] body {
  background-color: #171717 !important;
  color: #F5F5F5 !important;
}

.apex-theme-dark .apex-layout-body,
[data-theme="dark"] .apex-layout-body,
.apex-theme-dark .apex-main-viewport,
[data-theme="dark"] .apex-main-viewport,
.apex-theme-dark .apex-main-inner,
[data-theme="dark"] .apex-main-inner,
.apex-theme-dark .apex-master-page,
[data-theme="dark"] .apex-master-page {
  background-color: #171717 !important;
  color: #F5F5F5 !important;
}

/* 2. Top Navigation Bar */
.apex-theme-dark .apex-topbar,
[data-theme="dark"] .apex-topbar {
  background-color: #111111 !important;
  border-bottom: 1px solid #2C2C2C !important;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4) !important;
}

.apex-theme-dark .iqra-logo-box,
[data-theme="dark"] .iqra-logo-box {
  background: #1C1C1C !important;
  border: 1px solid #2C2C2C !important;
}

.apex-theme-dark .iqra-title,
[data-theme="dark"] .iqra-title {
  color: #F5F5F5 !important;
}

.apex-theme-dark .iqra-subtitle,
[data-theme="dark"] .iqra-subtitle {
  color: #3B82F6 !important;
}

.apex-theme-dark .apex-app-title,
[data-theme="dark"] .apex-app-title {
  color: #F5F5F5 !important;
}

.apex-theme-dark .role-simulator-badge,
[data-theme="dark"] .role-simulator-badge {
  background-color: #1C1C1C !important;
  border: 1px solid #2C2C2C !important;
}

.apex-theme-dark .role-simulator-label,
[data-theme="dark"] .role-simulator-label {
  color: #A3A3A3 !important;
}

.apex-theme-dark .role-simulator-select,
[data-theme="dark"] .role-simulator-select {
  background-color: #161616 !important;
  color: #F5F5F5 !important;
  border: 1px solid #2C2C2C !important;
}

.apex-theme-dark .role-simulator-select option,
[data-theme="dark"] .role-simulator-select option {
  background-color: #161616 !important;
  color: #F5F5F5 !important;
}

.apex-theme-dark .apex-theme-toggle-btn,
[data-theme="dark"] .apex-theme-toggle-btn {
  background: #222222 !important;
  border: 1px solid #383838 !important;
  color: #E5E5E5 !important;
}

.apex-theme-dark .apex-theme-toggle-btn:hover,
[data-theme="dark"] .apex-theme-toggle-btn:hover {
  background: #2A2A2A !important;
  border-color: #3B82F6 !important;
  color: #FFFFFF !important;
}

/* 3. Sidebar background (#111111) & Navigation */
.apex-theme-dark .apex-sidebar,
[data-theme="dark"] .apex-sidebar {
  background-color: #111111 !important;
  border-right: 1px solid #2C2C2C !important;
  color: #A3A3A3 !important;
}

.apex-theme-dark .apex-sidebar-nav,
[data-theme="dark"] .apex-sidebar-nav {
  background-color: #111111 !important;
}

.apex-theme-dark .apex-nav-item,
[data-theme="dark"] .apex-nav-item {
  color: #A3A3A3 !important;
}

.apex-theme-dark .apex-nav-item:hover,
[data-theme="dark"] .apex-nav-item:hover {
  background-color: #222222 !important;
  color: #F5F5F5 !important;
}

.apex-theme-dark .apex-nav-item.active,
[data-theme="dark"] .apex-nav-item.active,
.apex-theme-dark .apex-nav-item.active-group,
[data-theme="dark"] .apex-nav-item.active-group {
  background: rgba(59, 130, 246, 0.16) !important;
  border-left: 3px solid #3B82F6 !important;
  color: #F5F5F5 !important;
}

.apex-theme-dark .apex-sub-menu,
[data-theme="dark"] .apex-sub-menu {
  background-color: #111111 !important;
  border-left: 1px solid #2C2C2C !important;
}

.apex-theme-dark .apex-sub-item,
[data-theme="dark"] .apex-sub-item {
  color: #A3A3A3 !important;
}

.apex-theme-dark .apex-sub-item:hover,
[data-theme="dark"] .apex-sub-item:hover {
  color: #F5F5F5 !important;
  background-color: #222222 !important;
}

.apex-theme-dark .apex-sub-item.active,
[data-theme="dark"] .apex-sub-item.active {
  color: #3B82F6 !important;
  background-color: rgba(59, 130, 246, 0.16) !important;
  font-weight: 600 !important;
}

/* 4. Cards and Panels (#1C1C1C) */
.apex-theme-dark .apex-card,
[data-theme="dark"] .apex-card,
.apex-theme-dark .apex-form-card,
[data-theme="dark"] .apex-form-card,
.apex-theme-dark .master-form-card,
[data-theme="dark"] .master-form-card,
.apex-theme-dark .company-filters-card,
[data-theme="dark"] .company-filters-card,
.apex-theme-dark .lead-filters-card,
[data-theme="dark"] .lead-filters-card,
.apex-theme-dark .apex-filter-panel,
[data-theme="dark"] .apex-filter-panel,
.apex-theme-dark .apex-table-card,
[data-theme="dark"] .apex-table-card,
.apex-theme-dark .apex-master-table-card,
[data-theme="dark"] .apex-master-table-card,
.apex-theme-dark .dense-table-wrapper,
[data-theme="dark"] .dense-table-wrapper,
.apex-theme-dark .apex-ir-card,
[data-theme="dark"] .apex-ir-card,
.apex-theme-dark .apex-report-toolbar,
[data-theme="dark"] .apex-report-toolbar,
.apex-theme-dark .apex-kpi-card,
[data-theme="dark"] .apex-kpi-card,
.apex-theme-dark .stat-card,
[data-theme="dark"] .stat-card,
.apex-theme-dark .apex-chart-card,
[data-theme="dark"] .apex-chart-card,
.apex-theme-dark .apex-active-filter-banner,
[data-theme="dark"] .apex-active-filter-banner,
.apex-theme-dark .apex-active-aggregations-bar,
[data-theme="dark"] .apex-active-aggregations-bar,
.apex-theme-dark .apex-active-groupby-banner,
[data-theme="dark"] .apex-active-groupby-banner,
.apex-theme-dark .apex-active-pivot-banner,
[data-theme="dark"] .apex-active-pivot-banner {
  background-color: #1C1C1C !important;
  border: 1px solid #2C2C2C !important;
  color: #F5F5F5 !important;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3) !important;
}

/* Neutralize inline white backgrounds on panels & containers */
.apex-theme-dark div[style*="background: #ffffff"],
.apex-theme-dark div[style*="background: rgb(255, 255, 255)"],
.apex-theme-dark div[style*="background-color: #ffffff"],
.apex-theme-dark div[style*="background-color: rgb(255, 255, 255)"],
.apex-theme-dark div[style*="backgroundColor: '#ffffff'"],
.apex-theme-dark div[style*="backgroundColor: '#fff'"],
.apex-theme-dark form[style*="background: #ffffff"],
.apex-theme-dark form[style*="background-color: #ffffff"],
.apex-theme-dark section[style*="background-color: #ffffff"],
[data-theme="dark"] div[style*="background: #ffffff"],
[data-theme="dark"] div[style*="background: rgb(255, 255, 255)"],
[data-theme="dark"] div[style*="background-color: #ffffff"],
[data-theme="dark"] div[style*="background-color: rgb(255, 255, 255)"],
[data-theme="dark"] form[style*="background: #ffffff"],
[data-theme="dark"] form[style*="background-color: #ffffff"] {
  background-color: #1C1C1C !important;
  border-color: #2C2C2C !important;
  color: #F5F5F5 !important;
}

/* 5. Raised Surfaces (#222222) - Dropdowns, Modals, Overlays */
.apex-theme-dark .user-dropdown-card,
[data-theme="dark"] .user-dropdown-card,
.apex-theme-dark .apex-actions-dropdown,
[data-theme="dark"] .apex-actions-dropdown,
.apex-theme-dark .apex-column-menu,
[data-theme="dark"] .apex-column-menu,
.apex-theme-dark .excel-filter-dropdown,
[data-theme="dark"] .excel-filter-dropdown,
.apex-theme-dark .multi-select-dropdown,
[data-theme="dark"] .multi-select-dropdown,
.apex-theme-dark .apex-actions-flyout-menu,
[data-theme="dark"] .apex-actions-flyout-menu,
.apex-theme-dark .apex-modal-card,
[data-theme="dark"] .apex-modal-card {
  background-color: #222222 !important;
  border: 1px solid #2C2C2C !important;
  color: #F5F5F5 !important;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.6) !important;
}

.apex-theme-dark .apex-modal-header,
[data-theme="dark"] .apex-modal-header,
.apex-theme-dark .user-dropdown-header,
[data-theme="dark"] .user-dropdown-header {
  background-color: #1C1C1C !important;
  border-bottom: 1px solid #2C2C2C !important;
  color: #F5F5F5 !important;
}

.apex-theme-dark .apex-modal-footer,
[data-theme="dark"] .apex-modal-footer {
  background-color: #1C1C1C !important;
  border-top: 1px solid #2C2C2C !important;
}

.apex-theme-dark .user-dropdown-item,
[data-theme="dark"] .user-dropdown-item,
.apex-theme-dark .apex-actions-menu-item,
[data-theme="dark"] .apex-actions-menu-item,
.apex-theme-dark .apex-actions-flyout-item,
[data-theme="dark"] .apex-actions-flyout-item {
  color: #A3A3A3 !important;
}

.apex-theme-dark .user-dropdown-item:hover,
[data-theme="dark"] .user-dropdown-item:hover,
.apex-theme-dark .apex-actions-menu-item:hover:not(.disabled),
[data-theme="dark"] .apex-actions-menu-item:hover:not(.disabled),
.apex-theme-dark .apex-actions-flyout-item:hover,
[data-theme="dark"] .apex-actions-flyout-item:hover {
  background-color: #2A2A2A !important;
  color: #F5F5F5 !important;
}

.apex-theme-dark .user-dropdown-divider,
[data-theme="dark"] .user-dropdown-divider {
  background-color: #2C2C2C !important;
}

/* 6. Inputs (#161616), Dropdowns, Textareas, Controls */
.apex-theme-dark input:not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="checkbox"]):not([type="radio"]),
.apex-theme-dark select,
.apex-theme-dark textarea,
.apex-theme-dark .apex-search-field,
.apex-theme-dark .apex-search-input,
.apex-theme-dark .company-filter-input,
.apex-theme-dark .company-filter-select,
.apex-theme-dark .apex-form-input,
.apex-theme-dark .form-control-input,
.apex-theme-dark .form-control-select,
.apex-theme-dark .apex-rows-select,
.apex-theme-dark .upload-dropzone,
[data-theme="dark"] input:not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="checkbox"]):not([type="radio"]),
[data-theme="dark"] select,
[data-theme="dark"] textarea,
[data-theme="dark"] .apex-search-field,
[data-theme="dark"] .apex-search-input,
[data-theme="dark"] .company-filter-input,
[data-theme="dark"] .company-filter-select,
[data-theme="dark"] .apex-form-input,
[data-theme="dark"] .form-control-input,
[data-theme="dark"] .form-control-select,
[data-theme="dark"] .apex-rows-select,
[data-theme="dark"] .upload-dropzone {
  background-color: #161616 !important;
  border: 1px solid #2C2C2C !important;
  color: #F5F5F5 !important;
}

.apex-theme-dark input::placeholder,
.apex-theme-dark textarea::placeholder,
[data-theme="dark"] input::placeholder,
[data-theme="dark"] textarea::placeholder {
  color: #737373 !important;
}

.apex-theme-dark input:focus,
.apex-theme-dark select:focus,
.apex-theme-dark textarea:focus,
[data-theme="dark"] input:focus,
[data-theme="dark"] select:focus,
[data-theme="dark"] textarea:focus {
  border-color: #3B82F6 !important;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.25) !important;
  outline: none !important;
}

.apex-theme-dark select option,
[data-theme="dark"] select option {
  background-color: #161616 !important;
  color: #F5F5F5 !important;
}

/* Checkboxes */
.apex-theme-dark input[type="checkbox"],
.apex-theme-dark .table-checkbox,
[data-theme="dark"] input[type="checkbox"],
[data-theme="dark"] .table-checkbox {
  appearance: none !important;
  -webkit-appearance: none !important;
  width: 16px !important;
  height: 16px !important;
  border-radius: 3px !important;
  border: 1.5px solid #383838 !important;
  background-color: #161616 !important;
  cursor: pointer !important;
  position: relative !important;
  vertical-align: middle !important;
  display: inline-block !important;
  outline: none !important;
}

.apex-theme-dark input[type="checkbox"]:hover,
[data-theme="dark"] input[type="checkbox"]:hover {
  border-color: #3B82F6 !important;
}

.apex-theme-dark input[type="checkbox"]:checked,
[data-theme="dark"] input[type="checkbox"]:checked {
  background-color: #2563EB !important;
  border-color: #3B82F6 !important;
}

/* 7. Typography: Primary (#F5F5F5), Secondary (#A3A3A3), Muted (#737373) */
.apex-theme-dark h1,
.apex-theme-dark h2,
.apex-theme-dark h3,
.apex-theme-dark h4,
.apex-theme-dark h5,
.apex-theme-dark h6,
.apex-theme-dark .apex-page-heading,
.apex-theme-dark .apex-page-title,
.apex-theme-dark .apex-kpi-value,
.apex-theme-dark .stat-value,
[data-theme="dark"] h1,
[data-theme="dark"] h2,
[data-theme="dark"] h3,
[data-theme="dark"] h4,
[data-theme="dark"] h5,
[data-theme="dark"] h6,
[data-theme="dark"] .apex-page-heading,
[data-theme="dark"] .apex-page-title,
[data-theme="dark"] .apex-kpi-value,
[data-theme="dark"] .stat-value {
  color: #F5F5F5 !important;
}

.apex-theme-dark .apex-kpi-label,
.apex-theme-dark .stat-label,
.apex-theme-dark .company-filter-label,
.apex-theme-dark .form-group label,
.apex-theme-dark label,
.apex-theme-dark .apex-pagination-strip,
.apex-theme-dark .apex-rows-select-group,
[data-theme="dark"] .apex-kpi-label,
[data-theme="dark"] .stat-label,
[data-theme="dark"] .company-filter-label,
[data-theme="dark"] .form-group label,
[data-theme="dark"] label,
[data-theme="dark"] .apex-pagination-strip,
[data-theme="dark"] .apex-rows-select-group {
  color: #A3A3A3 !important;
}

.apex-theme-dark .apex-kpi-subtext,
.apex-theme-dark .stat-subtext,
.apex-theme-dark .upload-subtitle,
[data-theme="dark"] .apex-kpi-subtext,
[data-theme="dark"] .stat-subtext,
[data-theme="dark"] .upload-subtitle {
  color: #737373 !important;
}

/* 8. Tables: Panel Background (#1C1C1C), Primary Cells (#F5F5F5), Subtle Rows (#2C2C2C), Hover (#222222) */
.apex-theme-dark table,
.apex-theme-dark .dense-table,
.apex-theme-dark .apex-master-table,
.apex-theme-dark .apex-report-table,
[data-theme="dark"] table,
[data-theme="dark"] .dense-table,
[data-theme="dark"] .apex-master-table,
[data-theme="dark"] .apex-report-table {
  background-color: #1C1C1C !important;
  color: #F5F5F5 !important;
  border-color: #2C2C2C !important;
}

.apex-theme-dark .dense-table thead tr,
.apex-theme-dark .apex-master-table thead tr,
.apex-theme-dark .apex-report-table thead tr,
.apex-theme-dark tr.apex-report-header-row,
[data-theme="dark"] .dense-table thead tr,
[data-theme="dark"] .apex-master-table thead tr,
[data-theme="dark"] .apex-report-table thead tr,
[data-theme="dark"] tr.apex-report-header-row {
  background-color: #1C1C1C !important;
  border-bottom: 1px solid #2C2C2C !important;
}

.apex-theme-dark .dense-table th,
.apex-theme-dark .apex-master-table th,
.apex-theme-dark .apex-report-table th,
[data-theme="dark"] .dense-table th,
[data-theme="dark"] .apex-master-table th,
[data-theme="dark"] .apex-report-table th {
  background-color: #1C1C1C !important;
  color: #A3A3A3 !important;
  border-bottom: 1px solid #2C2C2C !important;
  border-right: 1px solid #2C2C2C !important;
}

.apex-theme-dark .dense-table th:hover,
.apex-theme-dark .apex-master-table th:hover,
.apex-theme-dark .apex-report-table th:hover,
[data-theme="dark"] .dense-table th:hover,
[data-theme="dark"] .apex-master-table th:hover,
[data-theme="dark"] .apex-report-table th:hover {
  background-color: #222222 !important;
  color: #F5F5F5 !important;
}

.apex-theme-dark table td,
.apex-theme-dark .dense-table td,
.apex-theme-dark .apex-master-table td,
.apex-theme-dark .apex-report-table td,
[data-theme="dark"] table td,
[data-theme="dark"] .dense-table td,
[data-theme="dark"] .apex-master-table td,
[data-theme="dark"] .apex-report-table td {
  color: #F5F5F5 !important;
  border-bottom: 1px solid #2C2C2C !important;
  border-right: 1px solid #2C2C2C !important;
  background-color: transparent !important;
}

/* Zebra row striping */
.apex-theme-dark .dense-table tbody tr:nth-child(odd),
.apex-theme-dark .apex-master-table tbody tr:nth-child(odd),
.apex-theme-dark .apex-report-table tbody tr:nth-child(odd),
[data-theme="dark"] .dense-table tbody tr:nth-child(odd),
[data-theme="dark"] .apex-master-table tbody tr:nth-child(odd),
[data-theme="dark"] .apex-report-table tbody tr:nth-child(odd) {
  background-color: #1C1C1C !important;
}

.apex-theme-dark .dense-table tbody tr:nth-child(even),
.apex-theme-dark .apex-master-table tbody tr:nth-child(even),
.apex-theme-dark .apex-report-table tbody tr:nth-child(even),
[data-theme="dark"] .dense-table tbody tr:nth-child(even),
[data-theme="dark"] .apex-master-table tbody tr:nth-child(even),
[data-theme="dark"] .apex-report-table tbody tr:nth-child(even) {
  background-color: #191919 !important;
}

.apex-theme-dark .dense-table tbody tr:hover,
.apex-theme-dark .apex-master-table tbody tr:hover,
.apex-theme-dark .apex-report-table tbody tr:hover,
[data-theme="dark"] .dense-table tbody tr:hover,
[data-theme="dark"] .apex-master-table tbody tr:hover,
[data-theme="dark"] .apex-report-table tbody tr:hover {
  background-color: #222222 !important;
}

.apex-theme-dark .dense-table tbody tr.selected,
.apex-theme-dark .apex-master-table tbody tr.selected,
.apex-theme-dark .apex-report-table tbody tr.selected,
[data-theme="dark"] .dense-table tbody tr.selected,
[data-theme="dark"] .apex-master-table tbody tr.selected,
[data-theme="dark"] .apex-report-table tbody tr.selected {
  background-color: rgba(59, 130, 246, 0.16) !important;
  border-left: 3px solid #3B82F6 !important;
}

.apex-theme-dark tfoot tr,
[data-theme="dark"] tfoot tr {
  background-color: #1C1C1C !important;
  border-top: 1px solid #2C2C2C !important;
  color: #F5F5F5 !important;
}

/* Numeric IDs & Links */
.apex-theme-dark .apex-table-id-cell,
[data-theme="dark"] .apex-table-id-cell {
  color: #F5F5F5 !important;
  font-weight: 700 !important;
}

.apex-theme-dark table td a,
.apex-theme-dark .dense-table td a,
[data-theme="dark"] table td a,
[data-theme="dark"] .dense-table td a {
  color: #3B82F6 !important;
}

.apex-theme-dark table td a:hover,
[data-theme="dark"] table td a:hover {
  color: #60A5FA !important;
  text-decoration: underline !important;
}

/* 9. Buttons: Primary (#2563EB / #1D4ED8), Secondary (#222222 / #E5E5E5 / #383838), Disabled (#202020 / #737373) */
/* Primary Buttons */
.apex-theme-dark .btn-primary,
.apex-theme-dark .btn-apex-primary,
.apex-theme-dark .btn-apex-create,
.apex-theme-dark .btn-create,
.apex-theme-dark .btn-apex-merge,
[data-theme="dark"] .btn-primary,
[data-theme="dark"] .btn-apex-primary,
[data-theme="dark"] .btn-apex-create,
[data-theme="dark"] .btn-create,
[data-theme="dark"] .btn-apex-merge {
  background: #2563EB !important;
  background-color: #2563EB !important;
  color: #FFFFFF !important;
  border: 1px solid #2563EB !important;
  font-weight: 600 !important;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3) !important;
}

.apex-theme-dark .btn-primary span,
.apex-theme-dark .btn-apex-primary span,
.apex-theme-dark .btn-apex-create span,
.apex-theme-dark .btn-create span,
.apex-theme-dark .btn-apex-merge span,
[data-theme="dark"] .btn-primary span,
[data-theme="dark"] .btn-apex-primary span,
[data-theme="dark"] .btn-apex-create span,
[data-theme="dark"] .btn-create span,
[data-theme="dark"] .btn-apex-merge span {
  color: #FFFFFF !important;
}

.apex-theme-dark .btn-primary:hover:not(:disabled),
.apex-theme-dark .btn-apex-primary:hover:not(:disabled),
.apex-theme-dark .btn-apex-create:hover:not(:disabled),
.apex-theme-dark .btn-create:hover:not(:disabled),
.apex-theme-dark .btn-apex-merge:hover:not(:disabled),
[data-theme="dark"] .btn-primary:hover:not(:disabled),
[data-theme="dark"] .btn-apex-primary:hover:not(:disabled),
[data-theme="dark"] .btn-apex-create:hover:not(:disabled),
[data-theme="dark"] .btn-create:hover:not(:disabled),
[data-theme="dark"] .btn-apex-merge:hover:not(:disabled) {
  background: #1D4ED8 !important;
  background-color: #1D4ED8 !important;
  border-color: #1D4ED8 !important;
  color: #FFFFFF !important;
}

/* Secondary Buttons (Filters, Utility, View Form, Cancel, Actions, Go) */
.apex-theme-dark .btn-secondary,
.apex-theme-dark .btn-apex-secondary,
.apex-theme-dark .btn-apex-actions,
.apex-theme-dark .btn-apex-go,
.apex-theme-dark .apex-btn-go,
.apex-theme-dark .apex-toolbar-go-btn,
.apex-theme-dark .btn-apex-view-form,
.apex-theme-dark .btn-apex-cancel,
.apex-theme-dark .btn-apex-top,
.apex-theme-dark .btn-filter-clear,
.apex-theme-dark .btn-outline,
.apex-theme-dark .btn-apex-outline,
.apex-theme-dark .btn-toggle-filters,
.apex-theme-dark .pagination-nav-btn,
.apex-theme-dark .btn-duplicate-nav,
.apex-theme-dark .apex-report-toolbar button:not(.btn-apex-create):not(.btn-primary),
[data-theme="dark"] .btn-secondary,
[data-theme="dark"] .btn-apex-secondary,
[data-theme="dark"] .btn-apex-actions,
[data-theme="dark"] .btn-apex-go,
[data-theme="dark"] .apex-btn-go,
[data-theme="dark"] .apex-toolbar-go-btn,
[data-theme="dark"] .btn-apex-view-form,
[data-theme="dark"] .btn-apex-cancel,
[data-theme="dark"] .btn-apex-top,
[data-theme="dark"] .btn-filter-clear,
[data-theme="dark"] .btn-outline,
[data-theme="dark"] .btn-apex-outline,
[data-theme="dark"] .btn-toggle-filters,
[data-theme="dark"] .pagination-nav-btn,
[data-theme="dark"] .btn-duplicate-nav,
[data-theme="dark"] .apex-report-toolbar button:not(.btn-apex-create):not(.btn-primary) {
  background: #222222 !important;
  background-color: #222222 !important;
  color: #E5E5E5 !important;
  border: 1px solid #383838 !important;
  font-weight: 600 !important;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.25) !important;
}

.apex-theme-dark .btn-secondary span,
.apex-theme-dark .btn-apex-secondary span,
.apex-theme-dark .btn-apex-actions span,
.apex-theme-dark .btn-apex-view-form span,
.apex-theme-dark .btn-duplicate-nav span,
[data-theme="dark"] .btn-secondary span,
[data-theme="dark"] .btn-apex-secondary span,
[data-theme="dark"] .btn-apex-actions span,
[data-theme="dark"] .btn-apex-view-form span,
[data-theme="dark"] .btn-duplicate-nav span {
  color: #E5E5E5 !important;
}

.apex-theme-dark .btn-secondary:hover:not(:disabled),
.apex-theme-dark .btn-apex-secondary:hover:not(:disabled),
.apex-theme-dark .btn-apex-actions:hover:not(:disabled),
.apex-theme-dark .btn-apex-go:hover:not(:disabled),
.apex-theme-dark .apex-btn-go:hover:not(:disabled),
.apex-theme-dark .apex-toolbar-go-btn:hover:not(:disabled),
.apex-theme-dark .btn-apex-view-form:hover:not(:disabled),
.apex-theme-dark .btn-apex-cancel:hover:not(:disabled),
.apex-theme-dark .btn-apex-top:hover:not(:disabled),
.apex-theme-dark .btn-filter-clear:hover:not(:disabled),
.apex-theme-dark .btn-outline:hover:not(:disabled),
.apex-theme-dark .btn-apex-outline:hover:not(:disabled),
.apex-theme-dark .btn-toggle-filters:hover:not(:disabled),
.apex-theme-dark .pagination-nav-btn:hover:not(:disabled),
.apex-theme-dark .btn-duplicate-nav:hover:not(:disabled),
[data-theme="dark"] .btn-secondary:hover:not(:disabled),
[data-theme="dark"] .btn-apex-secondary:hover:not(:disabled),
[data-theme="dark"] .btn-apex-actions:hover:not(:disabled),
[data-theme="dark"] .btn-apex-go:hover:not(:disabled),
[data-theme="dark"] .apex-btn-go:hover:not(:disabled),
[data-theme="dark"] .apex-toolbar-go-btn:hover:not(:disabled),
[data-theme="dark"] .btn-apex-view-form:hover:not(:disabled),
[data-theme="dark"] .btn-apex-cancel:hover:not(:disabled),
[data-theme="dark"] .btn-apex-top:hover:not(:disabled),
[data-theme="dark"] .btn-filter-clear:hover:not(:disabled),
[data-theme="dark"] .btn-outline:hover:not(:disabled),
[data-theme="dark"] .btn-apex-outline:hover:not(:disabled),
[data-theme="dark"] .btn-toggle-filters:hover:not(:disabled),
[data-theme="dark"] .pagination-nav-btn:hover:not(:disabled),
[data-theme="dark"] .btn-duplicate-nav:hover:not(:disabled) {
  background: #2A2A2A !important;
  background-color: #2A2A2A !important;
  border-color: #484848 !important;
  color: #FFFFFF !important;
}

/* Disabled Buttons */
.apex-theme-dark button:disabled,
.apex-theme-dark button[disabled],
.apex-theme-dark .btn-disabled,
[data-theme="dark"] button:disabled,
[data-theme="dark"] button[disabled],
[data-theme="dark"] .btn-disabled {
  background-color: #202020 !important;
  color: #737373 !important;
  border: 1px solid #2C2C2C !important;
  cursor: not-allowed !important;
}

.apex-theme-dark .apex-badge-count,
[data-theme="dark"] .apex-badge-count {
  background-color: #222222 !important;
  border: 1px solid #383838 !important;
  color: #A3A3A3 !important;
}

/* 10. Status Badges: Positive (#22C55E on #14251A) and Negative (#F87171 on #2A1717) */
.apex-theme-dark .status-positive,
.apex-theme-dark .badge-positive,
.apex-theme-dark .badge-active,
.apex-theme-dark .upload-status-alert.success,
[data-theme="dark"] .status-positive,
[data-theme="dark"] .badge-positive,
[data-theme="dark"] .badge-active,
[data-theme="dark"] .upload-status-alert.success {
  color: #22C55E !important;
  background-color: #14251A !important;
  border: 1px solid #1c3d26 !important;
  font-weight: 600 !important;
}

.apex-theme-dark .status-negative,
.apex-theme-dark .badge-negative,
.apex-theme-dark .badge-inactive,
.apex-theme-dark .duplicate-reason-badge,
.apex-theme-dark .upload-status-alert.error,
[data-theme="dark"] .status-negative,
[data-theme="dark"] .badge-negative,
[data-theme="dark"] .badge-inactive,
[data-theme="dark"] .duplicate-reason-badge,
[data-theme="dark"] .upload-status-alert.error {
  color: #F87171 !important;
  background-color: #2A1717 !important;
  border: 1px solid #4a2222 !important;
  font-weight: 700 !important;
  box-shadow: 0 0 6px rgba(248, 113, 113, 0.15) !important;
}

/* High contrast error text in tables */
.apex-theme-dark table td [class*="error"],
.apex-theme-dark table td .report-error-cell-text,
[data-theme="dark"] table td [class*="error"],
[data-theme="dark"] table td .report-error-cell-text {
  color: #F87171 !important;
  background: transparent !important;
}
`;

// Append dark specification followed by blue theme overrides
const finalCss = baseCss + darkSpecificationCss + '\n\n' + blueOverrides;

fs.writeFileSync(cssPath, finalCss, 'utf8');
console.log('Successfully updated client/src/index.css with dark and blue theme engines!');
