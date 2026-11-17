import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ApexInteractiveReport from './ApexInteractiveReport';
import { api } from '../api/client';
import { IconX, IconInfo, IconCheck } from './Icons';

/**
 * DuplicateSelectionModal
 *
 * Matches the Oracle APEX Duplicate Selection Modal (media_1794791427869_82aad0c1.png):
 * - Modal title: "Duplicate Company" or "Duplicate Contact" with close [X]
 * - Interactive report with Search + Go, Rows, Actions
 * - Two navy buttons: [Validation Rules] and [Select]
 * - Radio-button selection per row
 */
export default function DuplicateSelectionModal({
  isOpen,
  onClose,
  type = 'company', // 'company' or 'contact'
  onSelect,
  excludeId = null,
  onShowToast,
}) {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRecordId, setSelectedRecordId] = useState(null);
  const [showValidationRules, setShowValidationRules] = useState(false);

  const loadRecords = useCallback(async () => {
    setIsLoading(true);
    try {
      if (type === 'company') {
        const res = await api.getDuplicateCompanyReport({
          page,
          limit: pageSize,
          search: search || '',
        });
        if (res && res.success) {
          setData(res.data || []);
          setTotal(res.total || 0);
        } else {
          setData([]);
          setTotal(0);
        }
      } else {
        const res = await api.getDuplicateContactReport({
          page,
          limit: pageSize,
          search: search || '',
        });
        if (res && res.success) {
          setData(res.data || []);
          setTotal(res.total || 0);
        } else {
          setData([]);
          setTotal(0);
        }
      }
    } catch (err) {
      console.error('Failed to load duplicate candidates:', err);
      onShowToast?.(`Error loading duplicate records: ${err.message}`, 'error');
      setData([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  }, [type, page, pageSize, search, onShowToast]);

  useEffect(() => {
    if (isOpen) {
      loadRecords();
      setSelectedRecordId(null);
      setShowValidationRules(false);
    }
  }, [isOpen, loadRecords]);

  const selectedRecord = useMemo(() => {
    return data.find((r) => String(r.id || r.company_id || r.contact_id) === String(selectedRecordId));
  }, [data, selectedRecordId]);

  const handleSelectConfirm = () => {
    if (!selectedRecord) {
      alert(`Please select a ${type === 'company' ? 'company' : 'contact'} from the table.`);
      return;
    }
    if (excludeId && String(selectedRecord.id) === String(excludeId)) {
      alert(`You cannot select the same ${type === 'company' ? 'company' : 'contact'} for both Original and Duplicate.`);
      return;
    }
    onSelect(selectedRecord);
    onClose();
  };

  const columns = useMemo(() => {
    if (type === 'company') {
      return [
        {
          key: 'company_id',
          label: 'Company Id',
          width: '100px',
          sortable: true,
          render: (r) => <span className="apex-table-id-cell" style={{ fontWeight: 600 }}>{r.company_id || r.id}</span>,
        },
        {
          key: 'company_name',
          label: 'Company Name',
          minWidth: '180px',
          sortable: true,
          render: (r) => <span style={{ fontWeight: 600, color: '#0284c7' }}>{r.company_name || r.comp_name}</span>,
        },
        {
          key: 'website',
          label: 'Website',
          minWidth: '160px',
          sortable: true,
          render: (r) => r.website || '—',
        },
        {
          key: 'country',
          label: 'Country',
          width: '110px',
          sortable: true,
          render: (r) => r.country || '—',
        },
        {
          key: 'city',
          label: 'City',
          width: '110px',
          sortable: true,
          render: (r) => r.city || '—',
        },
        {
          key: 'industry',
          label: 'Industry',
          minWidth: '140px',
          sortable: true,
          render: (r) => r.industry || '—',
        },
        {
          key: 'technology',
          label: 'Technology',
          minWidth: '140px',
          sortable: true,
          render: (r) => r.technology || '—',
        },
        {
          key: 'contact_count',
          label: 'Contacts',
          width: '85px',
          align: 'right',
          sortable: true,
          render: (r) => r.contact_count || 0,
        },
        {
          key: 'duplicate_type',
          label: 'Duplicate Reason',
          width: '130px',
          render: (r) => (
            <span
              style={{
                fontSize: '11px',
                padding: '2px 8px',
                borderRadius: '4px',
                backgroundColor: '#fee2e2',
                color: '#b91c1c',
                fontWeight: 600,
              }}
            >
              {r.duplicate_type}
            </span>
          ),
        },
      ];
    }

    // Contact Columns (matching screenshot media_1794791427869_82aad0c1.png)
    return [
      {
        key: 'contact_id',
        label: 'Contact Id',
        width: '100px',
        sortable: true,
        render: (r) => <span className="apex-table-id-cell" style={{ fontWeight: 600 }}>{r.contact_id || r.id}</span>,
      },
      {
        key: 'contact_name',
        label: 'Contact Name',
        minWidth: '160px',
        sortable: true,
        render: (r) => <span style={{ fontWeight: 600, color: '#0284c7' }}>{r.contact_name}</span>,
      },
      {
        key: 'comp_name',
        label: 'Company Name',
        minWidth: '160px',
        sortable: true,
        render: (r) => r.comp_name || r.company_name || '—',
      },
      {
        key: 'designation',
        label: 'Designation',
        minWidth: '150px',
        sortable: true,
        render: (r) => r.designation || '—',
      },
      {
        key: 'pos_type',
        label: 'Position Type',
        width: '120px',
        sortable: true,
        render: (r) => r.pos_type || r.position_type || '—',
      },
      {
        key: 'email',
        label: 'Email',
        minWidth: '180px',
        sortable: true,
        render: (r) => r.email || r.comp_email || '—',
      },
      {
        key: 'country',
        label: 'Country',
        width: '110px',
        sortable: true,
        render: (r) => r.country || '—',
      },
      {
        key: 'duplicate_type',
        label: 'Duplicate Reason',
        width: '150px',
        render: (r) => (
          <span
            style={{
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: '4px',
              backgroundColor: r.match_confidence === 'CONFIRMED' ? '#fee2e2' : '#fef3c7',
              color: r.match_confidence === 'CONFIRMED' ? '#b91c1c' : '#92400e',
              fontWeight: 600,
            }}
          >
            {r.duplicate_type}
          </span>
        ),
      },
    ];
  }, [type]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1050,
        padding: '1rem',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          width: '100%',
          maxWidth: '1100px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden',
        }}
      >
        {/* Header matching APEX modal */}
        <div
          style={{
            padding: '1rem 1.25rem',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#ffffff',
          }}
        >
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
            {type === 'company' ? 'Duplicate Company' : 'Duplicate Contact'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: '1px solid #cbd5e1',
              borderRadius: '4px',
              padding: '4px 6px',
              cursor: 'pointer',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <IconX size={16} />
          </button>
        </div>

        {/* Validation Rules Dialog (Collapsible) */}
        {showValidationRules && (
          <div
            style={{
              padding: '0.85rem 1.25rem',
              backgroundColor: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              fontSize: '12.5px',
              color: '#334155',
            }}
          >
            <div style={{ fontWeight: 700, color: '#0b1a3d', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <IconInfo size={15} color="#0284c7" />
              <span>Validation & Merge Rules:</span>
            </div>
            {type === 'company' ? (
              <ul style={{ margin: '4px 0 0 1.25rem', padding: 0, lineHeight: 1.5 }}>
                <li><strong>Website Matching:</strong> Identifies duplicate companies sharing identical cleaned domain names (e.g. <code>altayer.com</code>, <code>suez.com</code>).</li>
                <li><strong>Name Matching:</strong> For companies without website, matches exact uppercase company name.</li>
                <li><strong>Merge Rule:</strong> The Original record retains all its non-empty fields. Any column that is blank or empty in the Original is populated from the Duplicate.</li>
                <li><strong>Child Records:</strong> All child contacts and leads attached to the Duplicate are atomically reassigned to the Original company. The Duplicate is archived and removed.</li>
              </ul>
            ) : (
              <ul style={{ margin: '4px 0 0 1.25rem', padding: 0, lineHeight: 1.5 }}>
                <li><strong>LinkedIn Matching:</strong> Normalized LinkedIn profile URL (High Confidence).</li>
                <li><strong>Corporate Email:</strong> Exact match on cleaned email address (High Confidence).</li>
                <li><strong>Name + Company:</strong> Alphanumeric contact name combined with company name (Possible).</li>
                <li><strong>Merge Rule:</strong> Empty fields in Original contact get merged from Duplicate. Linked leads are reassigned to Original contact. Duplicate is archived and deleted.</li>
              </ul>
            )}
          </div>
        )}

        {/* Two APEX Action Buttons: [Validation Rules] & [Select] */}
        <div
          style={{
            padding: '0.75rem 1.25rem',
            backgroundColor: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            borderBottom: '1px solid #f1f5f9',
          }}
        >
          <button
            type="button"
            onClick={() => setShowValidationRules(!showValidationRules)}
            style={{
              backgroundColor: '#0b1a3d',
              color: '#ffffff',
              border: 'none',
              borderRadius: '4px',
              padding: '8px 24px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
            }}
          >
            Validation Rules
          </button>

          <button
            type="button"
            onClick={handleSelectConfirm}
            disabled={!selectedRecordId}
            style={{
              backgroundColor: selectedRecordId ? '#0b1a3d' : '#94a3b8',
              color: '#ffffff',
              border: 'none',
              borderRadius: '4px',
              padding: '8px 28px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: selectedRecordId ? 'pointer' : 'not-allowed',
              boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <IconCheck size={14} />
            <span>Select</span>
          </button>

          {selectedRecord && (
            <span style={{ fontSize: '12px', color: '#0284c7', fontWeight: 600, marginLeft: 'auto' }}>
              Selected #{selectedRecord.id || selectedRecord.company_id || selectedRecord.contact_id}: {selectedRecord.company_name || selectedRecord.comp_name || selectedRecord.contact_name}
            </span>
          )}
        </div>

        {/* Modal Interactive Report Table */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 1.25rem 1.25rem 1.25rem' }}>
          <ApexInteractiveReport
            columns={columns}
            data={data}
            rowKey={(r) => String(r.id || r.company_id || r.contact_id)}
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
              loadRecords();
            }}
            isServerSide={true}
            isLoading={isLoading}
            selectable={false}
            renderLeadingCell={(row) => {
              const rowId = String(row.id || row.company_id || row.contact_id);
              const isSelected = String(selectedRecordId) === rowId;
              const isExcluded = excludeId && String(rowId) === String(excludeId);
              return (
                <input
                  type="radio"
                  name="duplicate_select_candidate"
                  checked={isSelected}
                  disabled={isExcluded}
                  onChange={() => setSelectedRecordId(rowId)}
                  style={{ cursor: isExcluded ? 'not-allowed' : 'pointer' }}
                  title={isExcluded ? 'Already selected in the other slot' : 'Select this record'}
                />
              );
            }}
            leadingHeader={<span style={{ fontSize: '11px', fontWeight: 700 }}>Selected</span>}
            onRowClick={(row) => {
              const rowId = String(row.id || row.company_id || row.contact_id);
              if (excludeId && String(rowId) === String(excludeId)) return;
              setSelectedRecordId(rowId);
            }}
          />
        </div>
      </div>
    </div>
  );
}
