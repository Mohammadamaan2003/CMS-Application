import React, { useEffect } from 'react';
import { IconCheckCircle, IconAlertTriangle, IconClose } from './Icons';

export default function Toast({ toasts, onDismiss }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div
      className="toast-container"
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 999999,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        maxWidth: '420px',
        pointerEvents: 'none',
      }}
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, 4000);

    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const type = (toast.type || 'info').toLowerCase();

  const config = {
    success: {
      bg: '#ecfdf5',
      border: '#a7f3d0',
      color: '#065f46',
      icon: <IconCheckCircle size={18} style={{ color: '#059669', flexShrink: 0 }} />,
    },
    info: {
      bg: '#eff6ff',
      border: '#bfdbfe',
      color: '#1e40af',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" style={{ flexShrink: 0 }}>
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      ),
    },
    warning: {
      bg: '#fffbeb',
      border: '#fde68a',
      color: '#92400e',
      icon: <IconAlertTriangle size={18} style={{ color: '#d97706', flexShrink: 0 }} />,
    },
    error: {
      bg: '#fef2f2',
      border: '#fecaca',
      color: '#991b1b',
      icon: <IconAlertTriangle size={18} style={{ color: '#dc2626', flexShrink: 0 }} />,
    },
  }[type] || {
    bg: '#eff6ff',
    border: '#bfdbfe',
    color: '#1e40af',
    icon: <IconCheckCircle size={18} style={{ color: '#2563eb', flexShrink: 0 }} />,
  };

  return (
    <div
      className={`toast toast-${type}`}
      style={{
        pointerEvents: 'auto',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        backgroundColor: config.bg,
        border: `1px solid ${config.border}`,
        color: config.color,
        padding: '10px 14px',
        borderRadius: '8px',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        fontSize: '0.825rem',
        fontWeight: 500,
        minWidth: '280px',
        animation: 'slideInRight 0.25s ease-out',
      }}
    >
      {config.icon}
      <div className="toast-message" style={{ flex: 1, lineHeight: '1.4' }}>
        {toast.message}
      </div>
      <button
        type="button"
        className="toast-close"
        onClick={() => onDismiss(toast.id)}
        aria-label="Close notification"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: config.color,
          opacity: 0.7,
          padding: '2px',
          display: 'flex',
          alignItems: 'center',
          outline: 'none',
        }}
      >
        <IconClose size={15} />
      </button>
    </div>
  );
}
