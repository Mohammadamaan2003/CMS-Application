import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../../api/client';
import ApexInteractiveReport from '../../components/ApexInteractiveReport';
import { IconGitMerge, IconUsers, IconX } from '../../components/Icons';

export default function DuplicateContactReportPage({ onNavigate, onShowToast }) {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [viewingContact, setViewingContact] = useState(null);

  const loadReport = useCallback(async (curPage, curLimit, curSearch) => {
    setIsLoading(true);
    try {
      const res = await api.getDuplicateContactReport({
        page: curPage,
        limit: curLimit,
        search: curSearch || '',
      });
      if (res && res.success) {
        setData(res.data || []);
        setTotal(res.total || 0);
      } else {
        setData([]);
        setTotal(0);
      }
    } catch (err) {
      console.error('Failed to load duplicate contact report:', err);
      onShowToast?.(`Failed to load duplicate contact report: ${err.message}`, 'error');
      setData([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  }, [onShowToast]);

  useEffect(() => {
    loadReport(page, pageSize, search);
  }, [page, pageSize, loadReport]);

  const columns = useMemo(() => [
    {
      key: 'contact_id',
      label: 'Contact ID',
      width: '120px',
      sortable: true,
      getValue: (r) => r.contact_id,
      render: (r) => (
        <span className="apex-table-id-cell" style={{ fontWeight: 700 }}>
          {r.contact_id}
        </span>
      ),
    },
    {
      key: 'contact_name',
      label: 'Contact Name',
      minWidth: '180px',
      sortable: true,
      getValue: (r) => r.contact_name || '',
      render: (r) => (
        <span style={{ fontWeight: 600, color: '#0284c7' }}>
          {r.contact_name}
        </span>
      ),
    },
    {
      key: 'company_name',
      label: 'Company Name',
      minWidth: '180px',
      sortable: true,
      getValue: (r) => r.company_name || '—',
    },
    {
      key: 'email',
      label: 'Email',
      minWidth: '180px',
      sortable: true,
      getValue: (r) => r.email || '—',
      render: (r) => (
        r.email && r.email !== '—' ? (
          <a
            href={`mailto:${r.email}`}
            style={{ color: '#0284c7', textDecoration: 'none' }}
          >
            {r.email}
          </a>
        ) : '—'
      ),
    },
    {
      key: 'phone',
      label: 'Phone / Mobile',
      minWidth: '140px',
      sortable: true,
      getValue: (r) => r.phone || '—',
    },
    {
      key: 'designation',
      label: 'Designation',
      minWidth: '150px',
      sortable: true,
      getValue: (r) => r.designation || '—',
    },
    {
      key: 'pos_type',
      label: 'Position Type',
      minWidth: '140px',
      sortable: true,
      getValue: (r) => r.pos_type || '—',
    },
    {
      key: 'country',
      label: 'Country',
      width: '120px',
      sortable: true,
      getValue: (r) => r.country || '—',
    },
    {
      key: 'linkedin_url',
      label: 'LinkedIn URL',
      minWidth: '160px',
      sortable: true,
      getValue: (r) => r.linkedin_url || '—',
      render: (r) => (
        r.linkedin_url && r.linkedin_url !== '—' ? (
          <a
            href={r.linkedin_url.startsWith('http') ? r.linkedin_url : `https://${r.linkedin_url}`}
            target="_blank"
            rel="noreferrer"
            style={{ color: '#0284c7', textDecoration: 'none' }}
          >
            LinkedIn ↗
          </a>
        ) : '—'
      ),
    },
    {
      key: 'duplicate_type',
      label: 'Duplicate Reason',
      minWidth: '220px',
      sortable: true,
      getValue: (r) => r.duplicate_reason || `${r.duplicate_type || ''} (${r.match_key || ''})`,
      render: (r) => (
        <span className="duplicate-reason-badge">
          {r.duplicate_type || r.duplicate_reason} {r.match_confidence ? `• ${r.match_confidence}` : ''}
        </span>
      ),
    },
    {
      key: 'view_form',
      label: 'View Form',
      width: '110px',
      render: (r) => (
        <button
          type="button"
          onClick={() => setViewingContact(r)}
          className="btn-apex-view-form"
        >
          View Form
        </button>
      ),
    },
    {
      key: 'action',
      label: 'Action',
      width: '130px',
      render: (r) => (
        <button
          type="button"
          onClick={() => {
            if (onNavigate) {
              onNavigate('merge_contacts', { selectedGroupId: r.duplicate_group_id });
            } else {
              window.location.hash = '#/duplicate-merger/contacts';
            }
          }}
          className="btn-apex-merge"
        >
          <IconGitMerge size={12} color="#ffffff" />
          <span>Merge</span>
        </button>
      ),
    },
  ], [onNavigate]);

  return (
    <div className="duplicate-contact-report-page" style={{ padding: '0 0.5rem 1.5rem 0.5rem' }}>
      {/* Page Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1rem',
        paddingBottom: '0.75rem',
        borderBottom: '1px solid var(--apex-border, #e2e8f0)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <IconUsers size={20} className="apex-header-icon" />
          <h2 className="apex-page-heading" style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>
            Duplicate Contact Report
          </h2>
          <span className="apex-badge-count">
            {total} records
          </span>
        </div>
        <div>
          <button
            type="button"
            onClick={() => {
              if (onNavigate) onNavigate('merge_contacts');
              else window.location.hash = '#/duplicate-merger/contacts';
            }}
            className="btn-duplicate-nav"
          >
            <IconGitMerge size={14} color="#ffffff" />
            <span style={{ color: '#ffffff', fontWeight: 700 }}>Go to Merge Contacts</span>
          </button>
        </div>
      </div>

      {/* Interactive Report */}
      <ApexInteractiveReport
        columns={columns}
        data={data}
        rowKey={(r) => String(r.id || r.contact_id)}
        total={total}
        page={page}
        onPageChange={(p) => setPage(p)}
        rowsPerPage={pageSize}
        onRowsPerPageChange={(s) => {
          setPageSize(s);
          setPage(1);
        }}
        search={search}
        onSearchChange={(v) => setSearch(v)}
        onSearchSubmit={() => {
          setPage(1);
          loadReport(1, pageSize, search);
        }}
        isServerSide={true}
        isLoading={isLoading}
        selectable={true}
        selectedKeys={selectedRowKeys}
        onSelectionChange={setSelectedRowKeys}
        onRefresh={() => loadReport(page, pageSize, search)}
      />

      {/* View Contact Form Modal */}
      {viewingContact && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div className="apex-modal-card" style={{
            borderRadius: '8px',
            maxWidth: '600px',
            width: '100%',
            overflow: 'hidden',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4)'
          }}>
            <div className="apex-modal-header" style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              borderBottom: '1px solid var(--apex-border, #e2e8f0)'
            }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>
                Contact Form: {viewingContact.contact_id} {viewingContact.contact_name}
              </h3>
              <button
                type="button"
                onClick={() => setViewingContact(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <IconX size={18} />
              </button>
            </div>
            <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px', fontSize: '13px' }}>
              <div>
                <span style={{ color: '#94a3b8', display: 'block', fontSize: '11px', fontWeight: 600 }}>Contact ID</span>
                <span className="apex-table-id-cell" style={{ fontWeight: 700 }}>{viewingContact.contact_id}</span>
              </div>
              <div>
                <span style={{ color: '#94a3b8', display: 'block', fontSize: '11px', fontWeight: 600 }}>Contact Name</span>
                <span style={{ fontWeight: 600 }}>{viewingContact.contact_name || '—'}</span>
              </div>
              <div>
                <span style={{ color: '#94a3b8', display: 'block', fontSize: '11px', fontWeight: 600 }}>Company Name</span>
                <span>{viewingContact.company_name || '—'}</span>
              </div>
              <div>
                <span style={{ color: '#94a3b8', display: 'block', fontSize: '11px', fontWeight: 600 }}>Designation</span>
                <span>{viewingContact.designation || '—'}</span>
              </div>
              <div>
                <span style={{ color: '#94a3b8', display: 'block', fontSize: '11px', fontWeight: 600 }}>Email</span>
                <span>{viewingContact.email ? <a href={`mailto:${viewingContact.email}`} style={{ color: '#0284c7' }}>{viewingContact.email}</a> : '—'}</span>
              </div>
              <div>
                <span style={{ color: '#94a3b8', display: 'block', fontSize: '11px', fontWeight: 600 }}>Phone</span>
                <span>{viewingContact.phone || '—'}</span>
              </div>
              <div>
                <span style={{ color: '#94a3b8', display: 'block', fontSize: '11px', fontWeight: 600 }}>Country</span>
                <span>{viewingContact.country || '—'}</span>
              </div>
              <div>
                <span style={{ color: '#94a3b8', display: 'block', fontSize: '11px', fontWeight: 600 }}>Position Type</span>
                <span>{viewingContact.pos_type || '—'}</span>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <span style={{ color: '#94a3b8', display: 'block', fontSize: '11px', fontWeight: 600 }}>Duplicate Reason</span>
                <span className="duplicate-reason-badge">{viewingContact.duplicate_reason || '—'}</span>
              </div>
            </div>
            <div className="apex-modal-footer" style={{ padding: '12px 20px', borderTop: '1px solid var(--apex-border, #e2e8f0)', textAlign: 'right' }}>
              <button
                type="button"
                onClick={() => setViewingContact(null)}
                className="btn-apex-view-form"
                style={{ padding: '6px 18px', fontSize: '13px' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
