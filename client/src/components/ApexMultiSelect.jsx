import React, { useState, useRef, useEffect, useMemo } from 'react';
import { IconChevronDown, IconSearch, IconX } from './Icons';

/**
 * ApexMultiSelect
 *
 * Oracle APEX style Multi-Select filter component matching screenshots:
 * - Trigger shows truncated selected labels + count badge (e.g. "MARI... [1]")
 * - Dropdown menu with quick search, Select All, and Clear Selection
 * - Checkboxes for each option with responsive hover states
 * - Dual-theme support (Light Mode and Dark Mode aware)
 */
export default function ApexMultiSelect({
  label,
  options = [],
  value = [],
  onChange,
  placeholder = '',
  disabled = false,
  style = {},
  required = false,
  helperText = null,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Normalize selected value to array of strings
  const selectedValues = useMemo(() => {
    if (!value) return [];
    if (Array.isArray(value)) return value.map(String).filter((v) => v !== '');
    if (typeof value === 'string' && value.trim() !== '') {
      return value.split(',').map((s) => s.trim()).filter(Boolean);
    }
    return [];
  }, [value]);

  // Clean options: unique strings
  const cleanOptions = useMemo(() => {
    const set = new Set();
    options.forEach((opt) => {
      if (opt !== undefined && opt !== null) {
        const s = String(opt).trim();
        if (s !== '' && s !== '- All -' && s !== 'All') {
          set.add(s);
        }
      }
    });
    return Array.from(set);
  }, [options]);

  // Filtered options based on search term
  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return cleanOptions;
    const q = searchTerm.trim().toLowerCase();
    return cleanOptions.filter((opt) => opt.toLowerCase().includes(q));
  }, [cleanOptions, searchTerm]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      setTimeout(() => {
        if (searchInputRef.current) searchInputRef.current.focus();
      }, 50);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleToggleOption = (opt) => {
    const strOpt = String(opt);
    let next;
    if (selectedValues.includes(strOpt)) {
      next = selectedValues.filter((v) => v !== strOpt);
    } else {
      next = [...selectedValues, strOpt];
    }
    onChange(next);
  };

  const handleSelectAll = () => {
    const nextSet = new Set([...selectedValues, ...filteredOptions]);
    onChange(Array.from(nextSet));
  };

  const handleClear = () => {
    onChange([]);
    setSearchTerm('');
  };

  // Trigger label display logic
  const displayLabel = useMemo(() => {
    if (selectedValues.length === 0) return placeholder || '';
    if (selectedValues.length === 1) {
      const val = selectedValues[0];
      return val.length > 12 ? `${val.slice(0, 9)}...` : val;
    }
    return `${selectedValues.length} selected`;
  }, [selectedValues, placeholder]);

  return (
    <div
      ref={containerRef}
      className="apex-multiselect-container"
      style={{
        position: 'relative',
        width: '100%',
        userSelect: 'none',
        ...style,
      }}
    >
      {label && (
        <label
          className="apex-multiselect-label"
          style={{
            display: 'block',
            fontSize: '0.8rem',
            fontWeight: 700,
            marginBottom: '5px',
            color: 'var(--text-main, #0f172a)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
          title={label}
        >
          {label}
        </label>
      )}

      {/* Trigger Box */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className="apex-multiselect-trigger"
        style={{
          width: '100%',
          height: '36px',
          backgroundColor: 'var(--bg-input, #ffffff)',
          border: isOpen
            ? '1px solid var(--primary, #2563eb)'
            : selectedValues.length > 0
            ? '1px solid var(--primary-accent, #38bdf8)'
            : '1px solid var(--border, #cbd5e1)',
          borderRadius: '6px',
          padding: '0 8px 0 10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: disabled ? 'not-allowed' : 'pointer',
          fontSize: '0.825rem',
          color: selectedValues.length > 0 ? 'var(--text-main, #0f172a)' : 'var(--text-muted, #94a3b8)',
          boxShadow: isOpen ? '0 0 0 2px rgba(37, 99, 235, 0.25)' : 'none',
          transition: 'all 0.15s ease',
          outline: 'none',
        }}
        title={selectedValues.length > 0 ? selectedValues.join(', ') : 'Click to select multiple options'}
      >
        <span
          style={{
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: selectedValues.length > 0 ? 'calc(100% - 46px)' : 'calc(100% - 24px)',
            fontWeight: selectedValues.length > 0 ? 600 : 400,
          }}
        >
          {displayLabel}
        </span>

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          {selectedValues.length > 0 && (
            <span
              style={{
                backgroundColor: 'rgba(56, 189, 248, 0.2)',
                color: '#38bdf8',
                borderRadius: '10px',
                padding: '0 6px',
                fontSize: '0.72rem',
                fontWeight: 700,
                lineHeight: '18px',
                minWidth: '18px',
                textAlign: 'center',
              }}
            >
              {selectedValues.length}
            </span>
          )}

          <IconChevronDown
            size={14}
            style={{
              color: 'var(--text-muted, #94a3b8)',
              transform: isOpen ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.15s ease',
            }}
          />
        </div>
      </button>

      {helperText && (
        <span
          style={{
            fontSize: '0.7rem',
            color: 'var(--text-muted, #94a3b8)',
            marginTop: '2px',
            display: 'block',
          }}
        >
          {helperText}
        </span>
      )}

      {/* Dropdown Menu Popup */}
      {isOpen && (
        <div
          className="apex-multiselect-dropdown"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            zIndex: 1050,
            width: '100%',
            minWidth: '240px',
            maxWidth: '360px',
            backgroundColor: 'var(--bg-dropdown, var(--bg-surface, #ffffff))',
            border: '1px solid var(--border, #cbd5e1)',
            borderRadius: '8px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.2)',
            padding: '8px',
            maxHeight: '300px',
            display: 'flex',
            flexDirection: 'column',
            color: 'var(--text-main, #0f172a)',
          }}
        >
          {/* Action Header: Select All / Clear */}
          <div
            className="apex-multiselect-header"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: '6px',
              borderBottom: '1px solid var(--border, #f1f5f9)',
              marginBottom: '6px',
            }}
          >
            <button
              type="button"
              onClick={handleSelectAll}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--primary-accent, #38bdf8)',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                padding: '2px 4px',
              }}
            >
              Select All
            </button>
            <button
              type="button"
              onClick={handleClear}
              disabled={selectedValues.length === 0}
              style={{
                background: 'none',
                border: 'none',
                color: selectedValues.length === 0 ? 'var(--text-muted, #94a3b8)' : '#ef4444',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: selectedValues.length === 0 ? 'default' : 'pointer',
                padding: '2px 4px',
              }}
            >
              Clear ({selectedValues.length})
            </button>
          </div>

          {/* Search Box in Options */}
          {cleanOptions.length > 5 && (
            <div className="apex-multiselect-search" style={{ position: 'relative', marginBottom: '6px' }}>
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  height: '28px',
                  backgroundColor: 'var(--bg-input, #f8fafc)',
                  border: '1px solid var(--border, #cbd5e1)',
                  borderRadius: '4px',
                  padding: '0 8px',
                  fontSize: '0.75rem',
                  color: 'var(--text-main, #0f172a)',
                  outline: 'none',
                }}
              />
            </div>
          )}

          {/* Options List with Checkboxes */}
          <div
            className="apex-multiselect-list"
            style={{
              overflowY: 'auto',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
              maxHeight: '200px',
            }}
          >
            {filteredOptions.length === 0 ? (
              <div
                style={{
                  padding: '12px',
                  textAlign: 'center',
                  color: 'var(--text-muted, #94a3b8)',
                  fontSize: '0.75rem',
                }}
              >
                No options found
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isChecked = selectedValues.includes(String(opt));
                return (
                  <label
                    key={opt}
                    onClick={() => handleToggleOption(opt)}
                    className={`apex-multiselect-item ${isChecked ? 'selected' : ''}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '5px 8px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      backgroundColor: isChecked ? 'rgba(37, 99, 235, 0.15)' : 'transparent',
                      color: isChecked ? 'var(--primary-accent, #38bdf8)' : 'var(--text-main, #0f172a)',
                      fontSize: '0.8rem',
                      fontWeight: isChecked ? 600 : 400,
                      transition: 'background-color 0.1s ease',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}} // handled by parent label
                      style={{ cursor: 'pointer', accentColor: '#2563eb' }}
                    />
                    <span
                      style={{
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        flex: 1,
                        color: 'inherit',
                      }}
                      title={opt}
                    >
                      {opt}
                    </span>
                  </label>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
