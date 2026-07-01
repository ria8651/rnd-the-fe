import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Icon } from '@/icons/Icon';
import { FieldShell } from './Field';
import { Popover } from './Popover';
import './Select.css';

/**
 * Single-select dropdown per spec/ui-standards/controls.md#single-select-dropdown:
 * a type-to-filter combobox (combobox + listbox), NOT the native <select>.
 *  - trigger shows the selected label (or placeholder) + disclosure chevron
 *  - typing filters options in place (case-insensitive substring)
 *  - selected option marked (check); a separate active option tracks keyboard focus
 *  - clearability follows optionality (divergence D5): optional shows a clear ×
 *    when a value is set; required never does
 *  - full keyboard model; disabled options shown but skipped
 */
export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps {
  value: string | null;
  onChange: (value: string | null) => void;
  options: SelectOption[];
  /** Optional fields are clearable (D5). Defaults to true. */
  optional?: boolean;
  placeholder?: string;
  label?: string;
  error?: string;
  hint?: string;
  disabled?: boolean;
  size?: 'default' | 'compact';
  emptyMessage?: string;
  className?: string;
  ariaLabel?: string;
  /**
   * When provided, the parent drives filtering (e.g. server-side search): the
   * typed query is reported here and the given options are shown as-is (no
   * client-side substring filter).
   */
  onQueryChange?: (query: string) => void;
}

export function Select({
  value,
  onChange,
  options,
  optional = true,
  placeholder = 'Select…',
  label,
  error,
  hint,
  disabled,
  size = 'default',
  emptyMessage = 'No matches',
  className,
  ariaLabel,
  onQueryChange,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const selected = options.find((o) => o.value === value) ?? null;

  const filtered = useMemo(() => {
    // Server-driven mode: parent filters, show options as-is.
    if (onQueryChange) return options;
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query, onQueryChange]);

  // When (re)opening, start unfiltered and highlight the selected option.
  useEffect(() => {
    if (open) {
      const idx = filtered.findIndex((o) => o.value === value);
      setActive(idx >= 0 ? idx : firstEnabled(filtered));
    } else {
      setQuery('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Keep the active index within the filtered set as the user types.
  useEffect(() => {
    setActive((a) => Math.min(Math.max(0, a), Math.max(0, filtered.length - 1)));
  }, [filtered.length]);

  const commit = (opt: SelectOption | undefined) => {
    if (!opt || opt.disabled) return;
    onChange(opt.value);
    setOpen(false);
    inputRef.current?.focus();
  };

  const clear = () => {
    onChange(null);
    setOpen(false);
    inputRef.current?.focus();
  };

  const moveActive = (dir: 1 | -1) => {
    if (filtered.length === 0) return;
    let i = active;
    for (let step = 0; step < filtered.length; step++) {
      i = (i + dir + filtered.length) % filtered.length;
      if (!filtered[i].disabled) break;
    }
    setActive(i);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!open) setOpen(true);
        else moveActive(1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (!open) setOpen(true);
        else moveActive(-1);
        break;
      case 'Home':
        if (open) {
          e.preventDefault();
          setActive(firstEnabled(filtered));
        }
        break;
      case 'End':
        if (open) {
          e.preventDefault();
          setActive(lastEnabled(filtered));
        }
        break;
      case 'Enter':
        if (open) {
          e.preventDefault();
          commit(filtered[active]);
        } else {
          setOpen(true);
        }
        break;
      case ' ':
        if (!open) {
          e.preventDefault();
          setOpen(true);
        }
        break;
      case 'Escape':
        if (open) {
          e.preventDefault();
          setOpen(false);
        }
        break;
      case 'Tab':
        setOpen(false);
        break;
    }
  };

  const showClear = optional && value != null && !disabled;
  const displayValue = open ? query : (selected?.label ?? '');

  return (
    <FieldShell label={label} error={error} hint={hint} className={className}>
      <div ref={wrapRef} className={`oms-select oms-select--${size}`}>
        <div
          className={`oms-select__control${error ? ' is-invalid' : ''}${
            disabled ? ' is-disabled' : ''
          }`}
        >
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={
              open && filtered[active] ? `${listId}-opt-${active}` : undefined
            }
            aria-label={ariaLabel ?? (typeof label === 'string' ? label : undefined)}
            aria-invalid={error ? true : undefined}
            className="oms-select__input"
            value={displayValue}
            placeholder={selected ? selected.label : placeholder}
            disabled={disabled}
            onChange={(e) => {
              setQuery(e.target.value);
              onQueryChange?.(e.target.value);
              if (!open) setOpen(true);
            }}
            onMouseDown={() => {
              if (!disabled && !open) setOpen(true);
            }}
            onKeyDown={onKeyDown}
          />
          {showClear && (
            <button
              type="button"
              className="oms-select__clear"
              aria-label="Clear selection"
              title="Clear"
              onClick={clear}
              tabIndex={0}
            >
              <Icon name="close" size={16} />
            </button>
          )}
          <button
            type="button"
            className="oms-select__chevron"
            aria-label={open ? 'Close options' : 'Open options'}
            tabIndex={-1}
            disabled={disabled}
            onMouseDown={(e) => {
              e.preventDefault();
              setOpen((o) => !o);
              inputRef.current?.focus();
            }}
          >
            <Icon name="chevron-down" size={18} />
          </button>
        </div>

        <Popover
          anchorRef={wrapRef}
          open={open}
          onClose={() => setOpen(false)}
          matchWidth
          returnFocus={false}
          role="presentation"
        >
          <ul id={listId} role="listbox" className="oms-select__list">
            {filtered.length === 0 ? (
              <li className="oms-menu-empty">{emptyMessage}</li>
            ) : (
              filtered.map((opt, i) => (
                <li
                  key={opt.value}
                  id={`${listId}-opt-${i}`}
                  role="option"
                  aria-selected={opt.value === value}
                  aria-disabled={opt.disabled || undefined}
                  className={`oms-menu-item${i === active ? ' is-active' : ''}${
                    opt.disabled ? ' is-disabled' : ''
                  }`}
                  onMouseEnter={() => !opt.disabled && setActive(i)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    commit(opt);
                  }}
                >
                  <span className="oms-select__opt-label">{opt.label}</span>
                  {opt.value === value && (
                    <Icon name="check" size={16} className="oms-menu-item__check" />
                  )}
                </li>
              ))
            )}
          </ul>
        </Popover>
      </div>
    </FieldShell>
  );
}

function firstEnabled(opts: SelectOption[]): number {
  const i = opts.findIndex((o) => !o.disabled);
  return i >= 0 ? i : 0;
}
function lastEnabled(opts: SelectOption[]): number {
  for (let i = opts.length - 1; i >= 0; i--) if (!opts[i].disabled) return i;
  return 0;
}
