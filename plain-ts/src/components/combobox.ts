import { h, clear } from '../core/dom';
import { icon } from '../icons';
import { openPopover, type PopoverController } from './popover';
import { type Getter } from '../core/signal';

export interface Option<T = unknown> {
  value: string;
  label: string;
  disabled?: boolean;
  data?: T;
}

export interface ComboOpts<T = unknown> {
  /** Current selected value id. */
  value: Getter<string | null | undefined>;
  /** Label to show for the current value (needed for async, where the option
   *  may not be in the loaded list). Falls back to matching a local option. */
  selectedLabel?: Getter<string | null | undefined>;
  placeholder?: string;
  /** Whether the field is required — governs the clear (×) affordance (D5). */
  required?: boolean | Getter<boolean>;
  disabled?: Getter<boolean> | boolean;
  compact?: boolean;
  invalid?: Getter<boolean>;
  ariaLabel?: string;
  onSelect: (value: string | null, option: Option<T> | null) => void;
  /** Local: return options synchronously. Async: return a Promise. */
  loadOptions: (query: string) => Option<T>[] | Promise<Option<T>[]>;
  async?: boolean;
  minQueryLength?: number;
  emptyMessage?: string;
}

type Phase = 'idle' | 'loading' | 'results' | 'empty' | 'error';

export function combobox<T = unknown>(opts: ComboOpts<T>): HTMLElement {
  const isDisabled = () => (typeof opts.disabled === 'function' ? opts.disabled() : opts.disabled ?? false);
  const isRequired = () => (typeof opts.required === 'function' ? opts.required() : !!opts.required);

  const input = h('input', {
    class: () => `input${opts.compact ? ' input--compact' : ''}${opts.invalid?.() ? ' invalid' : ''}`,
    type: 'text',
    role: 'combobox',
    'aria-expanded': 'false',
    'aria-autocomplete': 'list',
    'aria-label': opts.ariaLabel,
    placeholder: opts.placeholder,
    readonly: () => (isDisabled() ? true : undefined),
    disabled: () => isDisabled(),
  }) as HTMLInputElement;

  // Reflect the selected value into the input when closed.
  const currentLabel = (): string => {
    const explicit = opts.selectedLabel?.();
    if (explicit) return explicit;
    const v = opts.value();
    return v ? String(v) : '';
  };

  let pop: PopoverController | null = null;
  let options: Option<T>[] = [];
  let activeIndex = -1;
  let phase: Phase = 'idle';
  let listEl: HTMLElement | null = null;
  let queryTimer: number | undefined;
  let queryToken = 0;

  const syncClosedDisplay = () => {
    input.value = currentLabel();
  };
  syncClosedDisplay();

  const clearBtn = h('button', {
    type: 'button',
    class: 'combo__clear',
    'aria-label': 'Clear',
    onmousedown: (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      opts.onSelect(null, null);
      syncClosedDisplay();
      if (pop) refreshList('');
      input.focus();
    },
  }, icon('close', { size: 16 }));

  const icons = h(
    'div',
    { class: 'combo__icons' },
    // Clear affordance only when optional AND a value is set (D5).
    () => (!isRequired() && opts.value() && !isDisabled() ? clearBtn : null),
    icon('chevron-down'),
  );

  const wrapper = h('div', { class: 'combo' }, h('div', { class: 'combo__trigger' }, input), icons);

  function renderList(query: string) {
    if (!listEl) return;
    clear(listEl);
    if (phase === 'idle') {
      listEl.appendChild(h('div', { class: 'menu__empty' }, `Type to search…`));
      return;
    }
    if (phase === 'loading') {
      listEl.appendChild(h('div', { class: 'menu__empty row', style: { 'justify-content': 'center' } }, h('span', { class: 'spinner' })));
      return;
    }
    if (phase === 'error') {
      listEl.appendChild(
        h('div', { class: 'menu__empty' }, 'Could not load. ',
          h('a', { onclick: () => refreshList(query) }, 'Retry')),
      );
      return;
    }
    if (phase === 'empty' || options.length === 0) {
      listEl.appendChild(h('div', { class: 'menu__empty' }, opts.emptyMessage ?? 'No matches'));
      return;
    }
    const selected = opts.value();
    options.forEach((o, i) => {
      const item = h('button', {
        type: 'button',
        role: 'option',
        class: () => `menu__item${i === activeIndex ? ' active' : ''}${o.value === selected ? ' selected' : ''}`,
        'aria-selected': o.value === selected ? 'true' : 'false',
        disabled: o.disabled ?? false,
        onmousemove: () => setActive(i),
        onmousedown: (e: MouseEvent) => {
          e.preventDefault();
          if (!o.disabled) choose(o);
        },
      }, h('span', null, o.label), o.value === selected ? icon('check', { class: 'check' }) : null);
      listEl!.appendChild(item);
    });
    scrollActiveIntoView();
  }

  function scrollActiveIntoView() {
    if (!listEl || activeIndex < 0) return;
    const items = listEl.querySelectorAll('.menu__item');
    (items[activeIndex] as HTMLElement | undefined)?.scrollIntoView({ block: 'nearest' });
  }

  function setActive(i: number) {
    activeIndex = i;
    if (!listEl) return;
    listEl.querySelectorAll('.menu__item').forEach((el, idx) => el.classList.toggle('active', idx === activeIndex));
    scrollActiveIntoView();
  }

  function moveActive(delta: number) {
    if (options.length === 0) return;
    let i = activeIndex;
    for (let n = 0; n < options.length; n++) {
      i = (i + delta + options.length) % options.length;
      if (!options[i].disabled) break;
    }
    setActive(i);
  }

  function choose(o: Option<T>) {
    opts.onSelect(o.value, o);
    close();
    syncClosedDisplay();
  }

  async function refreshList(query: string) {
    if (opts.async) {
      const min = opts.minQueryLength ?? 1;
      if (query.trim().length < min) {
        phase = 'idle';
        options = [];
        renderList(query);
        return;
      }
      phase = 'loading';
      renderList(query);
      const token = ++queryToken;
      try {
        const res = await opts.loadOptions(query);
        if (token !== queryToken) return;
        options = res;
        phase = res.length ? 'results' : 'empty';
      } catch {
        if (token !== queryToken) return;
        phase = 'error';
      }
    } else {
      const res = (await opts.loadOptions(query)) as Option<T>[];
      options = res;
      phase = res.length ? 'results' : 'empty';
    }
    // Set active to the selected option, else first enabled.
    const sel = opts.value();
    const selIdx = options.findIndex((o) => o.value === sel && !o.disabled);
    activeIndex = selIdx >= 0 ? selIdx : options.findIndex((o) => !o.disabled);
    renderList(query);
  }

  function open() {
    if (pop || isDisabled()) return;
    input.setAttribute('aria-expanded', 'true');
    input.value = '';
    listEl = h('div', { class: 'menu', role: 'listbox' });
    pop = openPopover(
      wrapper,
      () => listEl!,
      {
        matchWidth: true,
        onClose: () => {
          pop = null;
          input.setAttribute('aria-expanded', 'false');
          syncClosedDisplay();
        },
      },
    );
    refreshList('');
  }

  function close() {
    pop?.close();
    pop = null;
  }

  function onQuery() {
    const q = input.value;
    if (opts.async) {
      window.clearTimeout(queryTimer);
      queryTimer = window.setTimeout(() => refreshList(q), 300);
    } else {
      refreshList(q);
    }
  }

  input.addEventListener('focus', open);
  input.addEventListener('click', open);
  input.addEventListener('input', onQuery);
  input.addEventListener('keydown', (e: KeyboardEvent) => {
    if (!pop) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        open();
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); moveActive(1); break;
      case 'ArrowUp': e.preventDefault(); moveActive(-1); break;
      case 'Home': e.preventDefault(); setActive(options.findIndex((o) => !o.disabled)); break;
      case 'End': e.preventDefault(); { let i = options.length - 1; while (i >= 0 && options[i].disabled) i--; setActive(i); } break;
      case 'Enter':
        e.preventDefault();
        if (activeIndex >= 0 && options[activeIndex] && !options[activeIndex].disabled) choose(options[activeIndex]);
        break;
      case 'Tab': close(); break;
    }
  });

  return wrapper;
}
