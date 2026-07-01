import { useEffect, useRef, type RefObject } from 'react';
import { Icon, type IconName } from '@/icons/Icon';
import { Popover, type Placement } from './Popover';

export interface MenuOption {
  key: string;
  label: string;
  icon?: IconName;
  disabled?: boolean;
  selected?: boolean;
  destructive?: boolean;
  onSelect?: () => void;
}

interface MenuProps {
  anchorRef: RefObject<HTMLElement | null>;
  open: boolean;
  onClose: () => void;
  options: MenuOption[];
  placement?: Placement;
  matchWidth?: boolean;
  labelledBy?: string;
}

/** Action / options menu with roving keyboard navigation (controls.md#menus--popovers). */
export function Menu({
  anchorRef,
  open,
  onClose,
  options,
  placement,
  matchWidth,
  labelledBy,
}: MenuProps) {
  const listRef = useRef<HTMLDivElement>(null);

  // Focus the selected (or first enabled) item when the menu opens.
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      const list = listRef.current;
      if (!list) return;
      const items = Array.from(
        list.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)'),
      );
      const selected = items.find((i) => i.getAttribute('aria-checked') === 'true');
      (selected ?? items[0])?.focus();
    }, 0);
    return () => clearTimeout(timer);
  }, [open]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    const list = listRef.current;
    if (!list) return;
    const items = Array.from(
      list.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)'),
    );
    const idx = items.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      items[(idx + 1) % items.length]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      items[(idx - 1 + items.length) % items.length]?.focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      items[0]?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      items[items.length - 1]?.focus();
    }
  };

  return (
    <Popover
      anchorRef={anchorRef}
      open={open}
      onClose={onClose}
      placement={placement}
      matchWidth={matchWidth}
      role="menu"
      labelledBy={labelledBy}
    >
      <div ref={listRef} onKeyDown={onKeyDown}>
        {options.map((opt) => (
          <button
            key={opt.key}
            type="button"
            role="menuitem"
            aria-checked={opt.selected || undefined}
            disabled={opt.disabled}
            className={`oms-menu-item${opt.destructive ? ' oms-menu-item--destructive' : ''}${
              opt.selected ? ' is-active' : ''
            }`}
            onClick={() => {
              if (opt.disabled) return;
              opt.onSelect?.();
              onClose();
            }}
          >
            {opt.icon && <Icon name={opt.icon} size={18} />}
            <span>{opt.label}</span>
            {opt.selected && <Icon name="check" size={16} className="oms-menu-item__check" />}
          </button>
        ))}
      </div>
    </Popover>
  );
}
