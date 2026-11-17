import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../../api/client';
import ApexInteractiveReport from '../../components/ApexInteractiveReport';
import { IconGitMerge, IconBuilding, IconX } from '../../components/Icons';

export default function DuplicateCompanyReportPage({ onNavigate, onShowToast }) {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [viewingCompany, setViewingCompany] = useState(null);

  const loadReport = useCallback(async (curPage, curLimit, curSearch) => {
    setIsLoading(true);
    try {
      const res = await api.getDuplicateCompanyReport({
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
      console.error('Failed to load duplicate company report:', err);
      onShowToast?.(`Failed to load duplicate company report: ${err.message}`, 'error');
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
      key: 'company_id',
      label: 'Company ID',
      width: '120px',
      sortable: true,
      getValue: (r) => r.company_id,
      render: (r) => (
        <span className="apex-table-id-cell" style={{ fontWeight: 700 }}>
          {r.company_id}
        </span>
      ),
    },
    {
      key: 'company_name',
      label: 'Company Name',
      minWidth: '200px',
      sortable: true,
      getValue: (r) => r.company_name || '',
      render: (r) => (
        <span style={{ fontWeight: 600, color: '#0284c7' }}>
          {r.company_name}
        </span>
      ),
    },
    {
      key: 'industry',
      label: 'Industry',
      minWidth: '160px',
      sortable: true,
      getValue: (r) => r.industry || '—',
    },
    {
      key: 'website',
      label: 'Website',
      minWidth: '180px',
      sortable: true,
      getValue: (r) => r.website || '—',
      render: (r) => (
        r.website && r.website !== '—' ? (
          <a
            href={r.website.startsWith('http') ? r.website : `https://${r.website}`}
            target="_blank"
            rel="noreferrer"
            style={{ color: '#0284c7', textDecoration: 'none' }}
          >
            {r.website}
          </a>
        ) : '—'
      ),
    },
    {
      key: 'country',
      label: 'Country',
      width: '120px',
      sortable: true,
      getValue: (r) => r.country || '—',
    },
    {
      key: 'city',
      label: 'City',
      width: '120px',
      sortable: true,
      getValue: (r) => r.city || '—',
    },
    {
      key: 'technology',
      label: 'Technology',
      minWidth: '150px',
      sortable: true,
      getValue: (r) => r.technology || '—',
    },
    {
      key: 'contact_count',
      label: 'Contact Count',
      width: '120px',
      align: 'right',
      sortable: true,
      getValue: (r) => r.contact_count || 0,
      render: (r) => (
        <span style={{ fontWeight: 600 }}>
          {r.contact_count || 0}
        </span>
      ),
    },
    {
      key: 'duplicate_type',
      label: 'Duplicate Reason',
      minWidth: '180px',
      sortable: true,
      getValue: (r) => r.duplicate_type || r.duplicate_reason || '',
      render: (r) => (
        <span className="duplicate-reason-badge">
          {r.duplicate_type || r.duplicate_reason}
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
          onClick={() => setViewingCompany(r)}
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
              onNavigate('merge_companies', { selectedGroupId: r.duplicate_group_id });
            } else {
              window.location.hash = '#/duplicate-merger/companies';
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
    <div className="duplicate-company-report-page" style={{ padding: '0 0.5rem 1.5rem 0.5rem' }}>
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
          <IconBuilding size={20} className="apex-header-icon" />
          <h2 className="apex-page-heading" style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>
            Duplicate Company Report
          </h2>
          <span className="apex-badge-count">
            {total} records
          </span>
        </div>
        <div>
          <button
            type="button"
            onClick={() => {
              if (onNavigate) onNavigate('merge_companies');
              else window.location.hash = '#/duplicate-merger/companies';
            }}
            className="btn-duplicate-nav"
          >
            <IconGitMerge size={14} color="#ffffff" />
            <span style={{ color: '#ffffff', fontWeight: 700 }}>Go to Merge Companies</span>
          </button>
        </div>
      </div>

      {/* Interactive Report */}
      <ApexInteractiveReport
        columns={columns}
        data={data}
        rowKey={(r) => String(r.id || r.company_id)}
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

      {/* View Form Modal (matching Apex DUPLICATE_COMPANY_REPORT View Form) */}
      {viewingCompany && (
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
                Company Form: {viewingCompany.company_id} {viewingCompany.company_name}
              </h3>
              <button
                type="button"
                onClick={() => setViewingCompany(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <IconX size={18} />
              </button>
            </div>
            <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px', fontSize: '13px' }}>
              <div>
                <span style={{ color: '#94a3b8', display: 'block', fontSize: '11px', fontWeight: 600 }}>Company ID</span>
                <span className="apex-table-id-cell" style={{ fontWeight: 700 }}>{viewingCompany.company_id}</span>
              </div>
              <div>
                <span style={{ color: '#94a3b8', display: 'block', fontSize: '11px', fontWeight: 600 }}>Company Name</span>
                <span style={{ fontWeight: 600 }}>{viewingCompany.company_name || '—'}</span>
              </div>
              <div>
                <span style={{ color: '#94a3b8', display: 'block', fontSize: '11px', fontWeight: 600 }}>Industry</span>
                <span>{viewingCompany.industry || '—'}</span>
              </div>
              <div>
                <span style={{ color: '#94a3b8', display: 'block', fontSize: '11px', fontWeight: 600 }}>Website</span>
                <span>{viewingCompany.website ? <a href={viewingCompany.website.startsWith('http') ? viewingCompany.website : `https://${viewingCompany.website}`} target="_blank" rel="noreferrer" style={{ color: '#0284c7' }}>{viewingCompany.website}</a> : '—'}</span>
              </div>
              <div>
                <span style={{ color: '#94a3b8', display: 'block', fontSize: '11px', fontWeight: 600 }}>Country</span>
                <span>{viewingCompany.country || '—'}</span>
              </div>
              <div>
                <span style={{ color: '#94a3b8', display: 'block', fontSize: '11px', fontWeight: 600 }}>City</span>
                <span>{viewingCompany.city || '—'}</span>
              </div>
              <div>
                <span style={{ color: '#94a3b8', display: 'block', fontSize: '11px', fontWeight: 600 }}>Technology</span>
                <span>{viewingCompany.technology || '—'}</span>
              </div>
              <div>
                <span style={{ color: '#94a3b8', display: 'block', fontSize: '11px', fontWeight: 600 }}>Contact Count</span>
                <span style={{ fontWeight: 700, color: '#0284c7' }}>{viewingCompany.contact_count ?? 0}</span>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <span style={{ color: '#94a3b8', display: 'block', fontSize: '11px', fontWeight: 600 }}>Duplicate Reason</span>
                <span className="duplicate-reason-badge">{viewingCompany.duplicate_reason || '—'}</span>
              </div>
            </div>
            <div className="apex-modal-footer" style={{ padding: '12px 20px', borderTop: '1px solid var(--apex-border, #e2e8f0)', textAlign: 'right' }}>
              <button
                type="button"
                onClick={() => setViewingCompany(null)}
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
