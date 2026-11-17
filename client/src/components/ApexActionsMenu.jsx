import React, { useState, useEffect, useRef, useMemo } from 'react';
import SelectColumnsModal from './SelectColumnsModal';
import ApexFilterModal from './ApexFilterModal';
import ApexSortModal from './ApexSortModal';
import ApexAggregateModal from './ApexAggregateModal';
import ApexComputeModal from './ApexComputeModal';
import ApexControlBreakModal from './ApexControlBreakModal';
import ApexHighlightModal from './ApexHighlightModal';
import ApexChartModal from './ApexChartModal';
import ApexGroupByModal from './ApexGroupByModal';
import ApexPivotModal from './ApexPivotModal';
import ApexSaveReportModal from './ApexSaveReportModal';
import ApexHelpModal from './ApexHelpModal';
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
  IconHelp,
  IconCheck,
  IconCopy,
  IconTrash,
} from './Icons';

/**
 * ApexActionsMenu - Universal Self-Contained Oracle APEX Actions Menu
 *
 * Implements standard report actions everywhere:
 * - Columns: dual-shuttle selection & order
 * - Filter: conditional filter rules
 * - Data -> Sort (multi-column)
 * - Data -> Aggregate (count, sum, avg, min, max)
 * - Data -> Compute (calculated expressions)
 * - Data -> Refresh (reload from data source)
 * - Format -> Control Break (grouping rows)
 * - Format -> Highlight (row formatting with color presets)
 * - Format -> Rows Per Page (10, 25, 50, 100, 500, 1000, All)
 * - Analysis -> Chart, Group By, Pivot
 * - Report -> Save Report, Manage Saved Views, Reset
 * - Download: CSV export
 * - Help: comprehensive interactive report guide
 * - Editable Grid actions (when isEditableGrid=true): Select All, Deselect All, Invert, Copy TSV, Revert, Delete Selected
 *
 * If the parent component supplies custom handlers (like in ApexInteractiveReport),
 * ApexActionsMenu delegates to them. If the parent does not, ApexActionsMenu automatically
 * hosts and manages its own internal modal dialogs and operations seamlessly.
 */
export default function ApexActionsMenu({
  isOpen,
  onClose,
  // Column definitions & Data records
  columns = [],
  data = [],
  reportId = 'report',
  // Direct Action Triggers (Optional: parent-provided modal triggers)
  onOpenColumns,
  onOpenFilter,
  onOpenSort,
  onOpenAggregate,
  onOpenCompute,
  onRefresh,
  onOpenControlBreak,
  onOpenHighlight,
  onOpenChart,
  onOpenGroupBy,
  onOpenPivot,
  onSaveReport,
  onManageReports,
  onResetReport,
  onDownload,
  onChangeRows,
  currentRows = 50,
  onOpenHelp,
  // Application Callbacks (Optional: triggered when modal applies)
  onApplyColumns,
  onApplyFilter,
  onApplySort,
  onApplyAggregate,
  onApplyCompute,
  onApplyControlBreak,
  onApplyHighlight,
  onApplyGroupBy,
  onApplyPivot,
  // Editable Grid props
  isEditableGrid = false,
  onSelectAll,
  onDeselectAll,
  onInvertSelection,
  onCopyToClipboard,
  onRevertEdits,
  onDeleteSelected,
  hasSelection = false,
}) {
  const menuRef = useRef(null);
  const [activeSubmenu, setActiveSubmenu] = useState(null);

  // Active Internal Modal state ('columns', 'filter', 'sort', 'aggregate', 'compute', 'break', 'highlight', 'chart', 'groupby', 'pivot', 'save', 'help')
  const [activeModal, setActiveModal] = useState(null);

  // Internal states for self-contained modal operations
  const [internalVisibleKeys, setInternalVisibleKeys] = useState(() =>
    columns && columns.length > 0 ? columns.map((c) => c.key || c.id) : []
  );
  const [internalSortRules, setInternalSortRules] = useState([]);
  const [internalAggregations, setInternalAggregations] = useState([]);
  const [internalComputations, setInternalComputations] = useState([]);
  const [internalBreakColumn, setInternalBreakColumn] = useState(null);
  const [internalHighlights, setInternalHighlights] = useState([]);
  const [internalGroupBy, setInternalGroupBy] = useState(null);
  const [internalPivot, setInternalPivot] = useState(null);
  const [savedReports, setSavedReports] = useState([]);
  const [activeReportLayoutId, setActiveReportLayoutId] = useState('primary');

  // Load saved layouts from localStorage scoped by reportId
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

  // Derive effective columns if not provided
  const effectiveColumns = useMemo(() => {
    if (Array.isArray(columns) && columns.length > 0) return columns;
    if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object') {
      return Object.keys(data[0])
        .filter((k) => !k.startsWith('_'))
        .map((k) => ({
          key: k,
          id: k,
          label: k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        }));
    }
    return [
      { key: 'id', label: 'ID' },
      { key: 'name', label: 'Name' },
      { key: 'status', label: 'Status' },
      { key: 'created_at', label: 'Created At' },
    ];
  }, [columns, data]);

  // Close dropdown on click outside or Escape key
  useEffect(() => {
    if (!isOpen) {
      setActiveSubmenu(null);
      return;
    }

    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        if (event.target && event.target.closest && event.target.closest('.apex-actions-wrapper')) {
          return;
        }
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

  // Built-in CSV download fallback if not supplied by parent
  const handleDownloadCsvFallback = () => {
    if (onDownload) {
      onDownload();
      return;
    }
    if (!data || data.length === 0) {
      alert('No data to export.');
      return;
    }
    const headers = effectiveColumns.map((c) => c.label || c.key || c.id);
    const lines = [headers.map((h) => `"${String(h).replace(/"/g, '""')}"`).join(',')];
    data.forEach((row) => {
      const line = effectiveColumns.map((col) => {
        let val;
        if (typeof col.getValue === 'function') val = col.getValue(row);
        else val = row[col.key || col.id];
        return `"${String(val !== undefined && val !== null ? val : '').replace(/"/g, '""')}"`;
      });
      lines.push(line.join(','));
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(reportId || 'report').toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Built-in reset fallback
  const handleResetFallback = () => {
    if (onResetReport) {
      onResetReport();
    }
    setInternalSortRules([]);
    setInternalHighlights([]);
    setInternalBreakColumn(null);
    setInternalComputations([]);
    setInternalAggregations([]);
    setActiveReportLayoutId('primary');
  };

  // If menu is closed and no internal modal is open, render nothing
  if (!isOpen && !activeModal) return null;

  return (
    <>
      {/* ACTIONS DROPDOWN MENU */}
      {isOpen && (
        <div className="apex-actions-dropdown" ref={menuRef}>
          {/* Top pointer arrow */}
          <div className="apex-actions-dropdown-arrow" />

          {/* Editable Grid Specific Menu Group (if enabled) */}
          {isEditableGrid && (
            <>
              <div
                className="apex-actions-menu-item with-sub"
                onMouseEnter={() => setActiveSubmenu('selection')}
                onMouseLeave={() => setActiveSubmenu(null)}
              >
                <span className="apex-actions-menu-icon">
                  <IconCheck size={16} />
                </span>
                <span className="apex-actions-menu-label">Selection</span>
                <IconChevronRight size={14} className="apex-actions-menu-chevron" />

                {activeSubmenu === 'selection' && (
                  <div className="apex-actions-flyout-menu">
                    <button
                      type="button"
                      className="apex-actions-flyout-item"
                      onClick={() => {
                        onClose();
                        if (onSelectAll) onSelectAll();
                      }}
                    >
                      <span>Select All Rows</span>
                    </button>
                    <button
                      type="button"
                      className="apex-actions-flyout-item"
                      onClick={() => {
                        onClose();
                        if (onDeselectAll) onDeselectAll();
                      }}
                    >
                      <span>Deselect All</span>
                    </button>
                    <button
                      type="button"
                      className="apex-actions-flyout-item"
                      onClick={() => {
                        onClose();
                        if (onInvertSelection) onInvertSelection();
                      }}
                    >
                      <span>Invert Selection</span>
                    </button>
                    <div className="apex-actions-menu-divider" />
                    <button
                      type="button"
                      className="apex-actions-flyout-item"
                      onClick={() => {
                        onClose();
                        if (onCopyToClipboard) onCopyToClipboard();
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <IconCopy size={14} />
                        <span>Copy to Clipboard (TSV)</span>
                      </span>
                    </button>
                    <button
                      type="button"
                      className="apex-actions-flyout-item"
                      onClick={() => {
                        onClose();
                        if (onRevertEdits) onRevertEdits();
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <IconUndo size={14} />
                        <span>Revert Unsaved Edits</span>
                      </span>
                    </button>
                    {onDeleteSelected && (
                      <button
                        type="button"
                        className="apex-actions-flyout-item"
                        disabled={!hasSelection}
                        style={{ color: hasSelection ? '#ef4444' : '#94a3b8' }}
                        onClick={() => {
                          onClose();
                          if (onDeleteSelected) onDeleteSelected();
                        }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <IconTrash size={14} />
                          <span>Delete Selected Rows</span>
                        </span>
                      </button>
                    )}
                  </div>
                )}
              </div>
              <div className="apex-actions-menu-divider" />
            </>
          )}

          {/* 1. Columns */}
          <button
            type="button"
            className="apex-actions-menu-item"
            onClick={() => {
              onClose();
              if (onOpenColumns) {
                onOpenColumns();
              } else {
                setActiveModal('columns');
              }
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
              if (onOpenFilter) {
                onOpenFilter();
              } else {
                setActiveModal('filter');
              }
            }}
          >
            <span className="apex-actions-menu-icon">
              <IconFilter size={16} />
            </span>
            <span className="apex-actions-menu-label">Filter</span>
          </button>

          {/* 3. Data (Submenu: Sort, Aggregate, Compute, Refresh) */}
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
                    if (onOpenSort) {
                      onOpenSort();
                    } else {
                      setActiveModal('sort');
                    }
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <IconArrowUpDown size={15} />
                    <span>Sort</span>
                  </span>
                </button>

                {/* Aggregate */}
                <button
                  type="button"
                  className="apex-actions-flyout-item"
                  onClick={() => {
                    onClose();
                    if (onOpenAggregate) {
                      onOpenAggregate();
                    } else {
                      setActiveModal('aggregate');
                    }
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
                    if (onOpenCompute) {
                      onOpenCompute();
                    } else {
                      setActiveModal('compute');
                    }
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <IconCalculator size={15} />
                    <span>Compute</span>
                  </span>
                </button>

                {/* Refresh */}
                <button
                  type="button"
                  className="apex-actions-flyout-item"
                  onClick={() => {
                    onClose();
                    if (onRefresh) onRefresh();
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <IconRefresh size={15} />
                    <span>Refresh</span>
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* 4. Format (Submenu: Control Break, Highlight, Rows Per Page) */}
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
                    if (onOpenControlBreak) {
                      onOpenControlBreak();
                    } else {
                      setActiveModal('break');
                    }
                  }}
                >
                  <span>Control Break</span>
                </button>
                <button
                  type="button"
                  className="apex-actions-flyout-item"
                  onClick={() => {
                    onClose();
                    if (onOpenHighlight) {
                      onOpenHighlight();
                    } else {
                      setActiveModal('highlight');
                    }
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
              if (onOpenChart) {
                onOpenChart();
              } else {
                setActiveModal('chart');
              }
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
              if (onOpenGroupBy) {
                onOpenGroupBy();
              } else {
                setActiveModal('groupby');
              }
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
              if (onOpenPivot) {
                onOpenPivot();
              } else {
                setActiveModal('pivot');
              }
            }}
          >
            <span className="apex-actions-menu-icon">
              <IconPivot size={16} />
            </span>
            <span className="apex-actions-menu-label">Pivot</span>
          </button>

          <div className="apex-actions-menu-divider" />

          {/* 8. Report (Submenu: Save Report, Manage Views, Reset) */}
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
                    if (onSaveReport) {
                      onSaveReport();
                    } else {
                      setActiveModal('save');
                    }
                  }}
                >
                  <span>Save Report</span>
                </button>
                <button
                  type="button"
                  className="apex-actions-flyout-item"
                  onClick={() => {
                    onClose();
                    if (onManageReports) {
                      onManageReports();
                    } else {
                      setActiveModal('save');
                    }
                  }}
                >
                  <span>Manage Saved Views</span>
                </button>
                <button
                  type="button"
                  className="apex-actions-flyout-item"
                  onClick={() => {
                    onClose();
                    handleResetFallback();
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
              handleDownloadCsvFallback();
            }}
          >
            <span className="apex-actions-menu-icon">
              <IconDownload size={16} />
            </span>
            <span className="apex-actions-menu-label">Download</span>
          </button>

          {/* 10. Help */}
          <button
            type="button"
            className="apex-actions-menu-item"
            onClick={() => {
              onClose();
              if (onOpenHelp) {
                onOpenHelp();
              } else {
                setActiveModal('help');
              }
            }}
          >
            <span className="apex-actions-menu-icon">
              <IconHelp size={16} />
            </span>
            <span className="apex-actions-menu-label">Help</span>
          </button>
        </div>
      )}

      {/* INTERNAL WORKING MODALS HOSTED BY APEXACTIONSMENU */}

      {/* 1. Columns Modal */}
      {activeModal === 'columns' && (
        <SelectColumnsModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          allColumns={effectiveColumns}
          visibleColumnKeys={internalVisibleKeys.length > 0 ? internalVisibleKeys : effectiveColumns.map((c) => c.key || c.id)}
          onSave={(newKeys) => {
            setInternalVisibleKeys(newKeys);
            setActiveModal(null);
            if (onApplyColumns) onApplyColumns(newKeys);
          }}
        />
      )}

      {/* 2. Filter Modal */}
      {activeModal === 'filter' && (
        <ApexFilterModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          columns={effectiveColumns}
          onApply={(newFilter) => {
            setActiveModal(null);
            if (onApplyFilter) onApplyFilter(newFilter);
          }}
        />
      )}

      {/* 3. Multi-Column Sort Modal */}
      {activeModal === 'sort' && (
        <ApexSortModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          columns={effectiveColumns}
          currentSort={internalSortRules}
          onApplySort={(rules) => {
            setInternalSortRules(rules);
            setActiveModal(null);
            if (onApplySort) onApplySort(rules);
          }}
        />
      )}

      {/* 4. Aggregate Modal */}
      {activeModal === 'aggregate' && (
        <ApexAggregateModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          columns={effectiveColumns}
          aggregations={internalAggregations}
          onApply={(newAgg) => {
            setInternalAggregations((prev) => {
              const idx = prev.findIndex((a) => a.columnKey === newAgg.columnKey);
              if (idx >= 0) {
                const next = [...prev];
                next[idx] = newAgg;
                return next;
              }
              return [...prev, newAgg];
            });
            setActiveModal(null);
            if (onApplyAggregate) onApplyAggregate(newAgg);
          }}
          onDelete={(id) => {
            setInternalAggregations((prev) => prev.filter((a) => a.id !== id));
            setActiveModal(null);
          }}
        />
      )}

      {/* 5. Compute Modal */}
      {activeModal === 'compute' && (
        <ApexComputeModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          columns={effectiveColumns}
          computations={internalComputations}
          onApplyCompute={(newComp) => {
            setInternalComputations((prev) => [...prev, newComp]);
            setActiveModal(null);
            if (onApplyCompute) onApplyCompute(newComp);
          }}
          onDeleteCompute={(id) => {
            setInternalComputations((prev) => prev.filter((c) => c.id !== id));
            setActiveModal(null);
          }}
        />
      )}

      {/* 6. Control Break Modal */}
      {activeModal === 'break' && (
        <ApexControlBreakModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          columns={effectiveColumns}
          currentBreakColumn={internalBreakColumn}
          onApplyControlBreak={(colKey) => {
            setInternalBreakColumn(colKey);
            setActiveModal(null);
            if (onApplyControlBreak) onApplyControlBreak(colKey);
          }}
        />
      )}

      {/* 7. Highlight Modal */}
      {activeModal === 'highlight' && (
        <ApexHighlightModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          columns={effectiveColumns}
          highlights={internalHighlights}
          onApplyHighlight={(newH) => {
            setInternalHighlights((prev) => [...prev, newH]);
            setActiveModal(null);
            if (onApplyHighlight) onApplyHighlight(newH);
          }}
          onDeleteHighlight={(id) => {
            setInternalHighlights((prev) => prev.filter((h) => h.id !== id));
            setActiveModal(null);
          }}
        />
      )}

      {/* 8. Chart Modal */}
      {activeModal === 'chart' && (
        <ApexChartModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          columns={effectiveColumns}
          data={data}
        />
      )}

      {/* 9. Group By Modal */}
      {activeModal === 'groupby' && (
        <ApexGroupByModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          columns={effectiveColumns}
          data={data}
          initialGroupBy={internalGroupBy}
          onApplyGroupBy={(g) => {
            setInternalGroupBy(g);
            setActiveModal(null);
            if (onApplyGroupBy) onApplyGroupBy(g);
          }}
        />
      )}

      {/* 10. Pivot Modal */}
      {activeModal === 'pivot' && (
        <ApexPivotModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          columns={effectiveColumns}
          data={data}
          initialPivot={internalPivot}
          onApplyPivot={(p) => {
            setInternalPivot(p);
            setActiveModal(null);
            if (onApplyPivot) onApplyPivot(p);
          }}
        />
      )}

      {/* 11. Save Report / Manage Views Modal */}
      {activeModal === 'save' && (
        <ApexSaveReportModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          reportId={reportId}
          savedReports={savedReports}
          activeReportId={activeReportLayoutId}
          onSaveReport={(meta) => {
            const nextList = [...savedReports.filter((r) => r.id !== meta.id), meta];
            setSavedReports(nextList);
            setActiveReportLayoutId(meta.id);
            try {
              localStorage.setItem(`apex_ir_saved_layouts_${reportId}`, JSON.stringify(nextList));
            } catch (e) {
              console.warn('Failed to save layout:', e);
            }
          }}
          onSwitchReport={(id) => {
            setActiveReportLayoutId(id);
            if (id === 'primary') {
              handleResetFallback();
            }
          }}
          onDeleteReport={(id) => {
            const nextList = savedReports.filter((r) => r.id !== id);
            setSavedReports(nextList);
            if (activeReportLayoutId === id) setActiveReportLayoutId('primary');
            try {
              localStorage.setItem(`apex_ir_saved_layouts_${reportId}`, JSON.stringify(nextList));
            } catch (e) {
              console.warn('Failed to delete layout:', e);
            }
          }}
        />
      )}

      {/* 12. Help Modal */}
      {activeModal === 'help' && (
        <ApexHelpModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          isEditableGrid={isEditableGrid}
        />
      )}
    </>
  );
}
