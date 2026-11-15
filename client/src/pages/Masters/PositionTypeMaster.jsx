import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../../api/client';
import { formatAppDate } from '../../utils/dateUtils';
import ApexActionsMenu from '../../components/ApexActionsMenu';
import SelectColumnsModal from '../../components/SelectColumnsModal';
import ApexFilterModal from '../../components/ApexFilterModal';
import ApexChartModal from '../../components/ApexChartModal';
import ApexAggregateModal from '../../components/ApexAggregateModal';
import ActiveAggregationsBar from '../../components/ActiveAggregationsBar';
import ApexColumnHeaderMenu from '../../components/ApexColumnHeaderMenu';
import ApexActiveFilterBanner from '../../components/ApexActiveFilterBanner';
import { useApexColumnMenu } from '../../utils/useApexColumnMenu';
import { computeAggregationValue } from '../../utils/aggregationUtils';
import {
  IconSearch,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconFilePenLine,
  IconClose,
  IconCalendar,
  IconTrash,
  IconDownload,
} from '../../components/Icons';

export const POSITION_TYPE_MASTER_COLUMNS = [
  {
    key: 'master_position_type',
    label: 'Master Position Type',
    getValue: (r) => r.master_position_type || r.pos_type || '',
  },
  {
    key: 'master_position_type_count',
    label: 'Master Position Type Count',
    getValue: (r) => (r.master_position_type_count !== undefined ? Number(r.master_position_type_count).toLocaleString() : '0'),
  },
  {
    key: 'contact_position_type',
    label: 'Contact Position Type',
    getValue: (r) => r.contact_position_type || '',
  },
  {
    key: 'contact_position_type_count',
    label: 'Contact Position Type Count',
    getValue: (r) => (r.contact_position_type_count !== undefined ? Number(r.contact_position_type_count).toLocaleString() : '0'),
  },
  {
    key: 'validation_status',
    label: 'Validation Status',
    getValue: (r) => r.validation_status || 'DATA IN BOTH',
  },
  {
    key: 'created_date',
    label: 'Created Date',
    getValue: (r) => formatAppDate(r.created_date),
  },
  {
    key: 'modified_date',
    label: 'Modified Date',
    getValue: (r) => formatAppDate(r.modified_date),
  },
];

const DEFAULT_MASTER_KEYS = POSITION_TYPE_MASTER_COLUMNS.map((c) => c.key);
export const POSITION_TYPE_COLUMNS = POSITION_TYPE_MASTER_COLUMNS;

export default function PositionTypeMaster({ onShowToast, onNavigateToContactForm, onNavigateToCompanyForm }) {
  // Mode: 'report' or 'form' with localStorage persistence
  const [viewMode, setViewMode] = useState(() => {
    try {
      const saved = localStorage.getItem('apex_position_type_active_form');
      if (saved) return 'form';
    } catch (e) {}
    return 'report';
  });

  const [selectedRecord, setSelectedRecord] = useState(() => {
    try {
      const saved = localStorage.getItem('apex_position_type_active_form');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return null;
  });

  // Form state matching Screenshot 2
  const [formData, setFormData] = useState(() => {
    try {
      const saved = localStorage.getItem('apex_position_type_active_form');
      if (saved) {
        const rec = JSON.parse(saved);
        return {
          master_position_type: rec.master_position_type || rec.pos_type || '',
          master_position_type_count: rec.master_position_type_count || rec.contact_count || 0,
          contact_position_type: rec.contact_position_type || rec.pos_type || '',
          contact_position_type_count: rec.contact_position_type_count || rec.contact_count || 0,
          validation_status: rec.validation_status || 'DATA IN BOTH',
          created_by: rec.created_by || 'APEX_PUBLIC_USER',
          created_date: rec.created_date || '20-JUL-2026',
          modified_by: rec.modified_by || 'MARIYA_BADAR',
          modified_date: rec.modified_date || '12-NOV-2026',
        };
      }
    } catch (e) {}
    return {
      master_position_type: '',
      master_position_type_count: 0,
      contact_position_type: '',
      contact_position_type_count: 0,
      validation_status: 'DATA IN BOTH',
      created_by: 'APEX_PUBLIC_USER',
      created_date: '20-JUL-2026',
      modified_by: 'MARIYA_BADAR',
      modified_date: '12-NOV-2026',
    };
  });

  // Master Report Data State
  const [masterList, setMasterList] = useState([]);
  const [loadingMaster, setLoadingMaster] = useState(true);
  const [masterSearch, setMasterSearch] = useState('');
  const [activeMasterSearch, setActiveMasterSearch] = useState('');
  const [masterRows, setMasterRows] = useState(50);
  const [masterPage, setMasterPage] = useState(1);
  const [masterTotal, setMasterTotal] = useState(0);

  // Row selection for batch actions
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Modals & Menu
  const [showMasterActions, setShowMasterActions] = useState(false);
  const [showMasterColumnsModal, setShowMasterColumnsModal] = useState(false);
  const [showMasterFilterModal, setShowMasterFilterModal] = useState(false);
  const [showMasterChartModal, setShowMasterChartModal] = useState(false);
  const [showAggregateModal, setShowAggregateModal] = useState(false);
  const [aggregations, setAggregations] = useState([]);

  // Dropdown options
  const [positionTypeOptions, setPositionTypeOptions] = useState([]);

  // Column visibility
  const [masterVisibleKeys, setMasterVisibleKeys] = useState(() => {
    try {
      const s = localStorage.getItem('position_type_visible_columns');
      if (s) {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return DEFAULT_MASTER_KEYS;
  });

  const handleSaveColumns = (newKeys) => {
    setMasterVisibleKeys(newKeys);
    try {
      localStorage.setItem('position_type_visible_columns', JSON.stringify(newKeys));
    } catch (e) {}
  };

  // Oracle APEX Column Header Menu & Live Filter/Sort Hook
  const {
    headerMenu,
    handleHeaderClick,
    sortKey,
    sortDir,
    headerFilter,
    handleMenuSort,
    handleMenuHideColumn,
    handleMenuFilterValue,
    handleClearHeaderFilter,
    closeHeaderMenu,
    processedData: processedMasterList,
  } = useApexColumnMenu(masterList);

  // Load Dropdown Options
  const loadOptions = useCallback(async () => {
    try {
      const res = await api.getPositionTypeOptions();
      if (res.success) {
        setPositionTypeOptions(res.data || []);
      }
    } catch (err) {
      console.warn('Could not load position type options:', err.message);
    }
  }, []);

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  // Load Master Report Data
  const loadMasterData = useCallback(async () => {
    try {
      setLoadingMaster(true);
      const res = await api.getPositionTypes({
        search: activeMasterSearch,
        page: masterPage,
        limit: masterRows,
      });
      if (res.success) {
        setMasterList(res.data || []);
        setMasterTotal(res.total || 0);
      }
    } catch (err) {
      console.error('Error loading Master Position Types:', err);
      if (onShowToast) onShowToast('error', 'Failed to load position types: ' + err.message);
    } finally {
      setLoadingMaster(false);
    }
  }, [activeMasterSearch, masterPage, masterRows, onShowToast]);

  useEffect(() => {
    loadMasterData();
  }, [loadMasterData]);

  // Search submit
  const handleToolbarSearch = (e) => {
    if (e) e.preventDefault();
    setActiveMasterSearch(masterSearch.trim());
    setMasterPage(1);
  };

  // Export CSV
  const handleDownloadReport = () => {
    if (masterList.length === 0) {
      if (onShowToast) onShowToast('warning', 'No data to export.');
      return;
    }
    const headers = POSITION_TYPE_MASTER_COLUMNS.filter((c) => masterVisibleKeys.includes(c.key));
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [
        headers.map((h) => `"${h.label}"`).join(','),
        ...masterList.map((row) =>
          headers
            .map((h) => {
              const val = h.getValue(row);
              return `"${String(val !== undefined && val !== null ? val : '').replace(/"/g, '""')}"`;
            })
            .join(',')
        ),
      ].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Position_Type_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (onShowToast) onShowToast('success', 'CSV exported successfully.');
  };

  // Child Report State (Contacts matching this Position Type)
  const [childContacts, setChildContacts] = useState([]);
  const [childLoading, setChildLoading] = useState(false);
  const [childSearch, setChildSearch] = useState('');
  const [childActiveSearch, setChildActiveSearch] = useState('');
  const [childRows, setChildRows] = useState(50);
  const [childPage, setChildPage] = useState(1);
  const [childTotal, setChildTotal] = useState(0);

  // Edit single contact modal
  const [editingContact, setEditingContact] = useState(null);
  const [editingContactForm, setEditingContactForm] = useState({
    contact_name: '',
    comp_name: '',
    designation: '',
    pos_type: '',
    comp_email: '',
    contact_phone: '',
    country: '',
  });

  const handleOpenEditContact = (c) => {
    setEditingContact(c);
    setEditingContactForm({
      contact_name: c.contact_name || '',
      comp_name: c.company_name || c.comp_name || '',
      designation: c.designation || '',
      pos_type: c.position_type || c.pos_type || formData.contact_position_type || '',
      comp_email: c.comp_email || '',
      contact_phone: c.contact_phone || '',
      country: c.country || '',
    });
  };

  const handleUpdateContact = async (e) => {
    e.preventDefault();
    if (!editingContact) return;
    try {
      const res = await api.updateContact(editingContact.id, editingContactForm);
      if (res.success) {
        if (onShowToast) onShowToast('success', `Contact #${editingContact.id} updated successfully.`);
        setEditingContact(null);
        await Promise.all([loadMasterData(), loadChildContacts()]);
      }
    } catch (err) {
      if (onShowToast) onShowToast('error', err.message || 'Failed to update contact.');
    }
  };

  // Load Child Contacts for Form View
  const loadChildContacts = useCallback(async () => {
    if (!selectedRecord) return;
    // Child report strictly displays contacts for the master record being edited.
    // Changing the form's replacement dropdown does NOT trigger or filter this report.
    const targetPos =
      selectedRecord.contact_position_type ||
      selectedRecord.master_position_type ||
      selectedRecord.pos_type;
    if (!targetPos) return;

    try {
      setChildLoading(true);
      const res = await api.getPositionTypeContacts(selectedRecord.id || 0, {
        pos_type: targetPos,
        search: childActiveSearch,
        page: childPage,
        limit: childRows,
      });
      if (res.success) {
        setChildContacts(res.data || []);
        setChildTotal(res.total || 0);
      }
    } catch (err) {
      console.error('Error loading linked contacts:', err);
      if (onShowToast) onShowToast('error', 'Failed to load contacts: ' + err.message);
    } finally {
      setChildLoading(false);
    }
  }, [selectedRecord, childActiveSearch, childPage, childRows, onShowToast]);

  useEffect(() => {
    if (viewMode === 'form' && selectedRecord) {
      loadChildContacts();
    }
  }, [viewMode, selectedRecord, loadChildContacts]);

  // Open Edit Form
  const handleOpenEdit = (rec) => {
    setSelectedRecord(rec);
    const posName = rec.master_position_type || rec.pos_type || rec.contact_position_type || '';
    const posCount = rec.master_position_type_count || rec.contact_position_type_count || rec.contact_count || 0;
    setFormData({
      master_position_type: posName,
      master_position_type_count: posCount,
      contact_position_type: rec.contact_position_type || posName,
      contact_position_type_count: rec.contact_position_type_count || posCount,
      validation_status: rec.validation_status || 'DATA IN BOTH',
      created_by: rec.created_by || 'APEX_PUBLIC_USER',
      created_date: rec.created_date || '20-JUL-2026',
      modified_by: rec.modified_by || 'MARIYA_BADAR',
      modified_date: rec.modified_date || '12-NOV-2026',
    });
    setChildPage(1);
    setChildSearch('');
    setChildActiveSearch('');
    setViewMode('form');
    try {
      localStorage.setItem('apex_position_type_active_form', JSON.stringify(rec));
    } catch (e) {}
  };

  // Selection Checkboxes
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allIds = new Set(masterList.map((m) => m.id));
      setSelectedIds(allIds);
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleToggleRow = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Batch Delete
  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.size} selected position type(s)?`)) {
      return;
    }
    try {
      const idArray = Array.from(selectedIds);
      const res = await api.batchDeletePositionTypes(idArray);
      if (res.success) {
        if (onShowToast) onShowToast('success', res.message || `Deleted ${idArray.length} position types successfully.`);
        setSelectedIds(new Set());
        loadMasterData();
      }
    } catch (err) {
      if (onShowToast) onShowToast('error', 'Batch delete failed: ' + err.message);
    }
  };

  // Open Create Form
  const handleOpenCreate = () => {
    const newRec = {
      isCreate: true,
      master_position_type: '',
      master_position_type_count: 0,
      contact_position_type: '',
      contact_position_type_count: 0,
      validation_status: 'DATA IN MASTER',
      created_by: 'APEX_PUBLIC_USER',
      created_date: '20-JUL-2026',
      modified_by: 'MARIYA_BADAR',
      modified_date: '12-NOV-2026',
    };
    setSelectedRecord(newRec);
    setFormData(newRec);
    setChildContacts([]);
    setChildTotal(0);
    setViewMode('form');
    try {
      localStorage.setItem('apex_position_type_active_form', JSON.stringify(newRec));
    } catch (e) {}
  };

  // Cancel Form
  const handleCancelForm = () => {
    setViewMode('report');
    setSelectedRecord(null);
    try {
      localStorage.removeItem('apex_position_type_active_form');
    } catch (e) {}
  };

  // Delete Record in Form View
  const handleDeleteMaster = async () => {
    if (!selectedRecord || selectedRecord.isCreate) return;
    if (!window.confirm(`Are you sure you want to delete Position Type "${formData.master_position_type}"?`)) {
      return;
    }
    try {
      const res = await api.deletePositionType(selectedRecord.id);
      if (res.success) {
        if (onShowToast) onShowToast('success', 'Position Type deleted successfully.');
        handleCancelForm();
        loadMasterData();
      }
    } catch (err) {
      if (onShowToast) onShowToast('error', 'Failed to delete: ' + err.message);
    }
  };

  // Apply Changes / Save Master
  const handleFormSubmit = async (e) => {
    if (e) e.preventDefault();
    const targetName = (formData.master_position_type || '').trim();
    if (!targetName) {
      if (onShowToast) onShowToast('error', 'Master Position Type is required.');
      return;
    }

    const dupPos = masterList.find(
      (m) =>
        (m.pos_type || m.master_position_type) &&
        (m.pos_type || m.master_position_type).trim().toLowerCase() === targetName.toLowerCase() &&
        String(m.id) !== String(selectedRecord?.id)
    );
    if (dupPos) {
      if (onShowToast) onShowToast('error', `Position Type "${targetName}" already exists. Duplicate records are not allowed.`);
      return;
    }

    try {
      if (selectedRecord?.isCreate) {
        const res = await api.createPositionType({
          pos_type: targetName,
          created_by: formData.created_by,
        });
        if (res.success) {
          if (onShowToast) onShowToast('success', 'Position Type created successfully.');
          handleCancelForm();
          loadMasterData();
        }
      } else {
        const res = await api.updatePositionType(selectedRecord.id, {
          pos_type: targetName,
          modified_by: 'MARIYA_BADAR',
        });
        if (res.success) {
          if (onShowToast) onShowToast('success', 'Position Type updated successfully.');
          handleCancelForm();
          loadMasterData();
        }
      }
    } catch (err) {
      if (onShowToast) onShowToast('error', err.message || 'Error saving position type.');
    }
  };

  // "Update Records" Button Action matching Screenshot 2:
  // Re-aligns contacts from old position type to the chosen contact position type
  const handleUpdateRecords = async () => {
    const oldPos = (selectedRecord?.master_position_type || selectedRecord?.pos_type || formData.master_position_type || '').trim();
    const newPos = (formData.contact_position_type || '').trim();
    if (!newPos) {
      if (onShowToast) onShowToast('error', 'Please select a Contact Position Type to update.');
      return;
    }

    if (!window.confirm(`Are you sure you want to update all contacts with position type "${oldPos}" to "${newPos}"?`)) {
      return;
    }

    try {
      const res = await api.updatePositionTypeRecords(selectedRecord?.id || 0, {
        old_pos_type: oldPos,
        new_pos_type: newPos,
      });
      if (res.success) {
        if (onShowToast) onShowToast('success', res.message || 'Records updated successfully.');
        // Update selectedRecord so child report re-queries for newPos
        setSelectedRecord(prev => ({
          ...prev,
          master_position_type: newPos,
          contact_position_type: newPos,
          pos_type: newPos,
        }));
        await loadMasterData();
      }
    } catch (err) {
      if (onShowToast) onShowToast('error', err.message || 'Failed to update records.');
    }
  };

  // Pagination bounds
  const totalPages = masterRows === 'all' ? 1 : Math.ceil(masterTotal / (Number(masterRows) || 50)) || 1;
  const startRow = masterTotal === 0 ? 0 : (masterPage - 1) * (masterRows === 'all' ? masterTotal : Number(masterRows)) + 1;
  const endRow = masterRows === 'all' ? masterTotal : Math.min(masterPage * Number(masterRows), masterTotal);

  const childTotalPages = childRows === 'all' ? 1 : Math.ceil(childTotal / (Number(childRows) || 50)) || 1;
  const childStartRow = childTotal === 0 ? 0 : (childPage - 1) * (childRows === 'all' ? childTotal : Number(childRows)) + 1;
  const childEndRow = childRows === 'all' ? childTotal : Math.min(childPage * Number(childRows), childTotal);

  return (
    <div className="apex-master-page" style={{ padding: '0.75rem 1.25rem 2.5rem' }}>
      {/* Top Banner Pattern Strip */}
      <div className="apex-pattern-strip" style={{ marginBottom: '1rem', height: '4px' }} />

      {/* ==================================================================== */}
      {/* REPORT VIEW (Screenshot 1: media_1794481017695_d8c77055.png)         */}
      {/* ==================================================================== */}
      {viewMode === 'report' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {/* Page Title: Position Type */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>
              Position Type
            </h1>
          </div>

          {/* Master Toolbar & Table Card */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              padding: '1.25rem 1.5rem',
            }}
          >
            {/* Top Toolbar matching Screenshot 1 */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.75rem',
                marginBottom: '1rem',
              }}
            >
              {/* Left Controls: Search bar + Go button + Rows + Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <form onSubmit={handleToolbarSearch} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <div style={{ position: 'relative', width: '220px' }}>
                    <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                      <IconSearch size={15} />
                    </span>
                    <input
                      type="text"
                      className="apex-form-input"
                      placeholder="Search"
                      value={masterSearch}
                      onChange={(e) => setMasterSearch(e.target.value)}
                      style={{
                        width: '100%',
                        height: '34px',
                        paddingLeft: '32px',
                        paddingRight: '10px',
                        borderRadius: '4px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.825rem',
                      }}
                    />
                  </div>
                  <button
                    type="submit"
                    style={{
                      height: '34px',
                      padding: '0 14px',
                      backgroundColor: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '4px',
                      fontSize: '0.825rem',
                      fontWeight: 600,
                      color: '#1e293b',
                      cursor: 'pointer',
                    }}
                  >
                    Go
                  </button>
                </form>

                {/* Rows Selector: 10, 25, 50, 100, All */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginLeft: '0.25rem' }}>
                  <span style={{ fontSize: '0.825rem', color: '#475569', fontWeight: 500 }}>Rows</span>
                  <div style={{ position: 'relative' }}>
                    <select
                      className="apex-form-input"
                      value={masterRows}
                      onChange={(e) => {
                        const val = e.target.value === 'all' ? 'all' : Number(e.target.value);
                        setMasterRows(val);
                        setMasterPage(1);
                      }}
                      style={{
                        height: '34px',
                        padding: '0 24px 0 8px',
                        borderRadius: '4px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.825rem',
                        fontWeight: 600,
                        backgroundColor: '#ffffff',
                        cursor: 'pointer',
                        appearance: 'none',
                      }}
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                      <option value="all">All</option>
                    </select>
                    <span style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748b' }}>
                      <IconChevronDown size={13} />
                    </span>
                  </div>
                </div>

                {/* Actions Dropdown */}
                <div style={{ position: 'relative' }}>
                  <button
                    type="button"
                    onClick={() => setShowMasterActions(!showMasterActions)}
                    style={{
                      height: '34px',
                      padding: '0 12px',
                      backgroundColor: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '4px',
                      fontSize: '0.825rem',
                      fontWeight: 600,
                      color: '#1e293b',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    Actions <IconChevronDown size={13} />
                  </button>

                  <ApexActionsMenu
                    isOpen={showMasterActions}
                    onClose={() => setShowMasterActions(false)}
                    onOpenColumns={() => setShowMasterColumnsModal(true)}
                    onOpenFilter={() => setShowMasterFilterModal(true)}
                    onOpenAggregate={() => setShowAggregateModal(true)}
                    onOpenChart={() => setShowMasterChartModal(true)}
                    onOpenGroupBy={() => setShowMasterChartModal(true)}
                    onDownload={handleDownloadReport}
                    onRefresh={loadMasterData}
                    onResetReport={() => {
                      setMasterSearch('');
                      setActiveMasterSearch('');
                      setAggregations([]);
                      setMasterRows(50);
                      setMasterPage(1);
                      if (onShowToast) onShowToast('info', 'Report reset to default.');
                    }}
                    onChangeRows={(r) => {
                      setMasterRows(r);
                      setMasterPage(1);
                    }}
                    currentRows={masterRows}
                  />
                </div>
              </div>

              {/* Right Toolbar Action Buttons matching Screenshot 2: Upload, Create, Delete Selected */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowUploadModal(true)}
                  style={{
                    height: '34px',
                    padding: '0 16px',
                    backgroundColor: '#102a43',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.825rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#0b1d30')}
                  onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#102a43')}
                >
                  Upload
                </button>

                <button
                  type="button"
                  onClick={handleOpenCreate}
                  style={{
                    height: '34px',
                    padding: '0 16px',
                    backgroundColor: '#102a43',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.825rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#0b1d30')}
                  onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#102a43')}
                >
                  Create
                </button>

                <button
                  type="button"
                  onClick={handleBatchDelete}
                  disabled={selectedIds.size === 0}
                  style={{
                    height: '34px',
                    padding: '0 16px',
                    backgroundColor: selectedIds.size > 0 ? '#dc2626' : '#102a43',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.825rem',
                    fontWeight: 600,
                    cursor: selectedIds.size > 0 ? 'pointer' : 'not-allowed',
                    opacity: selectedIds.size > 0 ? 1 : 0.85,
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                  }}
                  title={selectedIds.size > 0 ? `Delete ${selectedIds.size} selected` : 'Select rows to delete'}
                >
                  Delete Selected {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
                </button>
              </div>
            </div>

            {/* Pagination Row matching Screenshot 1: "1 - 12 of 12" */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.825rem',
                color: '#475569',
                padding: '0.4rem 0.25rem 0.75rem',
                borderBottom: '1px solid #f1f5f9',
              }}
            >
              <span>
                {masterTotal === 0 ? '0 of 0' : `${startRow.toLocaleString()} - ${endRow.toLocaleString()} of ${masterTotal.toLocaleString()}`}
              </span>
              <div style={{ display: 'flex', gap: '2px' }}>
                <button
                  type="button"
                  disabled={masterPage <= 1}
                  onClick={() => setMasterPage((p) => Math.max(1, p - 1))}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: masterPage <= 1 ? 'not-allowed' : 'pointer',
                    color: masterPage <= 1 ? '#cbd5e1' : '#475569',
                    padding: '2px 4px',
                  }}
                >
                  <IconChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  disabled={masterPage >= totalPages}
                  onClick={() => setMasterPage((p) => Math.min(totalPages, p + 1))}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: masterPage >= totalPages ? 'not-allowed' : 'pointer',
                    color: masterPage >= totalPages ? '#cbd5e1' : '#475569',
                    padding: '2px 4px',
                  }}
                >
                  <IconChevronRight size={16} />
                </button>
              </div>
            </div>

            {/* Active APEX Column Filter Banner */}
            <ApexActiveFilterBanner headerFilter={headerFilter} onClear={handleClearHeaderFilter} />

            {/* Active Aggregations Chips Bar */}
            <ActiveAggregationsBar
              aggregations={aggregations}
              data={processedMasterList}
              onEditAggregation={() => setShowAggregateModal(true)}
              onRemoveAggregation={(id) => setAggregations((prev) => prev.filter((a) => a.id !== id))}
              onClearAll={() => setAggregations([])}
            />

            {/* Master Table matching Screenshot 1 */}
            <div style={{ overflowX: 'auto' }}>
              {loadingMaster ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                  Loading position types...
                </div>
              ) : processedMasterList.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                  No position types found.
                </div>
              ) : (
                <table className="apex-master-table">
                  <thead>
                    <tr>
                      {/* Column 1: Edit/Select Columns Icon header (matching standard report) */}
                      <th style={{ width: '40px', textAlign: 'center' }}>
                        <span
                          style={{ cursor: 'pointer', fontSize: '1rem', color: '#1e293b' }}
                          title="Select Columns"
                          onClick={() => setShowMasterColumnsModal(true)}
                        >
                          ✎
                        </span>
                      </th>
                      {/* Column 2: Selected Checkbox Column with Select-All */}
                      <th style={{ width: '80px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <input
                            type="checkbox"
                            checked={processedMasterList.length > 0 && selectedIds.size === processedMasterList.length}
                            onChange={handleSelectAll}
                            style={{ cursor: 'pointer' }}
                          />
                        </div>
                      </th>
                      {/* Dynamic Data Columns with interactive APEX header actions */}
                      {POSITION_TYPE_MASTER_COLUMNS.filter((c) => masterVisibleKeys.includes(c.key)).map((col) => {
                        const isNumber = col.key.includes('count');
                        const isCenter = col.key === 'validation_status' || col.key.includes('date');
                        return (
                          <th
                            key={col.key}
                            className={isNumber ? 'col-number' : isCenter ? 'col-center' : ''}
                            onClick={(e) => handleHeaderClick(e, col)}
                            style={{
                              minWidth: isNumber ? '140px' : isCenter ? '130px' : '180px',
                              cursor: 'pointer',
                              userSelect: 'none',
                              whiteSpace: 'nowrap',
                              transition: 'background-color 0.15s ease',
                            }}
                            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                            title={`Click to sort, filter, or configure ${col.label}`}
                          >
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <span>{col.label}</span>
                              {sortKey === col.key && (
                                <span style={{ fontSize: '0.75rem', color: '#2563eb' }}>
                                  {sortDir === 'asc' ? '↑' : '↓'}
                                </span>
                              )}
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {processedMasterList.map((rec) => (
                      <tr key={rec.id}>
                        {/* Edit Button matching Screenshot 1 */}
                        <td className="col-center">
                          <button
                            type="button"
                            className="apex-edit-icon-btn"
                            onClick={() => handleOpenEdit(rec)}
                            title="Edit Record"
                          >
                            <IconFilePenLine size={15} />
                          </button>
                        </td>

                        {/* Selected Checkbox */}
                        <td className="col-center">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(rec.id)}
                            onChange={() => handleToggleRow(rec.id)}
                            style={{ cursor: 'pointer' }}
                          />
                        </td>

                        {/* Master Position Type */}
                        {masterVisibleKeys.includes('master_position_type') && (
                          <td style={{ fontWeight: 600, color: '#1e293b' }}>
                            {rec.master_position_type || '-'}
                          </td>
                        )}

                        {/* Master Position Type Count */}
                        {masterVisibleKeys.includes('master_position_type_count') && (
                          <td className="col-number" style={{ fontWeight: 600, color: '#0f172a' }}>
                            {rec.master_position_type_count !== undefined
                              ? Number(rec.master_position_type_count).toLocaleString()
                              : '0'}
                          </td>
                        )}

                        {/* Contact Position Type */}
                        {masterVisibleKeys.includes('contact_position_type') && (
                          <td style={{ color: '#334155' }}>
                            {rec.contact_position_type || '-'}
                          </td>
                        )}

                        {/* Contact Position Type Count */}
                        {masterVisibleKeys.includes('contact_position_type_count') && (
                          <td className="col-number" style={{ color: '#475569' }}>
                            {rec.contact_position_type_count !== undefined
                              ? Number(rec.contact_position_type_count).toLocaleString()
                              : '0'}
                          </td>
                        )}

                        {/* Validation Status Badge */}
                        {masterVisibleKeys.includes('validation_status') && (
                          <td className="col-center">
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                letterSpacing: '0.02em',
                                backgroundColor:
                                  rec.validation_status === 'DATA IN BOTH'
                                    ? '#f0fdf4'
                                    : rec.validation_status === 'DATA IN MASTER'
                                    ? '#eff6ff'
                                    : '#fef3c7',
                                color:
                                  rec.validation_status === 'DATA IN BOTH'
                                    ? '#15803d'
                                    : rec.validation_status === 'DATA IN MASTER'
                                    ? '#1d4ed8'
                                    : '#b45309',
                                border: `1px solid ${
                                  rec.validation_status === 'DATA IN BOTH'
                                    ? '#bbf7d0'
                                    : rec.validation_status === 'DATA IN MASTER'
                                    ? '#bfdbfe'
                                    : '#fde68a'
                                }`,
                              }}
                            >
                              {rec.validation_status || 'DATA IN BOTH'}
                            </span>
                          </td>
                        )}

                        {/* Created Date */}
                        {masterVisibleKeys.includes('created_date') && (
                          <td className="col-center" style={{ color: '#64748b', fontSize: '0.8rem' }}>
                            {formatAppDate(rec.created_date) || '-'}
                          </td>
                        )}

                        {/* Modified Date */}
                        {masterVisibleKeys.includes('modified_date') && (
                          <td className="col-center" style={{ color: '#64748b', fontSize: '0.8rem' }}>
                            {formatAppDate(rec.modified_date) || '-'}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* FORM VIEW (Screenshot 2: media_1794481029313_02048192.jpg)           */}
      {/* ==================================================================== */}
      {viewMode === 'form' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Card Container */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
              overflow: 'hidden',
            }}
          >
            {/* Top Navy Accent Strip */}
            <div style={{ height: '4px', backgroundColor: '#0f2035' }} />

            <form onSubmit={handleFormSubmit} style={{ padding: '1.5rem' }}>
              {/* ROW 1: Master Position Type & Master Position Type Count */}
              <div className="apex-form-grid-2">
                {/* Field 1: Master Position Type */}
                <div className="apex-form-field">
                  <label>
                    Master Position Type
                  </label>
                  <input
                    type="text"
                    className="apex-form-input"
                    style={{
                      width: '100%',
                      height: '38px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      padding: '0 0.75rem',
                      fontSize: '0.825rem',
                      backgroundColor: selectedRecord?.isCreate ? '#ffffff' : '#f8fafc',
                      color: '#1e293b',
                    }}
                    value={formData.master_position_type}
                    onChange={(e) => setFormData({ ...formData, master_position_type: e.target.value })}
                    disabled={!selectedRecord?.isCreate}
                  />
                </div>

                {/* Field 2: Master Position Type Count */}
                <div className="apex-form-field">
                  <label>
                    Master Position Type Count
                  </label>
                  <input
                    type="text"
                    readOnly
                    disabled
                    className="apex-form-input"
                    style={{
                      width: '100%',
                      height: '38px',
                      borderRadius: '6px',
                      border: '1px dashed #cbd5e1',
                      padding: '0 0.75rem',
                      fontSize: '0.825rem',
                      backgroundColor: '#ffffff',
                      color: '#1e293b',
                      cursor: 'default',
                    }}
                    value={Number(formData.master_position_type_count || 0).toLocaleString()}
                  />
                </div>
              </div>

              {/* ROW 2: Contact Position Type, Contact Position Type Count, Validation Status */}
              <div className="apex-form-grid-3">
                {/* Field 1: Contact Position Type (Searchable Dropdown with Clear Button) */}
                <div className="apex-form-field">
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                    Contact Position Type
                  </label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <select
                      className="apex-form-input"
                      style={{
                        width: '100%',
                        height: '38px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        padding: '0 2.5rem 0 0.75rem',
                        fontSize: '0.825rem',
                        backgroundColor: '#ffffff',
                        color: '#1e293b',
                        appearance: 'none',
                        cursor: 'pointer',
                      }}
                      value={formData.contact_position_type}
                      onChange={(e) => setFormData({ ...formData, contact_position_type: e.target.value })}
                    >
                      <option value="">-- Select Contact Position Type --</option>
                      {positionTypeOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>

                    {/* Clear 'x' button matching Screenshot 2 */}
                    {formData.contact_position_type && (
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, contact_position_type: '' })}
                        style={{
                          position: 'absolute',
                          right: '26px',
                          background: 'none',
                          border: 'none',
                          color: '#64748b',
                          cursor: 'pointer',
                          padding: '2px',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                        title="Clear"
                      >
                        <IconClose size={13} />
                      </button>
                    )}

                    <span style={{ position: 'absolute', right: '10px', pointerEvents: 'none', color: '#64748b' }}>
                      <IconChevronDown size={14} />
                    </span>
                  </div>
                </div>

                {/* Field 2: Contact Position Type Count */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                    Contact Position Type Count
                  </label>
                  <input
                    type="text"
                    readOnly
                    disabled
                    className="apex-form-input"
                    style={{
                      width: '100%',
                      height: '38px',
                      borderRadius: '6px',
                      border: '1px dashed #cbd5e1',
                      padding: '0 0.75rem',
                      fontSize: '0.825rem',
                      backgroundColor: '#ffffff',
                      color: '#1e293b',
                      cursor: 'default',
                    }}
                    value={Number(formData.contact_position_type_count || 0).toLocaleString()}
                  />
                </div>

                {/* Field 3: Validation Status */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                    Validation Status
                  </label>
                  <input
                    type="text"
                    readOnly
                    disabled
                    className="apex-form-input"
                    style={{
                      width: '100%',
                      height: '38px',
                      borderRadius: '6px',
                      border: '1px dashed #cbd5e1',
                      padding: '0 0.75rem',
                      fontSize: '0.825rem',
                      backgroundColor: '#ffffff',
                      color: '#1e293b',
                      cursor: 'default',
                    }}
                    value={formData.validation_status}
                  />
                </div>
              </div>

              {/* ROW 3: Audit Fields (Created By, Created Date, Modified By, Modified Date) */}
              <div className="apex-form-grid-4">
                {/* Created By */}
                <div className="apex-form-field">
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                    Created By
                  </label>
                  <input
                    type="text"
                    readOnly
                    disabled
                    className="apex-form-input"
                    style={{
                      width: '100%',
                      height: '38px',
                      borderRadius: '6px',
                      border: '1px solid #e2e8f0',
                      padding: '0 0.75rem',
                      fontSize: '0.825rem',
                      backgroundColor: '#ffffff',
                      color: '#1e293b',
                      cursor: 'default',
                    }}
                    value={formData.created_by}
                  />
                </div>

                {/* Created Date */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                    Created Date
                  </label>
                  <input
                    type="text"
                    readOnly
                    disabled
                    className="apex-form-input"
                    style={{
                      width: '100%',
                      height: '38px',
                      borderRadius: '6px',
                      border: '1px solid #e2e8f0',
                      padding: '0 0.75rem',
                      fontSize: '0.825rem',
                      backgroundColor: '#ffffff',
                      color: '#1e293b',
                      cursor: 'default',
                    }}
                    value={formatAppDate(formData.created_date)}
                  />
                </div>

                {/* Modified By */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                    Modified By
                  </label>
                  <input
                    type="text"
                    readOnly
                    disabled
                    className="apex-form-input"
                    style={{
                      width: '100%',
                      height: '38px',
                      borderRadius: '6px',
                      border: '1px solid #e2e8f0',
                      padding: '0 0.75rem',
                      fontSize: '0.825rem',
                      backgroundColor: '#ffffff',
                      color: '#1e293b',
                      cursor: 'default',
                    }}
                    value={formData.modified_by}
                  />
                </div>

                {/* Modified Date */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                    Modified Date
                  </label>
                  <input
                    type="text"
                    readOnly
                    disabled
                    className="apex-form-input"
                    style={{
                      width: '100%',
                      height: '38px',
                      borderRadius: '6px',
                      border: '1px solid #e2e8f0',
                      padding: '0 0.75rem',
                      fontSize: '0.825rem',
                      backgroundColor: '#ffffff',
                      color: '#1e293b',
                      cursor: 'default',
                    }}
                    value={formatAppDate(formData.modified_date)}
                  />
                </div>
              </div>

              {/* Action Buttons matching Screenshot 2 */}
              <div className="apex-form-actions-row">
                {/* Left: Cancel Button */}
                <button
                  type="button"
                  onClick={handleCancelForm}
                  style={{
                    height: '36px',
                    padding: '0 1.25rem',
                    backgroundColor: '#f1f5f9',
                    color: '#334155',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    fontSize: '0.825rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#e2e8f0')}
                  onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                >
                  Cancel
                </button>

                {/* Right: Delete, Apply Changes, Update Records */}
                <div className="apex-form-actions-right">
                  {!selectedRecord?.isCreate && (
                    <button
                      type="button"
                      onClick={handleDeleteMaster}
                      style={{
                        height: '36px',
                        padding: '0 1.25rem',
                        backgroundColor: '#f1f5f9',
                        color: '#475569',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        fontSize: '0.825rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = '#fee2e2';
                        e.currentTarget.style.color = '#dc2626';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = '#f1f5f9';
                        e.currentTarget.style.color = '#475569';
                      }}
                    >
                      Delete
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleFormSubmit}
                    style={{
                      height: '36px',
                      padding: '0 1.35rem',
                      backgroundColor: '#102a43',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '0.825rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#0b1d30')}
                    onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#102a43')}
                  >
                    Apply Changes
                  </button>

                  <button
                    type="button"
                    onClick={handleUpdateRecords}
                    style={{
                      height: '36px',
                      padding: '0 1.35rem',
                      backgroundColor: '#102a43',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '0.825rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#0b1d30')}
                    onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#102a43')}
                  >
                    Update Records
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Child Contacts Report beneath Form matching Screenshot 2 */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
              padding: '0.75rem 1rem',
            }}
          >
            {/* Child Report Toolbar */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.75rem',
                marginBottom: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setChildActiveSearch(childSearch.trim());
                    setChildPage(1);
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <div style={{ position: 'relative', width: '220px' }}>
                    <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                      <IconSearch size={15} />
                    </span>
                    <input
                      type="text"
                      className="apex-form-input"
                      placeholder="Search"
                      value={childSearch}
                      onChange={(e) => setChildSearch(e.target.value)}
                      style={{
                        width: '100%',
                        height: '34px',
                        paddingLeft: '32px',
                        paddingRight: '10px',
                        borderRadius: '4px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.825rem',
                      }}
                    />
                  </div>
                  <button
                    type="submit"
                    style={{
                      height: '34px',
                      padding: '0 14px',
                      backgroundColor: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '4px',
                      fontSize: '0.825rem',
                      fontWeight: 600,
                      color: '#1e293b',
                      cursor: 'pointer',
                    }}
                  >
                    Go
                  </button>
                </form>

                {/* Rows Selector */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginLeft: '0.25rem' }}>
                  <span style={{ fontSize: '0.825rem', color: '#475569', fontWeight: 500 }}>Rows</span>
                  <div style={{ position: 'relative' }}>
                    <select
                      className="apex-form-input"
                      value={childRows}
                      onChange={(e) => {
                        const val = e.target.value === 'all' ? 'all' : Number(e.target.value);
                        setChildRows(val);
                        setChildPage(1);
                      }}
                      style={{
                        height: '34px',
                        padding: '0 24px 0 8px',
                        borderRadius: '4px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.825rem',
                        fontWeight: 600,
                        backgroundColor: '#ffffff',
                        cursor: 'pointer',
                        appearance: 'none',
                      }}
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                    <span style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748b' }}>
                      <IconChevronDown size={13} />
                    </span>
                  </div>
                </div>

                {/* Actions button */}
                <button
                  type="button"
                  style={{
                    height: '34px',
                    padding: '0 12px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '4px',
                    fontSize: '0.825rem',
                    fontWeight: 600,
                    color: '#1e293b',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer',
                  }}
                  onClick={() => {
                    if (onShowToast) onShowToast('info', 'Actions menu for linked contacts.');
                  }}
                >
                  Actions <IconChevronDown size={13} />
                </button>
              </div>

              {/* Pagination info matching Screenshot 2: "1 - 50 of 13,755 >" */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '0.825rem',
                  color: '#475569',
                }}
              >
                <span>
                  {childTotal === 0 ? '0 of 0' : `${childStartRow.toLocaleString()} - ${childEndRow.toLocaleString()} of ${childTotal.toLocaleString()}`}
                </span>
                <div style={{ display: 'flex', gap: '2px' }}>
                  <button
                    type="button"
                    disabled={childPage <= 1}
                    onClick={() => setChildPage((p) => Math.max(1, p - 1))}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: childPage <= 1 ? 'not-allowed' : 'pointer',
                      color: childPage <= 1 ? '#cbd5e1' : '#475569',
                      padding: '2px 4px',
                    }}
                  >
                    <IconChevronLeft size={16} />
                  </button>
                  <button
                    type="button"
                    disabled={childPage >= childTotalPages}
                    onClick={() => setChildPage((p) => Math.min(childTotalPages, p + 1))}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: childPage >= childTotalPages ? 'not-allowed' : 'pointer',
                      color: childPage >= childTotalPages ? '#cbd5e1' : '#475569',
                      padding: '2px 4px',
                    }}
                  >
                    <IconChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>

            {/* Child Contacts Table matching Screenshot 2 */}
            <div style={{ overflowX: 'auto' }}>
              {childLoading ? (
                <div style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b' }}>
                  Loading linked contacts...
                </div>
              ) : childContacts.length === 0 ? (
                <div style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b' }}>
                  No contacts found linked to "{formData.contact_position_type || formData.master_position_type}".
                </div>
              ) : (
                <table className="apex-master-table">
                  <thead>
                    <tr>
                      <th style={{ width: '40px', textAlign: 'center' }}>
                        <span style={{ fontSize: '0.9rem', color: '#64748b' }}>✎</span>
                      </th>
                      <th style={{ width: '90px' }}>Contact ID</th>
                      <th style={{ minWidth: '180px' }}>Contact Name</th>
                      <th style={{ width: '100px' }}>Company ID</th>
                      <th style={{ minWidth: '180px' }}>CompanyName</th>
                      <th style={{ minWidth: '150px' }}>Position Type</th>
                      <th style={{ minWidth: '160px' }}>Designation</th>
                      <th style={{ minWidth: '180px' }}>Email</th>
                      <th style={{ minWidth: '120px' }}>Country</th>
                    </tr>
                  </thead>
                  <tbody>
                    {childContacts.map((c) => (
                      <tr key={c.id}>
                        <td className="col-center">
                          <button
                            type="button"
                            className="apex-edit-icon-btn"
                            onClick={() => {
                              if (onNavigateToContactForm) {
                                onNavigateToContactForm(c.id);
                              } else {
                                try {
                                  localStorage.setItem('apex_open_contact_id', String(c.id));
                                } catch (e) {}
                                window.location.hash = `#/contacts?id=${c.id}`;
                              }
                            }}
                            title={`Edit Contact #${c.id} Form`}
                          >
                            <IconFilePenLine size={14} />
                          </button>
                        </td>
                        <td style={{ color: '#64748b', fontSize: '0.8rem' }}>{c.id}</td>
                        <td style={{ fontWeight: 600, color: '#1e293b' }}>{c.contact_name}</td>
                        <td style={{ color: '#64748b', fontSize: '0.8rem' }}>{c.company_id || '-'}</td>
                        <td style={{ color: '#334155' }}>{c.company_name || '-'}</td>
                        <td style={{ color: '#334155', fontWeight: 500 }}>{c.position_type || '-'}</td>
                        <td style={{ color: '#64748b' }}>{c.designation || '-'}</td>
                        <td style={{ color: '#64748b' }}>{c.comp_email || '-'}</td>
                        <td style={{ color: '#334155' }}>{c.country || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODALS                                                              */}
      {/* ==================================================================== */}

      {/* Select Columns Modal */}
      <SelectColumnsModal
        isOpen={showMasterColumnsModal}
        onClose={() => setShowMasterColumnsModal(false)}
        columns={POSITION_TYPE_MASTER_COLUMNS}
        visibleKeys={masterVisibleKeys}
        onSave={handleSaveColumns}
        onReset={() => handleSaveColumns(DEFAULT_MASTER_KEYS)}
      />

      {/* Filter Modal */}
      <ApexFilterModal
        isOpen={showMasterFilterModal}
        onClose={() => setShowMasterFilterModal(false)}
        columns={POSITION_TYPE_MASTER_COLUMNS}
        onApplyFilter={(f) => {
          setActiveMasterSearch(f.value);
          setMasterPage(1);
          if (onShowToast) onShowToast('success', `Filter applied on ${f.column}`);
        }}
        onResetFilter={() => {
          setActiveMasterSearch('');
          setMasterSearch('');
          setMasterPage(1);
        }}
      />

      {/* Aggregations Modal */}
      <ApexAggregateModal
        isOpen={showAggregateModal}
        onClose={() => setShowAggregateModal(false)}
        columns={POSITION_TYPE_MASTER_COLUMNS}
        onAddAggregation={(agg) => setAggregations((prev) => [...prev, agg])}
      />

      {/* Chart Modal */}
      <ApexChartModal
        isOpen={showMasterChartModal}
        onClose={() => setShowMasterChartModal(false)}
        data={masterList}
        columns={POSITION_TYPE_MASTER_COLUMNS}
      />

      {/* Edit Single Contact Modal */}
      {editingContact && (
        <div className="apex-modal-overlay">
          <div className="apex-modal-card" style={{ maxWidth: '520px', width: '90%' }}>
            <div className="apex-modal-header">
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>
                Edit Contact #{editingContact.id}
              </h3>
              <button
                type="button"
                className="apex-modal-close-btn"
                onClick={() => setEditingContact(null)}
              >
                <IconClose size={16} />
              </button>
            </div>
            <form onSubmit={handleUpdateContact} style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  Contact Name
                </label>
                <input
                  type="text"
                  className="apex-form-input"
                  style={{ width: '100%', height: '36px', borderRadius: '4px', border: '1px solid #cbd5e1', padding: '0 0.5rem' }}
                  value={editingContactForm.contact_name}
                  onChange={(e) => setEditingContactForm({ ...editingContactForm, contact_name: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  Position Type
                </label>
                <select
                  className="apex-form-input"
                  style={{ width: '100%', height: '36px', borderRadius: '4px', border: '1px solid #cbd5e1', padding: '0 0.5rem' }}
                  value={editingContactForm.pos_type}
                  onChange={(e) => setEditingContactForm({ ...editingContactForm, pos_type: e.target.value })}
                >
                  <option value="">-- Select Position Type --</option>
                  {positionTypeOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  Designation
                </label>
                <input
                  type="text"
                  className="apex-form-input"
                  style={{ width: '100%', height: '36px', borderRadius: '4px', border: '1px solid #cbd5e1', padding: '0 0.5rem' }}
                  value={editingContactForm.designation}
                  onChange={(e) => setEditingContactForm({ ...editingContactForm, designation: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  Email
                </label>
                <input
                  type="email"
                  className="apex-form-input"
                  style={{ width: '100%', height: '36px', borderRadius: '4px', border: '1px solid #cbd5e1', padding: '0 0.5rem' }}
                  value={editingContactForm.comp_email}
                  onChange={(e) => setEditingContactForm({ ...editingContactForm, comp_email: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  Country
                </label>
                <input
                  type="text"
                  className="apex-form-input"
                  style={{ width: '100%', height: '36px', borderRadius: '4px', border: '1px solid #cbd5e1', padding: '0 0.5rem' }}
                  value={editingContactForm.country}
                  onChange={(e) => setEditingContactForm({ ...editingContactForm, country: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  style={{
                    height: '34px',
                    padding: '0 1rem',
                    backgroundColor: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    borderRadius: '4px',
                    fontSize: '0.825rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                  onClick={() => setEditingContact(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    height: '34px',
                    padding: '0 1.25rem',
                    backgroundColor: '#102a43',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '0.825rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload CSV Modal */}
      {showUploadModal && (
        <div className="apex-modal-overlay">
          <div className="apex-modal" style={{ maxWidth: '480px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#1e293b' }}>
                Upload Position Type Data
              </h3>
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <IconClose size={18} />
              </button>
            </div>
            <p style={{ fontSize: '0.825rem', color: '#64748b', marginBottom: '1rem' }}>
              Upload a CSV file containing records for Position Types.
            </p>
            <input
              type="file"
              accept=".csv"
              style={{
                width: '100%',
                padding: '1.5rem',
                border: '2px dashed #cbd5e1',
                borderRadius: '8px',
                textAlign: 'center',
                cursor: 'pointer',
                marginBottom: '1rem',
              }}
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  if (onShowToast) onShowToast('info', `File "${file.name}" received. Processing records...`);
                  setShowUploadModal(false);
                  setTimeout(() => {
                    if (onShowToast) onShowToast('success', 'Position Types CSV data uploaded and merged.');
                    loadMasterData();
                  }, 800);
                }
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                style={{
                  padding: '6px 14px',
                  backgroundColor: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px',
                  fontSize: '0.825rem',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Interactive Column Header Actions Menu */}
      <ApexColumnHeaderMenu headerMenu={headerMenu} onClose={closeHeaderMenu} />
    </div>
  );
}

