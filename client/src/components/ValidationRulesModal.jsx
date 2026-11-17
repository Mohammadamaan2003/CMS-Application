import React from 'react';
import { IconClose } from './Icons';

export default function ValidationRulesModal({ isOpen, onClose, type = 'company' }) {
  if (!isOpen) return null;

  const isContact = type === 'contact';

  return (
    <div className="apex-modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div
        className="apex-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '680px',
          width: '90%',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--bg-surface, #ffffff)',
          color: 'var(--text-main, #0f172a)',
          borderRadius: '12px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.2)',
          border: '1px solid var(--border, #cbd5e1)',
          overflow: 'hidden',
        }}
      >
        {/* Modal Header */}
        <div
          className="apex-modal-header"
          style={{
            padding: '1rem 1.25rem',
            borderBottom: '1px solid var(--border, #e2e8f0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'var(--bg-panel, #f8fafc)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                backgroundColor: 'rgba(37, 99, 235, 0.15)',
                color: '#2563eb',
                fontWeight: 700,
                fontSize: '0.85rem',
              }}
            >
              ℹ
            </span>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600 }}>
              {isContact ? 'Contact Upload Guidelines' : 'Before You Upload — Company Validation Rules'}
            </h3>
          </div>
          <button
            type="button"
            className="apex-close-btn"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted, #64748b)',
              padding: '4px',
              display: 'flex',
            }}
          >
            <IconClose size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div
          className="apex-modal-body"
          style={{
            padding: '1.25rem 1.5rem',
            overflowY: 'auto',
            fontSize: '0.875rem',
            lineHeight: 1.5,
          }}
        >
          {!isContact ? (
            /* COMPANY VALIDATION RULES (Direct from Oracle APEX Page 51 Region "Before You Upload") */
            <div className="upload-guide" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* INSERT MODE */}
              <div
                className="guide-mode"
                style={{
                  border: '1px solid var(--border, #e2e8f0)',
                  borderRadius: '8px',
                  padding: '1rem',
                  backgroundColor: 'var(--bg-subtle, rgba(37, 99, 235, 0.03))',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '0.85rem',
                    fontWeight: 700,
                  }}
                >
                  <span
                    style={{
                      backgroundColor: '#16a34a',
                      color: '#ffffff',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      letterSpacing: '0.04em',
                    }}
                  >
                    INSERT
                  </span>
                  <span style={{ fontSize: '0.95rem' }}>New Company Records</span>
                </div>

                {/* Basic Information */}
                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-main, #0f172a)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
                    <span style={{ color: '#2563eb' }}>ℹ</span> Basic Information
                  </div>
                  <ul style={{ margin: '0 0 0 1.25rem', padding: 0 }}>
                    <li style={{ marginBottom: '0.25rem' }}>
                      <b>Company Name</b> must be provided.
                    </li>
                  </ul>
                </div>

                {/* Master Data */}
                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-main, #0f172a)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
                    <span style={{ color: '#2563eb' }}>ℹ</span> Master Data
                  </div>
                  <ul style={{ margin: '0 0 0 1.25rem', padding: 0 }}>
                    <li style={{ marginBottom: '0.25rem' }}><b>Country</b> must exist in the Country master.</li>
                    <li style={{ marginBottom: '0.25rem' }}><b>Company Type</b> must exist in the Company Type master.</li>
                    <li style={{ marginBottom: '0.25rem' }}><b>Company Category</b> must exist in the Company Category master.</li>
                    <li style={{ marginBottom: '0.25rem' }}><b>Employee Size</b> must exist in the Company Size master.</li>
                    <li style={{ marginBottom: '0.25rem' }}><b>Industry</b> must exist in the Industry master.</li>
                    <li style={{ marginBottom: '0.25rem' }}><b>Sales Person</b> must exist in the Sales Person master.</li>
                  </ul>
                </div>

                {/* Contact & Company Details */}
                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-main, #0f172a)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
                    <span style={{ color: '#2563eb' }}>ℹ</span> Contact & Company Details
                  </div>
                  <ul style={{ margin: '0 0 0 1.25rem', padding: 0 }}>
                    <li style={{ marginBottom: '0.25rem' }}><b>Company Phone</b> must be Numeric.</li>
                  </ul>
                </div>

                {/* Duplicate Checks */}
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-main, #0f172a)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
                    <span style={{ color: '#2563eb' }}>ℹ</span> Duplicate Checks
                  </div>
                  <ul style={{ margin: '0 0 0 1.25rem', padding: 0 }}>
                    <li style={{ marginBottom: '0.25rem' }}>Duplicate <b>Company Names</b> within the uploaded file are rejected.</li>
                    <li style={{ marginBottom: '0.25rem' }}>Duplicate <b>Websites</b> within the uploaded file are rejected.</li>
                  </ul>
                </div>
              </div>

              {/* UPDATE MODE */}
              <div
                className="guide-mode update-mode"
                style={{
                  border: '1px solid var(--border, #e2e8f0)',
                  borderRadius: '8px',
                  padding: '1rem',
                  backgroundColor: 'var(--bg-subtle, rgba(37, 99, 235, 0.03))',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '0.85rem',
                    fontWeight: 700,
                  }}
                >
                  <span
                    style={{
                      backgroundColor: '#2563eb',
                      color: '#ffffff',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      letterSpacing: '0.04em',
                    }}
                  >
                    UPDATE
                  </span>
                  <span style={{ fontSize: '0.95rem' }}>Existing Company Records</span>
                </div>

                <div style={{ marginBottom: '0.5rem' }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-main, #0f172a)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
                    <span style={{ color: '#2563eb' }}>ℹ</span> Update-Specific Rules
                  </div>
                  <ul style={{ margin: '0 0 0 1.25rem', padding: 0 }}>
                    <li style={{ marginBottom: '0.25rem' }}><b>Company ID</b> must exist in the system.</li>
                    <li style={{ marginBottom: '0.25rem' }}><b>Company Name</b> must not belong to another Company.</li>
                    <li style={{ marginBottom: '0.25rem' }}><b>Website</b> must not belong to another Company.</li>
                  </ul>
                </div>
              </div>

              {/* FOOTER NOTE */}
              <div
                className="guide-footer"
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                  padding: '0.85rem 1rem',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(37, 99, 235, 0.08)',
                  border: '1px solid rgba(37, 99, 235, 0.2)',
                }}
              >
                <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>💡</span>
                <div>
                  <strong style={{ display: 'block', marginBottom: '0.25rem' }}>
                    Don't worry about fixing everything manually.
                  </strong>
                  <p style={{ margin: 0, color: 'var(--text-muted, #64748b)', fontSize: '0.825rem' }}>
                    Your file is validated before any data is imported. Invalid rows are marked with an error reason and valid rows are safely prepared for import.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* CONTACT VALIDATION RULES (Direct from Oracle APEX Page 58 Region "contact_upload_guidelines") */
            <div className="upload-guide" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* INSERT MODE */}
              <div
                className="guide-mode"
                style={{
                  border: '1px solid var(--border, #e2e8f0)',
                  borderRadius: '8px',
                  padding: '1rem',
                  backgroundColor: 'var(--bg-subtle, rgba(37, 99, 235, 0.03))',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '0.85rem',
                    fontWeight: 700,
                  }}
                >
                  <span
                    style={{
                      backgroundColor: '#16a34a',
                      color: '#ffffff',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      letterSpacing: '0.04em',
                    }}
                  >
                    INSERT
                  </span>
                  <span style={{ fontSize: '0.95rem' }}>New Contact Records</span>
                </div>

                {/* Master Data */}
                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-main, #0f172a)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
                    <span style={{ color: '#2563eb' }}>ℹ</span> Master Data
                  </div>
                  <ul style={{ margin: '0 0 0 1.25rem', padding: 0 }}>
                    <li style={{ marginBottom: '0.25rem' }}>
                      <b>Designation & Position</b> must exist in the Designation & Position master.
                    </li>
                    <li style={{ marginBottom: '0.25rem' }}>
                      <b>Sales Person</b> must exist in the Sales Person master Or It should be Blank.
                    </li>
                    <li style={{ marginBottom: '0.25rem' }}>
                      <b>Source</b> must exist in the Source master Or It should be Blank.
                    </li>
                  </ul>
                </div>

                {/* Contact & Company Details */}
                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-main, #0f172a)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
                    <span style={{ color: '#2563eb' }}>ℹ</span> Contact & Company Details
                  </div>
                  <ul style={{ margin: '0 0 0 1.25rem', padding: 0 }}>
                    <li style={{ marginBottom: '0.25rem' }}><b>Company ID</b> must exist in the system.</li>
                    <li style={{ marginBottom: '0.25rem' }}><b>Contact Phone and Mobile</b> must be numeric.</li>
                  </ul>
                </div>

                {/* Duplicate Checks */}
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-main, #0f172a)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
                    <span style={{ color: '#2563eb' }}>ℹ</span> Duplicate Check
                  </div>
                  <ul style={{ margin: '0 0 0 1.25rem', padding: 0 }}>
                    <li style={{ marginBottom: '0.25rem' }}>Duplicate <b>LinkedIn URL</b> within the uploaded file are rejected.</li>
                    <li style={{ marginBottom: '0.25rem' }}>Duplicate <b>Email</b> within the uploaded file are rejected.</li>
                  </ul>
                </div>
              </div>

              {/* UPDATE MODE */}
              <div
                className="guide-mode update-mode"
                style={{
                  border: '1px solid var(--border, #e2e8f0)',
                  borderRadius: '8px',
                  padding: '1rem',
                  backgroundColor: 'var(--bg-subtle, rgba(37, 99, 235, 0.03))',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '0.85rem',
                    fontWeight: 700,
                  }}
                >
                  <span
                    style={{
                      backgroundColor: '#2563eb',
                      color: '#ffffff',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      letterSpacing: '0.04em',
                    }}
                  >
                    UPDATE
                  </span>
                  <span style={{ fontSize: '0.95rem' }}>Existing Contact Records</span>
                </div>

                <div style={{ marginBottom: '0.5rem' }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-main, #0f172a)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
                    <span style={{ color: '#2563eb' }}>ℹ</span> Update-Specific Rules
                  </div>
                  <ul style={{ margin: '0 0 0 1.25rem', padding: 0 }}>
                    <li style={{ marginBottom: '0.25rem' }}><b>Contact ID</b> must exist in the system.</li>
                  </ul>
                </div>
              </div>

              {/* FOOTER NOTE */}
              <div
                className="guide-footer"
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                  padding: '0.85rem 1rem',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(37, 99, 235, 0.08)',
                  border: '1px solid rgba(37, 99, 235, 0.2)',
                }}
              >
                <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>💡</span>
                <div>
                  <strong style={{ display: 'block', marginBottom: '0.25rem' }}>
                    Don't worry about fixing everything manually.
                  </strong>
                  <p style={{ margin: 0, color: 'var(--text-muted, #64748b)', fontSize: '0.825rem' }}>
                    Your file is validated before any data is imported. Invalid rows are marked with an error reason and valid rows are safely prepared for import.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          className="apex-modal-footer"
          style={{
            padding: '0.85rem 1.25rem',
            borderTop: '1px solid var(--border, #e2e8f0)',
            display: 'flex',
            justifyContent: 'flex-end',
            backgroundColor: 'var(--bg-panel, #f8fafc)',
          }}
        >
          <button
            type="button"
            className="btn-primary"
            onClick={onClose}
            style={{
              padding: '0.5rem 1.25rem',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export function CompanyValidationRulesModal({ isOpen, onClose }) {
  return <ValidationRulesModal isOpen={isOpen} onClose={onClose} type="company" />;
}

export function ContactValidationRulesModal({ isOpen, onClose }) {
  return <ValidationRulesModal isOpen={isOpen} onClose={onClose} type="contact" />;
}
