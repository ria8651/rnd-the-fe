/**
 * Checkbox with a small visual box and a 48×48 hit area (spec/ui-standards/accessibility.md ›
 * touch targets). Uses the custom checkbox glyphs; supports an indeterminate state for a
 * "select all" that is partially selected.
 */
import { type JSX } from 'solid-js';
import { Icon } from '../Icon';

export interface CheckboxProps {
  checked: boolean;
  indeterminate?: boolean;
  onChange?: (checked: boolean) => void;
  ariaLabel: string;
  disabled?: boolean;
}

export function Checkbox(props: CheckboxProps): JSX.Element {
  const glyph = () =>
    props.indeterminate ? 'checkbox-indeterminate' : props.checked ? 'checkbox-checked' : 'checkbox-empty';
  return (
    <button
      type="button"
      class="checkbox"
      role="checkbox"
      aria-checked={props.indeterminate ? 'mixed' : props.checked}
      aria-label={props.ariaLabel}
      disabled={props.disabled}
      onClick={(e) => {
        e.stopPropagation();
        props.onChange?.(!props.checked);
      }}
    >
      <Icon name={glyph()} size={20} />
    </button>
  );
}
