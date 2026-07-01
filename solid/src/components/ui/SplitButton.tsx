import { createSignal, For, onCleanup, Show, createEffect, type JSX } from 'solid-js';
import { Icon, type IconName } from './Icon';

export interface SplitOption {
  value: string;
  label: string;
  disabled?: boolean;
}

// Split (multi-action) button (spec/ui-standards/controls.md#split-multi-action-button):
// a primary segment that fires the selected action, plus a disclosure menu of all
// options. Invalid options are shown-but-disabled (the menu doubles as a legend).
export function SplitButton(props: {
  options: SplitOption[];
  selected: string;
  onSelect: (value: string) => void;
  onActivate: () => void;
  icon?: IconName;
  busy?: boolean;
  disabled?: boolean;
}): JSX.Element {
  const [open, setOpen] = createSignal(false);
  let ref: HTMLDivElement | undefined;

  const selectedOpt = () => props.options.find((o) => o.value === props.selected);

  const onDoc = (e: MouseEvent) => {
    if (ref && !ref.contains(e.target as Node)) setOpen(false);
  };
  createEffect(() => {
    if (open()) document.addEventListener('mousedown', onDoc);
    else document.removeEventListener('mousedown', onDoc);
  });
  onCleanup(() => document.removeEventListener('mousedown', onDoc));

  return (
    <div class="split" ref={ref}>
      <button class="split__primary" disabled={props.disabled || props.busy} onClick={() => props.onActivate()}>
        <Show when={props.busy} fallback={props.icon && <Icon name={props.icon} size={18} />}>
          <span class="spinner" style={{ width: '16px', height: '16px' }} />
        </Show>
        {selectedOpt()?.label}
      </button>
      <button
        class="split__toggle"
        aria-haspopup="menu"
        aria-expanded={open()}
        aria-label="Choose status"
        disabled={props.disabled || props.busy}
        onClick={() => setOpen((o) => !o)}
      >
        <Icon name="chevron-down" size={16} />
      </button>
      <Show when={open()}>
        <div class="split__menu" role="menu">
          <For each={props.options}>
            {(o) => (
              <div
                class="select-option"
                role="menuitemradio"
                aria-checked={o.value === props.selected}
                aria-disabled={o.disabled}
                data-selected={o.value === props.selected}
                data-disabled={o.disabled}
                onClick={() => {
                  if (o.disabled) return;
                  props.onSelect(o.value);
                  setOpen(false);
                }}
              >
                <span>{o.label}</span>
                <Show when={o.value === props.selected}><Icon name="check" size={16} /></Show>
              </div>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}
