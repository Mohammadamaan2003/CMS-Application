import React from 'react';
import Modal from '../../components/Modal';
import {
  IconUsers,
  IconBuilding,
  IconMail,
  IconPhone,
  IconBriefcase,
  IconEdit,
} from '../../components/Icons';

export default function ContactDetailModal({
  isOpen,
  onClose,
  contact,
  onEdit,
  onViewCompany,
}) {
  if (!contact) return null;

  const formatDate = (isoStr) => {
    if (!isoStr) return 'N/A';
    try {
      return new Date(isoStr).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Contact Details"
      maxWidth="600px"
    >
      <div className="modal-body">
        {/* Header Summary */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
          <div>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <IconUsers size={22} style={{ color: 'var(--primary)' }} />
              {contact.first_name} {contact.last_name}
            </h3>
            {contact.job_title && (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
                {contact.job_title}
              </p>
            )}
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => onEdit(contact)}
          >
            <IconEdit size={14} /> Edit Contact
          </button>
        </div>

        {/* Info Grid */}
        <div className="detail-section">
          {/* Email */}
          <div className="detail-item">
            <div className="detail-label">Email Address</div>
            <div className="detail-value">
              <a
                href={`mailto:${contact.email}`}
                style={{ color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <IconMail size={14} /> {contact.email}
              </a>
            </div>
          </div>

          {/* Phone */}
          <div className="detail-item">
            <div className="detail-label">Phone Number</div>
            <div className="detail-value">
              {contact.phone ? (
                <a
                  href={`tel:${contact.phone}`}
                  style={{ color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <IconPhone size={14} /> {contact.phone}
                </a>
              ) : (
                <span style={{ color: 'var(--text-light)' }}>Not specified</span>
              )}
            </div>
          </div>

          {/* Linked Company */}
          <div className="detail-item full-width">
            <div className="detail-label">Associated Company</div>
            <div className="detail-value">
              {contact.company_name ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.2rem' }}>
                  <span className="badge badge-primary">
                    <IconBuilding size={12} /> {contact.company_name}
                  </span>
                  {onViewCompany && contact.company_id && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        onClose();
                        onViewCompany(contact.company_id);
                      }}
                    >
                      View Company Profile
                    </button>
                  )}
                </div>
              ) : (
                <span className="badge badge-muted">Unassigned (No Company)</span>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="detail-item full-width">
            <div className="detail-label">Notes</div>
            <div className="detail-value" style={{ whiteSpace: 'pre-wrap' }}>
              {contact.notes || <span style={{ color: 'var(--text-light)' }}>No notes recorded for this contact.</span>}
            </div>
          </div>

          {/* Created Date */}
          <div className="detail-item">
            <div className="detail-label">Created Date</div>
            <div className="detail-value" style={{ fontSize: '0.85rem' }}>
              {formatDate(contact.created_at)}
            </div>
          </div>

          {/* Last Updated */}
          <div className="detail-item">
            <div className="detail-label">Last Updated</div>
            <div className="detail-value" style={{ fontSize: '0.85rem' }}>
              {formatDate(contact.updated_at)}
            </div>
          </div>
        </div>
      </div>

      <div className="modal-footer">
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Close
        </button>
      </div>
    </Modal>
  );
}

