import { useRef, useState } from 'react';
import { Icon, type IconName } from '@/icons/Icon';
import { Menu, type MenuOption } from './Menu';
import './SplitButton.css';

/**
 * Split (multi-action) button per spec/ui-standards/controls.md#split-multi-action-button.
 * One default target + alternatives, most notably advancing a document's status.
 *  - primary segment fires the currently-selected action directly
 *  - disclosure chevron opens a menu of ALL options; picking one makes it the new
 *    primary and remembers it — it does NOT fire immediately
 *  - invalid options are shown but disabled; the selected one is marked
 */
export interface SplitAction {
  key: string;
  label: string;
  disabled?: boolean;
}

interface SplitButtonProps {
  options: SplitAction[];
  selectedKey: string;
  onSelectedChange: (key: string) => void;
  onActivate: (key: string) => void;
  icon?: IconName;
  busy?: boolean;
}

export function SplitButton({
  options,
  selectedKey,
  onSelectedChange,
  onActivate,
  icon = 'arrow-right',
  busy = false,
}: SplitButtonProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const discRef = useRef<HTMLButtonElement>(null);

  const selected = options.find((o) => o.key === selectedKey) ?? options[0];

  const menuOptions: MenuOption[] = options.map((o) => ({
    key: o.key,
    label: o.label,
    disabled: o.disabled,
    selected: o.key === selectedKey,
    onSelect: () => onSelectedChange(o.key),
  }));

  return (
    <div className="oms-split">
      <button
        type="button"
        className="oms-split__primary"
        disabled={busy || selected?.disabled}
        aria-busy={busy || undefined}
        onClick={() => selected && onActivate(selected.key)}
      >
        <span className="oms-split__label">{selected?.label}</span>
        <Icon
          name={busy ? 'refresh' : icon}
          size={18}
          className={busy ? 'oms-btn__spin' : undefined}
        />
      </button>
      <button
        ref={discRef}
        type="button"
        className="oms-split__disclosure"
        aria-label="More status options"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        // Disabled only while busy; the menu stays available even in the
        // degenerate single-option case (it acts as an informational legend).
        disabled={busy}
        onClick={() => setMenuOpen((v) => !v)}
      >
        <Icon name="chevron-down" size={16} />
      </button>
      <Menu
        anchorRef={discRef}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        options={menuOptions}
        placement="top-start"
      />
    </div>
  );
}
