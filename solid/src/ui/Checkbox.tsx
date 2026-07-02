import { type JSX } from 'solid-js';
import { Icon } from './Icon';

/*
 * Checkbox using the custom icon set. Small visual control padded to a 48×48 hit
 * area (accessibility.md#touch-targets). Supports an indeterminate ("some") state
 * for a table's select-all header.
 */

export interface CheckboxProps {
  checked: boolean;
  indeterminate?: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  'aria-label'?: string;
  class?: string;
}

export function Checkbox(props: CheckboxProps): JSX.Element {
  const iconName = () =>
    props.indeterminate ? 'checkbox-indeterminate' : props.checked ? 'checkbox-checked' : 'checkbox-empty';
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={props.indeterminate ? 'mixed' : props.checked}
      aria-label={props['aria-label']}
      disabled={props.disabled}
      class={`checkbox${props.checked || props.indeterminate ? ' checkbox-on' : ''}${props.class ? ` ${props.class}` : ''}`}
      onClick={() => props.onChange(!props.checked)}
    >
      <Icon name={iconName()} size={20} />
    </button>
  );
}
