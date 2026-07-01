/**
 * Split (multi-action) button (spec/ui-standards/controls.md › Split button). A pill of two
 * fused segments: a primary segment that runs the currently-selected option directly
 * (`onAction`), and a disclosure segment that opens a menu of ALL options. Picking an option
 * makes it the new primary (`onSelect`) and is remembered — it does NOT fire the action.
 *
 * Options invalid from the current state are shown but disabled, so the menu doubles as a
 * lifecycle legend. Confirmation/guards for an irreversible or precondition-gated primary
 * are the caller's concern (act on `onAction`). Hidden by the caller when the whole action
 * is unavailable (disabled-vs-hidden rule).
 */
import { type JSX, For, Show, createMemo, createSignal } from 'solid-js';
import { Popover } from './Popover';
import { Icon, type IconName } from './Icon';

export interface SplitOption {
  value: string;
  label: string;
  /** Shown in the menu but not pickable (e.g. the current/past status). */
  disabled?: boolean;
}

export interface SplitButtonProps {
  options: SplitOption[];
  /** Currently-selected value; defaults to the first enabled option. */
  value?: string;
  disabled?: boolean;
  primaryIcon?: IconName;
  menuLabel?: string;
  onAction?: (value: string) => void;
  onSelect?: (value: string) => void;
}

export function SplitButton(props: SplitButtonProps): JSX.Element {
  const [open, setOpen] = createSignal(false);
  const firstEnabled = createMemo(() => props.options.find((o) => !o.disabled)?.value);
  const current = createMemo(() => {
    const picked = props.options.find((o) => o.value === props.value && !o.disabled);
    return picked?.value ?? firstEnabled();
  });
  const currentOption = createMemo(() => props.options.find((o) => o.value === current()));

  const runPrimary = () => {
    const c = current();
    if (props.disabled || c == null) return;
    props.onAction?.(c);
  };
  const pick = (v: string) => {
    setOpen(false);
    if (v === current()) return;
    props.onSelect?.(v);
  };

  return (
    <div class={`split${props.disabled ? ' split--disabled' : ''}`}>
      <button type="button" class="split__primary" disabled={props.disabled} onClick={runPrimary}>
        <span>{currentOption()?.label ?? ''}</span>
        <Icon name={props.primaryIcon ?? 'arrow-right'} size={16} flipRtl />
      </button>
      <Popover
        open={open()}
        onClose={() => setOpen(false)}
        placement="top-end"
        trigger={
          <button
            type="button"
            class="split__disclosure"
            data-popover-trigger
            disabled={props.disabled}
            aria-haspopup="menu"
            aria-expanded={open()}
            aria-label={props.menuLabel ?? 'Choose action'}
            onClick={() => setOpen(!open())}
          >
            <Icon name="chevron-down" size={16} />
          </button>
        }
      >
        <ul class="menu" role="menu" aria-label={props.menuLabel ?? 'Choose action'}>
          <For each={props.options}>
            {(o) => (
              <li role="none">
                <button
                  type="button"
                  role="menuitemradio"
                  aria-checked={o.value === current()}
                  class={`menu-item${o.value === current() ? ' menu-item--selected' : ''}`}
                  disabled={o.disabled}
                  onClick={() => pick(o.value)}
                >
                  <span class="menu-check">
                    <Show when={o.value === current()}>
                      <Icon name="check" size={16} />
                    </Show>
                  </span>
                  <span class="menu-item__label">{o.label}</span>
                </button>
              </li>
            )}
          </For>
        </ul>
      </Popover>
    </div>
  );
}
