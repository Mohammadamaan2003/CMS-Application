import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ApexInteractiveReport from '../../components/ApexInteractiveReport';
import { api } from '../../api/client';
import {
  IconSearch,
  IconRefreshCw,
  IconGitMerge,
  IconBuilding,
  IconUsers,
  IconCheck,
  IconAlertTriangle,
  IconX,
  IconHistory,
  IconChevronRight,
  IconArrowLeft,
  IconShield,
  IconFilter
} from '../../components/Icons';

export default function MergeCompaniesPage({ onShowToast }) {
  const [activeView, setActiveView] = useState('candidates'); // 'candidates', 'studio', 'history'
  
  // Candidates List State
  const [candidateGroups, setCandidateGroups] = useState([]);
  const [totalGroups, setTotalGroups] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRule, setSelectedRule] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  // Comparison & Merge Studio State
  const [activeGroup, setActiveGroup] = useState(null);
  const [masterRecordId, setMasterRecordId] = useState(null);
  const [fieldOverrides, setFieldOverrides] = useState({});
  const [previewData, setPreviewData] = useState(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [mergeNotes, setMergeNotes] = useState('');

  // Merge History State
  const [historyList, setHistoryList] = useState([]);
  const [totalHistory, setTotalHistory] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [inspectedHistoryItem, setInspectedHistoryItem] = useState(null);

  // Fetch candidate duplicate groups
  const loadCandidates = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.getCompanyDuplicateCandidates({
        rule: selectedRule,
        search: appliedSearch,
        page: currentPage,
        limit: rowsPerPage,
      });
      if (res && res.success) {
        setCandidateGroups(res.data || []);
        setTotalGroups(res.total || 0);
      } else {
        setCandidateGroups([]);
        setTotalGroups(0);
      }
    } catch (err) {
      console.error('Failed to load company duplicates:', err);
      onShowToast?.(`Failed to load duplicate candidates: ${err.message}`, 'error');
      setCandidateGroups([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedRule, appliedSearch, currentPage, rowsPerPage, onShowToast]);

  // Fetch merge history
  const loadHistory = useCallback(async () => {
    setIsHistoryLoading(true);
    try {
      const res = await api.getMergeHistory({
        entityType: 'company',
        page: historyPage,
        limit: 20,
      });
      if (res && res.success) {
        setHistoryList(res.data || []);
        setTotalHistory(res.total || 0);
      }
    } catch (err) {
      console.error('Failed to load merge history:', err);
      onShowToast?.(`Failed to load merge history: ${err.message}`, 'error');
    } finally {
      setIsHistoryLoading(false);
    }
  }, [historyPage, onShowToast]);

  // View Form modal state for candidate company (matching APEX DUPLICATE_COMPANY_REPORT.VIEW_FORM)
  const [viewingCompany, setViewingCompany] = useState(null);

  // Handle Restore of Merged Record
  const handleRestore = useCallback(async (historyItem) => {
    if (!window.confirm(`Are you sure you want to restore merge audit #${historyItem.id}? This will restore merged company records and reassign child records back to their original IDs.`)) {
      return;
    }
    try {
      const res = await api.restoreMerge(historyItem.id, { restoredBy: 'admin' });
      if (res && res.success) {
        onShowToast?.(res.message || 'Merge successfully restored', 'success');
        loadHistory();
      } else {
        onShowToast?.(res?.message || 'Failed to restore merge', 'error');
      }
    } catch (err) {
      console.error('Restore error:', err);
      onShowToast?.(`Failed to restore: ${err.message}`, 'error');
    }
  }, [loadHistory, onShowToast]);

  useEffect(() => {
    if (activeView === 'candidates') {
      loadCandidates();
    } else if (activeView === 'history') {
      loadHistory();
    }
  }, [activeView, loadCandidates, loadHistory]);

  // Handle open studio
  const handleOpenStudio = (group) => {
    setActiveGroup(group);
    // Default master to the first record with highest ID or most contacts
    if (group.records && group.records.length > 0) {
      const sortedByCompleteness = [...group.records].sort((a, b) => {
        const countA = (a.contact_count || 0) + (a.lead_count || 0);
        const countB = (b.contact_count || 0) + (b.lead_count || 0);
        return countB - countA;
      });
      setMasterRecordId(sortedByCompleteness[0].id);
    }
    setFieldOverrides({});
    setPreviewData(null);
    setMergeNotes('');
    setActiveView('studio');
  };

  // Re-calculate preview when master or field override changes
  useEffect(() => {
    if (activeView !== 'studio' || !activeGroup || !masterRecordId) return;

    const secondaryIds = activeGroup.records
      .filter((r) => String(r.id) !== String(masterRecordId))
      .map((r) => r.id);

    if (secondaryIds.length === 0) return;

    let isSubscribed = true;
    setIsPreviewLoading(true);

    api.previewCompanyMerge({
      masterId: masterRecordId,
      secondaryIds,
      fieldOverrides,
    })
      .then((res) => {
        if (isSubscribed && res && res.success) {
          setPreviewData(res.data);
        }
      })
      .catch((err) => {
        if (isSubscribed) {
          console.error('Preview error:', err);
        }
      })
      .finally(() => {
        if (isSubscribed) setIsPreviewLoading(false);
      });

    return () => {
      isSubscribed = false;
    };
  }, [activeView, activeGroup, masterRecordId, fieldOverrides]);

  const companyDuplicateColumns = useMemo(() => [
    {
      key: 'matchRule',
      label: 'Match Rule',
      width: '180px',
      getValue: (g) => g.matchRule || '',
      render: (g) => {
        const ruleBadgeColor =
          g.matchRuleType === 'name' ? '#3b82f6' :
          g.matchRuleType === 'website' ? '#8b5cf6' : '#10b981';
        return (
          <span style={{
            display: 'inline-block',
            padding: '3px 8px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 600,
            color: ruleBadgeColor,
            background: `${ruleBadgeColor}15`,
            border: `${ruleBadgeColor}30`
          }}>
            {g.matchRule}
          </span>
        );
      }
    },
    {
      key: 'matchValue',
      label: 'Duplicate Key / Match Value',
      minWidth: '220px',
      getValue: (g) => g.matchValue || '',
      render: (g) => (
        <span style={{ fontWeight: 600, color: '#0f172a', wordBreak: 'break-all' }}>
          {g.matchValue || '—'}
        </span>
      )
    },
    {
      key: 'recordCount',
      label: 'Count',
      width: '120px',
      getValue: (g) => g.recordCount || 0,
      render: (g) => (
        <span style={{
          display: 'inline-block',
          padding: '2px 8px',
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: 700,
          background: '#fee2e2',
          color: '#b91c1c'
        }}>
          {g.recordCount} records
        </span>
      )
    },
    {
      key: 'candidateCompanies',
      label: 'Candidate Companies',
      minWidth: '340px',
      getValue: (g) => (g.records || []).map(r => `#${r.id} ${r.name}`).join(', '),
      render: (g) => (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {(g.records || []).map((r) => (
            <span
              key={r.id}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '3px 8px',
                background: '#f1f5f9',
                borderRadius: '4px',
                fontSize: '12px',
                color: '#334155'
              }}
            >
              <strong>{r.id}</strong> {r.name}
              {r.contact_count > 0 && (
                <span style={{ color: '#0284c7', fontSize: '11px' }}>({r.contact_count} contacts)</span>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setViewingCompany(r);
                }}
                style={{
                  border: 'none',
                  background: 'none',
                  color: '#2563eb',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '1px 4px',
                  textDecoration: 'underline'
                }}
                title="View Company Form"
              >
                View Form
              </button>
            </span>
          ))}
        </div>
      )
    },
    {
      key: 'action',
      label: 'Action',
      width: '150px',
      render: (g) => (
        <button
          type="button"
          onClick={() => handleOpenStudio(g)}
          style={{
            padding: '5px 12px',
            fontSize: '12px',
            fontWeight: 600,
            borderRadius: '4px',
            border: 'none',
            background: '#0284c7',
            color: '#ffffff',
            cursor: 'pointer'
          }}
        >
          Compare & Merge
        </button>
      )
    }
  ], []);

  const companyHistoryColumns = useMemo(() => [
    { key: 'id', label: 'Audit ID', width: '90px', getValue: (i) => `#${i.id}` },
    {
      key: 'master',
      label: 'Master Company',
      minWidth: '200px',
      getValue: (i) => `#${i.master_id} ${i.master_name || ''}`,
      render: (i) => (
        <span>
          <span style={{ fontWeight: 600, color: '#16a34a' }}>#{i.master_id}</span>{' '}
          <span>{i.master_name}</span>
        </span>
      )
    },
    {
      key: 'merged_ids',
      label: 'Merged Records',
      minWidth: '160px',
      getValue: (i) => (i.merged_ids || []).map(id => `#${id}`).join(', '),
      render: (i) => (
        <span style={{ color: '#dc2626', fontWeight: 600 }}>
          {(i.merged_ids || []).map(id => `#${id}`).join(', ')}
        </span>
      )
    },
    {
      key: 'contacts',
      label: 'Reassigned Contacts',
      width: '140px',
      getValue: (i) => i.reassigned_contacts_count || 0,
      render: (i) => <span style={{ color: '#0284c7', fontWeight: 600 }}>{i.reassigned_contacts_count || 0}</span>
    },
    {
      key: 'leads',
      label: 'Reassigned Leads',
      width: '130px',
      getValue: (i) => i.reassigned_leads_count || 0,
      render: (i) => <span style={{ color: '#0284c7', fontWeight: 600 }}>{i.reassigned_leads_count || 0}</span>
    },
    { key: 'merged_by', label: 'Executed By', width: '120px', getValue: (i) => i.merged_by || 'admin' },
    {
      key: 'merged_at',
      label: 'Timestamp',
      minWidth: '160px',
      getValue: (i) => i.merged_at ? new Date(i.merged_at).toLocaleString() : '—'
    },
    {
      key: 'status',
      label: 'Status',
      width: '120px',
      getValue: (i) => i.status || 'SUCCESS',
      render: (i) => (
        <span style={{
          display: 'inline-block',
          padding: '2px 8px',
          borderRadius: '10px',
          fontSize: '11px',
          fontWeight: 700,
          background: i.status === 'RESTORED' ? '#fef3c7' : '#dcfce7',
          color: i.status === 'RESTORED' ? '#b45309' : '#15803d'
        }}>
          {i.status || 'SUCCESS'}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      width: '110px',
      render: (i) => i.status !== 'RESTORED' ? (
        <button
          type="button"
          onClick={() => handleRestore(i)}
          style={{
            padding: '4px 10px',
            fontSize: '11px',
            fontWeight: 600,
            borderRadius: '4px',
            border: '1px solid #cbd5e1',
            background: '#ffffff',
            color: '#0284c7',
            cursor: 'pointer'
          }}
          title="Restore merged records back to database"
        >
          Restore
        </button>
      ) : (
        <span style={{ fontSize: '11px', color: '#94a3b8' }}>Restored</span>
      )
    }
  ], [handleRestore]);

  // Handle Execute Merge
  const handleConfirmMerge = async () => {
    if (!activeGroup || !masterRecordId) return;
    const secondaryIds = activeGroup.records
      .filter((r) => String(r.id) !== String(masterRecordId))
      .map((r) => r.id);

    if (secondaryIds.length === 0) {
      onShowToast?.('At least one secondary company must be selected.', 'warning');
      return;
    }

    setIsMerging(true);
    try {
      const res = await api.executeCompanyMerge({
        masterId: masterRecordId,
        secondaryIds,
        fieldOverrides,
        mergedBy: 'admin',
        notes: mergeNotes,
      });

      if (res && res.success) {
        onShowToast?.(res.message || 'Companies successfully merged!', 'success');
        setIsMergeModalOpen(false);
        setActiveView('candidates');
        loadCandidates();
      } else {
        throw new Error(res?.message || 'Merge failed');
      }
    } catch (err) {
      console.error('Merge execution failed:', err);
      onShowToast?.(`Merge failed: ${err.message}`, 'error');
    } finally {
      setIsMerging(false);
    }
  };

  const COMPARE_FIELDS = [
    { key: 'name', label: 'Company Name' },
    { key: 'website', label: 'Website' },
    { key: 'email', label: 'Corporate Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'country', label: 'Country' },
    { key: 'city', label: 'City' },
    { key: 'industry', label: 'Industry' },
    { key: 'company_type', label: 'Company Type' },
    { key: 'employee_size', label: 'Employee Size' },
    { key: 'registration_status', label: 'Registration Status' },
    { key: 'technology', label: 'Technology' },
    { key: 'source', label: 'Source' },
  ];

  return (
    <div className="duplicate-merger-page" style={{ padding: '20px 24px' }}>
      {/* Top Banner / Breadcrumb */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>
            <span>Duplicate Merger</span>
            <IconChevronRight size={13} />
            <span style={{ color: '#0f172a', fontWeight: 600 }}>Merge Companies</span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
            Duplicate Companies Consolidation
          </h1>
        </div>

        {/* View Switcher Tabs */}
        <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '8px', gap: '4px' }}>
          <button
            type="button"
            onClick={() => setActiveView('candidates')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: activeView === 'candidates' ? 600 : 500,
              color: activeView === 'candidates' ? '#0f172a' : '#64748b',
              background: activeView === 'candidates' ? '#ffffff' : 'transparent',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              boxShadow: activeView === 'candidates' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <IconGitMerge size={15} />
            <span>Candidate Groups</span>
            <span style={{
              background: activeView === 'candidates' ? '#e2e8f0' : '#e2e8f0',
              color: '#334155',
              fontSize: '11px',
              padding: '1px 6px',
              borderRadius: '10px',
              fontWeight: 700
            }}>
              {totalGroups}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveView('history')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: activeView === 'history' ? 600 : 500,
              color: activeView === 'history' ? '#0f172a' : '#64748b',
              background: activeView === 'history' ? '#ffffff' : 'transparent',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              boxShadow: activeView === 'history' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <IconHistory size={15} />
            <span>Merge History</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: CANDIDATE GROUPS LIST */}
      {activeView === 'candidates' && (
        <div style={{ background: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', overflow: 'hidden', padding: '1rem' }}>
          <ApexInteractiveReport
            columns={companyDuplicateColumns}
            data={candidateGroups}
            total={totalGroups}
            page={currentPage}
            onPageChange={setCurrentPage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(n) => { setRowsPerPage(n); setCurrentPage(1); }}
            search={searchQuery}
            onSearchChange={setSearchQuery}
            onSearchSubmit={() => { setAppliedSearch(searchQuery.trim()); setCurrentPage(1); }}
            isServerSide={true}
            isLoading={isLoading}
            toolbarButtons={
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <select
                  value={selectedRule}
                  onChange={(e) => {
                    setSelectedRule(e.target.value);
                    setCurrentPage(1);
                  }}
                  style={{
                    height: '34px',
                    padding: '0 8px',
                    borderRadius: '4px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    color: '#1e293b',
                    background: '#ffffff',
                    cursor: 'pointer'
                  }}
                >
                  <option value="all">All Match Rules</option>
                  <option value="name">Matching Company Name</option>
                  <option value="website">Matching Website Domain</option>
                  <option value="email">Matching Corporate Email</option>
                </select>
              </div>
            }
            renderTrailingCell={(group) => (
              <button
                type="button"
                onClick={() => handleOpenStudio(group)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  background: '#0284c7',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}
              >
                <IconGitMerge size={13} />
                <span>Compare & Merge</span>
              </button>
            )}
            onRefresh={loadCandidates}
            onReset={() => { setSearchQuery(''); setAppliedSearch(''); setCurrentPage(1); }}
            onShowToast={onShowToast}
          />
        </div>
      )}

      {/* VIEW 2: SIDE-BY-SIDE COMPARISON & MERGE STUDIO */}
      {activeView === 'studio' && activeGroup && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Top Control Bar */}
          <div style={{
            background: '#ffffff',
            padding: '16px 20px',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setActiveView('candidates')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  background: '#ffffff',
                  fontSize: '13px',
                  color: '#475569',
                  cursor: 'pointer'
                }}
              >
                <IconArrowLeft size={14} />
                <span>Back to Candidate Groups</span>
              </button>
              <div style={{ height: '24px', width: '1px', background: '#e2e8f0' }} />
              <span style={{ fontSize: '13px', color: '#64748b' }}>
                Comparing <strong>{activeGroup.records.length}</strong> candidate records matched by{' '}
                <strong style={{ color: '#0f172a' }}>{activeGroup.matchRule}</strong> ({activeGroup.matchValue})
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setIsMergeModalOpen(true)}
                disabled={!masterRecordId || isPreviewLoading}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 20px',
                  background: '#16a34a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: !masterRecordId || isPreviewLoading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}
              >
                <IconGitMerge size={16} />
                <span>Review & Confirm Merge</span>
              </button>
            </div>
          </div>

          {/* Reassignment Stats Summary Pill */}
          {previewData && (
            <div style={{
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: '8px',
              padding: '12px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '13px',
              color: '#1e40af'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{ fontWeight: 600 }}>Proposed Merge Impact:</span>
                <span>
                  <strong>{previewData.reassignedContactsCount}</strong> contacts will be reassigned to Master #{masterRecordId}
                </span>
                <span>•</span>
                <span>
                  <strong>{previewData.reassignedLeadsCount}</strong> leads will be reassigned to Master #{masterRecordId}
                </span>
                <span>•</span>
                <span>
                  <strong>{previewData.secondaryRecords.length}</strong> secondary record(s) will be merged and purged
                </span>
              </div>
              <div style={{ fontSize: '12px', color: '#3b82f6', fontWeight: 500 }}>
                Atomic PostgreSQL Transaction Protected
              </div>
            </div>
          )}

          {/* Side-by-Side Comparison Matrix */}
          <div style={{
            background: '#ffffff',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            overflowX: 'auto',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '16px', width: '200px', verticalAlign: 'top', color: '#475569' }}>
                    <div style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>Field Comparison</div>
                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 400, marginTop: '4px' }}>
                      Choose survivor record & retained attributes
                    </div>
                  </th>

                  {activeGroup.records.map((comp) => {
                    const isMaster = String(comp.id) === String(masterRecordId);
                    return (
                      <th
                        key={comp.id}
                        style={{
                          padding: '16px',
                          verticalAlign: 'top',
                          minWidth: '260px',
                          background: isMaster ? '#f0fdf4' : '#ffffff',
                          borderLeft: '1px solid #e2e8f0',
                          borderBottom: isMaster ? '2px solid #22c55e' : '1px solid #e2e8f0'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <input
                              type="radio"
                              name="masterCompanySelection"
                              checked={isMaster}
                              onChange={() => setMasterRecordId(comp.id)}
                              style={{ width: '16px', height: '16px', accentColor: '#16a34a', cursor: 'pointer' }}
                            />
                            <span style={{ fontWeight: 700, fontSize: '14px', color: isMaster ? '#15803d' : '#0f172a' }}>
                              Company #{comp.id}
                            </span>
                          </label>

                          <span style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '12px',
                            background: isMaster ? '#dcfce7' : '#fee2e2',
                            color: isMaster ? '#166534' : '#991b1b'
                          }}>
                            {isMaster ? 'SURVIVING MASTER' : 'SECONDARY (MERGE)'}
                          </span>
                        </div>

                        <div style={{ fontSize: '12px', color: '#475569', display: 'flex', gap: '8px', marginTop: '4px' }}>
                          <span style={{ background: '#e2e8f0', padding: '1px 6px', borderRadius: '4px' }}>
                            {comp.contact_count || 0} Contacts
                          </span>
                          <span style={{ background: '#e2e8f0', padding: '1px 6px', borderRadius: '4px' }}>
                            {comp.lead_count || 0} Leads
                          </span>
                        </div>
                      </th>
                    );
                  })}

                  {/* Surviving Retained Value Column */}
                  <th style={{
                    padding: '16px',
                    verticalAlign: 'top',
                    width: '260px',
                    background: '#f8fafc',
                    borderLeft: '2px solid #cbd5e1'
                  }}>
                    <div style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>Retained Master Value</div>
                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 400, marginTop: '4px' }}>
                      Final values to persist into database
                    </div>
                  </th>
                </tr>
              </thead>

              <tbody>
                {COMPARE_FIELDS.map((field, rowIdx) => {
                  const finalVal = previewData?.mergedValues?.[field.key] ?? '';

                  return (
                    <tr
                      key={field.key}
                      style={{
                        borderBottom: '1px solid #e2e8f0',
                        background: rowIdx % 2 === 0 ? '#ffffff' : '#fafbfc'
                      }}
                    >
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: '#334155' }}>
                        {field.label}
                      </td>

                      {activeGroup.records.map((comp) => {
                        const isMaster = String(comp.id) === String(masterRecordId);
                        const val = comp[field.key] || '—';
                        const isChosenValue = String(finalVal).trim() !== '' && String(comp[field.key]).trim() === String(finalVal).trim();

                        return (
                          <td
                            key={comp.id}
                            style={{
                              padding: '12px 16px',
                              borderLeft: '1px solid #e2e8f0',
                              background: isMaster ? (rowIdx % 2 === 0 ? '#fafffa' : '#f4fbf4') : 'inherit',
                              color: val === '—' ? '#94a3b8' : '#0f172a'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                              <span style={{ wordBreak: 'break-word', fontWeight: isChosenValue ? 600 : 400 }}>
                                {val}
                              </span>
                              {val !== '—' && (
                                <button
                                  type="button"
                                  title={`Use this value for ${field.label}`}
                                  onClick={() => {
                                    setFieldOverrides((prev) => ({
                                      ...prev,
                                      [field.key]: comp[field.key]
                                    }));
                                  }}
                                  style={{
                                    border: 'none',
                                    background: isChosenValue ? '#22c55e' : '#e2e8f0',
                                    color: isChosenValue ? '#ffffff' : '#475569',
                                    borderRadius: '4px',
                                    padding: '2px 6px',
                                    fontSize: '11px',
                                    cursor: 'pointer',
                                    flexShrink: 0
                                  }}
                                >
                                  {isChosenValue ? '✓ In Use' : 'Use This'}
                                </button>
                              )}
                            </div>
                          </td>
                        );
                      })}

                      {/* Final Value Cell with Edit Override Input */}
                      <td style={{
                        padding: '8px 16px',
                        borderLeft: '2px solid #cbd5e1',
                        background: '#f8fafc'
                      }}>
                        <input
                          type="text"
                          value={fieldOverrides[field.key] !== undefined ? fieldOverrides[field.key] : finalVal}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFieldOverrides((prev) => ({
                              ...prev,
                              [field.key]: val
                            }));
                          }}
                          placeholder={`Enter ${field.label}...`}
                          style={{
                            width: '100%',
                            height: '32px',
                            padding: '0 8px',
                            borderRadius: '4px',
                            border: '1px solid #cbd5e1',
                            fontSize: '12px',
                            background: '#ffffff',
                            fontWeight: 500,
                            color: '#0f172a'
                          }}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL */}
      {isMergeModalOpen && activeGroup && previewData && (
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
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            maxWidth: '560px',
            width: '100%',
            overflow: 'hidden',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
          }}>
            {/* Header */}
            <div style={{
              padding: '18px 24px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#f8fafc'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{
                  background: '#fef2f2',
                  color: '#dc2626',
                  padding: '8px',
                  borderRadius: '8px',
                  display: 'flex'
                }}>
                  <IconAlertTriangle size={20} />
                </span>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
                  Confirm Company Consolidation
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsMergeModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <IconX size={18} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '24px' }}>
              <p style={{ margin: '0 0 16px', fontSize: '14px', color: '#334155', lineHeight: 1.5 }}>
                You are about to permanently merge secondary company records into the master record inside the local PostgreSQL database.
              </p>

              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px', marginBottom: '16px' }}>
                <div style={{ marginBottom: '8px', fontSize: '13px' }}>
                  <span style={{ color: '#64748b' }}>Surviving Master:</span>{' '}
                  <strong style={{ color: '#16a34a' }}>
                    #{masterRecordId} - {previewData.mergedValues.comp_name || previewData.masterRecord.name}
                  </strong>
                </div>

                <div style={{ marginBottom: '8px', fontSize: '13px' }}>
                  <span style={{ color: '#64748b' }}>Merging & Removing:</span>{' '}
                  <strong style={{ color: '#dc2626' }}>
                    {previewData.secondaryRecords.map((s) => `#${s.id} (${s.name})`).join(', ')}
                  </strong>
                </div>

                <div style={{ fontSize: '13px', color: '#0284c7' }}>
                  Reassigning <strong>{previewData.reassignedContactsCount} contacts</strong> and{' '}
                  <strong>{previewData.reassignedLeadsCount} leads</strong> to Master #{masterRecordId}.
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Merge Audit Note (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Consolidated matching website domain suez.com"
                  value={mergeNotes}
                  onChange={(e) => setMergeNotes(e.target.value)}
                  style={{
                    width: '100%',
                    height: '36px',
                    padding: '0 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px'
                  }}
                />
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '12px',
                color: '#64748b',
                background: '#f1f5f9',
                padding: '10px 14px',
                borderRadius: '6px'
              }}>
                <IconShield size={16} style={{ color: '#0ea5e9' }} />
                <span>Operation executes within an atomic transaction. If any foreign key or update fails, all changes are rolled back.</span>
              </div>
            </div>

            {/* Footer */}
            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              background: '#f8fafc'
            }}>
              <button
                type="button"
                onClick={() => setIsMergeModalOpen(false)}
                disabled={isMerging}
                style={{
                  padding: '8px 18px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#475569',
                  cursor: isMerging ? 'not-allowed' : 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmMerge}
                disabled={isMerging}
                style={{
                  padding: '8px 20px',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#dc2626',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#ffffff',
                  cursor: isMerging ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {isMerging ? (
                  <>
                    <IconRefreshCw size={14} className="spin" />
                    <span>Executing Merge...</span>
                  </>
                ) : (
                  <>
                    <IconGitMerge size={14} />
                    <span>Confirm Merge</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: MERGE AUDIT HISTORY */}
      {activeView === 'history' && (
        <div style={{ background: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', overflow: 'hidden', padding: '1rem' }}>
          <ApexInteractiveReport
            title="Company Merge Audit Trail"
            columns={companyHistoryColumns}
            data={historyList}
            total={totalHistory}
            page={historyPage}
            onPageChange={setHistoryPage}
            rowsPerPage={20}
            isServerSide={true}
            isLoading={isHistoryLoading}
            renderTrailingCell={(item) => (
              <button
                type="button"
                onClick={() => setInspectedHistoryItem(item)}
                style={{
                  padding: '4px 10px',
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px',
                  fontSize: '12px',
                  color: '#334155',
                  cursor: 'pointer'
                }}
              >
                Details
              </button>
            )}
            onRefresh={loadHistory}
            onShowToast={onShowToast}
          />
        </div>
      )}

      {/* INSPECT AUDIT JSON MODAL */}
      {inspectedHistoryItem && (
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
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            maxWidth: '650px',
            width: '100%',
            overflow: 'hidden',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
          }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#f8fafc'
            }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                Merge Audit Record #{inspectedHistoryItem.id}
              </h3>
              <button
                type="button"
                onClick={() => setInspectedHistoryItem(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <IconX size={18} />
              </button>
            </div>
            <div style={{ padding: '20px', maxHeight: '450px', overflowY: 'auto' }}>
              <pre style={{
                background: '#0f172a',
                color: '#f8fafc',
                padding: '16px',
                borderRadius: '8px',
                fontSize: '12px',
                overflowX: 'auto',
                margin: 0
              }}>
                {JSON.stringify(inspectedHistoryItem, null, 2)}
              </pre>
            </div>
            <div style={{ padding: '12px 20px', borderTop: '1px solid #e2e8f0', textAlign: 'right', background: '#f8fafc' }}>
              <button
                type="button"
                onClick={() => setInspectedHistoryItem(null)}
                style={{
                  padding: '6px 16px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* View Form Modal (Apex DUPLICATE_COMPANY_REPORT View Form reference) */}
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
          <div style={{
            background: '#ffffff',
            borderRadius: '8px',
            maxWidth: '600px',
            width: '100%',
            overflow: 'hidden',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              borderBottom: '1px solid #e2e8f0',
              background: '#f8fafc'
            }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                Company Form: #{viewingCompany.id} {viewingCompany.name}
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
                <span style={{ color: '#64748b', display: 'block', fontSize: '11px', fontWeight: 600 }}>Company ID</span>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>#{viewingCompany.id}</span>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '11px', fontWeight: 600 }}>Company Name</span>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>{viewingCompany.name || '—'}</span>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '11px', fontWeight: 600 }}>Industry</span>
                <span>{viewingCompany.industry || '—'}</span>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '11px', fontWeight: 600 }}>Website</span>
                <span>{viewingCompany.website ? <a href={viewingCompany.website.startsWith('http') ? viewingCompany.website : `https://${viewingCompany.website}`} target="_blank" rel="noreferrer" style={{ color: '#0284c7' }}>{viewingCompany.website}</a> : '—'}</span>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '11px', fontWeight: 600 }}>Country</span>
                <span>{viewingCompany.country || '—'}</span>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '11px', fontWeight: 600 }}>City</span>
                <span>{viewingCompany.city || '—'}</span>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '11px', fontWeight: 600 }}>Technology</span>
                <span>{viewingCompany.technology || '—'}</span>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '11px', fontWeight: 600 }}>Contact Count</span>
                <span style={{ fontWeight: 700, color: '#0284c7' }}>{viewingCompany.contact_count ?? 0}</span>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '11px', fontWeight: 600 }}>Employee Size</span>
                <span>{viewingCompany.employee_size || '—'}</span>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '11px', fontWeight: 600 }}>Company Type</span>
                <span>{viewingCompany.company_type || '—'}</span>
              </div>
            </div>
            <div style={{ padding: '12px 20px', borderTop: '1px solid #e2e8f0', textAlign: 'right', background: '#f8fafc' }}>
              <button
                type="button"
                onClick={() => setViewingCompany(null)}
                style={{
                  padding: '6px 16px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
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

