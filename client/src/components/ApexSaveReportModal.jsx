import React, { useState } from 'react';
import { IconClose, IconBookmark, IconTrash } from './Icons';

/**
 * ApexSaveReportModal - Report -> Save / Manage Saved Reports
 * Allows saving current layout, switching between named reports, and deleting saved views.
 */
export default function ApexSaveReportModal({
  isOpen,
  onClose,
  reportId = 'default_report',
  savedReports = [],
  activeReportId = 'primary',
  onSaveReport,
  onSwitchReport,
  onDeleteReport,
}) {
  const [reportName, setReportName] = useState('');
  const [description, setDescription] = useState('');

  if (!isOpen) return null;

  const handleSave = (e) => {
    e.preventDefault();
    if (!reportName.trim()) {
      alert('Please enter a name for this saved report view.');
      return;
    }
    if (onSaveReport) {
      onSaveReport({
        id: `layout_${Date.now()}`,
        name: reportName.trim(),
        description: description.trim(),
        createdAt: new Date().toISOString(),
      });
    }
    setReportName('');
    setDescription('');
    onClose();
  };

  return (
    <div className="apex-modal-overlay" style={{ zIndex: 1200 }}>
      <div
        className="apex-modal-card apex-modal-container"
        style={{
          maxWidth: '560px',
          width: '92%',
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          boxShadow: '0 20px 45px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
        }}
      >
        <div
          className="apex-modal-header"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 20px',
            borderBottom: '1px solid #f1f5f9',
            backgroundColor: '#ffffff',
          }}
        >
          <div className="apex-modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#1e293b' }}>
              Save Report
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

        <div className="apex-modal-body" style={{ padding: '1.25rem' }}>
          {/* Section 1: Save Current View */}
          <form onSubmit={handleSave} style={{ marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1.25rem' }}>
            <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>
              Save Current View
            </h4>
            <p style={{ margin: '0 0 0.75rem', fontSize: '0.8rem', color: '#64748b' }}>
              Save your current visible columns, filters, sorts, and highlighting as a named view.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                  Report Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. High Priority, Gulf Region, Q3 Review"
                  value={reportName}
                  onChange={(e) => setReportName(e.target.value)}
                  className="apex-form-input"
                  style={{ width: '100%' }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                  Description (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Notes about this view..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="apex-form-input"
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                  type="submit"
                  className="apex-modal-apply-btn"
                  style={{
                    height: '34px',
                    padding: '0 20px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: '#7048e8',
                    color: '#ffffff',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 1px 3px rgba(112, 72, 232, 0.35)',
                    transition: 'background-color 0.15s ease',
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#5f3dc4')}
                  onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#7048e8')}
                >
                  Save View
                </button>
              </div>
            </div>
          </form>

          {/* Section 2: Manage Saved Views */}
          <div>
            <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>
              Available Views
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {/* Primary Default View */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  backgroundColor: activeReportId === 'primary' ? '#f0fdf4' : '#f8fafc',
                  border: activeReportId === 'primary' ? '1px solid #86efac' : '1px solid #e2e8f0',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#0f172a' }}>
                    1. Primary Report (Default)
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    System default columns and layout
                  </div>
                </div>
                {activeReportId !== 'primary' ? (
                  <button
                    type="button"
                    className="apex-btn apex-btn-secondary"
                    style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                    onClick={() => {
                      if (onSwitchReport) onSwitchReport('primary');
                      onClose();
                    }}
                  >
                    Switch to Default
                  </button>
                ) : (
                  <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 700 }}>
                    Active View
                  </span>
                )}
              </div>

              {/* User Saved Layouts */}
              {savedReports.map((item, idx) => {
                const isActive = activeReportId === item.id;
                return (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      backgroundColor: isActive ? '#f0fdf4' : '#ffffff',
                      border: isActive ? '1px solid #86efac' : '1px solid #e2e8f0',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#0f172a' }}>
                        {idx + 2}. {item.name}
                      </div>
                      {item.description && (
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          {item.description}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {isActive ? (
                        <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 700 }}>
                          Active View
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="apex-btn apex-btn-secondary"
                          style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                          onClick={() => {
                            if (onSwitchReport) onSwitchReport(item.id);
                            onClose();
                          }}
                        >
                          Switch
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Delete saved view "${item.name}"? (Underlying database records will NOT be deleted).`)) {
                            if (onDeleteReport) onDeleteReport(item.id);
                          }
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#ef4444',
                          cursor: 'pointer',
                          padding: '4px',
                        }}
                        title="Delete view configuration"
                      >
                        <IconTrash size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

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
