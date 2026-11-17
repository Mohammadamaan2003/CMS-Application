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
  IconClose,
  IconFilter,
  IconRefresh,
  IconEdit,
  IconPlus,
  IconSearch,
  IconTrash,
  IconMenu,
} from '../../components/Icons';

export default function CompanyUploadPage({ onShowToast, onNavigateToCompanies, onNavigateToInvalidData }) {
  // Wizard Step: 1 = Upload Company, 2 = Validate & Preview, 3 = Import
  const [currentStep, setCurrentStep] = useState(1);

  // Step 1 State
  const [uploadMode, setUploadMode] = useState('insert'); // 'insert', 'update', 'merge'
  const [showValidationRules, setShowValidationRules] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileError, setFileError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Parsed Raw Rows from File
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
  const [selectedRowIds, setSelectedRowIds] = useState(new Set());
  const [isEditingGrid, setIsEditingGrid] = useState(false);
  const [showActionsDropdown, setShowActionsDropdown] = useState(false);
  const [showErrorActionsDropdown, setShowErrorActionsDropdown] = useState(false);

  // Search in Preview Card
  const [previewSearchInput, setPreviewSearchInput] = useState('');
  const [previewSearchQuery, setPreviewSearchQuery] = useState('');

  // Search in Error Card
  const [errorSearchInput, setErrorSearchInput] = useState('');
  const [errorSearchQuery, setErrorSearchQuery] = useState('');

  // Pagination in Preview Card
  const [previewPage, setPreviewPage] = useState(1);
  const [previewRowsPerPage, setPreviewRowsPerPage] = useState(50);

  // Pagination in Error Card
  const [errorPage, setErrorPage] = useState(1);
  const [errorRowsPerPage, setErrorRowsPerPage] = useState(50);

  // Step 3 State (Import Execution)
  const [importing, setImporting] = useState(false);
  const [importCompleted, setImportCompleted] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importPolicy, setImportPolicy] = useState('skip'); // 'skip' (skip invalid) or 'all_or_nothing'

  // Master meta lookup from backend
  const [uploadMeta, setUploadMeta] = useState(null);

  useEffect(() => {
    api.getCompanyUploadMeta()
      .then((res) => {
        if (res && res.success) {
          setUploadMeta(res.data);
        }
      })
      .catch((err) => console.error('Error fetching upload meta:', err));
  }, []);

  // Handle Download Sample Template based on selected uploadMode ('insert' vs 'update')
  const handleDownloadTemplate = () => {
    const mode = uploadMode === 'update' ? 'update' : 'insert';
    const link = document.createElement('a');
    link.href = `/api/companies/upload/template?mode=${mode}`;
    link.download = mode === 'update' ? 'Company_Upload_Template_Update.csv' : 'Company_Upload_Template_Insert.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (onShowToast) {
      onShowToast('success', `Downloaded ${mode === 'update' ? 'Update' : 'Insert'} Company Upload Template.`);
    }
  };

  // Handle File Selection & Parse
  const handleFileProcess = (file) => {
    setFileError(null);
    if (!file) return;

    // Check file size (max 10MB)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setFileError('File size exceeds the 10 MB limit. Please upload a smaller file.');
      setSelectedFile(null);
      setRawRows([]);
      return;
    }

    // Check extension (.csv, .xlsx, .xls)
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['csv', 'xlsx', 'xls'].includes(ext)) {
      setFileError('Unsupported file type. Please upload a CSV (.csv) or Excel spreadsheet (.xlsx, .xls).');
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

        // Parse sheet to array of objects
        const parsed = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: false });

        if (!parsed || parsed.length === 0) {
          setFileError('The selected file is empty. Please upload a file containing company data.');
          setRawRows([]);
          return;
        }

        // Get header keys
        const headers = Object.keys(parsed[0] || {});
        setDetectedHeaders(headers);

        // Check if file contains at least one company identifier
        const hasIdentifierColumn = headers.some((h) => {
          const clean = h.toLowerCase().replace(/[^a-z0-9]/g, '');
          return (
            clean === 'companyname' ||
            clean === 'compname' ||
            clean === 'company' ||
            clean === 'name' ||
            clean === 'organization' ||
            clean === 'orgname' ||
            clean === 'companyid' ||
            clean === 'compid' ||
            clean === 'id'
          );
        });

        if (!hasIdentifierColumn) {
          setFileError('Required header missing: Could not find "Company Name" or "Company ID" column in your file.');
          setRawRows([]);
          return;
        }

        // Filter out template reference sub-header and reference list if present
        const rowsWithRowNumbers = [];
        for (let i = 0; i < parsed.length; i++) {
          const r = parsed[i];
          const cName = String(
            r['Company Name'] || r['company_name'] || r['comp_name'] || r['Company'] || r['company'] || r['Name'] || r['name'] || r['Organization'] || ''
          ).trim();
          const cId = String(
            r['Company ID'] || r['Comp Id'] || r['comp_id'] || r['id'] || ''
          ).trim();
          const lowerName = cName.toLowerCase();
          const lowerId = cId.toLowerCase();
          if (
            lowerName === 'company_categories' ||
            lowerName === 'company categories' ||
            lowerName === 'company_type' ||
            lowerName === 'company type' ||
            lowerName === '--- reference data ---' ||
            lowerId === 'company_categories' ||
            lowerId === 'company_type'
          ) {
            break; // Stop parsing: reached reference section
          }
          if (cName !== '' || cId !== '') {
            rowsWithRowNumbers.push({
              ...r,
              __sourceRowNumber: i + 2,
            });
          }
        }

        setRawRows(rowsWithRowNumbers);
      } catch (err) {
        console.error('File parsing error:', err);
        setFileError(`Failed to read and parse the file: ${err.message}`);
        setRawRows([]);
      }
    };

    reader.onerror = () => {
      setFileError('Error reading the selected file. Please make sure the file is not locked or corrupted.');
      setRawRows([]);
    };

    reader.readAsArrayBuffer(file);
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileProcess(e.target.files[0]);
    }
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  // Helper to map backend validation results into editable row objects
  const mapResultsToEditableRows = (results) => {
    return (results || []).map((r, idx) => {
      const c = r.normalized || {};
      return {
        ...r,
        stg_id: r.stg_id || (402800 + idx),
        batch_id: r.batch_id || 1118,
        excel_row_no: r.sourceRowNumber || idx + 2,
        comp_id: c.comp_id || c.id || '',
        comp_name: c.comp_name || c.name || '',
        technology: c.technology || '',
        industry: c.industry || '',
        company_type: c.company_type || '',
        company_categories: c.company_categories || '',
        city: c.city || '',
        country: c.country || '',
        companyphone: c.companyphone || c.phone || '',
        website: c.website || '',
        registration_status: c.registration_status || 'Active',
        employee_size: c.employee_size || '',
        com_email: c.com_email || c.email || '',
        da: c.da || '',
        remark: c.remark || c.remarks || '',
        salesperson: c.salesperson || '',
        source: c.source || '',
        supplier_number: c.supplier_number || '',
        joget_id: c.joget_id || '',
      };
    });
  };

  // STEP 1 -> STEP 2: Trigger Backend Validation
  const handleProceedToValidate = async () => {
    if (!uploadMode) {
      if (onShowToast) onShowToast('warning', 'Please select an Upload Mode before proceeding.');
      return;
    }
    if (!selectedFile || rawRows.length === 0) {
      if (onShowToast) onShowToast('warning', 'Please select a valid CSV or Excel file first.');
      return;
    }

    try {
      setValidating(true);
      const res = await api.validateCompanyUpload({
        rows: rawRows,
        mode: uploadMode,
      });

      if (res && res.success) {
        setValidationResults(res.results || []);
        const staged = mapResultsToEditableRows(res.results || []);
        setEditableRows(staged);
        setValidationSummary(
          res.summary || { total: staged.length, new: 0, update: 0, errors: 0, valid: 0, invalid: 0 }
        );
        setSelectedRowIds(new Set());
        setPreviewPage(1);
        setErrorPage(1);
        setCurrentStep(2);

        if (onShowToast) {
          onShowToast(
            'success',
            `Validated ${res.summary.total} rows: ${res.summary.new} new, ${res.summary.update} updates, ${res.summary.errors} errors.`
          );
        }
      } else {
        if (onShowToast) onShowToast('error', res.message || 'Validation failed.');
      }
    } catch (err) {
      if (onShowToast) onShowToast('error', `Validation error: ${err.message}`);
    } finally {
      setValidating(false);
    }
  };

  // STEP 2: Handle Inline Cell Edit
  const handleCellChange = (rowIndex, field, value) => {
    setEditableRows((prev) => {
      const updated = [...prev];
      const target = { ...updated[rowIndex] };
      target[field] = value;
      if (target.normalized) {
        target.normalized = { ...target.normalized, [field]: value };
        if (field === 'comp_name') target.normalized.name = value;
        if (field === 'com_email') target.normalized.email = value;
        if (field === 'companyphone') target.normalized.phone = value;
        if (field === 'remark') target.normalized.remarks = value;
      }
      updated[rowIndex] = target;
      return updated;
    });
  };

  // STEP 2: Re-Check Current Grid Rows
  const handleRecheck = async () => {
    try {
      setRechecking(true);
      const res = await api.validateCompanyUpload({
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
      } else {
        if (onShowToast) onShowToast('error', res.message || 'Re-check failed.');
      }
    } catch (err) {
      if (onShowToast) onShowToast('error', `Re-check error: ${err.message}`);
    } finally {
      setRechecking(false);
    }
  };

  // STEP 2: Save inline edits (triggers Re-Check)
  const handleSaveEdits = () => {
    handleRecheck();
  };

  // Re-check alias for ApexActionsMenu and revert handlers
  const handleRecheckValidation = handleRecheck;

  // STEP 2: Add blank row to preview grid
  const handleAddRow = () => {
    const newRowNo = editableRows.length > 0 ? Math.max(...editableRows.map((r) => r.excel_row_no || 0)) + 1 : 2;
    const newStgId = 402800 + editableRows.length + 1;
    const newRow = {
      sourceRowNumber: newRowNo,
      excel_row_no: newRowNo,
      stg_id: newStgId,
      batch_id: 1118,
      row_status: 'NEW',
      error_msg: 'Company Name is required',
      isValid: false,
      errors: [{ field: 'Company Name', message: 'Company Name is required' }],
      warnings: [],
      comp_id: '',
      comp_name: '',
      technology: '',
      industry: '',
      company_type: 'Direct Client',
      company_categories: '',
      city: '',
      country: '',
      companyphone: '',
      website: '',
      registration_status: 'Active',
      employee_size: '',
      com_email: '',
      da: '',
      remark: '',
      salesperson: '',
      source: '',
      supplier_number: '',
      joget_id: '',
      normalized: {
        comp_name: '',
        company_type: 'Direct Client',
        registration_status: 'Active',
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
    if (onShowToast) onShowToast('info', 'Added new blank row. Fill in the values and click Re-Check.');
  };

  // STEP 2: Reset to original parsed rows
  const handleResetPreview = () => {
    if (rawRows.length > 0) {
      handleProceedToValidate();
    }
  };

  // STEP 2: Row Selection
  const handleToggleSelectRow = (stgId) => {
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(stgId)) next.delete(stgId);
      else next.add(stgId);
      return next;
    });
  };

  const handleSelectAllRows = () => {
    if (selectedRowIds.size === editableRows.length) {
      setSelectedRowIds(new Set());
    } else {
      setSelectedRowIds(new Set(editableRows.map((r) => r.stg_id)));
    }
  };

  // STEP 2: Delete selected rows
  const handleDeleteSelected = () => {
    if (selectedRowIds.size === 0) return;
    const remaining = editableRows.filter((r) => !selectedRowIds.has(r.stg_id));
    setEditableRows(remaining);
    setSelectedRowIds(new Set());
    if (onShowToast) onShowToast('info', 'Deleted selected row(s). Re-checking remaining rows...');

    api.validateCompanyUpload({ rows: remaining, mode: uploadMode }).then((res) => {
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

  const handleDeselectAll = () => {
    setSelectedRowIds(new Set());
  };

  const handleInvertSelection = () => {
    const next = new Set();
    editableRows.forEach((r) => {
      if (!selectedRowIds.has(r.stg_id)) next.add(r.stg_id);
    });
    setSelectedRowIds(next);
  };

  const handleCopyToClipboard = () => {
    const rowsToCopy = selectedRowIds.size > 0
      ? editableRows.filter((r) => selectedRowIds.has(r.stg_id))
      : editableRows;
    if (rowsToCopy.length === 0) return;
    const headers = ['Company Name', 'Website', 'Country', 'State', 'City', 'Industry'];
    const lines = [headers.join('\t')];
    rowsToCopy.forEach((r) => {
      lines.push([r.comp_name || '', r.website || '', r.country || '', r.state || '', r.city || '', r.industry || ''].join('\t'));
    });
    navigator.clipboard.writeText(lines.join('\n'));
    if (onShowToast) onShowToast('success', `Copied ${rowsToCopy.length} rows to clipboard (TSV).`);
  };

  const handleRevertEdits = () => {
    if (window.confirm('Revert all unsaved staging edits back to original file validation?')) {
      handleRecheckValidation();
      if (onShowToast) onShowToast('info', 'Reverted staging rows.');
    }
  };

  const handleDownloadStagingCsv = () => {
    if (editableRows.length === 0) return;
    const headers = ['Stg Id', 'Company Name', 'Website', 'Country', 'State', 'City', 'Industry', 'Status'];
    const lines = [headers.join(',')];
    editableRows.forEach((r) => {
      lines.push([
        `"${r.stg_id || ''}"`,
        `"${r.comp_name || ''}"`,
        `"${r.website || ''}"`,
        `"${r.country || ''}"`,
        `"${r.state || ''}"`,
        `"${r.city || ''}"`,
        `"${r.industry || ''}"`,
        `"${r.row_status || ''}"`
      ].join(','));
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `company_staging_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    if (onShowToast) onShowToast('success', `Exported ${editableRows.length} staging rows to CSV.`);
  };

  // STEP 2: Download Error Rows CSV (matching Screenshot 3)
  const handleDownloadErrorRows = () => {
    const errorRows = editableRows.filter((r) => r.row_status === 'ERROR' || !r.isValid);
    if (errorRows.length === 0) {
      if (onShowToast) onShowToast('info', 'No error rows found. All rows are valid!');
      return;
    }

    const headers = [
      'Stg Id',
      'Batch Id',
      'Excel Row No',
      'Src Id',
      'Comp Id',
      'Comp Name',
      'Error Msg',
      'Technology',
      'Industry',
      'Company Type',
      'Country',
      'City',
      'Website',
      'Company Email',
      'Registration Status',
      'Employee Size',
      'Company Phone',
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
          r.stg_id,
          r.batch_id,
          r.excel_row_no,
          r.comp_id || '',
          r.comp_id || '',
          r.comp_name || '',
          r.error_msg || '',
          r.technology || '',
          r.industry || '',
          r.company_type || '',
          r.country || '',
          r.city || '',
          r.website || '',
          r.com_email || '',
          r.registration_status || '',
          r.employee_size || '',
          r.companyphone || '',
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
    link.download = `Company_Upload_Errors_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    if (onShowToast) onShowToast('success', `Exported ${errorRows.length} error row(s).`);
  };

  // STEP 2 -> STEP 3: Import Valid Rows
  const handleProceedToImport = () => {
    const validCount = validationSummary.new + validationSummary.update;
    if (validCount === 0) {
      if (onShowToast) {
        onShowToast(
          'error',
          'There are 0 valid rows to import. Please resolve the errors in the red rows or re-check.'
        );
      }
      return;
    }
    setCurrentStep(3);
  };

  // STEP 3: Execute Database Import
  const handleExecuteImport = async () => {
    try {
      setImporting(true);
      const res = await api.importCompanyUpload({
        rows: editableRows,
        mode: uploadMode,
        policy: importPolicy,
      });

      if (res && res.success) {
        setImportCompleted(true);
        setImportResult(res);
        if (onShowToast) {
          onShowToast('success', res.message || 'Companies imported successfully.');
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

  // Reset wizard
  const handleResetUpload = () => {
    setCurrentStep(1);
    setSelectedFile(null);
    setRawRows([]);
    setValidationResults([]);
    setEditableRows([]);
    setValidationSummary({ total: 0, new: 0, update: 0, errors: 0, valid: 0, invalid: 0, warnings: 0 });
    setSelectedRowIds(new Set());
    setImportCompleted(false);
    setImportResult(null);
    setFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Filter preview rows by search query
  const filteredPreviewRows = editableRows.filter((r) => {
    if (!previewSearchQuery.trim()) return true;
    const q = previewSearchQuery.toLowerCase();
    return (
      String(r.excel_row_no || '').includes(q) ||
      String(r.comp_id || '').toLowerCase().includes(q) ||
      String(r.comp_name || '').toLowerCase().includes(q) ||
      String(r.error_msg || '').toLowerCase().includes(q) ||
      String(r.country || '').toLowerCase().includes(q) ||
      String(r.city || '').toLowerCase().includes(q) ||
      String(r.industry || '').toLowerCase().includes(q) ||
      String(r.company_type || '').toLowerCase().includes(q) ||
      String(r.technology || '').toLowerCase().includes(q) ||
      String(r.website || '').toLowerCase().includes(q) ||
      String(r.com_email || '').toLowerCase().includes(q)
    );
  });

  // Filter error rows for Card 3
  const errorRowsList = editableRows
    .filter((r) => r.row_status === 'ERROR' || !r.isValid)
    .filter((r) => {
      if (!errorSearchQuery.trim()) return true;
      const q = errorSearchQuery.toLowerCase();
      return (
        String(r.stg_id || '').includes(q) ||
        String(r.excel_row_no || '').includes(q) ||
        String(r.comp_id || '').toLowerCase().includes(q) ||
        String(r.comp_name || '').toLowerCase().includes(q) ||
        String(r.error_msg || '').toLowerCase().includes(q) ||
        String(r.country || '').toLowerCase().includes(q) ||
        String(r.city || '').toLowerCase().includes(q) ||
        String(r.website || '').toLowerCase().includes(q)
      );
    });

  // Paginated Preview Rows
  const previewTotal = filteredPreviewRows.length;
  const previewStart = (previewPage - 1) * previewRowsPerPage;
  const previewEnd = Math.min(previewStart + previewRowsPerPage, previewTotal);
  const pagedPreviewRows = filteredPreviewRows.slice(previewStart, previewEnd);

  // Paginated Error Rows
  const errorTotal = errorRowsList.length;
  const errorStart = (errorPage - 1) * errorRowsPerPage;
  const errorEnd = Math.min(errorStart + errorRowsPerPage, errorTotal);
  const pagedErrorRows = errorRowsList.slice(errorStart, errorEnd);

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
        {/* ======================================================== */}
        {/* TOP ACTION BAR & 3-STEP WIZARD (Matching Screenshot 1)     */}
        {/* ======================================================== */}
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
            {currentStep === 2 && (
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                title="Back to Step 1"
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
              onClick={onNavigateToCompanies}
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

          {/* Center: 3-Step Wizard Progress Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            {/* Step 1: Upload Company */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: currentStep === 1 ? 'var(--primary-blue, #2563eb)' : '#16a34a',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  boxShadow: currentStep === 1 ? '0 0 10px rgba(56, 189, 248, 0.4)' : 'none',
                }}
              >
                {currentStep > 1 ? '✓' : '1'}
              </div>
              <span
                style={{
                  fontSize: '0.825rem',
                  fontWeight: currentStep === 1 ? 700 : 600,
                  color: currentStep === 1 ? 'var(--text-main, #f8fafc)' : 'var(--text-muted, #94a3b8)',
                }}
              >
                Upload Company
              </span>
            </div>

            {/* Connecting line 1-2 */}
            <div
              style={{
                width: '60px',
                height: '2px',
                backgroundColor: currentStep >= 2 ? '#16a34a' : 'var(--border, #334155)',
                marginTop: '-18px',
              }}
            />

            {/* Step 2: Validate & Preview */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: currentStep === 2 ? 'var(--primary-blue, #2563eb)' : currentStep > 2 ? '#16a34a' : 'var(--bg-muted, #15223c)',
                  color: currentStep >= 2 ? '#ffffff' : 'var(--text-muted, #94a3b8)',
                  border: currentStep < 2 ? '1px solid var(--border, #334155)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  boxShadow: currentStep === 2 ? '0 0 10px rgba(56, 189, 248, 0.4)' : 'none',
                }}
              >
                {currentStep > 2 ? '✓' : '2'}
              </div>
              <span
                style={{
                  fontSize: '0.825rem',
                  fontWeight: currentStep === 2 ? 700 : 500,
                  color: currentStep === 2 ? 'var(--text-main, #f8fafc)' : 'var(--text-muted, #94a3b8)',
                }}
              >
                Validate & Preview
              </span>
            </div>

            {/* Connecting line 2-3 */}
            <div
              style={{
                width: '60px',
                height: '2px',
                backgroundColor: currentStep >= 3 ? '#16a34a' : 'var(--border, #334155)',
                marginTop: '-18px',
              }}
            />

            {/* Step 3: Import */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: currentStep === 3 ? (importCompleted ? '#16a34a' : 'var(--primary-blue, #2563eb)') : 'var(--bg-muted, #15223c)',
                  color: currentStep === 3 ? '#ffffff' : 'var(--text-muted, #94a3b8)',
                  border: currentStep < 3 ? '1px solid var(--border, #334155)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  boxShadow: currentStep === 3 ? '0 0 10px rgba(56, 189, 248, 0.4)' : 'none',
                }}
              >
                {importCompleted ? '✓' : '3'}
              </div>
              <span
                style={{
                  fontSize: '0.825rem',
                  fontWeight: currentStep === 3 ? 700 : 500,
                  color: currentStep === 3 ? 'var(--text-main, #f8fafc)' : 'var(--text-muted, #94a3b8)',
                }}
              >
                Import
              </span>
            </div>
          </div>

          {/* Right Action Button matching Screenshot 1: 'Import Valid Rows >' */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {currentStep === 1 && (
              <button
                type="button"
                onClick={handleProceedToValidate}
                disabled={!selectedFile || !uploadMode || rawRows.length === 0 || validating}
                className="btn-primary"
                style={{
                  height: '36px',
                  padding: '0 1.5rem',
                  borderRadius: '6px',
                  fontSize: '0.825rem',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>{validating ? 'Validating...' : 'Next'}</span>
                <IconChevronRight size={14} />
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
                  padding: '0 1.5rem',
                  borderRadius: '6px',
                  fontSize: '0.825rem',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>Import Valid Rows</span>
                <IconChevronRight size={14} />
              </button>
            )}

            {currentStep === 3 && !importCompleted && (
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                disabled={importing}
                className="btn-secondary"
                style={{
                  height: '36px',
                  padding: '0 1.25rem',
                  borderRadius: '4px',
                  fontSize: '0.825rem',
                  fontWeight: 600,
                  cursor: importing ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <IconChevronLeft size={14} /> Back
              </button>
            )}
          </div>
        </div>

        {/* ======================================================== */}
        {/* STEP 1: UPLOAD COMPANY                                   */}
        {/* ======================================================== */}
        {currentStep === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Upload Mode Section */}
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-main, #f8fafc)', minWidth: '120px' }}>
                Upload Mode
              </label>

              <select
                value={uploadMode}
                onChange={(e) => setUploadMode(e.target.value)}
                style={{
                  height: '38px',
                  minWidth: '260px',
                  borderRadius: '4px',
                  border: '1px solid var(--border, #38bdf8)',
                  padding: '0 0.75rem',
                  fontSize: '0.85rem',
                  backgroundColor: 'var(--bg-input, #0b1325)',
                  fontWeight: 500,
                  color: 'var(--text-main, #f8fafc)',
                  cursor: 'pointer',
                }}
              >
                <option value="">-- Select Mode --</option>
                <option value="insert">Insert</option>
                <option value="update">Update</option>
              </select>

              <button
                type="button"
                onClick={() => setShowValidationRules(true)}
                className="btn-outline"
                style={{
                  height: '38px',
                  padding: '0 1.15rem',
                  borderRadius: '4px',
                  fontSize: '0.825rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span style={{ fontSize: '0.9rem', color: '#38bdf8' }}>ⓘ</span>
                <span>Validation Rules</span>
              </button>
            </div>

            {/* Mode Explanation Notice */}
            <div
              style={{
                backgroundColor: 'var(--bg-muted, #15223c)',
                border: '1px solid var(--border, #334155)',
                borderRadius: '6px',
                padding: '0.75rem 1rem',
                fontSize: '0.8rem',
                color: 'var(--text-muted, #cbd5e1)',
              }}
            >
              {uploadMode === 'insert' && (
                <div>
                  <strong style={{ color: 'var(--text-main, #ffffff)' }}>Mode: Insert New Records Only</strong> — Adds new company rows into the database. Records that match an existing company name, website, or email will be flagged as duplicate errors.
                </div>
              )}
              {uploadMode === 'update' && (
                <div>
                  <strong style={{ color: 'var(--text-main, #ffffff)' }}>Mode: Update Existing Records</strong> — Matches records by Company ID or existing name and updates master attributes. Rows not found in the database will be flagged as errors.
                </div>
              )}
              {uploadMode === 'merge' && (
                <div>
                  <strong style={{ color: 'var(--text-main, #ffffff)' }}>Mode: Insert and Update (Merge)</strong> — If a company already exists in the database, it will be updated; otherwise, a new company record will be inserted.
                </div>
              )}
              {!uploadMode && <div>Please select an upload mode above to specify how incoming records should be handled.</div>}
            </div>

            {/* Excel / CSV file Dropzone Section */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-main, #f8fafc)', marginBottom: '0.5rem' }}>
                Excel / CSV file
              </label>

              <div
                style={{
                  border: isDragging ? '2px dashed #38bdf8' : '1px dashed var(--border, #334155)',
                  backgroundColor: isDragging ? 'var(--primary-light, rgba(56, 189, 248, 0.12))' : 'var(--bg-surface, #101a2f)',
                  borderRadius: '6px',
                  padding: '2rem 1.5rem',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileInputChange}
                  accept=".csv, .xlsx, .xls, text/csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                  style={{ display: 'none' }}
                />

                {selectedFile ? (
                  <div>
                    <div style={{ color: '#16a34a', display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
                      <IconCheckCircle size={32} />
                    </div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main, #f8fafc)' }}>
                      {selectedFile.name}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted, #94a3b8)', marginTop: '4px' }}>
                      {(selectedFile.size / 1024).toFixed(1)} KB &bull; {rawRows.length} rows staged &bull; Encoding: UTF-8
                    </div>
                    <div style={{ color: '#38bdf8', fontSize: '0.8rem', fontWeight: 600, marginTop: '8px' }}>
                      Click or drag to replace this file
                    </div>
                  </div>
                ) : (
                  <div>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '0.45rem 1.25rem',
                        backgroundColor: 'var(--bg-muted, #15223c)',
                        border: '1px solid var(--border, #38bdf8)',
                        borderRadius: '4px',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        color: 'var(--text-main, #f8fafc)',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                      }}
                    >
                      Choose File
                    </span>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted, #94a3b8)', marginTop: '0.75rem' }}>
                      Drag and drop your spreadsheet here or click to browse. Supports <strong>CSV (.csv)</strong> and <strong>Excel (.xlsx, .xls)</strong> up to 10 MB.
                    </div>
                  </div>
                )}
              </div>

              {/* File Format Error Display */}
              {fileError && (
                <div
                  style={{
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '6px',
                    padding: '0.75rem 1rem',
                    color: '#b91c1c',
                    fontSize: '0.825rem',
                    marginTop: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <IconAlertTriangle size={18} />
                  <span>{fileError}</span>
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
                  padding: '0 1.5rem',
                  backgroundColor: '#071531',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.825rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span>Download Template</span>
                <IconDownload size={15} />
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* STEP 2: VALIDATE & PREVIEW (Matching APEX CRM Screens)    */}
        {/* ======================================================== */}
        {currentStep === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* -------------------------------------------------------- */}
            {/* CARD 1: SUMMARY (Matching Screenshot 1)                  */}
            {/* -------------------------------------------------------- */}
            <div
              className="upload-summary-card apex-card"
              style={{
                backgroundColor: 'var(--bg-surface, #ffffff)',
                border: '1px solid var(--border, #cbd5e1)',
                borderRadius: '6px',
                overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}
            >
              <div
                className="upload-card-header"
                style={{
                  backgroundColor: 'var(--bg-card-header, #071531)',
                  color: '#ffffff',
                  padding: '0.65rem 1.25rem',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  letterSpacing: '0.01em',
                }}
              >
                Summary
              </div>

              <div className="upload-summary-content" style={{ padding: '1rem', backgroundColor: 'var(--bg-surface, #ffffff)' }}>
                <div className="upload-summary-box" style={{ maxWidth: '450px', border: '1px solid var(--border, #e2e8f0)', borderRadius: '4px', overflow: 'hidden' }}>
                  <table className="upload-summary-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'var(--bg-table-header, #f8fafc)', borderBottom: '1px solid var(--border, #e2e8f0)' }}>
                        <th style={{ padding: '0.65rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted, #334155)' }}>
                          Total ↑
                        </th>
                        <th style={{ padding: '0.65rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted, #334155)' }}>
                          New
                        </th>
                        <th style={{ padding: '0.65rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted, #334155)' }}>
                          Update
                        </th>
                        <th style={{ padding: '0.65rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted, #334155)' }}>
                          Errors
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ backgroundColor: 'var(--bg-surface, #ffffff)' }}>
                        <td className="summary-val-total" style={{ padding: '0.75rem 1rem', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>
                          {validationSummary.total}
                        </td>
                        <td className="summary-val-new" style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--success, #16a34a)' }}>
                          {validationSummary.new || 0}
                        </td>
                        <td className="summary-val-update" style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--primary, #2563eb)' }}>
                          {validationSummary.update || 0}
                        </td>
                        <td className="summary-val-errors" style={{ padding: '0.75rem 1rem', fontWeight: 700, color: validationSummary.errors > 0 ? 'var(--danger, #dc2626)' : 'var(--text-muted, #64748b)' }}>
                          {validationSummary.errors || 0}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  <div
                    className="upload-summary-pagination"
                    style={{
                      padding: '0.45rem 1rem',
                      borderTop: '1px solid var(--border, #f1f5f9)',
                      fontSize: '0.75rem',
                      color: 'var(--text-muted, #64748b)',
                      backgroundColor: 'var(--bg-surface, #ffffff)',
                    }}
                  >
                    1 - 1
                  </div>
                </div>
              </div>
            </div>

            {/* -------------------------------------------------------- */}
            {/* CARD 2: PREVIEW - FIX ANY RED ROWS, THEN IMPORT SOURCE   */}
            {/* (Matching Screenshot 1 & 2)                              */}
            {/* -------------------------------------------------------- */}
            <div
              className="upload-preview-card apex-card"
              style={{
                backgroundColor: 'var(--bg-surface, #ffffff)',
                border: '1px solid var(--border, #cbd5e1)',
                borderRadius: '6px',
                overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}
            >
              {/* Card Header with 'Preview - fix any red rows, then Import Source' & '🔄 Re-Check' button */}
              <div
                className="upload-card-header"
                style={{
                  backgroundColor: 'var(--bg-card-header, #071531)',
                  color: '#ffffff',
                  padding: '0.65rem 1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '0.9rem', letterSpacing: '0.01em' }}>
                  Preview - fix any red rows, then Import Source
                </div>

                <button
                  type="button"
                  onClick={handleRecheck}
                  disabled={rechecking}
                  title="Re-validate table rows against CRM database rules"
                  className="btn-toolbar-recheck"
                  style={{
                    height: '32px',
                    padding: '0 1rem',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.4)',
                    borderRadius: '4px',
                    color: '#ffffff',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: rechecking ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <IconRefresh size={14} className={rechecking ? 'spin' : ''} />
                  <span>{rechecking ? 'Re-Checking...' : 'Re-Check'}</span>
                </button>
              </div>

              {/* Interactive Toolbar matching Screenshot 1 & 2 */}
              <div
                className="upload-preview-toolbar"
                style={{
                  padding: '0.75rem 1rem',
                  borderBottom: '1px solid var(--border, #e2e8f0)',
                  backgroundColor: 'var(--bg-muted, #f8fafc)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                }}
              >
                {/* Left: Search + Actions + Edit + Save + Add Row */}
                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {/* Search box */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <span
                        style={{
                          position: 'absolute',
                          left: '8px',
                          color: 'var(--text-muted, #64748b)',
                          pointerEvents: 'none',
                        }}
                      >
                        <IconSearch size={14} />
                      </span>
                      <input
                        type="text"
                        className="upload-search-input"
                        placeholder="Search: All Text Columns"
                        value={previewSearchInput}
                        onChange={(e) => setPreviewSearchInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            setPreviewSearchQuery(previewSearchInput);
                            setPreviewPage(1);
                          }
                        }}
                        style={{
                          height: '32px',
                          padding: '0 0.5rem 0 28px',
                          border: '1px solid var(--border, #cbd5e1)',
                          borderRadius: '4px',
                          fontSize: '0.8rem',
                          width: '210px',
                          backgroundColor: 'var(--bg-input, #ffffff)',
                          color: 'var(--text-main, #0f172a)',
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      className="btn-toolbar-action"
                      onClick={() => {
                        setPreviewSearchQuery(previewSearchInput);
                        setPreviewPage(1);
                      }}
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
                      }}
                    >
                      Go
                    </button>
                    {previewSearchQuery && (
                      <button
                        type="button"
                        className="btn-toolbar-action"
                        onClick={() => {
                          setPreviewSearchInput('');
                          setPreviewSearchQuery('');
                          setPreviewPage(1);
                        }}
                        title="Clear search"
                        style={{
                          height: '32px',
                          padding: '0 8px',
                          backgroundColor: 'var(--bg-surface, #ffffff)',
                          border: '1px solid var(--border, #cbd5e1)',
                          borderRadius: '4px',
                          color: 'var(--text-muted, #64748b)',
                          cursor: 'pointer',
                        }}
                      >
                        ✕
                      </button>
                    )}
                  </div>

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
                      hasSelection={selectedRowIds.size > 0}
                      onSelectAll={handleSelectAllRows}
                      onDeselectAll={handleDeselectAll}
                      onInvertSelection={handleInvertSelection}
                      onCopyToClipboard={handleCopyToClipboard}
                      onRevertEdits={handleRevertEdits}
                      onDeleteSelected={handleDeleteSelected}
                      onDownload={handleDownloadStagingCsv}
                      onOpenHelp={() => setShowHelpModal(true)}
                      onRefresh={handleRecheck}
                      onChangeRows={(r) => {
                        setPreviewRowsPerPage(r === 'all' ? editableRows.length : r);
                        setPreviewPage(1);
                      }}
                      currentRows={previewRowsPerPage}
                    />
                  </div>

                  {/* Edit Button */}
                  <button
                    type="button"
                    className="btn-toolbar-action"
                    onClick={() => setIsEditingGrid(!isEditingGrid)}
                    style={{
                      height: '32px',
                      padding: '0 12px',
                      backgroundColor: isEditingGrid ? 'var(--primary, #2563eb)' : 'var(--bg-surface, #ffffff)',
                      border: '1px solid var(--border, #cbd5e1)',
                      borderRadius: '4px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      color: isEditingGrid ? '#ffffff' : 'var(--text-main, #334155)',
                      cursor: 'pointer',
                    }}
                  >
                    Edit
                  </button>

                  {/* Save Button */}
                  <button
                    type="button"
                    onClick={handleSaveEdits}
                    className="btn-primary"
                    style={{
                      height: '32px',
                      padding: '0 14px',
                      backgroundColor: 'var(--primary, #2563eb)',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      color: '#ffffff',
                      cursor: 'pointer',
                    }}
                  >
                    Save
                  </button>

                  {/* Add Row Button */}
                  <button
                    type="button"
                    className="btn-toolbar-action"
                    onClick={handleAddRow}
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
                    }}
                  >
                    Add Row
                  </button>
                </div>

                {/* Right: Reset Button */}
                <div>
                  <button
                    type="button"
                    className="btn-toolbar-action"
                    onClick={handleResetPreview}
                    title="Reset rows to original file values"
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
                    <IconRefresh size={13} />
                    <span>Reset</span>
                  </button>
                </div>
              </div>

              {/* Table Container with Horizontal Scroll */}
              <div className="upload-preview-table-wrapper dense-table-wrapper" style={{ overflowX: 'auto', maxHeight: '520px', backgroundColor: 'var(--bg-surface, #ffffff)' }}>
                <table className="upload-preview-table dense-table apex-report-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--bg-table-header, #ffffff)', borderBottom: '2px solid var(--border, #cbd5e1)', textAlign: 'left', position: 'sticky', top: 0, zIndex: 10 }}>
                      {/* Checkbox Column */}
                      <th style={{ width: '36px', padding: '0.6rem 0.5rem', textAlign: 'center', backgroundColor: 'var(--bg-table-header, #ffffff)' }}>
                        <input
                          type="checkbox"
                          checked={editableRows.length > 0 && selectedRowIds.size >= editableRows.length}
                          ref={(el) => {
                            if (el) {
                              el.indeterminate = selectedRowIds.size > 0 && selectedRowIds.size < editableRows.length;
                            }
                          }}
                          onChange={handleSelectAllRows}
                          style={{ cursor: 'pointer' }}
                          title={
                            selectedRowIds.size >= editableRows.length && editableRows.length > 0
                              ? `All ${editableRows.length} rows selected`
                              : `Select all ${editableRows.length} rows throughout report`
                          }
                        />
                      </th>
                      {/* Row Action/Menu Handle */}
                      <th style={{ width: '32px', padding: '0.6rem 0.25rem', textAlign: 'center', backgroundColor: 'var(--bg-table-header, #ffffff)' }}>
                        <IconMenu size={14} style={{ color: 'var(--text-muted, #94a3b8)' }} />
                      </th>
                      <th style={{ padding: '0.6rem 0.5rem', minWidth: '95px', fontWeight: 600, color: 'var(--text-muted, #334155)', backgroundColor: 'var(--bg-table-header, #ffffff)' }}>
                        Excel Row No
                      </th>
                      <th style={{ padding: '0.6rem 0.5rem', minWidth: '85px', fontWeight: 600, color: 'var(--text-muted, #334155)', backgroundColor: 'var(--bg-table-header, #ffffff)' }}>
                        Row Status
                      </th>
                      <th style={{ padding: '0.6rem 0.75rem', minWidth: '280px', fontWeight: 600, color: 'var(--text-muted, #334155)', backgroundColor: 'var(--bg-table-header, #ffffff)' }}>
                        Error Msg
                      </th>
                      <th style={{ padding: '0.6rem 0.5rem', minWidth: '85px', fontWeight: 600, color: 'var(--text-muted, #334155)', backgroundColor: 'var(--bg-table-header, #ffffff)' }}>
                        Comp Id
                      </th>
                      <th style={{ padding: '0.6rem 0.5rem', minWidth: '180px', fontWeight: 600, color: 'var(--text-muted, #334155)', backgroundColor: 'var(--bg-table-header, #ffffff)' }}>
                        Comp Name
                      </th>
                      <th style={{ padding: '0.6rem 0.5rem', minWidth: '130px', fontWeight: 600, color: 'var(--text-muted, #334155)', backgroundColor: 'var(--bg-table-header, #ffffff)' }}>
                        Technology
                      </th>
                      <th style={{ padding: '0.6rem 0.5rem', minWidth: '150px', fontWeight: 600, color: 'var(--text-muted, #334155)', backgroundColor: 'var(--bg-table-header, #ffffff)' }}>
                        Industry
                      </th>
                      <th style={{ padding: '0.6rem 0.5rem', minWidth: '110px', fontWeight: 600, color: 'var(--text-muted, #334155)', backgroundColor: 'var(--bg-table-header, #ffffff)' }}>
                        Company Type
                      </th>
                      <th style={{ padding: '0.6rem 0.5rem', minWidth: '130px', fontWeight: 600, color: 'var(--text-muted, #334155)', backgroundColor: 'var(--bg-table-header, #ffffff)' }}>
                        Company Categories
                      </th>
                      <th style={{ padding: '0.6rem 0.5rem', minWidth: '110px', fontWeight: 600, color: 'var(--text-muted, #334155)', backgroundColor: 'var(--bg-table-header, #ffffff)' }}>
                        City
                      </th>
                      <th style={{ padding: '0.6rem 0.5rem', minWidth: '110px', fontWeight: 600, color: 'var(--text-muted, #334155)', backgroundColor: 'var(--bg-table-header, #ffffff)' }}>
                        Country
                      </th>
                      <th style={{ padding: '0.6rem 0.5rem', minWidth: '110px', fontWeight: 600, color: 'var(--text-muted, #334155)', backgroundColor: 'var(--bg-table-header, #ffffff)' }}>
                        Company Phone
                      </th>
                      <th style={{ padding: '0.6rem 0.5rem', minWidth: '160px', fontWeight: 600, color: 'var(--text-muted, #334155)', backgroundColor: 'var(--bg-table-header, #ffffff)' }}>
                        Website
                      </th>
                      <th style={{ padding: '0.6rem 0.5rem', minWidth: '120px', fontWeight: 600, color: 'var(--text-muted, #334155)', backgroundColor: 'var(--bg-table-header, #ffffff)' }}>
                        Registration Status
                      </th>
                      <th style={{ padding: '0.6rem 0.5rem', minWidth: '120px', fontWeight: 600, color: 'var(--text-muted, #334155)', backgroundColor: 'var(--bg-table-header, #ffffff)' }}>
                        Employee Size
                      </th>
                      <th style={{ padding: '0.6rem 0.5rem', minWidth: '160px', fontWeight: 600, color: 'var(--text-muted, #334155)', backgroundColor: 'var(--bg-table-header, #ffffff)' }}>
                        Email
                      </th>
                      <th style={{ padding: '0.6rem 0.5rem', minWidth: '90px', fontWeight: 600, color: 'var(--text-muted, #334155)', backgroundColor: 'var(--bg-table-header, #ffffff)' }}>
                        DA
                      </th>
                      <th style={{ padding: '0.6rem 0.5rem', minWidth: '140px', fontWeight: 600, color: 'var(--text-muted, #334155)', backgroundColor: 'var(--bg-table-header, #ffffff)' }}>
                        Remark
                      </th>
                      <th style={{ padding: '0.6rem 0.5rem', minWidth: '120px', fontWeight: 600, color: 'var(--text-muted, #334155)', backgroundColor: 'var(--bg-table-header, #ffffff)' }}>
                        Salesperson
                      </th>
                      <th style={{ padding: '0.6rem 0.5rem', minWidth: '110px', fontWeight: 600, color: 'var(--text-muted, #334155)', backgroundColor: 'var(--bg-table-header, #ffffff)' }}>
                        Source
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedPreviewRows.length === 0 ? (
                      <tr>
                        <td colSpan={22} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted, #94a3b8)' }}>
                          No records match your filter criteria.
                        </td>
                      </tr>
                    ) : (
                      pagedPreviewRows.map((row) => {
                        const originalIndex = editableRows.findIndex((r) => r.stg_id === row.stg_id);
                        const isError = row.row_status === 'ERROR' || !row.isValid;
                        const isSelected = selectedRowIds.has(row.stg_id);

                        return (
                          <tr
                            key={row.stg_id}
                            className={`upload-table-row ${isSelected ? 'selected' : isError ? 'error-row' : ''}`}
                            style={{
                              borderBottom: '1px solid var(--border, #e2e8f0)',
                              borderLeft: isError ? '3px solid var(--danger, #dc2626)' : '3px solid transparent',
                              transition: 'background-color 0.1s ease',
                            }}
                          >
                            {/* Checkbox */}
                            <td style={{ textAlign: 'center', padding: '0.45rem 0.5rem' }}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleSelectRow(row.stg_id)}
                                style={{ cursor: 'pointer' }}
                              />
                            </td>

                            {/* Row Menu Handle */}
                            <td style={{ textAlign: 'center', padding: '0.45rem 0.25rem', color: 'var(--text-muted, #94a3b8)' }}>
                              <span style={{ cursor: 'grab' }}>≡</span>
                            </td>

                            {/* Excel Row No */}
                            <td style={{ padding: '0.45rem 0.5rem', fontWeight: 600, color: 'var(--text-main, #334155)' }}>
                              {row.excel_row_no}
                            </td>

                            {/* Row Status Badge */}
                            <td style={{ padding: '0.45rem 0.5rem' }}>
                              {isError ? (
                                <span className="status-badge error">
                                  ERROR
                                </span>
                              ) : row.row_status === 'UPDATE' ? (
                                <span className="status-badge update">
                                  UPDATE
                                </span>
                              ) : (
                                <span className="status-badge new">
                                  NEW
                                </span>
                              )}
                            </td>

                            {/* Error Msg (Pipe-separated in red text) */}
                            <td
                              style={{
                                padding: '0.45rem 0.75rem',
                                color: isError ? 'var(--danger, #f87171)' : 'var(--success, #34d399)',
                                fontWeight: isError ? 600 : 400,
                                wordBreak: 'break-word',
                              }}
                            >
                              {row.error_msg || (isError ? 'Validation failed' : '-')}
                            </td>

                            {/* Comp Id */}
                            <td style={{ padding: '0.45rem 0.5rem' }}>
                              {isEditingGrid ? (
                                <input
                                  type="text"
                                  value={row.comp_id || ''}
                                  onChange={(e) => handleCellChange(originalIndex, 'comp_id', e.target.value)}
                                  style={{
                                    width: '100%',
                                    height: '26px',
                                    padding: '2px 4px',
                                    fontSize: '0.75rem',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '3px',
                                  }}
                                />
                              ) : (
                                row.comp_id || '-'
                              )}
                            </td>

                            {/* Comp Name */}
                            <td style={{ padding: '0.45rem 0.5rem', fontWeight: 600, color: '#0f172a' }}>
                              {isEditingGrid ? (
                                <input
                                  type="text"
                                  value={row.comp_name || ''}
                                  onChange={(e) => handleCellChange(originalIndex, 'comp_name', e.target.value)}
                                  style={{
                                    width: '100%',
                                    height: '26px',
                                    padding: '2px 4px',
                                    fontSize: '0.75rem',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '3px',
                                  }}
                                />
                              ) : (
                                row.comp_name || <span style={{ color: '#ef4444', fontStyle: 'italic' }}>[Missing]</span>
                              )}
                            </td>

                            {/* Technology */}
                            <td style={{ padding: '0.45rem 0.5rem' }}>
                              {isEditingGrid ? (
                                <input
                                  type="text"
                                  value={row.technology || ''}
                                  onChange={(e) => handleCellChange(originalIndex, 'technology', e.target.value)}
                                  style={{
                                    width: '100%',
                                    height: '26px',
                                    padding: '2px 4px',
                                    fontSize: '0.75rem',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '3px',
                                  }}
                                />
                              ) : (
                                row.technology || '-'
                              )}
                            </td>

                            {/* Industry */}
                            <td style={{ padding: '0.45rem 0.5rem' }}>
                              {isEditingGrid ? (
                                <input
                                  type="text"
                                  value={row.industry || ''}
                                  onChange={(e) => handleCellChange(originalIndex, 'industry', e.target.value)}
                                  style={{
                                    width: '100%',
                                    height: '26px',
                                    padding: '2px 4px',
                                    fontSize: '0.75rem',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '3px',
                                  }}
                                />
                              ) : (
                                row.industry || '-'
                              )}
                            </td>

                            {/* Company Type */}
                            <td style={{ padding: '0.45rem 0.5rem' }}>
                              {isEditingGrid ? (
                                <input
                                  type="text"
                                  value={row.company_type || ''}
                                  onChange={(e) => handleCellChange(originalIndex, 'company_type', e.target.value)}
                                  style={{
                                    width: '100%',
                                    height: '26px',
                                    padding: '2px 4px',
                                    fontSize: '0.75rem',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '3px',
                                  }}
                                />
                              ) : (
                                row.company_type || '-'
                              )}
                            </td>

                            {/* Company Categories */}
                            <td style={{ padding: '0.45rem 0.5rem' }}>
                              {isEditingGrid ? (
                                <input
                                  type="text"
                                  value={row.company_categories || ''}
                                  onChange={(e) => handleCellChange(originalIndex, 'company_categories', e.target.value)}
                                  style={{
                                    width: '100%',
                                    height: '26px',
                                    padding: '2px 4px',
                                    fontSize: '0.75rem',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '3px',
                                  }}
                                />
                              ) : (
                                row.company_categories || '-'
                              )}
                            </td>

                            {/* City */}
                            <td style={{ padding: '0.45rem 0.5rem' }}>
                              {isEditingGrid ? (
                                <input
                                  type="text"
                                  value={row.city || ''}
                                  onChange={(e) => handleCellChange(originalIndex, 'city', e.target.value)}
                                  style={{
                                    width: '100%',
                                    height: '26px',
                                    padding: '2px 4px',
                                    fontSize: '0.75rem',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '3px',
                                  }}
                                />
                              ) : (
                                row.city || '-'
                              )}
                            </td>

                            {/* Country */}
                            <td style={{ padding: '0.45rem 0.5rem' }}>
                              {isEditingGrid ? (
                                <input
                                  type="text"
                                  value={row.country || ''}
                                  onChange={(e) => handleCellChange(originalIndex, 'country', e.target.value)}
                                  style={{
                                    width: '100%',
                                    height: '26px',
                                    padding: '2px 4px',
                                    fontSize: '0.75rem',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '3px',
                                  }}
                                />
                              ) : (
                                row.country || '-'
                              )}
                            </td>

                            {/* Company Phone */}
                            <td style={{ padding: '0.45rem 0.5rem' }}>
                              {isEditingGrid ? (
                                <input
                                  type="text"
                                  value={row.companyphone || ''}
                                  onChange={(e) => handleCellChange(originalIndex, 'companyphone', e.target.value)}
                                  style={{
                                    width: '100%',
                                    height: '26px',
                                    padding: '2px 4px',
                                    fontSize: '0.75rem',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '3px',
                                  }}
                                />
                              ) : (
                                row.companyphone || '-'
                              )}
                            </td>

                            {/* Website */}
                            <td style={{ padding: '0.45rem 0.5rem' }}>
                              {isEditingGrid ? (
                                <input
                                  type="text"
                                  value={row.website || ''}
                                  onChange={(e) => handleCellChange(originalIndex, 'website', e.target.value)}
                                  style={{
                                    width: '100%',
                                    height: '26px',
                                    padding: '2px 4px',
                                    fontSize: '0.75rem',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '3px',
                                  }}
                                />
                              ) : (
                                row.website || '-'
                              )}
                            </td>

                            {/* Registration Status */}
                            <td style={{ padding: '0.45rem 0.5rem' }}>
                              {isEditingGrid ? (
                                <input
                                  type="text"
                                  value={row.registration_status || ''}
                                  onChange={(e) => handleCellChange(originalIndex, 'registration_status', e.target.value)}
                                  style={{
                                    width: '100%',
                                    height: '26px',
                                    padding: '2px 4px',
                                    fontSize: '0.75rem',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '3px',
                                  }}
                                />
                              ) : (
                                row.registration_status || '-'
                              )}
                            </td>

                            {/* Employee Size */}
                            <td style={{ padding: '0.45rem 0.5rem' }}>
                              {isEditingGrid ? (
                                <input
                                  type="text"
                                  value={row.employee_size || ''}
                                  onChange={(e) => handleCellChange(originalIndex, 'employee_size', e.target.value)}
                                  style={{
                                    width: '100%',
                                    height: '26px',
                                    padding: '2px 4px',
                                    fontSize: '0.75rem',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '3px',
                                  }}
                                />
                              ) : (
                                row.employee_size || '-'
                              )}
                            </td>

                            {/* Email */}
                            <td style={{ padding: '0.45rem 0.5rem' }}>
                              {isEditingGrid ? (
                                <input
                                  type="text"
                                  value={row.com_email || ''}
                                  onChange={(e) => handleCellChange(originalIndex, 'com_email', e.target.value)}
                                  style={{
                                    width: '100%',
                                    height: '26px',
                                    padding: '2px 4px',
                                    fontSize: '0.75rem',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '3px',
                                  }}
                                />
                              ) : (
                                row.com_email || '-'
                              )}
                            </td>

                            {/* DA */}
                            <td style={{ padding: '0.45rem 0.5rem' }}>
                              {isEditingGrid ? (
                                <input
                                  type="text"
                                  value={row.da || ''}
                                  onChange={(e) => handleCellChange(originalIndex, 'da', e.target.value)}
                                  style={{
                                    width: '100%',
                                    height: '26px',
                                    padding: '2px 4px',
                                    fontSize: '0.75rem',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '3px',
                                  }}
                                />
                              ) : (
                                row.da || '-'
                              )}
                            </td>

                            {/* Remark */}
                            <td style={{ padding: '0.45rem 0.5rem' }}>
                              {isEditingGrid ? (
                                <input
                                  type="text"
                                  value={row.remark || ''}
                                  onChange={(e) => handleCellChange(originalIndex, 'remark', e.target.value)}
                                  style={{
                                    width: '100%',
                                    height: '26px',
                                    padding: '2px 4px',
                                    fontSize: '0.75rem',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '3px',
                                  }}
                                />
                              ) : (
                                row.remark || '-'
                              )}
                            </td>

                            {/* Salesperson */}
                            <td style={{ padding: '0.45rem 0.5rem' }}>
                              {isEditingGrid ? (
                                <input
                                  type="text"
                                  value={row.salesperson || ''}
                                  onChange={(e) => handleCellChange(originalIndex, 'salesperson', e.target.value)}
                                  style={{
                                    width: '100%',
                                    height: '26px',
                                    padding: '2px 4px',
                                    fontSize: '0.75rem',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '3px',
                                  }}
                                />
                              ) : (
                                row.salesperson || '-'
                              )}
                            </td>

                            {/* Source */}
                            <td style={{ padding: '0.45rem 0.5rem' }}>
                              {isEditingGrid ? (
                                <input
                                  type="text"
                                  value={row.source || ''}
                                  onChange={(e) => handleCellChange(originalIndex, 'source', e.target.value)}
                                  style={{
                                    width: '100%',
                                    height: '26px',
                                    padding: '2px 4px',
                                    fontSize: '0.75rem',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '3px',
                                  }}
                                />
                              ) : (
                                row.source || '-'
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Footer with Selection Count and Row Count */}
              <div
                className="upload-preview-footer"
                style={{
                  padding: '0.65rem 1rem',
                  borderTop: '1px solid var(--border, #e2e8f0)',
                  backgroundColor: 'var(--bg-surface, #ffffff)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.75rem',
                  color: 'var(--text-muted, #64748b)',
                }}
              >
                <div>
                  <strong style={{ color: 'var(--text-main, #0f172a)' }}>{selectedRowIds.size}</strong> rows selected
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span>
                    {previewTotal > 0 ? `${previewStart + 1} - ${previewEnd} of ${previewTotal}` : '0 of 0'}
                  </span>

                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      type="button"
                      disabled={previewPage <= 1}
                      onClick={() => setPreviewPage((p) => Math.max(1, p - 1))}
                      className="btn-toolbar-action"
                      style={{
                        padding: '2px 6px',
                        border: '1px solid var(--border, #cbd5e1)',
                        borderRadius: '3px',
                        backgroundColor: previewPage <= 1 ? 'var(--bg-muted, #f8fafc)' : 'var(--bg-surface, #ffffff)',
                        cursor: previewPage <= 1 ? 'not-allowed' : 'pointer',
                        color: previewPage <= 1 ? 'var(--text-disabled, #94a3b8)' : 'var(--text-main, #334155)',
                      }}
                    >
                      &lt;
                    </button>
                    <button
                      type="button"
                      disabled={previewEnd >= previewTotal}
                      onClick={() => setPreviewPage((p) => p + 1)}
                      className="btn-toolbar-action"
                      style={{
                        padding: '2px 6px',
                        border: '1px solid var(--border, #cbd5e1)',
                        borderRadius: '3px',
                        backgroundColor: previewEnd >= previewTotal ? 'var(--bg-muted, #f8fafc)' : 'var(--bg-surface, #ffffff)',
                        cursor: previewEnd >= previewTotal ? 'not-allowed' : 'pointer',
                        color: previewEnd >= previewTotal ? 'var(--text-disabled, #94a3b8)' : 'var(--text-main, #334155)',
                      }}
                    >
                      &gt;
                    </button>
                  </div>

                  <span>Total {previewTotal}</span>
                </div>
              </div>
            </div>

            {/* -------------------------------------------------------- */}
            {/* CARD 3: ERROR ROWS (DOWNLOAD TO FIX) (Matching Screen 3) */}
            {/* -------------------------------------------------------- */}
            <div
              className="upload-error-card apex-card"
              style={{
                backgroundColor: 'var(--bg-surface, #ffffff)',
                border: '1px solid var(--border, #cbd5e1)',
                borderRadius: '6px',
                overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}
            >
              {/* Header */}
              <div
                className="upload-card-header"
                style={{
                  backgroundColor: 'var(--bg-card-header, #071531)',
                  color: '#ffffff',
                  padding: '0.65rem 1.25rem',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  letterSpacing: '0.01em',
                }}
              >
                Error Rows (Download to Fix)
              </div>

              {/* Toolbar */}
              <div
                className="upload-preview-toolbar"
                style={{
                  padding: '0.75rem 1rem',
                  borderBottom: '1px solid var(--border, #e2e8f0)',
                  backgroundColor: 'var(--bg-muted, #f8fafc)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                }}
              >
                {/* Left: Search input */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <span
                      style={{
                        position: 'absolute',
                        left: '8px',
                        color: 'var(--text-muted, #64748b)',
                        pointerEvents: 'none',
                      }}
                    >
                      <IconSearch size={14} />
                    </span>
                    <input
                      type="text"
                      placeholder="Search errors..."
                      value={errorSearchInput}
                      onChange={(e) => setErrorSearchInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          setErrorSearchQuery(errorSearchInput);
                          setErrorPage(1);
                        }
                      }}
                      className="upload-search-input"
                      style={{
                        height: '32px',
                        padding: '0 0.5rem 0 28px',
                        border: '1px solid var(--border, #cbd5e1)',
                        borderRadius: '4px',
                        fontSize: '0.8rem',
                        width: '180px',
                        backgroundColor: 'var(--bg-input, #ffffff)',
                        color: 'var(--text-main, #0f172a)',
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    className="btn-toolbar-action"
                    onClick={() => {
                      setErrorSearchQuery(errorSearchInput);
                      setErrorPage(1);
                    }}
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
                    }}
                  >
                    Go
                  </button>
                  {errorSearchQuery && (
                    <button
                      type="button"
                      className="btn-toolbar-action"
                      onClick={() => {
                        setErrorSearchInput('');
                        setErrorSearchQuery('');
                        setErrorPage(1);
                      }}
                      title="Clear search"
                      style={{
                        height: '32px',
                        padding: '0 8px',
                        backgroundColor: 'var(--bg-surface, #ffffff)',
                        border: '1px solid var(--border, #cbd5e1)',
                        borderRadius: '4px',
                        color: 'var(--text-muted, #64748b)',
                        cursor: 'pointer',
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Right: Actions Dropdown & Download Errors button */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={handleDownloadErrorRows}
                    disabled={errorRowsList.length === 0}
                    className="btn-toolbar-action"
                    style={{
                      height: '32px',
                      padding: '0 12px',
                      backgroundColor: errorRowsList.length === 0 ? 'var(--bg-muted, #f1f5f9)' : 'var(--bg-surface, #ffffff)',
                      border: '1px solid var(--border, #cbd5e1)',
                      borderRadius: '4px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      color: errorRowsList.length === 0 ? 'var(--text-disabled, #94a3b8)' : 'var(--danger, #b91c1c)',
                      cursor: errorRowsList.length === 0 ? 'not-allowed' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <IconDownload size={14} />
                    <span>Download Errors ({errorRowsList.length})</span>
                  </button>
                </div>
              </div>

              {/* Error Rows Table */}
              <div className="upload-preview-table-wrapper dense-table-wrapper" style={{ overflowX: 'auto', maxHeight: '420px', backgroundColor: 'var(--bg-surface, #ffffff)' }}>
                <table className="upload-preview-table dense-table apex-report-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--bg-table-header, #ffffff)', borderBottom: '2px solid var(--border, #cbd5e1)', textAlign: 'left', position: 'sticky', top: 0, zIndex: 10 }}>
                      <th style={{ padding: '0.6rem 0.5rem', minWidth: '80px', fontWeight: 600, color: 'var(--text-muted, #334155)', backgroundColor: 'var(--bg-table-header, #ffffff)' }}>
                        Stg Id
                      </th>
                      <th style={{ padding: '0.6rem 0.5rem', minWidth: '80px', fontWeight: 600, color: 'var(--text-muted, #334155)', backgroundColor: 'var(--bg-table-header, #ffffff)' }}>
                        Batch Id
                      </th>
                      <th style={{ padding: '0.6rem 0.5rem', minWidth: '95px', fontWeight: 600, color: 'var(--text-muted, #334155)', backgroundColor: 'var(--bg-table-header, #ffffff)' }}>
                        Excel Row No
                      </th>
                      <th style={{ padding: '0.6rem 0.5rem', minWidth: '80px', fontWeight: 600, color: 'var(--text-muted, #334155)', backgroundColor: 'var(--bg-table-header, #ffffff)' }}>
                        Src Id
                      </th>
                      <th style={{ padding: '0.6rem 0.5rem', minWidth: '80px', fontWeight: 600, color: 'var(--text-muted, #334155)', backgroundColor: 'var(--bg-table-header, #ffffff)' }}>
                        Comp Id
                      </th>
                      <th style={{ padding: '0.6rem 0.5rem', minWidth: '180px', fontWeight: 600, color: 'var(--text-muted, #334155)', backgroundColor: 'var(--bg-table-header, #ffffff)' }}>
                        Comp Name
                      </th>
                      <th style={{ padding: '0.6rem 0.75rem', minWidth: '260px', fontWeight: 600, color: 'var(--text-muted, #334155)', backgroundColor: 'var(--bg-table-header, #ffffff)' }}>
                        Error Msg
                      </th>
                      <th style={{ padding: '0.6rem 0.5rem', minWidth: '120px', fontWeight: 600, color: 'var(--text-muted, #334155)', backgroundColor: 'var(--bg-table-header, #ffffff)' }}>
                        Technology
                      </th>
                      <th style={{ padding: '0.6rem 0.5rem', minWidth: '140px', fontWeight: 600, color: 'var(--text-muted, #334155)', backgroundColor: 'var(--bg-table-header, #ffffff)' }}>
                        Industry
                      </th>
                      <th style={{ padding: '0.6rem 0.5rem', minWidth: '110px', fontWeight: 600, color: 'var(--text-muted, #334155)', backgroundColor: 'var(--bg-table-header, #ffffff)' }}>
                        Company Type
                      </th>
                      <th style={{ padding: '0.6rem 0.5rem', minWidth: '110px', fontWeight: 600, color: 'var(--text-muted, #334155)', backgroundColor: 'var(--bg-table-header, #ffffff)' }}>
                        Country
                      </th>
                      <th style={{ padding: '0.6rem 0.5rem', minWidth: '110px', fontWeight: 600, color: 'var(--text-muted, #334155)', backgroundColor: 'var(--bg-table-header, #ffffff)' }}>
                        City
                      </th>
                      <th style={{ padding: '0.6rem 0.5rem', minWidth: '150px', fontWeight: 600, color: 'var(--text-muted, #334155)', backgroundColor: 'var(--bg-table-header, #ffffff)' }}>
                        Website
                      </th>
                      <th style={{ padding: '0.6rem 0.5rem', minWidth: '150px', fontWeight: 600, color: 'var(--text-muted, #334155)', backgroundColor: 'var(--bg-table-header, #ffffff)' }}>
                        Company Email
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedErrorRows.length === 0 ? (
                      <tr>
                        <td colSpan={14} style={{ textAlign: 'center', padding: '2rem', color: 'var(--success, #15803d)', fontWeight: 500 }}>
                          ✓ No error rows found. All rows are valid and ready for import!
                        </td>
                      </tr>
                    ) : (
                      pagedErrorRows.map((row) => (
                        <tr
                          key={row.stg_id}
                          className="upload-table-row error-row"
                          style={{
                            borderBottom: '1px solid var(--border, #e2e8f0)',
                          }}
                        >
                          <td style={{ padding: '0.45rem 0.5rem', color: 'var(--text-muted, #64748b)' }}>{row.stg_id}</td>
                          <td style={{ padding: '0.45rem 0.5rem', color: 'var(--text-muted, #64748b)' }}>{row.batch_id}</td>
                          <td style={{ padding: '0.45rem 0.5rem', fontWeight: 600, color: 'var(--text-main, #334155)' }}>
                            {row.excel_row_no}
                          </td>
                          <td style={{ padding: '0.45rem 0.5rem', color: 'var(--text-muted, #64748b)' }}>{row.comp_id || '-'}</td>
                          <td style={{ padding: '0.45rem 0.5rem', color: 'var(--text-muted, #64748b)' }}>{row.comp_id || '-'}</td>
                          <td style={{ padding: '0.45rem 0.5rem', fontWeight: 600, color: 'var(--text-main, #0f172a)' }}>
                            {row.comp_name || <span style={{ color: 'var(--danger, #ef4444)' }}>[Missing]</span>}
                          </td>
                          <td style={{ padding: '0.45rem 0.75rem', color: 'var(--danger, #f87171)', fontWeight: 600, wordBreak: 'break-word' }}>
                            {row.error_msg || 'Validation failed'}
                          </td>
                          <td style={{ padding: '0.45rem 0.5rem', color: 'var(--text-muted, #475569)' }}>{row.technology || '-'}</td>
                          <td style={{ padding: '0.45rem 0.5rem', color: 'var(--text-muted, #475569)' }}>{row.industry || '-'}</td>
                          <td style={{ padding: '0.45rem 0.5rem', color: 'var(--text-muted, #475569)' }}>{row.company_type || '-'}</td>
                          <td style={{ padding: '0.45rem 0.5rem', color: 'var(--text-muted, #475569)' }}>{row.country || '-'}</td>
                          <td style={{ padding: '0.45rem 0.5rem', color: 'var(--text-muted, #475569)' }}>{row.city || '-'}</td>
                          <td style={{ padding: '0.45rem 0.5rem', color: 'var(--text-muted, #475569)' }}>{row.website || '-'}</td>
                          <td style={{ padding: '0.45rem 0.5rem', color: 'var(--text-muted, #475569)' }}>{row.com_email || '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Error Table Footer */}
              <div
                className="upload-preview-footer"
                style={{
                  padding: '0.65rem 1rem',
                  borderTop: '1px solid var(--border, #e2e8f0)',
                  backgroundColor: 'var(--bg-surface, #ffffff)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: '1rem',
                  fontSize: '0.75rem',
                  color: 'var(--text-muted, #64748b)',
                }}
              >
                <span>
                  {errorTotal > 0 ? `${errorStart + 1} - ${errorEnd} of ${errorTotal}` : '0 of 0'}
                </span>

                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    type="button"
                    disabled={errorPage <= 1}
                    onClick={() => setErrorPage((p) => Math.max(1, p - 1))}
                    className="btn-toolbar-action"
                    style={{
                      padding: '2px 6px',
                      border: '1px solid var(--border, #cbd5e1)',
                      borderRadius: '3px',
                      backgroundColor: errorPage <= 1 ? 'var(--bg-muted, #f8fafc)' : 'var(--bg-surface, #ffffff)',
                      cursor: errorPage <= 1 ? 'not-allowed' : 'pointer',
                      color: errorPage <= 1 ? 'var(--text-disabled, #94a3b8)' : 'var(--text-main, #334155)',
                    }}
                  >
                    &lt;
                  </button>
                  <button
                    type="button"
                    disabled={errorEnd >= errorTotal}
                    onClick={() => setErrorPage((p) => p + 1)}
                    className="btn-toolbar-action"
                    style={{
                      padding: '2px 6px',
                      border: '1px solid var(--border, #cbd5e1)',
                      borderRadius: '3px',
                      backgroundColor: errorEnd >= errorTotal ? 'var(--bg-muted, #f8fafc)' : 'var(--bg-surface, #ffffff)',
                      cursor: errorEnd >= errorTotal ? 'not-allowed' : 'pointer',
                      color: errorEnd >= errorTotal ? 'var(--text-disabled, #94a3b8)' : 'var(--text-main, #334155)',
                    }}
                  >
                    &gt;
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* STEP 3: CONFIRM & IMPORT                                 */}
        {/* ======================================================== */}
        {currentStep === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '640px', margin: '0 auto' }}>
            {!importCompleted ? (
              /* Pre-Import Confirmation Card */
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                }}
              >
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>
                  Ready to Import Companies
                </div>

                <p style={{ margin: 0, fontSize: '0.85rem', color: '#475569', lineHeight: 1.5 }}>
                  Please review the staged import parameters below. Clicking <strong>Import Companies</strong> will commit the valid rows into your PostgreSQL database.
                </p>

                <div
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    padding: '1rem',
                    fontSize: '0.85rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>File Name:</span>
                    <strong style={{ color: '#1e293b' }}>{selectedFile ? selectedFile.name : '-'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Upload Mode:</span>
                    <strong style={{ color: '#1e293b' }}>
                      {uploadMode === 'insert'
                        ? 'Insert New Records'
                        : uploadMode === 'update'
                        ? 'Update Existing'
                        : 'Merge (Insert & Update)'}
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Import Policy:</span>
                    <strong style={{ color: '#1e293b' }}>
                      {importPolicy === 'skip' ? 'Skip Invalid Rows' : 'All or Nothing'}
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '0.5rem' }}>
                    <span style={{ color: '#15803d', fontWeight: 600 }}>Records to Import:</span>
                    <strong style={{ color: '#15803d', fontSize: '1rem' }}>
                      {validationSummary.new + validationSummary.update} valid rows
                    </strong>
                  </div>
                  {validationSummary.errors > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#dc2626', fontWeight: 600 }}>Records to Skip:</span>
                      <strong style={{ color: '#dc2626' }}>{validationSummary.errors} invalid rows</strong>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    disabled={importing}
                    style={{
                      height: '38px',
                      padding: '0 1.25rem',
                      backgroundColor: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '4px',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      color: '#334155',
                      cursor: importing ? 'not-allowed' : 'pointer',
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
                      padding: '0 1.75rem',
                      backgroundColor: importing ? '#94a3b8' : '#071531',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: importing ? 'not-allowed' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    {importing ? (
                      <>
                        <IconRefresh className="spin" size={16} />
                        <span>Importing into Database...</span>
                      </>
                    ) : (
                      <span>Import Companies</span>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              /* Post-Import Results Card */
              <div
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #bbf7d0',
                  borderRadius: '8px',
                  padding: '2rem',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '1rem',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                }}
              >
                <div
                  style={{
                    width: '54px',
                    height: '54px',
                    borderRadius: '50%',
                    backgroundColor: '#dcfce7',
                    color: '#15803d',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <IconCheckCircle size={32} />
                </div>

                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>
                  Import Completed Successfully
                </div>

                <p style={{ margin: 0, fontSize: '0.85rem', color: '#475569', maxWidth: '420px' }}>
                  {importResult?.message ||
                    `${importResult?.importedCount || 0} company records were successfully saved into your CRM database.`}
                </p>

                <div
                  style={{
                    display: 'flex',
                    gap: '1.5rem',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    padding: '0.85rem 1.5rem',
                    margin: '0.5rem 0',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Imported</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#15803d' }}>
                      {importResult?.importedCount || 0}
                    </div>
                  </div>
                  <div style={{ width: '1px', backgroundColor: '#cbd5e1' }} />
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Skipped</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#dc2626' }}>
                      {importResult?.skippedCount || 0}
                    </div>
                  </div>
                  <div style={{ width: '1px', backgroundColor: '#cbd5e1' }} />
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Failed</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#64748b' }}>0</div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={onNavigateToCompanies}
                    style={{
                      height: '38px',
                      padding: '0 1.5rem',
                      backgroundColor: '#071531',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '0.825rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    View Companies in CRM
                  </button>

                  {importResult?.skippedCount > 0 && (
                    <button
                      type="button"
                      onClick={handleDownloadErrorRows}
                      style={{
                        height: '38px',
                        padding: '0 1.25rem',
                        backgroundColor: '#fee2e2',
                        border: '1px solid #fca5a5',
                        borderRadius: '6px',
                        fontSize: '0.825rem',
                        fontWeight: 600,
                        color: '#991b1b',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <IconDownload size={14} />
                      <span>Download Skipped Rows Report</span>
                    </button>
                  )}

                  {onNavigateToInvalidData && importResult?.skippedCount > 0 && (
                    <button
                      type="button"
                      onClick={onNavigateToInvalidData}
                      style={{
                        height: '38px',
                        padding: '0 1.25rem',
                        backgroundColor: '#fee2e2',
                        border: '1px solid #fca5a5',
                        borderRadius: '6px',
                        fontSize: '0.825rem',
                        fontWeight: 600,
                        color: '#991b1b',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <span>View Company Invalid Data ({importResult?.skippedCount})</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleResetUpload}
                    style={{
                      height: '38px',
                      padding: '0 1.25rem',
                      backgroundColor: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      fontSize: '0.825rem',
                      fontWeight: 600,
                      color: '#475569',
                      cursor: 'pointer',
                    }}
                  >
                    Upload Another File
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Validation Rules Modal matching (i) Validation Rules button */}
      <ValidationRulesModal
        isOpen={showValidationRules}
        onClose={() => setShowValidationRules(false)}
        type="company"
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
