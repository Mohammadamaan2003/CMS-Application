import { useState, useMemo, useCallback } from 'react';

/**
 * useApexColumnMenu
 * Reusable hook providing Oracle APEX interactive column header menu logic:
 * - Header menu anchor & open state
 * - Column sorting (asc/desc) with visual indicator
 * - Column value live filter with indicator banner
 * - Column hide action
 * - Client-side processed data sorting and filtering
 */
export function useApexColumnMenu(data = [], onFilterChange = null) {
  const [headerMenu, setHeaderMenu] = useState({
    isOpen: false,
    column: null,
    anchorRect: null,
  });
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc'); // 'asc' | 'desc'
  const [headerFilter, setHeaderFilter] = useState({ key: null, value: null });
  const [hiddenColumnKeys, setHiddenColumnKeys] = useState([]);

  const handleHeaderClick = useCallback((e, col) => {
    if (e && e.preventDefault) e.preventDefault();
    if (e && e.stopPropagation) e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setHeaderMenu({
      isOpen: true,
      column: col,
      anchorRect: rect,
    });
  }, []);

  const handleMenuSort = useCallback((columnKey, direction) => {
    setSortKey(columnKey);
    setSortDir(direction ? direction.toLowerCase() : 'asc');
  }, []);

  const handleMenuHideColumn = useCallback((columnKey) => {
    setHiddenColumnKeys((prev) => (prev.includes(columnKey) ? prev : [...prev, columnKey]));
  }, []);

  const handleMenuFilterValue = useCallback((columnKey, val) => {
    setHeaderFilter({ key: columnKey, value: val });
    if (onFilterChange) onFilterChange(columnKey, val);
  }, [onFilterChange]);

  const handleClearHeaderFilter = useCallback(() => {
    setHeaderFilter({ key: null, value: null });
    if (onFilterChange) onFilterChange(null, null);
  }, [onFilterChange]);

  const closeHeaderMenu = useCallback(() => {
    setHeaderMenu({ isOpen: false, column: null, anchorRect: null });
  }, []);

  // Filter and sort rows client-side if data is provided
  const processedData = useMemo(() => {
    let result = Array.isArray(data) ? [...data] : [];
    if (headerFilter.key && headerFilter.value) {
      result = result.filter((row) => {
        let val;
        if (typeof headerFilter.column?.getValue === 'function') {
          val = headerFilter.column.getValue(row);
        } else {
          val = row[headerFilter.key];
        }
        return String(val !== undefined && val !== null ? val : '')
          .toLowerCase()
          .includes(String(headerFilter.value).toLowerCase());
      });
    }
    if (sortKey) {
      result.sort((a, b) => {
        const valA = a[sortKey];
        const valB = b[sortKey];
        const numA = Number(valA);
        const numB = Number(valB);
        if (!isNaN(numA) && !isNaN(numB) && typeof valA !== 'boolean' && valA !== '' && valB !== '') {
          return sortDir === 'asc' ? numA - numB : numB - numA;
        }
        const strA = String(valA || '');
        const strB = String(valB || '');
        return sortDir === 'asc'
          ? strA.localeCompare(strB, undefined, { numeric: true, sensitivity: 'base' })
          : strB.localeCompare(strA, undefined, { numeric: true, sensitivity: 'base' });
      });
    }
    return result;
  }, [data, headerFilter, sortKey, sortDir]);

  return {
    headerMenu,
    setHeaderMenu,
    handleHeaderClick,
    sortKey,
    setSortKey,
    sortDir,
    setSortDir,
    headerFilter,
    setHeaderFilter,
    hiddenColumnKeys,
    setHiddenColumnKeys,
    handleMenuSort,
    handleMenuHideColumn,
    handleMenuFilterValue,
    handleClearHeaderFilter,
    closeHeaderMenu,
    processedData,
  };
}
