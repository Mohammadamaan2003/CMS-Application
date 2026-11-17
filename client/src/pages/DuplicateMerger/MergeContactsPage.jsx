import React, { useState, useMemo } from 'react';
import ApexInteractiveReport from '../../components/ApexInteractiveReport';
import DuplicateSelectionModal from '../../components/DuplicateSelectionModal';
import { api } from '../../api/client';
import { IconGitMerge, IconUsers, IconCheck, IconX } from '../../components/Icons';

export default function MergeContactsPage({ onShowToast }) {
  // Selected Original and Duplicate contact objects
  const [originalContact, setOriginalContact] = useState(null);
  const [duplicateContact, setDuplicateContact] = useState(null);

  // Modal selector state
  const [modalSlot, setModalSlot] = useState(null); // 'original' or 'duplicate'
  const [isMerging, setIsMerging] = useState(false);

  const handleSelectOriginal = async (rec) => {
    try {
      const fullRes = await api.getContactById(rec.id || rec.contact_id);
      if (fullRes && fullRes.success && fullRes.data) {
        setOriginalContact(fullRes.data);
      } else {
        setOriginalContact(rec);
      }
    } catch (e) {
      setOriginalContact(rec);
    }
  };

  const handleSelectDuplicate = async (rec) => {
    try {
      const fullRes = await api.getContactById(rec.id || rec.contact_id);
      if (fullRes && fullRes.success && fullRes.data) {
        setDuplicateContact(fullRes.data);
      } else {
        setDuplicateContact(rec);
      }
    } catch (e) {
      setDuplicateContact(rec);
    }
  };

  // Perform APEX-compliant merge
  const handleExecuteMerge = async () => {
    if (!originalContact || !originalContact.id) {
      onShowToast?.('Please select an Original Contact first.', 'warning');
      return;
    }
    if (!duplicateContact || !duplicateContact.id) {
      onShowToast?.('Please select a Duplicate Contact to merge.', 'warning');
      return;
    }
    if (String(originalContact.id) === String(duplicateContact.id)) {
      onShowToast?.('Original and Duplicate contact cannot be the same record.', 'error');
      return;
    }

    const origName = originalContact.contact_name || `#${originalContact.id}`;
    const dupName = duplicateContact.contact_name || `#${duplicateContact.id}`;

    const confirmMsg = `Are you sure you want to merge Duplicate Contact #${duplicateContact.id} (${dupName}) into Original Contact #${originalContact.id} (${origName})?\n\n` +
      `Rule: Any column that is blank/empty in the Original will be merged from the Duplicate. ` +
      `Linked leads will be reassigned to Original Contact #${originalContact.id}. ` +
      `Duplicate Contact #${duplicateContact.id} will be archived in merge audit history and removed.`;

    if (!window.confirm(confirmMsg)) {
      return;
    }

    setIsMerging(true);
    try {
      const res = await api.mergeContactPair({
        originalId: originalContact.id,
        duplicateId: duplicateContact.id,
        mergedBy: 'admin',
        notes: `Merged duplicate contact #${duplicateContact.id} (${dupName}) into original #${originalContact.id} (${origName})`,
      });

      if (res && res.success) {
        onShowToast?.(res.message || `Contact #${duplicateContact.id} merged into #${originalContact.id} successfully.`, 'success');
        // Refresh original contact
        const refreshed = await api.getContactById(originalContact.id);
        if (refreshed?.data) {
          setOriginalContact(refreshed.data);
        } else if (res.data && res.data.updatedRecord) {
          setOriginalContact(res.data.updatedRecord);
        }
        // Clear duplicate
        setDuplicateContact(null);
      } else {
        onShowToast?.(res?.message || 'Failed to merge contacts.', 'error');
      }
    } catch (err) {
      console.error('Merge error:', err);
      onShowToast?.(`Merge failed: ${err.message}`, 'error');
    } finally {
      setIsMerging(false);
    }
  };

  // Table rows: show Original Contact and Duplicate Contact if selected
  const tableRows = useMemo(() => {
    const list = [];
    if (originalContact) list.push({ ...originalContact, _merge_role: 'Original' });
    if (duplicateContact) list.push({ ...duplicateContact, _merge_role: 'Duplicate' });
    return list;
  }, [originalContact, duplicateContact]);

  // Columns for contact comparison
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
      key: 'contact_name',
      label: 'Contact Name',
      minWidth: '160px',
      sortable: true,
      render: (r) => (
        <span style={{ fontWeight: 600, color: '#0284c7' }}>
          {r.contact_name}
        </span>
      ),
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
      render: (r) => r.designation || '—',
    },
    {
      key: 'pos_type',
      label: 'Position Type',
      width: '120px',
      render: (r) => r.pos_type || r.position_type || '—',
    },
    {
      key: 'country',
      label: 'Country',
      width: '110px',
      render: (r) => r.country || '—',
    },
    {
      key: 'email',
      label: 'Email',
      minWidth: '170px',
      render: (r) => r.email || r.comp_email || '—',
    },
    {
      key: 'phone',
      label: 'Phone',
      minWidth: '130px',
      render: (r) => r.phone || r.contact_phone || '—',
    },
    {
      key: 'mobile',
      label: 'Mobile',
      minWidth: '130px',
      render: (r) => r.mobile || r.contact_mobile || '—',
    },
    {
      key: 'linkedin_url',
      label: 'LinkedIn URL',
      minWidth: '180px',
      render: (r) => (
        r.linkedin_url && r.linkedin_url !== '—' ? (
          <a
            href={r.linkedin_url.startsWith('http') ? r.linkedin_url : `https://${r.linkedin_url}`}
            target="_blank"
            rel="noreferrer"
            style={{ color: '#0284c7', textDecoration: 'none' }}
          >
            {r.linkedin_url}
          </a>
        ) : '—'
      ),
    },
    {
      key: 'preferred_linkedin_connected',
      label: 'Preferred LinkedIn',
      minWidth: '150px',
      render: (r) => r.preferred_linkedin_connected || '—',
    },
    {
      key: 'contactstatus',
      label: 'Contact Status',
      width: '130px',
      render: (r) => r.contactstatus || r.contact_status || '—',
    },
    {
      key: 'salesperson',
      label: 'Salesperson',
      width: '130px',
      render: (r) => r.salesperson || '—',
    },
    {
      key: 'source',
      label: 'Source',
      width: '130px',
      render: (r) => r.source || '—',
    },
    {
      key: 'remark',
      label: 'Remark',
      minWidth: '150px',
      render: (r) => r.remark || r.remarks || '—',
    },
    {
      key: 'created_date',
      label: 'Created Date',
      width: '120px',
      render: (r) => r.created_date || '—',
    },
  ], []);

  return (
    <div className="duplicate-contact-merger-page" style={{ padding: '0 0.5rem 1.5rem 0.5rem' }}>
      {/* 1. Page Header */}
      <div style={{ marginBottom: '1.25rem' }}>
        <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: '#0f172a' }}>
          Duplicate Contact Merger
        </h2>
      </div>

      {/* 2. Top Selection Form Card (matching Oracle APEX screenshot media_1794791277408_24fc60be.png) */}
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
          {/* Left Column: Original Contact */}
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
                Select Contact
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', alignItems: 'center', gap: '0.75rem' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                Original Contact ID
              </label>
              <input
                type="text"
                readOnly
                value={originalContact ? originalContact.id : ''}
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
                Original Contact Name
              </label>
              <input
                type="text"
                readOnly
                value={originalContact ? originalContact.contact_name : ''}
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

          {/* Right Column: Duplicate Contact */}
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
                Select Duplicate Contact
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '170px 1fr', alignItems: 'center', gap: '0.75rem' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                Duplicate Contact ID
              </label>
              <input
                type="text"
                readOnly
                value={duplicateContact ? duplicateContact.id : ''}
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
                Duplicate Contact Name
              </label>
              <input
                type="text"
                readOnly
                value={duplicateContact ? duplicateContact.contact_name : ''}
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
          disabled={isMerging || !originalContact || !duplicateContact}
          style={{
            backgroundColor: '#e2e8f0',
            color: '#0f172a',
            border: '1px solid #cbd5e1',
            borderRadius: '4px',
            padding: '7px 20px',
            fontSize: '13px',
            fontWeight: 700,
            cursor: (!originalContact || !duplicateContact || isMerging) ? 'not-allowed' : 'pointer',
            opacity: (!originalContact || !duplicateContact || isMerging) ? 0.6 : 1,
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <IconGitMerge size={15} />
          <span>{isMerging ? 'Merging...' : 'Merge'}</span>
        </button>

        {originalContact && duplicateContact && (
          <span style={{ fontSize: '12px', color: '#475569', fontWeight: 500 }}>
            Ready to merge Duplicate Contact #{duplicateContact.id} into Original Contact #{originalContact.id}
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
        emptyMessage="No contact selected yet. Click 'Select Contact' and 'Select Duplicate Contact' above to choose records."
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
        type="contact"
        excludeId={modalSlot === 'duplicate' ? originalContact?.id : duplicateContact?.id}
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
