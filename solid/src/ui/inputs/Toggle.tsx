/**
 * Toggle switch (spec/ui-standards/inputs.md — accent when on). Used for boolean options
 * like "include items with no stock on hand". A labelled button with `aria-pressed`.
 */
import { type JSX, Show } from 'solid-js';

export interface ToggleProps {
  checked: boolean;
  onChange?: (checked: boolean) => void;
  label?: JSX.Element;
  disabled?: boolean;
  ariaLabel?: string;
}

export function Toggle(props: ToggleProps): JSX.Element {
  return (
    <button
      type="button"
      class="toggle"
      role="switch"
      aria-pressed={props.checked}
      aria-label={props.ariaLabel}
      disabled={props.disabled}
      onClick={() => props.onChange?.(!props.checked)}
    >
      <span class="toggle__track" aria-hidden="true">
        <span class="toggle__thumb" />
      </span>
      <Show when={props.label}>
        <span>{props.label}</span>
      </Show>
    </button>
  );
}
