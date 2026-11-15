import React, { useState, useEffect, useRef } from 'react';
import {
  IconColumns,
  IconFilter,
  IconTable,
  IconWrench,
  IconBarChart,
  IconGroupBy,
  IconPivot,
  IconBookmark,
  IconDownload,
  IconChevronRight,
  IconRefresh,
  IconArrowUpDown,
  IconUndo,
  IconSigma,
  IconCalculator,
  IconFlashback,
} from './Icons';

export default function ApexActionsMenu({
  isOpen,
  onClose,
  onOpenColumns,
  onOpenFilter,
  onOpenSort,
  onOpenAggregate,
  onOpenCompute,
  onOpenFlashback,
  onOpenControlBreak,
  onOpenHighlight,
  onOpenChart,
  onOpenGroupBy,
  onOpenPivot,
  onResetReport,
  onSaveReport,
  onDownload,
  onChangeRows,
  currentRows = 50,
}) {
  const menuRef = useRef(null);
  const [activeSubmenu, setActiveSubmenu] = useState(null);

  useEffect(() => {
    if (!isOpen) {
      setActiveSubmenu(null);
      return;
    }

    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="apex-actions-dropdown" ref={menuRef}>
      {/* Top pointer arrow */}
      <div className="apex-actions-dropdown-arrow" />

      {/* 1. Columns */}
      <button
        type="button"
        className="apex-actions-menu-item"
        onClick={() => {
          onClose();
          if (onOpenColumns) onOpenColumns();
        }}
      >
        <span className="apex-actions-menu-icon">
          <IconColumns size={16} />
        </span>
        <span className="apex-actions-menu-label">Columns</span>
      </button>

      {/* 2. Filter */}
      <button
        type="button"
        className="apex-actions-menu-item"
        onClick={() => {
          onClose();
          if (onOpenFilter) onOpenFilter();
        }}
      >
        <span className="apex-actions-menu-icon">
          <IconFilter size={16} />
        </span>
        <span className="apex-actions-menu-label">Filter</span>
      </button>

      {/* 3. Data (Submenu strictly matching Screenshot) */}
      <div
        className="apex-actions-menu-item with-sub"
        onMouseEnter={() => setActiveSubmenu('data')}
        onMouseLeave={() => setActiveSubmenu(null)}
      >
        <span className="apex-actions-menu-icon">
          <IconTable size={16} />
        </span>
        <span className="apex-actions-menu-label">Data</span>
        <IconChevronRight size={14} className="apex-actions-menu-chevron" />

        {activeSubmenu === 'data' && (
          <div className="apex-actions-flyout-menu">
            {/* Sort */}
            <button
              type="button"
              className="apex-actions-flyout-item"
              onClick={() => {
                onClose();
                if (onOpenSort) onOpenSort();
                else if (onOpenFilter) onOpenFilter();
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <IconArrowUpDown size={15} />
                <span>Sort</span>
              </span>
            </button>

            {/* Aggregate (with Sigma icon) */}
            <button
              type="button"
              className="apex-actions-flyout-item"
              onClick={() => {
                onClose();
                if (onOpenAggregate) onOpenAggregate();
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <IconSigma size={15} />
                <span>Aggregate</span>
              </span>
            </button>

            {/* Compute */}
            <button
              type="button"
              className="apex-actions-flyout-item"
              onClick={() => {
                onClose();
                if (onOpenCompute) onOpenCompute();
                else if (onOpenAggregate) onOpenAggregate();
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <IconCalculator size={15} />
                <span>Compute</span>
              </span>
            </button>

            {/* Flashback */}
            <button
              type="button"
              className="apex-actions-flyout-item"
              onClick={() => {
                onClose();
                if (onOpenFlashback) onOpenFlashback();
                else if (onResetReport) onResetReport();
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <IconFlashback size={15} />
                <span>Flashback</span>
              </span>
            </button>
          </div>
        )}
      </div>

      {/* 4. Format (Submenu matching Screenshot) */}
      <div
        className="apex-actions-menu-item with-sub"
        onMouseEnter={() => setActiveSubmenu('format')}
        onMouseLeave={() => setActiveSubmenu(null)}
      >
        <span className="apex-actions-menu-icon">
          <IconWrench size={16} />
        </span>
        <span className="apex-actions-menu-label">Format</span>
        <IconChevronRight size={14} className="apex-actions-menu-chevron" />

        {activeSubmenu === 'format' && (
          <div className="apex-actions-flyout-menu">
            <button
              type="button"
              className="apex-actions-flyout-item"
              onClick={() => {
                onClose();
                if (onOpenControlBreak) onOpenControlBreak();
              }}
            >
              <span>Control Break</span>
            </button>
            <button
              type="button"
              className="apex-actions-flyout-item"
              onClick={() => {
                onClose();
                if (onOpenHighlight) onOpenHighlight();
              }}
            >
              <span>Highlight</span>
            </button>
            <div className="apex-actions-flyout-header" style={{ marginTop: '4px' }}>
              Rows Per Page
            </div>
            {[10, 25, 50, 100, 500, 1000, 'all'].map((num) => (
              <button
                key={num}
                type="button"
                className={`apex-actions-flyout-item ${String(currentRows) === String(num) ? 'active' : ''}`}
                onClick={() => {
                  onClose();
                  if (onChangeRows) onChangeRows(num);
                }}
              >
                <span>{num === 'all' ? 'All Rows' : `${num} Rows`}</span>
                {String(currentRows) === String(num) && <span>✓</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="apex-actions-menu-divider" />

      {/* 5. Chart */}
      <button
        type="button"
        className="apex-actions-menu-item"
        onClick={() => {
          onClose();
          if (onOpenChart) onOpenChart();
        }}
      >
        <span className="apex-actions-menu-icon">
          <IconBarChart size={16} />
        </span>
        <span className="apex-actions-menu-label">Chart</span>
      </button>

      {/* 6. Group By */}
      <button
        type="button"
        className="apex-actions-menu-item"
        onClick={() => {
          onClose();
          if (onOpenGroupBy) onOpenGroupBy();
          else if (onOpenChart) onOpenChart();
        }}
      >
        <span className="apex-actions-menu-icon">
          <IconGroupBy size={16} />
        </span>
        <span className="apex-actions-menu-label">Group By</span>
      </button>

      {/* 7. Pivot */}
      <button
        type="button"
        className="apex-actions-menu-item"
        onClick={() => {
          onClose();
          if (onOpenPivot) onOpenPivot();
          else if (onOpenChart) onOpenChart();
        }}
      >
        <span className="apex-actions-menu-icon">
          <IconPivot size={16} />
        </span>
        <span className="apex-actions-menu-label">Pivot</span>
      </button>

      <div className="apex-actions-menu-divider" />

      {/* 8. Report (Submenu: Save Report, Reset) */}
      <div
        className="apex-actions-menu-item with-sub"
        onMouseEnter={() => setActiveSubmenu('report')}
        onMouseLeave={() => setActiveSubmenu(null)}
      >
        <span className="apex-actions-menu-icon">
          <IconBookmark size={16} />
        </span>
        <span className="apex-actions-menu-label">Report</span>
        <IconChevronRight size={14} className="apex-actions-menu-chevron" />

        {activeSubmenu === 'report' && (
          <div className="apex-actions-flyout-menu">
            <button
              type="button"
              className="apex-actions-flyout-item"
              onClick={() => {
                onClose();
                if (onSaveReport) onSaveReport();
              }}
            >
              <span>Save Report</span>
            </button>
            <button
              type="button"
              className="apex-actions-flyout-item"
              onClick={() => {
                onClose();
                if (onResetReport) onResetReport();
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <IconUndo size={14} />
                <span>Reset</span>
              </span>
            </button>
          </div>
        )}
      </div>

      <div className="apex-actions-menu-divider" />

      {/* 9. Download */}
      <button
        type="button"
        className="apex-actions-menu-item"
        onClick={() => {
          onClose();
          if (onDownload) onDownload();
        }}
      >
        <span className="apex-actions-menu-icon">
          <IconDownload size={16} />
        </span>
        <span className="apex-actions-menu-label">Download</span>
      </button>
    </div>
  );
}
