import { type JSX } from 'solid-js';
import { Icon } from './Icon';

// Small visual checkbox padded to a 48×48 hit area (accessibility.md#touch-targets).
export function Checkbox(props: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: (checked: boolean) => void;
  'aria-label'?: string;
}): JSX.Element {
  return (
    <span
      class="checkbox-hit"
      role="checkbox"
      tabindex="0"
      aria-checked={props.indeterminate ? 'mixed' : props.checked}
      aria-label={props['aria-label']}
      onClick={(e) => {
        e.stopPropagation();
        props.onChange(!props.checked);
      }}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          props.onChange(!props.checked);
        }
      }}
    >
      <span class="checkbox" data-checked={props.checked || props.indeterminate}>
        {props.indeterminate ? (
          <Icon name="close" size={12} />
        ) : props.checked ? (
          <Icon name="check" size={14} />
        ) : null}
      </span>
    </span>
  );
}
