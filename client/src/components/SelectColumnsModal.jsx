import React, { useState, useEffect, useMemo } from 'react';
import {
  IconClose,
  IconUndo,
  IconArrowUp,
  IconArrowDown,
  IconArrowToTop,
  IconArrowToBottom,
} from './Icons';

/**
 * SelectColumnsModal
 *
 * Implements the Oracle APEX Dual Shuttle Column Selector matching screenshot:
 * Left: "Do Not Display"
 * Middle: Shuttle controls (Reset, Move All Right, Move Right, Move Left, Move All Left)
 * Right: "Display in Report"
 * Far Right: Ordering controls (Top, Up, Down, Bottom)
 *
 * Accepts all naming conventions used across the project:
 * - Columns: allColumns || columns || availableColumns
 * - Visible Keys: visibleColumnKeys || visibleKeys || visibleColumns || selectedKeys
 * - Default Keys: defaultVisibleKeys || defaultKeys
 * - Save Handler: onApply || onSave
 * - Reset Handler: onReset
 */
export default function SelectColumnsModal({
  isOpen = true,
  onClose,
  allColumns,
  columns,
  availableColumns,
  visibleColumnKeys,
  visibleKeys,
  visibleColumns,
  selectedKeys,
  defaultVisibleKeys,
  defaultKeys,
  onApply,
  onSave,
  onReset,
}) {
  // Normalize incoming columns
  const rawColumns = allColumns || columns || availableColumns || [];
  // Normalize incoming visible keys
  const rawVisibleKeys = visibleColumnKeys || visibleKeys || visibleColumns || selectedKeys || [];
  // Normalize defaults
  const rawDefaultKeys = defaultVisibleKeys || defaultKeys;

  // 1. Normalize all columns into standard Array<{ key: string, label: string }>
  const normalizedColumns = useMemo(() => {
    const list = Array.isArray(rawColumns) ? rawColumns : [];
    return list.map((c, idx) => {
      if (typeof c === 'string') {
        return {
          key: c,
          label: c.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
        };
      }
      if (c && typeof c === 'object') {
        const key = c.key || c.id || c.name || c.dataIndex || `col_${idx}`;
        const label = c.label || c.title || c.header || c.name || key;
        return { key: String(key), label: String(label) };
      }
      return { key: `col_${idx}`, label: `Column ${idx + 1}` };
    });
  }, [rawColumns]);

  // Map key -> column object for quick lookup
  const columnMap = useMemo(() => {
    return new Map(normalizedColumns.map((c) => [c.key, c]));
  }, [normalizedColumns]);

  // 2. Normalize visible keys into Array<string>
  const normalizedVisibleKeys = useMemo(() => {
    let list = [];
    if (rawVisibleKeys instanceof Set) {
      list = Array.from(rawVisibleKeys);
    } else if (Array.isArray(rawVisibleKeys)) {
      list = rawVisibleKeys;
    }
    return list
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object') return item.key || item.id || item.name;
        return String(item);
      })
      .filter(Boolean);
  }, [rawVisibleKeys]);

  // Ordered visible column keys
  const [displayedKeys, setDisplayedKeys] = useState([]);
  // Hidden column keys
  const [hiddenKeys, setHiddenKeys] = useState([]);

  // Selected keys in left (hidden) and right (displayed)
  const [selectedHiddenKeys, setSelectedHiddenKeys] = useState(new Set());
  const [selectedDisplayedKeys, setSelectedDisplayedKeys] = useState(new Set());

  // Initialize lists whenever modal opens or columns change
  useEffect(() => {
    if (isOpen) {
      const allKeysSet = new Set(normalizedColumns.map((c) => c.key));

      // Filter visible keys that exist in allColumns
      let validVisible = normalizedVisibleKeys.filter((k) => allKeysSet.has(k));

      // If no valid visible keys were passed, fallback to default or all columns
      if (validVisible.length === 0 && normalizedColumns.length > 0) {
        if (Array.isArray(rawDefaultKeys) && rawDefaultKeys.length > 0) {
          validVisible = rawDefaultKeys.filter((k) => allKeysSet.has(k));
        } else {
          validVisible = normalizedColumns.map((c) => c.key);
        }
      }

      const visibleSet = new Set(validVisible);
      const hidden = normalizedColumns.filter((c) => !visibleSet.has(c.key)).map((c) => c.key);

      setDisplayedKeys(validVisible);
      setHiddenKeys(hidden);
      setSelectedHiddenKeys(new Set());
      setSelectedDisplayedKeys(new Set());
    }
  }, [isOpen, normalizedColumns, normalizedVisibleKeys, rawDefaultKeys]);

  if (!isOpen) return null;

  // Toggle selection in hidden list
  const toggleSelectHidden = (key, isMulti = false) => {
    const next = new Set(isMulti ? selectedHiddenKeys : []);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    setSelectedHiddenKeys(next);
  };

  // Toggle selection in displayed list
  const toggleSelectDisplayed = (key, isMulti = false) => {
    const next = new Set(isMulti ? selectedDisplayedKeys : []);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    setSelectedDisplayedKeys(next);
  };

  // Shuttle Actions
  // 1. Reset to initial default
  const handleReset = () => {
    if (onReset) {
      try {
        onReset();
      } catch (err) {}
    }
    const defKeys = Array.isArray(rawDefaultKeys) && rawDefaultKeys.length > 0
      ? rawDefaultKeys
      : normalizedColumns.map((c) => c.key);
    const defSet = new Set(defKeys);
    const defDisplayed = defKeys.filter((k) => columnMap.has(k));
    const defHidden = normalizedColumns.filter((c) => !defSet.has(c.key)).map((c) => c.key);

    setDisplayedKeys(defDisplayed);
    setHiddenKeys(defHidden);
    setSelectedHiddenKeys(new Set());
    setSelectedDisplayedKeys(new Set());
  };

  // 2. Move All to Display (>>)
  const handleMoveAllRight = () => {
    setDisplayedKeys([...displayedKeys, ...hiddenKeys]);
    setHiddenKeys([]);
    setSelectedHiddenKeys(new Set());
  };

  // 3. Move Selected to Display (>)
  const handleMoveSelectedRight = () => {
    if (selectedHiddenKeys.size === 0) return;
    const toMove = hiddenKeys.filter((k) => selectedHiddenKeys.has(k));
    setDisplayedKeys([...displayedKeys, ...toMove]);
    setHiddenKeys(hiddenKeys.filter((k) => !selectedHiddenKeys.has(k)));
    setSelectedHiddenKeys(new Set());
  };

  // 4. Move Selected to Hidden (<)
  const handleMoveSelectedLeft = () => {
    if (selectedDisplayedKeys.size === 0) return;
    const toMove = displayedKeys.filter((k) => selectedDisplayedKeys.has(k));
    setHiddenKeys([...hiddenKeys, ...toMove]);
    setDisplayedKeys(displayedKeys.filter((k) => !selectedDisplayedKeys.has(k)));
    setSelectedDisplayedKeys(new Set());
  };

  // 5. Move All to Hidden (<<)
  const handleMoveAllLeft = () => {
    setHiddenKeys([...hiddenKeys, ...displayedKeys]);
    setDisplayedKeys([]);
    setSelectedDisplayedKeys(new Set());
  };

  // Double click handlers
  const handleDoubleClickHidden = (key) => {
    setDisplayedKeys((prev) => [...prev, key]);
    setHiddenKeys((prev) => prev.filter((k) => k !== key));
    setSelectedHiddenKeys(new Set());
  };

  const handleDoubleClickDisplayed = (key) => {
    setHiddenKeys((prev) => [...prev, key]);
    setDisplayedKeys((prev) => prev.filter((k) => k !== key));
    setSelectedDisplayedKeys(new Set());
  };

  // Ordering Actions for Displayed List
  // Move to Top (⤒)
  const handleMoveToTop = () => {
    if (selectedDisplayedKeys.size === 0) return;
    const selected = displayedKeys.filter((k) => selectedDisplayedKeys.has(k));
    const rest = displayedKeys.filter((k) => !selectedDisplayedKeys.has(k));
    setDisplayedKeys([...selected, ...rest]);
  };

  // Move Up (▲)
  const handleMoveUp = () => {
    if (selectedDisplayedKeys.size === 0) return;
    const items = [...displayedKeys];
    for (let i = 1; i < items.length; i++) {
      if (selectedDisplayedKeys.has(items[i]) && !selectedDisplayedKeys.has(items[i - 1])) {
        const temp = items[i];
        items[i] = items[i - 1];
        items[i - 1] = temp;
      }
    }
    setDisplayedKeys(items);
  };

  // Move Down (▼)
  const handleMoveDown = () => {
    if (selectedDisplayedKeys.size === 0) return;
    const items = [...displayedKeys];
    for (let i = items.length - 2; i >= 0; i--) {
      if (selectedDisplayedKeys.has(items[i]) && !selectedDisplayedKeys.has(items[i + 1])) {
        const temp = items[i];
        items[i] = items[i + 1];
        items[i + 1] = temp;
      }
    }
    setDisplayedKeys(items);
  };

  // Move to Bottom (⤓)
  const handleMoveToBottom = () => {
    if (selectedDisplayedKeys.size === 0) return;
    const selected = displayedKeys.filter((k) => selectedDisplayedKeys.has(k));
    const rest = displayedKeys.filter((k) => !selectedDisplayedKeys.has(k));
    setDisplayedKeys([...rest, ...selected]);
  };

  // Apply / Save
  const handleApply = () => {
    if (onApply) {
      onApply(displayedKeys);
    }
    if (onSave) {
      onSave(displayedKeys);
    }
    onClose();
  };

  return (
    <div className="apex-modal-overlay" style={{ zIndex: 1200 }}>
      <div
        className="apex-modal-card apex-shuttle-modal"
        role="dialog"
        aria-modal="true"
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          boxShadow: '0 20px 45px rgba(0,0,0,0.25)',
          overflow: 'hidden',
        }}
      >
        {/* Header matching Oracle APEX Reference Screenshot */}
        <div
          className="apex-modal-header"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '14px 20px',
            backgroundColor: '#ffffff',
            borderBottom: '1px solid #f1f5f9',
          }}
        >
          <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#1e293b' }}>
            Columns
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="apex-modal-close"
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              border: '1px solid #e2e8f0',
              background: '#ffffff',
              color: '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              transition: 'all 0.15s ease',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#f1f5f9';
              e.currentTarget.style.color = '#0f172a';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = '#ffffff';
              e.currentTarget.style.color = '#64748b';
            }}
          >
            <IconClose size={14} />
          </button>
        </div>

        {/* Body Dual List Shuttle */}
        <div className="apex-modal-body" style={{ padding: '1.5rem' }}>
          <div className="apex-shuttle-container">
            {/* Left: Do Not Display */}
            <div className="apex-shuttle-box-wrapper">
              <div className="apex-shuttle-header">Do Not Display</div>
              <div
                className="apex-shuttle-listbox"
                tabIndex={0}
                aria-label="Do Not Display Columns"
              >
                {hiddenKeys.length === 0 ? (
                  <div style={{ padding: '1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>
                    All columns displayed
                  </div>
                ) : (
                  hiddenKeys.map((key) => {
                    const col = columnMap.get(key);
                    const isSelected = selectedHiddenKeys.has(key);
                    return (
                      <div
                        key={key}
                        className={`apex-shuttle-item ${isSelected ? 'selected' : ''}`}
                        onClick={(e) => toggleSelectHidden(key, e.ctrlKey || e.metaKey)}
                        onDoubleClick={() => handleDoubleClickHidden(key)}
                        title="Double-click to display in report"
                      >
                        {col ? col.label : key}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Center Shuttle Controls */}
            <div className="apex-shuttle-controls">
              <button
                type="button"
                className="apex-shuttle-btn"
                title="Reset to default"
                onClick={handleReset}
              >
                <IconUndo size={14} />
              </button>
              <button
                type="button"
                className="apex-shuttle-btn"
                title="Display All"
                onClick={handleMoveAllRight}
                disabled={hiddenKeys.length === 0}
              >
                &gt;&gt;
              </button>
              <button
                type="button"
                className="apex-shuttle-btn"
                title="Display Selected"
                onClick={handleMoveSelectedRight}
                disabled={selectedHiddenKeys.size === 0}
              >
                &gt;
              </button>
              <button
                type="button"
                className="apex-shuttle-btn"
                title="Hide Selected"
                onClick={handleMoveSelectedLeft}
                disabled={selectedDisplayedKeys.size === 0}
              >
                &lt;
              </button>
              <button
                type="button"
                className="apex-shuttle-btn"
                title="Hide All"
                onClick={handleMoveAllLeft}
                disabled={displayedKeys.length === 0}
              >
                &lt;&lt;
              </button>
            </div>

            {/* Right: Display in Report */}
            <div className="apex-shuttle-box-wrapper">
              <div className="apex-shuttle-header">Display in Report</div>
              <div
                className="apex-shuttle-listbox"
                tabIndex={0}
                aria-label="Display in Report Columns"
              >
                {displayedKeys.length === 0 ? (
                  <div style={{ padding: '1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>
                    No columns displayed
                  </div>
                ) : (
                  displayedKeys.map((key) => {
                    const col = columnMap.get(key);
                    const isSelected = selectedDisplayedKeys.has(key);
                    return (
                      <div
                        key={key}
                        className={`apex-shuttle-item ${isSelected ? 'selected' : ''}`}
                        onClick={(e) => toggleSelectDisplayed(key, e.ctrlKey || e.metaKey)}
                        onDoubleClick={() => handleDoubleClickDisplayed(key)}
                        title="Double-click to hide from report"
                      >
                        {col ? col.label : key}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Far Right Ordering Controls */}
            <div className="apex-shuttle-reorder-controls">
              <button
                type="button"
                className="apex-shuttle-btn"
                title="Move to Top"
                onClick={handleMoveToTop}
                disabled={selectedDisplayedKeys.size === 0}
              >
                <IconArrowToTop size={14} />
              </button>
              <button
                type="button"
                className="apex-shuttle-btn"
                title="Move Up"
                onClick={handleMoveUp}
                disabled={selectedDisplayedKeys.size === 0}
              >
                <IconArrowUp size={14} />
              </button>
              <button
                type="button"
                className="apex-shuttle-btn"
                title="Move Down"
                onClick={handleMoveDown}
                disabled={selectedDisplayedKeys.size === 0}
              >
                <IconArrowDown size={14} />
              </button>
              <button
                type="button"
                className="apex-shuttle-btn"
                title="Move to Bottom"
                onClick={handleMoveToBottom}
                disabled={selectedDisplayedKeys.size === 0}
              >
                <IconArrowToBottom size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Footer with Cancel & Purple Apply Button */}
        <div
          className="apex-modal-footer"
          style={{
            borderTop: '1px solid #f1f5f9',
            padding: '12px 20px',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
            backgroundColor: '#ffffff',
            borderBottomLeftRadius: '10px',
            borderBottomRightRadius: '10px',
          }}
        >
          <button
            type="button"
            className="apex-modal-cancel-btn"
            style={{
              height: '34px',
              padding: '0 16px',
              borderRadius: '6px',
              border: '1px solid #e2e8f0',
              background: '#ffffff',
              color: '#475569',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background-color 0.15s ease',
            }}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="apex-modal-apply-btn"
            style={{
              height: '34px',
              padding: '0 20px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: '#7048e8',
              color: '#ffffff',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(112, 72, 232, 0.35)',
              transition: 'background-color 0.15s ease',
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#5f3dc4')}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#7048e8')}
            onClick={handleApply}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
