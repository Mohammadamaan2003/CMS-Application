import React from 'react';
import {
  IconSearch,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
} from './Icons';
import ApexActionsMenu from './ApexActionsMenu';

/**
 * ApexReportToolbar
 *
 * Universal Oracle APEX Interactive Report Toolbar:
 * - Search input with search icon + "Go" action button
 * - Rows-per-page selector (10, 25, 50, 100, 500, 1000, All)
 * - Standard Actions dropdown menu with full APEX options:
 *   Columns, Filter, Sort, Aggregate, Compute, Refresh, Control Break, Highlight,
 *   Chart, Group By, Pivot, Save Report, Manage Views, Reset, Download CSV, Help.
 * - Editable grid selection and bulk action options when isEditableGrid=true.
 * - Custom page-specific action buttons (children: e.g. "Update Country", "Create", etc.)
 * - Pagination strip ("1 - 50 of 9,634 < >")
 */
export default function ApexReportToolbar({
  columns = [],
  data = [],
  reportId = 'report',
  search = '',
  onSearchChange,
  onSearchSubmit,
  searchPlaceholder = 'Search',
  rows = 50,
  onRowsChange,
  rowsOptions = [10, 25, 50, 100, 500, 1000, 'all'],
  showActions = false,
  onToggleActions,
  onCloseActions,
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
  onOpenHelp,
  // Editable Grid Props
  isEditableGrid = false,
  onSelectAll,
  onDeselectAll,
  onInvertSelection,
  onCopyToClipboard,
  onRevertEdits,
  onDeleteSelected,
  hasSelection = false,
  // Pagination
  page = 1,
  total = 0,
  onPageChange,
  children,
  className = '',
  style = {},
}) {
  const numericRows = rows === 'all' ? (total || 1) : Number(rows) || 50;
  const startIdx = total === 0 ? 0 : (page - 1) * numericRows + 1;
  const endIdx = rows === 'all' ? total : Math.min(page * numericRows, total);
  const totalPages = rows === 'all' || numericRows >= total ? 1 : Math.ceil(total / numericRows);

  return (
    <div
      className={`apex-ir-card apex-report-toolbar ${className}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        marginBottom: '0.75rem',
        padding: '0.5rem 0.75rem',
        borderRadius: '6px',
        ...style,
      }}
    >
      {/* Left side: Search + Go, Rows, Actions, Page-specific action buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        {/* Search with Go */}
        {onSearchChange && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (onSearchSubmit) onSearchSubmit();
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <div style={{ position: 'relative', width: '220px' }}>
              <span
                style={{
                  position: 'absolute',
                  left: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94a3b8',
                  pointerEvents: 'none',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <IconSearch size={15} />
              </span>
              <input
                type="text"
                className="apex-form-input"
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                style={{
                  width: '100%',
                  height: '34px',
                  paddingLeft: '32px',
                  paddingRight: '10px',
                  borderRadius: '4px',
                  fontSize: '0.825rem',
                  outline: 'none',
                }}
              />
            </div>
            <button
              type="submit"
              className="apex-toolbar-go-btn btn-apex-go"
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
        )}

        {/* Rows Selector */}
        {onRowsChange && (
          <div className="apex-rows-select-group" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.825rem' }}>
            <span style={{ fontWeight: 500 }}>Rows</span>
            <select
              className="apex-rows-select"
              value={rows}
              onChange={(e) => {
                const val = e.target.value === 'all' ? 'all' : parseInt(e.target.value, 10);
                onRowsChange(val);
              }}
              style={{
                height: '34px',
                padding: '0 8px',
                borderRadius: '4px',
                fontSize: '0.825rem',
                cursor: 'pointer',
              }}
            >
              {rowsOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt === 'all' ? 'All' : opt}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Actions Dropdown */}
        {onToggleActions && (
          <div className="apex-actions-wrapper" style={{ position: 'relative' }}>
            <button
              type="button"
              className="btn-apex-actions"
              onClick={onToggleActions}
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
              <span>Actions</span>
              <IconChevronDown size={13} />
            </button>

            <ApexActionsMenu
              isOpen={showActions}
              onClose={onCloseActions}
              columns={columns}
              data={data}
              reportId={reportId}
              onOpenColumns={onOpenColumns}
              onOpenFilter={onOpenFilter}
              onOpenSort={onOpenSort}
              onOpenAggregate={onOpenAggregate}
              onOpenCompute={onOpenCompute}
              onRefresh={onRefresh}
              onOpenControlBreak={onOpenControlBreak}
              onOpenHighlight={onOpenHighlight}
              onOpenChart={onOpenChart}
              onOpenGroupBy={onOpenGroupBy}
              onOpenPivot={onOpenPivot}
              onSaveReport={onSaveReport}
              onManageReports={onManageReports}
              onResetReport={onResetReport}
              onDownload={onDownload}
              onOpenHelp={onOpenHelp}
              onChangeRows={onRowsChange}
              currentRows={rows}
              isEditableGrid={isEditableGrid}
              onSelectAll={onSelectAll}
              onDeselectAll={onDeselectAll}
              onInvertSelection={onInvertSelection}
              onCopyToClipboard={onCopyToClipboard}
              onRevertEdits={onRevertEdits}
              onDeleteSelected={onDeleteSelected}
              hasSelection={hasSelection}
            />
          </div>
        )}

        {/* Custom page-specific action buttons */}
        {children}
      </div>

      {/* Right side: Pagination Strip ("1 - 50 of 9,634 < >") */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          color: '#64748b',
          fontSize: '0.8rem',
          fontWeight: 500,
        }}
      >
        <span>
          {total === 0 ? '0 of 0' : `${startIdx.toLocaleString()} - ${endIdx.toLocaleString()} of ${total.toLocaleString()}`}
        </span>
        <div style={{ display: 'inline-flex', gap: '0.2rem' }}>
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange && onPageChange(Math.max(1, page - 1))}
            style={{
              border: 'none',
              background: 'none',
              cursor: page <= 1 ? 'default' : 'pointer',
              opacity: page <= 1 ? 0.3 : 1,
              padding: '2px',
              display: 'flex',
              alignItems: 'center',
            }}
            title="Previous Page"
          >
            <IconChevronLeft size={16} />
          </button>
          <button
            type="button"
            disabled={page >= totalPages || endIdx >= total}
            onClick={() => onPageChange && onPageChange(Math.min(totalPages, page + 1))}
            style={{
              border: 'none',
              background: 'none',
              cursor: page >= totalPages || endIdx >= total ? 'default' : 'pointer',
              opacity: page >= totalPages || endIdx >= total ? 0.3 : 1,
              padding: '2px',
              display: 'flex',
              alignItems: 'center',
            }}
            title="Next Page"
          >
            <IconChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
