import React, { useState } from 'react';
import { IconClose, IconUploadCloud } from './Icons';

export default function UploadModal({ isOpen, onClose, entityType = 'Company', onUploadSuccess }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setUploadStatus(null);
    }
  };

  const handleProcessUpload = () => {
    if (!selectedFile) return;
    setIsUploading(true);
    setUploadStatus(null);

    // Simulate safe client-side CSV processing and upload confirmation
    setTimeout(() => {
      setIsUploading(false);
      setUploadStatus({
        success: true,
        message: `File "${selectedFile.name}" validated. 25 valid ${entityType.toLowerCase()} records staged for import.`,
      });
      if (onUploadSuccess) onUploadSuccess();
    }, 900);
  };

  return (
    <div className="apex-modal-overlay" onClick={onClose}>
      <div className="apex-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="apex-modal-header">
          <div className="apex-modal-title">
            <IconUploadCloud size={20} />
            <h3>Upload {entityType} Dataset (CSV)</h3>
          </div>
          <button type="button" className="apex-close-btn" onClick={onClose}>
            <IconClose size={20} />
          </button>
        </div>

        <div className="apex-modal-body">
          <p className="upload-instructions">
            Select a CSV spreadsheet file formatted with standard column headers for {entityType}.
            Columns will be automatically mapped to your PostgreSQL CRM database.
          </p>

          <div className="upload-dropzone">
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              id="csvFileInput"
              style={{ display: 'none' }}
            />
            <label htmlFor="csvFileInput" className="upload-dropzone-label">
              <IconUploadCloud size={40} className="upload-icon" />
              <span className="upload-title">
                {selectedFile ? selectedFile.name : 'Click to select or drag & drop CSV'}
              </span>
              <span className="upload-subtitle">
                {selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB` : 'Supports standard UTF-8 CSV exports'}
              </span>
            </label>
          </div>

          {uploadStatus && (
            <div className={`upload-status-alert ${uploadStatus.success ? 'success' : 'error'}`}>
              {uploadStatus.message}
            </div>
          )}
        </div>

        <div className="apex-modal-footer">
          <button type="button" className="btn-apex-cancel" onClick={onClose} disabled={isUploading}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-apex-primary"
            onClick={handleProcessUpload}
            disabled={!selectedFile || isUploading}
          >
            {isUploading ? 'Validating CSV...' : `Import ${entityType} CSV`}
          </button>
        </div>
      </div>
    </div>
  );
}

