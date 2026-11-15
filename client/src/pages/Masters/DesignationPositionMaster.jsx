import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../../api/client';
import { formatAppDate } from '../../utils/dateUtils';
import ApexActionsMenu from '../../components/ApexActionsMenu';
import SelectColumnsModal from '../../components/SelectColumnsModal';
import ApexFilterModal from '../../components/ApexFilterModal';
import ApexChartModal from '../../components/ApexChartModal';
import ApexAggregateModal from '../../components/ApexAggregateModal';
import ActiveAggregationsBar from '../../components/ActiveAggregationsBar';
import { computeAggregationValue } from '../../utils/aggregationUtils';
import ApexColumnHeaderMenu from '../../components/ApexColumnHeaderMenu';
import ApexActiveFilterBanner from '../../components/ApexActiveFilterBanner';
import { useApexColumnMenu } from '../../utils/useApexColumnMenu';
import {
  IconSearch,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconFilePenLine,
  IconClose,
  IconCalendar,
  IconUpload,
  IconTrash,
  IconDownload,
} from '../../components/Icons';

// Master Designation & Position report columns matching Screenshot 2
export const DESIGNATION_POSITION_MASTER_COLUMNS = [
  {
    key: 'master_designation',
    label: 'Master Designation',
    getValue: (r) => r.master_designation || '',
  },
  {
    key: 'master_position_type',
    label: 'Master Position Type',
    getValue: (r) => r.master_position_type || '',
  },
  {
    key: 'master_designation_position_count',
    label: 'Master Designation Position Count',
    getValue: (r) =>
      r.validation_status === 'DATA IN CONTACT' || !r.master_designation
        ? '-'
        : Number(r.master_designation_position_count || 0).toLocaleString(),
  },
  {
    key: 'contact_designation',
    label: 'Contact Designation',
    getValue: (r) => r.contact_designation || '',
  },
  {
    key: 'contact_position_type',
    label: 'Contact Position Type',
    getValue: (r) => r.contact_position_type || '',
  },
  {
    key: 'contact_designation_position_count',
    label: 'Contact Designation Position Count',
    getValue: (r) =>
      r.validation_status === 'DATA IN MASTER' || !r.contact_designation
        ? '-'
        : Number(r.contact_designation_position_count || 0).toLocaleString(),
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

const DEFAULT_MASTER_KEYS = DESIGNATION_POSITION_MASTER_COLUMNS.map((c) => c.key);
export const DESIGNATION_POSITION_COLUMNS = DESIGNATION_POSITION_MASTER_COLUMNS;

export default function DesignationPositionMaster({ onShowToast, onNavigateToContactForm, onNavigateToCompanyForm }) {
  // Mode: 'report' or 'form' with localStorage persistence across browser refresh
  const [viewMode, setViewMode] = useState(() => {
    try {
      const saved = localStorage.getItem('apex_designation_position_active_form');
      if (saved) return 'form';
    } catch (e) { }
    return 'report';
  });

  const [selectedRecord, setSelectedRecord] = useState(() => {
    try {
      const saved = localStorage.getItem('apex_designation_position_active_form');
      if (saved) return JSON.parse(saved);
    } catch (e) { }
    return null;
  });

  // Form state matching Screenshot 1
  const [formData, setFormData] = useState(() => {
    try {
      const saved = localStorage.getItem('apex_designation_position_active_form');
      if (saved) {
        const rec = JSON.parse(saved);
        return {
          master_designation: rec.master_designation || '',
          master_position_type: rec.master_position_type || '',
          master_designation_position_count: rec.master_designation_position_count || 0,
          contact_designation: rec.contact_designation || rec.master_designation || '',
          contact_position_type: rec.contact_position_type || rec.master_position_type || '',
          contact_designation_position_count: rec.contact_designation_position_count || 0,
          validation_status: rec.validation_status || 'DATA IN BOTH',
          created_by: rec.created_by || 'ADMIN',
          created_date: formatAppDate(rec.created_date) || '09-SEP-2026',
          modified_by: rec.modified_by || 'AMAAN',
          modified_date: formatAppDate(rec.modified_date) || '27-OCT-2026',
        };
      }
    } catch (e) { }
    return {
      master_designation: '',
      master_position_type: '',
      master_designation_position_count: 0,
      contact_designation: '',
      contact_position_type: '',
      contact_designation_position_count: 0,
      validation_status: 'DATA IN BOTH',
      created_by: 'ADMIN',
      created_date: '09-SEP-2026',
      modified_by: 'AMAAN',
      modified_date: '27-OCT-2026',
    };
  });

  // Top Filter Card State (matching Screenshot 2)
  const [filterDesignation, setFilterDesignation] = useState('');
  const [filterPositionType, setFilterPositionType] = useState('');
  const [filterCountGroup, setFilterCountGroup] = useState('');
  const [filterCreatedDate, setFilterCreatedDate] = useState('');
  const [filterModifiedDate, setFilterModifiedDate] = useState('');

  // Applied Filters
  const [activeFilters, setActiveFilters] = useState({
    designation: '',
    position_type: '',
    count_group: '',
    createdDate: '',
    modifiedDate: '',
  });

  // Filter dropdown suggestions
  const [filterOptions, setFilterOptions] = useState({
    designations: [],
    positionTypes: [],
    countGroups: ['All', 'High (>1000)', 'Medium (100 - 1000)', 'Low (1 - 99)', 'Zero (0)'],
  });

  // Load filter options on boot
  useEffect(() => {
    api.getDesignationPositionFilters()
      .then((res) => {
        if (res.success && res.data) {
          setFilterOptions({
            designations: res.data.designations || [],
            positionTypes: res.data.positionTypes || [],
            countGroups: res.data.countGroups || ['All', 'High (>1000)', 'Medium (100 - 1000)', 'Low (1 - 99)', 'Zero (0)'],
          });
        }
      })
      .catch((err) => console.warn('Filter options load notice:', err.message));
  }, []);

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

  // Master Actions & Columns Modals
  const [showMasterActions, setShowMasterActions] = useState(false);
  const [showMasterColumnsModal, setShowMasterColumnsModal] = useState(false);
  const [showMasterFilterModal, setShowMasterFilterModal] = useState(false);
  const [showMasterChartModal, setShowMasterChartModal] = useState(false);
  const [showAggregateModal, setShowAggregateModal] = useState(false);
  const [aggregations, setAggregations] = useState([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);

  // Column visibility
  const [masterVisibleKeys, setMasterVisibleKeys] = useState(() => {
    try {
      const s = localStorage.getItem('designation_position_visible_columns');
      if (s) {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) { }
    return DEFAULT_MASTER_KEYS;
  });

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

  const handleSaveColumns = (newKeys) => {
    setMasterVisibleKeys(newKeys);
    try {
      localStorage.setItem('designation_position_visible_columns', JSON.stringify(newKeys));
    } catch (e) { }
  };

  // Load Master Report Data
  const loadMasterData = useCallback(async () => {
    try {
      setLoadingMaster(true);
      const res = await api.getDesignationPositions({
        search: activeMasterSearch,
        designation: activeFilters.designation,
        position_type: activeFilters.position_type,
        count_group: activeFilters.count_group,
        createdDate: activeFilters.createdDate,
        modifiedDate: activeFilters.modifiedDate,
        page: masterPage,
        limit: masterRows,
      });
      if (res.success) {
        setMasterList(res.data || []);
        setMasterTotal(res.total || 0);
      }
    } catch (err) {
      console.error('Error loading Master Designation & Position:', err);
      if (onShowToast) onShowToast('error', 'Failed to load master designation & position: ' + err.message);
    } finally {
      setLoadingMaster(false);
    }
  }, [activeMasterSearch, activeFilters, masterPage, masterRows, onShowToast]);

  useEffect(() => {
    loadMasterData();
  }, [loadMasterData]);

  // Apply Top Filter Card
  const handleApplyTopFilter = () => {
    setActiveFilters({
      designation: filterDesignation,
      position_type: filterPositionType,
      count_group: filterCountGroup,
      createdDate: filterCreatedDate,
      modifiedDate: filterModifiedDate,
    });
    setMasterPage(1);
  };

  // Clear Top Filter Card
  const handleClearTopFilter = () => {
    setFilterDesignation('');
    setFilterPositionType('');
    setFilterCountGroup('');
    setFilterCreatedDate('');
    setFilterModifiedDate('');
    setActiveFilters({
      designation: '',
      position_type: '',
      count_group: '',
      createdDate: '',
      modifiedDate: '',
    });
    setMasterPage(1);
  };

  // Toolbar Search
  const handleToolbarSearch = (e) => {
    if (e) e.preventDefault();
    setActiveMasterSearch(masterSearch.trim());
    setMasterPage(1);
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
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.size} selected designation record(s)?`)) {
      return;
    }
    try {
      const idArray = Array.from(selectedIds);
      const res = await api.batchDeleteDesignationPositions(idArray);
      if (res.success) {
        if (onShowToast) onShowToast('success', res.message || `Deleted ${idArray.length} records successfully.`);
        setSelectedIds(new Set());
        loadMasterData();
      }
    } catch (err) {
      if (onShowToast) onShowToast('error', 'Batch delete failed: ' + err.message);
    }
  };

  // Export CSV
  const handleDownloadReport = () => {
    if (masterList.length === 0) {
      if (onShowToast) onShowToast('warning', 'No data to export.');
      return;
    }
    const headers = DESIGNATION_POSITION_MASTER_COLUMNS.filter((c) => masterVisibleKeys.includes(c.key));
    const headerRow = headers.map((h) => `"${h.label}"`).join(',');
    const rows = masterList.map((rec) =>
      headers
        .map((h) => {
          const val = h.getValue ? h.getValue(rec) : rec[h.key] || '';
          return `"${String(val).replace(/"/g, '""')}"`;
        })
        .join(',')
    );
    const csvContent = [headerRow, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Designation_Position_Master_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (onShowToast) onShowToast('success', 'Designation & Position report downloaded.');
  };

  // Aggregation handling
  const handleApplyAggregation = (agg) => {
    setAggregations((prev) => {
      const filtered = prev.filter((a) => a.id !== agg.id);
      return [...filtered, agg];
    });
    if (onShowToast) onShowToast('success', `Aggregation applied: ${agg.func} (${agg.columnLabel})`);
  };

  // Child Report State (contacts matching selectedRecord.master_designation)
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
      comp_name: c.comp_name || '',
      designation: c.designation || '',
      pos_type: c.pos_type || '',
      comp_email: c.comp_email || '',
      contact_phone: c.contact_phone || '',
      country: c.country || '',
    });
  };

  const handleUpdateContactRecord = async (e) => {
    e.preventDefault();
    if (!editingContact) return;
    try {
      const res = await api.updateContact(editingContact.id, editingContactForm);
      if (res.success) {
        if (onShowToast) {
          onShowToast('success', `Contact #${editingContact.id} updated successfully.`);
        }
        setEditingContact(null);
        await Promise.all([loadMasterData(), loadChildContacts()]);
      }
    } catch (err) {
      if (onShowToast) onShowToast('error', err.message || 'Failed to update contact record.');
    }
  };

  // Load Child Contacts for Form View
  const loadChildContacts = useCallback(async () => {
    if (!selectedRecord) return;
    const targetDesig = selectedRecord.master_designation || selectedRecord.contact_designation;
    if (!targetDesig) return;

    try {
      setChildLoading(true);
      const res = await api.getDesignationPositionContacts(selectedRecord.id || 0, {
        designation: targetDesig,
        position_type: selectedRecord.master_position_type || selectedRecord.contact_position_type || '',
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
      if (onShowToast) onShowToast('error', 'Failed to load linked contacts: ' + err.message);
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
    setFormData({
      master_designation: rec.master_designation || '',
      master_position_type: rec.master_position_type || '',
      master_designation_position_count: rec.master_designation_position_count || 0,
      contact_designation: rec.contact_designation || rec.master_designation || '',
      contact_position_type: rec.contact_position_type || rec.master_position_type || '',
      contact_designation_position_count: rec.contact_designation_position_count || rec.master_designation_position_count || 0,
      validation_status: rec.validation_status || 'DATA IN BOTH',
      created_by: rec.created_by || 'ADMIN',
      created_date: formatAppDate(rec.created_date) || '09-SEP-2026',
      modified_by: rec.modified_by || 'AMAAN',
      modified_date: formatAppDate(rec.modified_date) || '27-OCT-2026',
    });
    setChildPage(1);
    setChildSearch('');
    setChildActiveSearch('');
    setViewMode('form');
    try {
      localStorage.setItem('apex_designation_position_active_form', JSON.stringify(rec));
    } catch (e) { }
  };

  // Open Create Form
  const handleOpenCreate = () => {
    const newRec = {
      isCreate: true,
      master_designation: '',
      master_position_type: '',
      master_designation_position_count: 0,
      contact_designation: '',
      contact_position_type: '',
      contact_designation_position_count: 0,
      validation_status: 'DATA IN MASTER',
      created_by: 'ADMIN',
      created_date: '09-SEP-2026',
      modified_by: 'AMAAN',
      modified_date: '27-OCT-2026',
    };
    setSelectedRecord(newRec);
    setFormData(newRec);
    setChildContacts([]);
    setChildTotal(0);
    setViewMode('form');
    try {
      localStorage.setItem('apex_designation_position_active_form', JSON.stringify(newRec));
    } catch (e) { }
  };

  // Cancel Form
  const handleCancelForm = () => {
    setViewMode('report');
    setSelectedRecord(null);
    try {
      localStorage.removeItem('apex_designation_position_active_form');
    } catch (e) { }
  };

  // Delete Record in Form View
  const handleDeleteMaster = async () => {
    if (!selectedRecord || selectedRecord.isCreate) return;
    if (!window.confirm(`Are you sure you want to delete designation "${formData.master_designation}"?`)) {
      return;
    }
    try {
      const res = await api.deleteDesignationPosition(selectedRecord.id);
      if (res.success) {
        if (onShowToast) onShowToast('success', 'Designation deleted successfully.');
        handleCancelForm();
        loadMasterData();
      }
    } catch (err) {
      if (onShowToast) onShowToast('error', 'Failed to delete designation: ' + err.message);
    }
  };

  // Apply Changes (Master record update)
  const handleFormSubmit = async (e) => {
    if (e) e.preventDefault();
    const cleanDesig = (formData.master_designation || '').trim();
    const cleanPos = (formData.master_position_type || '').trim();
    if (!cleanDesig) {
      if (onShowToast) onShowToast('error', 'Master Designation is required.');
      return;
    }

    const dupDesig = masterList.find(
      (m) =>
        (m.designation || m.master_designation) &&
        (m.designation || m.master_designation).trim().toLowerCase() === cleanDesig.toLowerCase() &&
        (m.position_type || m.master_position_type || '').trim().toLowerCase() === cleanPos.toLowerCase() &&
        String(m.id) !== String(selectedRecord?.id)
    );
    if (dupDesig) {
      if (onShowToast) onShowToast('error', `Designation "${cleanDesig}" with position "${cleanPos}" already exists. Duplicate records are not allowed.`);
      return;
    }

    try {
      if (selectedRecord && selectedRecord.isCreate) {
        const res = await api.createDesignationPosition({
          master_designation: formData.master_designation.trim(),
          master_position_type: formData.master_position_type ? formData.master_position_type.trim() : '',
        });
        if (res.success) {
          if (onShowToast) onShowToast('success', 'New Designation & Position created successfully.');
          handleCancelForm();
          loadMasterData();
        }
      } else {
        const res = await api.updateDesignationPosition(selectedRecord.id, {
          master_designation: formData.master_designation.trim(),
          master_position_type: formData.master_position_type ? formData.master_position_type.trim() : '',
          contact_designation: formData.contact_designation || null,
          contact_position_type: formData.contact_position_type || null,
          old_designation: selectedRecord.master_designation,
          updateContacts: false,
        });
        if (res.success) {
          if (onShowToast) onShowToast('success', 'Designation & Position updated successfully.');
          handleCancelForm();
          loadMasterData();
        }
      }
    } catch (err) {
      if (onShowToast) onShowToast('error', err.message || 'Failed to save changes.');
    }
  };

  // "Update Records" Button: Updates all matching contacts in real-time
  const handleUpdateRecordsBatch = async () => {
    if (!selectedRecord) return;
    if (!formData.contact_position_type) {
      if (onShowToast) onShowToast('error', 'Please select a Contact Position Type to update records.');
      return;
    }

    try {
      const res = await api.updateDesignationPosition(selectedRecord.id, {
        master_designation: formData.master_designation ? formData.master_designation.trim() : null,
        master_position_type: formData.master_position_type ? formData.master_position_type.trim() : null,
        contact_designation: (formData.contact_designation || formData.master_designation || '').trim(),
        contact_position_type: formData.contact_position_type.trim(),
        old_designation: selectedRecord.master_designation || selectedRecord.contact_designation,
        updateContacts: true,
      });

      if (res.success) {
        if (onShowToast) {
          onShowToast(
            'success',
            `Synchronized contact records to Position Type "${formData.contact_position_type}". Dynamic counts updated.`
          );
        }
        await Promise.all([loadMasterData(), loadChildContacts()]);
      }
    } catch (err) {
      if (onShowToast) onShowToast('error', err.message || 'Failed to update records.');
    }
  };

  // Pagination calculation
  const startRow = masterTotal === 0 ? 0 : (masterPage - 1) * (masterRows === 'all' ? masterTotal : masterRows) + 1;
  const endRow = masterRows === 'all' ? masterTotal : Math.min(masterPage * masterRows, masterTotal);
  const totalPages = masterRows === 'all' ? 1 : Math.ceil(masterTotal / masterRows) || 1;

  const childStartRow = childTotal === 0 ? 0 : (childPage - 1) * childRows + 1;
  const childEndRow = Math.min(childPage * childRows, childTotal);
  const childTotalPages = Math.ceil(childTotal / childRows) || 1;

  return (
    <div className="apex-master-page" style={{ padding: '0 0.5rem' }}>
      {/* ==================================================================== */}
      {/* VIEW MODE 1: REPORT VIEW (Screenshot 2: media_1794470503708_3abe8b1d) */}
      {/* ==================================================================== */}
      {viewMode === 'report' && (
        <div>
          {/* Page Title */}
          <div style={{ marginBottom: '1rem' }}>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>
              Designation & Position
            </h1>
          </div>

          {/* TOP FILTER CARD strictly matching Screenshot 2 */}
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '1.25rem 1.5rem',
              marginBottom: '1.25rem',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr) auto', gap: '0.85rem', alignItems: 'flex-end' }}>
              {/* Filter 1: Designation */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                  Designation
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    list="filter-designations-list"
                    type="text"
                    className="apex-form-input"
                    placeholder=""
                    style={{
                      width: '100%',
                      height: '36px',
                      borderRadius: '4px',
                      border: '1px solid #cbd5e1',
                      padding: '0 1.75rem 0 0.75rem',
                      fontSize: '0.825rem',
                      backgroundColor: '#fff',
                    }}
                    value={filterDesignation}
                    onChange={(e) => setFilterDesignation(e.target.value)}
                  />
                  <datalist id="filter-designations-list">
                    {filterOptions.designations.map((d) => (
                      <option key={d} value={d} />
                    ))}
                  </datalist>
                  <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748b' }}>
                    <IconChevronDown size={14} />
                  </span>
                </div>
              </div>

              {/* Filter 2: Position Type */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                  Position Type
                </label>
                <div style={{ position: 'relative' }}>
                  <select
                    className="apex-form-input"
                    style={{
                      width: '100%',
                      height: '36px',
                      borderRadius: '4px',
                      border: '1px solid #cbd5e1',
                      padding: '0 1.75rem 0 0.75rem',
                      fontSize: '0.825rem',
                      backgroundColor: '#fff',
                      appearance: 'none',
                      cursor: 'pointer',
                    }}
                    value={filterPositionType}
                    onChange={(e) => setFilterPositionType(e.target.value)}
                  >
                    <option value="">All Position Types</option>
                    {filterOptions.positionTypes.map((pt) => (
                      <option key={pt} value={pt}>{pt}</option>
                    ))}
                  </select>
                  <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748b' }}>
                    <IconChevronDown size={14} />
                  </span>
                </div>
              </div>

              {/* Filter 3: Count Group */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                  Count Group
                </label>
                <div style={{ position: 'relative' }}>
                  <select
                    className="apex-form-input"
                    style={{
                      width: '100%',
                      height: '36px',
                      borderRadius: '4px',
                      border: '1px solid #cbd5e1',
                      padding: '0 1.75rem 0 0.75rem',
                      fontSize: '0.825rem',
                      backgroundColor: '#fff',
                      appearance: 'none',
                      cursor: 'pointer',
                    }}
                    value={filterCountGroup}
                    onChange={(e) => setFilterCountGroup(e.target.value)}
                  >
                    <option value="">All</option>
                    {filterOptions.countGroups.filter((g) => g !== 'All').map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                  <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748b' }}>
                    <IconChevronDown size={14} />
                  </span>
                </div>
              </div>

              {/* Filter 4: Created Date */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                  Created Date
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="date"
                    className="apex-form-input"
                    style={{
                      width: '100%',
                      height: '36px',
                      borderRadius: '4px',
                      border: '1px solid #cbd5e1',
                      padding: '0 0.75rem',
                      fontSize: '0.825rem',
                      backgroundColor: '#fff',
                    }}
                    value={filterCreatedDate}
                    onChange={(e) => setFilterCreatedDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Filter 5: Modified Date */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                  Modified Date
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="date"
                    className="apex-form-input"
                    style={{
                      width: '100%',
                      height: '36px',
                      borderRadius: '4px',
                      border: '1px solid #cbd5e1',
                      padding: '0 0.75rem',
                      fontSize: '0.825rem',
                      backgroundColor: '#fff',
                    }}
                    value={filterModifiedDate}
                    onChange={(e) => setFilterModifiedDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Filter Action Buttons matching Screenshot 2 */}
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={handleApplyTopFilter}
                  style={{
                    height: '36px',
                    padding: '0 1.25rem',
                    backgroundColor: '#102a43',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.825rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    cursor: 'pointer',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#0b1d30')}
                  onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#102a43')}
                >
                  <IconSearch size={14} /> Search
                </button>

                <button
                  type="button"
                  onClick={handleClearTopFilter}
                  style={{
                    height: '36px',
                    padding: '0 1.25rem',
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
                  Clear Filters
                </button>
              </div>
            </div>
          </div>

          {/* MAIN REPORT TABLE CARD */}
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '1.25rem 1.5rem',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
            }}
          >
            {/* Toolbar strictly matching Screenshot 2 */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem',
                marginBottom: '1rem',
              }}
            >
              {/* Left Controls: Search bar + Search button + Rows + Actions */}
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
                      padding: '0 12px',
                      backgroundColor: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '4px',
                      fontSize: '0.825rem',
                      fontWeight: 600,
                      color: '#1e293b',
                      cursor: 'pointer',
                    }}
                  >
                    Search
                  </button>
                </form>

                {/* Rows Selector: 10, 25, 50, 100, 500, 1000, All */}
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
                      <option value={500}>500</option>
                      <option value={1000}>1000</option>
                      <option value="all">All</option>
                    </select>
                    <span style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748b' }}>
                      <IconChevronDown size={13} />
                    </span>
                  </div>
                </div>

                {/* Actions Dropdown Menu strictly matching Screenshots */}
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
                      setFilterDesignation('');
                      setFilterPositionType('');
                      setFilterCountGroup('');
                      setFilterCreatedDate('');
                      setFilterModifiedDate('');
                      setActiveFilters({ designation: '', position_type: '', count_group: '', createdDate: '', modifiedDate: '' });
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

            {/* Pagination Row matching Screenshot 2: "1 - 50 of 24,958 >" */}
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

            {/* Active Aggregations Chips Bar */}
            <ActiveAggregationsBar
              aggregations={aggregations}
              data={masterList}
              onEditAggregation={() => setShowAggregateModal(true)}
              onRemoveAggregation={(id) => setAggregations((prev) => prev.filter((a) => a.id !== id))}
              onClearAll={() => setAggregations([])}
            />

            {/* Active Column Filter Banner */}
            <ApexActiveFilterBanner
              filter={headerFilter}
              columns={DESIGNATION_POSITION_MASTER_COLUMNS}
              onClear={handleClearHeaderFilter}
            />

            {/* Master Table */}
            <div style={{ overflowX: 'auto' }}>
              {loadingMaster ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                  Loading designation & position mappings...
                </div>
              ) : processedMasterList.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                  No designation records found matching criteria.
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
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                          <input
                            type="checkbox"
                            checked={processedMasterList.length > 0 && selectedIds.size === processedMasterList.length}
                            onChange={handleSelectAll}
                            style={{ cursor: 'pointer' }}
                          />
                        </div>
                      </th>

                      {/* Dynamic Data Columns with interactive APEX header actions */}
                      {DESIGNATION_POSITION_MASTER_COLUMNS.filter((c) => masterVisibleKeys.includes(c.key)).map((col) => {
                        const isNumber = col.key.includes('count') || col.key.includes('amount');
                        const isCenter = col.key === 'validation_status' || col.key.includes('date');
                        return (
                          <th
                            key={col.key}
                            className={isNumber ? 'col-number' : isCenter ? 'col-center' : ''}
                            onClick={(e) => handleHeaderClick(e, col)}
                            style={{
                              minWidth: isNumber ? '180px' : isCenter ? (col.key === 'validation_status' ? '140px' : '120px') : '160px',
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
                        {/* Edit Button matching Screenshot 2 */}
                        <td className="col-center">
                          <button
                            type="button"
                            className="apex-edit-icon-btn"
                            onClick={() => handleOpenEdit(rec)}
                            title="Edit Master Form"
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

                        {/* Master Designation */}
                        {masterVisibleKeys.includes('master_designation') && (
                          <td>
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(rec)}
                              style={{
                                background: 'none',
                                border: 'none',
                                padding: 0,
                                textAlign: 'left',
                                cursor: 'pointer',
                                color: '#1e293b',
                                fontWeight: 500,
                                fontSize: '0.825rem',
                              }}
                              onMouseOver={(e) => (e.currentTarget.style.color = '#2563eb')}
                              onMouseOut={(e) => (e.currentTarget.style.color = '#1e293b')}
                            >
                              {rec.master_designation || '-'}
                            </button>
                          </td>
                        )}

                        {/* Master Position Type */}
                        {masterVisibleKeys.includes('master_position_type') && (
                          <td style={{ color: '#334155' }}>
                            {rec.master_position_type || '-'}
                          </td>
                        )}

                        {/* Master Designation Position Count */}
                        {masterVisibleKeys.includes('master_designation_position_count') && (
                          <td className="col-number" style={{ fontWeight: 600, color: '#334155' }}>
                            {rec.validation_status === 'DATA IN CONTACT' || !rec.master_designation
                              ? '-'
                              : Number(rec.master_designation_position_count || 0).toLocaleString()}
                          </td>
                        )}

                        {/* Contact Designation */}
                        {masterVisibleKeys.includes('contact_designation') && (
                          <td style={{ color: '#334155' }}>
                            {rec.contact_designation || '-'}
                          </td>
                        )}

                        {/* Contact Position Type */}
                        {masterVisibleKeys.includes('contact_position_type') && (
                          <td style={{ color: '#334155' }}>
                            {rec.contact_position_type || '-'}
                          </td>
                        )}

                        {/* Contact Designation Position Count */}
                        {masterVisibleKeys.includes('contact_designation_position_count') && (
                          <td className="col-number" style={{ fontWeight: 600, color: '#334155' }}>
                            {rec.validation_status === 'DATA IN MASTER' || !rec.contact_designation
                              ? '-'
                              : Number(rec.contact_designation_position_count || 0).toLocaleString()}
                          </td>
                        )}

                        {/* Validation Status Badge */}
                        {masterVisibleKeys.includes('validation_status') && (
                          <td className="col-center">
                            <span
                              className={
                                rec.validation_status === 'DATA IN BOTH'
                                  ? 'apex-validation-badge-both'
                                  : rec.validation_status === 'DATA IN CONTACT'
                                    ? 'apex-validation-badge-company'
                                    : 'apex-validation-badge-missing'
                              }
                            >
                              {rec.validation_status || 'DATA IN BOTH'}
                            </span>
                          </td>
                        )}

                        {/* Created Date */}
                        {masterVisibleKeys.includes('created_date') && (
                          <td className="col-center" style={{ color: '#64748b' }}>
                            {formatAppDate(rec.created_date)}
                          </td>
                        )}

                        {/* Modified Date */}
                        {masterVisibleKeys.includes('modified_date') && (
                          <td className="col-center" style={{ color: '#64748b' }}>
                            {formatAppDate(rec.modified_date)}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>

                  {/* Summary Aggregations Footer */}
                  {aggregations.length > 0 && (
                    <tfoot style={{ backgroundColor: '#f8fafc', borderTop: '2px solid #cbd5e1', fontWeight: 700 }}>
                      <tr>
                        <td colSpan={2} style={{ padding: '8px 12px', fontSize: '0.8rem', color: '#475569', textAlign: 'right' }}>
                          Summary:
                        </td>
                        {masterVisibleKeys.includes('master_designation') && (
                          <td style={{ padding: '8px 12px' }}>
                            {aggregations.filter((a) => a.columnKey === 'master_designation').map((a) => (
                              <div key={a.id} style={{ fontSize: '0.775rem' }}>
                                <span style={{ color: '#64748b' }}>{a.func}: </span>
                                <span style={{ color: '#2563eb' }}>{computeAggregationValue(masterList, a.func, a.columnKey)}</span>
                              </div>
                            ))}
                          </td>
                        )}
                        {masterVisibleKeys.includes('master_position_type') && (
                          <td style={{ padding: '8px 12px' }}>
                            {aggregations.filter((a) => a.columnKey === 'master_position_type').map((a) => (
                              <div key={a.id} style={{ fontSize: '0.775rem' }}>
                                <span style={{ color: '#64748b' }}>{a.func}: </span>
                                <span style={{ color: '#2563eb' }}>{computeAggregationValue(masterList, a.func, a.columnKey)}</span>
                              </div>
                            ))}
                          </td>
                        )}
                        {masterVisibleKeys.includes('master_designation_position_count') && (
                          <td className="col-number" style={{ padding: '8px 12px' }}>
                            {aggregations.filter((a) => a.columnKey === 'master_designation_position_count').map((a) => (
                              <div key={a.id} style={{ fontSize: '0.775rem' }}>
                                <span style={{ color: '#64748b' }}>{a.func}: </span>
                                <span style={{ color: '#2563eb' }}>{computeAggregationValue(masterList, a.func, a.columnKey)}</span>
                              </div>
                            ))}
                          </td>
                        )}
                        {masterVisibleKeys.includes('contact_designation') && (
                          <td style={{ padding: '8px 12px' }}>
                            {aggregations.filter((a) => a.columnKey === 'contact_designation').map((a) => (
                              <div key={a.id} style={{ fontSize: '0.775rem' }}>
                                <span style={{ color: '#64748b' }}>{a.func}: </span>
                                <span style={{ color: '#2563eb' }}>{computeAggregationValue(masterList, a.func, a.columnKey)}</span>
                              </div>
                            ))}
                          </td>
                        )}
                        {masterVisibleKeys.includes('contact_position_type') && (
                          <td style={{ padding: '8px 12px' }}>
                            {aggregations.filter((a) => a.columnKey === 'contact_position_type').map((a) => (
                              <div key={a.id} style={{ fontSize: '0.775rem' }}>
                                <span style={{ color: '#64748b' }}>{a.func}: </span>
                                <span style={{ color: '#2563eb' }}>{computeAggregationValue(masterList, a.func, a.columnKey)}</span>
                              </div>
                            ))}
                          </td>
                        )}
                        {masterVisibleKeys.includes('contact_designation_position_count') && (
                          <td className="col-number" style={{ padding: '8px 12px' }}>
                            {aggregations.filter((a) => a.columnKey === 'contact_designation_position_count').map((a) => (
                              <div key={a.id} style={{ fontSize: '0.775rem' }}>
                                <span style={{ color: '#64748b' }}>{a.func}: </span>
                                <span style={{ color: '#2563eb' }}>{computeAggregationValue(masterList, a.func, a.columnKey)}</span>
                              </div>
                            ))}
                          </td>
                        )}
                        {masterVisibleKeys.includes('validation_status') && (
                          <td style={{ padding: '8px 12px' }}>
                            {aggregations.filter((a) => a.columnKey === 'validation_status').map((a) => (
                              <div key={a.id} style={{ fontSize: '0.775rem' }}>
                                <span style={{ color: '#64748b' }}>{a.func}: </span>
                                <span style={{ color: '#2563eb' }}>{computeAggregationValue(masterList, a.func, a.columnKey)}</span>
                              </div>
                            ))}
                          </td>
                        )}
                        {masterVisibleKeys.includes('created_date') && <td></td>}
                        {masterVisibleKeys.includes('modified_date') && <td></td>}
                      </tr>
                    </tfoot>
                  )}
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* VIEW MODE 2: FORM VIEW (Screenshot 1: media_1794470495881_09e8557f)   */}
      {/* ==================================================================== */}
      {viewMode === 'form' && (
        <div>
          {/* Main Form White Card */}
          <div className="apex-form-card">
            {/* ROW 1: 4 columns matching Screenshot 1 */}
            <div className="apex-form-grid-4">
              {/* Field 1: Master Designation */}
              <div className="apex-form-field">
                <label>
                  Master Designation
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
                  value={formData.master_designation}
                  onChange={(e) => setFormData({ ...formData, master_designation: e.target.value })}
                  disabled={!selectedRecord?.isCreate}
                />
              </div>

              {/* Field 2: Master Position Type (with ✕ clear and ⌄ dropdown) */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                  Master Position Type
                </label>
                <div style={{ position: 'relative' }}>
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
                      appearance: 'none',
                      cursor: 'pointer',
                      color: '#1e293b',
                    }}
                    value={formData.master_position_type}
                    onChange={(e) => setFormData({ ...formData, master_position_type: e.target.value })}
                  >
                    <option value="">- Select Position Type -</option>
                    {filterOptions.positionTypes.map((pt) => (
                      <option key={pt} value={pt}>{pt}</option>
                    ))}
                  </select>
                  {/* Clear button (✕) and Chevron */}
                  <div style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {formData.master_position_type && (
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, master_position_type: '' })}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#64748b',
                          padding: '2px',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                        title="Clear"
                      >
                        <IconClose size={13} />
                      </button>
                    )}
                    <span style={{ pointerEvents: 'none', color: '#64748b' }}>
                      <IconChevronDown size={14} />
                    </span>
                  </div>
                </div>
              </div>

              {/* Field 3: Designation Position Count (read-only) */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                  Designation Position Count
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
                  value={Number(formData.master_designation_position_count || 0).toLocaleString()}
                />
              </div>

              {/* Field 4: Validation Status (read-only) */}
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
                    border: '1px solid #e2e8f0',
                    padding: '0 0.75rem',
                    fontSize: '0.825rem',
                    backgroundColor: '#ffffff',
                    color: '#1e293b',
                    cursor: 'default',
                    fontWeight: 600,
                  }}
                  value={formData.validation_status}
                />
              </div>
            </div>

            {/* ROW 2: 3 columns matching Screenshot 1 */}
            <div className="apex-form-grid-3">
              {/* Field 1: Contact Designation (read-only) */}
              <div className="apex-form-field">
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                  Contact Designation
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
                    backgroundColor: '#f8fafc',
                    color: '#1e293b',
                    cursor: 'default',
                  }}
                  value={formData.contact_designation || formData.master_designation}
                />
              </div>

              {/* Field 2: Contact Position Type (dropdown selector) */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                  Contact Position Type
                </label>
                <div style={{ position: 'relative' }}>
                  <select
                    className="apex-form-input"
                    style={{
                      width: '100%',
                      height: '38px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      padding: '0 2rem 0 0.75rem',
                      fontSize: '0.825rem',
                      backgroundColor: '#ffffff',
                      appearance: 'none',
                      cursor: 'pointer',
                      color: '#1e293b',
                    }}
                    value={formData.contact_position_type}
                    onChange={(e) => setFormData({ ...formData, contact_position_type: e.target.value })}
                  >
                    <option value="">- Select Contact Position Type -</option>
                    {filterOptions.positionTypes.map((pt) => (
                      <option key={pt} value={pt}>{pt}</option>
                    ))}
                  </select>
                  <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748b' }}>
                    <IconChevronDown size={14} />
                  </span>
                </div>
              </div>

              {/* Field 3: Total Contact (read-only count) */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                  Total Contact
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
                  value={Number(formData.contact_designation_position_count || childTotal || 0).toLocaleString()}
                />
              </div>
            </div>

            {/* ROW 3: 4 columns audit fields matching Screenshot 1 */}
            <div className="apex-form-grid-4">
              {/* Created By */}
              <div className="apex-form-field">
                <label>
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
              <div className="apex-form-field">
                <label>
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
              <div className="apex-form-field">
                <label>
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
              <div className="apex-form-field">
                <label>
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

            {/* FORM ACTION BUTTONS strictly matching Screenshot 1 */}
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
                  onClick={handleUpdateRecordsBatch}
                  style={{
                    height: '36px',
                    padding: '0 1.35rem',
                    backgroundColor: '#0f172a',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.825rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#020617')}
                  onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#0f172a')}
                  title="Update all matching contact records in real-time"
                >
                  Update Records
                </button>
              </div>
            </div>
          </div>

          {/* CHILD REPORT: DRILLDOWN CONTACTS MATCHING THIS DESIGNATION */}
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '1.25rem 1.5rem',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
            }}
          >
            {/* Child Report Toolbar matching Screenshot 1 */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem',
                marginBottom: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
                      padding: '0 12px',
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
                        setChildRows(Number(e.target.value));
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

              {/* Pagination info matching Screenshot 1: "1 - 50 of 6,028 >" */}
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

            {/* Child Contacts Table */}
            <div style={{ overflowX: 'auto' }}>
              {childLoading ? (
                <div style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b' }}>
                  Loading linked contacts...
                </div>
              ) : childContacts.length === 0 ? (
                <div style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b' }}>
                  No contacts found with designation "{formData.master_designation}".
                </div>
              ) : (
                <table className="apex-master-table">
                  <thead>
                    <tr>
                      <th style={{ width: '40px', textAlign: 'center' }}></th>
                      <th style={{ width: '80px' }}>ID</th>
                      <th style={{ minWidth: '160px' }}>Contact Name</th>
                      <th style={{ minWidth: '180px' }}>Company</th>
                      <th style={{ minWidth: '150px' }}>Designation</th>
                      <th style={{ minWidth: '150px' }}>Position Type</th>
                      <th style={{ minWidth: '180px' }}>Email</th>
                      <th style={{ minWidth: '130px' }}>Phone</th>
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
                                } catch (e) { }
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
                        <td style={{ color: '#334155' }}>{c.comp_name || '-'}</td>
                        <td style={{ color: '#334155' }}>{c.designation || '-'}</td>
                        <td style={{ color: '#334155' }}>{c.pos_type || '-'}</td>
                        <td style={{ color: '#64748b' }}>{c.comp_email || '-'}</td>
                        <td style={{ color: '#64748b' }}>{c.contact_phone || '-'}</td>
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
        columns={DESIGNATION_POSITION_MASTER_COLUMNS}
        visibleKeys={masterVisibleKeys}
        onSave={handleSaveColumns}
        onReset={() => handleSaveColumns(DEFAULT_MASTER_KEYS)}
      />

      {/* Oracle APEX Interactive Column Header Menu */}
      <ApexColumnHeaderMenu
        isOpen={headerMenu.isOpen}
        column={headerMenu.column}
        anchorRect={headerMenu.anchorRect}
        data={masterList}
        sortConfig={{ key: sortKey, direction: sortDir }}
        onSort={handleMenuSort}
        onHideColumn={handleMenuHideColumn}
        onControlBreak={() => setShowMasterChartModal(true)}
        onFilterValue={handleMenuFilterValue}
        onClose={closeHeaderMenu}
      />

      {/* Filter Modal */}
      <ApexFilterModal
        isOpen={showMasterFilterModal}
        onClose={() => setShowMasterFilterModal(false)}
        columns={DESIGNATION_POSITION_MASTER_COLUMNS}
        onApplyFilter={(f) => {
          if (f.column === 'master_designation' || f.column === 'contact_designation') {
            setFilterDesignation(f.value);
            setActiveFilters((prev) => ({ ...prev, designation: f.value }));
          } else if (f.column === 'master_position_type' || f.column === 'contact_position_type') {
            setFilterPositionType(f.value);
            setActiveFilters((prev) => ({ ...prev, position_type: f.value }));
          }
          setMasterPage(1);
          if (onShowToast) onShowToast('success', `Filter applied on ${f.column}`);
        }}
      />

      {/* Aggregate Modal matching Screenshot 1 */}
      <ApexAggregateModal
        isOpen={showAggregateModal}
        onClose={() => setShowAggregateModal(false)}
        columns={DESIGNATION_POSITION_MASTER_COLUMNS}
        aggregations={aggregations}
        onApply={handleApplyAggregation}
        onDelete={(id) => setAggregations((prev) => prev.filter((a) => a.id !== id))}
      />

      {/* Chart Modal */}
      <ApexChartModal
        isOpen={showMasterChartModal}
        onClose={() => setShowMasterChartModal(false)}
        columns={DESIGNATION_POSITION_MASTER_COLUMNS}
        data={masterList}
      />

      {/* Upload CSV Modal */}
      {showUploadModal && (
        <div className="apex-modal-overlay">
          <div className="apex-modal" style={{ maxWidth: '480px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#1e293b' }}>
                Upload Designation & Position Data
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
              Upload a CSV file containing columns: <code>Master Designation</code>, <code>Master Position Type</code>.
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
                    if (onShowToast) onShowToast('success', 'CSV data uploaded and merged.');
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

      {/* Edit Contact Modal for Sub-Report Drilldown */}
      {editingContact && (
        <div className="apex-modal-overlay">
          <div className="apex-modal" style={{ maxWidth: '520px', width: '92%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#1e293b' }}>
                Edit Contact #{editingContact.id}
              </h3>
              <button
                type="button"
                onClick={() => setEditingContact(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <IconClose size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateContactRecord}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', marginBottom: '1rem' }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                    Contact Name
                  </label>
                  <input
                    type="text"
                    className="apex-form-input"
                    style={{ width: '100%', height: '34px', fontSize: '0.825rem' }}
                    value={editingContactForm.contact_name}
                    onChange={(e) => setEditingContactForm({ ...editingContactForm, contact_name: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                    Designation
                  </label>
                  <input
                    type="text"
                    className="apex-form-input"
                    style={{ width: '100%', height: '34px', fontSize: '0.825rem' }}
                    value={editingContactForm.designation}
                    onChange={(e) => setEditingContactForm({ ...editingContactForm, designation: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                    Position Type
                  </label>
                  <select
                    className="apex-form-input"
                    style={{ width: '100%', height: '34px', fontSize: '0.825rem', backgroundColor: '#fff' }}
                    value={editingContactForm.pos_type}
                    onChange={(e) => setEditingContactForm({ ...editingContactForm, pos_type: e.target.value })}
                  >
                    <option value="">- Select Position Type -</option>
                    {filterOptions.positionTypes.map((pt) => (
                      <option key={pt} value={pt}>{pt}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                    Email
                  </label>
                  <input
                    type="email"
                    className="apex-form-input"
                    style={{ width: '100%', height: '34px', fontSize: '0.825rem' }}
                    value={editingContactForm.comp_email}
                    onChange={(e) => setEditingContactForm({ ...editingContactForm, comp_email: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                    Phone
                  </label>
                  <input
                    type="text"
                    className="apex-form-input"
                    style={{ width: '100%', height: '34px', fontSize: '0.825rem' }}
                    value={editingContactForm.contact_phone}
                    onChange={(e) => setEditingContactForm({ ...editingContactForm, contact_phone: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9' }}>
                <button
                  type="button"
                  onClick={() => setEditingContact(null)}
                  style={{
                    padding: '6px 14px',
                    backgroundColor: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    borderRadius: '4px',
                    fontSize: '0.825rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '6px 16px',
                    backgroundColor: '#102a43',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '0.825rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Save Contact
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

