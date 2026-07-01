// Single-select dropdown: an app-rendered combobox + listbox (not the native
// <select> popup), so it is themeable and keyboard-consistent.
// See ../../spec/ui-standards/controls.md#single-select-dropdown.

import { el } from '../framework/dom.ts';
import { icon } from './icon.ts';

export interface SelectOption<T> {
  value: T;
  label: string;
  disabled?: boolean;
}

export interface SelectProps<T> {
  options: SelectOption<T>[];
  value: T | null;
  placeholder?: string;
  invalid?: boolean;
  compact?: boolean;
  ariaLabel?: string;
  onChange: (value: T) => void;
}

export function select<T>(props: SelectProps<T>): HTMLElement {
  let open = false;
  let activeIndex = props.options.findIndex((o) => o.value === props.value);

  const labelFor = (v: T | null) =>
    props.options.find((o) => o.value === v)?.label ?? props.placeholder ?? 'Select…';

  const trigger = el(
    'button',
    {
      type: 'button',
      class: `select-trigger ${props.compact ? 'input-compact' : ''} ${props.invalid ? 'input-invalid' : ''}`,
      'aria-haspopup': 'listbox',
      'aria-expanded': 'false',
      'aria-label': props.ariaLabel,
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px',
        minWidth: '160px',
        cursor: 'pointer',
        textAlign: 'left',
      },
    },
    el(
      'span',
      { class: props.value == null ? 'muted' : '', style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
      labelFor(props.value),
    ),
    icon('chevron-down', 18),
  );

  const listbox = el('ul', {
    role: 'listbox',
    class: 'select-listbox',
    style: {
      listStyle: 'none',
      margin: '0',
      padding: '4px',
      background: 'var(--surface-raised)',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-control)',
      boxShadow: 'var(--elevation-raised)',
      position: 'absolute',
      zIndex: '800',
      maxHeight: '280px',
      overflow: 'auto',
      minWidth: '100%',
    },
  });

  const wrapper = el('div', { style: { position: 'relative', display: 'inline-block' } }, trigger, listbox);

  function renderOptions() {
    listbox.replaceChildren(
      ...props.options.map((opt, i) => {
        const selected = opt.value === props.value;
        const active = i === activeIndex;
        const item = el(
          'li',
          {
            role: 'option',
            'aria-selected': selected ? 'true' : 'false',
            'aria-disabled': opt.disabled ? 'true' : undefined,
            style: {
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 10px',
              minHeight: '36px',
              borderRadius: 'var(--radius-sm)',
              cursor: opt.disabled ? 'not-allowed' : 'pointer',
              color: opt.disabled ? 'var(--text-disabled)' : 'var(--text-primary)',
              background: active ? 'var(--interaction-hover-overlay)' : 'transparent',
              fontWeight: selected ? '600' : '400',
            },
            onmousedown: (e: Event) => {
              e.preventDefault();
              if (!opt.disabled) commit(i);
            },
            onmouseenter: () => {
              activeIndex = i;
              renderOptions();
            },
          },
          el('span', { style: { width: '16px', flex: '0 0 auto' } }, selected ? icon('check', 16) : ''),
          el('span', null, opt.label),
        );
        return item;
      }),
    );
  }

  function setOpen(next: boolean) {
    open = next;
    trigger.setAttribute('aria-expanded', String(open));
    listbox.style.display = open ? 'block' : 'none';
    if (open) {
      activeIndex = Math.max(0, props.options.findIndex((o) => o.value === props.value));
      renderOptions();
      document.addEventListener('mousedown', onOutside, true);
    } else {
      document.removeEventListener('mousedown', onOutside, true);
    }
  }

  function onOutside(e: MouseEvent) {
    if (!wrapper.contains(e.target as Node)) setOpen(false);
  }

  function commit(i: number) {
    const opt = props.options[i];
    if (!opt || opt.disabled) return;
    props.value = opt.value;
    (trigger.firstChild as HTMLElement).textContent = opt.label;
    (trigger.firstChild as HTMLElement).className = '';
    setOpen(false);
    props.onChange(opt.value);
    trigger.focus();
  }

  function moveActive(delta: number) {
    let i = activeIndex;
    for (let step = 0; step < props.options.length; step++) {
      i = (i + delta + props.options.length) % props.options.length;
      if (!props.options[i].disabled) break;
    }
    activeIndex = i;
    renderOptions();
  }

  trigger.addEventListener('click', () => setOpen(!open));
  trigger.addEventListener('keydown', (e) => {
    if (!open) {
      if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(e.key)) {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); moveActive(1); break;
      case 'ArrowUp': e.preventDefault(); moveActive(-1); break;
      case 'Home': e.preventDefault(); activeIndex = 0; moveActive(0); break;
      case 'End': e.preventDefault(); activeIndex = props.options.length - 1; moveActive(0); break;
      case 'Enter':
      case ' ': e.preventDefault(); commit(activeIndex); break;
      case 'Escape': e.preventDefault(); setOpen(false); trigger.focus(); break;
      case 'Tab': setOpen(false); break;
    }
  });

  listbox.style.display = 'none';
  return wrapper;
}
