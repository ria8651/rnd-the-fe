// Split (multi-action) button — a default action plus a disclosure menu of
// alternatives. Selecting an option makes it the new primary (remembered) but
// does NOT fire; the primary segment fires the selected action. Invalid options
// are shown-but-disabled. See ../../spec/ui-standards/controls.md#split-multi-action-button.

import { el } from '../framework/dom.ts';
import { icon } from './icon.ts';

export interface SplitOption {
  key: string;
  label: string;
  disabled?: boolean;
}

export interface SplitButtonProps {
  options: SplitOption[];
  selectedKey: string;
  onPrimary: (key: string) => void;
  busy?: () => boolean;
}

export function splitButton(props: SplitButtonProps): HTMLElement {
  let selectedKey = props.selectedKey;
  let open = false;

  const selectedLabel = () => props.options.find((o) => o.key === selectedKey)?.label ?? '';

  const primary = el(
    'button',
    {
      class: 'btn btn-secondary primary',
      'aria-busy': () => (props.busy?.() ? 'true' : 'false'),
      disabled: () => props.busy?.() ?? false,
      onclick: () => props.onPrimary(selectedKey),
    },
    icon('arrow-right', 16),
    el('span', null, selectedLabel()),
  );

  const menu = el('ul', { class: 'split-menu', role: 'menu', style: { display: 'none' } });

  function renderMenu() {
    menu.replaceChildren(
      ...props.options.map((o) =>
        el(
          'li',
          {
            role: 'menuitemradio',
            'aria-checked': o.key === selectedKey ? 'true' : 'false',
            'aria-disabled': o.disabled ? 'true' : 'false',
            onclick: () => {
              if (o.disabled) return;
              selectedKey = o.key;
              (primary.lastChild as HTMLElement).textContent = selectedLabel();
              setOpen(false);
            },
          },
          el('span', { style: { width: '16px' } }, o.key === selectedKey ? icon('check', 16) : ''),
          o.label,
        ),
      ),
    );
  }

  function setOpen(next: boolean) {
    open = next;
    menu.style.display = open ? 'block' : 'none';
    disclosure.setAttribute('aria-expanded', String(open));
    if (open) {
      renderMenu();
      document.addEventListener('mousedown', onOutside, true);
    } else {
      document.removeEventListener('mousedown', onOutside, true);
    }
  }

  function onOutside(e: MouseEvent) {
    if (!wrapper.contains(e.target as Node)) setOpen(false);
  }

  const disclosure = el(
    'button',
    {
      class: 'btn btn-secondary disclosure',
      'aria-haspopup': 'menu',
      'aria-expanded': 'false',
      'aria-label': 'Choose status action',
      onclick: () => setOpen(!open),
    },
    icon('chevron-down', 16),
  );

  const wrapper = el('div', { class: 'split-btn' }, primary, disclosure, menu);
  return wrapper;
}
