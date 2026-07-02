import { h } from '../core/dom';
import { icon } from '../icons';
import { button } from './button';
import { combobox } from './combobox';
import { openPopover } from './popover';
import { type Getter } from '../core/signal';

export interface EnumOption {
  value: string;
  label: string;
}

export interface FilterDef {
  key: string; // URL param name
  label: string;
  type: 'enum' | 'text';
  options?: EnumOption[];
}

export interface FilterMenuOpts {
  defs: FilterDef[];
  /** Current active filter values, keyed by def.key (absent = not active). */
  values: Getter<Record<string, string>>;
  onChange: (key: string, value: string | null) => void;
  onClearAll: () => void;
}

// The add-a-filter menu (tables.md § filtering): a Filters dropdown lists
// filters not yet applied; each active filter is a typed control shown inline;
// all state binds to URL params (owned by the caller via onChange).
export function filterMenu(opts: FilterMenuOpts): HTMLElement {
  const isActive = (key: string) => key in opts.values();
  const inactiveDefs = () => opts.defs.filter((d) => !isActive(d.key));

  const filtersBtn = button({
    label: 'Filters',
    icon: 'filter',
    variant: 'secondary',
    compact: true,
    onClick: () => {
      openPopover(filtersBtn, (close) =>
        h('div', { class: 'menu', role: 'menu' },
          ...(inactiveDefs().length
            ? inactiveDefs().map((d) =>
                h('button', {
                  type: 'button', class: 'menu__item',
                  onclick: () => {
                    // Activating applies it — enum defaults to its first option.
                    const initial = d.type === 'enum' ? d.options?.[0]?.value ?? '' : '';
                    opts.onChange(d.key, initial);
                    close();
                  },
                }, d.label))
            : [h('div', { class: 'menu__empty' }, 'All filters applied')]),
          Object.keys(opts.values()).length
            ? h('button', { type: 'button', class: 'menu__item', style: { 'border-top': '1px solid var(--divider)' }, onclick: () => { opts.onClearAll(); close(); } }, icon('minus-circle', { size: 18 }), 'Remove all filters')
            : null,
        ),
      );
    },
  });

  const chips = () =>
    opts.defs
      .filter((d) => isActive(d.key))
      .map((d) => renderChip(d, opts));

  return h('div', { class: 'toolbar' }, filtersBtn, () => chips());
}

function renderChip(def: FilterDef, opts: FilterMenuOpts): HTMLElement {
  const value = () => opts.values()[def.key] ?? '';
  const control =
    def.type === 'enum'
      ? combobox({
          value,
          selectedLabel: () => def.options?.find((o) => o.value === value())?.label ?? '',
          required: true,
          compact: true,
          ariaLabel: def.label,
          loadOptions: () => (def.options ?? []).map((o) => ({ value: o.value, label: o.label })),
          onSelect: (v) => opts.onChange(def.key, v),
        })
      : combobox({
          value,
          selectedLabel: value,
          compact: true,
          ariaLabel: def.label,
          async: true,
          loadOptions: () => [],
          onSelect: (v) => opts.onChange(def.key, v),
        });

  return h(
    'div',
    { class: 'filterchip' },
    h('span', { class: 'filterchip__label' }, def.label),
    h('div', { style: { 'min-width': '150px' } }, control),
    h('button', { type: 'button', class: 'filterchip__remove', 'aria-label': `Remove ${def.label} filter`, onclick: () => opts.onChange(def.key, null) }, icon('close', { size: 16 })),
  );
}
