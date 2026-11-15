import React from 'react';
import {
  IconUsers,
  IconSearch,
  IconPlus,
  IconEye,
  IconEdit,
  IconTrash,
  IconMail,
  IconPhone,
  IconBuilding,
} from '../../components/Icons';

export default function ContactList({
  contacts,
  companies,
  searchQuery,
  onSearchChange,
  companyFilter,
  onCompanyFilterChange,
  onOpenCreate,
  onOpenEdit,
  onOpenDetail,
  onOpenDelete,
  onViewCompany,
  isLoading,
}) {
  const formatDate = (isoStr) => {
    if (!isoStr) return '—';
    try {
      return new Date(isoStr).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div>
      {/* Top Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Contacts</h1>
          <p className="page-subtitle">
            Manage your personal and business contacts, link them to companies, and maintain communication records.
          </p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={onOpenCreate}>
            <IconPlus size={18} />
            <span>Add Contact</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="filter-bar">
        <div style={{ display: 'flex', flex: 1, gap: '0.75rem', flexWrap: 'wrap' }}>
          <div className="search-input-wrapper" style={{ flex: '1 1 280px' }}>
            <IconSearch className="search-icon" size={18} />
            <input
              type="text"
              className="search-input"
              placeholder="Search contacts by name, email, phone, job title..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>

          <div style={{ minWidth: '180px' }}>
            <select
              className="form-select"
              value={companyFilter}
              onChange={(e) => onCompanyFilterChange(e.target.value)}
              style={{ height: '100%', padding: '0.55rem 0.85rem' }}
            >
              <option value="">All Companies</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          Showing <strong>{contacts.length}</strong> {contacts.length === 1 ? 'contact' : 'contacts'}
        </div>
      </div>

      {/* Contacts Table */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          Loading contacts...
        </div>
      ) : contacts.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-icon-wrapper">
            <IconUsers size={28} />
          </div>
          <h3 className="empty-title">
            {searchQuery || companyFilter ? 'No matching contacts found' : 'No contacts yet'}
          </h3>
          <p className="empty-desc">
            {searchQuery || companyFilter
              ? 'Try adjusting your search criteria or company filter.'
              : 'Add your first contact to track leads, clients, and partners.'}
          </p>
          {!searchQuery && !companyFilter && (
            <button className="btn btn-primary" onClick={onOpenCreate}>
              <IconPlus size={18} />
              <span>Add Your First Contact</span>
            </button>
          )}
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Contact Name</th>
                <th>Job Title</th>
                <th>Linked Company</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Created</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((contact) => (
                <tr key={contact.id}>
                  <td>
                    <button
                      type="button"
                      onClick={() => onOpenDetail(contact.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                        textAlign: 'left',
                        fontWeight: 600,
                        color: 'var(--text-main)',
                      }}
                      onMouseOver={(e) => (e.currentTarget.style.color = 'var(--primary)')}
                      onMouseOut={(e) => (e.currentTarget.style.color = 'var(--text-main)')}
                    >
                      {contact.first_name} {contact.last_name}
                    </button>
                  </td>
                  <td>{contact.job_title || <span style={{ color: 'var(--text-light)' }}>—</span>}</td>
                  <td>
                    {contact.company_name ? (
                      <button
                        type="button"
                        onClick={() => onViewCompany(contact.company_id)}
                        className="badge badge-primary"
                        style={{ border: 'none', cursor: 'pointer', textDecoration: 'none' }}
                        title="View company profile"
                      >
                        <IconBuilding size={12} />
                        {contact.company_name}
                      </button>
                    ) : (
                      <span className="badge badge-muted">Unassigned</span>
                    )}
                  </td>
                  <td>
                    <a
                      href={`mailto:${contact.email}`}
                      style={{ color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                      <IconMail size={14} style={{ color: 'var(--text-light)' }} />
                      {contact.email}
                    </a>
                  </td>
                  <td>
                    {contact.phone ? (
                      <a
                        href={`tel:${contact.phone}`}
                        style={{ color: 'var(--text-main)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                      >
                        <IconPhone size={14} style={{ color: 'var(--text-light)' }} />
                        {contact.phone}
                      </a>
                    ) : (
                      <span style={{ color: 'var(--text-light)' }}>—</span>
                    )}
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    {formatDate(contact.created_at)}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.25rem' }}>
                      <button
                        type="button"
                        className="btn-icon"
                        title="View Contact Details"
                        onClick={() => onOpenDetail(contact.id)}
                      >
                        <IconEye size={17} />
                      </button>
                      <button
                        type="button"
                        className="btn-icon"
                        title="Edit Contact"
                        onClick={() => onOpenEdit(contact)}
                      >
                        <IconEdit size={17} />
                      </button>
                      <button
                        type="button"
                        className="btn-icon delete"
                        title="Delete Contact"
                        onClick={() => onOpenDelete(contact)}
                      >
                        <IconTrash size={17} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

