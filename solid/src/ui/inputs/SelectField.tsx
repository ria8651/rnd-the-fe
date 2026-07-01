/**
 * Single-select dropdown (spec/ui-standards/controls.md › Single-select dropdown). A
 * **type-to-filter combobox**: the trigger is a text input showing the selected label (or a
 * placeholder) with a trailing disclosure chevron; focusing it opens the list and typing
 * filters the options in place (case-insensitive substring), narrowing the keyboard set.
 * Selecting closes and returns focus to the input (D6). Clearing follows optionality
 * (controls.md / D5): optional fields show a `×` when a value is set; required fields do not.
 *
 * Keyboard — closed: ↑/↓ opens with the selected option active. Open: ↑/↓ move active
 * (skipping disabled), Home/End jump, Enter selects, Escape closes without changing, Tab
 * closes and moves on. Typing filters (the default, not a separate mode).
 */
import { type JSX, For, Show, createEffect, createMemo, createSignal } from 'solid-js';
import { Popover } from '../Popover';
import { Icon } from '../Icon';
import { FieldShell } from './FieldShell';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  /** Optional secondary line (e.g. store code). */
  hint?: string;
}

export interface SelectFieldProps {
  label?: string;
  options: SelectOption[];
  value?: string | null;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  compact?: boolean;
  /** Accepted for compatibility; the single-select filters as you type by default. */
  searchable?: boolean;
  width?: string;
  full?: boolean;
}

export function SelectField(props: SelectFieldProps): JSX.Element {
  const [open, setOpen] = createSignal(false);
  const [text, setText] = createSignal('');
  const [dirty, setDirty] = createSignal(false); // has the user typed since opening?
  const [active, setActive] = createSignal(-1);
  let inputRef: HTMLInputElement | undefined;
  let suppressOpen = false; // skip the openMenu that a post-select refocus would trigger

  const selected = createMemo(() => props.options.find((o) => o.value === props.value));
  const clearable = () => !props.required && !!props.value;

  // While closed, the input mirrors the selected option's label.
  createEffect(() => {
    if (!open()) setText(selected()?.label ?? '');
  });

  const filtered = createMemo(() => {
    const q = text().trim().toLowerCase();
    if (!dirty() || !q) return props.options;
    return props.options.filter((o) => o.label.toLowerCase().includes(q));
  });

  const nextEnabled = (from: number, dir: 1 | -1): number => {
    const list = filtered();
    let i = from;
    for (let n = 0; n < list.length; n++) {
      i = (i + dir + list.length) % list.length;
      if (!list[i]?.disabled) return i;
    }
    return -1;
  };

  const openMenu = () => {
    if (suppressOpen) {
      suppressOpen = false;
      return;
    }
    if (props.disabled || open()) return;
    setOpen(true);
    setDirty(false);
    const sel = filtered().findIndex((o) => o.value === props.value);
    setActive(sel >= 0 ? sel : nextEnabled(-1, 1));
    queueMicrotask(() => inputRef?.select());
  };
  const close = () => {
    setOpen(false);
    setDirty(false);
    setText(selected()?.label ?? '');
  };
  const choose = (value: string) => {
    props.onChange?.(value);
    setDirty(false);
    setOpen(false);
    suppressOpen = true; // returning focus below must not reopen the list
    queueMicrotask(() => inputRef?.focus());
  };
  const clear = () => {
    props.onChange?.('');
    setText('');
    setDirty(false);
    inputRef?.focus();
  };

  // Keep the active index within the filtered set.
  createEffect(() => {
    const len = filtered().length;
    if (active() >= len) setActive(len ? nextEnabled(-1, 1) : -1);
  });

  const onKeyDown = (e: KeyboardEvent) => {
    if (!open()) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        openMenu();
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive(nextEnabled(active(), 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive(nextEnabled(active(), -1));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setActive(nextEnabled(-1, 1));
    } else if (e.key === 'End') {
      e.preventDefault();
      setActive(nextEnabled(0, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const o = filtered()[active()];
      if (o && !o.disabled) choose(o.value);
    } else if (e.key === 'Escape') {
      // Close without changing; keep focus on the input. Stop the event so the Popover's
      // document-level Escape handler doesn't also fire (which would refocus and reopen).
      e.preventDefault();
      e.stopPropagation();
      close();
    }
  };

  const triggerCls = () =>
    `control select-trigger${props.compact ? ' control--compact' : ''}${props.error ? ' control--invalid' : ''}${
      props.disabled ? ' control--disabled' : ''
    }`;

  return (
    <FieldShell label={props.label} required={props.required} error={props.error} full={props.full} width={props.width}>
      {({ inputId, describedBy }) => (
        <Popover
          open={open()}
          onClose={close}
          matchWidth
          trigger={
            <div class={triggerCls()}>
              <input
                ref={inputRef}
                id={inputId}
                class="select-trigger__input"
                type="text"
                role="combobox"
                autocomplete="off"
                data-popover-trigger
                aria-expanded={open()}
                aria-invalid={props.error ? 'true' : undefined}
                aria-describedby={describedBy}
                placeholder={props.placeholder ?? 'Select…'}
                disabled={props.disabled}
                value={text()}
                onFocus={openMenu}
                onInput={(e) => {
                  setText(e.currentTarget.value);
                  setDirty(true);
                  setOpen(true);
                }}
                onKeyDown={onKeyDown}
              />
              <Show when={clearable()}>
                <button
                  type="button"
                  class="select-clear"
                  aria-label="Clear selection"
                  tabindex={-1}
                  onClick={(e) => {
                    e.stopPropagation();
                    clear();
                  }}
                >
                  <Icon name="close" size={14} />
                </button>
              </Show>
              <button
                type="button"
                class="select-trigger__toggle"
                tabindex={-1}
                aria-label="Toggle options"
                disabled={props.disabled}
                onClick={(e) => {
                  e.stopPropagation();
                  if (open()) close();
                  else {
                    inputRef?.focus();
                    openMenu();
                  }
                }}
              >
                <Icon name="chevron-down" size={16} class="select-trigger__chevron" />
              </button>
            </div>
          }
        >
          <ul class="menu" role="listbox" aria-label={props.label}>
            <Show when={filtered().length} fallback={<li class="menu-item" style={{ color: 'var(--text-secondary)' }}>No matches</li>}>
              <For each={filtered()}>
                {(o, i) => (
                  <li role="none">
                    <button
                      type="button"
                      role="option"
                      aria-selected={o.value === props.value}
                      class={`menu-item${o.value === props.value ? ' menu-item--selected' : ''}${
                        i() === active() ? ' menu-item--active' : ''
                      }`}
                      disabled={o.disabled}
                      onMouseEnter={() => setActive(i())}
                      onClick={() => !o.disabled && choose(o.value)}
                    >
                      <span class="menu-check">
                        <Show when={o.value === props.value}>
                          <Icon name="check" size={16} />
                        </Show>
                      </span>
                      <span class="menu-item__label">
                        {o.label}
                        <Show when={o.hint}>
                          <span style={{ color: 'var(--text-secondary)', 'margin-inline-start': '6px', 'font-size': '12px' }}>{o.hint}</span>
                        </Show>
                      </span>
                    </button>
                  </li>
                )}
              </For>
            </Show>
          </ul>
        </Popover>
      )}
    </FieldShell>
  );
}
