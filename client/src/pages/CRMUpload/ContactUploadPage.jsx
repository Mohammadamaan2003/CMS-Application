import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { api } from '../../api/client';
import ValidationRulesModal from '../../components/ValidationRulesModal';
import ApexActionsMenu from '../../components/ApexActionsMenu';
import ApexHelpModal from '../../components/ApexHelpModal';
import {
  IconUploadCloud,
  IconDownload,
  IconChevronRight,
  IconChevronLeft,
  IconChevronDown,
  IconCheckCircle,
  IconAlertTriangle,
  IconRefresh,
  IconEdit,
  IconPlus,
  IconSearch,
  IconTrash,
} from '../../components/Icons';

export default function ContactUploadPage({ onShowToast, onNavigateToContacts, onNavigateToIncorrectData }) {
  // Wizard Step: 1 = Upload Contact, 2 = Validate & Preview, 3 = Import
  const [currentStep, setCurrentStep] = useState(1);

  // Step 1 State
  const [uploadMode, setUploadMode] = useState('insert'); // 'insert', 'update'
  const [showValidationRules, setShowValidationRules] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileError, setFileError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Parsed Raw Rows
  const [rawRows, setRawRows] = useState([]);
  const [detectedHeaders, setDetectedHeaders] = useState([]);

  // Step 2 State
  const [validating, setValidating] = useState(false);
  const [rechecking, setRechecking] = useState(false);
  const [validationResults, setValidationResults] = useState([]);
  const [editableRows, setEditableRows] = useState([]);
  const [validationSummary, setValidationSummary] = useState({
    total: 0,
    new: 0,
    update: 0,
    errors: 0,
    valid: 0,
    invalid: 0,
    warnings: 0,
  });
  const [selectedRowIndices, setSelectedRowIndices] = useState(new Set());
  const [isEditingGrid, setIsEditingGrid] = useState(false);
  const [showActionsDropdown, setShowActionsDropdown] = useState(false);

  // Search & Pagination in Step 2
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(50);

  // Step 3 State
  const [importing, setImporting] = useState(false);
  const [importCompleted, setImportCompleted] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importPolicy, setImportPolicy] = useState('skip'); // 'skip' or 'all_or_nothing'

  // Contact Upload Meta (master lookups)
  const [uploadMeta, setUploadMeta] = useState(null);

  useEffect(() => {
    api.getContactUploadMeta()
      .then((res) => {
        if (res && res.success) {
          setUploadMeta(res.data);
        }
      })
      .catch((err) => console.error('Error fetching contact upload meta:', err));
  }, []);

  // Download Sample Template
  const handleDownloadTemplate = () => {
    const mode = uploadMode === 'update' ? 'update' : 'insert';
    const link = document.createElement('a');
    link.href = `/api/contacts/upload/template?mode=${mode}`;
    link.download = mode === 'update' ? 'Contact_Upload_Template_Update.csv' : 'Contact_Upload_Template_Insert.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (onShowToast) {
      onShowToast('success', `Downloaded ${mode === 'update' ? 'Update' : 'Insert'} Contact Template.`);
    }
  };

  // Process File
  const handleFileProcess = (file) => {
    setFileError(null);
    if (!file) return;

    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setFileError('File size exceeds the 10 MB limit. Please upload a smaller file.');
      setSelectedFile(null);
      setRawRows([]);
      return;
    }

    const name = file.name.toLowerCase();
    if (!name.endsWith('.csv') && !name.endsWith('.xlsx') && !name.endsWith('.xls')) {
      setFileError('Invalid file type. Please upload a valid CSV or Excel (.xlsx, .xls) file.');
      setSelectedFile(null);
      setRawRows([]);
      return;
    }

    setSelectedFile(file);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        const jsonRows = XLSX.utils.sheet_to_json(worksheet, {
          raw: false,
          defval: '',
          blankrows: false,
        });

        if (!jsonRows || jsonRows.length === 0) {
          setFileError('The selected file contains no data rows.');
          setRawRows([]);
          return;
        }

        const headers = Object.keys(jsonRows[0] || {});
        setDetectedHeaders(headers);
        setRawRows(jsonRows);
        if (onShowToast) {
          onShowToast('success', `File parsed: ${jsonRows.length} rows found.`);
        }
      } catch (err) {
        console.error('File parsing error:', err);
        setFileError(`Failed to parse file: ${err.message}`);
        setRawRows([]);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  // Map API validation results to grid state
  const mapResultsToEditableRows = (results) => {
    return results.map((item) => {
      const c = item.normalized || {};
      const errorMsg = (item.errors && item.errors.length > 0)
        ? item.errors.map((e) => typeof e === 'string' ? e : e.message).join(' | ')
        : (item.error_msg || '');

      return {
        ...item,
        stg_id: item.stg_id || (400000 + item.sourceRowNumber),
        excel_row_no: item.excel_row_no || item.sourceRowNumber,
        error_msg: errorMsg,
        comp_id: c.comp_id || '',
        comp_name: c.comp_name || '',
        contact_name: c.contact_name || '',
        designation: c.designation || '',
        pos_type: c.pos_type || '',
        priority_contact: c.priority_contact || 'N',
        country: c.country || '',
        comp_email: c.comp_email || '',
        other_email: c.other_email || '',
        contact_phone: c.contact_phone || '',
        contact_mobile: c.contact_mobile || '',
        linkedin_url: c.linkedin_url || '',
        contactstatus: c.contactstatus || 'Active',
        salesperson: c.salesperson || '',
        source: c.source || '',
        website: c.website || '',
        remark: c.remark || '',
      };
    });
  };

  // STEP 1 -> STEP 2: Proceed to Validation
  const handleProceedToValidate = async () => {
    if (!selectedFile || rawRows.length === 0) {
      setFileError('Please select a valid CSV or Excel file before proceeding.');
      return;
    }

    try {
      setValidating(true);
      const res = await api.validateContactUpload({
        rows: rawRows,
        mode: uploadMode,
      });

      if (res && res.success) {
        setValidationResults(res.results || []);
        const staged = mapResultsToEditableRows(res.results || []);
        setEditableRows(staged);
        setValidationSummary(
          res.summary || { total: rawRows.length, new: 0, update: 0, errors: 0, valid: 0, invalid: 0 }
        );
        setCurrentStep(2);
      } else {
        if (onShowToast) onShowToast('error', res.message || 'Validation request failed.');
      }
    } catch (err) {
      if (onShowToast) onShowToast('error', `Validation error: ${err.message}`);
    } finally {
      setValidating(false);
    }
  };

  // STEP 2: Re-Check
  const handleRecheck = async () => {
    try {
      setRechecking(true);
      const res = await api.validateContactUpload({
        rows: editableRows,
        mode: uploadMode,
      });

      if (res && res.success) {
        setValidationResults(res.results || []);
        const staged = mapResultsToEditableRows(res.results || []);
        setEditableRows(staged);
        setValidationSummary(
          res.summary || { total: staged.length, new: 0, update: 0, errors: 0, valid: 0, invalid: 0 }
        );
        if (onShowToast) {
          onShowToast(
            'success',
            `Re-check complete: ${res.summary.valid} valid, ${res.summary.errors} error(s) remaining.`
          );
        }
      }
    } catch (err) {
      if (onShowToast) onShowToast('error', `Re-check error: ${err.message}`);
    } finally {
      setRechecking(false);
    }
  };

  // Re-check alias for ApexActionsMenu and revert handlers
  const handleRecheckValidation = handleRecheck;

  // STEP 2: Inline Cell Edit
  const handleCellChange = (index, field, value) => {
    setEditableRows((prev) => {
      const updated = [...prev];
      const target = { ...updated[index] };
      target[field] = value;
      if (target.normalized) {
        target.normalized = { ...target.normalized, [field]: value };
      }
      updated[index] = target;
      return updated;
    });
  };

  // STEP 2: Add blank row
  const handleAddRow = () => {
    const nextRowNo = editableRows.length > 0 ? Math.max(...editableRows.map((r) => r.excel_row_no || 0)) + 1 : 2;
    const newRow = {
      sourceRowNumber: nextRowNo,
      excel_row_no: nextRowNo,
      stg_id: 400000 + nextRowNo,
      row_status: 'NEW',
      isValid: false,
      error_msg: 'Contact Name & Company Name are required',
      errors: [
        { field: 'Contact Name', message: 'Contact Name is required' },
        { field: 'Company Name', message: 'Company Name is required' },
      ],
      warnings: [],
      comp_name: '',
      contact_name: '',
      designation: '',
      pos_type: '',
      country: '',
      comp_email: '',
      contact_phone: '',
      contact_mobile: '',
      linkedin_url: '',
      salesperson: '',
      source: '',
      website: '',
      normalized: {
        comp_name: '',
        contact_name: '',
      },
    };
    setEditableRows([newRow, ...editableRows]);
    setIsEditingGrid(true);
    setValidationSummary((prev) => ({
      ...prev,
      total: prev.total + 1,
      errors: prev.errors + 1,
      invalid: prev.invalid + 1,
    }));
    if (onShowToast) onShowToast('info', 'Added blank contact row. Update fields and click Re-Check.');
  };

  // STEP 2: Delete selected rows
  const handleDeleteSelected = () => {
    if (selectedRowIndices.size === 0) return;
    const remaining = editableRows.filter((_, idx) => !selectedRowIndices.has(idx));
    setEditableRows(remaining);
    setSelectedRowIndices(new Set());
    if (onShowToast) onShowToast('info', 'Removed selected row(s). Re-checking remaining rows...');

    api.validateContactUpload({ rows: remaining, mode: uploadMode }).then((res) => {
      if (res && res.success) {
        setValidationResults(res.results || []);
        const staged = mapResultsToEditableRows(res.results || []);
        setEditableRows(staged);
        setValidationSummary(
          res.summary || { total: staged.length, new: 0, update: 0, errors: 0, valid: 0, invalid: 0 }
        );
      }
    });
  };

  const [showHelpModal, setShowHelpModal] = useState(false);

  const handleSelectAll = () => {
    setSelectedRowIndices(new Set(editableRows.map((_, i) => i)));
  };

  const handleDeselectAll = () => {
    setSelectedRowIndices(new Set());
  };

  const handleInvertSelection = () => {
    const next = new Set();
    editableRows.forEach((_, i) => {
      if (!selectedRowIndices.has(i)) next.add(i);
    });
    setSelectedRowIndices(next);
  };

  const handleCopyToClipboard = () => {
    const rowsToCopy = selectedRowIndices.size > 0
      ? editableRows.filter((_, i) => selectedRowIndices.has(i))
      : editableRows;
    if (rowsToCopy.length === 0) return;
    const headers = ['Contact Name', 'Company Name', 'Designation', 'Corporate Email', 'Phone', 'Country'];
    const lines = [headers.join('\t')];
    rowsToCopy.forEach((r) => {
      lines.push([r.contact_name || '', r.comp_name || '', r.designation || '', r.corporate_email || '', r.phone || '', r.country || ''].join('\t'));
    });
    navigator.clipboard.writeText(lines.join('\n'));
    if (onShowToast) onShowToast('success', `Copied ${rowsToCopy.length} rows to clipboard (TSV).`);
  };

  const handleRevertEdits = () => {
    if (window.confirm('Revert all unsaved staging edits back to the initial validation results?')) {
      handleRecheckValidation();
      if (onShowToast) onShowToast('info', 'Reverted staging rows.');
    }
  };

  const handleDownloadStagingCsv = () => {
    if (editableRows.length === 0) return;
    const headers = ['Contact Name', 'Company Name', 'Designation', 'Position Type', 'Corporate Email', 'Phone', 'Country', 'Status'];
    const lines = [headers.join(',')];
    editableRows.forEach((r) => {
      lines.push([
        `"${r.contact_name || ''}"`,
        `"${r.comp_name || ''}"`,
        `"${r.designation || ''}"`,
        `"${r.position_type || ''}"`,
        `"${r.corporate_email || ''}"`,
        `"${r.phone || ''}"`,
        `"${r.country || ''}"`,
        `"${r.row_status || ''}"`
      ].join(','));
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contact_staging_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    if (onShowToast) onShowToast('success', `Exported ${editableRows.length} staging rows to CSV.`);
  };

  // STEP 2: Download Error Rows CSV
  const handleDownloadErrorRows = () => {
    const errorRows = editableRows.filter((r) => r.row_status === 'ERROR' || !r.isValid);
    if (errorRows.length === 0) {
      if (onShowToast) onShowToast('info', 'No error rows found. All rows are valid!');
      return;
    }

    const headers = [
      'Row No',
      'Contact Name',
      'Company Name',
      'Error Message',
      'Designation',
      'Position Type',
      'Country',
      'Corporate Email',
      'Phone',
      'Mobile',
      'LinkedIn URL',
      'Salesperson',
      'Source',
    ];

    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '""';
      return `"${String(val).replace(/"/g, '""')}"`;
    };

    const lines = [
      headers.map(escapeCsv).join(','),
      ...errorRows.map((r) =>
        [
          r.excel_row_no,
          r.contact_name || '',
          r.comp_name || '',
          r.error_msg || '',
          r.designation || '',
          r.pos_type || '',
          r.country || '',
          r.comp_email || '',
          r.contact_phone || '',
          r.contact_mobile || '',
          r.linkedin_url || '',
          r.salesperson || '',
          r.source || '',
        ]
          .map(escapeCsv)
          .join(',')
      ),
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Contact_Upload_Errors_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    if (onShowToast) onShowToast('success', `Exported ${errorRows.length} error row(s).`);
  };

  // STEP 2 -> STEP 3: Proceed to Import
  const handleProceedToImport = () => {
    const validCount = validationSummary.new + validationSummary.update;
    if (validCount === 0) {
      if (onShowToast) {
        onShowToast('error', 'There are 0 valid rows to import. Please resolve the errors in the red rows.');
      }
      return;
    }
    setCurrentStep(3);
  };

  // STEP 3: Execute Database Import
  const handleExecuteImport = async () => {
    try {
      setImporting(true);
      const res = await api.importContactUpload({
        rows: editableRows,
        mode: uploadMode,
        policy: importPolicy,
      });

      if (res && res.success) {
        setImportCompleted(true);
        setImportResult(res);
        if (onShowToast) {
          onShowToast('success', res.message || 'Contacts imported successfully.');
        }
      } else {
        if (onShowToast) onShowToast('error', res.message || 'Import failed.');
      }
    } catch (err) {
      if (onShowToast) onShowToast('error', `Import error: ${err.message}`);
    } finally {
      setImporting(false);
    }
  };

  // Reset Wizard
  const handleResetUpload = () => {
    setCurrentStep(1);
    setSelectedFile(null);
    setRawRows([]);
    setValidationResults([]);
    setEditableRows([]);
    setValidationSummary({ total: 0, new: 0, update: 0, errors: 0, valid: 0, invalid: 0, warnings: 0 });
    setSelectedRowIndices(new Set());
    setImportCompleted(false);
    setImportResult(null);
    setFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Filter preview rows
  const filteredRows = editableRows.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      String(r.excel_row_no || '').includes(q) ||
      String(r.contact_name || '').toLowerCase().includes(q) ||
      String(r.comp_name || '').toLowerCase().includes(q) ||
      String(r.error_msg || '').toLowerCase().includes(q) ||
      String(r.designation || '').toLowerCase().includes(q) ||
      String(r.country || '').toLowerCase().includes(q) ||
      String(r.comp_email || '').toLowerCase().includes(q) ||
      String(r.salesperson || '').toLowerCase().includes(q)
    );
  });

  const totalFiltered = filteredRows.length;
  const startIdx = (page - 1) * rowsPerPage;
  const endIdx = Math.min(startIdx + rowsPerPage, totalFiltered);
  const pagedRows = filteredRows.slice(startIdx, endIdx);
  const totalPages = Math.ceil(totalFiltered / rowsPerPage) || 1;

  return (
    <div className="apex-master-page" style={{ padding: '0.75rem 1.25rem 2.5rem' }}>
      {/* Top Banner Pattern Strip */}
      <div className="apex-pattern-strip" style={{ marginBottom: '1rem', height: '4px' }} />

      {/* Main Upload Card */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          padding: '1.25rem',
        }}
      >
        {/* Wizard Steps Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #f1f5f9',
            paddingBottom: '1.25rem',
            marginBottom: '1.5rem',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          {/* Left Buttons: Back & Cancel */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {currentStep > 1 && (
              <button
                type="button"
                onClick={() => setCurrentStep(currentStep - 1)}
                title="Back"
                style={{
                  height: '36px',
                  width: '36px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px',
                  color: '#334155',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <IconChevronLeft size={16} />
              </button>
            )}

            <button
              type="button"
              onClick={onNavigateToContacts}
              className="btn-secondary btn-apex-cancel"
              style={{
                height: '36px',
                padding: '0 1.25rem',
                borderRadius: '4px',
                fontSize: '0.825rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>

          {/* Stepper Progress Bar (Matching APEX) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            {/* Step 1 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  backgroundColor: currentStep > 1 ? '#10b981' : currentStep === 1 ? 'var(--primary-blue, #2563eb)' : 'var(--bg-muted, #15223c)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  boxShadow: currentStep === 1 ? '0 0 10px rgba(56, 189, 248, 0.4)' : 'none',
                }}
              >
                {currentStep > 1 ? '✓' : '1'}
              </div>
              <span
                style={{
                  fontSize: '0.85rem',
                  fontWeight: currentStep === 1 ? 700 : 500,
                  color: currentStep === 1 ? 'var(--text-main, #f8fafc)' : 'var(--text-muted, #94a3b8)',
                }}
              >
                Upload Contact
              </span>
            </div>

            <div style={{ width: '40px', height: '1px', backgroundColor: 'var(--border, #334155)' }} />

            {/* Step 2 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  backgroundColor: currentStep > 2 ? '#10b981' : currentStep === 2 ? 'var(--primary-blue, #2563eb)' : 'var(--bg-muted, #15223c)',
                  color: currentStep >= 2 ? '#ffffff' : 'var(--text-muted, #94a3b8)',
                  border: currentStep < 2 ? '1px solid var(--border, #334155)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  boxShadow: currentStep === 2 ? '0 0 10px rgba(56, 189, 248, 0.4)' : 'none',
                }}
              >
                {currentStep > 2 ? '✓' : '2'}
              </div>
              <span
                style={{
                  fontSize: '0.85rem',
                  fontWeight: currentStep === 2 ? 700 : 500,
                  color: currentStep === 2 ? 'var(--text-main, #f8fafc)' : 'var(--text-muted, #94a3b8)',
                }}
              >
                Validate & Preview
              </span>
            </div>

            <div style={{ width: '40px', height: '1px', backgroundColor: 'var(--border, #334155)' }} />

            {/* Step 3 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  backgroundColor: currentStep === 3 ? 'var(--primary-blue, #2563eb)' : 'var(--bg-muted, #15223c)',
                  color: currentStep === 3 ? '#ffffff' : 'var(--text-muted, #94a3b8)',
                  border: currentStep < 3 ? '1px solid var(--border, #334155)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  boxShadow: currentStep === 3 ? '0 0 10px rgba(56, 189, 248, 0.4)' : 'none',
                }}
              >
                3
              </div>
              <span
                style={{
                  fontSize: '0.85rem',
                  fontWeight: currentStep === 3 ? 700 : 500,
                  color: currentStep === 3 ? 'var(--text-main, #f8fafc)' : 'var(--text-muted, #94a3b8)',
                }}
              >
                Import
              </span>
            </div>
          </div>

          {/* Right Action Button */}
          <div>
            {currentStep === 1 && (
              <button
                type="button"
                disabled={!selectedFile || validating}
                onClick={handleProceedToValidate}
                className="btn-primary"
                style={{
                  height: '36px',
                  padding: '0 1.25rem',
                  borderRadius: '4px',
                  fontSize: '0.825rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {validating ? 'Validating...' : 'Next'} <IconChevronRight size={15} />
              </button>
            )}

            {currentStep === 2 && (
              <button
                type="button"
                onClick={handleProceedToImport}
                disabled={validationSummary.new + validationSummary.update === 0}
                className="btn-primary"
                style={{
                  height: '36px',
                  padding: '0 1.25rem',
                  borderRadius: '4px',
                  fontSize: '0.825rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                Import Valid Rows <IconChevronRight size={15} />
              </button>
            )}
          </div>
        </div>

        {/* ======================================================== */}
        {/* STEP 1: UPLOAD CONTACT FORM (Matching APEX)              */}
        {/* ======================================================== */}
        {currentStep === 1 && (
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '1rem 0' }}>
            {/* Upload Mode Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
              <label
                style={{
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  color: 'var(--text-main, #f8fafc)',
                  minWidth: '120px',
                }}
              >
                Upload Mode
              </label>

              <select
                value={uploadMode}
                onChange={(e) => setUploadMode(e.target.value)}
                style={{
                  height: '38px',
                  minWidth: '240px',
                  padding: '0 12px',
                  border: '1px solid var(--border, #38bdf8)',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  outline: 'none',
                  backgroundColor: 'var(--bg-input, #0b1325)',
                  color: 'var(--text-main, #f8fafc)',
                  cursor: 'pointer',
                }}
              >
                <option value="insert">Insert (Add new contacts)</option>
                <option value="update">Update (Modify existing contacts)</option>
              </select>

              <button
                type="button"
                onClick={() => setShowValidationRules(true)}
                className="btn-outline"
                style={{
                  height: '38px',
                  padding: '0 12px',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span style={{ color: '#38bdf8' }}>ⓘ</span> Validation Rules
              </button>
            </div>

            {/* Drag & Drop File Zone */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: 'var(--text-main, #f8fafc)',
                  marginBottom: '0.5rem',
                }}
              >
                Excel / CSV file
              </label>

              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
                style={{
                  border: `2px dashed ${isDragging ? '#38bdf8' : 'var(--border, #334155)'}`,
                  borderRadius: '6px',
                  padding: '2.5rem 1.5rem',
                  textAlign: 'center',
                  backgroundColor: isDragging ? 'var(--primary-light, rgba(56, 189, 248, 0.12))' : 'var(--bg-surface, #101a2f)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv, .xlsx, .xls"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileProcess(e.target.files[0]);
                    }
                  }}
                  style={{ display: 'none' }}
                />

                <IconUploadCloud size={36} style={{ color: 'var(--accent-blue, #38bdf8)', marginBottom: '0.75rem' }} />

                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main, #f8fafc)', marginBottom: '0.35rem' }}>
                  {selectedFile ? selectedFile.name : 'Choose File or drag and drop here'}
                </div>

                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)' }}>
                  Supported formats: .CSV, .XLSX, .XLS &bull; Maximum file size: 10 MB
                </div>
              </div>

              {fileError && (
                <div
                  style={{
                    marginTop: '0.75rem',
                    padding: '8px 12px',
                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid #ef4444',
                    borderRadius: '4px',
                    color: '#fca5a5',
                    fontSize: '0.8rem',
                  }}
                >
                  {fileError}
                </div>
              )}
            </div>

            {/* Download Template Button */}
            <div>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                style={{
                  height: '38px',
                  padding: '0 16px',
                  backgroundColor: 'var(--bg-muted, #15223c)',
                  color: 'var(--text-main, #f8fafc)',
                  border: '1px solid var(--border, rgba(56, 189, 248, 0.4))',
                  borderRadius: '4px',
                  fontSize: '0.825rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                  transition: 'all 0.15s ease',
                }}
              >
                <IconDownload size={15} style={{ color: '#38bdf8' }} /> Download Template
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* STEP 2: VALIDATE & PREVIEW (Matching Screenshot 4)       */}
        {/* ======================================================== */}
        {currentStep === 2 && (
          <div>
            {/* Card 1: Summary Bar & Mini Table */}
            <div
              className="upload-summary-card apex-card"
              style={{
                backgroundColor: 'var(--bg-surface, #ffffff)',
                borderRadius: '6px',
                border: '1px solid var(--border, #e2e8f0)',
                marginBottom: '1.5rem',
                overflow: 'hidden',
              }}
            >
              <div
                className="upload-card-header"
                style={{
                  backgroundColor: 'var(--bg-card-header, #071531)',
                  color: '#ffffff',
                  padding: '0.75rem 1rem',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                }}
              >
                Summary
              </div>

              <div className="upload-summary-content" style={{ padding: '1rem', backgroundColor: 'var(--bg-surface, #ffffff)' }}>
                <div className="upload-summary-box" style={{ maxWidth: '420px', border: '1px solid var(--border, #e2e8f0)', borderRadius: '4px' }}>
                  <table className="upload-summary-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '0.8rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'var(--bg-table-header, #f8fafc)', borderBottom: '1px solid var(--border, #e2e8f0)', color: 'var(--text-muted, #475569)' }}>
                        <th style={{ padding: '8px' }}>Total ↑</th>
                        <th style={{ padding: '8px' }}>New</th>
                        <th style={{ padding: '8px' }}>Update</th>
                        <th style={{ padding: '8px' }}>Errors</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ backgroundColor: 'var(--bg-surface, #ffffff)' }}>
                        <td className="summary-val-total" style={{ padding: '10px', fontWeight: 600, color: 'var(--text-main, #0f172a)' }}>{validationSummary.total}</td>
                        <td className="summary-val-new" style={{ padding: '10px', color: 'var(--success, #2563eb)', fontWeight: 600 }}>{validationSummary.new}</td>
                        <td className="summary-val-update" style={{ padding: '10px', color: 'var(--primary, #7c3aed)', fontWeight: 600 }}>{validationSummary.update}</td>
                        <td className="summary-val-errors" style={{ padding: '10px', color: 'var(--danger, #dc2626)', fontWeight: 600 }}>{validationSummary.errors}</td>
                      </tr>
                    </tbody>
                  </table>
                  <div className="upload-summary-pagination" style={{ padding: '6px 12px', borderTop: '1px solid var(--border, #f1f5f9)', fontSize: '0.75rem', color: 'var(--text-muted, #64748b)', textAlign: 'right', backgroundColor: 'var(--bg-surface, #ffffff)' }}>
                    1 - 1
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Preview - fix any red rows, then Import Source */}
            <div
              className="upload-preview-card apex-card"
              style={{
                borderRadius: '6px',
                border: '1px solid var(--border, #e2e8f0)',
                backgroundColor: 'var(--bg-surface, #ffffff)',
                overflow: 'hidden',
              }}
            >
              {/* Card Header with Re-Check button */}
              <div
                className="upload-card-header"
                style={{
                  backgroundColor: 'var(--bg-card-header, #071531)',
                  color: '#ffffff',
                  padding: '0.75rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>
                  Preview - fix any red rows, then Import Source
                </span>

                <button
                  type="button"
                  onClick={handleRecheck}
                  disabled={rechecking}
                  className="btn-toolbar-recheck"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    color: '#ffffff',
                    border: '1px solid rgba(255, 255, 255, 0.4)',
                    borderRadius: '4px',
                    padding: '6px 14px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: rechecking ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <IconRefresh size={14} className={rechecking ? 'spin' : ''} /> {rechecking ? 'Re-Checking...' : 'Re-Check'}
                </button>
              </div>

              {/* Interactive Toolbar */}
              <div
                className="upload-preview-toolbar"
                style={{
                  padding: '0.75rem 1rem',
                  backgroundColor: 'var(--bg-muted, #f8fafc)',
                  borderBottom: '1px solid var(--border, #e2e8f0)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                }}
              >
                {/* Search */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <span style={{ position: 'absolute', left: '10px', color: 'var(--text-muted, #94a3b8)' }}>
                      <IconSearch size={14} />
                    </span>
                    <input
                      type="text"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      placeholder="Search: All Text Columns"
                      className="upload-search-input"
                      style={{
                        height: '32px',
                        width: '220px',
                        paddingLeft: '30px',
                        paddingRight: '8px',
                        fontSize: '0.8rem',
                        border: '1px solid var(--border, #cbd5e1)',
                        borderRadius: '4px',
                        outline: 'none',
                        backgroundColor: 'var(--bg-input, #ffffff)',
                        color: 'var(--text-main, #0f172a)',
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPage(1);
                      setSearchQuery(searchInput);
                    }}
                    className="btn-toolbar-action"
                    style={{
                      height: '32px',
                      padding: '0 10px',
                      backgroundColor: 'var(--bg-surface, #ffffff)',
                      border: '1px solid var(--border, #cbd5e1)',
                      borderRadius: '4px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      color: 'var(--text-main, #334155)',
                      cursor: 'pointer',
                    }}
                  >
                    Go
                  </button>
                </div>

                {/* Toolbar Buttons: Actions, Edit, Save, Add Row, Reset */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {/* Actions Dropdown */}
                  <div className="apex-actions-wrapper" style={{ position: 'relative' }}>
                    <button
                      type="button"
                      className="btn-apex-actions btn-toolbar-action"
                      onClick={() => setShowActionsDropdown(!showActionsDropdown)}
                      style={{
                        height: '32px',
                        padding: '0 12px',
                        backgroundColor: 'var(--bg-surface, #ffffff)',
                        border: '1px solid var(--border, #cbd5e1)',
                        borderRadius: '4px',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        color: 'var(--text-main, #334155)',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <span>Actions</span>
                      <IconChevronDown size={13} />
                    </button>

                    <ApexActionsMenu
                      isOpen={showActionsDropdown}
                      onClose={() => setShowActionsDropdown(false)}
                      isEditableGrid={true}
                      hasSelection={selectedRowIndices.size > 0}
                      onSelectAll={handleSelectAll}
                      onDeselectAll={handleDeselectAll}
                      onInvertSelection={handleInvertSelection}
                      onCopyToClipboard={handleCopyToClipboard}
                      onRevertEdits={handleRevertEdits}
                      onDeleteSelected={handleDeleteSelected}
                      onDownload={handleDownloadStagingCsv}
                      onOpenHelp={() => setShowHelpModal(true)}
                      onRefresh={handleRecheck}
                      onChangeRows={(r) => {
                        setRowsPerPage(r === 'all' ? editableRows.length : r);
                        setPage(1);
                      }}
                      currentRows={rowsPerPage}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsEditingGrid(!isEditingGrid)}
                    className="btn-toolbar-action"
                    style={{
                      height: '32px',
                      padding: '0 12px',
                      backgroundColor: isEditingGrid ? 'var(--primary, #2563eb)' : 'var(--bg-surface, #ffffff)',
                      color: isEditingGrid ? '#ffffff' : 'var(--text-main, #334155)',
                      border: '1px solid var(--border, #cbd5e1)',
                      borderRadius: '4px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <IconEdit size={14} /> Edit
                  </button>

                  <button
                    type="button"
                    onClick={handleRecheck}
                    className="btn-primary"
                    style={{
                      height: '32px',
                      padding: '0 14px',
                      backgroundColor: 'var(--primary, #2563eb)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Save
                  </button>

                  <button
                    type="button"
                    onClick={handleAddRow}
                    className="btn-toolbar-action"
                    style={{
                      height: '32px',
                      padding: '0 12px',
                      backgroundColor: 'var(--bg-surface, #ffffff)',
                      border: '1px solid var(--border, #cbd5e1)',
                      borderRadius: '4px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      color: 'var(--text-main, #334155)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <IconPlus size={14} /> Add Row
                  </button>

                  <button
                    type="button"
                    onClick={handleProceedToValidate}
                    className="btn-toolbar-action"
                    style={{
                      height: '32px',
                      padding: '0 10px',
                      backgroundColor: 'var(--bg-surface, #ffffff)',
                      border: '1px solid var(--border, #cbd5e1)',
                      borderRadius: '4px',
                      fontSize: '0.8rem',
                      color: 'var(--text-muted, #64748b)',
                      cursor: 'pointer',
                    }}
                  >
                    Reset
                  </button>
                </div>
              </div>

              {/* Table Grid */}
              <div className="upload-preview-table-wrapper dense-table-wrapper" style={{ overflowX: 'auto', backgroundColor: 'var(--bg-surface, #ffffff)' }}>
                <table className="upload-preview-table dense-table apex-report-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--bg-table-header, #f8fafc)', borderBottom: '2px solid var(--border, #e2e8f0)', color: 'var(--text-muted, #475569)' }}>
                      <th style={{ padding: '8px 10px', width: '36px' }}>#</th>
                      <th style={{ padding: '8px 10px' }}>Row</th>
                      <th style={{ padding: '8px 10px' }}>Status</th>
                      <th style={{ padding: '8px 10px' }}>Contact Name</th>
                      <th style={{ padding: '8px 10px' }}>Company Name</th>
                      <th style={{ padding: '8px 10px' }}>Designation</th>
                      <th style={{ padding: '8px 10px' }}>Pos Type</th>
                      <th style={{ padding: '8px 10px' }}>Country</th>
                      <th style={{ padding: '8px 10px' }}>Company Email</th>
                      <th style={{ padding: '8px 10px' }}>Phone</th>
                      <th style={{ padding: '8px 10px' }}>Mobile</th>
                      <th style={{ padding: '8px 10px' }}>LinkedIn URL</th>
                      <th style={{ padding: '8px 10px' }}>Salesperson</th>
                      <th style={{ padding: '8px 10px' }}>Error Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedRows.map((r, idx) => {
                      const hasErr = !r.isValid || r.row_status === 'ERROR';
                      const globalIdx = startIdx + idx;

                      return (
                        <tr
                          key={globalIdx}
                          className={`upload-table-row ${hasErr ? 'error-row' : ''}`}
                          style={{
                            borderBottom: '1px solid var(--border, #f1f5f9)',
                            borderLeft: hasErr ? '3px solid var(--danger, #dc2626)' : '3px solid transparent',
                          }}
                        >
                          <td style={{ padding: '8px 10px', color: 'var(--text-muted, #64748b)' }}>{globalIdx + 1}</td>
                          <td style={{ padding: '8px 10px', fontWeight: 600, color: 'var(--text-main, #334155)' }}>{r.excel_row_no}</td>
                          <td style={{ padding: '8px 10px' }}>
                            <span
                              className={`status-badge ${hasErr ? 'error' : r.row_status === 'UPDATE' ? 'update' : 'new'}`}
                              style={{
                                display: 'inline-block',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                fontSize: '0.725rem',
                                fontWeight: 700,
                              }}
                            >
                              {hasErr ? 'ERROR' : r.row_status || 'VALID'}
                            </span>
                          </td>

                          {/* Editable or Display Cells */}
                          <td style={{ padding: '6px 8px' }}>
                            {isEditingGrid ? (
                              <input
                                type="text"
                                value={r.contact_name}
                                onChange={(e) => handleCellChange(globalIdx, 'contact_name', e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '4px 6px',
                                  fontSize: '0.8rem',
                                  border: '1px solid var(--border, #cbd5e1)',
                                  borderRadius: '3px',
                                  backgroundColor: 'var(--bg-input, #ffffff)',
                                  color: 'var(--text-main, #0f172a)',
                                }}
                              />
                            ) : (
                              <span style={{ fontWeight: 600, color: 'var(--text-main, #1e293b)' }}>{r.contact_name || '—'}</span>
                            )}
                          </td>

                          <td style={{ padding: '6px 8px' }}>
                            {isEditingGrid ? (
                              <input
                                type="text"
                                value={r.comp_name}
                                onChange={(e) => handleCellChange(globalIdx, 'comp_name', e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '4px 6px',
                                  fontSize: '0.8rem',
                                  border: '1px solid var(--border, #cbd5e1)',
                                  borderRadius: '3px',
                                  backgroundColor: 'var(--bg-input, #ffffff)',
                                  color: 'var(--text-main, #0f172a)',
                                }}
                              />
                            ) : (
                              <span style={{ color: 'var(--text-main, #1e293b)' }}>{r.comp_name || '—'}</span>
                            )}
                          </td>

                          <td style={{ padding: '6px 8px' }}>
                            {isEditingGrid ? (
                              <input
                                type="text"
                                value={r.designation}
                                onChange={(e) => handleCellChange(globalIdx, 'designation', e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '4px 6px',
                                  fontSize: '0.8rem',
                                  border: '1px solid var(--border, #cbd5e1)',
                                  borderRadius: '3px',
                                  backgroundColor: 'var(--bg-input, #ffffff)',
                                  color: 'var(--text-main, #0f172a)',
                                }}
                              />
                            ) : (
                              <span style={{ color: 'var(--text-main, #1e293b)' }}>{r.designation || '—'}</span>
                            )}
                          </td>

                          <td style={{ padding: '6px 8px' }}>
                            {isEditingGrid ? (
                              <input
                                type="text"
                                value={r.pos_type}
                                onChange={(e) => handleCellChange(globalIdx, 'pos_type', e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '4px 6px',
                                  fontSize: '0.8rem',
                                  border: '1px solid var(--border, #cbd5e1)',
                                  borderRadius: '3px',
                                  backgroundColor: 'var(--bg-input, #ffffff)',
                                  color: 'var(--text-main, #0f172a)',
                                }}
                              />
                            ) : (
                              <span style={{ color: 'var(--text-main, #1e293b)' }}>{r.pos_type || '—'}</span>
                            )}
                          </td>

                          <td style={{ padding: '6px 8px' }}>
                            {isEditingGrid ? (
                              <input
                                type="text"
                                value={r.country}
                                onChange={(e) => handleCellChange(globalIdx, 'country', e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '4px 6px',
                                  fontSize: '0.8rem',
                                  border: '1px solid var(--border, #cbd5e1)',
                                  borderRadius: '3px',
                                  backgroundColor: 'var(--bg-input, #ffffff)',
                                  color: 'var(--text-main, #0f172a)',
                                }}
                              />
                            ) : (
                              <span style={{ color: 'var(--text-main, #1e293b)' }}>{r.country || '—'}</span>
                            )}
                          </td>

                          <td style={{ padding: '6px 8px' }}>
                            {isEditingGrid ? (
                              <input
                                type="text"
                                value={r.comp_email}
                                onChange={(e) => handleCellChange(globalIdx, 'comp_email', e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '4px 6px',
                                  fontSize: '0.8rem',
                                  border: '1px solid var(--border, #cbd5e1)',
                                  borderRadius: '3px',
                                  backgroundColor: 'var(--bg-input, #ffffff)',
                                  color: 'var(--text-main, #0f172a)',
                                }}
                              />
                            ) : (
                              <span style={{ color: 'var(--text-main, #1e293b)' }}>{r.comp_email || '—'}</span>
                            )}
                          </td>

                          <td style={{ padding: '6px 8px' }}>
                            {isEditingGrid ? (
                              <input
                                type="text"
                                value={r.contact_phone}
                                onChange={(e) => handleCellChange(globalIdx, 'contact_phone', e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '4px 6px',
                                  fontSize: '0.8rem',
                                  border: '1px solid var(--border, #cbd5e1)',
                                  borderRadius: '3px',
                                  backgroundColor: 'var(--bg-input, #ffffff)',
                                  color: 'var(--text-main, #0f172a)',
                                }}
                              />
                            ) : (
                              <span style={{ color: 'var(--text-main, #1e293b)' }}>{r.contact_phone || '—'}</span>
                            )}
                          </td>

                          <td style={{ padding: '6px 8px' }}>
                            {isEditingGrid ? (
                              <input
                                type="text"
                                value={r.contact_mobile}
                                onChange={(e) => handleCellChange(globalIdx, 'contact_mobile', e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '4px 6px',
                                  fontSize: '0.8rem',
                                  border: '1px solid var(--border, #cbd5e1)',
                                  borderRadius: '3px',
                                  backgroundColor: 'var(--bg-input, #ffffff)',
                                  color: 'var(--text-main, #0f172a)',
                                }}
                              />
                            ) : (
                              <span style={{ color: 'var(--text-main, #1e293b)' }}>{r.contact_mobile || '—'}</span>
                            )}
                          </td>

                          <td style={{ padding: '6px 8px', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {isEditingGrid ? (
                              <input
                                type="text"
                                value={r.linkedin_url}
                                onChange={(e) => handleCellChange(globalIdx, 'linkedin_url', e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '4px 6px',
                                  fontSize: '0.8rem',
                                  border: '1px solid var(--border, #cbd5e1)',
                                  borderRadius: '3px',
                                  backgroundColor: 'var(--bg-input, #ffffff)',
                                  color: 'var(--text-main, #0f172a)',
                                }}
                              />
                            ) : (
                              <span style={{ color: 'var(--text-main, #1e293b)' }}>{r.linkedin_url || '—'}</span>
                            )}
                          </td>

                          <td style={{ padding: '6px 8px' }}>
                            {isEditingGrid ? (
                              <input
                                type="text"
                                value={r.salesperson}
                                onChange={(e) => handleCellChange(globalIdx, 'salesperson', e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '4px 6px',
                                  fontSize: '0.8rem',
                                  border: '1px solid var(--border, #cbd5e1)',
                                  borderRadius: '3px',
                                  backgroundColor: 'var(--bg-input, #ffffff)',
                                  color: 'var(--text-main, #0f172a)',
                                }}
                              />
                            ) : (
                              <span style={{ color: 'var(--text-main, #1e293b)' }}>{r.salesperson || '—'}</span>
                            )}
                          </td>

                          {/* Error Message Column */}
                          <td style={{ padding: '6px 8px', minWidth: '180px' }}>
                            {hasErr ? (
                              <span
                                className="report-error-cell-text"
                                style={{
                                  color: 'var(--danger, #f87171)',
                                  fontSize: '0.8rem',
                                  fontWeight: 500,
                                  lineHeight: 1.35,
                                }}
                              >
                                {r.error_msg}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--success, #34d399)', fontSize: '0.8rem', fontWeight: 500 }}>✓ OK</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination Bar */}
              <div
                className="upload-preview-footer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 1rem',
                  backgroundColor: 'var(--bg-surface, #ffffff)',
                  borderTop: '1px solid var(--border, #f1f5f9)',
                  fontSize: '0.8rem',
                  color: 'var(--text-muted, #64748b)',
                }}
              >
                <span>
                  Showing {totalFiltered > 0 ? startIdx + 1 : 0} - {endIdx} of {totalFiltered}
                </span>

                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="btn-toolbar-action"
                    style={{
                      height: '28px',
                      width: '28px',
                      backgroundColor: page <= 1 ? 'var(--bg-muted, #f8fafc)' : 'var(--bg-surface, #ffffff)',
                      border: '1px solid var(--border, #cbd5e1)',
                      borderRadius: '4px',
                      color: page <= 1 ? 'var(--text-disabled, #cbd5e1)' : 'var(--text-main, #334155)',
                      cursor: page <= 1 ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <IconChevronLeft size={13} />
                  </button>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="btn-toolbar-action"
                    style={{
                      height: '28px',
                      width: '28px',
                      backgroundColor: page >= totalPages ? 'var(--bg-muted, #f8fafc)' : 'var(--bg-surface, #ffffff)',
                      border: '1px solid var(--border, #cbd5e1)',
                      borderRadius: '4px',
                      color: page >= totalPages ? 'var(--text-disabled, #cbd5e1)' : 'var(--text-main, #334155)',
                      cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <IconChevronRight size={13} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* STEP 3: IMPORT EXECUTION & RESULTS                      */}
        {/* ======================================================== */}
        {currentStep === 3 && (
          <div style={{ maxWidth: '640px', margin: '0 auto', padding: '1rem 0' }}>
            {!importCompleted ? (
              <div
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '1.5rem',
                  backgroundColor: '#ffffff',
                }}
              >
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e293b', marginBottom: '1rem' }}>
                  Confirm Contact Import
                </h3>

                <div
                  style={{
                    backgroundColor: '#f8fafc',
                    borderRadius: '6px',
                    padding: '1rem',
                    marginBottom: '1.25rem',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '1rem',
                    textAlign: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Total Rows</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>
                      {validationSummary.total}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Valid to Import</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#10b981' }}>
                      {validationSummary.new + validationSummary.update}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Error Rows</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#dc2626' }}>
                      {validationSummary.errors}
                    </div>
                  </div>
                </div>

                {/* Import Policy */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>
                    Import Error Policy:
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.825rem', color: '#334155' }}>
                      <input
                        type="radio"
                        name="contact_import_policy"
                        value="skip"
                        checked={importPolicy === 'skip'}
                        onChange={() => setImportPolicy('skip')}
                      />
                      <span>
                        <strong>Skip invalid rows:</strong> Import valid rows and record errors into Contact Incorrect Data.
                      </span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.825rem', color: '#334155' }}>
                      <input
                        type="radio"
                        name="contact_import_policy"
                        value="all_or_nothing"
                        checked={importPolicy === 'all_or_nothing'}
                        onChange={() => setImportPolicy('all_or_nothing')}
                      />
                      <span>
                        <strong>All-or-nothing:</strong> Reject entire import if any error row is present.
                      </span>
                    </label>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    style={{
                      height: '38px',
                      padding: '0 16px',
                      backgroundColor: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '4px',
                      fontSize: '0.825rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Back to Preview
                  </button>

                  <button
                    type="button"
                    onClick={handleExecuteImport}
                    disabled={importing}
                    style={{
                      height: '38px',
                      flex: 1,
                      backgroundColor: importing ? '#94a3b8' : '#071531',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: importing ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                    }}
                  >
                    {importing ? 'Importing into Database...' : 'Execute Import into Database'}
                  </button>
                </div>
              </div>
            ) : (
              /* Import Complete Card */
              <div
                style={{
                  border: '1px solid #86efac',
                  borderRadius: '8px',
                  padding: '2rem',
                  backgroundColor: '#f0fdf4',
                  textAlign: 'center',
                }}
              >
                <IconCheckCircle size={48} style={{ color: '#16a34a', margin: '0 auto 1rem' }} />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#166534', marginBottom: '0.5rem' }}>
                  Import Completed Successfully
                </h3>
                <p style={{ fontSize: '0.875rem', color: '#15803d', marginBottom: '1.5rem' }}>
                  {importResult?.message || 'Contact batch imported into CRM database.'}
                </p>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '1rem',
                    flexWrap: 'wrap',
                  }}
                >
                  <button
                    type="button"
                    onClick={onNavigateToContacts}
                    style={{
                      height: '38px',
                      padding: '0 18px',
                      backgroundColor: '#071531',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    View Contacts Report
                  </button>

                  {validationSummary.errors > 0 && onNavigateToIncorrectData && (
                    <button
                      type="button"
                      onClick={onNavigateToIncorrectData}
                      style={{
                        height: '38px',
                        padding: '0 16px',
                        backgroundColor: '#fee2e2',
                        color: '#991b1b',
                        border: '1px solid #fca5a5',
                        borderRadius: '4px',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      View Contact Incorrect Data ({validationSummary.errors})
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleResetUpload}
                    style={{
                      height: '38px',
                      padding: '0 16px',
                      backgroundColor: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '4px',
                      fontSize: '0.85rem',
                      color: '#475569',
                      cursor: 'pointer',
                    }}
                  >
                    Upload Another Batch
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Validation Rules Modal */}
      <ValidationRulesModal
        isOpen={showValidationRules}
        onClose={() => setShowValidationRules(false)}
        type="contact"
      />

      {/* Standard Actions Help Modal */}
      <ApexHelpModal
        isOpen={showHelpModal}
        onClose={() => setShowHelpModal(false)}
        isEditableGrid={true}
      />
    </div>
  );
}

