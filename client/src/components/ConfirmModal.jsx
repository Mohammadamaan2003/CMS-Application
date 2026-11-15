import React from 'react';
import Modal from './Modal';
import { IconAlertTriangle } from './Icons';

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Deletion',
  message,
  note,
  confirmButtonText = 'Delete',
  isLoading = false,
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="480px">
      <div className="modal-body">
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
          <div style={{
            background: '#fee2e2',
            padding: '0.65rem',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#dc2626',
            flexShrink: 0
          }}>
            <IconAlertTriangle size={24} />
          </div>
          <div>
            <p style={{ fontSize: '0.975rem', color: '#1e293b', fontWeight: 500, marginBottom: '0.5rem' }}>
              {message}
            </p>
            {note && (
              <p style={{ fontSize: '0.85rem', color: '#64748b', background: '#f8fafc', padding: '0.6rem 0.8rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                💡 <strong>Safety Note:</strong> {note}
              </p>
            )}
          </div>
        </div>
      </div>
      <div className="modal-footer">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onClose}
          disabled={isLoading}
        >
          Cancel
        </button>
        <button
          type="button"
          className="btn btn-danger"
          onClick={onConfirm}
          disabled={isLoading}
        >
          {isLoading ? 'Deleting...' : confirmButtonText}
        </button>
      </div>
    </Modal>
  );
}

