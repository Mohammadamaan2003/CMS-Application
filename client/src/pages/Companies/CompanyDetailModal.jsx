import React, { useMemo } from 'react';
import Modal from '../../components/Modal';
import ApexInteractiveReport from '../../components/ApexInteractiveReport';
import {
  IconBuilding,
  IconGlobe,
  IconPhone,
  IconBriefcase,
  IconUsers,
  IconEdit,
  IconPlus,
} from '../../components/Icons';

export default function CompanyDetailModal({
  isOpen,
  onClose,
  company,
  onEdit,
  onAddContact,
}) {
  const companyContactColumns = useMemo(() => [
    {
      key: 'name',
      label: 'Name',
      minWidth: '150px',
      getValue: (c) => `${c.first_name || ''} ${c.last_name || ''}`.trim(),
      render: (c) => (
        <span style={{ fontWeight: 600 }}>
          {c.first_name} {c.last_name}
        </span>
      ),
    },
    {
      key: 'job_title',
      label: 'Job Title',
      minWidth: '130px',
      getValue: (c) => c.job_title || '',
    },
    {
      key: 'email',
      label: 'Email',
      minWidth: '160px',
      getValue: (c) => c.email || '',
      render: (c) => (
        c.email ? (
          <a href={`mailto:${c.email}`} style={{ color: '#0284c7' }}>
            {c.email}
          </a>
        ) : '—'
      ),
    },
    {
      key: 'phone',
      label: 'Phone',
      minWidth: '120px',
      getValue: (c) => c.phone || '',
    },
  ], []);

  if (!company) return null;

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

  const contacts = company.contacts || [];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Company Details"
      maxWidth="680px"
    >
      <div className="modal-body">
        {/* Header Summary */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
          <div>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <IconBuilding size={24} style={{ color: 'var(--primary)' }} />
              {company.name}
            </h3>
            {company.industry && (
              <span className="badge badge-industry" style={{ marginTop: '0.4rem' }}>
                {company.industry}
              </span>
            )}
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => onEdit(company)}
          >
            <IconEdit size={14} /> Edit Company
          </button>
        </div>

        {/* Info Grid */}
        <div className="detail-section" style={{ marginBottom: '1.75rem' }}>
          <div className="detail-item">
            <div className="detail-label">Website</div>
            <div className="detail-value">
              {company.website ? (
                <a
                  href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <IconGlobe size={14} /> {company.website}
                </a>
              ) : (
                <span style={{ color: 'var(--text-light)' }}>Not specified</span>
              )}
            </div>
          </div>

          <div className="detail-item">
            <div className="detail-label">Phone</div>
            <div className="detail-value">
              {company.phone ? (
                <a
                  href={`tel:${company.phone}`}
                  style={{ color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <IconPhone size={14} /> {company.phone}
                </a>
              ) : (
                <span style={{ color: 'var(--text-light)' }}>Not specified</span>
              )}
            </div>
          </div>

          <div className="detail-item full-width">
            <div className="detail-label">Office Address</div>
            <div className="detail-value">
              {company.address || <span style={{ color: 'var(--text-light)' }}>Not specified</span>}
            </div>
          </div>

          <div className="detail-item full-width">
            <div className="detail-label">Notes</div>
            <div className="detail-value" style={{ whiteSpace: 'pre-wrap' }}>
              {company.notes || <span style={{ color: 'var(--text-light)' }}>No notes recorded for this company.</span>}
            </div>
          </div>

          <div className="detail-item">
            <div className="detail-label">Created Date</div>
            <div className="detail-value" style={{ fontSize: '0.85rem' }}>
              {formatDate(company.created_at)}
            </div>
          </div>

          <div className="detail-item">
            <div className="detail-label">Last Updated</div>
            <div className="detail-value" style={{ fontSize: '0.85rem' }}>
              {formatDate(company.updated_at)}
            </div>
          </div>
        </div>

        {/* Linked Contacts Section */}
        <div>
          <ApexInteractiveReport
            columns={companyContactColumns}
            data={contacts}
            rowsPerPage={10}
            emptyMessage={`No contacts currently linked to ${company.name}.`}
            toolbarButtons={
              onAddContact && (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => onAddContact(company.id)}
                >
                  <IconPlus size={14} /> Add Contact Here
                </button>
              )
            }
          />
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

