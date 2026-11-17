import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  IconSortAsc,
  IconSortDesc,
  IconHideColumn,
  IconControlBreak,
  IconSearch,
} from './Icons';

/**
 * ApexColumnHeaderMenu
 * Interactive Report Column Header Menu matching Oracle APEX specification:
 * - Top 4 actions: Sort Ascending, Sort Descending, Hide Column, Control Break
 * - Filter Search Input
 * - Live distinct column values list with click-to-filter
 */
export default function ApexColumnHeaderMenu({
  isOpen,
  column,
  anchorRect,
  data = [],
  distinctValues: propDistinctValues,
  sortConfig = { key: null, direction: null },
  onSort,
  onHideColumn,
  onControlBreak,
  onFilterValue,
  onClose,
}) {
  const menuRef = useRef(null);
  const searchInputRef = useRef(null);
  const [search, setSearch] = useState('');

  // Extract distinct unique values for this column from data if not explicitly provided
  const distinctValues = useMemo(() => {
    if (propDistinctValues && Array.isArray(propDistinctValues) && propDistinctValues.length > 0) {
      return propDistinctValues;
    }
    if (!column || !data || !Array.isArray(data)) return [];

    const uniqueSet = new Set();
    data.forEach((row) => {
      let val;
      if (typeof column.getValue === 'function') {
        val = column.getValue(row);
      } else {
        val = row[column.key];
      }
      if (val !== undefined && val !== null) {
        const str = String(val).trim();
        if (str !== '' && str !== '—' && str !== 'undefined' && str !== 'null') {
          uniqueSet.add(str);
        }
      }
    });

    return Array.from(uniqueSet).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
    );
  }, [column, data, propDistinctValues]);

  // Filter values based on search input
  const filteredValues = useMemo(() => {
    if (!search.trim()) return distinctValues;
    const q = search.trim().toLowerCase();
    return distinctValues.filter((v) => String(v).toLowerCase().includes(q));
  }, [distinctValues, search]);

  // Reset search and auto-focus when opened
  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 50);
    }
  }, [isOpen, column]);

  // Close on outside click or Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleMouseDown = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !column || !anchorRect) return null;

  // Calculate fixed popup position relative to viewport
  const menuWidth = 248;
  let left = anchorRect.left;
  if (left + menuWidth > window.innerWidth - 12) {
    left = Math.max(12, window.innerWidth - menuWidth - 12);
  }
  let top = anchorRect.bottom + 2;
  if (top + 280 > window.innerHeight && anchorRect.top > 300) {
    top = Math.max(10, anchorRect.top - 280);
  }

  const isAscActive = sortConfig?.key === column.key && sortConfig?.direction === 'asc';
  const isDescActive = sortConfig?.key === column.key && sortConfig?.direction === 'desc';

  return (
    <div
      ref={menuRef}
      className="apex-column-menu"
      style={{
        position: 'fixed',
        top: `${top}px`,
        left: `${left}px`,
        width: `${menuWidth}px`,
        backgroundColor: 'var(--bg-dropdown, var(--bg-surface, #ffffff))',
        border: '1px solid var(--border, #cbd5e1)',
        borderRadius: '6px',
        boxShadow: '0 4px 18px rgba(0, 0, 0, 0.28), 0 2px 6px rgba(0, 0, 0, 0.16)',
        zIndex: 9999,
        fontFamily: 'inherit',
        overflow: 'hidden',
        animation: 'fadeInMenu 0.12s ease-out',
        color: 'var(--text-main, #0f172a)',
      }}
    >
      {/* 1. TOP ACTION BUTTONS ROW (Sort Asc, Sort Desc, Hide Column, Control Break) */}
      <div
        className="apex-column-menu-actions"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '4px',
          padding: '6px 8px',
          borderBottom: '1px solid var(--border, #f1f5f9)',
          backgroundColor: 'var(--bg-dropdown, var(--bg-surface, #ffffff))',
        }}
      >
        {/* Sort Ascending Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (onSort) onSort(column.key, 'asc');
            onClose();
          }}
          title="Sort Ascending"
          style={{
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: isAscActive ? 'var(--bg-muted, #e2e8f0)' : 'transparent',
            border: isAscActive ? '1px dashed var(--text-muted, #64748b)' : '1px solid transparent',
            borderRadius: '4px',
            color: 'var(--text-main, #0f172a)',
            cursor: 'pointer',
            transition: 'background-color 0.1s ease',
          }}
          onMouseOver={(e) => {
            if (!isAscActive) e.currentTarget.style.backgroundColor = 'var(--bg-muted, #f1f5f9)';
          }}
          onMouseOut={(e) => {
            if (!isAscActive) e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <IconSortAsc size={16} />
        </button>

        {/* Sort Descending Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (onSort) onSort(column.key, 'desc');
            onClose();
          }}
          title="Sort Descending"
          style={{
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: isDescActive ? 'var(--bg-muted, #e2e8f0)' : 'transparent',
            border: isDescActive ? '1px dashed var(--text-muted, #64748b)' : '1px solid transparent',
            borderRadius: '4px',
            color: 'var(--text-main, #0f172a)',
            cursor: 'pointer',
            transition: 'background-color 0.1s ease',
          }}
          onMouseOver={(e) => {
            if (!isDescActive) e.currentTarget.style.backgroundColor = 'var(--bg-muted, #f1f5f9)';
          }}
          onMouseOut={(e) => {
            if (!isDescActive) e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <IconSortDesc size={16} />
        </button>

        {/* Hide Column Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (onHideColumn) onHideColumn(column.key);
            onClose();
          }}
          title="Hide Column"
          style={{
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            border: '1px solid transparent',
            borderRadius: '4px',
            color: 'var(--text-main, #0f172a)',
            cursor: 'pointer',
            transition: 'background-color 0.1s ease',
          }}
          onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-muted, #f1f5f9)')}
          onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          <IconHideColumn size={16} />
        </button>

        {/* Control Break / Filter Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (onControlBreak) onControlBreak(column.key);
            onClose();
          }}
          title="Control Break / Group"
          style={{
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            border: '1px solid transparent',
            borderRadius: '4px',
            color: 'var(--text-main, #0f172a)',
            cursor: 'pointer',
            transition: 'background-color 0.1s ease',
          }}
          onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-muted, #f1f5f9)')}
          onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          <IconControlBreak size={16} />
        </button>
      </div>

      {/* 2. SEARCH / FILTER INPUT (with 🔍 Filter...) */}
      <div
        className="apex-column-menu-search"
        style={{
          padding: '6px 8px',
          borderBottom: '1px solid var(--border, #f1f5f9)',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <span
          style={{
            position: 'absolute',
            left: '16px',
            top: '50%',
            transform: 'translateY(-50%)',
            pointerEvents: 'none',
            color: 'var(--text-muted, #94a3b8)',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <IconSearch size={14} />
        </span>
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Filter..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          className="apex-column-menu-input"
          style={{
            width: '100%',
            height: '30px',
            paddingLeft: '28px',
            paddingRight: '8px',
            fontSize: '0.825rem',
            border: '1px solid var(--border, #e2e8f0)',
            borderRadius: '4px',
            outline: 'none',
            backgroundColor: 'var(--bg-input, #ffffff)',
            color: 'var(--text-main, #0f172a)',
          }}
          onFocus={(e) => (e.target.style.borderColor = 'var(--primary, #2563eb)')}
          onBlur={(e) => (e.target.style.borderColor = 'var(--border, #e2e8f0)')}
        />
      </div>

      {/* 3. SCROLLABLE VALUES LIST */}
      <div
        className="apex-column-menu-list"
        style={{
          maxHeight: '190px',
          overflowY: 'auto',
          padding: '4px 0',
        }}
      >
        {filteredValues.length === 0 ? (
          <div
            style={{
              padding: '1rem',
              textAlign: 'center',
              fontSize: '0.8rem',
              color: 'var(--text-muted, #94a3b8)',
            }}
          >
            {search.trim() ? 'No matches found' : 'No values available'}
          </div>
        ) : (
          filteredValues.map((val, idx) => (
            <div
              key={`${val}_${idx}`}
              onClick={(e) => {
                e.stopPropagation();
                if (onFilterValue) onFilterValue(column.key, val);
                onClose();
              }}
              title={val}
              className="apex-column-menu-item"
              style={{
                padding: '6px 12px',
                fontSize: '0.825rem',
                color: 'var(--text-main, #0f172a)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                transition: 'background-color 0.1s ease, color 0.1s ease',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--bg-muted, #f1f5f9)';
                e.currentTarget.style.color = 'var(--primary-accent, #38bdf8)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--text-main, #0f172a)';
              }}
            >
              {val}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
