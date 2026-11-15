import React, { useState } from 'react';
import {
  IconBuilding,
  IconSearch,
  IconPlus,
  IconEye,
  IconEdit,
  IconTrash,
  IconGlobe,
  IconPhone,
  IconUsers,
} from '../../components/Icons';

export default function CompanyList({
  companies,
  searchQuery,
  onSearchChange,
  onOpenCreate,
  onOpenEdit,
  onOpenDetail,
  onOpenDelete,
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
          <h1 className="page-title">Companies</h1>
          <p className="page-subtitle">
            Manage your client accounts, partner organizations, and business profiles.
          </p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={onOpenCreate}>
            <IconPlus size={18} />
            <span>Add Company</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="filter-bar">
        <div className="search-input-wrapper">
          <IconSearch className="search-icon" size={18} />
          <input
            type="text"
            className="search-input"
            placeholder="Search companies by name, industry, phone, or website..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          Showing <strong>{companies.length}</strong> {companies.length === 1 ? 'company' : 'companies'}
        </div>
      </div>

      {/* Companies Table */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          Loading companies...
        </div>
      ) : companies.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-icon-wrapper">
            <IconBuilding size={28} />
          </div>
          <h3 className="empty-title">
            {searchQuery ? 'No matching companies found' : 'No companies yet'}
          </h3>
          <p className="empty-desc">
            {searchQuery
              ? `No companies matched "${searchQuery}". Try a different keyword.`
              : 'Get started by creating your first company profile to link contacts.'}
          </p>
          {!searchQuery && (
            <button className="btn btn-primary" onClick={onOpenCreate}>
              <IconPlus size={18} />
              <span>Add Your First Company</span>
            </button>
          )}
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Company Name</th>
                <th>Industry</th>
                <th>Phone</th>
                <th>Website</th>
                <th>Contacts</th>
                <th>Created</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((company) => (
                <tr key={company.id}>
                  <td>
                    <button
                      type="button"
                      onClick={() => onOpenDetail(company.id)}
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
                      {company.name}
                    </button>
                  </td>
                  <td>
                    {company.industry ? (
                      <span className="badge badge-industry">{company.industry}</span>
                    ) : (
                      <span style={{ color: 'var(--text-light)' }}>—</span>
                    )}
                  </td>
                  <td>
                    {company.phone ? (
                      <a
                        href={`tel:${company.phone}`}
                        style={{ color: 'var(--text-main)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                      >
                        <IconPhone size={14} style={{ color: 'var(--text-light)' }} />
                        {company.phone}
                      </a>
                    ) : (
                      <span style={{ color: 'var(--text-light)' }}>—</span>
                    )}
                  </td>
                  <td>
                    {company.website ? (
                      <a
                        href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                      >
                        <IconGlobe size={14} />
                        Visit
                      </a>
                    ) : (
                      <span style={{ color: 'var(--text-light)' }}>—</span>
                    )}
                  </td>
                  <td>
                    <span className="badge badge-primary">
                      <IconUsers size={12} />
                      {company.contact_count || 0}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    {formatDate(company.created_at)}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.25rem' }}>
                      <button
                        type="button"
                        className="btn-icon"
                        title="View Company Details"
                        onClick={() => onOpenDetail(company.id)}
                      >
                        <IconEye size={17} />
                      </button>
                      <button
                        type="button"
                        className="btn-icon"
                        title="Edit Company"
                        onClick={() => onOpenEdit(company)}
                      >
                        <IconEdit size={17} />
                      </button>
                      <button
                        type="button"
                        className="btn-icon delete"
                        title="Delete Company"
                        onClick={() => onOpenDelete(company)}
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

