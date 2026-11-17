import React, { useState, useMemo, useCallback, useEffect } from 'react';
import ApexReportToolbar from './ApexReportToolbar';
import ApexColumnHeaderMenu from './ApexColumnHeaderMenu';
import ApexActiveFilterBanner from './ApexActiveFilterBanner';
import SelectColumnsModal from './SelectColumnsModal';
import ApexFilterModal from './ApexFilterModal';
import ApexChartModal from './ApexChartModal';
import ApexAggregateModal from './ApexAggregateModal';
import ApexSortModal from './ApexSortModal';
import ApexComputeModal from './ApexComputeModal';
import ApexControlBreakModal from './ApexControlBreakModal';
import ApexHighlightModal from './ApexHighlightModal';
import ApexGroupByModal from './ApexGroupByModal';
import ApexPivotModal from './ApexPivotModal';
import ApexSaveReportModal from './ApexSaveReportModal';
import ApexHelpModal from './ApexHelpModal';
import ActiveAggregationsBar from './ActiveAggregationsBar';
import { computeAggregationValue } from '../utils/aggregationUtils';
import { IconChevronDown } from './Icons';

/**
 * ApexInteractiveReport
 *
 * Universal Oracle APEX-style Interactive Report component.
 * Standardizes interactive report behavior across all regions:
 * - Column-header menu with Ascending Sort, Descending Sort, Hide Column, Control Break, Distinct Value filter
 * - Working sorting, filtering, column hiding, distinct values list, filter state banner
 * - Universal report toolbar with Search + Go, Rows selector, full Actions menu
 * - Complete suite of working Actions modals:
 *   Columns, Filter, Multi-Sort, Aggregate, Compute, Control Break, Highlight,
 *   Chart, Group By, Pivot, Saved Reports, Download CSV, Help, and Reset
 * - Scoped local layout persistence per reportId
 * - Destructive and non-destructive isolation: Reset never modifies underlying database records
 */
export default function ApexInteractiveReport({
  // Column definitions: [{ key, label, getValue, render, width, minWidth, align, sortable, defaultHidden }]
  columns = [],
  // Row data array
  data = [],
  // Unique row key function or property name (default: 'id')
  rowKey = 'id',
  // Unique report identifier for localStorage scoping
  reportId = 'ir_report',
  // Total record count (for server-side pagination, defaults to data.length)
  total = null,
  // Controlled pagination props (optional)
  page: propPage,
  onPageChange: propOnPageChange,
  rowsPerPage: propRowsPerPage,
  onRowsPerPageChange: propOnRowsPerPageChange,
  rowsOptions = [10, 25, 50, 100, 500, 1000, 'all'],
  // Controlled search props (optional)
  search: propSearch,
  onSearchChange: propOnSearchChange,
  onSearchSubmit: propOnSearchSubmit,
  searchPlaceholder = 'Search',
  // Controlled sort props (optional)
  sortKey: propSortKey,
  sortDir: propSortDir,
  onSortChange: propOnSortChange,
  // Controlled filter props (optional)
  headerFilter: propHeaderFilter,
  onHeaderFilterChange: propOnHeaderFilterChange,
  // Controlled visible columns (optional)
  visibleKeys: propVisibleKeys,
  onVisibleKeysChange: propOnVisibleKeysChange,
  // Mode: server-side pagination/filtering or client-side
  isServerSide = false,
  // Loading & empty state
  isLoading = false,
  loadingMessage = 'Loading records...',
  emptyMessage = 'No records found.',
  // Toolbar configuration
  showToolbar = true,
  toolbarButtons = null, // Custom action buttons (e.g. Create, Delete, Upload)
  // Row selection props
  selectable = false,
  selectedKeys = [],
  onSelectionChange = null,
  // Additional row actions or selection column
  renderLeadingCell = null,
  renderTrailingCell = null,
  leadingHeader = null,
  trailingHeader = null,
  onRowClick = null,
  rowClassName = null,
  // Action menu callbacks
  onRefresh = null,
  onReset = null,
  onDownload = null, // Custom download handler or fallback to built-in CSV generator
  // Advanced features flags
  enableChart = true,
  enableAggregation = true,
  onShowToast = null,
  // Styling
  className = '',
  tableClassName = 'apex-master-table dense-table',
  wrapperStyle = {},
  reportTitle = null,
  badge = null,
  // Editable grid props (if wrapped)
  isEditableGrid = false,
  onSelectAll = null,
  onDeselectAll = null,
  onInvertSelection = null,
  onCopyToClipboard = null,
  onRevertEdits = null,
  onDeleteSelected = null,
  hasSelection = false,
}) {
  // =========================================================================
  // INTERNAL STATE
  // =========================================================================
  const [internalPage, setInternalPage] = useState(1);
  const [internalRows, setInternalRows] = useState(50);
  const [internalSearch, setInternalSearch] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [internalSortKey, setInternalSortKey] = useState(null);
  const [internalSortDir, setInternalSortDir] = useState('asc');
  const [internalFilter, setInternalFilter] = useState({ key: null, value: null });
  const [internalVisibleKeys, setInternalVisibleKeys] = useState(() => {
    try {
      const storageKey = `apex_ir_columns_${reportId}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const colSet = new Set(columns.map((c) => c.key || c.id));
          const valid = parsed.filter((k) => colSet.has(k));
          if (valid.length > 0) return valid;
        }
      }
    } catch (e) {}
    return columns.filter((c) => !c.defaultHidden).map((c) => c.key || c.id);
  });

  // Column Header Popover Menu State
  const [headerMenu, setHeaderMenu] = useState({
    isOpen: false,
    column: null,
    anchorRect: null,
  });

  // Toolbar Actions Menu State & Modals
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showColumnsModal, setShowColumnsModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);
  const [showAggregateModal, setShowAggregateModal] = useState(false);
  const [showComputeModal, setShowComputeModal] = useState(false);
  const [showControlBreakModal, setShowControlBreakModal] = useState(false);
  const [showHighlightModal, setShowHighlightModal] = useState(false);
  const [showChartModal, setShowChartModal] = useState(false);
  const [showGroupByModal, setShowGroupByModal] = useState(false);
  const [showPivotModal, setShowPivotModal] = useState(false);
  const [showSaveReportModal, setShowSaveReportModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Advanced Interactive Report Features State
  const [multiSortRules, setMultiSortRules] = useState([]);
  const [aggregations, setAggregations] = useState([]);
  const [computations, setComputations] = useState([]);
  const [breakColumn, setBreakColumn] = useState(null);
  const [highlights, setHighlights] = useState([]);
  const [appliedGroupBy, setAppliedGroupBy] = useState(null);
  const [appliedPivot, setAppliedPivot] = useState(null);
  const [savedReports, setSavedReports] = useState([]);
  const [activeReportId, setActiveReportId] = useState('primary');

  // =========================================================================
  // THEME DETECTION — read data-theme from document root for inline styles
  // =========================================================================
  const [currentTheme, setCurrentTheme] = useState(() => {
    return document.documentElement.getAttribute('data-theme') || 'light';
  });
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setCurrentTheme(document.documentElement.getAttribute('data-theme') || 'light');
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  // Helper: returns a style object adjusted for dark/blue themes
  const isDark = currentTheme === 'dark' || currentTheme === 'blue';
  // Colors for tables/rows that must adapt to theme
  const themeColors = {
    tdText: isDark ? (currentTheme === 'blue' ? '#F1F5F9' : '#F5F5F5') : '#1e293b',
    thText: isDark ? (currentTheme === 'blue' ? '#94A3B8' : '#A3A3A3') : '#1e293b',
    rowAlt: isDark ? (currentTheme === 'blue' ? '#111C2E' : '#191919') : '#fafafa',
    rowBase: isDark ? (currentTheme === 'blue' ? '#0D1728' : '#1C1C1C') : '#ffffff',
    totalRowBg: isDark ? (currentTheme === 'blue' ? '#15223d' : '#252525') : '#f1f5f9',
    totalRowBorder: isDark ? (currentTheme === 'blue' ? '#26364F' : '#383838') : '#cbd5e1',
    totalText: isDark ? (currentTheme === 'blue' ? '#F1F5F9' : '#F5F5F5') : '#0f172a',
    accentViolet: isDark ? '#c084fc' : '#7048e8',
    accentVioletBg: isDark ? (currentTheme === 'blue' ? 'rgba(139,92,246,0.25)' : 'rgba(139,92,246,0.2)') : '#faf5ff',
    accentPurpleTotal: isDark ? (currentTheme === 'blue' ? 'rgba(139,92,246,0.3)' : 'rgba(139,92,246,0.25)') : '#f3e8ff',
    borderColor: isDark ? (currentTheme === 'blue' ? '#26364F' : '#2C2C2C') : '#e2e8f0',
    controlBreakBg: isDark ? (currentTheme === 'blue' ? '#15223d' : '#252525') : '#f1f5f9',
    controlBreakText: isDark ? (currentTheme === 'blue' ? '#F1F5F9' : '#F5F5F5') : '#0f172a',
    accentBlue: isDark ? (currentTheme === 'blue' ? '#38bdf8' : '#60a5fa') : '#0284c7',
    selectedRowBg: isDark ? (currentTheme === 'blue' ? 'rgba(6,182,212,0.2)' : 'rgba(59,130,246,0.2)') : '#dbeafe',
    bannerBtnBg: isDark ? (currentTheme === 'blue' ? '#17243c' : '#2A2A2A') : '#ffffff',
    bannerBtnBorder: isDark ? '#c084fc' : '#c084fc',
    bannerBtnColor: isDark ? '#c084fc' : '#7048e8',
    badgeViewBg: isDark ? (currentTheme === 'blue' ? 'rgba(14,165,233,0.2)' : 'rgba(14,165,233,0.15)') : '#e0f2fe',
    badgeViewColor: isDark ? '#7dd3fc' : '#0369a1',
    badgeReportBg: isDark ? (currentTheme === 'blue' ? 'rgba(100,116,139,0.25)' : '#2A2A2A') : '#e2e8f0',
    badgeReportColor: isDark ? (currentTheme === 'blue' ? '#CBD5E1' : '#A3A3A3') : '#475569',
    aggLabelColor: isDark ? (currentTheme === 'blue' ? '#94A3B8' : '#A3A3A3') : '#64748b',
  };

  // Load Saved Reports from localStorage scoped by reportId
  useEffect(() => {
    try {
      const storageKey = `apex_ir_saved_layouts_${reportId}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setSavedReports(parsed);
        }
      }
    } catch (e) {
      console.warn('Failed to load saved report views:', e);
    }
  }, [reportId]);

  // Synchronize visible columns when reportId or columns change
  useEffect(() => {
    if (!columns || columns.length === 0) return;
    const defaultKeys = columns.filter((c) => !c.defaultHidden).map((c) => c.key || c.id);
    try {
      const storageKey = `apex_ir_columns_${reportId}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const colSet = new Set(columns.map((c) => c.key || c.id));
          const valid = parsed.filter((k) => colSet.has(k));
          if (valid.length > 0) {
            setInternalVisibleKeys(valid);
            return;
          }
        }
      }
    } catch (e) {
      console.warn('Failed to load saved column visibility:', e);
    }
    setInternalVisibleKeys(defaultKeys);
  }, [reportId, columns]);

  // Controlled vs Uncontrolled Resolution
  const page = propPage !== undefined ? propPage : internalPage;
  const setPage = propOnPageChange || setInternalPage;

  const rows = propRowsPerPage !== undefined ? propRowsPerPage : internalRows;
  const setRows = (newRows) => {
    if (propOnRowsPerPageChange) propOnRowsPerPageChange(newRows);
    else setInternalRows(newRows);
    setPage(1);
  };

  const search = propSearch !== undefined ? propSearch : internalSearch;
  const setSearch = (val) => {
    if (propOnSearchChange) propOnSearchChange(val);
    else setInternalSearch(val);
  };

  const sortKey = propSortKey !== undefined ? propSortKey : internalSortKey;
  const sortDir = propSortDir !== undefined ? propSortDir : internalSortDir;
  const setSort = (key, dir) => {
    if (propOnSortChange) {
      propOnSortChange(key, dir);
    } else {
      setInternalSortKey(key);
      setInternalSortDir(dir);
    }
  };

  const headerFilter = propHeaderFilter !== undefined ? propHeaderFilter : internalFilter;
  const setHeaderFilter = (filter) => {
    if (propOnHeaderFilterChange) {
      propOnHeaderFilterChange(filter);
    } else {
      setInternalFilter(filter);
      setPage(1);
    }
  };

  const visibleKeys = propVisibleKeys !== undefined ? propVisibleKeys : internalVisibleKeys;
  const setVisibleKeys = (keys) => {
    if (propOnVisibleKeysChange) {
      propOnVisibleKeysChange(keys);
    } else {
      setInternalVisibleKeys(keys);
      try {
        const storageKey = `apex_ir_columns_${reportId}`;
        localStorage.setItem(storageKey, JSON.stringify(keys));
      } catch (e) {
        console.warn('Failed to save column visibility:', e);
      }
    }
  };

  // Build computed column definitions
  const computedColumns = useMemo(() => {
    if (!computations || computations.length === 0) return [];
    return computations.map((comp) => ({
      key: `_comp_${comp.id}`,
      id: `_comp_${comp.id}`,
      label: comp.columnLabel,
      isComputed: true,
      getValue: (row) => {
        const rawA = row[comp.colA];
        const a = parseFloat(String(rawA).replace(/[^0-9.-]/g, '')) || 0;
        let b = 0;
        if (comp.useConstant) {
          b = parseFloat(comp.constantVal) || 0;
        } else {
          const rawB = row[comp.colB];
          b = parseFloat(String(rawB).replace(/[^0-9.-]/g, '')) || 0;
        }

        let res = 0;
        if (comp.operator === '+') res = a + b;
        else if (comp.operator === '-') res = a - b;
        else if (comp.operator === '*') res = a * b;
        else if (comp.operator === '/') res = b !== 0 ? a / b : 0;
        else if (comp.operator === 'concat') {
          const strB = comp.useConstant ? comp.constantVal : (row[comp.colB] || '');
          return `${row[comp.colA] || ''} ${strB}`.trim();
        }

        if (comp.formatMask === 'currency') {
          return `$${res.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }
        if (comp.formatMask === 'percent') {
          return `${Math.round(res * 100)}%`;
        }
        if (comp.formatMask === 'integer') {
          return Math.round(res).toLocaleString();
        }
        return Math.round(res * 100) / 100;
      },
    }));
  }, [computations]);

  // Combined column pool (base + computed)
  const allAvailableColumns = useMemo(() => {
    return [...columns, ...computedColumns];
  }, [columns, computedColumns]);

  // Visible Columns Filtered & Ordered
  const visibleColumns = useMemo(() => {
    if (!visibleKeys || visibleKeys.length === 0) return allAvailableColumns;
    const colMap = new Map(allAvailableColumns.map((c) => [c.key || c.id, c]));
    const ordered = [];
    visibleKeys.forEach((k) => {
      const col = colMap.get(k);
      if (col) ordered.push(col);
    });
    // Include any computed columns not already included
    computedColumns.forEach((c) => {
      const cKey = c.key || c.id;
      if (!ordered.some((col) => (col.key || col.id) === cKey)) {
        ordered.push(c);
      }
    });
    return ordered.length > 0 ? ordered : allAvailableColumns;
  }, [allAvailableColumns, visibleKeys, computedColumns]);

  // =========================================================================
  // CLIENT-SIDE DATA PROCESSING
  // =========================================================================
  const processedData = useMemo(() => {
    let result = Array.isArray(data) ? [...data] : [];

    // 1. Text Search Filter across visible columns (client-side mode only)
    if (!isServerSide) {
      const q = (activeSearch || search).trim().toLowerCase();
      if (q) {
        result = result.filter((row) => {
          return visibleColumns.some((col) => {
            let val;
            if (typeof col.getValue === 'function') val = col.getValue(row);
            else val = row[col.key || col.id];
            return val !== undefined && val !== null && String(val).toLowerCase().includes(q);
          });
        });
      }
    }

    // 2. Active Column Header Filter (key = "value")
    if (headerFilter && headerFilter.key && headerFilter.value !== null && headerFilter.value !== undefined) {
      const targetCol = allAvailableColumns.find((c) => (c.key || c.id) === headerFilter.key);
      const filterVal = String(headerFilter.value).toLowerCase();
      result = result.filter((row) => {
        let val;
        if (targetCol && typeof targetCol.getValue === 'function') {
          val = targetCol.getValue(row);
        } else {
          val = row[headerFilter.key];
        }
        return val !== undefined && val !== null && String(val).toLowerCase().includes(filterVal);
      });
    }

    // 3. Multi-Column Sorting OR Single Column Sort
    const activeRules = multiSortRules.filter((r) => r.key);
    if (activeRules.length > 0) {
      result.sort((a, b) => {
        for (const rule of activeRules) {
          const col = allAvailableColumns.find((c) => (c.key || c.id) === rule.key);
          let valA = col && typeof col.getValue === 'function' ? col.getValue(a) : a[rule.key];
          let valB = col && typeof col.getValue === 'function' ? col.getValue(b) : b[rule.key];

          const isNullA = valA === undefined || valA === null || valA === '';
          const isNullB = valB === undefined || valB === null || valB === '';
          if (isNullA && !isNullB) return rule.nulls === 'first' ? -1 : 1;
          if (!isNullA && isNullB) return rule.nulls === 'first' ? 1 : -1;
          if (isNullA && isNullB) continue;

          const numA = Number(valA);
          const numB = Number(valB);
          let diff = 0;
          if (!isNaN(numA) && !isNaN(numB) && typeof valA !== 'boolean') {
            diff = numA - numB;
          } else {
            diff = String(valA).localeCompare(String(valB), undefined, { numeric: true, sensitivity: 'base' });
          }
          if (diff !== 0) {
            return rule.dir === 'desc' ? -diff : diff;
          }
        }
        return 0;
      });
    } else if (sortKey) {
      const sortCol = allAvailableColumns.find((c) => (c.key || c.id) === sortKey);
      result.sort((a, b) => {
        let valA = sortCol && typeof sortCol.getValue === 'function' ? sortCol.getValue(a) : a[sortKey];
        let valB = sortCol && typeof sortCol.getValue === 'function' ? sortCol.getValue(b) : b[sortKey];

        const numA = Number(valA);
        const numB = Number(valB);
        if (!isNaN(numA) && !isNaN(numB) && typeof valA !== 'boolean' && valA !== '' && valB !== '' && valA !== null && valB !== null) {
          return sortDir === 'asc' ? numA - numB : numB - numA;
        }

        const strA = String(valA || '');
        const strB = String(valB || '');
        return sortDir === 'asc'
          ? strA.localeCompare(strB, undefined, { numeric: true, sensitivity: 'base' })
          : strB.localeCompare(strA, undefined, { numeric: true, sensitivity: 'base' });
      });
    }

    // 4. Control Break ordering (if breakColumn active, prioritize break column group)
    if (breakColumn) {
      result.sort((a, b) => {
        const valA = String(a[breakColumn] || '');
        const valB = String(b[breakColumn] || '');
        return valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' });
      });
    }

    return result;
  }, [data, isServerSide, search, activeSearch, visibleColumns, headerFilter, allAvailableColumns, multiSortRules, sortKey, sortDir, breakColumn]);

  // Compute total count
  const effectiveTotal = total !== null && total !== undefined
    ? total
    : (isServerSide ? data.length : processedData.length);

  // Paginated Slice for display (client-side mode)
  const displayRows = useMemo(() => {
    if (isServerSide) return processedData;
    if (rows === 'all') return processedData;
    const numRows = Number(rows) || 50;
    const start = (page - 1) * numRows;
    return processedData.slice(start, start + numRows);
  }, [processedData, isServerSide, page, rows]);

  // All report keys across the entire report (not just current page)
  const allReportKeys = useMemo(() => {
    const rowsToMap = isServerSide ? data : processedData;
    return rowsToMap.map((r, idx) =>
      String(typeof rowKey === 'function' ? rowKey(r, idx) : (r[rowKey] !== undefined ? r[rowKey] : idx))
    );
  }, [isServerSide, data, processedData, rowKey]);

  // Calculate Pivot Matrix when appliedPivot is active
  const pivotMatrixData = useMemo(() => {
    if (!appliedPivot) return null;
    const { rowColumn, pivotColumn, func, measureColumn } = appliedPivot;
    if (!rowColumn || !pivotColumn) return null;

    const colHeaderSet = new Set();
    const matrix = {};
    const colTotals = {};

    processedData.forEach((r) => {
      const rVal = r[rowColumn] !== undefined && r[rowColumn] !== null && r[rowColumn] !== '' ? String(r[rowColumn]) : '(Blank)';
      const cVal = r[pivotColumn] !== undefined && r[pivotColumn] !== null && r[pivotColumn] !== '' ? String(r[pivotColumn]) : '(Blank)';
      colHeaderSet.add(cVal);

      if (!matrix[rVal]) matrix[rVal] = {};
      if (!matrix[rVal][cVal]) matrix[rVal][cVal] = { count: 0, sum: 0 };

      matrix[rVal][cVal].count += 1;
      if (measureColumn && r[measureColumn] !== undefined) {
        const num = parseFloat(String(r[measureColumn]).replace(/[^0-9.-]/g, ''));
        if (!isNaN(num)) matrix[rVal][cVal].sum += num;
      }
    });

    const colHeaders = Array.from(colHeaderSet).sort();
    colHeaders.forEach((cH) => { colTotals[cH] = 0; });
    let grandTotal = 0;

    const rows = Object.entries(matrix).map(([rVal, cellMap]) => {
      let rowTotal = 0;
      const cells = {};
      colHeaders.forEach((cH) => {
        const item = cellMap[cH];
        let val = 0;
        if (item) {
          val = func === 'Sum' ? Math.round(item.sum * 100) / 100 : item.count;
        }
        cells[cH] = val;
        rowTotal += val;
        colTotals[cH] += val;
      });
      grandTotal += rowTotal;
      return { rVal, cells, rowTotal };
    }).sort((a, b) => b.rowTotal - a.rowTotal);

    return { rows, colHeaders, colTotals, grandTotal, rowColumn, pivotColumn, func };
  }, [appliedPivot, processedData]);

  // Calculate Group By Matrix when appliedGroupBy is active
  const groupByMatrixData = useMemo(() => {
    if (!appliedGroupBy) return null;
    const { groupColumn, groupByCols, func, measureColumn, label, formatMask, sum } = appliedGroupBy;
    const activeCols = groupByCols && groupByCols.length > 0 ? groupByCols.filter(Boolean) : (groupColumn ? [groupColumn] : []);
    if (activeCols.length === 0) return null;

    const groups = {};
    let totalCount = 0;
    let totalMeasure = 0;
    let minMeasure = Infinity;
    let maxMeasure = -Infinity;

    processedData.forEach((row) => {
      const groupKey = activeCols.map((c) => {
        const val = row[c];
        return val !== undefined && val !== null && val !== '' ? String(val) : '(Blank)';
      }).join(' / ');

      if (!groups[groupKey]) {
        groups[groupKey] = {
          key: groupKey,
          colValues: activeCols.reduce((acc, c) => {
            const val = row[c];
            acc[c] = val !== undefined && val !== null && val !== '' ? String(val) : '(Blank)';
            return acc;
          }, {}),
          count: 0,
          measureValues: [],
          measureSum: 0,
        };
      }

      groups[groupKey].count += 1;
      totalCount += 1;

      if (measureColumn && row[measureColumn] !== undefined && row[measureColumn] !== null) {
        const raw = String(row[measureColumn]).replace(/[^0-9.-]/g, '');
        const num = parseFloat(raw);
        if (!isNaN(num)) {
          groups[groupKey].measureValues.push(num);
          groups[groupKey].measureSum += num;
          totalMeasure += num;
          if (num < minMeasure) minMeasure = num;
          if (num > maxMeasure) maxMeasure = num;
        }
      }
    });

    const formatVal = (v) => {
      if (v === undefined || v === null || isNaN(v)) return '-';
      if (formatMask === 'Currency') return `$${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      if (formatMask === 'Percent') return `${Number(v).toFixed(1)}%`;
      if (formatMask === 'Integer') return Math.round(v).toLocaleString();
      return typeof v === 'number' ? (Number.isInteger(v) ? v.toLocaleString() : v.toFixed(2)) : v;
    };

    const rows = Object.values(groups).map((g) => {
      let computed = 0;
      if (func === 'Count') {
        computed = g.count;
      } else if (func === 'Sum') {
        computed = g.measureSum;
      } else if (func === 'Average') {
        computed = g.measureValues.length > 0 ? g.measureSum / g.measureValues.length : 0;
      } else if (func === 'Minimum') {
        computed = g.measureValues.length > 0 ? Math.min(...g.measureValues) : 0;
      } else if (func === 'Maximum') {
        computed = g.measureValues.length > 0 ? Math.max(...g.measureValues) : 0;
      }
      return {
        ...g,
        computedRaw: computed,
        computedDisplay: formatVal(computed),
      };
    }).sort((a, b) => b.computedRaw - a.computedRaw);

    let grandTotalComputed = 0;
    if (func === 'Count') grandTotalComputed = totalCount;
    else if (func === 'Sum') grandTotalComputed = totalMeasure;
    else if (func === 'Average') grandTotalComputed = totalCount > 0 ? totalMeasure / totalCount : 0;
    else if (func === 'Minimum') grandTotalComputed = minMeasure !== Infinity ? minMeasure : 0;
    else if (func === 'Maximum') grandTotalComputed = maxMeasure !== -Infinity ? maxMeasure : 0;

    return {
      activeCols,
      rows,
      totalCount,
      grandTotalComputed: formatVal(grandTotalComputed),
      func,
      measureColumn,
      label: label || `${func} of ${measureColumn}`,
      sum: sum !== false,
    };
  }, [appliedGroupBy, processedData]);

  // =========================================================================
  // HANDLERS
  // =========================================================================
  const handleSearchSubmit = () => {
    if (propOnSearchSubmit) {
      propOnSearchSubmit(search);
    } else {
      setActiveSearch(search.trim());
      setPage(1);
    }
  };

  const handleHeaderClick = (e, col) => {
    if (e && e.preventDefault) e.preventDefault();
    if (e && e.stopPropagation) e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setHeaderMenu({
      isOpen: true,
      column: col,
      anchorRect: rect,
    });
  };

  const handleMenuSort = (columnKey, direction) => {
    setSort(columnKey, direction ? direction.toLowerCase() : 'asc');
    setHeaderMenu({ isOpen: false, column: null, anchorRect: null });
    if (onShowToast) onShowToast('info', `Sorted by ${columnKey} (${direction.toUpperCase()})`);
  };

  const handleMenuHideColumn = (columnKey) => {
    const nextKeys = visibleKeys.filter((k) => k !== columnKey);
    setVisibleKeys(nextKeys);
    setHeaderMenu({ isOpen: false, column: null, anchorRect: null });
    if (onShowToast) onShowToast('info', `Hidden column: ${columnKey}`);
  };

  const handleMenuFilterValue = (columnKey, val) => {
    setHeaderFilter({ key: columnKey, value: val });
    setHeaderMenu({ isOpen: false, column: null, anchorRect: null });
    if (onShowToast) onShowToast('info', `Filtered: ${columnKey} = "${val}"`);
  };

  const handleClearFilter = () => {
    setHeaderFilter({ key: null, value: null });
    if (onShowToast) onShowToast('info', 'Filter cleared.');
  };

  // Saved Reports Management
  const handleSaveReportLayout = (layoutMeta) => {
    const newLayout = {
      ...layoutMeta,
      config: {
        visibleKeys,
        multiSortRules,
        headerFilter,
        breakColumn,
        highlights,
        computations,
        rows,
      },
    };
    const nextList = [...savedReports.filter((r) => r.id !== newLayout.id), newLayout];
    setSavedReports(nextList);
    setActiveReportId(newLayout.id);
    try {
      localStorage.setItem(`apex_ir_saved_layouts_${reportId}`, JSON.stringify(nextList));
    } catch (e) {
      console.warn('Failed to save layout:', e);
    }
    if (onShowToast) onShowToast('success', `Saved view "${layoutMeta.name}"`);
  };

  const handleSwitchReportLayout = (layoutId) => {
    if (layoutId === 'primary') {
      handleResetReport();
      setActiveReportId('primary');
      return;
    }
    const target = savedReports.find((r) => r.id === layoutId);
    if (target && target.config) {
      if (target.config.visibleKeys) setVisibleKeys(target.config.visibleKeys);
      if (target.config.multiSortRules) setMultiSortRules(target.config.multiSortRules);
      if (target.config.headerFilter) setHeaderFilter(target.config.headerFilter);
      if (target.config.breakColumn !== undefined) setBreakColumn(target.config.breakColumn);
      if (target.config.highlights) setHighlights(target.config.highlights);
      if (target.config.computations) setComputations(target.config.computations);
      if (target.config.rows) setRows(target.config.rows);
      setActiveReportId(layoutId);
      if (onShowToast) onShowToast('info', `Switched to "${target.name}"`);
    }
  };

  const handleDeleteSavedReport = (layoutId) => {
    const nextList = savedReports.filter((r) => r.id !== layoutId);
    setSavedReports(nextList);
    if (activeReportId === layoutId) {
      setActiveReportId('primary');
    }
    try {
      localStorage.setItem(`apex_ir_saved_layouts_${reportId}`, JSON.stringify(nextList));
    } catch (e) {
      console.warn('Failed to delete saved layout:', e);
    }
    if (onShowToast) onShowToast('info', 'Saved layout removed.');
  };

  // Reset Report: restores default view without modifying database records
  const handleResetReport = () => {
    setSearch('');
    setActiveSearch('');
    setSort(null, 'asc');
    setMultiSortRules([]);
    setHeaderFilter({ key: null, value: null });
    const defaultKeys = columns.filter((c) => !c.defaultHidden).map((c) => c.key || c.id);
    setVisibleKeys(defaultKeys);
    try {
      localStorage.removeItem(`apex_ir_columns_${reportId}`);
    } catch (e) {}
    setPage(1);
    setRows(50);
    setAggregations([]);
    setComputations([]);
    setBreakColumn(null);
    setHighlights([]);
    setAppliedGroupBy(null);
    setAppliedPivot(null);
    setActiveReportId('primary');
    setShowActionsMenu(false);
    if (onReset) onReset();
    if (onShowToast) onShowToast('success', 'Report reset to default view.');
  };

  // Built-in CSV Download using full filtered dataset
  const handleDownloadCsv = () => {
    if (onDownload) {
      onDownload();
      setShowActionsMenu(false);
      return;
    }

    let exportRows = isServerSide ? data : processedData;
    if (selectable && selectedKeys.length > 0) {
      exportRows = exportRows.filter((r, idx) => {
        const k = String(typeof rowKey === 'function' ? rowKey(r, idx) : (r[rowKey] !== undefined ? r[rowKey] : idx));
        return selectedKeys.map(String).includes(k);
      });
    }

    if (!exportRows || exportRows.length === 0) {
      if (onShowToast) onShowToast('warning', 'No records to download.');
      setShowActionsMenu(false);
      return;
    }

    const headers = visibleColumns.map((c) => c.label || c.key || c.id);
    const csvLines = [headers.map((h) => `"${String(h).replace(/"/g, '""')}"`).join(',')];

    exportRows.forEach((row) => {
      const line = visibleColumns.map((col) => {
        let val;
        if (typeof col.getValue === 'function') val = col.getValue(row);
        else val = row[col.key || col.id];
        return `"${String(val !== undefined && val !== null ? val : '').replace(/"/g, '""')}"`;
      });
      csvLines.push(line.join(','));
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvLines.join('\n'));
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    const filename = `${(reportTitle || reportId || 'report').toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setShowActionsMenu(false);
    if (onShowToast) onShowToast('success', `Exported ${exportRows.length} records to CSV.`);
  };

  // Evaluate row highlighting
  const getRowHighlightStyle = (row) => {
    if (!highlights || highlights.length === 0) return null;
    for (const h of highlights) {
      const colVal = String(row[h.columnKey] || '').toLowerCase();
      const targetVal = String(h.value || '').toLowerCase();
      let matched = false;
      if (h.operator === 'equals') matched = colVal === targetVal;
      else if (h.operator === 'not_equals') matched = colVal !== targetVal;
      else if (h.operator === 'contains') matched = colVal.includes(targetVal);
      else if (h.operator === 'greater_than') matched = (parseFloat(colVal) || 0) > (parseFloat(targetVal) || 0);
      else if (h.operator === 'less_than') matched = (parseFloat(colVal) || 0) < (parseFloat(targetVal) || 0);

      if (matched) {
        return { backgroundColor: h.bg, color: h.text };
      }
    }
    return null;
  };

  const totalColSpan = visibleColumns.length + (renderLeadingCell ? 1 : 0) + (selectable ? 1 : 0) + (renderTrailingCell ? 1 : 0);

  return (
    <div className={`apex-interactive-report-region ${className}`} style={{ ...wrapperStyle }}>
      {/* Region Title / Header */}
      {(reportTitle || badge || activeReportId !== 'primary') && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {reportTitle && (
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: themeColors.tdText }}>
                {reportTitle}
              </h3>
            )}
            {activeReportId !== 'primary' && (
              <span style={{ fontSize: '0.725rem', padding: '2px 8px', borderRadius: '4px', backgroundColor: themeColors.badgeViewBg, color: themeColors.badgeViewColor, fontWeight: 600 }}>
                View: {savedReports.find((r) => r.id === activeReportId)?.name || 'Custom'}
              </span>
            )}
          </div>
          {badge && (
            <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', backgroundColor: themeColors.badgeReportBg, color: themeColors.badgeReportColor, fontWeight: 600 }}>
              {badge}
            </span>
          )}
        </div>
      )}

      {/* Standard APEX Report Toolbar */}
      {showToolbar && (
        <ApexReportToolbar
          columns={allAvailableColumns}
          data={isServerSide ? data : processedData}
          reportId={reportId || reportTitle || 'report'}
          search={search}
          onSearchChange={setSearch}
          onSearchSubmit={handleSearchSubmit}
          searchPlaceholder={searchPlaceholder}
          rows={rows}
          onRowsChange={setRows}
          rowsOptions={rowsOptions}
          showActions={showActionsMenu}
          onToggleActions={() => setShowActionsMenu(!showActionsMenu)}
          onCloseActions={() => setShowActionsMenu(false)}
          onOpenColumns={() => {
            setShowActionsMenu(false);
            setShowColumnsModal(true);
          }}
          onOpenFilter={() => {
            setShowActionsMenu(false);
            setShowFilterModal(true);
          }}
          onOpenSort={() => {
            setShowActionsMenu(false);
            setShowSortModal(true);
          }}
          onOpenAggregate={() => {
            setShowActionsMenu(false);
            setShowAggregateModal(true);
          }}
          onOpenCompute={() => {
            setShowActionsMenu(false);
            setShowComputeModal(true);
          }}
          onRefresh={() => {
            setShowActionsMenu(false);
            if (onRefresh) onRefresh();
            else if (onShowToast) onShowToast('info', 'Report refreshed.');
          }}
          onOpenControlBreak={() => {
            setShowActionsMenu(false);
            setShowControlBreakModal(true);
          }}
          onOpenHighlight={() => {
            setShowActionsMenu(false);
            setShowHighlightModal(true);
          }}
          onOpenChart={() => {
            setShowActionsMenu(false);
            setShowChartModal(true);
          }}
          onOpenGroupBy={() => {
            setShowActionsMenu(false);
            setShowGroupByModal(true);
          }}
          onApplyGroupBy={(newGroup) => {
            setAppliedGroupBy(newGroup);
            if (newGroup && onShowToast) {
              onShowToast('success', `Applied Group By: ${newGroup.groupColumn} (${newGroup.func})`);
            } else if (!newGroup && onShowToast) {
              onShowToast('info', 'Group By view removed.');
            }
          }}
          onOpenPivot={() => {
            setShowActionsMenu(false);
            setShowPivotModal(true);
          }}
          onSaveReport={() => {
            setShowActionsMenu(false);
            setShowSaveReportModal(true);
          }}
          onManageReports={() => {
            setShowActionsMenu(false);
            setShowSaveReportModal(true);
          }}
          onResetReport={handleResetReport}
          onDownload={handleDownloadCsv}
          onOpenHelp={() => {
            setShowActionsMenu(false);
            setShowHelpModal(true);
          }}
          page={page}
          total={effectiveTotal}
          onPageChange={setPage}
          isEditableGrid={isEditableGrid || selectable}
          onSelectAll={
            onSelectAll || (() => {
              if (onSelectionChange) {
                onSelectionChange(allReportKeys);
                if (onShowToast) onShowToast('info', `Selected all ${allReportKeys.length} records across report.`);
              }
            })
          }
          onDeselectAll={
            onDeselectAll || (() => {
              if (onSelectionChange) {
                onSelectionChange([]);
                if (onShowToast) onShowToast('info', 'Deselected all records.');
              }
            })
          }
          onInvertSelection={
            onInvertSelection || (() => {
              if (onSelectionChange) {
                const curSet = new Set(selectedKeys.map(String));
                const inverted = allReportKeys.filter((k) => !curSet.has(k));
                onSelectionChange(inverted);
                if (onShowToast) onShowToast('info', `Inverted selection (${inverted.length} selected).`);
              }
            })
          }
          onCopyToClipboard={onCopyToClipboard}
          onRevertEdits={onRevertEdits}
          onDeleteSelected={onDeleteSelected}
          hasSelection={hasSelection || selectedKeys.length > 0}
        >
          {toolbarButtons}
        </ApexReportToolbar>
      )}

      {/* Active Column Header Filter Banner */}
      {headerFilter && headerFilter.key && headerFilter.value && (
        <ApexActiveFilterBanner
          filter={headerFilter}
          columns={allAvailableColumns}
          onClear={handleClearFilter}
        />
      )}

      {/* Active Aggregations Banner */}
      {enableAggregation && aggregations.length > 0 && (
        <ActiveAggregationsBar
          aggregations={aggregations}
          data={processedData}
          onRemoveAggregation={(id) => setAggregations((prev) => prev.filter((a) => a.id !== id))}
        />
      )}

      {/* Active Group By View Banner & Group By Table */}
      {appliedGroupBy && groupByMatrixData && (
        <div style={{ marginBottom: '1.25rem' }}>
          <div
            className="apex-active-groupby-banner"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 14px',
              backgroundColor: isDark ? themeColors.bannerBtnBg : '#f5f3ff',
              border: `1px solid ${isDark ? '#7048e8' : '#ddd6fe'}`,
              borderRadius: '6px',
              marginBottom: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, fontSize: '0.8rem', color: themeColors.accentViolet }}>
                Active Group By View:
              </span>
              <span style={{ fontSize: '0.8rem', color: themeColors.tdText }}>
                Grouped by <strong>{groupByMatrixData.activeCols.join(' / ')}</strong> — Function: <strong>{groupByMatrixData.func}</strong> ({groupByMatrixData.measureColumn})
              </span>
              <span style={{ fontSize: '0.75rem', color: themeColors.aggLabelColor }}>
                ({groupByMatrixData.rows.length} groups, {groupByMatrixData.totalCount} records)
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setShowGroupByModal(true)}
                style={{
                  background: themeColors.bannerBtnBg,
                  border: `1px solid ${themeColors.bannerBtnBorder}`,
                  color: themeColors.bannerBtnColor,
                  borderRadius: '4px',
                  padding: '4px 10px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Edit Group By
              </button>
              <button
                type="button"
                onClick={() => setAppliedGroupBy(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: themeColors.accentViolet,
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  padding: '4px 8px',
                }}
              >
                ✕ Remove Group By
              </button>
            </div>
          </div>

          <div
            className="dense-table-wrapper"
            style={{
              overflowX: 'auto',
              borderRadius: '6px',
            }}
          >
            <table className={tableClassName} style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
              <thead>
                <tr className="apex-report-header-row">
                  {groupByMatrixData.activeCols.map((colKey) => (
                    <th key={colKey} style={{ padding: '8px 14px', fontWeight: 700, borderRight: `1px solid ${themeColors.borderColor}`, color: themeColors.thText }}>
                      {allAvailableColumns.find((c) => (c.key || c.id) === colKey)?.label || colKey}
                    </th>
                  ))}
                  <th style={{ padding: '8px 14px', fontWeight: 700, color: themeColors.accentViolet, textAlign: 'right', backgroundColor: themeColors.accentVioletBg }}>
                    {groupByMatrixData.label}
                  </th>
                </tr>
              </thead>
              <tbody>
                {groupByMatrixData.rows.length === 0 ? (
                  <tr>
                    <td colSpan={groupByMatrixData.activeCols.length + 1} style={{ textAlign: 'center', padding: '2rem', color: themeColors.aggLabelColor }}>
                      No group by data to display.
                    </td>
                  </tr>
                ) : (
                  groupByMatrixData.rows.map((r, rIdx) => (
                    <tr
                      key={rIdx}
                      style={{
                        backgroundColor: rIdx % 2 === 1 ? themeColors.rowAlt : themeColors.rowBase,
                      }}
                    >
                      {groupByMatrixData.activeCols.map((colKey) => (
                        <td
                          key={colKey}
                          style={{
                            padding: '7px 14px',
                            fontWeight: 600,
                            color: themeColors.tdText,
                            borderRight: `1px solid ${themeColors.borderColor}`,
                          }}
                        >
                          {r.colValues[colKey]}
                        </td>
                      ))}
                      <td
                        style={{
                          padding: '7px 14px',
                          textAlign: 'right',
                          fontWeight: 700,
                          color: themeColors.accentViolet,
                          backgroundColor: themeColors.accentVioletBg,
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {r.computedDisplay}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {groupByMatrixData.sum && groupByMatrixData.rows.length > 0 && (
                <tfoot>
                  <tr style={{ backgroundColor: themeColors.totalRowBg, borderTop: `2px solid ${themeColors.totalRowBorder}`, fontWeight: 700 }}>
                    <td
                      colSpan={groupByMatrixData.activeCols.length}
                      style={{ padding: '8px 14px', color: themeColors.totalText, borderRight: `1px solid ${themeColors.borderColor}` }}
                    >
                      Total ({groupByMatrixData.rows.length} groups, {groupByMatrixData.totalCount} records)
                    </td>
                    <td style={{ padding: '8px 14px', textAlign: 'right', color: themeColors.accentViolet, backgroundColor: themeColors.accentPurpleTotal }}>
                      {groupByMatrixData.grandTotalComputed}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* Active Pivot View Banner & Pivot Table */}
      {appliedPivot && pivotMatrixData && (
        <div style={{ marginBottom: '1.25rem' }}>
          <div
            className="apex-active-pivot-banner"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 14px',
              backgroundColor: isDark ? themeColors.bannerBtnBg : '#faf5ff',
              border: `1px solid ${isDark ? '#7048e8' : '#d8b4fe'}`,
              borderRadius: '6px',
              marginBottom: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 700, fontSize: '0.8rem', color: themeColors.accentViolet }}>
                Active Pivot View:
              </span>
              <span style={{ fontSize: '0.8rem', color: themeColors.tdText }}>
                Rows: <strong>{appliedPivot.rowColumn}</strong> × Columns: <strong>{appliedPivot.pivotColumn}</strong> ({appliedPivot.func} aggregation)
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setShowPivotModal(true)}
                style={{
                  background: themeColors.bannerBtnBg,
                  border: `1px solid ${themeColors.bannerBtnBorder}`,
                  color: themeColors.bannerBtnColor,
                  borderRadius: '4px',
                  padding: '4px 10px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Edit Pivot
              </button>
              <button
                type="button"
                onClick={() => setAppliedPivot(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: themeColors.accentViolet,
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  padding: '4px 8px',
                }}
              >
                ✕ Remove Pivot
              </button>
            </div>
          </div>

          <div
            className="dense-table-wrapper"
            style={{
              overflowX: 'auto',
              borderRadius: '6px',
            }}
          >
            <table className={tableClassName} style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
              <thead>
                <tr className="apex-report-header-row">
                  <th style={{ padding: '8px 14px', fontWeight: 700, borderRight: `1px solid ${themeColors.borderColor}`, color: themeColors.thText }}>
                    {pivotMatrixData.rowColumn} \ {pivotMatrixData.pivotColumn}
                  </th>
                  {pivotMatrixData.colHeaders.map((cH) => (
                    <th key={cH} style={{ padding: '8px 12px', fontWeight: 700, textAlign: 'right', borderRight: `1px solid ${themeColors.borderColor}`, color: themeColors.thText }}>
                      {cH}
                    </th>
                  ))}
                  <th style={{ padding: '8px 14px', fontWeight: 700, color: themeColors.accentViolet, textAlign: 'right' }}>
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {pivotMatrixData.rows.length === 0 ? (
                  <tr>
                    <td colSpan={pivotMatrixData.colHeaders.length + 2} style={{ textAlign: 'center', padding: '2rem', color: themeColors.aggLabelColor }}>
                      No pivot data to display.
                    </td>
                  </tr>
                ) : (
                  pivotMatrixData.rows.map((r, rIdx) => (
                    <tr
                      key={rIdx}
                      className={`apex-table-row ${rIdx % 2 === 1 ? 'apex-row-alt' : 'apex-row-even'}`}
                      style={{
                        borderBottom: `1px solid ${themeColors.borderColor}`,
                      }}
                    >
                      <td style={{ padding: '7px 14px', fontWeight: 600, borderRight: `1px solid ${themeColors.borderColor}`, color: themeColors.tdText }}>
                        {r.rVal}
                      </td>
                      {pivotMatrixData.colHeaders.map((cH) => {
                        const cellVal = r.cells[cH];
                        return (
                          <td
                            key={cH}
                            style={{
                              padding: '7px 12px',
                              textAlign: 'right',
                              color: cellVal ? themeColors.tdText : themeColors.aggLabelColor,
                              borderRight: `1px solid ${themeColors.borderColor}`,
                              fontVariantNumeric: 'tabular-nums',
                            }}
                          >
                            {cellVal ? cellVal.toLocaleString() : '-'}
                          </td>
                        );
                      })}
                      <td style={{ padding: '7px 14px', textAlign: 'right', fontWeight: 700, color: themeColors.accentViolet, backgroundColor: themeColors.accentVioletBg }}>
                        {r.rowTotal.toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {pivotMatrixData.rows.length > 0 && (
                <tfoot>
                  <tr style={{ backgroundColor: themeColors.totalRowBg, borderTop: `2px solid ${themeColors.totalRowBorder}`, fontWeight: 700 }}>
                    <td style={{ padding: '8px 14px', color: themeColors.totalText, borderRight: `1px solid ${themeColors.borderColor}` }}>
                      Total ({pivotMatrixData.rows.length} rows)
                    </td>
                    {pivotMatrixData.colHeaders.map((cH) => (
                      <td key={cH} style={{ padding: '8px 12px', textAlign: 'right', color: themeColors.totalText, borderRight: `1px solid ${themeColors.borderColor}` }}>
                        {pivotMatrixData.colTotals[cH]?.toLocaleString() || 0}
                      </td>
                    ))}
                    <td style={{ padding: '8px 14px', textAlign: 'right', color: themeColors.accentViolet, backgroundColor: themeColors.accentPurpleTotal }}>
                      {pivotMatrixData.grandTotal.toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* Report Data Table Container */}
      <div className="dense-table-wrapper" style={{ overflowX: 'auto', borderRadius: '4px' }}>
        <table className={tableClassName} style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr className="apex-report-header-row">
              {selectable && (
                <th style={{ width: '40px', textAlign: 'center', padding: '6px 8px' }}>
                  <input
                    type="checkbox"
                    className="table-checkbox"
                    checked={allReportKeys.length > 0 && selectedKeys.length >= allReportKeys.length}
                    ref={(el) => {
                      if (el) {
                        el.indeterminate = selectedKeys.length > 0 && selectedKeys.length < allReportKeys.length;
                      }
                    }}
                    onChange={() => {
                      const isAllReportSelected = allReportKeys.length > 0 && selectedKeys.length >= allReportKeys.length;
                      if (onSelectAll && !isAllReportSelected) {
                        onSelectAll();
                        return;
                      }
                      if (onDeselectAll && isAllReportSelected) {
                        onDeselectAll();
                        return;
                      }
                      if (!onSelectionChange) return;
                      if (isAllReportSelected) {
                        onSelectionChange([]);
                        if (onShowToast) onShowToast('info', 'Deselected all records.');
                      } else {
                        onSelectionChange(allReportKeys);
                        if (onShowToast) onShowToast('info', `Selected all ${allReportKeys.length} records throughout report.`);
                      }
                    }}
                    aria-label={`Select all ${allReportKeys.length} records throughout report`}
                    title={
                      allReportKeys.length > 0 && selectedKeys.length >= allReportKeys.length
                        ? `All ${allReportKeys.length} records throughout report selected`
                        : `Select all ${allReportKeys.length} records throughout report`
                    }
                  />
                </th>
              )}

              {renderLeadingCell && (
                <th style={{ width: '40px', textAlign: 'center', padding: '6px 8px' }}>
                  {leadingHeader}
                </th>
              )}

              {visibleColumns.map((col) => {
                const colKey = col.key || col.id;
                const isSorted = sortKey === colKey || multiSortRules.some((r) => r.key === colKey);
                const colLabel = col.label || col.title || colKey;

                return (
                  <th
                    key={colKey}
                    onClick={(e) => handleHeaderClick(e, col)}
                    style={{
                      cursor: 'pointer',
                      userSelect: 'none',
                      whiteSpace: 'nowrap',
                      padding: '8px 12px',
                      fontSize: '0.775rem',
                      fontWeight: 700,
                      color: isSorted ? themeColors.accentBlue : themeColors.thText,
                      backgroundColor: isSorted ? (isDark ? 'rgba(56, 189, 248, 0.15)' : '#f0f9ff') : 'inherit',
                      width: col.width,
                      minWidth: col.minWidth,
                      textAlign: col.align || 'left',
                      transition: 'background-color 0.15s ease',
                    }}
                    title={`Click column header for sort, filter and actions on "${colLabel}"`}
                  >
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <span>{colLabel}</span>
                      {col.isComputed && (
                        <span style={{ fontSize: '0.65rem', padding: '1px 4px', borderRadius: '3px', backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0', color: themeColors.aggLabelColor }}>
                          calc
                        </span>
                      )}
                      {isSorted ? (
                        <span style={{ fontSize: '0.7rem', color: themeColors.accentBlue, fontWeight: 800 }}>
                          {sortDir === 'asc' ? '▲' : '▼'}
                        </span>
                      ) : (
                        <span style={{ opacity: 0.35, fontSize: '0.65rem' }}>
                          <IconChevronDown size={11} />
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}

              {renderTrailingCell && (
                <th style={{ width: '50px', textAlign: 'center', padding: '6px 8px' }}>
                  {trailingHeader}
                </th>
              )}
            </tr>
          </thead>

          <tbody>
            {isLoading ? (
              <tr>
                <td
                  colSpan={totalColSpan}
                  style={{ textAlign: 'center', padding: '2.5rem', color: themeColors.aggLabelColor }}
                >
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    <div className="spinner-border spinner-border-sm" role="status" style={{ width: '16px', height: '16px', border: `2px solid ${themeColors.borderColor}`, borderTopColor: themeColors.accentBlue, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                    <span>{loadingMessage}</span>
                  </div>
                </td>
              </tr>
            ) : displayRows.length === 0 ? (
              <tr>
                <td
                  colSpan={totalColSpan}
                  style={{ textAlign: 'center', padding: '2.5rem', color: themeColors.aggLabelColor, fontStyle: 'italic' }}
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              displayRows.map((row, rowIdx) => {
                const k = typeof rowKey === 'function' ? rowKey(row, rowIdx) : (row[rowKey] !== undefined ? row[rowKey] : rowIdx);
                const isRowSelected = selectable && selectedKeys.map(String).includes(String(k));
                const customRowClass = typeof rowClassName === 'function' ? rowClassName(row, rowIdx) : rowClassName;
                const highlightStyle = getRowHighlightStyle(row);

                // Control Break subheader detection
                let showBreakHeader = false;
                let breakVal = null;
                if (breakColumn) {
                  breakVal = row[breakColumn];
                  const prevRow = displayRows[rowIdx - 1];
                  const prevVal = prevRow ? prevRow[breakColumn] : undefined;
                  if (rowIdx === 0 || breakVal !== prevVal) {
                    showBreakHeader = true;
                  }
                }

                const breakColObj = breakColumn ? allAvailableColumns.find((c) => (c.key || c.id) === breakColumn) : null;

                return (
                  <React.Fragment key={k}>
                    {/* Control Break Header Row */}
                    {showBreakHeader && (
                      <tr style={{ backgroundColor: themeColors.controlBreakBg, borderTop: `2px solid ${themeColors.borderColor}`, borderBottom: `1px solid ${themeColors.borderColor}` }}>
                        <td
                          colSpan={totalColSpan}
                          style={{
                            padding: '6px 12px',
                            fontWeight: 700,
                            color: themeColors.controlBreakText,
                            fontSize: '0.8rem',
                          }}
                        >
                          <span style={{ color: themeColors.accentBlue, marginRight: '6px' }}>▸</span>
                          <span>{breakColObj?.label || breakColumn}:</span>
                          <span style={{ marginLeft: '6px', color: themeColors.tdText }}>
                            {breakVal !== undefined && breakVal !== null && breakVal !== '' ? String(breakVal) : '(Empty)'}
                          </span>
                        </td>
                      </tr>
                    )}

                    <tr
                      className={`apex-table-row ${rowIdx % 2 === 1 ? 'apex-row-alt' : 'apex-row-even'} ${isRowSelected ? 'selected' : ''} ${customRowClass || ''}`}
                      onClick={onRowClick ? () => onRowClick(row, rowIdx) : undefined}
                      style={{
                        borderBottom: `1px solid ${themeColors.borderColor}`,
                        backgroundColor: highlightStyle ? highlightStyle.backgroundColor : (isRowSelected ? themeColors.selectedRowBg : undefined),
                        color: highlightStyle ? highlightStyle.color : undefined,
                        cursor: onRowClick ? 'pointer' : 'default',
                        transition: 'background-color 0.12s ease',
                      }}
                    >
                      {selectable && (
                        <td
                          style={{ textAlign: 'center', padding: '6px 8px' }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            className="table-checkbox"
                            checked={isRowSelected}
                            onChange={(e) => {
                              if (!onSelectionChange) return;
                              const strK = String(k);
                              if (e.target.checked) {
                                onSelectionChange([...selectedKeys.map(String), strK]);
                              } else {
                                onSelectionChange(selectedKeys.map(String).filter((x) => x !== strK));
                              }
                            }}
                            aria-label={`Select row ${k}`}
                          />
                        </td>
                      )}

                      {renderLeadingCell && (
                        <td style={{ textAlign: 'center', padding: '6px 8px' }}>
                          {renderLeadingCell(row, rowIdx)}
                        </td>
                      )}

                      {visibleColumns.map((col) => {
                        let cellContent;
                        if (typeof col.render === 'function') {
                          cellContent = col.render(row, rowIdx);
                        } else if (typeof col.getValue === 'function') {
                          cellContent = col.getValue(row);
                        } else {
                          const rawVal = row[col.key || col.id];
                          cellContent = rawVal !== undefined && rawVal !== null && rawVal !== '' ? String(rawVal) : '—';
                        }

                        return (
                          <td
                            key={col.key || col.id}
                            style={{
                              padding: '8px 12px',
                              fontSize: '0.775rem',
                              textAlign: col.align || 'left',
                              color: highlightStyle ? highlightStyle.color : 'inherit',
                            }}
                          >
                            {cellContent}
                          </td>
                        );
                      })}

                      {renderTrailingCell && (
                        <td style={{ textAlign: 'center', padding: '6px 8px' }}>
                          {renderTrailingCell(row, rowIdx)}
                        </td>
                      )}
                    </tr>
                  </React.Fragment>
                );
              })
            )}
          </tbody>

          {/* Aggregations Summary Footer */}
          {enableAggregation && aggregations.length > 0 && displayRows.length > 0 && (
            <tfoot>
              {aggregations.map((agg) => (
                <tr key={agg.id} style={{ backgroundColor: themeColors.totalRowBg, borderTop: `2px solid ${themeColors.totalRowBorder}`, fontWeight: 700 }}>
                  {selectable && <td />}
                  {renderLeadingCell && <td />}
                  {visibleColumns.map((col) => {
                    if ((col.key || col.id) === agg.columnKey) {
                      const computedVal = computeAggregationValue(agg.func, agg.columnKey, processedData);
                      return (
                        <td key={col.key || col.id} style={{ padding: '8px 12px', color: themeColors.totalText }}>
                          <span style={{ fontSize: '0.7rem', color: themeColors.aggLabelColor, textTransform: 'uppercase', marginRight: '6px' }}>
                            {agg.func}:
                          </span>
                          {computedVal}
                        </td>
                      );
                    }
                    return <td key={col.key || col.id} />;
                  })}
                  {renderTrailingCell && <td />}
                </tr>
              ))}
            </tfoot>
          )}
        </table>
      </div>

      {/* Select Columns Dual-Shuttle Modal */}
      {showColumnsModal && (
        <SelectColumnsModal
          isOpen={showColumnsModal}
          allColumns={allAvailableColumns}
          visibleColumnKeys={visibleKeys}
          defaultVisibleKeys={allAvailableColumns.filter((c) => !c.defaultHidden).map((c) => c.key || c.id)}
          onSave={(newKeys) => {
            setVisibleKeys(newKeys);
            setShowColumnsModal(false);
            if (onShowToast) onShowToast('success', 'Column visibility saved.');
          }}
          onApply={(newKeys) => {
            setVisibleKeys(newKeys);
            setShowColumnsModal(false);
            if (onShowToast) onShowToast('success', 'Column visibility saved.');
          }}
          onReset={() => {
            const defaultKeys = allAvailableColumns.filter((c) => !c.defaultHidden).map((c) => c.key || c.id);
            setVisibleKeys(defaultKeys);
            try {
              localStorage.removeItem(`apex_ir_columns_${reportId}`);
            } catch (e) {}
            if (onShowToast) onShowToast('info', 'Columns reset to default.');
          }}
          onClose={() => setShowColumnsModal(false)}
        />
      )}

      {/* Filter Modal */}
      {showFilterModal && (
        <ApexFilterModal
          isOpen={showFilterModal}
          onClose={() => setShowFilterModal(false)}
          columns={allAvailableColumns}
          activeFilter={headerFilter}
          onApply={(newFilter) => {
            setHeaderFilter(newFilter);
            setShowFilterModal(false);
            if (onShowToast) onShowToast('success', 'Filter applied.');
          }}
        />
      )}

      {/* Multi-Column Sort Modal */}
      {showSortModal && (
        <ApexSortModal
          isOpen={showSortModal}
          onClose={() => setShowSortModal(false)}
          columns={allAvailableColumns}
          currentSort={multiSortRules.length > 0 ? multiSortRules : [{ key: sortKey || '', dir: sortDir || 'asc', nulls: 'last' }]}
          onApplySort={(rules) => {
            setMultiSortRules(rules);
            setShowSortModal(false);
            if (onShowToast) onShowToast('success', 'Sorting rules applied.');
          }}
        />
      )}

      {/* Aggregate Modal */}
      {enableAggregation && showAggregateModal && (
        <ApexAggregateModal
          isOpen={showAggregateModal}
          onClose={() => setShowAggregateModal(false)}
          columns={allAvailableColumns}
          aggregations={aggregations}
          onApply={(newAgg) => {
            setAggregations((prev) => {
              const idx = prev.findIndex((a) => a.columnKey === newAgg.columnKey);
              if (idx >= 0) {
                const next = [...prev];
                next[idx] = newAgg;
                return next;
              }
              return [...prev, newAgg];
            });
            setShowAggregateModal(false);
            if (onShowToast) onShowToast('success', `Applied ${newAgg.func} aggregation on ${newAgg.columnLabel}`);
          }}
          onDelete={(id) => {
            setAggregations((prev) => prev.filter((a) => a.id !== id));
            setShowAggregateModal(false);
            if (onShowToast) onShowToast('info', 'Aggregation removed.');
          }}
        />
      )}

      {/* Compute Column Modal */}
      {showComputeModal && (
        <ApexComputeModal
          isOpen={showComputeModal}
          onClose={() => setShowComputeModal(false)}
          columns={allAvailableColumns}
          computations={computations}
          onApplyCompute={(newComp) => {
            setComputations((prev) => [...prev, newComp]);
            setShowComputeModal(false);
            if (onShowToast) onShowToast('success', `Added computed column: "${newComp.columnLabel}"`);
          }}
          onDeleteCompute={(id) => {
            setComputations((prev) => prev.filter((c) => c.id !== id));
            setShowComputeModal(false);
            if (onShowToast) onShowToast('info', 'Computed column deleted.');
          }}
        />
      )}

      {/* Control Break Modal */}
      {showControlBreakModal && (
        <ApexControlBreakModal
          isOpen={showControlBreakModal}
          onClose={() => setShowControlBreakModal(false)}
          columns={allAvailableColumns}
          currentBreakColumn={breakColumn}
          onApplyControlBreak={(colKey) => {
            setBreakColumn(colKey);
            setShowControlBreakModal(false);
            if (onShowToast) {
              onShowToast('info', colKey ? `Control break on ${colKey}` : 'Control break removed.');
            }
          }}
        />
      )}

      {/* Highlight Rows Modal */}
      {showHighlightModal && (
        <ApexHighlightModal
          isOpen={showHighlightModal}
          onClose={() => setShowHighlightModal(false)}
          columns={allAvailableColumns}
          highlights={highlights}
          onApplyHighlight={(newH) => {
            setHighlights((prev) => [...prev, newH]);
            setShowHighlightModal(false);
            if (onShowToast) onShowToast('success', `Applied highlight: "${newH.name}"`);
          }}
          onDeleteHighlight={(id) => {
            setHighlights((prev) => prev.filter((h) => h.id !== id));
            setShowHighlightModal(false);
            if (onShowToast) onShowToast('info', 'Highlight rule removed.');
          }}
        />
      )}

      {/* Chart Modal */}
      {enableChart && showChartModal && (
        <ApexChartModal
          isOpen={showChartModal}
          onClose={() => setShowChartModal(false)}
          columns={allAvailableColumns}
          data={processedData}
        />
      )}

      {/* Group By Modal */}
      {showGroupByModal && (
        <ApexGroupByModal
          isOpen={showGroupByModal}
          onClose={() => setShowGroupByModal(false)}
          columns={allAvailableColumns}
          data={processedData}
          initialGroupBy={appliedGroupBy}
          onApplyGroupBy={(newGroup) => {
            setAppliedGroupBy(newGroup);
            if (newGroup && onShowToast) {
              onShowToast('success', `Applied Group By: ${newGroup.groupColumn} (${newGroup.func})`);
            } else if (!newGroup && onShowToast) {
              onShowToast('info', 'Group By view removed.');
            }
          }}
        />
      )}

      {/* Pivot Modal */}
      {showPivotModal && (
        <ApexPivotModal
          isOpen={showPivotModal}
          onClose={() => setShowPivotModal(false)}
          columns={allAvailableColumns}
          data={processedData}
          initialPivot={appliedPivot}
          onApplyPivot={(newPivot) => {
            setAppliedPivot(newPivot);
            if (newPivot && onShowToast) {
              onShowToast('success', `Applied Pivot: ${newPivot.rowColumn} by ${newPivot.pivotColumn}`);
            } else if (!newPivot && onShowToast) {
              onShowToast('info', 'Pivot view removed.');
            }
          }}
        />
      )}

      {/* Save Report Views Modal */}
      {showSaveReportModal && (
        <ApexSaveReportModal
          isOpen={showSaveReportModal}
          onClose={() => setShowSaveReportModal(false)}
          reportId={reportId}
          savedReports={savedReports}
          activeReportId={activeReportId}
          onSaveReport={handleSaveReportLayout}
          onSwitchReport={handleSwitchReportLayout}
          onDeleteReport={handleDeleteSavedReport}
        />
      )}

      {/* Help Modal */}
      {showHelpModal && (
        <ApexHelpModal
          isOpen={showHelpModal}
          onClose={() => setShowHelpModal(false)}
          isEditableGrid={isEditableGrid}
        />
      )}

      {/* Oracle APEX Interactive Column Header Menu */}
      <ApexColumnHeaderMenu
        isOpen={headerMenu.isOpen}
        column={headerMenu.column}
        anchorRect={headerMenu.anchorRect}
        data={isServerSide ? data : processedData}
        sortConfig={{ key: sortKey, direction: sortDir }}
        onSort={handleMenuSort}
        onHideColumn={handleMenuHideColumn}
        onControlBreak={(colKey) => setBreakColumn(colKey)}
        onFilterValue={handleMenuFilterValue}
        onClose={() => setHeaderMenu({ isOpen: false, column: null, anchorRect: null })}
      />
    </div>
  );
}
