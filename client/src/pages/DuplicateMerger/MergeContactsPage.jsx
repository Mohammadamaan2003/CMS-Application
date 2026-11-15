import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../api/client';
import {
  IconSearch,
  IconRefreshCw,
  IconGitMerge,
  IconUsers,
  IconCheck,
  IconAlertTriangle,
  IconX,
  IconHistory,
  IconChevronRight,
  IconArrowLeft,
  IconShield,
} from '../../components/Icons';

export default function MergeContactsPage({ onShowToast }) {
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

  // Fetch candidate duplicate contact groups
  const loadCandidates = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.getContactDuplicateCandidates({
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
      console.error('Failed to load contact duplicates:', err);
      onShowToast?.(`Failed to load duplicate candidates: ${err.message}`, 'error');
      setCandidateGroups([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedRule, appliedSearch, currentPage, rowsPerPage, onShowToast]);

  // Fetch contact merge history
  const loadHistory = useCallback(async () => {
    setIsHistoryLoading(true);
    try {
      const res = await api.getMergeHistory({
        entityType: 'contact',
        page: historyPage,
        limit: 20,
      });
      if (res && res.success) {
        setHistoryList(res.data || []);
        setTotalHistory(res.total || 0);
      }
    } catch (err) {
      console.error('Failed to load contact merge history:', err);
      onShowToast?.(`Failed to load merge history: ${err.message}`, 'error');
    } finally {
      setIsHistoryLoading(false);
    }
  }, [historyPage, onShowToast]);

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
    if (group.records && group.records.length > 0) {
      // Default master to the first record with highest ID
      const sortedByCompleteness = [...group.records].sort((a, b) => b.id - a.id);
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

    api.previewContactMerge({
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
          console.error('Contact preview error:', err);
        }
      })
      .finally(() => {
        if (isSubscribed) setIsPreviewLoading(false);
      });

    return () => {
      isSubscribed = false;
    };
  }, [activeView, activeGroup, masterRecordId, fieldOverrides]);

  // Handle Execute Contact Merge
  const handleConfirmMerge = async () => {
    if (!activeGroup || !masterRecordId) return;
    const secondaryIds = activeGroup.records
      .filter((r) => String(r.id) !== String(masterRecordId))
      .map((r) => r.id);

    if (secondaryIds.length === 0) {
      onShowToast?.('At least one secondary contact must be selected.', 'warning');
      return;
    }

    setIsMerging(true);
    try {
      const res = await api.executeContactMerge({
        masterId: masterRecordId,
        secondaryIds,
        fieldOverrides,
        mergedBy: 'admin',
        notes: mergeNotes,
      });

      if (res && res.success) {
        onShowToast?.(res.message || 'Contacts successfully merged!', 'success');
        setIsMergeModalOpen(false);
        setActiveView('candidates');
        loadCandidates();
      } else {
        throw new Error(res?.message || 'Merge failed');
      }
    } catch (err) {
      console.error('Contact merge execution failed:', err);
      onShowToast?.(`Merge failed: ${err.message}`, 'error');
    } finally {
      setIsMerging(false);
    }
  };

  const COMPARE_FIELDS = [
    { key: 'contact_name', label: 'Contact Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'mobile', label: 'Mobile' },
    { key: 'designation', label: 'Designation' },
    { key: 'position_type', label: 'Position Type' },
    { key: 'country', label: 'Country' },
    { key: 'linkedin_url', label: 'LinkedIn URL' },
    { key: 'company_name', label: 'Company' },
    { key: 'salesperson', label: 'Salesperson' },
    { key: 'source', label: 'Source' },
    { key: 'contactstatus', label: 'Status' },
    { key: 'remark', label: 'Remark' },
  ];

  return (
    <div className="duplicate-merger-page" style={{ padding: '20px 24px' }}>
      {/* Top Banner / Breadcrumb */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>
            <span>Duplicate Merger</span>
            <IconChevronRight size={13} />
            <span style={{ color: '#0f172a', fontWeight: 600 }}>Merge Contacts</span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
            Duplicate Contacts Consolidation
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
              transition: 'all 0.15s ease',
            }}
          >
            <IconUsers size={15} />
            <span>Candidate Groups</span>
            <span style={{
              background: '#e2e8f0',
              color: '#334155',
              fontSize: '11px',
              padding: '1px 6px',
              borderRadius: '10px',
              fontWeight: 700,
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
              transition: 'all 0.15s ease',
            }}
          >
            <IconHistory size={15} />
            <span>Merge History</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: CANDIDATE GROUPS LIST */}
      {activeView === 'candidates' && (
        <div style={{ background: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          {/* Filter Bar */}
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            background: '#fafbfc',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '320px' }}>
              <div style={{ position: 'relative', width: '240px' }}>
                <select
                  value={selectedRule}
                  onChange={(e) => {
                    setSelectedRule(e.target.value);
                    setCurrentPage(1);
                  }}
                  style={{
                    width: '100%',
                    height: '36px',
                    padding: '0 30px 0 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    color: '#1e293b',
                    background: '#ffffff',
                    cursor: 'pointer',
                  }}
                >
                  <option value="all">All Match Rules</option>
                  <option value="email">Matching Email Address</option>
                  <option value="linkedin">Matching LinkedIn Profile</option>
                  <option value="name_company">Same Name at Same Company</option>
                  <option value="phone">Matching Phone/Mobile</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', flex: 1, maxWidth: '400px' }}>
                <div style={{ position: 'relative', width: '100%' }}>
                  <input
                    type="text"
                    placeholder="Search candidate match values..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        setAppliedSearch(searchQuery);
                        setCurrentPage(1);
                      }
                    }}
                    style={{
                      width: '100%',
                      height: '36px',
                      padding: '0 12px',
                      border: '1px solid #cbd5e1',
                      borderRight: 'none',
                      borderRadius: '6px 0 0 6px',
                      fontSize: '13px',
                      color: '#0f172a',
                    }}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setAppliedSearch('');
                        setCurrentPage(1);
                      }}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer',
                      }}
                    >
                      <IconX size={14} />
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAppliedSearch(searchQuery);
                    setCurrentPage(1);
                  }}
                  style={{
                    height: '36px',
                    padding: '0 16px',
                    background: '#0ea5e9',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '0 6px 6px 0',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Go
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#64748b' }}>
                <span>Rows:</span>
                <select
                  value={rowsPerPage}
                  onChange={(e) => {
                    setRowsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  style={{
                    height: '32px',
                    padding: '0 8px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                  }}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              <button
                type="button"
                onClick={loadCandidates}
                title="Refresh candidate groups"
                style={{
                  height: '36px',
                  padding: '0 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  fontSize: '13px',
                  color: '#475569',
                  cursor: 'pointer',
                }}
              >
                <IconRefreshCw size={14} className={isLoading ? 'spin' : ''} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Groups Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 600 }}>
                  <th style={{ padding: '12px 16px', width: '60px' }}>#</th>
                  <th style={{ padding: '12px 16px', width: '220px' }}>Match Rule</th>
                  <th style={{ padding: '12px 16px' }}>Duplicate Key / Match Value</th>
                  <th style={{ padding: '12px 16px', width: '120px', textAlign: 'center' }}>Count</th>
                  <th style={{ padding: '12px 16px' }}>Candidate Contacts</th>
                  <th style={{ padding: '12px 16px', width: '160px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                        <IconRefreshCw size={18} className="spin" />
                        <span>Searching local database for duplicate contact groups...</span>
                      </div>
                    </td>
                  </tr>
                ) : candidateGroups.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
                      <IconCheck size={32} style={{ color: '#10b981', margin: '0 auto 8px', display: 'block' }} />
                      <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '15px' }}>No Duplicate Contact Groups Found</div>
                      <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                        {appliedSearch ? 'Try clearing your search query or selecting another match rule.' : 'The local database has no duplicate contacts matching the selected criteria.'}
                      </div>
                    </td>
                  </tr>
                ) : (
                  candidateGroups.map((group, idx) => {
                    const rowNum = (currentPage - 1) * rowsPerPage + idx + 1;
                    const ruleBadgeColor =
                      group.matchRuleType === 'email' ? '#0ea5e9' :
                      group.matchRuleType === 'linkedin' ? '#0284c7' :
                      group.matchRuleType === 'name_company' ? '#8b5cf6' : '#10b981';

                    return (
                      <tr
                        key={group.groupId || idx}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          transition: 'background 0.15s ease',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
                      >
                        <td style={{ padding: '12px 16px', color: '#94a3b8', fontWeight: 500 }}>
                          {rowNum}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 600,
                            color: ruleBadgeColor,
                            background: `${ruleBadgeColor}15`,
                            border: `1px solid ${ruleBadgeColor}30`,
                          }}>
                            {group.matchRule}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a' }}>
                          <div style={{ wordBreak: 'break-all' }}>{group.matchValue || '—'}</div>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: 700,
                            background: '#fee2e2',
                            color: '#b91c1c',
                          }}>
                            {group.recordCount} contacts
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {group.records.map((r) => (
                              <span
                                key={r.id}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '2px 8px',
                                  background: '#f1f5f9',
                                  borderRadius: '4px',
                                  fontSize: '12px',
                                  color: '#334155',
                                }}
                              >
                                <strong>#{r.id}</strong> {r.contact_name}
                                {r.company_name && (
                                  <span style={{ color: '#64748b', fontSize: '11px' }}>({r.company_name})</span>
                                )}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
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
                              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                            }}
                          >
                            <IconGitMerge size={13} />
                            <span>Compare & Merge</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {totalGroups > 0 && (
            <div style={{
              padding: '12px 20px',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '13px',
              color: '#64748b',
              background: '#fafbfc',
            }}>
              <div>
                Showing {(currentPage - 1) * rowsPerPage + 1} - {Math.min(currentPage * rowsPerPage, totalGroups)} of {totalGroups} duplicate groups
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  style={{
                    padding: '4px 12px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '4px',
                    background: currentPage <= 1 ? '#f1f5f9' : '#ffffff',
                    color: currentPage <= 1 ? '#94a3b8' : '#334155',
                    cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                  }}
                >
                  Previous
                </button>
                <span style={{ padding: '4px 8px', fontWeight: 600, color: '#0f172a' }}>{currentPage}</span>
                <button
                  type="button"
                  disabled={currentPage * rowsPerPage >= totalGroups}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  style={{
                    padding: '4px 12px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '4px',
                    background: currentPage * rowsPerPage >= totalGroups ? '#f1f5f9' : '#ffffff',
                    color: currentPage * rowsPerPage >= totalGroups ? '#94a3b8' : '#334155',
                    cursor: currentPage * rowsPerPage >= totalGroups ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
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
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
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
                  cursor: 'pointer',
                }}
              >
                <IconArrowLeft size={14} />
                <span>Back to Candidate Groups</span>
              </button>
              <div style={{ height: '24px', width: '1px', background: '#e2e8f0' }} />
              <span style={{ fontSize: '13px', color: '#64748b' }}>
                Comparing <strong>{activeGroup.records.length}</strong> candidate contacts matched by{' '}
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
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
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
              color: '#1e40af',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{ fontWeight: 600 }}>Proposed Merge Impact:</span>
                <span>
                  <strong>{previewData.reassignedLeadContactsCount}</strong> lead contact associations will be reassigned to Master #{masterRecordId}
                </span>
                <span>•</span>
                <span>
                  <strong>{previewData.secondaryRecords.length}</strong> secondary contact(s) will be merged and purged
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
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '16px', width: '200px', verticalAlign: 'top', color: '#475569' }}>
                    <div style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>Field Comparison</div>
                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 400, marginTop: '4px' }}>
                      Choose survivor contact & retained attributes
                    </div>
                  </th>

                  {activeGroup.records.map((ct) => {
                    const isMaster = String(ct.id) === String(masterRecordId);
                    return (
                      <th
                        key={ct.id}
                        style={{
                          padding: '16px',
                          verticalAlign: 'top',
                          minWidth: '260px',
                          background: isMaster ? '#f0fdf4' : '#ffffff',
                          borderLeft: '1px solid #e2e8f0',
                          borderBottom: isMaster ? '2px solid #22c55e' : '1px solid #e2e8f0',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <input
                              type="radio"
                              name="masterContactSelection"
                              checked={isMaster}
                              onChange={() => setMasterRecordId(ct.id)}
                              style={{ width: '16px', height: '16px', accentColor: '#16a34a', cursor: 'pointer' }}
                            />
                            <span style={{ fontWeight: 700, fontSize: '14px', color: isMaster ? '#15803d' : '#0f172a' }}>
                              Contact #{ct.id}
                            </span>
                          </label>

                          <span style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '12px',
                            background: isMaster ? '#dcfce7' : '#fee2e2',
                            color: isMaster ? '#166534' : '#991b1b',
                          }}>
                            {isMaster ? 'SURVIVING MASTER' : 'SECONDARY (MERGE)'}
                          </span>
                        </div>

                        <div style={{ fontSize: '12px', color: '#475569' }}>
                          {ct.company_name ? `Org: ${ct.company_name}` : 'No Organization'}
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
                    borderLeft: '2px solid #cbd5e1',
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
                        background: rowIdx % 2 === 0 ? '#ffffff' : '#fafbfc',
                      }}
                    >
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: '#334155' }}>
                        {field.label}
                      </td>

                      {activeGroup.records.map((ct) => {
                        const isMaster = String(ct.id) === String(masterRecordId);
                        const val = ct[field.key] || '—';
                        const isChosenValue = String(finalVal).trim() !== '' && String(ct[field.key]).trim() === String(finalVal).trim();

                        return (
                          <td
                            key={ct.id}
                            style={{
                              padding: '12px 16px',
                              borderLeft: '1px solid #e2e8f0',
                              background: isMaster ? (rowIdx % 2 === 0 ? '#fafffa' : '#f4fbf4') : 'inherit',
                              color: val === '—' ? '#94a3b8' : '#0f172a',
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
                                      [field.key]: ct[field.key],
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
                                    flexShrink: 0,
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
                        background: '#f8fafc',
                      }}>
                        <input
                          type="text"
                          value={fieldOverrides[field.key] !== undefined ? fieldOverrides[field.key] : finalVal}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFieldOverrides((prev) => ({
                              ...prev,
                              [field.key]: val,
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
                            color: '#0f172a',
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
          padding: '20px',
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            maxWidth: '560px',
            width: '100%',
            overflow: 'hidden',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
          }}>
            {/* Header */}
            <div style={{
              padding: '18px 24px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#f8fafc',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{
                  background: '#fef2f2',
                  color: '#dc2626',
                  padding: '8px',
                  borderRadius: '8px',
                  display: 'flex',
                }}>
                  <IconAlertTriangle size={20} />
                </span>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
                  Confirm Contact Consolidation
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
                You are about to permanently merge secondary contact records into the master contact inside the local PostgreSQL database.
              </p>

              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px', marginBottom: '16px' }}>
                <div style={{ marginBottom: '8px', fontSize: '13px' }}>
                  <span style={{ color: '#64748b' }}>Surviving Master:</span>{' '}
                  <strong style={{ color: '#16a34a' }}>
                    #{masterRecordId} - {previewData.mergedValues.contact_name || previewData.masterRecord.contact_name}
                  </strong>
                </div>

                <div style={{ marginBottom: '8px', fontSize: '13px' }}>
                  <span style={{ color: '#64748b' }}>Merging & Removing:</span>{' '}
                  <strong style={{ color: '#dc2626' }}>
                    {previewData.secondaryRecords.map((s) => `#${s.id} (${s.contact_name || 'Contact'})`).join(', ')}
                  </strong>
                </div>

                <div style={{ fontSize: '13px', color: '#0284c7' }}>
                  Reassigning <strong>{previewData.reassignedLeadContactsCount} lead contact linkages</strong> to Master #{masterRecordId}.
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Merge Audit Note (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Merged duplicate contacts with same email address"
                  value={mergeNotes}
                  onChange={(e) => setMergeNotes(e.target.value)}
                  style={{
                    width: '100%',
                    height: '36px',
                    padding: '0 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
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
                borderRadius: '6px',
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
              background: '#f8fafc',
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
                  cursor: isMerging ? 'not-allowed' : 'pointer',
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
                  gap: '6px',
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
        <div style={{ background: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#fafbfc',
          }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                Contact Merge Audit Trail
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#64748b' }}>
                Permanent audit records of executed contact merges in PostgreSQL
              </p>
            </div>
            <button
              type="button"
              onClick={loadHistory}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                fontSize: '13px',
                color: '#475569',
                cursor: 'pointer',
              }}
            >
              <IconRefreshCw size={14} className={isHistoryLoading ? 'spin' : ''} />
              <span>Refresh History</span>
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 600 }}>
                  <th style={{ padding: '12px 16px' }}>Audit ID</th>
                  <th style={{ padding: '12px 16px' }}>Master Contact</th>
                  <th style={{ padding: '12px 16px' }}>Merged Records</th>
                  <th style={{ padding: '12px 16px' }}>Reassigned Lead Contacts</th>
                  <th style={{ padding: '12px 16px' }}>Executed By</th>
                  <th style={{ padding: '12px 16px' }}>Timestamp</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {isHistoryLoading ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                      <IconRefreshCw size={16} className="spin" style={{ margin: '0 auto 8px', display: 'block' }} />
                      Loading merge history...
                    </td>
                  </tr>
                ) : historyList.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                      No merge history recorded yet.
                    </td>
                  </tr>
                ) : (
                  historyList.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a' }}>
                        #{item.id}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontWeight: 600, color: '#16a34a' }}>#{item.master_id}</span>{' '}
                        <span>{item.master_name}</span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ color: '#dc2626', fontWeight: 600 }}>
                          {(item.merged_ids || []).map((id) => `#${id}`).join(', ')}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#0284c7', fontWeight: 600 }}>
                        {item.reassigned_lead_contacts_count || 0}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#475569' }}>
                        {item.merged_by || 'admin'}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#64748b' }}>
                        {item.merged_at ? new Date(item.merged_at).toLocaleString() : '—'}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
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
                            cursor: 'pointer',
                          }}
                        >
                          View Audit JSON
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
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
          padding: '20px',
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            maxWidth: '650px',
            width: '100%',
            overflow: 'hidden',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
          }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#f8fafc',
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
                margin: 0,
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
                  cursor: 'pointer',
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

