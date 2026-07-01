import { useRef, useState } from 'react';
import { Icon } from '@/icons/Icon';
import { Button } from './Button';
import { Menu, type MenuOption } from './Menu';
import { Select } from './Select';
import './FilterBar.css';

/**
 * Add-a-filter menu (spec/ui-standards/tables.md#filtering): a "Filters" dropdown
 * lists filters not yet applied; choosing one activates it as an inline typed
 * control. Active filters drop out of the dropdown. "Remove all filters" clears
 * every applied value. State is owned by the caller and bound to the URL.
 *
 * Stage 2 implements the `enum` type (the stocktake status filter). More types
 * (text/date/number/boolean/group) extend this same pattern.
 */
export interface FilterDef {
  key: string;
  label: string;
  type: 'enum';
  options: { value: string; label: string }[];
}

interface FilterBarProps {
  filters: FilterDef[];
  values: Record<string, string | null>;
  onChange: (key: string, value: string | null) => void;
  onRemoveAll: () => void;
}

export function FilterBar({ filters, values, onChange, onRemoveAll }: FilterBarProps) {
  // A filter is active if it has a value or the user added it from the dropdown.
  const [added, setAdded] = useState<Set<string>>(
    () => new Set(filters.filter((f) => values[f.key] != null).map((f) => f.key)),
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const addRef = useRef<HTMLButtonElement>(null);

  const isActive = (key: string) => added.has(key) || values[key] != null;
  const activeFilters = filters.filter((f) => isActive(f.key));
  const available = filters.filter((f) => !isActive(f.key));

  const activate = (key: string) => {
    setAdded((s) => new Set(s).add(key));
  };
  const remove = (key: string) => {
    setAdded((s) => {
      const next = new Set(s);
      next.delete(key);
      return next;
    });
    onChange(key, null);
  };

  const addOptions: MenuOption[] = [
    ...available.map((f) => ({
      key: f.key,
      label: f.label,
      icon: 'plus' as const,
      onSelect: () => activate(f.key),
    })),
    ...(activeFilters.length > 0
      ? [
          {
            key: '__removeAll',
            label: 'Remove all filters',
            icon: 'minus-circle' as const,
            destructive: true,
            onSelect: () => {
              setAdded(new Set());
              onRemoveAll();
            },
          },
        ]
      : []),
  ];

  return (
    <div className="oms-filterbar">
      <Button
        ref={addRef}
        variant="secondary"
        size="compact"
        icon="filter"
        onClick={() => setMenuOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
      >
        Filters
      </Button>
      <Menu
        anchorRef={addRef}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        options={
          addOptions.length > 0
            ? addOptions
            : [{ key: '__none', label: 'All filters applied', disabled: true }]
        }
      />

      {activeFilters.map((f) => (
        <div key={f.key} className="oms-filterbar__chip">
          <span className="oms-filterbar__chip-label">{f.label}</span>
          <div className="oms-filterbar__chip-control">
            <Select
              size="compact"
              options={f.options}
              value={values[f.key] ?? null}
              onChange={(v) => onChange(f.key, v)}
              placeholder={`Any ${f.label.toLowerCase()}`}
              ariaLabel={f.label}
            />
          </div>
          <button
            type="button"
            className="oms-filterbar__chip-remove"
            aria-label={`Remove ${f.label} filter`}
            onClick={() => remove(f.key)}
          >
            <Icon name="close" size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
