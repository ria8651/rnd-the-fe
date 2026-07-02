import {
  createSignal,
  createMemo,
  For,
  Show,
  createUniqueId,
  type JSX,
  createEffect,
} from 'solid-js';
import { Icon } from './Icon';
import { Popover } from './Popover';
import { Field } from './inputs';

/*
 * Single-select dropdown (controls.md#single-select-dropdown): a type-to-filter
 * combobox (NOT the native <select>), searchable by default, themeable. The async
 * variant (controls.md#async--catalogue-lookup-variant) shares the same shell and
 * keyboard/selection/clearing behaviour, differing only in where options come from
 * (a debounced remote query vs. a local list).
 *
 * Clearability follows optionality (divergence D5): an OPTIONAL field shows a clear
 * × when a value is set; a REQUIRED field never does.
 */

export interface Option {
  value: string;
  label: string;
  disabled?: boolean;
}

interface CoreProps {
  options: Option[];
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
  /** Idle prompt shown before enough characters are typed (async). */
  promptText?: string;
  emptyText?: string;
  /** Called as the filter text changes (async fetches on this). */
  onQuery?: (query: string) => void;
  /** When false, the core does not filter options itself (async supplies filtered). */
  localFilter: boolean;

  value: string | null | undefined;
  onChange: (value: string | null) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  fieldError?: string;
  id?: string;
  containerClass?: string;
}

function Core(props: CoreProps): JSX.Element {
  const id = props.id ?? createUniqueId();
  const listId = `${id}-listbox`;
  const [open, setOpen] = createSignal(false);
  const [query, setQuery] = createSignal('');
  const [active, setActive] = createSignal(0);
  let input: HTMLInputElement | undefined;

  const selectedOption = () => props.options.find((o) => o.value === props.value);
  const selectedLabel = () => selectedOption()?.label ?? '';

  const visible = createMemo(() => {
    if (!props.localFilter) return props.options;
    const q = query().trim().toLowerCase();
    if (!q) return props.options;
    return props.options.filter((o) => o.label.toLowerCase().includes(q));
  });

  // Keep the active option within bounds when the visible set changes.
  createEffect(() => {
    visible();
    setActive(0);
  });

  const openList = () => {
    if (props.disabled) return;
    setQuery('');
    props.onQuery?.('');
    setOpen(true);
  };
  const close = () => setOpen(false);

  const selectAt = (i: number) => {
    const opt = visible()[i];
    if (!opt || opt.disabled) return;
    props.onChange(opt.value);
    close();
  };

  const move = (delta: number) => {
    const opts = visible();
    if (opts.length === 0) return;
    let i = active();
    for (let step = 0; step < opts.length; step++) {
      i = (i + delta + opts.length) % opts.length;
      if (!opts[i]?.disabled) break;
    }
    setActive(i);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (!open()) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openList();
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        move(1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        move(-1);
        break;
      case 'Home':
        e.preventDefault();
        setActive(0);
        break;
      case 'End':
        e.preventDefault();
        setActive(visible().length - 1);
        break;
      case 'Enter':
        e.preventDefault();
        selectAt(active());
        break;
      case 'Tab':
        close();
        break;
    }
  };

  const showClear = () => !props.required && !!props.value && !props.disabled;

  return (
    <Field
      label={props.label}
      error={props.fieldError}
      required={props.required}
      fieldId={id}
      class={props.containerClass}
    >
      <div class={`combobox${open() ? ' combobox-open' : ''}${props.disabled ? ' combobox-disabled' : ''}`}>
        <input
          ref={input}
          id={id}
          class="input combobox-input"
          role="combobox"
          aria-expanded={open()}
          aria-controls={listId}
          aria-autocomplete="list"
          autocomplete="off"
          disabled={props.disabled}
          placeholder={selectedLabel() || props.placeholder}
          value={open() ? query() : selectedLabel()}
          aria-invalid={props.fieldError ? 'true' : undefined}
          onFocus={openList}
          onClick={openList}
          onInput={(e) => {
            setQuery(e.currentTarget.value);
            props.onQuery?.(e.currentTarget.value);
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
        />
        <div class="combobox-adornments">
          <Show when={showClear()}>
            <button
              type="button"
              class="combobox-clear"
              aria-label="Clear"
              onClick={() => {
                props.onChange(null);
                input?.focus();
              }}
            >
              <Icon name="close" size={16} />
            </button>
          </Show>
          <Icon name="chevron-down" size={16} class="combobox-chevron" />
        </div>
        <Popover open={open()} anchor={input} onClose={close} matchWidth role="listbox" id={listId}>
          <Show when={props.loading}>
            <div class="combobox-status">Loading…</div>
          </Show>
          <Show when={props.error}>
            <div class="combobox-status combobox-error">
              <span>{props.error}</span>
              <Show when={props.onRetry}>
                <button type="button" class="btn btn-ghost btn-compact" onClick={() => props.onRetry?.()}>
                  Retry
                </button>
              </Show>
            </div>
          </Show>
          <Show when={!props.loading && !props.error && visible().length === 0}>
            <div class="combobox-status">
              {props.localFilter || query() ? (props.emptyText ?? 'No matches') : (props.promptText ?? 'Type to search…')}
            </div>
          </Show>
          <For each={visible()}>
            {(opt, i) => (
              <button
                type="button"
                role="option"
                aria-selected={opt.value === props.value}
                disabled={opt.disabled}
                class={`combobox-option${i() === active() ? ' combobox-option-active' : ''}`}
                onPointerEnter={() => setActive(i())}
                onClick={() => selectAt(i())}
              >
                <span class="menu-item-check" aria-hidden="true">
                  {opt.value === props.value && <Icon name="check" size={16} />}
                </span>
                <span class="combobox-option-label">{opt.label}</span>
              </button>
            )}
          </For>
        </Popover>
      </div>
    </Field>
  );
}

export interface SelectProps {
  options: Option[];
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  id?: string;
  containerClass?: string;
  emptyText?: string;
}

/** Local single-select (options shipped to the client). */
export function Select(props: SelectProps): JSX.Element {
  return (
    <Core
      localFilter
      options={props.options}
      value={props.value}
      onChange={props.onChange}
      label={props.label}
      placeholder={props.placeholder}
      required={props.required}
      disabled={props.disabled}
      fieldError={props.error}
      id={props.id}
      containerClass={props.containerClass}
      emptyText={props.emptyText}
    />
  );
}

export interface AsyncSelectProps {
  /** Currently-selected option (must be supplied so its label renders when set). */
  selected: Option | null;
  /** Debounced-fetched results for the current query. */
  results: Option[];
  onQuery: (query: string) => void;
  onChange: (option: Option | null) => void;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
  label?: string;
  placeholder?: string;
  promptText?: string;
  emptyText?: string;
  required?: boolean;
  disabled?: boolean;
  fieldError?: string;
  id?: string;
  containerClass?: string;
}

/** Async catalogue-lookup single-select (remote query per keystroke). */
export function AsyncSelect(props: AsyncSelectProps): JSX.Element {
  // Merge the selected option into the option pool so its label resolves.
  const options = createMemo<Option[]>(() => {
    const list = [...props.results];
    if (props.selected && !list.some((o) => o.value === props.selected!.value)) {
      list.unshift(props.selected);
    }
    return list;
  });
  return (
    <Core
      localFilter={false}
      options={options()}
      value={props.selected?.value ?? null}
      onChange={(v) => props.onChange(v == null ? null : (options().find((o) => o.value === v) ?? null))}
      onQuery={props.onQuery}
      loading={props.loading}
      error={props.error}
      onRetry={props.onRetry}
      label={props.label}
      placeholder={props.placeholder}
      promptText={props.promptText}
      emptyText={props.emptyText}
      required={props.required}
      disabled={props.disabled}
      fieldError={props.fieldError}
      id={props.id}
      containerClass={props.containerClass}
    />
  );
}
