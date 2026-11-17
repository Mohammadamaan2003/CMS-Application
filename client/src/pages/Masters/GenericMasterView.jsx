import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../../api/client';
import { formatAppDate } from '../../utils/dateUtils';
import {
  IconSearch,
  IconFilePenLine,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconClose,
} from '../../components/Icons';
import ApexActionsMenu from '../../components/ApexActionsMenu';
import ApexAggregateModal from '../../components/ApexAggregateModal';
import ActiveAggregationsBar from '../../components/ActiveAggregationsBar';
import ApexColumnHeaderMenu from '../../components/ApexColumnHeaderMenu';
import SelectColumnsModal from '../../components/SelectColumnsModal';

export default function GenericMasterView({ masterKey, title, onShowToast }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [rows, setRows] = useState(50);
  const [page, setPage] = useState(1);
  const [note, setNote] = useState('');
  const [showActions, setShowActions] = useState(false);
  const [showColumnsModal, setShowColumnsModal] = useState(false);
  const [showAggregateModal, setShowAggregateModal] = useState(false);
  const [aggregations, setAggregations] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showUploadModal, setShowUploadModal] = useState(false);

  // APEX Interactive Header Menu & Filtering/Sorting
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [headerFilter, setHeaderFilter] = useState({ key: null, value: null });
  const [hiddenKeys, setHiddenKeys] = useState([]);
  const [headerMenu, setHeaderMenu] = useState({ isOpen: false, column: null, anchorRect: null });

  const columns = useMemo(() => [
    { key: 'master_val', label: `Master ${title}` },
    { key: 'master_count', label: 'Master Count' },
    { key: 'data_val', label: `Data ${title}` },
    { key: 'data_count', label: 'Data Count' },
    { key: 'validation_status', label: 'Validation Status' },
    { key: 'created_date', label: 'Created Date' },
    { key: 'modified_date', label: 'Modified Date' },
  ], [title]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.getGenericMaster(masterKey);
      if (res.success) {
        setData(res.data || []);
        setNote(res.note || '');
      }
    } catch (err) {
      console.warn('Error loading master data:', err.message);
    } finally {
      setLoading(false);
    }
  }, [masterKey]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredData = useMemo(() => {
    let list = data;
    if (activeSearch.trim()) {
      const s = activeSearch.toLowerCase().trim();
      list = list.filter(
        (r) =>
          (r.master_val && String(r.master_val).toLowerCase().includes(s)) ||
          (r.data_val && String(r.data_val).toLowerCase().includes(s)) ||
          (r.validation_status && String(r.validation_status).toLowerCase().includes(s))
      );
    }
    if (headerFilter.key && headerFilter.value) {
      const q = headerFilter.value.toLowerCase().trim();
      list = list.filter((r) => {
        const v = String(r[headerFilter.key] || '').toLowerCase().trim();
        return v === q;
      });
    }
    if (sortKey) {
      list = [...list].sort((a, b) => {
        let va = a[sortKey] ?? '';
        let vb = b[sortKey] ?? '';
        if (typeof va === 'number' && typeof vb === 'number') {
          return sortDir === 'asc' ? va - vb : vb - va;
        }
        return sortDir === 'asc'
          ? String(va).localeCompare(String(vb), undefined, { numeric: true })
          : String(vb).localeCompare(String(va), undefined, { numeric: true });
      });
    }
    return list;
  }, [data, activeSearch, headerFilter, sortKey, sortDir]);

  const handleHeaderClick = (e, col) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setHeaderMenu({
      isOpen: true,
      column: col,
      anchorRect: rect,
    });
  };

  const handleMenuSort = (columnKey, direction) => {
    setSortKey(columnKey);
    setSortDir(direction);
    setPage(1);
  };

  const handleMenuHideColumn = (columnKey) => {
    setHiddenKeys((prev) => [...prev, columnKey]);
    if (onShowToast) onShowToast('info', 'Column hidden.');
  };

  const handleMenuFilterValue = (columnKey, val) => {
    setHeaderFilter({ key: columnKey, value: val });
    setPage(1);
    if (onShowToast) onShowToast('success', `Filtered by ${val}`);
  };

  const total = filteredData.length;
  const numRows = rows === 'all' ? total : Number(rows);
  const totalPages = rows === 'all' ? 1 : Math.ceil(total / numRows) || 1;
  const startRow = total === 0 ? 0 : (page - 1) * numRows + 1;
  const endRow = rows === 'all' ? total : Math.min(page * numRows, total);

  const pagedData = useMemo(() => {
    if (rows === 'all') return filteredData;
    const start = (page - 1) * numRows;
    return filteredData.slice(start, start + numRows);
  }, [filteredData, page, numRows, rows]);

  const handleToolbarSearch = (e) => {
    if (e) e.preventDefault();
    setActiveSearch(search.trim());
    setPage(1);
  };

  const handleSelectAll = () => {
    const isAllSelected = filteredData.length > 0 && selectedIds.size >= filteredData.length;
    if (isAllSelected) {
      setSelectedIds(new Set());
      if (onShowToast) onShowToast('info', 'Deselected all records.');
    } else {
      const allIds = new Set(filteredData.map((m) => m.id));
      setSelectedIds(allIds);
      if (onShowToast) onShowToast('info', `Selected all ${allIds.size} records throughout master list.`);
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

  const handleBatchDelete = () => {
    if (selectedIds.size === 0) return;
    if (window.confirm(`Are you sure you want to delete ${selectedIds.size} selected record(s)?`)) {
      setData((prev) => prev.filter((r) => !selectedIds.has(r.id)));
      if (onShowToast) onShowToast('success', `Deleted ${selectedIds.size} record(s).`);
      setSelectedIds(new Set());
    }
  };

  const handleDownloadCsv = () => {
    if (!filteredData.length) return;
    const headers = columns.map((c) => `"${c.label}"`).join(',');
    const csvRows = filteredData.map((row) =>
      columns.map((c) => `"${String(row[c.key] !== undefined ? row[c.key] : '').replace(/"/g, '""')}"`).join(',')
    );
    const blob = new Blob([[headers, ...csvRows].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${title.replace(/\s+/g, '_')}_Master_${Date.now()}.csv`;
    link.click();
    if (onShowToast) onShowToast('info', `Downloaded ${title} report.`);
  };

  return (
    <div className="generic-master-container" style={{ padding: '0 0.5rem' }}>
      <div style={{ marginBottom: '1rem' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>{title}</h1>
      </div>

      <div
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '1.25rem 1.5rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
        }}
      >
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
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
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

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginLeft: '0.25rem' }}>
              <span style={{ fontSize: '0.825rem', color: '#475569', fontWeight: 500 }}>Rows</span>
              <div style={{ position: 'relative' }}>
                <select
                  className="apex-form-input"
                  value={rows}
                  onChange={(e) => {
                    const val = e.target.value === 'all' ? 'all' : Number(e.target.value);
                    setRows(val);
                    setPage(1);
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
                  <option value="all">All</option>
                </select>
                <span style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748b' }}>
                  <IconChevronDown size={13} />
                </span>
              </div>
            </div>

            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setShowActions((p) => !p)}
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
                isOpen={showActions}
                onClose={() => setShowActions(false)}
                columns={columns}
                data={filteredData}
                reportId={`master_${masterKey}`}
                onOpenColumns={() => setShowColumnsModal(true)}
                onOpenAggregate={() => setShowAggregateModal(true)}
                onDownload={handleDownloadCsv}
                onRefresh={loadData}
                onApplySort={(rules) => {
                  if (rules && rules[0] && rules[0].key) {
                    setSortKey(rules[0].key);
                    setSortDir(rules[0].dir || 'asc');
                  }
                }}
                onChangeRows={(newRows) => {
                  setRows(newRows);
                  setPage(1);
                }}
                onResetReport={() => {
                  setSearch('');
                  setActiveSearch('');
                  setHeaderFilter({ key: null, value: null });
                  setSortKey(null);
                  setSortDir('asc');
                  setRows(50);
                  setPage(1);
                  setAggregations([]);
                  if (onShowToast) onShowToast('info', 'Report reset to default.');
                }}
                currentRows={rows}
                isEditableGrid={true}
                hasSelection={selectedIds.size > 0}
                onSelectAll={handleSelectAll}
                onDeselectAll={() => setSelectedIds(new Set())}
              />
            </div>
          </div>

          {/* Right Toolbar Action Buttons matching Screenshot 2 */}
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
              onClick={() => {
                if (onShowToast) onShowToast('info', `Create ${title} form opened.`);
              }}
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

        {/* Pagination summary row matching Screenshot 2: "1 - 50 of 218 < >" */}
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
            {total === 0 ? '0 of 0' : `${startRow.toLocaleString()} - ${endRow.toLocaleString()} of ${total.toLocaleString()}`}
          </span>
          <div style={{ display: 'flex', gap: '2px' }}>
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              style={{
                background: 'none',
                border: 'none',
                cursor: page <= 1 ? 'not-allowed' : 'pointer',
                color: page <= 1 ? '#cbd5e1' : '#475569',
                padding: '2px 4px',
              }}
            >
              <IconChevronLeft size={16} />
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              style={{
                background: 'none',
                border: 'none',
                cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                color: page >= totalPages ? '#cbd5e1' : '#475569',
                padding: '2px 4px',
              }}
            >
              <IconChevronRight size={16} />
            </button>
          </div>
        </div>

        <ActiveAggregationsBar
          aggregations={aggregations}
          data={filteredData}
          onEditAggregation={() => setShowAggregateModal(true)}
          onRemoveAggregation={(id) => setAggregations((prev) => prev.filter((a) => a.id !== id))}
          onClearAll={() => setAggregations([])}
        />

        {headerFilter.key && headerFilter.value && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '4px',
              marginBottom: '0.65rem',
              fontSize: '0.8rem',
            }}
          >
            <span style={{ fontWeight: 600, color: '#475569' }}>Filter:</span>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#eff6ff',
                border: '1px solid #bfdbfe',
                color: '#1d4ed8',
                borderRadius: '4px',
                padding: '2px 8px',
                fontWeight: 500,
              }}
            >
              <span>{columns.find((c) => c.key === headerFilter.key)?.label || headerFilter.key} = &quot;{headerFilter.value}&quot;</span>
              <button
                type="button"
                onClick={() => setHeaderFilter({ key: null, value: null })}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#1d4ed8',
                  display: 'flex',
                  alignItems: 'center',
                  padding: 0,
                }}
                title="Remove filter"
              >
                <IconClose size={12} />
              </button>
            </div>
            <button
              type="button"
              onClick={() => setHeaderFilter({ key: null, value: null })}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#ef4444',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.75rem',
                marginLeft: 'auto',
                textDecoration: 'underline',
              }}
            >
              Clear Filter
            </button>
          </div>
        )}

        <div style={{ overflowX: 'auto' }}>
          <table className="apex-master-table">
            <thead>
              <tr>
                <th style={{ width: '40px', textAlign: 'center' }}>
                  <span
                    style={{ cursor: 'pointer', fontSize: '1rem', color: '#1e293b' }}
                    title="Select Columns"
                    onClick={() => setShowColumnsModal(true)}
                  >
                    ✎
                  </span>
                </th>
                <th style={{ width: '80px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <input
                      type="checkbox"
                      checked={filteredData.length > 0 && selectedIds.size >= filteredData.length}
                      ref={(el) => {
                        if (el) {
                          el.indeterminate = selectedIds.size > 0 && selectedIds.size < filteredData.length;
                        }
                      }}
                      onChange={handleSelectAll}
                      style={{ cursor: 'pointer' }}
                      title={
                        selectedIds.size >= filteredData.length && filteredData.length > 0
                          ? `All ${filteredData.length} records selected`
                          : `Select all ${filteredData.length} records throughout report`
                      }
                    />
                  </div>
                </th>
                {columns.filter((c) => !hiddenKeys.includes(c.key)).map((col) => {
                  const isNumber = col.key === 'master_count' || col.key === 'data_count';
                  const isCenter = col.key === 'validation_status' || col.key === 'created_date' || col.key === 'modified_date';
                  return (
                    <th
                      key={col.key}
                      className={isNumber ? 'col-number' : isCenter ? 'col-center' : ''}
                      onClick={(e) => handleHeaderClick(e, col)}
                      style={{
                        minWidth: isNumber ? '160px' : isCenter ? (col.key === 'validation_status' ? '160px' : '130px') : '220px',
                        cursor: 'pointer',
                        userSelect: 'none',
                        whiteSpace: 'nowrap',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = '#f1f5f9';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
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
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                    Loading {title} records from application database...
                  </td>
                </tr>
              ) : pagedData.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
                    {note || `No records found in application database for ${title}.`}
                  </td>
                </tr>
              ) : (
                pagedData.map((row) => (
                  <tr key={row.id}>
                    <td className="col-center">
                      <button type="button" className="apex-edit-icon-btn" title={`View ${row.master_val}`}>
                        <IconFilePenLine size={15} />
                      </button>
                    </td>
                    <td className="col-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(row.id)}
                        onChange={() => handleToggleRow(row.id)}
                        style={{ cursor: 'pointer' }}
                      />
                    </td>
                    <td style={{ fontWeight: 600, color: '#1e293b' }}>{row.master_val || '—'}</td>
                    <td className="col-number" style={{ color: '#475569' }}>
                      {row.master_count !== undefined ? Number(row.master_count).toLocaleString() : '—'}
                    </td>
                    <td style={{ color: '#475569' }}>{row.data_val || row.master_val || '—'}</td>
                    <td className="col-number" style={{ color: '#475569' }}>
                      {row.data_count !== undefined ? Number(row.data_count).toLocaleString() : '—'}
                    </td>
                    <td className="col-center">
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          backgroundColor: '#dcfce7',
                          color: '#166534',
                        }}
                      >
                        {row.validation_status || 'DATA IN BOTH'}
                      </span>
                    </td>
                    <td className="col-center" style={{ color: '#64748b' }}>{formatAppDate(row.created_date)}</td>
                    <td className="col-center" style={{ color: '#64748b' }}>{formatAppDate(row.modified_date)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Aggregate Modal */}
      <ApexAggregateModal
        isOpen={showAggregateModal}
        onClose={() => setShowAggregateModal(false)}
        columns={columns}
        aggregations={aggregations}
        onApply={(newAgg) => {
          setAggregations((prev) => [...prev, newAgg]);
          if (onShowToast) onShowToast('success', `Applied ${newAgg.func} aggregation.`);
        }}
        onDelete={(id) => {
          setAggregations((prev) => prev.filter((a) => a.id !== id));
        }}
      />

      {/* Upload CSV Modal */}
      {showUploadModal && (
        <div className="apex-modal-overlay">
          <div className="apex-modal" style={{ maxWidth: '480px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#1e293b' }}>
                Upload {title} Data
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
              Upload a CSV file containing records for {title}.
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
                    if (onShowToast) onShowToast('success', `${title} CSV data uploaded and merged.`);
                    loadData();
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
      {/* Select Columns Modal */}
      <SelectColumnsModal
        isOpen={showColumnsModal}
        onClose={() => setShowColumnsModal(false)}
        columns={columns}
        visibleKeys={columns.filter((c) => !hiddenKeys.includes(c.key)).map((c) => c.key)}
        defaultVisibleKeys={columns.map((c) => c.key)}
        onSave={(newKeys) => {
          const newHidden = columns.filter((c) => !newKeys.includes(c.key)).map((c) => c.key);
          setHiddenKeys(newHidden);
          if (onShowToast) onShowToast('info', 'Columns updated.');
        }}
        onReset={() => setHiddenKeys([])}
      />

      {/* Oracle APEX Interactive Column Header Menu */}
      <ApexColumnHeaderMenu
        isOpen={headerMenu.isOpen}
        column={headerMenu.column}
        anchorRect={headerMenu.anchorRect}
        data={filteredData}
        sortConfig={{ key: sortKey, direction: sortDir }}
        onSort={handleMenuSort}
        onHideColumn={handleMenuHideColumn}
        onFilterValue={handleMenuFilterValue}
        onClose={() => setHeaderMenu({ isOpen: false, column: null, anchorRect: null })}
      />
    </div>
  );
}
