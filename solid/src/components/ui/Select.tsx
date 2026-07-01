import {
  createEffect,
  createMemo,
  createSignal,
  For,
  onCleanup,
  Show,
  type JSX,
} from 'solid-js';
import { Icon } from './Icon';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  note?: string;
}

export interface SelectProps {
  value: string | null;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  searchable?: boolean;
  size?: 'sm' | 'md';
  invalid?: boolean;
  'aria-label'?: string;
  disabled?: boolean;
}

// Single-select combobox+listbox per spec/ui-standards/controls.md#single-select-dropdown.
// App-rendered menu (not native), keyboard nav, selected vs active distinction.
export function Select(props: SelectProps): JSX.Element {
  const [open, setOpen] = createSignal(false);
  const [query, setQuery] = createSignal('');
  const [activeIndex, setActiveIndex] = createSignal(0);
  let rootRef: HTMLDivElement | undefined;
  let searchRef: HTMLInputElement | undefined;

  const filtered = createMemo(() => {
    const q = query().toLowerCase().trim();
    if (!props.searchable || !q) return props.options;
    return props.options.filter((o) => o.label.toLowerCase().includes(q));
  });

  const selected = createMemo(() => props.options.find((o) => o.value === props.value));

  const close = () => {
    setOpen(false);
    setQuery('');
  };

  const openMenu = () => {
    if (props.disabled) return;
    setOpen(true);
    const idx = filtered().findIndex((o) => o.value === props.value);
    setActiveIndex(idx >= 0 ? idx : 0);
    if (props.searchable) queueMicrotask(() => searchRef?.focus());
  };

  const commit = (opt: SelectOption) => {
    if (opt.disabled) return;
    props.onChange(opt.value);
    close();
  };

  const onDocClick = (e: MouseEvent) => {
    if (rootRef && !rootRef.contains(e.target as Node)) close();
  };
  createEffect(() => {
    if (open()) document.addEventListener('mousedown', onDocClick);
    else document.removeEventListener('mousedown', onDocClick);
  });
  onCleanup(() => document.removeEventListener('mousedown', onDocClick));

  const moveActive = (dir: 1 | -1) => {
    const opts = filtered();
    if (!opts.length) return;
    let i = activeIndex();
    do {
      i = (i + dir + opts.length) % opts.length;
    } while (opts[i].disabled && i !== activeIndex());
    setActiveIndex(i);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (!open()) {
      if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(e.key)) {
        e.preventDefault();
        openMenu();
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        moveActive(1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        moveActive(-1);
        break;
      case 'Home':
        e.preventDefault();
        setActiveIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setActiveIndex(filtered().length - 1);
        break;
      case 'Enter':
      case ' ':
        if (e.key === ' ' && props.searchable) return; // typing a space
        e.preventDefault();
        {
          const opt = filtered()[activeIndex()];
          if (opt) commit(opt);
        }
        break;
      case 'Escape':
        e.preventDefault();
        close();
        break;
      case 'Tab':
        close();
        break;
    }
  };

  return (
    <div class="select" ref={rootRef}>
      <button
        type="button"
        class={`select-trigger ${props.size === 'sm' ? 'select-trigger--sm' : ''} ${props.invalid ? 'input--invalid' : ''}`}
        data-placeholder={!selected()}
        aria-haspopup="listbox"
        aria-expanded={open()}
        aria-label={props['aria-label']}
        disabled={props.disabled}
        onClick={() => (open() ? close() : openMenu())}
        onKeyDown={onKeyDown}
      >
        <span class="truncate">{selected()?.label ?? props.placeholder ?? 'Select…'}</span>
        <Icon name="chevron-down" size={16} />
      </button>
      <Show when={open()}>
        <div class="select-menu" role="listbox">
          <Show when={props.searchable}>
            <div class="select-search">
              <input
                ref={searchRef}
                class="input input--sm"
                placeholder="Search…"
                value={query()}
                onInput={(e) => {
                  setQuery(e.currentTarget.value);
                  setActiveIndex(0);
                }}
                onKeyDown={onKeyDown}
              />
            </div>
          </Show>
          <For each={filtered()}>
            {(opt, i) => (
              <div
                class="select-option"
                role="option"
                data-active={i() === activeIndex()}
                data-selected={opt.value === props.value}
                data-disabled={opt.disabled}
                aria-selected={opt.value === props.value}
                onMouseEnter={() => setActiveIndex(i())}
                onClick={() => commit(opt)}
              >
                <span class="truncate">{opt.label}</span>
                <Show when={opt.value === props.value}>
                  <Icon name="check" size={16} />
                </Show>
                <Show when={opt.note}>
                  <span class="muted" style={{ 'font-size': 'var(--type-caption)' }}>{opt.note}</span>
                </Show>
              </div>
            )}
          </For>
          <Show when={filtered().length === 0}>
            <div class="select-option muted" aria-disabled="true">No matches</div>
          </Show>
        </div>
      </Show>
    </div>
  );
}
