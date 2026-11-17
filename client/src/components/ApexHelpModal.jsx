import React, { useState } from 'react';
import { IconClose, IconHelp, IconColumns, IconFilter, IconTable, IconWrench, IconBarChart, IconGroupBy, IconPivot, IconBookmark, IconDownload, IconUndo, IconRefresh } from './Icons';

/**
 * ApexHelpModal - Help dialog explaining Actions menu options and capabilities.
 */
export default function ApexHelpModal({
  isOpen,
  onClose,
  isEditableGrid = false,
}) {
  const [activeTab, setActiveTab] = useState('overview');

  if (!isOpen) return null;

  return (
    <div className="apex-modal-overlay" style={{ zIndex: 1250 }}>
      <div
        className="apex-modal-card apex-modal-container"
        style={{
          maxWidth: '640px',
          width: '92%',
          maxHeight: '85vh',
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          boxShadow: '0 20px 45px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header matching Oracle APEX Reference */}
        <div
          className="apex-modal-header"
          style={{
            padding: '14px 20px',
            borderBottom: '1px solid #f1f5f9',
            backgroundColor: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div className="apex-modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#1e293b' }}>
              Help
            </h3>
          </div>
          <button
            type="button"
            className="apex-modal-close"
            onClick={onClose}
            aria-label="Close"
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              border: '1px solid #e2e8f0',
              background: '#ffffff',
              color: '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              transition: 'all 0.15s ease',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#f1f5f9';
              e.currentTarget.style.color = '#0f172a';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = '#ffffff';
              e.currentTarget.style.color = '#64748b';
            }}
          >
            <IconClose size={14} />
          </button>
        </div>

        {/* Tab Strip with Purple Active Accent */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', backgroundColor: '#ffffff', padding: '0 1rem' }}>
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'data', label: 'Data & Format' },
            { id: 'analysis', label: 'Analysis' },
            { id: 'reports', label: 'Report Views' },
            ...(isEditableGrid ? [{ id: 'grid', label: 'Grid Actions' }] : []),
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '0.65rem 0.95rem',
                border: 'none',
                background: 'none',
                borderBottom: activeTab === tab.id ? '2px solid #7048e8' : '2px solid transparent',
                color: activeTab === tab.id ? '#7048e8' : '#64748b',
                fontWeight: activeTab === tab.id ? 700 : 500,
                fontSize: '0.825rem',
                cursor: 'pointer',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ padding: '1.25rem', overflowY: 'auto', flex: 1, fontSize: '0.85rem', lineHeight: '1.5', color: '#334155' }}>
          {activeTab === 'overview' && (
            <div>
              <h4 style={{ margin: '0 0 0.5rem 0', color: '#0f172a', fontSize: '0.925rem' }}>Interactive Report Features</h4>
              <p style={{ margin: '0 0 0.75rem 0' }}>
                The <strong>Actions</strong> menu provides enterprise controls to customize the display, filter, sort, analyze, and export records in this report.
              </p>
              <ul style={{ paddingLeft: '1.25rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <li>
                  <strong>Columns:</strong> Show or hide individual data columns and reorder them using the dual-shuttle selector.
                </li>
                <li>
                  <strong>Filter:</strong> Define custom row filters with operators (contains, equals, starts with, ends with, is null, is not null).
                </li>
                <li>
                  <strong>Download:</strong> Export current report records and applied filters to a CSV file.
                </li>
                <li>
                  <strong>Help:</strong> View documentation on all available report actions and tools.
                </li>
              </ul>
            </div>
          )}

          {activeTab === 'data' && (
            <div>
              <h4 style={{ margin: '0 0 0.5rem 0', color: '#0f172a', fontSize: '0.925rem' }}>Data & Formatting Options</h4>
              <ul style={{ paddingLeft: '1.25rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <li>
                  <strong>Data → Sort:</strong> Sort by up to 3 columns simultaneously in ascending or descending order, with customizable nulls handling (first or last).
                </li>
                <li>
                  <strong>Data → Aggregate:</strong> Calculate mathematical summaries (Count, Sum, Average, Minimum, Maximum) across records, displayed in the report footer.
                </li>
                <li>
                  <strong>Data → Compute:</strong> Create custom calculated display columns (e.g. multiplying numeric fields, adding constant offsets, or string concatenation).
                </li>
                <li>
                  <strong>Data → Refresh:</strong> Reload the latest records directly from the database while preserving your active view configuration.
                </li>
                <li>
                  <strong>Format → Control Break:</strong> Group report records hierarchically by distinct values of a designated column with custom visual break headers.
                </li>
                <li>
                  <strong>Format → Highlight:</strong> Dynamically highlight matching rows with custom color presets based on rule criteria.
                </li>
                <li>
                  <strong>Format → Rows Per Page:</strong> Adjust display pagination density (10, 25, 50, 100, 500, 1000, or All Rows).
                </li>
              </ul>
            </div>
          )}

          {activeTab === 'analysis' && (
            <div>
              <h4 style={{ margin: '0 0 0.5rem 0', color: '#0f172a', fontSize: '0.925rem' }}>Analytical Visualizations</h4>
              <ul style={{ paddingLeft: '1.25rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <li>
                  <strong>Chart:</strong> Visualize the distribution of categorical column values via an interactive frequency bar chart.
                </li>
                <li>
                  <strong>Group By:</strong> Collapse report rows into aggregated groups with summary metrics (Count, Sum, Average, Min, Max).
                </li>
                <li>
                  <strong>Pivot:</strong> Generate a two-dimensional cross-tabulated matrix across row and column dimensions with metric summarization.
                </li>
              </ul>
            </div>
          )}

          {activeTab === 'reports' && (
            <div>
              <h4 style={{ margin: '0 0 0.5rem 0', color: '#0f172a', fontSize: '0.925rem' }}>Saved Reports & Reset</h4>
              <ul style={{ paddingLeft: '1.25rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <li>
                  <strong>Save Report:</strong> Save your current column arrangement, active filters, sorting rules, and formatting settings as a named report layout.
                </li>
                <li>
                  <strong>Manage Views:</strong> Switch between saved layouts or delete obsolete views. Saved layouts are scoped to this specific report.
                </li>
                <li>
                  <strong>Reset:</strong> Clear all filters, sorting rules, aggregations, control breaks, highlights, and computed columns, restoring the default system view. <em>Reset never modifies or deletes underlying database records.</em>
                </li>
              </ul>
            </div>
          )}

          {activeTab === 'grid' && isEditableGrid && (
            <div>
              <h4 style={{ margin: '0 0 0.5rem 0', color: '#0f172a', fontSize: '0.925rem' }}>Editable Grid Selection & Bulk Actions</h4>
              <ul style={{ paddingLeft: '1.25rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <li>
                  <strong>Select / Deselect / Invert:</strong> Bulk select staging rows for operations or export.
                </li>
                <li>
                  <strong>Copy to Clipboard:</strong> Copy selected or all grid records formatted as Tab-Separated Values (TSV) ready for Excel or spreadsheets.
                </li>
                <li>
                  <strong>Revert Edits:</strong> Discard uncommitted staged changes and restore the initial uploaded dataset.
                </li>
                <li>
                  <strong>Delete Selected:</strong> Remove marked staged rows with confirmation.
                </li>
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="apex-modal-footer"
          style={{
            padding: '12px 20px',
            borderTop: '1px solid #f1f5f9',
            display: 'flex',
            justifyContent: 'flex-end',
            backgroundColor: '#ffffff',
          }}
        >
          <button
            type="button"
            className="apex-modal-cancel-btn"
            onClick={onClose}
            style={{
              height: '34px',
              padding: '0 18px',
              borderRadius: '6px',
              border: '1px solid #e2e8f0',
              background: '#ffffff',
              color: '#475569',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background-color 0.15s ease',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
