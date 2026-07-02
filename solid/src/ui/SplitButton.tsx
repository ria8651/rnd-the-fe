import { createSignal, For, type JSX } from 'solid-js';
import { Icon, type IconName } from './Icon';
import { Popover } from './Popover';

/*
 * Split (multi-action) button (controls.md#split-multi-action-button). One default
 * target plus alternatives: the primary segment performs the currently-selected
 * action; the disclosure segment opens a menu of ALL options. Invalid options are
 * shown-but-disabled (the menu doubles as a lifecycle legend); the selected option
 * is marked. Picking an option makes it the new primary and is remembered — it does
 * NOT fire immediately. Confirmation/precondition handling is the caller's (onPrimary).
 */

export interface SplitOption<V extends string> {
  value: V;
  label: string;
  disabled?: boolean;
}

export interface SplitButtonProps<V extends string> {
  options: SplitOption<V>[];
  selected: V;
  onSelect: (value: V) => void;
  onPrimary: (value: V) => void;
  icon?: IconName;
  busy?: boolean;
}

export function SplitButton<V extends string>(props: SplitButtonProps<V>): JSX.Element {
  const [open, setOpen] = createSignal(false);
  let disclosure: HTMLButtonElement | undefined;

  const current = () => props.options.find((o) => o.value === props.selected) ?? props.options[0];

  return (
    <div class="split-button">
      <button
        type="button"
        class="split-primary"
        disabled={props.busy || current()?.disabled}
        aria-busy={props.busy ? 'true' : undefined}
        onClick={() => props.onPrimary(props.selected)}
      >
        {props.busy ? (
          <span class="btn-spinner" aria-hidden="true" />
        ) : (
          props.icon && <Icon name={props.icon} size={20} />
        )}
        <span class="btn-label">{current()?.label}</span>
      </button>
      <button
        ref={disclosure}
        type="button"
        class="split-disclosure"
        aria-haspopup="menu"
        aria-expanded={open()}
        aria-label="More status options"
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name="chevron-down" size={16} />
      </button>
      <Popover
        open={open()}
        anchor={disclosure}
        onClose={() => setOpen(false)}
        role="menu"
        matchWidth
      >
        <For each={props.options}>
          {(opt) => (
            <button
              type="button"
              role="menuitemradio"
              aria-checked={opt.value === props.selected}
              class="menu-item"
              disabled={opt.disabled}
              onClick={() => {
                props.onSelect(opt.value);
                setOpen(false);
              }}
            >
              <span class="menu-item-check" aria-hidden="true">
                {opt.value === props.selected && <Icon name="check" size={16} />}
              </span>
              <span>{opt.label}</span>
            </button>
          )}
        </For>
      </Popover>
    </div>
  );
}
