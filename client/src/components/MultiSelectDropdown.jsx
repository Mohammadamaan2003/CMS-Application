import React, { useState, useRef, useEffect } from 'react';
import { IconChevronDown, IconCheck, IconX, IconFilter } from './Icons';

/**
 * Reusable Multi-Select Dropdown with Select All, Clear, Search, and Count Badges.
 * Matches Oracle APEX multi-select filter behavior.
 */
export default function MultiSelectDropdown({
  label,
  options = [],
  selected = [],
  onChange,
  placeholder = 'Select...',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter((opt) =>
    String(opt).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isAllSelected = options.length > 0 && selected.length === options.length;

  const handleToggleOption = (opt) => {
    if (selected.includes(opt)) {
      onChange(selected.filter((item) => item !== opt));
    } else {
      onChange([...selected, opt]);
    }
  };

  const handleSelectAll = () => {
    onChange([...options]);
  };

  const handleClear = () => {
    onChange([]);
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', minWidth: '170px' }}>
      {label && (
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '11px',
            fontWeight: 700,
            color: 'var(--text-main, #475569)',
            marginBottom: '4px',
            textTransform: 'uppercase',
            letterSpacing: '0.025em',
          }}
        >
          <span>{label}</span>
          {selected.length > 0 && (
            <span
              style={{
                background: 'var(--primary-accent, #0284c7)',
                color: '#ffffff',
                borderRadius: '10px',
                padding: '0 6px',
                fontSize: '10px',
                fontWeight: 700,
              }}
            >
              {selected.length}
            </span>
          )}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          height: '34px',
          padding: '0 10px',
          borderRadius: '6px',
          border: selected.length > 0 ? '1px solid var(--primary-accent, #0284c7)' : '1px solid var(--border, #cbd5e1)',
          background: selected.length > 0 ? 'rgba(56, 189, 248, 0.12)' : 'var(--bg-input, #ffffff)',
          color: selected.length > 0 ? 'var(--primary-accent, #38bdf8)' : 'var(--text-main, #334155)',
          fontSize: '12px',
          fontWeight: selected.length > 0 ? 600 : 400,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          textAlign: 'left',
          transition: 'all 0.15s ease',
        }}
        title={selected.length > 0 ? selected.join(', ') : placeholder}
      >
        <span
          style={{
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: '135px',
          }}
        >
          {selected.length === 0
            ? placeholder
            : selected.length === 1
            ? selected[0]
            : `${selected.length} selected`}
        </span>
        <IconChevronDown
          size={14}
          style={{
            color: selected.length > 0 ? 'var(--primary-accent, #38bdf8)' : 'var(--text-muted, #94a3b8)',
            transform: isOpen ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.15s ease',
            flexShrink: 0,
            marginLeft: '4px',
          }}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="multi-select-dropdown"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            zIndex: 1000,
            width: '260px',
            background: 'var(--bg-dropdown, var(--bg-surface, #ffffff))',
            borderRadius: '8px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.2)',
            border: '1px solid var(--border, #e2e8f0)',
            padding: '8px',
            maxHeight: '320px',
            display: 'flex',
            flexDirection: 'column',
            color: 'var(--text-main, #334155)',
          }}
        >
          {/* Action Header: Select All & Clear */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: '8px',
              borderBottom: '1px solid var(--border, #f1f5f9)',
              marginBottom: '8px',
            }}
          >
            <button
              type="button"
              onClick={handleSelectAll}
              disabled={isAllSelected}
              style={{
                background: 'none',
                border: 'none',
                color: isAllSelected ? 'var(--text-muted, #94a3b8)' : 'var(--primary-accent, #38bdf8)',
                fontSize: '11px',
                fontWeight: 600,
                cursor: isAllSelected ? 'default' : 'pointer',
                padding: '2px 6px',
                borderRadius: '4px',
              }}
            >
              Select All
            </button>
            <button
              type="button"
              onClick={handleClear}
              disabled={selected.length === 0}
              style={{
                background: 'none',
                border: 'none',
                color: selected.length === 0 ? 'var(--text-muted, #94a3b8)' : '#ef4444',
                fontSize: '11px',
                fontWeight: 600,
                cursor: selected.length === 0 ? 'default' : 'pointer',
                padding: '2px 6px',
                borderRadius: '4px',
              }}
            >
              Clear Selection
            </button>
          </div>

          {/* Quick Search in Options */}
          {options.length > 5 && (
            <div style={{ marginBottom: '8px' }}>
              <input
                type="text"
                placeholder="Search options..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  height: '28px',
                  padding: '0 8px',
                  borderRadius: '4px',
                  border: '1px solid var(--border, #cbd5e1)',
                  backgroundColor: 'var(--bg-input, #ffffff)',
                  fontSize: '11px',
                  color: 'var(--text-main, #1e293b)',
                  outline: 'none',
                }}
                autoFocus
              />
            </div>
          )}

          {/* Options List */}
          <div
            style={{
              overflowY: 'auto',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
            }}
          >
            {filteredOptions.length === 0 ? (
              <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted, #94a3b8)', fontSize: '11px' }}>
                No matches found
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isChecked = selected.includes(opt);
                return (
                  <div
                    key={opt}
                    onClick={() => handleToggleOption(opt)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '5px 8px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      background: isChecked ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                      color: isChecked ? 'var(--primary-accent, #38bdf8)' : 'var(--text-main, #334155)',
                      fontSize: '12px',
                      transition: 'background 0.1s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (!isChecked) e.currentTarget.style.background = 'var(--bg-muted, #f8fafc)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isChecked) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}} // handled by parent div
                      style={{ cursor: 'pointer', accentColor: '#2563eb' }}
                    />
                    <span
                      style={{
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        flex: 1,
                      }}
                      title={opt}
                    >
                      {opt}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
