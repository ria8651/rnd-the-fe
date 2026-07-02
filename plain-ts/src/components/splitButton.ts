import { h } from '../core/dom';
import { icon } from '../icons';
import { openPopover, type PopoverController } from './popover';
import { type Getter } from '../core/signal';

export interface SplitOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SplitButtonOpts {
  options: SplitOption[];
  /** The currently-selected primary option value. */
  selected: Getter<string>;
  onSelectOption: (value: string) => void;
  onPrimary: () => void;
  disabled?: Getter<boolean>;
}

// A default target plus alternatives (controls.md § split-multi-action-button).
// The primary segment fires the selected action; the disclosure lists all
// options (invalid ones shown-but-disabled — the menu doubles as a legend).
export function splitButton(opts: SplitButtonOpts): HTMLElement {
  const label = () => opts.options.find((o) => o.value === opts.selected())?.label ?? '';
  const primaryDisabled = () => opts.disabled?.() ?? false;

  const primary = h('button', {
    type: 'button',
    class: 'split__primary',
    disabled: () => primaryDisabled(),
    onclick: () => opts.onPrimary(),
  }, icon('arrow-right'), h('span', null, label));

  let pop: PopoverController | null = null;
  const disclosure = h('button', {
    type: 'button',
    class: 'split__disclosure',
    'aria-label': 'Choose status',
    'aria-haspopup': 'menu',
    onclick: (e: MouseEvent) => {
      e.stopPropagation();
      if (pop) { pop.close(); pop = null; return; }
      pop = openPopover(root, (close) =>
        h('div', { class: 'menu', role: 'menu' },
          ...opts.options.map((o) =>
            h('button', {
              type: 'button',
              role: 'menuitemradio',
              'aria-checked': o.value === opts.selected() ? 'true' : 'false',
              class: `menu__item${o.value === opts.selected() ? ' selected' : ''}`,
              disabled: o.disabled ?? false,
              onclick: () => { opts.onSelectOption(o.value); close(); },
            }, h('span', null, o.label), o.value === opts.selected() ? icon('check', { class: 'check' }) : null),
          ),
        ),
      { onClose: () => { pop = null; } });
    },
  }, icon('chevron-down'));

  const root = h('div', { class: 'split', role: 'group' }, primary, disclosure);
  return root;
}
