import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ApexInteractiveReport from '../../components/ApexInteractiveReport';
import DuplicateSelectionModal from '../../components/DuplicateSelectionModal';
import { api } from '../../api/client';
import { IconGitMerge, IconBuilding, IconCheck, IconX, IconAlertTriangle } from '../../components/Icons';

export default function MergeCompaniesPage({ onShowToast }) {
  // Selected Original and Duplicate company objects
  const [originalCompany, setOriginalCompany] = useState(null);
  const [duplicateCompany, setDuplicateCompany] = useState(null);

  // Modal selector state
  const [modalSlot, setModalSlot] = useState(null); // 'original' or 'duplicate'
  const [isMerging, setIsMerging] = useState(false);

  // Load single company full details if selected
  const handleSelectOriginal = async (rec) => {
    try {
      const fullRes = await api.getCompanyById(rec.id || rec.company_id);
      if (fullRes && fullRes.success && fullRes.data) {
        setOriginalCompany(fullRes.data);
      } else {
        setOriginalCompany(rec);
      }
    } catch (e) {
      setOriginalCompany(rec);
    }
  };

  const handleSelectDuplicate = async (rec) => {
    try {
      const fullRes = await api.getCompanyById(rec.id || rec.company_id);
      if (fullRes && fullRes.success && fullRes.data) {
        setDuplicateCompany(fullRes.data);
      } else {
        setDuplicateCompany(rec);
      }
    } catch (e) {
      setDuplicateCompany(rec);
    }
  };

  // Perform APEX-compliant merge
  const handleExecuteMerge = async () => {
    if (!originalCompany || !originalCompany.id) {
      onShowToast?.('Please select an Original Company first.', 'warning');
      return;
    }
    if (!duplicateCompany || !duplicateCompany.id) {
      onShowToast?.('Please select a Duplicate Company to merge.', 'warning');
      return;
    }
    if (String(originalCompany.id) === String(duplicateCompany.id)) {
      onShowToast?.('Original and Duplicate company cannot be the same record.', 'error');
      return;
    }

    const origName = originalCompany.comp_name || originalCompany.name || `#${originalCompany.id}`;
    const dupName = duplicateCompany.comp_name || duplicateCompany.name || `#${duplicateCompany.id}`;

    const confirmMsg = `Are you sure you want to merge Duplicate Company #${duplicateCompany.id} (${dupName}) into Original Company #${originalCompany.id} (${origName})?\n\n` +
      `Rule: Any column that is blank/empty in the Original will be merged from the Duplicate. ` +
      `All contacts and leads will be reassigned to Original Company #${originalCompany.id}. ` +
      `Duplicate Company #${duplicateCompany.id} will be archived in merge audit history and removed.`;

    if (!window.confirm(confirmMsg)) {
      return;
    }

    setIsMerging(true);
    try {
      const res = await api.mergeCompanyPair({
        originalId: originalCompany.id,
        duplicateId: duplicateCompany.id,
        mergedBy: 'admin',
        notes: `Merged duplicate company #${duplicateCompany.id} (${dupName}) into original #${originalCompany.id} (${origName})`,
      });

      if (res && res.success) {
        onShowToast?.(res.message || `Company #${duplicateCompany.id} merged into #${originalCompany.id} successfully.`, 'success');
        // Update original with the merged record
        if (res.data && res.data.updatedRecord) {
          const refreshed = await api.getCompanyById(originalCompany.id);
          setOriginalCompany(refreshed?.data || res.data.updatedRecord);
        } else {
          const refreshed = await api.getCompanyById(originalCompany.id);
          if (refreshed?.data) setOriginalCompany(refreshed.data);
        }
        // Clear duplicate
        setDuplicateCompany(null);
      } else {
        onShowToast?.(res?.message || 'Failed to merge companies.', 'error');
      }
    } catch (err) {
      console.error('Merge error:', err);
      onShowToast?.(`Merge failed: ${err.message}`, 'error');
    } finally {
      setIsMerging(false);
    }
  };

  // Table rows: show Original Company and Duplicate Company if selected
  const tableRows = useMemo(() => {
    const list = [];
    if (originalCompany) list.push({ ...originalCompany, _merge_role: 'Original' });
    if (duplicateCompany) list.push({ ...duplicateCompany, _merge_role: 'Duplicate' });
    return list;
  }, [originalCompany, duplicateCompany]);

  // Columns matching screenshot media_1794791532531_7955cb56.png
  const columns = useMemo(() => [
    {
      key: 'id',
      label: 'Id',
      width: '90px',
      sortable: true,
      render: (r) => (
        <span className="apex-table-id-cell" style={{ fontWeight: 700 }}>
          {r.id}
        </span>
      ),
    },
    {
      key: 'comp_name',
      label: 'Comp Name',
      minWidth: '180px',
      sortable: true,
      render: (r) => (
        <span style={{ fontWeight: 600, color: '#0284c7' }}>
          {r.comp_name || r.name}
        </span>
      ),
    },
    {
      key: 'contacts_count',
      label: 'Contacts Count',
      width: '110px',
      align: 'right',
      render: (r) => r.contacts_count || 0,
    },
    {
      key: 'contact_count',
      label: 'Contact Count',
      width: '100px',
      align: 'right',
      render: (r) => r.contact_count || 0,
    },
    {
      key: 'technology',
      label: 'Technology',
      minWidth: '140px',
      render: (r) => r.technology || '—',
    },
    {
      key: 'country',
      label: 'Country',
      width: '110px',
      render: (r) => r.country || '—',
    },
    {
      key: 'existingcomp',
      label: 'Existing Comp',
      width: '110px',
      render: (r) => r.existingcomp || r.existing_comp || '—',
    },
    {
      key: 'companyphone',
      label: 'Company Phone',
      minWidth: '130px',
      render: (r) => r.companyphone || r.phone || '—',
    },
    {
      key: 'company_categories',
      label: 'Company Categories',
      minWidth: '150px',
      render: (r) => r.company_categories || '—',
    },
    {
      key: 'registered_url',
      label: 'Registered Url',
      minWidth: '140px',
      render: (r) => r.registered_url || '—',
    },
    {
      key: 'normalized_website',
      label: 'Normalized Website',
      minWidth: '160px',
      render: (r) => r.normalized_website || r.website || '—',
    },
    {
      key: 'company_type',
      label: 'Company Type',
      width: '130px',
      render: (r) => r.company_type || '—',
    },
    {
      key: 'registration_status',
      label: 'Registration Status',
      width: '140px',
      render: (r) => r.registration_status || '—',
    },
    {
      key: 'supplier_number',
      label: 'Supplier Number',
      width: '130px',
      render: (r) => r.supplier_number || '—',
    },
    {
      key: 'username',
      label: 'Username',
      width: '110px',
      render: (r) => r.username || '—',
    },
    {
      key: 'password',
      label: 'Password',
      width: '110px',
      render: (r) => r.password || '—',
    },
    {
      key: 'registration_date',
      label: 'Registration Date',
      width: '130px',
      render: (r) => r.registration_date || '—',
    },
    {
      key: 'industry',
      label: 'Industry',
      minWidth: '150px',
      render: (r) => r.industry || '—',
    },
    {
      key: 'city',
      label: 'City',
      width: '110px',
      render: (r) => r.city || '—',
    },
    {
      key: 'website',
      label: 'Website',
      minWidth: '160px',
      render: (r) => r.website || '—',
    },
    {
      key: 'com_email',
      label: 'Com Email',
      minWidth: '160px',
      render: (r) => r.com_email || r.email || '—',
    },
    {
      key: 'employee_size',
      label: 'Employee Size',
      width: '130px',
      render: (r) => r.employee_size || '—',
    },
    {
      key: 'salesperson',
      label: 'Salesperson',
      width: '130px',
      render: (r) => r.salesperson || '—',
    },
  ], []);

  return (
    <div className="duplicate-company-merger-page" style={{ padding: '0 0.5rem 1.5rem 0.5rem' }}>
      {/* 1. Page Header */}
      <div style={{ marginBottom: '1.25rem' }}>
        <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: '#0f172a' }}>
          Duplicate Company Merger
        </h2>
      </div>

      {/* 2. Top Selection Form Card (matching Oracle APEX screenshot media_1794791532531_7955cb56.png) */}
      <div
        className="apex-ir-card"
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '1.5rem',
          marginBottom: '1.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '2rem',
          }}
        >
          {/* Left Column: Original Company */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <button
                type="button"
                onClick={() => setModalSlot('original')}
                style={{
                  backgroundColor: '#92400e', // APEX Brown button
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '8px 20px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                }}
              >
                Select Company
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', alignItems: 'center', gap: '0.75rem' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                Original Company ID
              </label>
              <input
                type="text"
                readOnly
                value={originalCompany ? originalCompany.id : ''}
                placeholder=""
                style={{
                  width: '100%',
                  height: '36px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px',
                  padding: '0 10px',
                  fontSize: '13px',
                  color: '#0f172a',
                  fontWeight: 600,
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', alignItems: 'center', gap: '0.75rem' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                Original Company Name
              </label>
              <input
                type="text"
                readOnly
                value={originalCompany ? (originalCompany.comp_name || originalCompany.name || '') : ''}
                placeholder=""
                style={{
                  width: '100%',
                  height: '36px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px',
                  padding: '0 10px',
                  fontSize: '13px',
                  color: '#0f172a',
                  fontWeight: 600,
                  outline: 'none',
                }}
              />
            </div>
          </div>

          {/* Right Column: Duplicate Company */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <button
                type="button"
                onClick={() => setModalSlot('duplicate')}
                style={{
                  backgroundColor: '#f1f5f9', // APEX Light grey button
                  color: '#1e293b',
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px',
                  padding: '8px 20px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                }}
              >
                Select Duplicate Company
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '170px 1fr', alignItems: 'center', gap: '0.75rem' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                Duplicate Company ID
              </label>
              <input
                type="text"
                readOnly
                value={duplicateCompany ? duplicateCompany.id : ''}
                placeholder=""
                style={{
                  width: '100%',
                  height: '36px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px',
                  padding: '0 10px',
                  fontSize: '13px',
                  color: '#0f172a',
                  fontWeight: 600,
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '170px 1fr', alignItems: 'center', gap: '0.75rem' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                Duplicate Company Name
              </label>
              <input
                type="text"
                readOnly
                value={duplicateCompany ? (duplicateCompany.comp_name || duplicateCompany.name || '') : ''}
                placeholder=""
                style={{
                  width: '100%',
                  height: '36px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px',
                  padding: '0 10px',
                  fontSize: '13px',
                  color: '#0f172a',
                  fontWeight: 600,
                  outline: 'none',
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Action Toolbar: [Merge] Button */}
      <div style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <button
          type="button"
          onClick={handleExecuteMerge}
          disabled={isMerging || !originalCompany || !duplicateCompany}
          style={{
            backgroundColor: '#e2e8f0',
            color: '#0f172a',
            border: '1px solid #cbd5e1',
            borderRadius: '4px',
            padding: '7px 20px',
            fontSize: '13px',
            fontWeight: 700,
            cursor: (!originalCompany || !duplicateCompany || isMerging) ? 'not-allowed' : 'pointer',
            opacity: (!originalCompany || !duplicateCompany || isMerging) ? 0.6 : 1,
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <IconGitMerge size={15} />
          <span>{isMerging ? 'Merging...' : 'Merge'}</span>
        </button>

        {originalCompany && duplicateCompany && (
          <span style={{ fontSize: '12px', color: '#475569', fontWeight: 500 }}>
            Ready to merge Duplicate Company #{duplicateCompany.id} into Original Company #{originalCompany.id}
          </span>
        )}
      </div>

      {/* 4. Table of Selected Records */}
      <ApexInteractiveReport
        columns={columns}
        data={tableRows}
        rowKey={(r) => String(r.id)}
        total={tableRows.length}
        page={1}
        rowsPerPage={50}
        search=""
        isServerSide={false}
        emptyMessage="No company selected yet. Click 'Select Company' and 'Select Duplicate Company' above to choose records."
        selectable={false}
        renderLeadingCell={(r) => (
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '4px',
              backgroundColor: r._merge_role === 'Original' ? '#e0f2fe' : '#fee2e2',
              color: r._merge_role === 'Original' ? '#0369a1' : '#b91c1c',
            }}
          >
            {r._merge_role}
          </span>
        )}
        leadingHeader={<span style={{ fontSize: '11px', fontWeight: 700 }}>Role</span>}
      />

      {/* Selection Modal */}
      <DuplicateSelectionModal
        isOpen={Boolean(modalSlot)}
        onClose={() => setModalSlot(null)}
        type="company"
        excludeId={modalSlot === 'duplicate' ? originalCompany?.id : duplicateCompany?.id}
        onSelect={(rec) => {
          if (modalSlot === 'original') {
            handleSelectOriginal(rec);
          } else {
            handleSelectDuplicate(rec);
          }
        }}
        onShowToast={onShowToast}
      />
    </div>
  );
}
